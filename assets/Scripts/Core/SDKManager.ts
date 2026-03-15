import { Debug } from './Debug';

/**
 * SDK 相关类型定义（原 tysdk 类型，移除 tysdk 后本地保留以兼容现有调用）
 */
export interface initParam {
    env?: 'test' | 'prod' | 'dev';
    gameId?: string;
    gameVersion?: string;
}

export interface LoginResp {
    userId: string;
    openId: string;
    unionId?: string;
    nickName?: string;
    avatarUrl?: string;
    [key: string]: any;
}

export interface GetUserInfoResp {
    nickName: string;
    avatarUrl: string;
}

export interface GetUserArchiveResp {
    name: string;
    serverId: string;
    roleId: string;
    data: { [key: string]: any };
    updatedAt?: number;
}

export interface SetUserArchiveParam {
    name?: string;
    serverId?: string;
    roleId?: string;
    data: { [key: string]: any };
}

export interface UserRoleInfo {
    serverId?: string;
    roleId?: string;
    userId?: string;
    name?: string;
    [key: string]: any;
}

export interface ShowVideoAdResp {
    isEnded: boolean;
    count?: number;
}

/**
 * SDK 管理器 (SDK Manager)
 *
 * 功能说明：
 * - 统一的 SDK 驱动层接口，当前为占位实现（已移除 tysdk）
 * - 不包含业务逻辑和平台判断
 * - 后续可接入其他 SDK 时在此替换实现
 */
export class SDKManager {
    public static init(_config: initParam): void {
        Debug.info('SDKManager: init (no SDK connected)');
    }

    public static login(callback: (res: LoginResp | null) => void): void {
        Debug.info('SDKManager: login (no SDK connected)');
        callback(null);
    }

    public static getUserInfo(): Promise<GetUserInfoResp | null> {
        Debug.info('SDKManager: getUserInfo (no SDK connected)');
        return Promise.resolve(null);
    }

    public static setUserRole(role: UserRoleInfo): void {
        Debug.info('SDKManager: setUserRole (no SDK connected)', role);
    }

    public static showVideoAd(name: string, callback: (res: boolean) => void): void {
        Debug.info('SDKManager: showVideoAd (no SDK connected)', name);
        callback(true);
    }

    public static shareAppMessage(callback: (res: boolean) => void): void {
        Debug.info('SDKManager: shareAppMessage (no SDK connected)');
        callback(true);
    }

    public static onShareAppMessage(_callback: () => any): void {
        // no-op
    }

    public static offShareAppMessage(): void {
        // no-op
    }

    public static onShareTimeline(_callback: () => any): void {
        // no-op
    }

    public static offShareTimeline(): void {
        // no-op
    }

    public static customTrack(event: string, data: any): void {
        Debug.info('SDKManager: customTrack (no SDK connected)', event, data);
    }

    public static async checkSideBarState(): Promise<any> {
        Debug.info('SDKManager: checkSideBarState (no SDK connected)');
        return null;
    }

    public static onSideBarStateChange(_callback: (sideBarStates: any) => void): void {
        // no-op
    }

    public static receiveSideBarReward(callback: (res: any) => void): void {
        Debug.info('SDKManager: receiveSideBarReward (no SDK connected)');
        callback(null);
    }

    public static navigateToSideBar(callback: (res: any) => void): void {
        Debug.info('SDKManager: navigateToSideBar (no SDK connected)');
        callback(null);
    }

    public static async getUserArchive(): Promise<GetUserArchiveResp | null> {
        Debug.info('SDKManager: getUserArchive (no SDK connected)');
        return null;
    }

    public static async setUserArchive(data: SetUserArchiveParam): Promise<any> {
        Debug.info('SDKManager: setUserArchive (no SDK connected)', data);
        return null;
    }
}
