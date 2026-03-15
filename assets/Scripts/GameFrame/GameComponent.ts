import { _decorator, Component, Node, Enum, UIOpacity, tween, Label, Sprite, Button, ProgressBar, ScrollView, UITransform, Layout, EditBox, Toggle, Animation, RichText, Vec3, Vec2, Color, Size, find, instantiate, Event } from 'cc';
import { UILayer, EventConstants } from '../Core/Constants';
import { Debug } from '../Core/Debug';
import { ResourceMgr } from '../Core/ResourceMgr';
import { SpriteFrame } from 'cc';
import { EventMgr } from '../Core/EventMgr';
const { ccclass, property } = _decorator;

/**
 * 游戏组件基类 (Game Component Base Class)
 * 
 * 功能说明：
 * - 所有界面脚本的基类，继承自 Cocos Creator 的 Component
 * - 提供统一的初始化方法：init()
 * - 提供统一的关闭方法：close()
 * - 提供进入/退出动画方法：playIn() 和 playOut()
 * - 提供丰富的引擎组件操作方法（get/set 方法）
 * - 在 GameScene 打开/关闭预制体时自动调用这些方法
 * 
 * 生命周期：
 * 1. init(...args) - 初始化方法，在预制体打开时调用（可传递不定长参数，可异步）
 * 2. playIn() - 播放进入动画，在初始化完成后自动调用（子类可重写）
 * 3. close() - 关闭方法，界面自己调用时会自动通知 GameScene 删除缓存并销毁实例
 * 4. playOut() - 播放退出动画，在关闭时自动调用（子类可重写，返回 Promise）
 * 
 * 动画方法重写说明：
 * - playIn() 和 playOut() 可以被子类重写
 * - 如果子类不重写，则使用父类的默认淡入/淡出动画
 * - 如果子类重写，可以完全自定义动画，或调用 super.playIn()/super.playOut() 先执行父类动画
 * 
 * 引擎组件操作方法：
 * - get 方法：getNode(), getLabel(), getSprite(), getButton(), getProgressBar(), getScrollView(), 
 *   getUITransform(), getLayout(), getEditBox(), getToggle(), getAnimation(), getRichText(), getSize()
 * - set 方法：setLabel(), setSprite(), setBtnState(), setBtnEven(), setActive(), setPosition(), 
 *   setSize(), setScale(), setProgress(), setEditBoxString(), setEditBox(), setToggle(), 
 *   playAnimation(), setRichText()
 * - 所有方法都支持路径字符串或节点对象作为参数，并支持组件缓存以提高性能
 * 
 * 使用示例：
 * ```typescript
 * @ccclass('GameWindow')
 * export class GameWindow extends GameComponent {
 *     // 初始化阶段：加载资源、请求数据等（可异步，可接收不定长参数）
 *     protected async init(...args: any[]): Promise<void> {
 *         await super.init(...args);
 *         
 *         // 使用引擎组件操作方法
 *         this.setLabel('title/lbl_text', '游戏标题');
 *         this.setBtnEven('btn_start', this.onStartClick, this);
 *         this.setSprite('icon', 'textures/ui/icon');
 *         
 *         // 你的初始化逻辑
 *         if (args.length > 0) {
 *             const userId = args[0];
 *             const level = args[1];
 *             // 使用传入的参数
 *         }
 *     }
 * 
 *     // 按钮点击事件
 *     private onStartClick(event: Event) {
 *         // 处理点击逻辑
 *     }
 * 
 *     // 关闭阶段：清理资源、保存数据等
 *     // 界面自己调用 close() 时，会自动通知 GameScene 删除缓存并销毁实例
 *     protected close(): void {
 *         // 你的关闭逻辑
 *         super.close(); // 必须调用 super.close()，会自动处理缓存清理和销毁
 *     }
 * 
 *     // 在按钮点击时自己关闭
 *     onCloseBtnClick() {
 *         this.close(); // 自动销毁实例
 *     }
 * }
 * ```
 * 
 * 版本：1.0.0
 * 创建者：ljw
 * 日期：2024
 */
@ccclass('GameComponent')
export class GameComponent extends Component {
    // 是否已初始化
    private _isInitialized: boolean = false;
    // 是否正在关闭
    private _isClosing: boolean = false;
    // 场景侧发起的关闭标记，避免递归回调
    private _isSceneClosing: boolean = false;
    // 是否已注册帧更新
    private _updateRegistered: boolean = false;
    // 预制体路径（由 GameScene 设置）
    private _prefabPath: string | null = null;
    // 预制体 id（由 GameScene 设置）
    private _prefabId: number = -1;
    // 组件缓存 Map，key 格式：${rootNodeUuid}:${componentType}:${path}
    private _componentCache: Map<string, any> = new Map();

