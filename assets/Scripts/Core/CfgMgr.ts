import { Debug } from "./Debug";

/**
 * 配置管理器 (Configuration Manager)
 * 
 * 功能说明：
 * - 负责管理游戏配置表数据（如道具表、关卡表等）
 * - 支持配置数据的加载、查询和管理
 * - 提供按ID查询、数组查询、双主键查询等功能
 * 
 * 数据结构：
 * - CfgData: Map结构，key为配置表名，value为{id: data}的对象映射（单主键）
 * - CfgDataList: Map结构，key为配置表名，value为配置数据数组
 * - CfgDataDoubleKey: Map结构，key为配置表名，value为{type_id: data}的对象映射（双主键）
 * 
 * 主键规则：
 * - 单主键：使用 'id' 字段作为主键（所有配置表必须包含 'id' 字段）
 * - 双主键：如果配置表包含 'type' 字段，自动使用 ('type', 'id') 作为双主键
 * - 'id' 和 'type' 是保留字段名，不允许其他用途占用
 * 
 * 使用示例：
 * ```typescript
 * // 设置配置数据（自动检测是否有 type 字段，决定使用单主键还是双主键）
 * CfgMgr.setCfgData('ItemConfig', itemDataArray);
 * 
 * // 获取配置数据（对象映射）
 * let itemMap = CfgMgr.getCfgData(ItemConfig);
 * 
 * // 获取配置数据（数组）
 * let itemArray = CfgMgr.getCfgDataArray(ItemConfig);
 * 
 * // 根据ID获取配置（单主键）
 * let item = CfgMgr.getDataById(ItemConfig, 1001);
 * 
 * // 根据双主键获取配置（如果配置表有 type 字段）
 * let item = CfgMgr.getDataByDoubleKey(ItemConfig, '1_1', 1001);
 * 
 * // 根据 type 获取所有匹配的配置
 * let items = CfgMgr.getDataByType(ItemConfig, '1_1');
 * ```
 */

export interface LevelCfg {
    id: number;
    target: number[];
    startNumRange: [number, number];
    size: [number, number];
}

export class CfgMgr {
    // 单主键索引：key为配置表名，value为{id: data}的对象映射
    public static CfgData: Map<string, any> = new Map();
    // 配置数据数组：key为配置表名，value为配置数据数组
    public static CfgDataList: Map<string, any> = new Map();
    // 双主键索引：key为配置表名，value为{type_id: data}的对象映射
    private static CfgDataDoubleKey: Map<string, any> = new Map();
    // 双主键标记：key为配置表名，value为boolean（是否使用双主键）
    private static HasDoubleKey: Map<string, boolean> = new Map();


    /**
     * 添加配置数据（追加到现有配置）
     * @param name 配置表名称
     * @param cfgs 配置数据数组
     */
    public static addCfgData(name: string, cfgs: any) {
        if (name == null || !this.CfgDataList.has(name)) {
            Debug.warn("CfgMgr.addCfgData: 不存在配置表 " + name);
            return;
        }
        
        let datas = this.CfgData.get(name);
        let dataList = this.CfgDataList.get(name);
        let doubleKeyData = this.CfgDataDoubleKey.get(name) || {};
        
        // 检查是否使用双主键（检查第一个数据项是否有 type 字段）
        const useDoubleKey = this.HasDoubleKey.get(name) || false;
        
        cfgs.forEach((item) => {
            if (!item.hasOwnProperty('id') && !item.hasOwnProperty('Id')) {
                return;
            }
            
            // 使用 id 字段（兼容 Id 和 id）
            const idValue = item.id !== undefined ? item.id : item.Id;
            datas[idValue] = item;
            dataList.push(item);
            
            // 如果使用双主键，构建双主键索引（type_id）
            if (useDoubleKey) {
                const typeValue = item.type !== undefined ? item.type : item.Type;
                if (typeValue !== undefined && idValue !== undefined) {
                    const doubleKey = `${typeValue}_${idValue}`;
                    doubleKeyData[doubleKey] = item;
                }
            }
        });
        
        // 更新双主键索引
        if (useDoubleKey && Object.keys(doubleKeyData).length > 0) {
            this.CfgDataDoubleKey.set(name, doubleKeyData);
        }
    }


