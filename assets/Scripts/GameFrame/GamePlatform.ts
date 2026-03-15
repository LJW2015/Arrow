import { sys } from "cc";
import { GameDefine } from "../Core/GameDefine";
import { SDKManager, initParam, LoginResp } from "../Core/SDKManager";
import { Debug } from "../Core/Debug";
import { EventMgr } from "../Core/EventMgr";
import { EventConstants } from "../Core/Constants";

/**
 * 游戏平台管理器 (Game Platform Manager)
 * 
 * 功能说明：
 * - 管理平台相关的信息和功能
 * - 根据平台调用 SDKManager 驱动 SDK
 * - 提供平台判断、平台特性检测等工具方法
 * - 统一对外接口，外部通过 g_platform 访问
 * 
 * 使用场景：
 * - 平台判断（Web、微信、iOS、Android等）
 * - 平台特性检测（是否支持某些功能）
 * - 平台相关的配置和适配
 * - SDK 初始化和调用
 * 
 * 使用示例：
 * ```typescript
 * // 获取当前平台
 * const platform = g_platform.getPlatform();
 * 
 * // 判断是否为微信平台
 * if (g_platform.isWeChat()) {
 *     // 微信平台特殊处理
 * }
 * 
 * // 初始化平台（内部会根据平台初始化 SDK）
 * g_platform.init({
 *     env: 'test',
 *     gameId: '1234567890',
 *     // ... 其他配置
 * });
 * 
 * // 登录
 * await g_platform.login();
 */
export interface SideBarState {
    isFromSideBar: boolean;
    isReceived: boolean;
    isShowGiftBagBtn: boolean;
    isShowNavigateBtn: boolean;
    isShowEntry: boolean;
}

export class GamePlatform {
    /** 登录重连次数（可配置，默认3次） */
    private static _loginRetryCount: number = 3;
    /** 登录重连初始延迟时间（秒，默认1秒） */
    private static _loginRetryDelay: number = 1;
    /** 登录重试定时器句柄（用于清理） */
    private static _loginRetryTimer: any = null;

    private static _userInfo: LoginResp = null;
    private static _serverId: string = '1';

    public static set userInfo(res: LoginResp) {
        this._userInfo = res;
    }

    public static get serverId(): string {
        return this._serverId;
    }
    public static set serverId(serverId: string) {
        this._serverId = serverId;
    }

    /**
     * 设置登录重连配置
     * @param retryCount 重连次数（默认3次）
     * @param initialDelay 初始延迟时间（秒，默认1秒）
     */
    public static setLoginRetryConfig(retryCount: number = 3, initialDelay: number = 1): void {
        this._loginRetryCount = retryCount;
        this._loginRetryDelay = initialDelay;
    }

    /**
     * 获取当前平台标识
     * @returns 平台字符串，如 "WECHAT_GAME", "IOS", "ANDROID", "WEB_MOBILE", "WEB_DESKTOP" 等
     */
    public static getPlatform(): string {
        return sys.platform;
    }

    /**
     * 判断是否为微信小游戏平台
     * @returns true 表示是微信小游戏平台
     */
    public static isWeChat(): boolean {
        return sys.platform === sys.Platform.WECHAT_GAME;
    }

    public static isByteDance(): boolean {
        return sys.platform === sys.Platform.BYTEDANCE_MINI_GAME;
    }

    public static isMiniGame(): boolean {
        return sys.platform === sys.Platform.WECHAT_GAME || sys.platform === sys.Platform.BYTEDANCE_MINI_GAME;
    }

    /**
     * 判断是否为 iOS 平台
     * @returns true 表示是 iOS 平台
     */
    public static isIOS(): boolean {
        return sys.platform === sys.Platform.IOS;
    }

    /**
     * 判断是否为 Android 平台
     * @returns true 表示是 Android 平台
     */
    public static isAndroid(): boolean {
        return sys.platform === sys.Platform.ANDROID;
    }

