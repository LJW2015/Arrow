import { Constants, EventConstants } from "../Core/Constants";
import { Debug } from "../Core/Debug";
import { LocalStorageMgr } from "../Core/LocalStorageMgr";
import { Util } from "../Core/Util";
import { ResourceMgr } from "../Core/ResourceMgr";
import { GameDefine } from "../Core/GameDefine";
import { g_platform } from "./GamePlatform";
import { JsonAsset } from "cc";
import { EventMgr } from "../Core/EventMgr";
import { g_logic } from "./GameLogic";


/**
 * 玩家数据结构接口
 * 定义游戏中所有玩家相关的数据字段
 * 可以根据实际游戏需求扩展此接口
 */
export interface IPlayerData {
    // 基础信息
    playerId?: string;              // 玩家ID
    playerName?: string;             // 玩家名称
    
    // 其他自定义数据（可以根据游戏需求扩展）
    [key: string]: any;
}


export interface IGameData {
    playerData: IPlayerData;
    gameData: any;
    itemData: any;
}

/**
 * 存档数据格式接口（简化版，用于调试测试）
 */
export interface ISaveData {
    /** 导出时间戳 */
    exportTime: number;
    /** 游戏数据（包含所有 IGameData 的数据） */
    data: IGameData;
}

/**
 * 游戏数据管理器 (GameData Manager)
 * 
 * 核心职责：
 * 统一管理所有游戏数据，提供数据存取、持久化和生命周期管理。
 * 通过 IGameData 接口组织数据，自动与 LocalStorageMgr 同步实现持久化。
 * 
 * 数据组织：
 * - 数据结构：通过 IGameData 接口定义（playerData, gameData, itemData 等）
 * - 数据加载：初始化时遍历 IGameData 的所有 key，从 LocalStorageMgr 加载到内存
 * - 数据保存：修改数据时标记保存，定时器自动序列化并保存到 LocalStorageMgr
 * - 独立存储：每个 key 的数据独立存储和管理，互不干扰
 * 
 * 内存管理：
 * - 内存缓存：使用 _gameData 存储所有游戏数据对象（IGameData 结构）
 * - 保存机制：使用 _markSave 标记数据变化，定时器（每3000ms）检查并保存
 * - 序列化策略：保存时直接序列化 _gameData，无需额外缓存
 * - 立即保存：调用 saveImmediately() 可立即保存，不等待定时器
 * 
 * 数据持久化：
 * - 存储格式：每个 key 独立存储为 ${游戏名}_${key}（由 LocalStorageMgr 处理）
 * - 加密控制：通过 GameDefine.isCrypto 控制（由 LocalStorageMgr 处理）
 * - 自动同步：数据修改后自动标记保存，定时器定期同步到本地存储
 * 
 * 生命周期：
 * - init()：初始化数据管理器，加载本地数据，启动定时保存
 * - destroy()：清理定时器，保存最后一次数据
 * - 建议在游戏启动时调用 init()，游戏退出时调用 destroy()
 * 
 * 使用示例：
 * ```typescript
 * import { g_data } from '../GameFrame/GameData';
 * 
 * // 1. 初始化（在游戏启动时调用，如 Load.ts，异步方法）
 * await g_data.init();
 * 
 * // 2. 获取数据
 * const gold = g_data.getGold();
 * const level = g_data.getLevel();
 * const playerData = g_data.getPlayerData();
 * const gameData = g_data.getData('gameData');
 * 
 * // 3. 设置数据（自动标记保存，定时器会定期保存）
 * g_data.setGold(1000);
 * g_data.setLevel(5);
 * g_data.setData('gameData', { level: 1, score: 100 });
 * 
 * // 4. 立即保存（不等待定时器）
 * g_data.saveImmediately();
 * 
 * // 5. 存档导出/导入
 * const saveData = g_data.exportSave();
 * const result = await g_data.importSave();
 * 
 * // 6. 数据管理
 * g_data.reset();        // 重置玩家数据
 * g_data.clear();        // 清除玩家数据
 * g_data.clearKey('gameData');  // 清除指定 key
 * 
 * // 7. 销毁（游戏退出时调用）
 * g_data.destroy();
 * ```
 * 
 * 注意事项：
 * - 所有数据操作都会自动保存，无需手动调用保存方法
 * - 定时保存间隔为 3000ms，频繁修改数据不会造成性能问题
 * - 建议通过 GameData 管理数据，而不是直接使用 LocalStorageMgr
 * - 扩展数据时，只需在 IGameData 接口中添加新的 key 即可
 */
