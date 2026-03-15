import { Node, Prefab, Tween, Vec3, instantiate, tween } from "cc";
import { Debug } from "../Core/Debug";
import { ResourceMgr } from "../Core/ResourceMgr";
import { GameComponent } from "./GameComponent";
import { UILayer, EventConstants } from "../Core/Constants";
import { PrefabConfig } from "../Core/PrefabConfig";
import { EventMgr } from "../Core/EventMgr";

/**
 * 预制体信息接口
 */
interface IPrefabInfo {
    /** 预制体路径 */
    path: string;
    /** 预制体实例唯一标识（多开时使用），单开默认 -1 */
    id: number;
    /** 预制体实例 */
    instance: Node | null;
    /** 所属层级 */
    layer: UILayer;
    /** 是否已加载 */
    loaded: boolean;
}

/**
 * 游戏场景管理器 (GameScene Manager)
 * 
 * 功能说明：
 * - 统一管理 Main 场景中所有预制体的打开和关闭
 * - 支持不同层级的 UI 管理（background, ui, window, popup, topMost, topMask）
 * - 自动管理预制体的加载、实例化和销毁
 * - 支持预制体缓存，避免重复加载
 * - 管理 TOP_MASK 顶层遮罩，通过事件控制显示/隐藏，用于屏蔽玩家点击
 * 
 * 使用示例：
 * ```typescript
 * // 初始化（在 Main.ts 的 onLoad 中调用）
 * GameScene.init(mainNode);
 * 
 * // 打开预制体（推荐使用 PrefabConfig）
 * await GameScene.openPrefab(PrefabConfig.Game);
 * 
 * // 打开预制体并传递参数
 * await GameScene.openPrefab(PrefabConfig.Game, userId, level);
 * 
 * // 关闭预制体
 * GameScene.closePrefab(PrefabConfig.Game);
 * 
 * // 显示/隐藏顶层遮罩（屏蔽点击）
 * EventMgr.emit(EventConstants.EVENT_SHOW_TOP_MASK);  // 显示遮罩
 * EventMgr.emit(EventConstants.EVENT_HIDE_TOP_MASK); // 隐藏遮罩
 * ```
 */
export class GameScene {
    // Canvas 节点
    private static _canvasNode: Node | null = null;
    // 各层级节点打开顺序（用于设置 setSiblingIndex）
    private static _layerNodeOrders: Map<UILayer, Node[]> = new Map();
    // 预制体信息映射（key为预制体路径，值为实例数组）
    private static _prefabInfos: Map<string, IPrefabInfo[]> = new Map();
    // 多开预制体计数（记录当前实例数量，用于分配 id）
    private static _prefabMultiCount: Map<string, number> = new Map();
    // 预制体加载中的 Promise（用于防止重复并发打开）
    private static _prefabLoading: Map<string, Promise<Node | null>> = new Map();
    // 是否已初始化
    private static _isInitialized: boolean = false;
    // TOP_MASK 节点（顶层遮罩，用于屏蔽点击）
    private static _topMaskNode: Node | null = null;
    // TOP_MASK 引用计数
    private static _topMaskCount: number = 0;
    // TOP_MASK 超时定时器
    private static _topMaskTimer: any = null;
    // TOP_MASK 超时定时器的标识，用于避免过期回调
    private static _topMaskTimerId: number = 0;

    /**
     * 初始化游戏场景管理器
     * @param mainNode Main 场景的根节点
     */
    public static init(mainNode: Node) {
        if (this._isInitialized) {
            Debug.warn("GameScene already initialized");
            return;
        }

        if (!mainNode) {
            Debug.error("GameScene.init: mainNode is null");
            return;
        }
        
        // 设置 Canvas 节点
        this._canvasNode = mainNode;

        // 初始化各层级节点
        this._initLayerNodes();

        // 初始化 TOP_MASK 节点
        this._initTopMask();

        this._isInitialized = true;
    }

