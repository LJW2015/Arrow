import { _decorator, Component, Node } from 'cc';
import { GameComponent } from '../GameFrame/GameComponent';
import { Debug } from '../Core/Debug';
import { PrefabConfig } from '../Core/PrefabConfig';
import { g_scene } from '../GameFrame/GameScene';
import { g_logic } from '../GameFrame/GameLogic';
const { ccclass, property } = _decorator;

@ccclass('GHome')
export class GHome extends GameComponent {
    protected async init(...args: any[]): Promise<void> {
        await super.init(...args);
        this.setBtnEven('btnStart', this.onStartClick);
    }

    private onStartClick() {
        g_logic.startGame();
    }
    
    public async close(): Promise<void> {
        await super.close();
    }
}