    @property({type: Enum(UILayer), tooltip: '预制体所在的层级'})
    layer: UILayer = UILayer.WINDOW;
    /**
     * 初始化方法（异步，可传递不定长参数）
     * 在预制体打开时调用，用于加载资源、请求数据等
     * 子类可以重写此方法
     * @param ...args 初始化参数（不定长参数）
     */
    protected async init(...args: any[]): Promise<void> {
        // 子类重写此方法
    }

    /**
     * 关闭方法（同步）
     * 在预制体关闭时调用，用于清理资源、保存数据等
     * 如果界面自己调用此方法，会自动通知 GameScene 删除缓存引用并销毁实例
     * 子类可以重写此方法，但需要在最后调用 super.close()
     */
    protected async close(): Promise<void> {
        if (this._isClosing) {
            return;
        }

        this._isClosing = true;
        this._isInitialized = false;

        // 场景侧调用：仅播放退出动画，不再递归调用 GameScene
        if (this._isSceneClosing) {
            await this.playOut();
            this._isClosing = false;
            return;
        }

        // 正常路径：由组件自身触发，播放动画后通知 GameScene
        // 使用事件系统避免循环引用
        if (this._prefabPath) {
            await this.playOut();
            // 通过事件系统通知 GameScene 关闭预制体，避免循环引用
            EventMgr.emit(EventConstants.EVENT_CLOSE_PREFAB, this._prefabPath, this._prefabId);
            // GameScene 会负责销毁，_isClosing 无需重置
            return;
        }

        // 未指定 prefabPath，直接播放动画后复位
        await this.playOut();
        this._isClosing = false;
    }

    /**
     * 内部初始化方法（由 GameScene 调用）
     * @param prefabPath 预制体路径（可选，用于后续关闭时删除缓存）
     * @param ...args 初始化参数（不定长参数）
     */
    public async _init(prefabPath?: string, id: number = -1, ...args: any[]): Promise<void> {
        if (this._isInitialized) {
            return;
        }

        // 保存预制体路径
        if (prefabPath) {
            this._prefabPath = prefabPath;
        }

        this._prefabId = id;

        this._registerUpdate();

        try {
            await this.init(...args);
            this._isInitialized = true;
        } catch (error) {
            Debug.error(`GameComponent._init error in ${this.node.name}:`, error);
        }
    }

    /**
     * 内部关闭方法
     * 由 GameScene 调用，临时清除 _prefabPath 避免循环调用
     */
    public async _close(): Promise<void> {
        if (this._isClosing) {
            return;
        }

        // 标记场景侧关闭，避免内部再次触发 closePrefab
        this._isSceneClosing = true;

        this._unregisterUpdate();

        // 调用 close()，此时不会通知 GameScene
        await this.close();

        // 清除标记
        this._isSceneClosing = false;
    }

    /**
     * 组件销毁时清理缓存
     */
    protected onDestroy(): void {
        this._unregisterUpdate();
        this._componentCache.clear();
        // Component 基类可能没有 onDestroy 方法，所以不调用 super.onDestroy()
    }

    /**
     * 子类可重写的帧更新接口，由 GameLogic 统一驱动
     * @param dt 帧间隔（秒）
     */
    protected onUpdate(dt: number): void {
        // 默认空实现，子类按需重写
    }

    /**
     * 注册到全局逻辑更新，避免重复注册
     * 使用事件系统避免循环引用
     */
    private _registerUpdate(): void {
        if (this._updateRegistered) {
            return;
        }
        // 通过事件系统注册更新函数，避免循环引用
        EventMgr.emit(EventConstants.EVENT_REGISTER_UPDATE_FUNC, this._doUpdate, this);
        this._updateRegistered = true;
    }

    /**
     * 从全局逻辑更新移除
     * 使用事件系统避免循环引用
     */
    private _unregisterUpdate(): void {
        if (!this._updateRegistered) {
            return;
        }
        // 通过事件系统移除更新函数，避免循环引用
        EventMgr.emit(EventConstants.EVENT_REMOVE_UPDATE_FUNC, this._doUpdate, this);
        this._updateRegistered = false;
    }

    /**
     * 内部帧更新封装，转发给子类 onUpdate
     */
    private _doUpdate(dt: number): void {
        // 节点失效时，自动移除更新注册
        if (!this.node || !this.node.isValid) {
            this._unregisterUpdate();
            return;
        }
        this.onUpdate(dt);
    }