    /**
     * 初始化各层级节点（验证层级节点是否存在）
     */
    private static _initLayerNodes() {
        if (!this._canvasNode) {
            return;
        }

        // 遍历所有层级，验证对应的节点是否存在
        for (const key in UILayer) {
            const layerName = UILayer[key as keyof typeof UILayer];
            // 跳过数字键（枚举的反向映射）
            if (typeof layerName === 'string') {
                const layerNode = this._canvasNode.getChildByName(layerName);
                if (!layerNode) {
                    Debug.warn(`GameScene._initLayerNodes: layer node "${layerName}" not found`);
                }
            }
        }
    }

    /**
     * 初始化 TOP_MASK 节点（顶层遮罩，用于屏蔽点击）
     * 使用场景中已存在的 topMask 节点，初始状态为隐藏
     * 监听事件来控制显示/隐藏
     */
    private static _initTopMask() {
        if (!this._canvasNode) {
            return;
        }

        // 获取 TOP_MASK 层级节点
        const topMaskLayerNode = this._canvasNode.getChildByName(UILayer.TOP_MASK);
        if (!topMaskLayerNode) {
            Debug.warn("GameScene._initTopMask: TOP_MASK layer node not found");
            return;
        }

        // 查找 topMask 节点：优先查找层级节点下的子节点，如果不存在则使用层级节点本身
        let topMaskNode = topMaskLayerNode.getChildByName('topMask');
        if (!topMaskNode) {
            // 如果层级节点下没有名为 'topMask' 的子节点，则直接使用层级节点本身
            topMaskNode = topMaskLayerNode;
        }

        // 初始状态：隐藏节点
        topMaskNode.active = false;

        // 保存节点引用
        this._topMaskNode = topMaskNode;

        // 注册事件监听
        this._registerTopMaskEvents();
    }

    /**
     * 注册 TOP_MASK 事件监听
     */
    private static _registerTopMaskEvents() {
        EventMgr.on(EventConstants.EVENT_SHOW_TOP_MASK, this._onShowTopMask, this);
        // 注册关闭预制体事件监听（用于解耦 GameComponent 和 GameScene 的循环引用）
        EventMgr.on(EventConstants.EVENT_CLOSE_PREFAB, this._onClosePrefab, this);
    }

    /**
     * 处理关闭预制体事件（由 GameComponent 通过事件系统触发，避免循环引用）
     * @param prefabPath 预制体路径
     */
    private static _onClosePrefab(prefabPath: string, id: number = -1) {
        if (!prefabPath) {
            Debug.warn('GameScene._onClosePrefab: prefabPath is empty');
            return;
        }
        this.closePrefab(prefabPath, id);
    }

    /**
     * 顶层遮罩计数控制（仅使用 EVENT_SHOW_TOP_MASK）
     * @param payload 可选：true/undefined 表示 +1，false 表示 -1，number 表示累加该值
     */
    private static _onShowTopMask(payload?: boolean | number) {
        if (typeof payload === 'number') {
            this._topMaskCount += payload;
        } else if (payload === false) {
            this._topMaskCount -= 1;
        } else {
            // 兼容旧逻辑：默认 +1
            this._topMaskCount += 1;
        }
        if (this._topMaskCount < 0) {
            Debug.warn('GameScene: topMask count below zero, correcting to 0');
            this._topMaskCount = 0;
        }
        this._refreshTopMask();
    }

    /**
     * 根据计数刷新 TOP_MASK 显示状态：
     * - 计数 <= 0: 关闭并清空计数
     * - 计数 == 1: 打开
     * - 计数 > 1: 打开并启动 10s 超时，超时后强制关闭
     */
    private static _refreshTopMask(): void {
        if (!this._topMaskNode || !this._topMaskNode.isValid) {
            return;
        }

        // 清理超时定时器
        if (this._topMaskTimer) {
            clearTimeout(this._topMaskTimer);
            this._topMaskTimer = null;
        }

        if (this._topMaskCount <= 0) {
            this._topMaskCount = 0;
            this._setTopMaskVisible(false);
            return;
        }

        // 计数 >= 1 时打开遮罩
        this._setTopMaskVisible(true);

        // 计数 > 1 时，开启 10s 超时保护，强制关闭
        if (this._topMaskCount > 1) {
            const timerId = ++this._topMaskTimerId;
            this._topMaskTimer = setTimeout(() => {
                // 如果期间计数有变化且定时器被替换，则不执行
                if (timerId !== this._topMaskTimerId) {
                    return;
                }
                this._topMaskCount = 0;
                this._setTopMaskVisible(false);
                this._topMaskTimer = null;
            }, 10000);
        }
    }

