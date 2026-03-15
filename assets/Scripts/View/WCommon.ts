import { _decorator, Button, Component, Label, Node } from 'cc';
import { GameComponent } from '../GameFrame/GameComponent';
import { Debug } from '../Core/Debug';
const { ccclass, property } = _decorator;

@ccclass('WCommon')
export class WCommon extends GameComponent {

    lblTitle: Label = null;
    lblContent: Label = null;
    btn1: Button = null;
    lbl1: Label = null;
    btn2: Button = null;
    lbl2: Label = null;
    mask: Button = null;

    protected async init(info: any = {}): Promise<void> {
        await super.init(info);

        const {
            title,
            content,
            lbl1,
            lbl2,
            btn1Callback,
            btn2Callback,
            closeOnMask = true,
        } = info || {};

        const bg = this.getNode('bg');
        const lay = this.getNode('lay', bg);
        this.lblTitle = this.getLabel('lblTitle', bg);
        this.lblContent = this.getLabel('lblContent', bg);
        this.btn1 = this.getButton('btn1', lay);
        this.btn2 = this.getButton('btn2', lay);
        this.mask = this.getButton('mask');
        this.lbl1 = this.getLabel('lbl1', this.btn1.node);
        this.lbl2 = this.getLabel('lbl2', this.btn2.node);

        if (title !== undefined) {
            this.lblTitle.string = title;
        }
        if (content !== undefined) {
            this.lblContent.string = content;
        }
        if (lbl1 !== undefined) {
            this.lbl1.string = lbl1;
        }
        if (lbl2 !== undefined) {
            this.lbl2.string = lbl2;
        }

        if (typeof btn1Callback === 'function') {
            this.btn1.node.active = true;
            this.setBtnEven(this.btn1.node, () => {
                btn1Callback();
                this.close();
            });
        } else {
            this.btn1.node.active = false;
        }

        if (typeof btn2Callback === 'function') {
            this.btn2.node.active = true;
            this.setBtnEven(this.btn2.node, () => {
                btn2Callback();
                this.close();
            });
        } else {
            this.btn2.node.active = false;
        }

        if (closeOnMask && this.mask) {
            this.setBtnEven(this.mask.node, () => {
                this.close();
            });
        }
    }

    protected async close(): Promise<void> {
        super.close();
    }
}