    /**
     * 生成缓存 key
     * @param rootNode 根节点
     * @param componentType 组件类型（如 'Label', 'Sprite' 等）
     * @param path 路径或节点名称
     * @returns 缓存 key
     */
    private _getCacheKey(rootNode: Node, componentType: string, path: string): string {
        return `${rootNode.uuid}:${componentType}:${path}`;
    }

    /**
     * 从缓存获取组件
     * @param rootNode 根节点
     * @param componentType 组件类型
     * @param path 路径或节点名称
     * @returns 缓存的组件，如果不存在返回 null
     */
    private _getFromCache(rootNode: Node, componentType: string, path: string): any {
        const key = this._getCacheKey(rootNode, componentType, path);
        const cached = this._componentCache.get(key);
        // 检查缓存是否有效（组件是否还存在且有效）
        if (cached) {
            // 对于节点，检查 isValid 和节点是否还存在
            if (cached instanceof Node) {
                if (cached.isValid && cached.parent) {
                    return cached;
                }
            } 
            // 对于组件，检查 isValid 和组件所属节点是否有效
            else if (cached.isValid !== false && cached.node && cached.node.isValid) {
                return cached;
            }
            // 如果缓存无效，清除它
            this._componentCache.delete(key);
        }
        return null;
    }

    /**
     * 设置组件缓存
     * @param rootNode 根节点
     * @param componentType 组件类型
     * @param path 路径或节点名称
     * @param component 要缓存的组件
     */
    private _setCache(rootNode: Node, componentType: string, path: string, component: any): void {
        if (component) {
            const key = this._getCacheKey(rootNode, componentType, path);
            this._componentCache.set(key, component);
        }
    }

    /**
     * 检查是否已初始化
     */
    public isInitialized(): boolean {
        return this._isInitialized;
    }

    /**
     * 检查是否正在关闭
     */
    public isClosing(): boolean {
        return this._isClosing;
    }

    /**
     * 播放进入动画
     * 从透明淡入到不透明（0 -> 255）
     * 
     * 子类可以重写此方法来实现自定义的进入动画：
     * - 如果子类不重写，则使用父类的默认淡入动画
     * - 如果子类重写，可以完全自定义动画，或调用 super.playIn() 先执行父类动画
     * 
     * 使用示例：
     * ```typescript
     * // 方式1：完全重写（不调用父类）
     * public playIn(): void {
     *     // 自定义动画逻辑
     *     tween(this.node).to(0.3, { scale: new Vec3(1.2, 1.2, 1) }).start();
     * }
     * 
     * // 方式2：先调用父类，再执行自定义逻辑
     * public playIn(): void {
     *     super.playIn(); // 先执行父类的淡入动画
     *     // 然后执行自定义逻辑
     *     tween(this.node).to(0.3, { scale: new Vec3(1.1, 1.1, 1) }).start();
     * }
     * ```
     */
    public playIn(): void {
        let uiOpacity = this.node.getComponent(UIOpacity);
        if (!uiOpacity) {
            uiOpacity = this.node.addComponent(UIOpacity);
        }
        // 确保初始状态为透明
        uiOpacity.opacity = 0;
        // 淡入动画
        tween(uiOpacity).to(0.5, { opacity: 255 }).start();
    }

    /**
     * 播放退出动画
     * 从不透明淡出到透明（255 -> 0）
     * 
     * 子类可以重写此方法来实现自定义的退出动画：
     * - 如果子类不重写，则使用父类的默认淡出动画
     * - 如果子类重写，必须返回 Promise，在动画完成后 resolve
     * - 可以完全自定义动画，或调用 super.playOut() 先执行父类动画
     * 
     * @returns Promise，动画完成后 resolve（子类重写时必须返回 Promise）
     * 
     * 使用示例：
     * ```typescript
     * // 方式1：完全重写（不调用父类）
     * public playOut(): Promise<void> {
     *     return new Promise((resolve) => {
     *         // 自定义动画逻辑
     *         tween(this.node).to(0.3, { scale: new Vec3(0.8, 0.8, 1) }).call(() => {
     *             resolve();
     *         }).start();
     *     });
     * }
     * 
     * // 方式2：先调用父类，再执行自定义逻辑
     * public async playOut(): Promise<void> {
     *     await super.playOut(); // 先执行父类的淡出动画
     *     // 然后执行自定义逻辑
     *     return new Promise((resolve) => {
     *         tween(this.node).to(0.2, { scale: new Vec3(0.9, 0.9, 1) }).call(() => {
     *             resolve();
     *         }).start();
     *     });
     * }
     * ```
     */
    public playOut(): Promise<void> {
        let uiOpacity = this.node.getComponent(UIOpacity);
        if (!uiOpacity) {
            uiOpacity = this.node.addComponent(UIOpacity);
            // 如果没有 UIOpacity 组件，说明之前是完全不透明的，设置为 255
            uiOpacity.opacity = 255;
        }
        // 淡出动画
        return new Promise((resolve) => {
            tween(uiOpacity).to(0.5, { opacity: 0 }).call(() => {
                resolve();
            }).start();
        });
    }

