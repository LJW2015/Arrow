import { Asset, JsonAsset, resources, SpriteFrame, Texture2D, AudioClip, Prefab, error } from "cc";
import { Debug } from "./Debug";

/**
 * 资源类型枚举
 */
export enum ResourceType {
    PREFAB = "prefab",
    TEXTURE = "texture",
    SPRITE_FRAME = "sprite-frame",
    AUDIO = "audio",
    JSON = "json",
    UNKNOWN = "unknown"
}

/**
 * 资源缓存项接口
 */
interface IResourceCache {
    /** 资源对象 */
    asset: Asset;
    /** 资源类型 */
    type: ResourceType;
    /** 引用计数 */
    refCount: number;
    /** 最后使用时间 */
    lastUsedTime: number;
}

/**
 * 资源管理器 (Resource Manager)
 * 
 * 功能说明：
 * - 统一管理游戏资源的加载、缓存和释放
 * - 支持资源预加载、异步加载、批量加载
 * - 提供资源引用计数，自动管理资源生命周期
 * - 支持资源释放和缓存清理
 * 
 * 使用场景：
 * - 预制体、贴图、音频等资源的统一加载
 * - 资源预加载和缓存管理
 * - 资源释放和内存优化
 * 
 * 使用示例：
 * ```typescript
 * // 加载单个资源
 * ResourceMgr.loadRes<Prefab>('prefabs/Bullet', Prefab, (err, prefab) => {
 *     if (!err) {
 *         // 使用资源
 *     }
 * });
 * 
 * // 批量加载资源
 * ResourceMgr.loadDir('textures', Texture2D, (progress) => {
 *     console.log('加载进度:', progress);
 * });
 * 
 * // 释放资源
 * ResourceMgr.releaseRes('prefabs/Bullet');
 * ```
 */
export class ResourceMgr {
    // 资源缓存映射表
    private static _cache: Map<string, IResourceCache> = new Map();
    // 加载中的资源映射表（用于防止重复加载）
    private static _loading: Map<string, Promise<Asset>> = new Map();

    /**
     * 获取资源类型
     * @param asset 资源对象
     * @returns 资源类型
     */
    private static _getResourceType(asset: Asset): ResourceType {
        if (asset instanceof Prefab) {
            return ResourceType.PREFAB;
        } else if (asset instanceof Texture2D) {
            return ResourceType.TEXTURE;
        } else if (asset instanceof SpriteFrame) {
            return ResourceType.SPRITE_FRAME;
        } else if (asset instanceof AudioClip) {
            return ResourceType.AUDIO;
        } else if (asset instanceof JsonAsset) {
            return ResourceType.JSON;
        }
        return ResourceType.UNKNOWN;
    }

    /**
     * 加载单个资源（Promise 方式）
     * @param path 资源路径
     * @param type 资源类型
     * @param useCache 是否使用缓存（默认true）
     * @returns Promise<资源对象>
     * 
     * 使用示例：
     * ```typescript
     * // async/await 方式
     * try {
     *     const prefab = await ResourceMgr.loadRes<Prefab>('prefabs/Bullet', Prefab);
     *     // 使用资源
     * } catch (err) {
     *     console.error('加载失败', err);
     * }
     * 
     * // Promise 方式
     * ResourceMgr.loadRes<Prefab>('prefabs/Bullet', Prefab)
     *     .then(prefab => {
     *         // 使用资源
     *     })
     *     .catch(err => {
     *         console.error('加载失败', err);
     *     });
     * ```
     */
    public static loadRes<T extends Asset>(
        path: string,
        type: typeof Asset,
        useCache: boolean = true
    ): Promise<T> {
        if (!path) {
            const err = new Error("ResourceMgr.loadRes: invalid path");
            Debug.error(err.message);
            return Promise.reject(err);
        }

        // 检查缓存
        if (useCache) {
            const cached = this._cache.get(path);
            if (cached) {
                cached.refCount++;
                cached.lastUsedTime = Date.now();
                return Promise.resolve(cached.asset as T);
            }
        }

        // 检查是否正在加载
        const loadingPromise = this._loading.get(path);
        if (loadingPromise) {
            return loadingPromise.then((asset) => {
                const cached = this._cache.get(path);
                if (cached) {
                    cached.refCount++;
                    cached.lastUsedTime = Date.now();
                }
                return asset as T;
            });
        }

        // 开始加载
        const loadPromise = new Promise<T>((resolve, reject) => {
            resources.load(path, type, (err: Error | null, asset: T) => {
                this._loading.delete(path);

                if (err) {
                    Debug.error(`ResourceMgr.loadRes: failed to load "${path}"`, err);
                    reject(err);
                    return;
                }

                // 添加到缓存
                if (useCache && asset) {
                    this._cache.set(path, {
                        asset: asset,
                        type: this._getResourceType(asset),
                        refCount: 1,
                        lastUsedTime: Date.now()
                    });
                }

                resolve(asset);
            });
        });

        this._loading.set(path, loadPromise);
        return loadPromise;
    }