    /**
     * 设置 TOP_MASK 显示/隐藏，同时处理旋转动画
     */
    private static _setTopMaskVisible(show: boolean): void {
        if (!this._topMaskNode || !this._topMaskNode.isValid) {
            return;
        }
        this._topMaskNode.active = show;
        const nodeRotate = this._topMaskNode.getChildByName('nodeRotate');
        if (show) {
            if (nodeRotate) {
                tween(nodeRotate).to(1, { angle: -360 }).repeatForever().start();
            }
        } else {
            if (nodeRotate) {
                Tween.stopAllByTarget(nodeRotate);
            }
        }
    }

    /**
     * 更新节点打开顺序并设置层级
     * @param layer 层级枚举
     * @param node 节点实例
     */
    private static _updateNodeOrder(layer: UILayer, node: Node) {
        // 获取或创建该层级的节点顺序数组
        let nodeOrder = this._layerNodeOrders.get(layer);
        if (!nodeOrder) {
            nodeOrder = [];
            this._layerNodeOrders.set(layer, nodeOrder);
        }

        // 如果节点已存在，先移除（重新打开的情况）
        const index = nodeOrder.indexOf(node);
        if (index !== -1) {
            nodeOrder.splice(index, 1);
        }

        // 将节点添加到数组末尾（最后打开的在最上层）
        nodeOrder.push(node);

        // 设置节点的层级索引（最后打开的索引最大，显示在最上层）
        if (node.isValid && node.parent) {
            const siblingIndex = nodeOrder.length - 1;
            node.setSiblingIndex(siblingIndex);
        }
    }

    /**
     * 从打开顺序数组中移除节点
     * @param layer 层级枚举
     * @param node 节点实例
     */
    private static _removeNodeFromOrder(layer: UILayer, node: Node) {
        const nodeOrder = this._layerNodeOrders.get(layer);
        if (!nodeOrder) {
            return;
        }

        const index = nodeOrder.indexOf(node);
        if (index !== -1) {
            nodeOrder.splice(index, 1);
        }
    }

    /**
     * 获取或创建层级节点
     * @param layer 层级枚举
     * @returns 层级节点
     */
    private static _getOrCreateLayerNode(layer: UILayer): Node | null {
        if (!this._canvasNode) {
            Debug.error("GameScene._getOrCreateLayerNode: Canvas node is null");
            return null;
        }

        // 从 Canvas 中查找层级节点
        let layerNode = this._canvasNode.getChildByName(layer);
        if (layerNode && layerNode.isValid) {
            return layerNode;
        }

        // 如果不存在，创建一个新节点
        layerNode = new Node(layer);
        layerNode.setParent(this._canvasNode);
        
        return layerNode;
    }

    /**
     * 打开预制体
     * @param prefabPath 预制体路径（相对于 resources 目录），推荐使用 PrefabConfig
     * @param ...args 初始化参数（不定长参数，会传递给 GameComponent.init()）
     * @returns Promise<Node> 预制体实例节点
     * 
     * 使用示例：
     * ```typescript
     * // 打开游戏窗口（推荐使用 PrefabConfig）
     * const window = await GameScene.openPrefab(PrefabConfig.Game);
     * 
     * // 打开窗口并传递参数
     * const window = await GameScene.openPrefab(PrefabConfig.Game, userId, level);
     * ```
     */
    public static async openPrefab(
        prefabPath: string,
        ...args: any[]
    ): Promise<Node | null> {
        if (!this._isInitialized) {
            Debug.error("GameScene.openPrefab: GameScene not initialized, please call init() first");
            return null;
        }

        if (!prefabPath) {
            Debug.error("GameScene.openPrefab: prefabPath is empty");
            return null;
        }

        // 如果正在加载同一路径，直接复用在途 Promise，避免并发重复加载
        const loadingPromise = this._prefabLoading.get(prefabPath);
        if (loadingPromise) {
            return await loadingPromise;
        }

        // 创建在途 Promise 并登记
        const pendingPromise = this._openPrefabInternal(prefabPath, -1, ...args);
        this._prefabLoading.set(prefabPath, pendingPromise);
        try {
            return await pendingPromise;
        } finally {
            this._prefabLoading.delete(prefabPath);
        }
    }