    /************************************* 节点查找工具方法 ***********************************************/
    
    /**
     * 根据路径获取节点
     * @param path 节点路径（字符串）或节点对象
     * @param rootNode 根节点，默认为 this.node
     * @returns 找到的节点，如果未找到返回 null
     */
    protected getNode(path: any, rootNode: Node | null = null): Node | null {
        // 如果 path 本身就是 Node，直接返回
        if (path instanceof Node) {
            return path;
        }

        // 如果 path 是字符串，进行路径查找
        if (typeof path === 'string') {
            const root = rootNode || this.node;
            
            // 检查缓存
            const cached = this._getFromCache(root, 'Node', path);
            if (cached) {
                return cached;
            }

            // 根据路径查找节点
            const node = this._findNodeByPath(root, path);
            if (node) {
                this._setCache(root, 'Node', path, node);
                return node;
            }
        }

        return null;
    }

    /**
     * 根据路径查找节点（内部方法）
     * @param root 根节点
     * @param path 路径字符串，支持 "child" 或 "parent/child" 格式
     * @returns 找到的节点
     */
    private _findNodeByPath(root: Node, path: string): Node | null {
        if (!path) {
            return root;
        }

        const parts = path.split('/');
        let current: Node | null = root;

        for (const part of parts) {
            if (!current) {
                return null;
            }
            current = current.getChildByName(part);
        }

        return current;
    }

    /**
     * 获取节点路径（用于日志输出）
     * @param node 节点
     * @returns 节点路径字符串
     */
    protected getPath(node: Node | string | null): string {
        if (typeof node === 'string') {
            return node;
        }
        if (!node) {
            return '';
        }

        let path = node.name;
        let parent = node.parent;
        while (parent) {
            path = parent.name + '/' + path;
            parent = parent.parent;
        }
        return path;
    }

    /************************************* get 方法 - 获取组件 ***********************************************/

    /**
     * 获取 Label 组件
     * @param path 节点路径或节点对象
     * @param rootNode 根节点，默认为 this.node
     * @returns Label 组件，如果未找到返回 null
     */
    protected getLabel(path: any, rootNode: Node | null = null): Label | null {
        const node = this.getNode(path, rootNode);
        if (!node) {
            return null;
        }

        const root = rootNode || this.node;
        const pathKey = typeof path === 'string' ? path : node.name;
        
        // 检查缓存
        const cached = this._getFromCache(root, 'Label', pathKey);
        if (cached) {
            return cached;
        }

        const label = node.getComponent(Label);
        if (label) {
            this._setCache(root, 'Label', pathKey, label);
        }
        return label;
    }

    /**
     * 获取 Sprite 组件
     * @param path 节点路径或节点对象
     * @param rootNode 根节点，默认为 this.node
     * @returns Sprite 组件，如果未找到返回 null
     */
    protected getSprite(path: any, rootNode: Node | null = null): Sprite | null {
        const node = this.getNode(path, rootNode);
        if (!node) {
            return null;
        }

        const root = rootNode || this.node;
        const pathKey = typeof path === 'string' ? path : node.name;
        
        // 检查缓存
        const cached = this._getFromCache(root, 'Sprite', pathKey);
        if (cached) {
            return cached;
        }

        const sprite = node.getComponent(Sprite);
        if (sprite) {
            this._setCache(root, 'Sprite', pathKey, sprite);
        }
        return sprite;
    }

    /**
     * 获取 Button 组件
     * @param path 节点路径或节点对象
     * @param rootNode 根节点，默认为 this.node
     * @returns Button 组件，如果未找到返回 null
     */
    protected getButton(path: any, rootNode: Node | null = null): Button | null {
        const node = this.getNode(path, rootNode);
        if (!node) {
            return null;
        }

        const root = rootNode || this.node;
        const pathKey = typeof path === 'string' ? path : node.name;
        
        // 检查缓存
        const cached = this._getFromCache(root, 'Button', pathKey);
        if (cached) {
            return cached;
        }

        const button = node.getComponent(Button);
        if (button) {
            this._setCache(root, 'Button', pathKey, button);
        }
        return button;
    }

