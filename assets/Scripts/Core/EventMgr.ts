import { Debug } from "./Debug";

/**
 * 事件数据接口
 */
interface IEventData {
    /** 回调函数 */
    func: Function;
    /** 绑定的目标对象 */
    target: any;
    /** 是否只触发一次 */
    once?: boolean;
}

/**
 * 事件映射接口
 */
interface IEventMap {
    [eventName: string]: IEventData[];
}

/**
 * 事件管理器
 * 负责游戏内事件的注册、分发和清理
 * 支持事件绑定、解绑、触发等功能
 */
export class EventMgr {
    // 事件处理器映射表
    private static _handlers: IEventMap = {};

    /**
     * 注册事件监听器
     * @param eventName 事件名称
     * @param callback 回调函数
     * @param target 绑定的目标对象（可选）
     * @param once 是否只触发一次（可选，默认false）
     */
    public static on(eventName: string, callback: Function, target?: any, once: boolean = false) {
        if (!eventName || typeof callback !== 'function') {
            return;
        }

        if (!this._handlers[eventName]) {
            this._handlers[eventName] = [];
        }

        const eventData: IEventData = {
            func: callback,
            target: target,
            once: once
        };

        this._handlers[eventName].push(eventData);
    }

    /**
     * 注册只触发一次的事件监听器
     * @param eventName 事件名称
     * @param callback 回调函数
     * @param target 绑定的目标对象（可选）
     */
    public static once(eventName: string, callback: Function, target?: any) {
        this.on(eventName, callback, target, true);
    }

    /**
     * 移除事件监听器
     * @param eventName 事件名称
     * @param callback 回调函数（可选，不传则移除该事件的所有监听器）
     * @param target 绑定的目标对象（可选）
     */
    public static off(eventName: string, callback?: Function, target?: any) {
        if (!eventName) {
            return;
        }

        const list = this._handlers[eventName];
        if (!list || list.length <= 0) {
            return;
        }

        // 如果没有指定回调函数，移除该事件的所有监听器
        if (!callback) {
            delete this._handlers[eventName];
            return;
        }

        // 移除指定的监听器
        for (let i = list.length - 1; i >= 0; i--) {
            const event = list[i];
            if (event && event.func === callback && (!target || target === event.target)) {
                list.splice(i, 1);
            }
        }

        // 如果列表为空，删除该事件
        if (list.length === 0) {
            delete this._handlers[eventName];
        }
    }

    /**
     * 触发事件
     * @param eventName 事件名称
     * @param args 传递给回调函数的参数
     */
    public static emit(eventName: string, ...args: any[]) {
        if (!eventName) {
            return;
        }

        const list = this._handlers[eventName];
        if (!list || list.length <= 0) {
            return;
        }

        // 创建副本，避免在触发过程中修改原数组导致的问题
        const listCopy = [...list];
        const toRemove: IEventData[] = [];

        for (let i = 0; i < listCopy.length; i++) {
            const event = listCopy[i];
            if (event && event.func) {
                try {
                    // 调用回调函数
                    event.func.apply(event.target, args);
                    
                    // 如果是只触发一次的事件，标记为待移除
                    if (event.once) {
                        toRemove.push(event);
                    }
                } catch (error) {
                    Debug.error(`EventMgr.emit error in event "${eventName}":`, error);
                }
            }
        }

        // 移除只触发一次的事件监听器
        if (toRemove.length > 0) {
            for (let i = 0; i < toRemove.length; i++) {
                const event = toRemove[i];
                this.off(eventName, event.func, event.target);
            }
        }
    }

    /**
     * 移除指定目标的所有事件监听器
     * @param target 目标对象
     */
    public static offTarget(target: any) {
        if (!target) {
            return;
        }

        for (const eventName in this._handlers) {
            const list = this._handlers[eventName];
            if (list && list.length > 0) {
                for (let i = list.length - 1; i >= 0; i--) {
                    const event = list[i];
                    if (event && event.target === target) {
                        list.splice(i, 1);
                    }
                }

                // 如果列表为空，删除该事件
                if (list.length === 0) {
                    delete this._handlers[eventName];
                }
            }
        }
    }

    /**
     * 获取指定事件的监听器数量
     * @param eventName 事件名称
     * @returns 监听器数量
     */
    public static getListenerCount(eventName: string): number {
        const list = this._handlers[eventName];
        return list ? list.length : 0;
    }

    /**
     * 检查是否有指定事件的监听器
     * @param eventName 事件名称
     * @returns 是否存在监听器
     */
    public static hasListener(eventName: string): boolean {
        return this.getListenerCount(eventName) > 0;
    }

    /**
     * 清除所有事件监听器
     */
    public static clear() {
        this._handlers = {};
    }

    /**
     * 获取所有已注册的事件名称
     * @returns 事件名称数组
     */
    public static getAllEventNames(): string[] {
        return Object.keys(this._handlers);
    }
}