export class GameData {
    // 内存中的游戏数据缓存（根据 IGameData 接口定义）
    private static _gameData: IGameData = {
        playerData: {},
        gameData: {},
        itemData: {}
    };
    // 标记是否需要保存
    private static _markSave: boolean = false;
    // 保存间隔计时（由 g_logic.update 驱动）
    private static _saveElapsedMs: number = 0;
    // 默认 3000ms 定时落盘，避免频繁操作也能较快持久化
    private static readonly _SAVE_INTERVAL_MS: number = 3000;
    // 是否已初始化
    private static _isInitialized: boolean = false;

    /**
     * 获取 IGameData 的所有 key 列表
     * @returns key 数组
     */
    private static _getGameDataKeys(): (keyof IGameData)[] {
        return ['playerData', 'gameData', 'itemData'];
    }

    /**
     * 初始化游戏数据管理器（异步）
     * 根据 isDebug 判断从本地存储还是云端加载数据
     * 如果数据不存在则使用默认值
     * 启动定时保存机制
     */
    public static async init(): Promise<void> {
        if (this._isInitialized) {
            Debug.warn("GameData already initialized");
            // 已经初始化，派发成功事件，确保流程继续
            EventMgr.emit(EventConstants.EVENT_LOADDATA_END, true);
            return;
        }

        try {
            // 先填充默认存档，再用加载结果覆盖已有 key
            this._setDefaultData(false);
            let loadSuccess = true;

            if (!GameDefine.useSDK) {
                // 调试模式：从本地存储加载数据（按 key 分别加载）
                loadSuccess = await this._loadFromLocal();
            } else {
                loadSuccess = await this._loadFromCloud();
            }

            if (!loadSuccess) {
                this._isInitialized = false;
                EventMgr.emit(EventConstants.EVENT_LOADDATA_END, false);
                return;
            }

            // 重置计时
            this._saveElapsedMs = 0;

            // 标记为已初始化（成功后才标记）
            this._isInitialized = true;
            g_logic.addUpdateFunc(this.update, this);
            EventMgr.emit(EventConstants.EVENT_LOADDATA_END, true);
        } catch (error) {
            Debug.error("GameData init error:", error);
            // 初始化失败，不标记为已初始化，派发失败事件
            this._isInitialized = false;
            EventMgr.emit(EventConstants.EVENT_LOADDATA_END, false);
        }
    }

    /**
     * 从本地存储加载数据（按 key 分别加载）
     * @returns 是否有新数据（需要保存）
     */
    private static async _loadFromLocal(): Promise<boolean> {
        const keys = this._getGameDataKeys();
        let loadSuccess = true;

        for (const key of keys) {
            const dataStr = LocalStorageMgr.loadKey(key);
            
            if (dataStr) {
                try {
                    const parsedData = JSON.parse(dataStr);
                    if (parsedData && typeof parsedData === 'object') {
                        this._gameData[key] = parsedData;
                    } else {
                        Debug.warn(`GameData: invalid data format for key "${key}", using default data`);
                    }
                } catch (error) {
                    Debug.error(`GameData: failed to parse data for key "${key}"`, error);
                }
            } // 无数据则保持默认值
        }

        return loadSuccess;
    }