    /**
     * 获取 ProgressBar 组件
     * @param path 节点路径或节点对象
     * @param rootNode 根节点，默认为 this.node
     * @returns ProgressBar 组件，如果未找到返回 null
     */
    protected getProgressBar(path: any, rootNode: Node | null = null): ProgressBar | null {
        const node = this.getNode(path, rootNode);
        if (!node) {
            return null;
        }

        const root = rootNode || this.node;
        const pathKey = typeof path === 'string' ? path : node.name;
        
        // 检查缓存
        const cached = this._getFromCache(root, 'ProgressBar', pathKey);
        if (cached) {
            return cached;
        }

        const progressBar = node.getComponent(ProgressBar);
        if (progressBar) {
            this._setCache(root, 'ProgressBar', pathKey, progressBar);
        }
        return progressBar;
    }

    /**
     * 获取 ScrollView 组件
     * @param path 节点路径或节点对象
     * @param rootNode 根节点，默认为 this.node
     * @returns ScrollView 组件，如果未找到返回 null
     */
    protected getScrollView(path: any, rootNode: Node | null = null): ScrollView | null {
        const node = this.getNode(path, rootNode);
        if (!node) {
            return null;
        }

        const root = rootNode || this.node;
        const pathKey = typeof path === 'string' ? path : node.name;
        
        // 检查缓存
        const cached = this._getFromCache(root, 'ScrollView', pathKey);
        if (cached) {
            return cached;
        }

        const scrollView = node.getComponent(ScrollView);
        if (scrollView) {
            this._setCache(root, 'ScrollView', pathKey, scrollView);
        }
        return scrollView;
    }

    /**
     * 获取 UITransform 组件
     * @param path 节点路径或节点对象
     * @param rootNode 根节点，默认为 this.node
     * @returns UITransform 组件，如果未找到返回 null
     */
    protected getUITransform(path: any, rootNode: Node | null = null): UITransform | null {
        const node = path instanceof Node ? path : this.getNode(path, rootNode);
        if (!node) {
            return null;
        }

        const root = rootNode || this.node;
        const pathKey = path instanceof Node ? node.name : (typeof path === 'string' ? path : node.name);
        
        // 检查缓存
        const cached = this._getFromCache(root, 'UITransform', pathKey);
        if (cached) {
            return cached;
        }

        const transform = node.getComponent(UITransform);
        if (transform) {
            this._setCache(root, 'UITransform', pathKey, transform);
        }
        return transform;
    }

    /**
     * 获取 Layout 组件
     * @param path 节点路径或节点对象
     * @param rootNode 根节点，默认为 this.node
     * @returns Layout 组件，如果未找到返回 null
     */
    protected getLayout(path: any, rootNode: Node | null = null): Layout | null {
        const node = this.getNode(path, rootNode);
        if (!node) {
            return null;
        }

        const root = rootNode || this.node;
        const pathKey = typeof path === 'string' ? path : node.name;
        
        // 检查缓存
        const cached = this._getFromCache(root, 'Layout', pathKey);
        if (cached) {
            return cached;
        }

        const layout = node.getComponent(Layout);
        if (layout) {
            this._setCache(root, 'Layout', pathKey, layout);
        }
        return layout;
    }

    /**
     * 获取 EditBox 组件
     * @param path 节点路径或节点对象
     * @param rootNode 根节点，默认为 this.node
     * @returns EditBox 组件，如果未找到返回 null
     */
    protected getEditBox(path: any, rootNode: Node | null = null): EditBox | null {
        const node = this.getNode(path, rootNode);
        if (!node) {
            return null;
        }

        const root = rootNode || this.node;
        const pathKey = typeof path === 'string' ? path : node.name;
        
        // 检查缓存
        const cached = this._getFromCache(root, 'EditBox', pathKey);
        if (cached) {
            return cached;
        }

        const editBox = node.getComponent(EditBox);
        if (editBox) {
            this._setCache(root, 'EditBox', pathKey, editBox);
        }
        return editBox;
    }

    /**
     * 获取 Toggle 组件
     * @param path 节点路径或节点对象
     * @param rootNode 根节点，默认为 this.node
     * @returns Toggle 组件，如果未找到返回 null
     */
    protected getToggle(path: any, rootNode: Node | null = null): Toggle | null {
        const node = this.getNode(path, rootNode);
        if (!node) {
            return null;
        }

        const root = rootNode || this.node;
        const pathKey = typeof path === 'string' ? path : node.name;
        
        // 检查缓存
        const cached = this._getFromCache(root, 'Toggle', pathKey);
        if (cached) {
            return cached;
        }

        const toggle = node.getComponent(Toggle);
        if (toggle) {
            this._setCache(root, 'Toggle', pathKey, toggle);
        }
        return toggle;
    }