    /**
     * 批量加载资源目录（Promise 方式）
     * @param path 资源目录路径
     * @param type 资源类型
     * @param onProgress 加载进度回调（可选）
     * @param useCache 是否使用缓存（默认true）
     * @returns Promise<资源数组>
     * 
     * 使用示例：
     * ```typescript
     * // async/await 方式
     * try {
     *     const assets = await ResourceMgr.loadDir<Texture2D>('textures', Texture2D, 
     *         (finished, total) => {
     *             console.log(`加载进度: ${finished}/${total}`);
     *         }
     *     );
     *     // 使用资源
     * } catch (err) {
     *     console.error('加载失败', err);
     * }
     * ```
     */
    public static loadDir<T extends Asset>(
        path: string,
        type: typeof Asset,
        onProgress?: (finished: number, total: number, item: any) => void,
        useCache: boolean = true
    ): Promise<T[]> {
        if (!path) {
            const err = new Error("ResourceMgr.loadDir: invalid path");
            Debug.error(err.message);
            return Promise.reject(err);
        }

        return new Promise<T[]>((resolve, reject) => {
            resources.loadDir(path, type, (finished: number, total: number, item: any) => {
                onProgress && onProgress(finished, total, item);
            }, (err: Error | null, assets: T[]) => {
                if (err) {
                    Debug.error(`ResourceMgr.loadDir: failed to load "${path}"`, err);
                    reject(err);
                    return;
                }

                // 添加到缓存
                if (useCache && assets) {
                    assets.forEach((asset) => {
                        // 使用资源的 uuid 或 name 作为缓存 key
                        // 注意：loadDir 返回的资源可能没有完整路径信息，这里使用 name 作为 key
                        // 如果需要通过路径获取，建议使用 loadRes 方法
                        const cacheKey = asset.uuid || asset.name;
                        if (cacheKey && !this._cache.has(cacheKey)) {
                            this._cache.set(cacheKey, {
                                asset: asset,
                                type: this._getResourceType(asset),
                                refCount: 1,
                                lastUsedTime: Date.now()
                            });
                        } else if (cacheKey) {
                            const cached = this._cache.get(cacheKey);
                            if (cached) {
                                cached.refCount++;
                                cached.lastUsedTime = Date.now();
                            }
                        }
                    });
                }

                resolve(assets);
            });
        });
    }

    /**
     * 预加载资源（Promise 方式）
     * @param paths 资源路径数组
     * @param type 资源类型
     * @param onProgress 加载进度回调（可选）
     * @returns Promise<void>
     * 
     * 使用示例：
     * ```typescript
     * // async/await 方式
     * try {
     *     await ResourceMgr.preloadRes<Prefab>(
     *         ['prefabs/Bullet', 'prefabs/Enemy'],
     *         Prefab,
     *         (current, total) => {
     *             console.log(`预加载进度: ${current}/${total}`);
     *         }
     *     );
     *     console.log('预加载完成');
     * } catch (err) {
     *     console.error('预加载失败', err);
     * }
     * ```
     */
    public static preloadRes<T extends Asset>(
        paths: string[],
        type: typeof Asset,
        onProgress?: (current: number, total: number) => void
    ): Promise<void> {
        if (!paths || paths.length === 0) {
            Debug.warn("ResourceMgr.preloadRes: empty paths array");
            return Promise.resolve();
        }

        const totalCount = paths.length;
        let loadedCount = 0;
        const errors: Error[] = [];

        return new Promise<void>((resolve, reject) => {
            const checkComplete = () => {
                if (loadedCount >= totalCount) {
                    if (errors.length > 0) {
                        reject(new Error(`Some resources failed to load: ${errors.length} errors`));
                    } else {
                        resolve();
                    }
                }
            };

            paths.forEach((path) => {
                this.loadRes<T>(path, type)
                    .then(() => {
                        loadedCount++;
                        onProgress && onProgress(loadedCount, totalCount);
                        checkComplete();
                    })
                    .catch((err) => {
                        errors.push(err);
                        loadedCount++;
                        onProgress && onProgress(loadedCount, totalCount);
                        checkComplete();
                    });
            });
        });
    }