    /**
     * 设置配置数据
     * 自动检测配置表是否有 'type' 字段，决定使用单主键（id）还是双主键（type, id）
     * @param name 配置表名称
     * @param cfgs 配置数据数组
     */
    public static setCfgData(name: string, cfgs: any) {
        if (!name || !cfgs || cfgs.length === 0) {
            return;
        }

        let datas = {};
        let dataList = [];
        let doubleKeyData = {};
        
        // 检查第一个数据项是否有 'type' 字段，决定是否使用双主键
        const firstItem = cfgs[0];
        const hasTypeField = firstItem && (firstItem.hasOwnProperty('type') || firstItem.hasOwnProperty('Type'));
        const useDoubleKey = hasTypeField;
        
        // 记录是否使用双主键
        this.HasDoubleKey.set(name, useDoubleKey);
        
        cfgs.forEach((item) => {
            // 检查是否有 id 字段（必须字段）
            if (!item.hasOwnProperty('id') && !item.hasOwnProperty('Id')) {
                return;
            }
            
            // 使用 id 字段（兼容 Id 和 id）
            const idValue = item.id !== undefined ? item.id : item.Id;
            datas[idValue] = item;
            dataList.push(item);
            
            // 如果使用双主键，构建双主键索引（type_id）
            if (useDoubleKey) {
                const typeValue = item.type !== undefined ? item.type : item.Type;
                if (typeValue !== undefined && idValue !== undefined) {
                    // 使用 "type_id" 格式作为复合键
                    const doubleKey = `${typeValue}_${idValue}`;
                    doubleKeyData[doubleKey] = item;
                }
            }
        });
        
        this.CfgData.set(name, datas);
        this.CfgDataList.set(name, dataList);
        
        // 如果使用双主键，保存双主键索引
        if (useDoubleKey && Object.keys(doubleKeyData).length > 0) {
            this.CfgDataDoubleKey.set(name, doubleKeyData);
        }
    }

    /**
    * 返回数据对象map
    * cfgMgr.getCfgData<class>(class);
    * @param  {any} cfgCls  数据对象
    * @returns T            数据对象
    */
    public static getCfgData<T>(cls: any): { [key: string]: T } {
        let name = cls.ClassName;
        if (!this.CfgData.has(name)) {
            return null;
        }

        return this.CfgData.get(name);
    };

    public static hasCfg(key: string) {
        if (this.CfgData.has(key)) {
            return true;
        }

        return false;
    }

    /**
    * 返回数据对象数组
    * cfgMgr.getCfgDataArray<class>(class);
    * @param  {any} cfgCls 数据对象
    * @returns Array       数据对象数组
    */
    public static getCfgDataArray<T>(name: string): Array<T> {
        if (name == null || !this.CfgDataList.has(name)) {
            return [];
        }

        return this.CfgDataList.get(name) as Array<T>;
    };

    /**
     * 根据ID获得配置（单主键查询）
     * @param cls 配置类
     * @param id id值（string 或 number）
     * @returns 配置数据，不存在返回null
     */
    public static getDataById<T>(name: string, id: string | number): T {
        if (!this.CfgData.has(name)) {
            return null;
        }

        return this.CfgData.get(name)[id] as T || null;
    }


    public static getDataByIndex<T>(name: string, index: number): T {
        if (!this.CfgDataList.has(name)) {
            return null;
        }

        return this.CfgDataList.get(name)[index] as T || null;
    }

    /**
     * 根据双主键获取配置数据（type, id）
     * @param cls 配置类
     * @param type type值（第一个主键）
     * @param id id值（第二个主键）
     * @returns 配置数据，不存在返回null
     * 
     * 使用示例：
     * ```typescript
     * // 通过双主键查询（type, id）
     * let item = CfgMgr.getDataByDoubleKey(ItemConfig, '1_1', 1001);
     * ```
     */
    public static getDataByDoubleKey<T>(name: string, type: string | number, id: string | number): T {
        if (!this.CfgDataDoubleKey.has(name)) {
            return null;
        }
        
        const doubleKey = `${type}_${id}`;
        return this.CfgDataDoubleKey.get(name)[doubleKey] as T || null;
    }

    /**
     * 根据 type 获取所有匹配的配置数据
     * @param cls 配置类
     * @param type type值
     * @returns 匹配的配置数据数组
     * 
     * 使用示例：
     * ```typescript
     * // 获取所有 type 为 '1_1' 的配置
     * let items = CfgMgr.getDataByType(ItemConfig, '1_1');
     * ```
     */
    public static getDataByType<T>(name: string, type: string | number): T[] {
        if (!this.CfgDataDoubleKey.has(name)) {
            return [];
        }

        const doubleKeyData = this.CfgDataDoubleKey.get(name);
        const results: T[] = [];
        const typeStr = String(type);

        for (const key in doubleKeyData) {
            if (key.startsWith(typeStr + '_')) {
                results.push(this.CfgDataDoubleKey.get(name)[key] as T);
            }
        }
        return results;
    }

    /**
     * 检查配置表是否使用双主键
     * @param name 配置表名称
     * @returns 是否使用双主键（是否有 type 字段）
     */
    public static hasDoubleKey(name: string): boolean {
        return this.HasDoubleKey.get(name) === true;
    }

    /**
     * 清除指定配置表
     * @param key 配置表名称
     */
    public static clearByKey(key: string) {
        this.CfgData.delete(key);
        this.CfgDataList.delete(key);
        this.CfgDataDoubleKey.delete(key);
        this.HasDoubleKey.delete(key);
    }
}
