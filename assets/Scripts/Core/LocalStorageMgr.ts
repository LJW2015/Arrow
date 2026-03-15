import { sys } from "cc";
import { Constants } from "./Constants";
import { Util } from "./Util";
import { CryptoMgr } from "./CryptoMgr";
import { Debug } from "./Debug";
import { GameDefine } from "./GameDefine";

/**
 * 本地存储管理器 (LocalStorage Manager)
 * 
 * 职责：
 * 提供基础的本地存储操作，包括数据存取、加密控制和 key 管理。
 * 这是一个纯工具类，不管理内存缓存和定时保存，这些功能由 GameData 负责。
 * 
 * 核心功能：
 * - 数据存取：提供 saveKey() 和 loadKey() 方法，直接操作 localStorage
 * - 加密控制：根据 GameDefine.isCrypto 自动处理数据加密/解密
 * - Key 管理：自动添加游戏名前缀，格式为 ${游戏名}_${key}
 * 
 * 存储格式：
 * - 每个 key 单独存储，实际存储 key 格式：${游戏名}_${key}
 * - 游戏名通过 GameDefine.gameName 配置（默认：'Template'）
 * - 示例：gameName = 'Template'，key = 'playerData' → 实际存储 key = 'Template_playerData'
 * 
 * 加密机制：
 * - 加密控制：通过 GameDefine.isCrypto 开关控制
 *   - true：数据加密存储（生产环境推荐，使用 '@' 前缀标识）
 *   - false：数据明文存储（调试测试时使用，便于查看和编辑）
 * - 兼容性：支持读取历史数据（无论加密或未加密），自动识别并处理
 * 
 * 设计原则：
 * - 单一职责：只负责基础存储操作，不管理业务逻辑
 * - 无状态：不维护内存缓存，每次操作直接读写 localStorage
 * - 平台适配：使用 Cocos Creator 的 sys.localStorage，支持跨平台
 * 
 * 使用说明：
 * - 业务代码应通过 GameData 管理数据，而不是直接使用本类
 * - 本类主要用于 GameData 内部调用，或特殊场景下的直接存储需求
 * 
 * @example
 * ```typescript
 * // 直接使用（不推荐，应通过 GameData）
 * LocalStorageMgr.saveKey('testKey', JSON.stringify({ value: 123 }));
 * const data = LocalStorageMgr.loadKey('testKey');
 * 
 * // 推荐方式：通过 GameData
 * g_data.setData('gameData', { value: 123 });
 * const data = g_data.getData('gameData');
 * ```
 */
export class LocalStorageMgr {

    /**
     * 生成带游戏名前缀的存储 key
     * @param key 原始 key
     * @returns 格式化的 key: ${游戏名}_${key}
     */
    private static _getStorageKey(key: string): string {
        return `${GameDefine.gameName}_${key}`;
    }


    /**
     * 根据版本号清除本地数据
     * 当版本号不同且 needForceUpdate 为 true 时，清空所有本地存储数据
     * 注意：此方法需要配合 GameData 使用，因为版本数据可能存储在 GameData 中
     */
    public static clearConfigDataToVersion() {
        const localCacheVersion = this.loadKey(Constants.cacheVersion);
        const currentVersion = GameDefine.gameVersion;
        const needForceUpdate = Constants.needForceUpdate;
        
        // 如果本地版本号与当前版本号不同
        if (localCacheVersion && localCacheVersion !== currentVersion) {
            // 如果需要强制更新，清空所有数据
            if (needForceUpdate) {
                Debug.info(`LocalStorageMgr.clearConfigDataToVersion: version changed from "${localCacheVersion}" to "${currentVersion}", needForceUpdate=true, clearing all data`);
                this.clearConfigData();
            } else {
                // 不需要强制更新，只更新版本号，保留数据
                Debug.info(`LocalStorageMgr.clearConfigDataToVersion: version changed from "${localCacheVersion}" to "${currentVersion}", needForceUpdate=false, keeping data`);
            }
        } else if (!localCacheVersion) {
            // 首次运行或没有版本配置，清空所有数据（确保数据一致性）
            Debug.info(`LocalStorageMgr.clearConfigDataToVersion: first run or no version found, clearing all data`);
            this.clearConfigData();
        }
        
        // 更新本地版本号
        this.saveKey(Constants.cacheVersion, currentVersion);
    }