    /**
     * 判断是否为原生平台（iOS 或 Android）
     * @returns true 表示是原生平台
     */
    public static isNative(): boolean {
        return this.isIOS() || this.isAndroid();
    }
    /**
     * 初始化平台管理器
     * 根据平台判断是否需要初始化 SDK
     * @param config SDK 配置参数（可选，如果不提供则使用默认配置）
     */
    public static init(config?: initParam): void {
        if (!GameDefine.useSDK) {
            return;
        }

        // 微信小游戏和原生平台需要初始化 SDK
        const sdkConfig: initParam = config || {
            gameId: GameDefine.gameName,
            gameVersion: GameDefine.gameVersion,
        };
        SDKManager.init(sdkConfig);
    }

    /**
     * SDK 登录（带失败重连功能）
     * 根据平台判断是否需要登录
     * 登录失败会自动重连，重连次数可配置（默认3次）
     * 重连延迟采用指数型增长：1s, 2s, 4s...
     * 重连失败后会派发登录失败事件
     * @returns Promise<boolean>，true 表示登录成功，false 表示登录失败
     */
    public static login(): Promise<boolean> {
        return new Promise((resolve) => {
            // 调试模式下直接返回成功，并派发事件
            if (!GameDefine.useSDK) {
                EventMgr.emit(EventConstants.EVENT_LOGIN_END, true);
                resolve(true);
                return;
            }

            // 执行登录（带重连逻辑）
            this._doLoginWithRetry(0, resolve);
        });
    }

    /**
     * 执行登录（带重连逻辑）
     * @param retryIndex 当前重连次数（从0开始）
     * @param resolve Promise 的 resolve 回调，参数为登录结果（true 成功，false 失败）
     */
    private static _doLoginWithRetry(retryIndex: number, resolve: (success: boolean) => void): void {
        SDKManager.login((res: LoginResp) => {
            if (res) {
                // 登录成功
                EventMgr.emit(EventConstants.EVENT_LOGIN_END, true);
                this.userInfo = res;
                this.setUserRole({
                    serverId: this.serverId,
                    userId: res.userId,
                });
                resolve(true);
            } else {
                // 登录失败，判断是否需要重连
                if (retryIndex < this._loginRetryCount) {
                    // 计算延迟时间：指数型增长（1s, 2s, 4s...）
                    const delay = this._loginRetryDelay * Math.pow(2, retryIndex);
                    Debug.warn(`GamePlatform: Login failed, retrying in ${delay}s (attempt ${retryIndex + 1}/${this._loginRetryCount})`);
                    
                    // 延迟后重连
                    if (this._loginRetryTimer) {
                        clearTimeout(this._loginRetryTimer);
                        this._loginRetryTimer = null;
                    }
                    this._loginRetryTimer = setTimeout(() => {
                        this._loginRetryTimer = null;
                        this._doLoginWithRetry(retryIndex + 1, resolve);
                    }, delay * 1000);
                } else {
                    // 重连次数用完，派发登录失败事件
                    Debug.error(`GamePlatform: Login failed after ${this._loginRetryCount} retries`);
                    EventMgr.emit(EventConstants.EVENT_LOGIN_END, false);
                    resolve(false);
                }
            }
        });
    }

    /**
     * 获取用户信息
     * @returns Promise，返回用户信息
     */
    public static getUserInfo(): Promise<any> {
        if (!GameDefine.useSDK) {
            return Promise.resolve(null);
        }
        return SDKManager.getUserInfo(); 
    }

    /**
     * 设置用户角色
     * @param role 用户角色信息
     */
    public static setUserRole(role: any): void {
        if (!GameDefine.useSDK) {
            return;
        }
        SDKManager.setUserRole(role);
    }

    /**
     * 显示视频广告
     * @param name 广告名称
     * @param callback 回调函数，参数为是否播放完成
     */
    public static showVideoAd(name: string, callback: (res: boolean) => void): void {
        if (!GameDefine.useSDK) {
            callback(true);
            return;
        }
        SDKManager.showVideoAd(name, callback);
    }

