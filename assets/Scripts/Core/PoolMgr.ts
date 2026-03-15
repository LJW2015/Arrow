import { Node, Prefab, instantiate, NodePool } from "cc";
import { Debug } from "./Debug";

/**
 * 对象池管理器 (Pool Manager)
 * 
 * 功能说明：
 * - 管理游戏对象的复用，减少频繁创建和销毁带来的性能开销
 * - 支持节点（Node）和预制体（Prefab）的对象池管理
 * - 提供预加载、获取、归还、清空等功能
 * 
 * 使用场景：
 * - 子弹、敌人、特效等频繁创建销毁的对象
 * - UI 弹窗、列表项等需要复用的界面元素
 * 
 * 使用示例：
 * ```typescript
 * // 创建对象池（使用预制体）
 * PoolMgr.createPool('bullet', bulletPrefab, 10);
 * 
 * // 从池中获取对象
 * let bullet = PoolMgr.getNode('bullet');
 * 
 * // 归还对象到池中
 * PoolMgr.putNode('bullet', bullet);
 * 
 * // 清空对象池
 * PoolMgr.clearPool('bullet');
 * ```
 */
export class PoolMgr {
    // 对象池映射表，key为池名称，value为NodePool实例
    private static _pools: Map<string, NodePool> = new Map();
    // 预制体映射表，key为池名称，value为Prefab实例
    private static _prefabs: Map<string, Prefab> = new Map();

    /**
     * 创建对象池
     * @param poolName 对象池名称
     * @param prefab 预制体（可选，如果不提供则需要手动创建节点）
     * @param initCount 初始对象数量（可选，默认0）
     */
    public static createPool(poolName: string, prefab?: Prefab, initCount: number = 0) {
        if (!poolName) {
            Debug.warn("PoolMgr.createPool: invalid poolName", poolName);
            return;
        }

        // 如果对象池已存在，先清空
        if (this._pools.has(poolName)) {
            Debug.warn(`PoolMgr.createPool: pool "${poolName}" already exists, clearing it first`);
            this.clearPool(poolName);
        }

        // 创建新的对象池
        const pool = new NodePool();
        this._pools.set(poolName, pool);

        // 保存预制体引用
        if (prefab) {
            this._prefabs.set(poolName, prefab);
        }

        // 预加载指定数量的对象
        if (initCount > 0 && prefab) {
            this.preloadPool(poolName, initCount);
        }
    }

    /**
     * 预加载对象池
     * @param poolName 对象池名称
     * @param count 预加载数量
     */
    public static preloadPool(poolName: string, count: number) {
        const pool = this._pools.get(poolName);
        const prefab = this._prefabs.get(poolName);

        if (!pool) {
            Debug.warn(`PoolMgr.preloadPool: pool "${poolName}" does not exist`);
            return;
        }

        if (!prefab) {
            Debug.warn(`PoolMgr.preloadPool: prefab for pool "${poolName}" does not exist`);
            return;
        }

        for (let i = 0; i < count; i++) {
            const node = instantiate(prefab);
            pool.put(node);
        }
    }

    /**
     * 从对象池获取节点
     * @param poolName 对象池名称
     * @returns 节点对象，如果池为空且没有预制体则返回null
     */
    public static getNode(poolName: string): Node | null {
        const pool = this._pools.get(poolName);
        if (!pool) {
            Debug.warn(`PoolMgr.getNode: pool "${poolName}" does not exist`);
            return null;
        }

        let node: Node | null = null;

        // 尝试从池中获取
        if (pool.size() > 0) {
            node = pool.get();
        } else {
            // 池为空，尝试从预制体创建
            const prefab = this._prefabs.get(poolName);
            if (prefab) {
                node = instantiate(prefab);
            } else {
                Debug.warn(`PoolMgr.getNode: pool "${poolName}" is empty and no prefab available`);
            }
        }

        return node;
    }

    /**
     * 归还节点到对象池
     * @param poolName 对象池名称
     * @param node 要归还的节点
     */
    public static putNode(poolName: string, node: Node | null) {
        if (!node) {
            Debug.warn(`PoolMgr.putNode: node is null for pool "${poolName}"`);
            return;
        }

        const pool = this._pools.get(poolName);
        if (!pool) {
            Debug.warn(`PoolMgr.putNode: pool "${poolName}" does not exist, destroying node`);
            node.destroy();
            return;
        }

        // 重置节点状态
        node.removeFromParent();
        node.active = false;

        // 归还到池中
        pool.put(node);
    }

    /**
     * 清空指定对象池
     * @param poolName 对象池名称
     */
    public static clearPool(poolName: string) {
        const pool = this._pools.get(poolName);
        if (!pool) {
            Debug.warn(`PoolMgr.clearPool: pool "${poolName}" does not exist`);
            return;
        }

        // 销毁池中所有节点
        pool.clear();
        this._pools.delete(poolName);
        this._prefabs.delete(poolName);
    }

    /**
     * 清空所有对象池
     */
    public static clearAllPools() {
        const poolNames = Array.from(this._pools.keys());
        for (const poolName of poolNames) {
            this.clearPool(poolName);
        }
    }

    /**
     * 获取对象池中可用对象数量
     * @param poolName 对象池名称
     * @returns 可用对象数量
     */
    public static getPoolSize(poolName: string): number {
        const pool = this._pools.get(poolName);
        if (!pool) {
            Debug.warn(`PoolMgr.getPoolSize: pool "${poolName}" does not exist`);
            return 0;
        }
        return pool.size();
    }

    /**
     * 检查对象池是否存在
     * @param poolName 对象池名称
     * @returns 是否存在
     */
    public static hasPool(poolName: string): boolean {
        return this._pools.has(poolName);
    }

    /**
     * 获取所有对象池名称
     * @returns 对象池名称数组
     */
    public static getAllPoolNames(): string[] {
        return Array.from(this._pools.keys());
    }

    /**
     * 获取对象池统计信息
     * @param poolName 对象池名称（可选，不传则返回所有池的统计）
     * @returns 统计信息对象
     */
    public static getPoolInfo(poolName?: string): any {
        if (poolName) {
            const pool = this._pools.get(poolName);
            if (!pool) {
                return null;
            }
            return {
                name: poolName,
                size: pool.size(),
                hasPrefab: this._prefabs.has(poolName)
            };
        } else {
            const info: any = {};
            for (const name of this._pools.keys()) {
                info[name] = {
                    size: this.getPoolSize(name),
                    hasPrefab: this._prefabs.has(name)
                };
            }
            return info;
        }
    }
}

