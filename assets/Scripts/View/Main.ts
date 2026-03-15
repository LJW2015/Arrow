import { _decorator, Component, Node } from 'cc';
import { g_scene } from '../GameFrame/GameScene';
import { PrefabConfig } from '../Core/PrefabConfig';
import { GameDefine } from '../Core/GameDefine';
import { g_platform } from '../GameFrame/GamePlatform';
import { g_logic } from '../GameFrame/GameLogic';
const { ccclass, property } = _decorator;

@ccclass('Main')
export class Main extends Component {

    onLoad(): void {
        g_platform.init();
        g_scene.init(this.node);
        g_logic.init();
    }

    update(dt: number): void {
        g_logic.update(dt);
    }
}