    /**
     * 分享应用消息
     * @param callback 回调函数，参数为分享结果
     */
    public static shareAppMessage(callback: (res: boolean) => void): void {
        if (!GameDefine.useSDK) {
            callback(true);
            return;
        }
        SDKManager.shareAppMessage(callback);
    }

    /**
     * 监听分享应用消息
     * @param callback 回调函数
     */
    public static onShareAppMessage(callback: () => any): void {
        if (!GameDefine.useSDK) {
            callback();
            return;
        }   
        SDKManager.onShareAppMessage(callback);
    }

    /**
     * 取消监听分享应用消息
     */
    public static offShareAppMessage(): void {
        if (!GameDefine.useSDK) {
            return;
        }
        SDKManager.offShareAppMessage();
    }

    /**
     * 监听分享朋友圈消息
     * @param callback 回调函数
     */
    public static onShareTimeline(callback: () => any): void {
        if (!GameDefine.useSDK) {
            return;
        }
        SDKManager.onShareTimeline(callback);
    }

    /**
     * 取消监听分享朋友圈消息
     */
    public static offShareTimeline(): void {
        if (!GameDefine.useSDK) {
            return;
        }   
        SDKManager.offShareTimeline();
    }

    /**
     * 事件上报
     * @param event 事件名称
     * @param data 自定义数据
     */
    public static customTrack(event: string, data: any): void {
        if (!GameDefine.useSDK) {
            Debug.info('GamePlatform: Custom track', event, data);
            return;
        }
        SDKManager.customTrack(event, data);
    }

    /**
     * 检查侧边栏状态
     * @param callback 回调函数，参数为侧边栏状态信息
     */
    public static async checkSideBarState(): Promise<SideBarState> {
        if (!GameDefine.useSDK) {
            return null;
        }
        if (this.isByteDance()) {
            return await SDKManager.checkSideBarState();
        } else {
            return null;
        }
    }

    /**
     * 监听侧边栏事件
     * @param callback 回调函数，参数为侧边栏状态信息
     */
    public static onSideBarStateChange(callback: (sideBarStates: SideBarState) => void): void {
        if (!GameDefine.useSDK) {
            return;
        }
        if (this.isByteDance()) {
            SDKManager.onSideBarStateChange((states: SideBarState) => {
                callback(states);
            });
        } else {
            return;
        }
    }

    /**
     * 领取侧边栏奖励
     * @param callback 回调函数，参数为领取结果
     */
    public static receiveSideBarReward(callback: (res: any) => void): void {
        if (!GameDefine.useSDK) {
            return;
        }
        if (this.isByteDance()) {
            SDKManager.receiveSideBarReward(callback);
        } else {
            return;
        }
    }

    /**
     * 跳转侧边栏
     * @param callback 回调函数，参数为跳转结果
     */
    public static navigateToSideBar(callback: (res: any) => void): void {
        if (!GameDefine.useSDK) {
            return;
        }
        if (this.isByteDance()) {
            SDKManager.navigateToSideBar(callback);
        } else {
            return;
        }
    }

    /**
     * 读档
     * 直接调用 SDKManager 获取用户存档
     * @returns Promise，返回用户存档响应，失败返回 null
     */
    public static async load(): Promise<any> {
        return await SDKManager.getUserArchive();
    }

    /**
     * 存档
     * 直接调用 SDKManager 设置用户存档
     * @param data 要保存的用户存档数据（序列化字符串）
     * @returns Promise，返回保存结果，失败返回 null
     */
    public static async save(data: string): Promise<any> {
        try {
            const archiveData ={
                name: 'default',
                data: {
                    data: data,
                },
            };
            return await SDKManager.setUserArchive(archiveData);
        } catch (error) {
            Debug.error('GamePlatform: Failed to save archive', error);
            return null;
        }
    }
}

// 导出别名
export { GamePlatform as g_platform };