    /**
     * 打开可多开的预制体
     * @param prefabPath 预制体路径
     * @param ...args 初始化参数
     * @returns 预制体实例节点
     */
    public static async openMultyPrefab(
        prefabPath: string,
        ...args: any[]
    ): Promise<Node | null> {
        if (!this._isInitialized) {
            Debug.error("GameScene.openMultyPrefab: GameScene not initialized, please call init() first");
            return null;
        }

        if (!prefabPath) {
            Debug.error("GameScene.openMultyPrefab: prefabPath is empty");
            return null;
        }

        // 当前已开实例数量，作为新实例 id
        const currentCount = this._prefabMultiCount.get(prefabPath) || 0;
        const newId = currentCount;

        // 资源加载仍沿用单路径防重逻辑
        const loadingPromise = this._prefabLoading.get(prefabPath);
        if (loadingPromise) {
            await loadingPromise; // 等待加载完成再实例化新的
        }

        const pendingPromise = this._openPrefabInternal(prefabPath, newId, ...args);
        this._prefabLoading.set(prefabPath, pendingPromise);
        try {
            return await pendingPromise;
        } finally {
            this._prefabLoading.delete(prefabPath);
        }
    }

    private static async _openPrefabInternal(
        prefabPath: string,
        id: number,
        ...args: any[]
    ): Promise<Node | null> {

        let maskShown = false;
        EventMgr.emit(EventConstants.EVENT_SHOW_TOP_MASK,true);
        maskShown = true;
        try {

            const list = this._prefabInfos.get(prefabPath) || [];
            if(id === -1 && list.length > 0){
                Debug.warn(`GameScene.openPrefab: prefab "${prefabPath}" is single instance, but multiple instances are opened`);
                if (maskShown) EventMgr.emit(EventConstants.EVENT_SHOW_TOP_MASK,false);
                return null;
            }

            // 加载预制体资源
            const prefab = await ResourceMgr.loadRes<Prefab>(prefabPath, Prefab);
            if (!prefab) {
                Debug.error(`GameScene.openPrefab: failed to load prefab "${prefabPath}"`);
                if (maskShown) EventMgr.emit(EventConstants.EVENT_SHOW_TOP_MASK,false);
                return null;
            }

            // 实例化预制体
            const instance = instantiate(prefab);
            if (!instance) {
                Debug.error(`GameScene.openPrefab: failed to instantiate prefab "${prefabPath}"`);
                EventMgr.emit(EventConstants.EVENT_SHOW_TOP_MASK,false);
                return null;
            }

            // 从 GameComponent 获取层级（从根节点获取）
            let layer: UILayer = UILayer.WINDOW; // 默认层级
            const gameComponent = instance.getComponent(GameComponent);
            if (gameComponent && gameComponent.layer) {
                layer = gameComponent.layer;
            } else {
                Debug.warn(`GameScene.openPrefab: GameComponent not found or layer not set in "${prefabPath}", using default WINDOW layer`);
            }

            // 获取目标层级节点
            const layerNode = this._getOrCreateLayerNode(layer);
            if (!layerNode) {
                Debug.error(`GameScene.openPrefab: failed to get layer node "${layer}"`);
                instance.destroy();
                if (maskShown) EventMgr.emit(EventConstants.EVENT_SHOW_TOP_MASK,false);
                return null;
            }

            // 添加到层级节点
            instance.setParent(layerNode);
            
            // 更新节点打开顺序并设置层级
            this._updateNodeOrder(layer, instance);

            // 调用 GameComponent 的初始化方法，传递预制体路径和参数
            await this._initGameComponents(instance, prefabPath, id, ...args);

            // 播放进入动画（如果有 GameComponent）
            if (gameComponent) {
                // 先设置为可见，然后播放进入动画
                instance.active = true;
                gameComponent.playIn();
            } else {
                // 没有 GameComponent，直接设置为可见
                instance.active = true;
            }

            // 保存预制体信息
            const prefabInfo: IPrefabInfo = {
                path: prefabPath,
                id: id,
                instance: instance,
                layer: layer,
                loaded: true,
            };
     
            list.push(prefabInfo);
            if(id > -1){
                this._prefabMultiCount.set(prefabPath, list.length);
            }
            this._prefabInfos.set(prefabPath, list);

            if (maskShown) EventMgr.emit(EventConstants.EVENT_SHOW_TOP_MASK,false);
            return instance;
        } catch (error) {
            Debug.error(`GameScene.openPrefab: error opening prefab "${prefabPath}"`, error);
            if (maskShown) EventMgr.emit(EventConstants.EVENT_SHOW_TOP_MASK,false);
            return null;
        }
    }