    /**
     * 从云端加载数据（全量加载）
     * @returns 是否有新数据（需要保存）
     */
    private static async _loadFromCloud(): Promise<boolean> {
        const MAX_RETRY = 3;
        const RETRY_DELAY_BASE = 1; // 秒

        for (let retryIndex = 0; retryIndex < MAX_RETRY; retryIndex++) {
            try {
                const archiveResp = await g_platform.load();
                if(archiveResp){
                    if(archiveResp.data && archiveResp.updatedAt > 0 && archiveResp.data.data){
                        let gameDataObj: IGameData = JSON.parse(archiveResp.data.data);
                        const keys = this._getGameDataKeys();
                        for (const key of keys) {
                            if (gameDataObj[key] !== undefined) {
                                this._gameData[key] = Util.clone(gameDataObj[key]);
                            }
                        }
                    }
                    return true; // 成功加载
                }else{
                    Debug.warn(`GameData: cloud data empty at attempt ${retryIndex + 1}/${MAX_RETRY}`);
                }
            } catch (error) {
                Debug.warn(`GameData: load cloud failed at attempt ${retryIndex + 1}/${MAX_RETRY}`, error);
            }

            // 延迟重试（最后一次失败不再等待）
            if (retryIndex < MAX_RETRY - 1) {
                const delay = RETRY_DELAY_BASE * Math.pow(2, retryIndex) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        // 全部失败，直接返回 false，不覆盖默认数据
        return false;
    }


    private static _setDefaultData(save: boolean = false) {
        const keys = this._getGameDataKeys();
        for (const key of keys) {
            this._gameData[key] = this._getDefaultDataForKey(key);
        }
        if (save) {
            this.saveImmediately();
        }
    }

    /**
     * 销毁游戏数据管理器
     */
    public static destroy() {
        // 保存最后一次数据并移除帧循环
        this.saveImmediately();
        g_logic.removeUpdateFunc(this.update, this);
        this._saveElapsedMs = 0;
        this._markSave = false;
        this._isInitialized = false;
    }

    /**
     * 获取指定 key 的默认数据
     * @param key IGameData 的 key
     * @returns 默认数据
     */
    private static _getDefaultDataForKey(key: keyof IGameData): any {
        switch (key) {
            case 'playerData':
                return this._getDefaultData();
            case 'gameData':
                return {};
            case 'itemData':
                return {};
            default:
                return {};
        }
    }

    /**
     * 获取默认的玩家数据
     * @returns 默认数据对象
     */
    private static _getDefaultData(): IPlayerData {
        return {
            playerId: '1',
            playerName: '玩家',
        };
    }

    /**
     * 定时保存数据（由 g_logic.update(dt) 每帧驱动）
     * 根据 isDebug 判断保存到本地存储还是云端
     */
    private static scheduleData() {
        if (!this._markSave) {
            return;
        }

        // 先重置标记，避免重复保存
        this._markSave = false;

        if (!GameDefine.useSDK) {
            // 调试模式：保存到本地存储（按 key 分别保存）
            this._saveToLocal();
        } else {
            // 正式模式：保存到云端（全量保存，异步操作）
            // 注意：异步操作不等待完成，如果保存失败会在 _saveToCloud 中重新标记 _markSave
            this._saveToCloud().catch((error) => {
                // 保存失败，_saveToCloud 内部已经重新标记了 _markSave
                Debug.error('GameData: scheduleData save to cloud error', error);
            });
        }
    }

    public static update(dt: number): void {
        if (!this._isInitialized) {
            return;
        }
        this._saveElapsedMs += dt * 1000;
        if (this._saveElapsedMs >= this._SAVE_INTERVAL_MS) {
            this._saveElapsedMs = 0;
            this.scheduleData();
        }
    }

    /**
     * 保存数据到本地存储
     * 遍历 _gameData 的第一层 key，每个 key 序列化后单独保存
     */
    private static _saveToLocal() {
        try {
            // 遍历 _gameData 的第一层 key，每个 key 序列化后单独保存
            const keys = this._getGameDataKeys();
            for (const key of keys) {
                const dataStr = JSON.stringify(this._gameData[key]);
                LocalStorageMgr.saveKey(key, dataStr);
            }
            Debug.info('GameData: Saved to local storage');
        } catch (error) {
            // 存储失败可能是空间不足、平台限制等原因
            Debug.error("GameData: Save to local storage error", error);
            Debug.error("This may be due to storage quota exceeded or platform restrictions");
            // 不重置 _markSave，下次再尝试保存
            this._markSave = true;
        }
    }

    /**
     * 保存数据到云端
     * 将整个 _gameData 序列化为字符串后上传（全量上传，不加密）
     */
    private static async _saveToCloud() {
        try {
        
           const gameDataStr = Util.clone(JSON.stringify(this._gameData));
            // 调用平台管理器上传到云端
            const result = await g_platform.save(gameDataStr);
            
            if (result) {
                Debug.info('GameData: Save to cloud success (length:', gameDataStr.length, ')');
            } else {
                Debug.warn('GameData: Save to cloud failed');
                // 保存失败，标记下次再尝试
                this._markSave = true;
            }
        } catch (error) {
            Debug.error('GameData: Save to cloud error', error);
            // 保存失败，标记下次再尝试
            this._markSave = true;
        }
    }

    /**
     * 保存所有数据到本地存储
     * 标记需要保存，定时器会自动序列化并保存
     */
    private static _saveAllData() {
        this._markSave = true;
    }

    /**
     * 保存指定 key 的数据到本地存储
     * 标记需要保存，定时器会自动序列化并保存
     * @param key IGameData 的 key
     */
    private static _saveData(key: keyof IGameData) {
        // 标记需要保存
        this._markSave = true;
    }

    /**
     * 立即保存所有数据到本地存储
     * 不等待定时器，立即执行保存操作
     */
    public static saveImmediately() {
        // 标记需要保存
        this._markSave = true;
        // 立即执行保存
        this.scheduleData();
    }

    public static async saveImmediatelyNoSchedule() {
        let res = false;
        if (!GameDefine.useSDK) {
            // 调试模式：保存到本地存储（按 key 分别保存）
            this._saveToLocal();
            res = true;
        } else {
            // 正式模式：保存到云端（全量保存，异步操作）
            // 注意：异步操作不等待完成，如果保存失败会在 _saveToCloud 中重新标记 _markSave
            try {
                await this._saveToCloud();
                res = true;
            } catch (error) {
                Debug.error('GameData: Save to cloud error', error);
                res = false;
            }
        }
        return res;
    }

    /**
     * 获取完整的游戏数据对象
     * @returns 游戏数据对象的深拷贝
     */
    public static getGameData(): IGameData {
        return Util.clone(this._gameData);
    }

    /**
     * 获取完整的玩家数据对象
     * @returns 玩家数据对象的深拷贝
     */
    public static getPlayerData(): IPlayerData {
        return Util.clone(this._gameData.playerData);
    }

    /**
     * 设置完整的玩家数据对象
     * @param data 玩家数据对象
     */
    public static setPlayerData(data: IPlayerData) {
        if (!data || typeof data !== 'object') {
            Debug.warn("GameData.setPlayerData: invalid data");
            return;
        }
        this._gameData.playerData = Util.clone(data);
        this._saveData('playerData');
    }

    /**
     * 获取指定 key 的数据
     * @param key IGameData 的 key
     * @returns 数据对象的深拷贝
     */
    public static getData<T = any>(key: keyof IGameData): T {
        return Util.clone(this._gameData[key]) as T;
    }

    /**
     * 设置指定 key 的数据
     * @param key IGameData 的 key
     * @param data 数据对象
     */
    public static setData(key: keyof IGameData, data: any) {
        if (!data || typeof data !== 'object') {
            Debug.warn(`GameData.setData: invalid data for key "${key}"`);
            return;
        }
        this._gameData[key] = Util.clone(data);
        this._saveData(key);
    }

    // ==================== 基础信息相关方法 ====================

    /**
     * 获取玩家ID
     */
    public static getPlayerId(): string {
        return this._gameData.playerData.playerId || '';
    }

    /**
     * 设置玩家ID
     */
    public static setPlayerId(id: string) {
        this._gameData.playerData.playerId = id;
        this._saveData('playerData');
    }

    /**
     * 获取玩家名称
     */
    public static getPlayerName(): string {
        return this._gameData.playerData.playerName || '玩家';
    }

    /**
     * 设置玩家名称
     */
    public static setPlayerName(name: string) {
        this._gameData.playerData.playerName = name;
        this._saveData('playerData');
    }

    /**
     * 获取玩家等级
     */
    public static getLevel(): number {
        return this._gameData.playerData.level || 1;
    }

    /**
     * 设置玩家等级
     */
    public static setLevel(level: number) {
        this._gameData.playerData.level = Math.max(1, level);
        this._saveData('playerData');
    }

    /**
     * 获取经验值
     */
    public static getExp(): number {
        return this._gameData.playerData.exp || 0;
    }

    /**
     * 设置经验值
     */
    public static setExp(exp: number) {
        this._gameData.playerData.exp = Math.max(0, exp);
        this._saveData('playerData');
    }

    /**
     * 增加经验值
     */
    public static addExp(exp: number) {
        this._gameData.playerData.exp = (this._gameData.playerData.exp || 0) + Math.max(0, exp);
        this._saveData('playerData');
    }

    // ==================== 货币相关方法 ====================

    /**
     * 获取金币
     */
    public static getGold(): number {
        return this._gameData.playerData.gold || 0;
    }

    /**
     * 设置金币
     */
    public static setGold(gold: number) {
        this._gameData.playerData.gold = Math.max(0, gold);
        this._saveData('playerData');
    }

    /**
     * 增加金币
     */
    public static addGold(gold: number) {
        this._gameData.playerData.gold = (this._gameData.playerData.gold || 0) + gold;
        this._saveData('playerData');
    }

    /**
     * 消耗金币
     * @param gold 要消耗的金币数量
     * @returns 是否消耗成功（余额不足返回false）
     */
    public static consumeGold(gold: number): boolean {
        const currentGold = this._gameData.playerData.gold || 0;
        if (currentGold < gold) {
            Debug.warn(`GameData.consumeGold: insufficient gold. Current: ${currentGold}, Required: ${gold}`);
            return false;
        }
        this._gameData.playerData.gold = currentGold - gold;
        this._saveData('playerData');
        return true;
    }

    /**
     * 获取钻石
     */
    public static getDiamond(): number {
        return this._gameData.playerData.diamond || 0;
    }

    /**
     * 设置钻石
     */
    public static setDiamond(diamond: number) {
        this._gameData.playerData.diamond = Math.max(0, diamond);
        this._saveData('playerData');
    }

    /**
     * 增加钻石
     */
    public static addDiamond(diamond: number) {
        this._gameData.playerData.diamond = (this._gameData.playerData.diamond || 0) + diamond;
        this._saveData('playerData');
    }

    /**
     * 消耗钻石
     * @param diamond 要消耗的钻石数量
     * @returns 是否消耗成功（余额不足返回false）
     */
    public static consumeDiamond(diamond: number): boolean {
        const currentDiamond = this._gameData.playerData.diamond || 0;
        if (currentDiamond < diamond) {
            Debug.warn(`GameData.consumeDiamond: insufficient diamond. Current: ${currentDiamond}, Required: ${diamond}`);
            return false;
        }
        this._gameData.playerData.diamond = currentDiamond - diamond;
        this._saveData('playerData');
        return true;
    }

    // ==================== 游戏进度相关方法 ====================

    /**
     * 获取当前关卡
     */
    public static getCurrentStage(): number {
        return this._gameData.playerData.currentStage || 1;
    }

    /**
     * 设置当前关卡
     */
    public static setCurrentStage(stage: number) {
        this._gameData.playerData.currentStage = Math.max(1, stage);
        this._saveData('playerData');
    }

    /**
     * 获取最高通关关卡
     */
    public static getMaxStage(): number {
        return this._gameData.playerData.maxStage || 1;
    }

    /**
     * 设置最高通关关卡
     */
    public static setMaxStage(stage: number) {
        const currentMax = this._gameData.playerData.maxStage || 1;
        this._gameData.playerData.maxStage = Math.max(currentMax, Math.max(1, stage));
        this._saveData('playerData');
    }

    /**
     * 获取总分数
     */
    public static getTotalScore(): number {
        return this._gameData.playerData.totalScore || 0;
    }

    /**
     * 设置总分数
     */
    public static setTotalScore(score: number) {
        this._gameData.playerData.totalScore = Math.max(0, score);
        this._saveData('playerData');
    }

    /**
     * 增加总分数
     */
    public static addTotalScore(score: number) {
        this._gameData.playerData.totalScore = (this._gameData.playerData.totalScore || 0) + Math.max(0, score);
        this._saveData('playerData');
    }

    // ==================== 设置相关方法 ====================

    /**
     * 获取音乐音量
     */
    public static getMusicVolume(): number {
        return this._gameData.playerData.musicVolume !== undefined ? this._gameData.playerData.musicVolume : 1.0;
    }

    /**
     * 设置音乐音量
     * @param volume 音量值（0-1）
     */
    public static setMusicVolume(volume: number) {
        this._gameData.playerData.musicVolume = Math.max(0, Math.min(1, volume));
        this._saveData('playerData');
    }

    /**
     * 获取音效音量
     */
    public static getSoundVolume(): number {
        return this._gameData.playerData.soundVolume !== undefined ? this._gameData.playerData.soundVolume : 1.0;
    }

    /**
     * 设置音效音量
     * @param volume 音量值（0-1）
     */
    public static setSoundVolume(volume: number) {
        this._gameData.playerData.soundVolume = Math.max(0, Math.min(1, volume));
        this._saveData('playerData');
    }

    /**
     * 获取震动开关状态
     */
    public static isVibrationEnabled(): boolean {
        return this._gameData.playerData.vibrationEnabled !== undefined ? this._gameData.playerData.vibrationEnabled : true;
    }

    /**
     * 设置震动开关
     */
    public static setVibrationEnabled(enabled: boolean) {
        this._gameData.playerData.vibrationEnabled = enabled;
        this._saveData('playerData');
    }

    // ==================== 通用数据操作方法 ====================

    /**
     * 获取玩家数据的自定义字段
     * @param key 数据键名
     * @param defaultValue 默认值（如果不存在）
     * @returns 数据值
     */
    public static getPlayerDataField<T = any>(key: string, defaultValue?: T): T {
        if (this._gameData.playerData.hasOwnProperty(key)) {
            return this._gameData.playerData[key] as T;
        }
        return defaultValue as T;
    }

    /**
     * 设置玩家数据的自定义字段
     * @param key 数据键名
     * @param value 数据值
     */
    public static setPlayerDataField(key: string, value: any) {
        this._gameData.playerData[key] = value;
        this._saveData('playerData');
    }

    /**
     * 检查玩家数据字段是否存在
     * @param key 数据键名
     * @returns 是否存在
     */
    public static hasPlayerDataField(key: string): boolean {
        return this._gameData.playerData.hasOwnProperty(key);
    }

    /**
     * 删除玩家数据字段
     * @param key 数据键名
     */
    public static deletePlayerDataField(key: string) {
        if (this._gameData.playerData.hasOwnProperty(key)) {
            delete this._gameData.playerData[key];
            this._saveData('playerData');
        }
    }

    // ==================== 数据管理方法 ====================

    /**
     * 重置玩家数据为默认值
     * 注意：会清除所有当前数据
     */
    public static reset() {
        this._gameData.playerData = this._getDefaultData();
        this._saveData('playerData');
    }

    /**
     * 清除所有玩家数据
     * 从本地存储中删除玩家数据
     */
    public static clear() {
        LocalStorageMgr.clearByKey('playerData');
        this._gameData.playerData = this._getDefaultData();
    }

    /**
     * 重置指定 key 的数据为默认值
     * @param key IGameData 的 key
     */
    public static resetKey(key: keyof IGameData) {
        this._gameData[key] = this._getDefaultDataForKey(key);
        this._saveData(key);
    }

    /**
     * 清除指定 key 的数据
     * @param key IGameData 的 key
     */
    public static clearKey(key: keyof IGameData) {
        LocalStorageMgr.clearByKey(key);
        this._gameData[key] = this._getDefaultDataForKey(key);
    }

    /**
     * 检查是否已初始化
     * @returns 是否已初始化
     */
    public static isInitialized(): boolean {
        return this._isInitialized;
    }

    // ==================== 存档导出/导入功能（简化版，用于调试测试） ====================

    /**
     * 导出游戏存档（未加密，JSON格式）
     * 导出所有 IGameData 的数据
     * @returns 存档数据字符串（JSON格式）
     * 
     * 使用示例：
     * ```typescript
     * const saveData = g_data.exportSave();
     * console.log(saveData); // 可以复制给用户或保存到文件
     * ```
     */
    public static exportSave(): string {
        if (!this._isInitialized) {
            Debug.error("GameData.exportSave: GameData not initialized");
            return '';
        }

        try {
            // 获取所有游戏数据
            const gameData = this.getGameData();
            
            // 构建存档数据对象
            const saveData = {
                exportTime: Date.now(),
                data: gameData
            };

            // 序列化为JSON（格式化，便于阅读）
            const jsonStr = JSON.stringify(saveData, null, 2);

            Debug.info("GameData.exportSave: save data exported successfully");
            return jsonStr;
        } catch (error) {
            Debug.error("GameData.exportSave error:", error);
            return '';
        }
    }

    /**
     * 导入游戏存档（从文件读取，完全覆盖）
     * 从 resources/SaveData/my_save.json 文件读取存档数据
     * 导入成功后自动保存到本地存储
     * @returns Promise<导入结果对象 { success: boolean, message: string, data?: ISaveData }>
     * 
     * 使用示例：
     * ```typescript
     * // 导入存档（完全覆盖，并保存到本地）
     * const result = await g_data.importSave();
     * if (result.success) {
     *     console.log('导入成功');
     * } else {
     *     console.error('导入失败:', result.message);
     * }
     * ```
     */
    public static async importSave(): Promise<{ success: boolean; message: string; data?: ISaveData }> {
        if (!this._isInitialized) {
            return {
                success: false,
                message: 'GameData not initialized'
            };
        }

        try {
            // 从 resources/SaveData/my_save.json 加载存档文件
            const jsonAsset = await ResourceMgr.loadRes<JsonAsset>('SaveData/my_save', JsonAsset);
            
            if (!jsonAsset || !jsonAsset.json) {
                return {
                    success: false,
                    message: 'Failed to load save file or file is empty'
                };
            }

            // 获取 JSON 数据
            const saveData: ISaveData = jsonAsset.json as ISaveData;

            // 验证数据结构
            if (!saveData || typeof saveData !== 'object') {
                return {
                    success: false,
                    message: 'Invalid save data format'
                };
            }

            if (!saveData.data || typeof saveData.data !== 'object') {
                return {
                    success: false,
                    message: 'Invalid game data in save file'
                };
            }

            // 完全覆盖模式：遍历 IGameData 的 key，完全替换现有数据
            const keys = this._getGameDataKeys();
            for (const key of keys) {
                if (saveData.data.hasOwnProperty(key)) {
                    this.setData(key, saveData.data[key]);
                }
            }

            // 导入成功后，立即保存所有数据到本地存储
            this.saveImmediately();

            Debug.info("GameData.importSave: save data imported successfully from file and saved to local storage");
            return {
                success: true,
                message: 'Save data imported successfully',
                data: saveData
            };
        } catch (error) {
            Debug.error("GameData.importSave error:", error);
            return {
                success: false,
                message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * 下载存档文件（Web平台）
     * 
     * 实现原理：
     * 1. 将存档数据转换为 Blob 对象（二进制数据）
     * 2. 使用 URL.createObjectURL() 创建临时下载链接
     * 3. 创建隐藏的 <a> 标签，设置 download 属性
     * 4. 程序化触发点击事件，触发浏览器下载
     * 5. 清理临时链接和 DOM 元素
     * 
     * 下载位置：
     * - 文件会下载到浏览器默认的下载目录（通常是用户的"下载"文件夹）
     * - 具体位置取决于浏览器的设置：
     *   - Chrome/Edge: 设置 > 下载内容 > 位置
     *   - Firefox: 选项 > 常规 > 下载
     *   - Safari: 偏好设置 > 通用 > 文件下载位置
     * - 用户可以在浏览器下载管理器中查看和打开文件
     * 
     * @param filename 文件名（默认：save_data_YYYYMMDD_HHMMSS.json）
     * @returns 是否成功
     * 
     * 使用示例：
     * ```typescript
     * // 使用默认文件名（带时间戳）
     * await g_data.downloadSaveFile();
     * 
     * // 自定义文件名
     * await g_data.downloadSaveFile('my_save.json');
     * ```
     */
    public static async downloadSaveFile(filename?: string): Promise<boolean> {
        // 仅Web平台支持（需要 DOM API）
        if (typeof document === 'undefined') {
            Debug.warn("GameData.downloadSaveFile: only supported on Web platform");
            return false;
        }

        try {
            // 1. 导出存档数据
            const saveData = this.exportSave();
            if (!saveData) {
                return false;
            }

            // 2. 生成文件名（如果未提供）
            if (!filename) {
                const date = new Date();
                // 格式：save_data_20231201_123456.json
                const dateStr = date.toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '_');
                filename = `save_data_${dateStr}.json`;
            }

            // 3. 创建 Blob 对象（二进制数据对象）
            // Blob 用于在内存中存储数据，不依赖文件系统
            const blob = new Blob([saveData], { type: 'application/json' });
            
            // 4. 创建临时下载链接
            // URL.createObjectURL() 创建一个指向 Blob 的临时 URL
            // 格式类似：blob:http://localhost:8080/xxx-xxx-xxx
            const url = URL.createObjectURL(blob);
            
            // 5. 创建隐藏的下载链接
            const link = document.createElement('a');
            link.href = url;                    // 设置链接地址
            link.download = filename;           // 设置下载文件名（重要！）
            link.style.display = 'none';        // 隐藏链接（可选，因为会立即移除）
            
            // 6. 添加到 DOM 并触发下载
            document.body.appendChild(link);
            link.click();                       // 程序化触发点击，浏览器开始下载
            
            // 7. 清理：移除 DOM 元素和释放临时 URL
            document.body.removeChild(link);
            URL.revokeObjectURL(url);          // 释放内存，避免内存泄漏

            Debug.info(`GameData.downloadSaveFile: file "${filename}" downloaded`);
            return true;
        } catch (error) {
            Debug.error("GameData.downloadSaveFile error:", error);
            return false;
        }
    }
}

// 导出别名
export { GameData as g_data };

