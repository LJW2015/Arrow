import { _decorator, Component, Node } from 'cc';
import { GameComponent } from '../GameFrame/GameComponent';
import { Debug } from '../Core/Debug';
const { ccclass, property } = _decorator;

@ccclass('Game')
export class Game extends GameComponent {
    /**
     * 初始化方法（异步，可传递不定长参数）
     * 在预制体打开时调用，用于加载资源、请求数据等
     * @param ...args 初始化参数（不定长参数）
     */
    protected async init(...args: any[]): Promise<void> {
        await super.init(...args);
        Debug.log('Game init');
        // 你的初始化逻辑
    }

    /**
     * 关闭方法（同步）
     * 在预制体关闭时调用，用于清理资源、保存数据等
     * 必须调用 super.close()，会自动处理缓存清理和销毁
     */
    protected close(): void {
        Debug.log('Game close');
        // 你的关闭逻辑
        super.close(); // 必须调用，会自动处理缓存清理和销毁
    }
}