    /**
     * 释放资源（减少引用计数）
     * @param path 资源路径
     * @param force 是否强制释放（忽略引用计数）
     */
    public static releaseRes(path: string, force: boolean = false) {
        const cached = this._cache.get(path);
        if (!cached) {
            Debug.warn(`ResourceMgr.releaseRes: resource "${path}" not found in cache`);
            return;
        }

        if (force) {
            // 强制释放
            resources.release(path);
            this._cache.delete(path);
        } else {
            // 减少引用计数
            cached.refCount--;
            cached.lastUsedTime = Date.now();

            if (cached.refCount <= 0) {
                resources.release(path);
                this._cache.delete(path);
            }
        }
    }

    /**
     * 释放资源目录
     * @param path 资源目录路径
     * @param force 是否强制释放
     */
    public static releaseDir(path: string, force: boolean = false) {
        if (!path) {
            Debug.warn("ResourceMgr.releaseDir: invalid path");
            return;
        }

        resources.releaseAll();
    }

    /**
     * 释放所有资源
     * @param force 是否强制释放
     */
    public static releaseAll(force: boolean = false) {
        if (force) {
            resources.releaseAll();
            this._cache.clear();
        } else {
            // 只释放引用计数为0的资源
            const toRelease: string[] = [];
            this._cache.forEach((cached, path) => {
                if (cached.refCount <= 0) {
                    toRelease.push(path);
                }
            });

            toRelease.forEach((path) => {
                this.releaseRes(path, true);
            });
        }
    }

    /**
     * 获取资源（从缓存）
     * @param path 资源路径
     * @returns 资源对象，不存在返回null
     */
    public static getRes<T extends Asset>(path: string): T | null {
        const cached = this._cache.get(path);
        if (cached) {
            cached.refCount++;
            cached.lastUsedTime = Date.now();
            return cached.asset as T;
        }
        return null;
    }

    /**
     * 检查资源是否已加载
     * @param path 资源路径
     * @returns 是否已加载
     */
    public static hasRes(path: string): boolean {
        return this._cache.has(path);
    }

    /**
     * 获取资源引用计数
     * @param path 资源路径
     * @returns 引用计数
     */
    public static getRefCount(path: string): number {
        const cached = this._cache.get(path);
        return cached ? cached.refCount : 0;
    }

    /**
     * 获取所有缓存的资源路径
     * @returns 资源路径数组
     */
    public static getAllCachedPaths(): string[] {
        return Array.from(this._cache.keys());
    }

    /**
     * 获取资源缓存信息
     * @param path 资源路径（可选，不传则返回所有资源信息）
     * @returns 缓存信息
     */
    public static getCacheInfo(path?: string): any {
        if (path) {
            const cached = this._cache.get(path);
            if (!cached) {
                return null;
            }
            return {
                path: path,
                type: cached.type,
                refCount: cached.refCount,
                lastUsedTime: cached.lastUsedTime
            };
        } else {
            const info: any = {};
            this._cache.forEach((cached, path) => {
                info[path] = {
                    type: cached.type,
                    refCount: cached.refCount,
                    lastUsedTime: cached.lastUsedTime
                };
            });
            return info;
        }
    }

    /**
     * 清理未使用的资源（引用计数为0且超过指定时间未使用）
     * @param maxUnusedTime 最大未使用时间（毫秒），默认5分钟
     */
    public static cleanupUnused(maxUnusedTime: number = 5 * 60 * 1000) {
        const now = Date.now();
        const toRelease: string[] = [];

        this._cache.forEach((cached, path) => {
            if (cached.refCount <= 0 && (now - cached.lastUsedTime) > maxUnusedTime) {
                toRelease.push(path);
            }
        });

        toRelease.forEach((path) => {
            this.releaseRes(path, true);
        });
    }

    /**
     * 清空所有缓存
     */
    public static clearCache() {
        this._cache.clear();
    }
}