    /**
     * 获取 Animation 组件
     * @param path 节点路径或节点对象
     * @param rootNode 根节点，默认为 this.node
     * @returns Animation 组件，如果未找到返回 null
     */
    protected getAnimation(path: any, rootNode: Node | null = null): Animation | null {
        const node = this.getNode(path, rootNode);
        if (!node) {
            return null;
        }

        const root = rootNode || this.node;
        const pathKey = typeof path === 'string' ? path : node.name;
        
        // 检查缓存
        const cached = this._getFromCache(root, 'Animation', pathKey);
        if (cached) {
            return cached;
        }

        const animation = node.getComponent(Animation);
        if (animation) {
            this._setCache(root, 'Animation', pathKey, animation);
        }
        return animation;
    }

    /**
     * 获取 RichText 组件
     * @param path 节点路径或节点对象
     * @param rootNode 根节点，默认为 this.node
     * @returns RichText 组件，如果未找到返回 null
     */
    protected getRichText(path: any, rootNode: Node | null = null): RichText | null {
        const node = this.getNode(path, rootNode);
        if (!node) {
            return null;
        }

        const root = rootNode || this.node;
        const pathKey = typeof path === 'string' ? path : node.name;
        
        // 检查缓存
        const cached = this._getFromCache(root, 'RichText', pathKey);
        if (cached) {
            return cached;
        }

        const richText = node.getComponent(RichText);
        if (richText) {
            this._setCache(root, 'RichText', pathKey, richText);
        }
        return richText;
    }

    /**
     * 获取节点尺寸
     * @param path 节点路径或节点对象
     * @param rootNode 根节点，默认为 this.node
     * @returns Size 对象，如果未找到返回 null
     */
    protected getSize(path: any = null, rootNode: Node | null = null): Size | null {
        const transform = this.getUITransform(path, rootNode);
        if (transform) {
            return transform.contentSize;
        }
        Debug.warn(`GameComponent.getSize: 找不到组件 UITransform ${this.getPath(rootNode || this.node)}/${this.getPath(path)}`);
        return null;
    }

    /************************************* set 方法 - 设置组件 ***********************************************/

    /**
     * 设置 Label 文本
     * @param path 节点路径或节点对象
     * @param str 文本内容
     * @param rootNode 根节点，默认为 this.node
     */
    protected setLabel(path: any, str: any, rootNode: Node | null = null): void {
        const label = this.getLabel(path, rootNode);
        if (label) {
            // 避免重复设置相同文本
            if ((label.node as any).nowstr !== str) {
                (label.node as any).nowstr = str;
                label.string = str + '';
            }
        } else {
            Debug.warn(`GameComponent.setLabel: 找不到组件 Label ${this.getPath(rootNode || this.node)}/${this.getPath(path)}`);
        }
    }

    /**
     * 设置 Sprite 图片
     * @param path 节点路径或节点对象
     * @param spriteFramePath 图片资源路径（相对于 resources 目录）
     * @param rootNode 根节点，默认为 this.node
     */
    protected setSprite(path: any, spriteFramePath: string, rootNode: Node | null = null): void {
        const sprite = this.getSprite(path, rootNode);
        if (!sprite) {
            Debug.warn(`GameComponent.setSprite: 找不到组件 Sprite ${this.getPath(rootNode || this.node)}/${this.getPath(path)}`);
            return;
        }

        // 如果路径为空，清空图片
        if (!spriteFramePath) {
            sprite.spriteFrame = null;
            return;
        }

        // 加载图片资源
        ResourceMgr.loadRes<SpriteFrame>(spriteFramePath, SpriteFrame).then((spriteFrame) => {
            if (sprite && sprite.node && sprite.node.isValid && spriteFrame) {
                sprite.spriteFrame = spriteFrame;
            } else {
                Debug.warn(`GameComponent.setSprite: 找不到图片 ${spriteFramePath} ${this.getPath(rootNode || this.node)}/${this.getPath(path)}`);
            }
        }).catch((error) => {
            Debug.error(`GameComponent.setSprite: 加载图片失败 ${spriteFramePath}`, error);
        });
    }

