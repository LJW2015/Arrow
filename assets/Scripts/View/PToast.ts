import { _decorator, Component, EditBox, Label, Node, tween, UIOpacity, Vec3 } from 'cc';
import { GameComponent } from '../GameFrame/GameComponent';
import { g_data } from '../GameFrame/GameData';
import { g_platform, SideBarState } from '../GameFrame/GamePlatform';
import { Debug } from '../Core/Debug';
const { ccclass, property } = _decorator;

@ccclass('PToast')
export class PToast extends GameComponent {

    lblContent: Label = null;

    protected async init(content: string): Promise<void> {
        await super.init(content);
        this.lblContent = this.getLabel('node/lblContent');
        this.lblContent.string = content;
        this.show();
    }

    private show(): void {
        // 实现一个缓慢上升的动画
        tween(this.node).delay(1).parallel(
            tween(this.node).to(0.2, { position: new Vec3(0, 50, 0) }),
            tween(this.lblContent.node.parent.getComponent(UIOpacity)).to(0.2, { opacity: 0 })
        ).call(() => {
            this.close();
        }).start();
    }

    protected async close(): Promise<void> {
        // 你的关闭逻辑
        super.close(); // 必须调用，会自动处理缓存清理和销毁
    }
}