    /**
     * 关闭预制体
     * @param prefabPath 预制体路径，推荐使用 PrefabConfig
     * @returns 是否成功关闭
     * 
     * 使用示例：
     * ```typescript
     * // 关闭并销毁实例（推荐使用 PrefabConfig）
     * GameScene.closePrefab(PrefabConfig.Game);
     * ```
     */
    public static async closePrefab(prefabPath: string, id: number = -1): Promise<boolean> {
        if (!this._isInitialized) {
            Debug.warn("GameScene.closePrefab: GameScene not initialized");
            return false;
        }

        const infos = this._prefabInfos.get(prefabPath);
        if (!infos || infos.length === 0) {
            Debug.warn(`GameScene.closePrefab: prefab "${prefabPath}" not found or not opened`);
            return false;
        }

        let prefabInfo: IPrefabInfo | null = null;
        if(id === -1){
            prefabInfo = infos[0];
        }else{
            prefabInfo = infos.find(info => info.id === id) || null;
        }

        if (!prefabInfo || !prefabInfo.instance) {
            Debug.warn(`GameScene.closePrefab: prefab "${prefabPath}" with id ${id} not found`);
            return false;
        }

        const instance = prefabInfo.instance;
        const layer = prefabInfo.layer;
        
        if (!instance.isValid) {
            // 实例已无效，清理信息
            this._prefabInfos.delete(prefabPath);
            // 从打开顺序数组中移除
            this._removeNodeFromOrder(layer, instance);
            return false;
        }

        // 调用 GameComponent 的关闭方法
        await this._closeGameComponents(instance);

        // 从打开顺序数组中移除
        this._removeNodeFromOrder(layer, instance);

        // 销毁实例
        this._destroyInstance(instance);
        this._removePrefabInfo(prefabPath, prefabInfo);

        return true;
    }

    /**
     * 检查预制体是否已打开
     * @param prefabPath 预制体路径，推荐使用 PrefabConfig
     * @returns 是否已打开
     */
    public static isPrefabOpen(prefabPath: string): boolean {
        const infos = this._prefabInfos.get(prefabPath);
        if (!infos || infos.length === 0) {
            return false;
        }
        return infos.some(info => info.instance && info.instance.isValid && info.instance.active);
    }

    /**
     * 关闭指定层级的所有预制体
     * @param layer 层级枚举
     */
    public static async closeLayerPrefabs(layer: UILayer) {
        if (!this._isInitialized) {
            return;
        }

        const prefabsToClose: { path: string; id: number }[] = [];
        this._prefabInfos.forEach((infos, path) => {
            infos.forEach(info => {
                if (info.layer === layer && info.instance && info.instance.isValid) {
                    prefabsToClose.push({ path, id: info.id });
                }
            });
        });

        for (const item of prefabsToClose) {
            await this.closePrefab(item.path, item.id);
        }
    }

