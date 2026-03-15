import { _decorator, Component, director, Label, Node, ProgressBar, JsonAsset, Prefab } from 'cc';
import { GameComponent } from '../GameFrame/GameComponent';
import { AudioMgr } from '../Core/AudioMgr';
import { CfgMgr } from '../Core/CfgMgr';
import { Constants, EventConstants, GameConstants } from '../Core/Constants';
import { Debug } from '../Core/Debug';
import { g_data } from '../GameFrame/GameData';
import { ResourceMgr } from '../Core/ResourceMgr';
import { g_platform } from '../GameFrame/GamePlatform';
import { EventMgr } from '../Core/EventMgr';
import { PrefabConfig } from '../Core/PrefabConfig';
const { ccclass, property } = _decorator;

@ccclass('WLoad')
export class WLoad extends GameComponent {

    progressBar: ProgressBar = null;
    lblText: Label = null;
    lblProgress: Label = null;

    private _progress: number = 0;
    // 进度分配：登录20%，存档读取20%，预制体预加载40%，配置加载20%
    
    protected async init(...args: any[]): Promise<void> {
        await super.init(...args);
        this.progressBar = this.getProgressBar('content/ProgressBar');
        this.lblText = this.getLabel('content/ProgressBar/lblText');
        this.lblProgress = this.getLabel('content/ProgressBar/lblProgress');

        // 注册事件监听
        EventMgr.on(EventConstants.EVENT_LOGIN_END, this.loginEnd, this);
        EventMgr.on(EventConstants.EVENT_LOADDATA_END, this.loadDataEnd, this);

        // 开始登录流程
        g_platform.login();
    }

    loginEnd(res: boolean) {
        if (res) {
            this._progress = 20;
            this.setProgressBar();
            g_data.init();
        } else {
            Debug.error('LoadView: Login failed, stop loading process');
            EventMgr.emit(EventConstants.UI_OPEN_COMMON_WINDOW, {
                title: '提示',
                content: '网络状态不佳，请尝试重新连接',
                btn1: '重新连接',
                btn1Callback: () => {
                    g_platform.login();
                },
            });
        }
    }

    loadDataEnd(res: boolean) {
        if (res) {
            this._progress = 40;
            this.setProgressBar();
            this.loadResource();
            EventMgr.emit(EventConstants.UI_SHOW_TOAST, '存档加载成功');
        } else {
            Debug.error('LoadView: Load data failed, stop loading process');
            EventMgr.emit(EventConstants.UI_OPEN_COMMON_WINDOW, {
                title: '提示',
                content: '网络状态不佳，请尝试重新连接',
                btn1: '重新连接',
                btn1Callback: () => {
                    g_data.init();
                },
            });
        }
    }

    async loadResource() {
        // 初始化音频管理器（依赖 LocalStorageMgr 读取设置）
        AudioMgr.init();
        
        // 第三步：同步进行预制体预加载和配置加载
        // 预制体预加载：40% -> 80%（占40%）
        // 配置加载：80% -> 100%（占20%）
        await Promise.all([
            this.preloadPrefabs(),
            this.loadLocalGameConfg()
        ]);
        
        // 两个任务都完成后，更新进度条到100%
        this._progress = GameConstants.PROGRESS_COMPLETE;
        this.setProgressBar();
        
        EventMgr.emit(EventConstants.EVENT_LOAD_COMPLETE);
        this.close();
    }

    /* 从本地加载配置数据 */
    async loadLocalGameConfg() {
        try {
            const data = await ResourceMgr.loadDir<JsonAsset>(
                Constants.ConfigPath,
                JsonAsset,
                (finished: number, total: number, item: any) => {
                    // 配置加载进度：80% -> 100%（占20%）
                    // 使用 finished/total 计算当前进度
                    const configProgress = 80 + (20 * finished) / total;
                    // 使用 Math.max 确保进度不倒退（因为预制体预加载也在同时进行）
                    this._progress = Math.max(this._progress, configProgress);
                    this.setProgressBar();
                }
            );

            // 将配置数据设置到配置管理器
            for (let i = 0; i < data.length; i++) {
                const element = data[i];
                if (element && element.json) {
                    CfgMgr.setCfgData(element.name, element.json);
                }
            }
            
            // 配置加载完成，确保进度至少是100%
            this._progress = Math.max(this._progress, 100);
            this.setProgressBar();
        } catch (err) {
            Debug.error("LoadView.loadLocalGameConfg: failed to load config", err);
            // 即使加载失败也继续初始化，避免卡住
        }
    }

    setProgressBar() {
        if (this.lblText) {
            this.lblText.string = `${Math.floor(this._progress)}%`;
        }
        if (this.progressBar) {
            this.progressBar.progress = this._progress / GameConstants.PROGRESS_COMPLETE;
        }
    }

    /**
     * 预加载预制体
     * @returns Promise，预制体预加载完成后 resolve
     */
    private preloadPrefabs(): Promise<void> {
        const prefabs = [
            PrefabConfig.Game,
            PrefabConfig.TDebug,
        ];

        return ResourceMgr.preloadRes(prefabs, Prefab, (current: number, total: number) => {
            // 预制体预加载进度：40% -> 80%（占40%）
            const prefabProgress = 40 + (40 * current) / total;
            this._progress = Math.max(this._progress, prefabProgress);
            this.setProgressBar();
            Debug.log(`load prefab success: ${current}/${total}`);
        }).then(() => {
            // 预加载完成，确保进度至少是80%
            this._progress = Math.max(this._progress, 80);
            this.setProgressBar();
        });
    }

    protected async close(): Promise<void> {
        // 清理事件监听
        EventMgr.off(EventConstants.EVENT_LOGIN_END, this.loginEnd, this);
        EventMgr.off(EventConstants.EVENT_LOADDATA_END, this.loadDataEnd, this);
        
        super.close(); // 必须调用，会自动处理缓存清理和销毁
    }
}