    /**
     * 清除指定key的数据
     * @param key 要清除的数据key
     */
    public static clearByKey(key: string) {
        if (!sys.localStorage) {
            Debug.warn("LocalStorageMgr.clearByKey: sys.localStorage is not available");
            return;
        }
        
        try {
            const storageKey = this._getStorageKey(key);
            sys.localStorage.removeItem(storageKey);
        } catch (error) {
            Debug.error(`LocalStorageMgr.clearByKey error: failed to remove key "${key}"`, error);
        }
    }

    /**
     * 清除所有本地存储数据
     * 清除所有 ${游戏名}_${key} 格式的 key
     */
    public static clearConfigData() {
        if (!sys.localStorage) {
            Debug.warn("LocalStorageMgr.clearConfigData: sys.localStorage is not available");
            return;
        }
        try {
            // 获取游戏名前缀
            const gameNamePrefix = `${GameDefine.gameName}_`;
            
            // 如果支持遍历，删除所有匹配的 key
            try {
                if (typeof window !== 'undefined' && window.localStorage === sys.localStorage) {
                    const allKeys = Object.keys(sys.localStorage);
                    for (const fullKey of allKeys) {
                        if (fullKey.startsWith(gameNamePrefix)) {
                            sys.localStorage.removeItem(fullKey);
                        }
                    }
                } else {
                    // 如果不支持遍历，尝试删除已知的 key（由 GameData 管理）
                    // 这里无法完全清除，需要 GameData 配合
                    Debug.warn("LocalStorageMgr.clearConfigData: cannot enumerate localStorage, some keys may remain");
                }
            } catch (error) {
                Debug.error("LocalStorageMgr.clearConfigData error:", error);
            }
        } catch (error) {
            Debug.error("LocalStorageMgr.clearConfigData error:", error);
        }
    }


    /**
     * 保存单个 key 的数据到 localStorage
     * @param key 数据 key
     * @param value 数据值（字符串）
     */
    private static _saveKey(key: string, value: string) {
        let finalData: string;
        
        // 根据 GameDefine.isCrypto 决定是否加密
        if (GameDefine.isCrypto) {
            // 加密模式：添加 '@' 前缀标识加密数据
            finalData = '@' + CryptoMgr.encrypt(value);
        } else {
            // 不加密模式：直接使用原始数据
            finalData = value;
        }
        
        // 检查数据大小（某些平台可能有存储大小限制）
        // 微信小游戏单个 key 限制约 1MB，其他平台可能不同
        if (finalData.length > 1024 * 1024) {
            Debug.warn(`LocalStorageMgr._saveKey: data size for key "${key}" exceeds 1MB, may fail on some platforms`);
        }
        
        // 使用带游戏名前缀的 key 保存
        const storageKey = this._getStorageKey(key);
        sys.localStorage.setItem(storageKey, finalData);
    }

    /**
     * 从 localStorage 读取单个 key 的数据
     * @param key 数据 key
     * @returns 数据值（字符串），不存在返回 null
     */
    private static _loadKey(key: string): string | null {
        const storageKey = this._getStorageKey(key);
        const value = sys.localStorage.getItem(storageKey);
        
        if (!value || value.length === 0) {
            return null;
        }
        
        try {
            // 判断数据是否加密（以 '@' 开头表示加密）
            let data = value;
            const isEncrypted = data.startsWith('@');
            
            if (isEncrypted) {
                data = data.substring(1);
                data = CryptoMgr.decrypt(data);
            }
            
            return data;
        } catch (error) {
            Debug.error(`LocalStorageMgr._loadKey error: failed to parse data for key "${key}"`, error);
            return null;
        }
    }

    /**
     * 直接保存单个 key 的数据（立即保存到 localStorage）
     * @param key 数据 key
     * @param value 数据值（字符串）
     */
    public static saveKey(key: string, value: string) {
        if (!sys.localStorage) {
            Debug.warn("LocalStorageMgr.saveKey: sys.localStorage is not available");
            return;
        }
        
        // 直接保存到 localStorage
        this._saveKey(key, value);
    }

    /**
     * 直接读取单个 key 的数据（从 localStorage 读取）
     * @param key 数据 key
     * @returns 数据值（字符串），不存在返回 null
     */
    public static loadKey(key: string): string | null {
        if (!sys.localStorage) {
            return null;
        }
        
        return this._loadKey(key);
    }
}


