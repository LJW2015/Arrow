import { _decorator, Component, EditBox, Node } from 'cc';
import { GameComponent } from '../GameFrame/GameComponent';
import { g_data } from '../GameFrame/GameData';
import { g_platform, SideBarState } from '../GameFrame/GamePlatform';
import { Debug } from '../Core/Debug';
import { EventConstants } from '../Core/Constants';
import { EventMgr } from '../Core/EventMgr';
const { ccclass, property } = _decorator;

@ccclass('TDebug')
export class TDebug extends GameComponent {

    nodeView: Node = null;
    laySideBar: Node = null;

    /**
     * 初始化方法（异步，可传递不定长参数）
     * 在预制体打开时调用，用于加载资源、请求数据等
     * @param ...args 初始化参数（不定长参数）
     */
    protected async init(...args: any[]): Promise<void> {
        await super.init(...args);

        this.nodeView = this.getNode('nodeView');
        this.setBtnEven('btnShowView', this.onBtnShowViewClick);
        this.setBtnEven('lay/btnExport', this.onBtnExportSaveClick, this.nodeView);
        this.setBtnEven('lay/btnImport', this.onBtnImportSaveClick, this.nodeView);
        this.setBtnEven('lay/btnSaveImmediately', this.onBtnSaveImmediatelyClick, this.nodeView);
        this.setBtnEven('lay/btnVideo', this.onBtnVideoClick, this.nodeView);
        this.setBtnEven('lay/btnShare', this.onBtnShare, this.nodeView);
        this.setBtnEven('btnClose', this.onBtnCloseClick);

        this.laySideBar = this.getNode('laySideBar',this.nodeView);
        this.setBtnEven('btnSideBarReward', this.onBtnSideBarReceiveRewardClick, this.laySideBar);
        this.setBtnEven('btnSideBarNavigateTo', this.onBtnSideBarNavigateToClick, this.laySideBar);

        g_platform.checkSideBarState().then((states) => {
            if (states) {
                this.updateSideBarState(states);
            }
        });

        g_platform.onSideBarStateChange((states) => {
            if (states) {
                this.updateSideBarState(states);
            }
        });

        // 你的初始化逻辑
    }

    /**
     * 关闭方法（同步）
     * 在预制体关闭时调用，用于清理资源、保存数据等
     * 必须调用 super.close()，会自动处理缓存清理和销毁
     */
    protected async close(): Promise<void> {
        // 你的关闭逻辑
        super.close(); // 必须调用，会自动处理缓存清理和销毁
    }

    updateSideBarState(states: SideBarState): void {
        if (states.isShowEntry) {
            this.laySideBar.active = true;
            this.getNode('btnSideBarReward', this.laySideBar).active = states.isShowGiftBagBtn;
            this.getButton('btnSideBarReward', this.laySideBar).interactable = !states.isReceived;
            this.getNode('btnSideBarNavigateTo', this.laySideBar).active = states.isShowNavigateBtn;
        }else{
            this.laySideBar.active = false;
        }
    }

    onBtnShowViewClick(): void {
        this.nodeView.active = !this.nodeView.active;
    }

    onBtnExportSaveClick(): void {
        g_data.downloadSaveFile('my_save.json');
    }

    onBtnImportSaveClick(): void {
        g_data.importSave();
    }

    onBtnSaveImmediatelyClick(): void {
        g_data.saveImmediatelyNoSchedule().then((res) => {
            EventMgr.emit(EventConstants.UI_SHOW_TOAST, res ? '存档保存成功' : '存档保存失败');
        });
    }

    onBtnVideoClick(): void {
        g_platform.showVideoAd('test', (res) => {
            EventMgr.emit(EventConstants.UI_SHOW_TOAST, res ? '视频广告播放成功' : '视频广告播放失败');
        });
    }

    onBtnSideBarReceiveRewardClick(): void {
        g_platform.receiveSideBarReward((res) => {
            EventMgr.emit(EventConstants.UI_SHOW_TOAST, res ? '侧边栏奖励领取成功' : '侧边栏奖励领取失败');
        });
    }

    onBtnSideBarNavigateToClick(): void {
        g_platform.navigateToSideBar((res) => {
           
        });
    }

    onBtnShare(): void {
        g_platform.shareAppMessage((res) => {
            EventMgr.emit(EventConstants.UI_SHOW_TOAST, res ? '分享成功' : '分享失败');
        });
    }

    onBtnCloseClick(): void {
        this.close();
    }
}