    /**
     * 关闭所有预制体
     */
    public static async closeAllPrefabs() {
        if (!this._isInitialized) {
            return;
        }

        const prefabsToClose: { path: string; id: number }[] = [];
        this._prefabInfos.forEach((infos, path) => {
            infos.forEach(info => {
                if (info.instance && info.instance.isValid) {
                    prefabsToClose.push({ path, id: info.id });
                }
            });
        });

        for (const item of prefabsToClose) {
            await this.closePrefab(item.path, item.id);
        }
    }

    /**
     * 初始化节点上的所有 GameComponent
     * @param node 节点
     * @param prefabPath 预制体路径（可选，传递给 GameComponent）
     * @param ...args 初始化参数（不定长参数，传递给 GameComponent）
     */
    private static async _initGameComponents(node: Node, prefabPath?: string, id: number = -1, ...args: any[]) {
        if (!node || !node.isValid) {
            return;
        }

        // 获取当前节点上的 GameComponent
        const component = node.getComponent(GameComponent);
        if (component) {
            // 手动调用 GameComponent 的初始化方法，传递预制体路径和参数
            await component._init(prefabPath, id, ...args);
        }

        // 递归处理子节点
        const children = node.children;
        if (children) {
            for (let i = 0; i < children.length; i++) {
                await this._initGameComponents(children[i], prefabPath, id, ...args);
            }
        }
    }

    /**
     * 关闭节点上的所有 GameComponent
     * @param node 节点
     */
    private static async _closeGameComponents(node: Node) {
        if (!node || !node.isValid) {
            return;
        }

        // 获取当前节点上的 GameComponent
        const component = node.getComponent(GameComponent);
        if (component) {
            await component._close();
        }

        // 递归处理子节点
        const children = node.children;
        if (children) {
            for (let i = 0; i < children.length; i++) {
                await this._closeGameComponents(children[i]);
            }
        }
    }

    /**
     * 销毁预制体实例
     * @param instance 实例节点
     */
    private static _destroyInstance(instance: Node) {
        if (instance && instance.isValid) {
            instance.destroy();
        }
    }

    /**
     * 从缓存中移除 prefabInfo，并维护多开计数
     */
    private static _removePrefabInfo(prefabPath: string, prefabInfo: IPrefabInfo) {
        const infos = this._prefabInfos.get(prefabPath);
        if (!infos) {
            return;
        }
        const idx = infos.indexOf(prefabInfo);
        if (idx >= 0) {
            infos.splice(idx, 1);
        }
        if (infos.length === 0) {
            this._prefabInfos.delete(prefabPath);
            this._prefabMultiCount.delete(prefabPath);
        } else {
            this._prefabInfos.set(prefabPath, infos);
            // 更新多开计数（仅在多开实例时维护）
            if (prefabInfo.id > -1) {
                this._prefabMultiCount.set(prefabPath, infos.length);
            }
        }
    }

    /**
     * 获取层级节点
     * @param layer 层级枚举
     * @returns 层级节点，如果不存在则返回 null
     */
    public static getLayerNode(layer: UILayer): Node | null {
        if (!this._canvasNode) {
            return null;
        }
        return this._canvasNode.getChildByName(layer) || null;
    }

    /**
     * 获取 Canvas 节点
     * @returns Canvas 节点
     */
    public static getCanvasNode(): Node | null {
        return this._canvasNode;
    }

    /**
     * 检查是否已初始化
     * @returns 是否已初始化
     */
    public static isInitialized(): boolean {
        return this._isInitialized;
    }

    /**
     * 清理所有数据（用于场景切换或重置）
     */
    public static cleanup() {
        // 移除事件监听
        this._unregisterTopMaskEvents();

        this.closeAllPrefabs();
        this._prefabInfos.clear();
        this._prefabMultiCount.clear();
        this._layerNodeOrders.clear();
        this._topMaskNode = null;
        this._canvasNode = null;
        this._isInitialized = false;
    }

    /**
     * 移除 TOP_MASK 事件监听
     */
    private static _unregisterTopMaskEvents() {
        EventMgr.off(EventConstants.EVENT_SHOW_TOP_MASK, this._onShowTopMask, this);
        EventMgr.off(EventConstants.EVENT_CLOSE_PREFAB, this._onClosePrefab, this);
    }
}

// 导出别名
export { GameScene as g_scene };