    /**
     * 设置按钮状态
     * @param path 节点路径或节点对象
     * @param value 状态值：0-不能点击，1-能点击，2-灰但能点击，3-不能点也不灰
     * @param rootNode 根节点，默认为 this.node
     */
    protected setBtnState(path: any, value: number, rootNode: Node | null = null): void {
        const button = this.getButton(path, rootNode);
        if (!button) {
            Debug.warn(`GameComponent.setBtnState: 找不到组件 Button ${this.getPath(rootNode || this.node)}/${this.getPath(path)}`);
            return;
        }

        switch (value) {
            case 0: // 不能点击
                button.interactable = false;
                const sprite0 = button.getComponent(Sprite);
                if (sprite0) {
                    let opacity0 = sprite0.node.getComponent(UIOpacity);
                    if (!opacity0) {
                        opacity0 = sprite0.node.addComponent(UIOpacity);
                    }
                    opacity0.opacity = 128;
                }
                break;
            case 1: // 能点击
                button.interactable = true;
                const sprite1 = button.getComponent(Sprite);
                if (sprite1) {
                    let opacity1 = sprite1.node.getComponent(UIOpacity);
                    if (!opacity1) {
                        opacity1 = sprite1.node.addComponent(UIOpacity);
                    }
                    opacity1.opacity = 255;
                }
                break;
            case 2: // 灰但能点击
                button.interactable = true;
                const sprite2 = button.getComponent(Sprite);
                if (sprite2) {
                    let opacity2 = sprite2.node.getComponent(UIOpacity);
                    if (!opacity2) {
                        opacity2 = sprite2.node.addComponent(UIOpacity);
                    }
                    opacity2.opacity = 128;
                }
                break;
            case 3: // 不能点也不灰
                button.interactable = false;
                const sprite3 = button.getComponent(Sprite);
                if (sprite3) {
                    let opacity3 = sprite3.node.getComponent(UIOpacity);
                    if (!opacity3) {
                        opacity3 = sprite3.node.addComponent(UIOpacity);
                    }
                    opacity3.opacity = 255;
                }
                break;
        }
    }

    /**
     * 设置按钮点击事件
     * @param path 节点路径或节点对象
     * @param callback 点击回调函数
     * @param rootNode 根节点，默认为 this.node
     */
    protected setBtnEven(path: any, callback: (event: Event, customEventData?: string) => void, rootNode: Node | null = null): void {
        const button = this.getButton(path, rootNode);
        if (!button) {
            Debug.warn(`GameComponent.setBtnEven: 找不到组件 Button ${this.getPath(rootNode || this.node)}/${this.getPath(path)}`);
            return;
        }

        // 清除旧的事件监听
        button.node.off(Button.EventType.CLICK, callback, this);
        // 添加新的事件监听
        button.node.on(Button.EventType.CLICK, callback, this);
    }

    /**
     * 设置节点显示/隐藏
     * @param path 节点路径或节点对象
     * @param isShow 是否显示
     * @param rootNode 根节点，默认为 this.node
     */
    protected setActive(path: any, isShow: boolean, rootNode: Node | null = null): void {
        const node = this.getNode(path, rootNode);
        if (node) {
            node.active = isShow;
        } else {
            Debug.warn(`GameComponent.setActive: 找不到节点 ${this.getPath(rootNode || this.node)}/${this.getPath(path)}`);
        }
    }

    /**
     * 设置节点位置
     * @param path 节点路径或节点对象
     * @param x X坐标
     * @param y Y坐标
     * @param rootNode 根节点，默认为 this.node
     */
    protected setPosition(path: any, x: number, y: number, rootNode: Node | null = null): void {
        const node = this.getNode(path, rootNode);
        if (node) {
            const z = node.position.z;
            node.position = new Vec3(x != null ? x : node.position.x, y != null ? y : node.position.y, z);
        } else {
            Debug.warn(`GameComponent.setPosition: 找不到节点 ${this.getPath(rootNode || this.node)}/${this.getPath(path)}`);
        }
    }

    /**
     * 设置节点尺寸
     * @param path 节点路径或节点对象
     * @param width 宽度
     * @param height 高度
     * @param rootNode 根节点，默认为 this.node
     */
    protected setSize(path: any, width: number, height: number, rootNode: Node | null = null): void {
        const transform = this.getUITransform(path, rootNode);
        if (transform) {
            width = width != null ? width : transform.contentSize.width;
            height = height != null ? height : transform.contentSize.height;
            transform.setContentSize(width, height);
        } else {
            Debug.warn(`GameComponent.setSize: 找不到组件 UITransform ${this.getPath(rootNode || this.node)}/${this.getPath(path)}`);
        }
    }

    /**
     * 设置节点缩放
     * @param path 节点路径或节点对象
     * @param width 宽度缩放
     * @param height 高度缩放
     * @param rootNode 根节点，默认为 this.node
     */
    protected setScale(path: any, width: number, height: number, rootNode: Node | null = null): void {
        const node = this.getNode(path, rootNode);
        if (node) {
            width = width || node.scale.x;
            height = height || node.scale.y;
            node.setScale(width, height, node.scale.z);
        } else {
            Debug.warn(`GameComponent.setScale: 找不到节点 ${this.getPath(rootNode || this.node)}/${this.getPath(path)}`);
        }
    }

