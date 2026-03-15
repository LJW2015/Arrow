import { Debug } from "../Core/Debug";
import { EventMgr } from "../Core/EventMgr";
import { EventConstants } from "../Core/Constants";
import { g_scene } from "./GameScene";
import { PrefabConfig } from "../Core/PrefabConfig";
import { GameDefine } from "../Core/GameDefine";

/**
 * 游戏逻辑管理器 (Game Logic Manager)
 * 
 * 功能说明：
 * - 管理游戏全局变量和全局方法
 * - 提供游戏逻辑相关的通用功能
 * - 统一对外接口，外部通过 g_logic 访问

 * 
 */
export class GameLogic {

    // ==================== 游戏状态管理 ====================
    
    /** 游戏状态枚举 */
    public static GameState = {
        /** 未开始 */
        None: 0,
        /** 游戏中 */
        Playing: 1,
        /** 暂停 */
        Paused: 2,
        /** 结束 */
        Ended: 3,
    };

    /** 当前游戏状态 */
    private static _gameState: number = GameLogic.GameState.None;

    /**
     * 获取当前游戏状态
     * @returns 游戏状态
     */
    public static getGameState(): number {
        return this._gameState;
    }

    /**
     * 设置游戏状态
     * @param state 游戏状态
     */
    public static setGameState(state: number): void {
        if (this._gameState !== state) {
            this._gameState = state;
            Debug.info(`GameLogic: Game state changed to ${state}`);
        }
    }

    /**
     * 判断游戏是否正在运行
     * @returns 是否正在运行
     */
    public static isPlaying(): boolean {
        return this._gameState === GameLogic.GameState.Playing;
    }

    /**
     * 判断游戏是否已暂停
     * @returns 是否已暂停
     */
    public static isPaused(): boolean {
        return this._gameState === GameLogic.GameState.Paused;
    }

    /**
     * 判断游戏是否已结束
     * @returns 是否已结束
     */
    public static isEnded(): boolean {
        return this._gameState === GameLogic.GameState.Ended;
    }

    // ==================== 初始化与清理 ====================

    /** 是否已初始化 */
    private static _isInitialized: boolean = false;

    private static _funcUpdates: { func: Function, target: any }[] = [];

    /**
     * 初始化游戏逻辑管理器
     */
    public static init(): void {
        if (this._isInitialized) {
            Debug.warn("GameLogic already initialized");
            return;
        }

        this._gameState = GameLogic.GameState.None;
        this._registerEvent();
        g_scene.openPrefab(PrefabConfig.WLoad);
        
        this._isInitialized = true;
    }

    /**
     * 开始游戏：初始化关卡并进入游戏界面
     */
    public static startGame(): void {
        this.startLevel();
        g_scene.openPrefab(PrefabConfig.GGame);
        g_scene.closePrefab(PrefabConfig.GHome);
        if (GameDefine.isDebug()) {
            g_scene.openPrefab(PrefabConfig.TDebug);
        }
    }

    /**
     * 退出游戏：退出游戏界面并返回主界面
     */
    public static exitGame(): void {
        g_scene.closePrefab(PrefabConfig.GGame);
        g_scene.openPrefab(PrefabConfig.GHome);
        if (GameDefine.isDebug()) {
            g_scene.closePrefab(PrefabConfig.TDebug);
        }
    }
    
    /**
     * 开始关卡
     */
    public static startLevel(): void {
        EventMgr.emit(EventConstants.GAME_LEVEL_UPDATE);
    }


    public static addUpdateFunc(func: Function, target: any): void {
        // 避免重复注册同一函数与目标
        if (!func || this._funcUpdates.some(f => f.func === func && f.target === target)) {
            return;
        }
        this._funcUpdates.push({ func, target });
    }

    public static removeUpdateFunc(func: Function, target: any): void {
        const idx = this._funcUpdates.findIndex(f => f.func === func && f.target === target);
        if (idx >= 0) {
            this._funcUpdates.splice(idx, 1);
        }
    }

    /**
     * 注册事件监听
     */
    private static _registerEvent(): void {
        EventMgr.on(EventConstants.EVENT_LOAD_COMPLETE, this._onLoadComplete, GameLogic);
        EventMgr.on(EventConstants.UI_OPEN_COMMON_WINDOW, this._onOpenCommonWindow, GameLogic);
        // 注册更新函数相关事件（用于解耦 GameComponent 和 GameLogic 的循环引用）
        EventMgr.on(EventConstants.EVENT_REGISTER_UPDATE_FUNC, this._onRegisterUpdateFunc, GameLogic);
        EventMgr.on(EventConstants.EVENT_REMOVE_UPDATE_FUNC, this._onRemoveUpdateFunc, GameLogic);
        EventMgr.on(EventConstants.UI_SHOW_TOAST, this._onShowToast, GameLogic);
    }

    /**
     * 取消事件监听
     */
    private static _unregisterEvent(): void {
        EventMgr.off(EventConstants.EVENT_LOAD_COMPLETE, this._onLoadComplete, GameLogic);
        EventMgr.off(EventConstants.UI_OPEN_COMMON_WINDOW, this._onOpenCommonWindow, GameLogic);
        EventMgr.off(EventConstants.EVENT_REGISTER_UPDATE_FUNC, this._onRegisterUpdateFunc, GameLogic);
        EventMgr.off(EventConstants.EVENT_REMOVE_UPDATE_FUNC, this._onRemoveUpdateFunc, GameLogic);
        EventMgr.off(EventConstants.UI_SHOW_TOAST, this._onShowToast, GameLogic);
    }

    /**
     * 处理注册更新函数事件（由 GameComponent 通过事件系统触发，避免循环引用）
     * @param func 更新函数
     * @param target 目标对象
     */
    private static _onRegisterUpdateFunc(func: Function, target: any): void {
        if (!func || typeof func !== 'function') {
            Debug.warn('GameLogic._onRegisterUpdateFunc: invalid function');
            return;
        }
        this.addUpdateFunc(func, target);
    }

    /**
     * 处理移除更新函数事件（由 GameComponent 通过事件系统触发，避免循环引用）
     * @param func 更新函数
     * @param target 目标对象
     */
    private static _onRemoveUpdateFunc(func: Function, target: any): void {
        if (!func || typeof func !== 'function') {
            Debug.warn('GameLogic._onRemoveUpdateFunc: invalid function');
            return;
        }
        this.removeUpdateFunc(func, target);
    }

    private static _onShowToast(content: string): void {
        g_scene.openMultyPrefab(PrefabConfig.PToast, content);
    }

    /**
     * 销毁游戏逻辑管理器
     */
    public static destroy(): void {
        this._unregisterEvent();
        this._funcUpdates.length = 0;
        this._gameState = GameLogic.GameState.None;
        this._isInitialized = false;
        Debug.info('GameLogic: Destroyed');
    }

    /**
     * 游戏逻辑更新
     * @param dt 帧时间
     */
    public static update(dt: number): void {
        this._doFuncUpdates(dt);
    }

    private static _doFuncUpdates(dt: number): void {
        for (const item of this._funcUpdates) {
            item.func.call(item.target, dt);
        }
    }

    //=======================================================================================

    private static _onOpenCommonWindow(info: any): void {
        g_scene.openPrefab(PrefabConfig.WCommon, info);
    }

    private static async _onLoadComplete(): Promise<void> {
        this._gameState = GameLogic.GameState.Playing;
        g_scene.openPrefab(PrefabConfig.GHome);
        if (GameDefine.isDebug()) {
            g_scene.openPrefab(PrefabConfig.TDebug);
        }
    }

}

// 导出别名
export { GameLogic as g_logic };