    /**
     * 设置 ProgressBar 进度
     * @param path 节点路径或节点对象
     * @param progress 进度值（0-1）
     * @param rootNode 根节点，默认为 this.node
     */
    protected setProgress(path: any, progress: number, rootNode: Node | null = null): void {
        const progressBar = this.getProgressBar(path, rootNode);
        if (progressBar) {
            progressBar.progress = progress;
        } else {
            Debug.warn(`GameComponent.setProgress: 找不到组件 ProgressBar ${this.getPath(rootNode || this.node)}/${this.getPath(path)}`);
        }
    }

    /**
     * 设置 EditBox 文本
     * @param path 节点路径或节点对象
     * @param str 文本内容
     * @param rootNode 根节点，默认为 this.node
     */
    protected setEditBoxString(path: any, str: any, rootNode: Node | null = null): void {
        const editBox = this.getEditBox(path, rootNode);
        if (editBox) {
            editBox.string = str + '';
        } else {
            Debug.warn(`GameComponent.setEditBoxString: 找不到组件 EditBox ${this.getPath(rootNode || this.node)}/${this.getPath(path)}`);
        }
    }

    /**
     * 设置 EditBox 事件
     * @param path 节点路径或节点对象
     * @param callback 事件回调函数
     * @param rootNode 根节点，默认为 this.node
     */
    protected setEditBox(path: any, callback: (event: Event, customEventData?: string) => void, rootNode: Node | null = null): void {
        const editBox = this.getEditBox(path, rootNode);
        if (!editBox) {
            Debug.warn(`GameComponent.setEditBox: 找不到组件 EditBox ${this.getPath(rootNode || this.node)}/${this.getPath(path)}`);
            return;
        }

        editBox.node.off(EditBox.EventType.EDITING_DID_ENDED, callback, this);
        editBox.node.on(EditBox.EventType.EDITING_DID_ENDED, callback, this);
    }

    /**
     * 设置 Toggle 事件
     * @param path 节点路径或节点对象
     * @param callback 事件回调函数
     * @param rootNode 根节点，默认为 this.node
     */
    protected setToggle(path: any, callback: (toggle: Toggle) => void, rootNode: Node | null = null): void {
        const toggle = this.getToggle(path, rootNode);
        if (!toggle) {
            Debug.warn(`GameComponent.setToggle: 找不到组件 Toggle ${this.getPath(rootNode || this.node)}/${this.getPath(path)}`);
            return;
        }

        toggle.node.off(Toggle.EventType.TOGGLE, callback, this);
        toggle.node.on(Toggle.EventType.TOGGLE, callback, this);
    }

    /**
     * 播放动画
     * @param path 节点路径或节点对象
     * @param name 动画名称，如果为 null 则播放默认动画
     * @param rootNode 根节点，默认为 this.node
     */
    protected playAnimation(path: any, name: string | null = null, rootNode: Node | null = null): void {
        const animation = this.getAnimation(path, rootNode);
        if (animation) {
            if (name) {
                animation.play(name);
            } else {
                animation.play();
            }
        } else {
            Debug.warn(`GameComponent.playAnimation: 找不到组件 Animation ${this.getPath(rootNode || this.node)}/${this.getPath(path)}`);
        }
    }

    /**
     * 设置 RichText 文本
     * @param path 节点路径或节点对象
     * @param str 富文本内容
     * @param rootNode 根节点，默认为 this.node
     */
    protected setRichText(path: any, str: string, rootNode: Node | null = null): void {
        const richText = this.getRichText(path, rootNode);
        if (richText) {
            richText.string = str;
        } else {
            Debug.warn(`GameComponent.setRichText: 找不到组件 RichText ${this.getPath(rootNode || this.node)}/${this.getPath(path)}`);
        }
    }

    /**
     * 获取屏幕尺寸
     * @returns 屏幕尺寸
     */
    protected get screen(): Size {
        const canvas = find('Canvas');
        if (canvas) {
            const transform = canvas.getComponent(UITransform);
            if (transform) {
                return transform.contentSize;
            }
        }
        return new Size(1920, 1080); // 默认尺寸
    }

    /************************************* 其他工具方法 ***********************************************/

    /**
     * 日志输出
     * @param ...data 日志数据
     */
    protected log(...data: any[]): void {
        Debug.log(`[${this.node.name}]`, ...data);
    }
}

