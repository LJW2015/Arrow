import { _decorator, Component, Node } from 'cc';
import { GameComponent } from '../GameFrame/GameComponent';
const { ccclass, property } = _decorator;

/**
 * 游戏组件模板 (Game Component Template)
 * 
 * 功能说明：
 * - 继承自 GameComponent，用于创建新的游戏界面组件
 * - 提供统一的初始化方法：init()
 * - 提供统一的关闭方法：close()
 * - 在 GameScene 打开/关闭预制体时自动调用这些方法
 * 
 * 使用说明：
 * 1. 创建新脚本时选择此模板
 * 2. 将类名和 @ccclass 中的名称替换为你的组件名称
 * 3. 在 init() 方法中添加初始化逻辑
 * 4. 在 close() 方法中添加清理逻辑
 * 
 * 版本：v1.0
 * 创建者：ljw
 */
@ccclass('Template')
export class Template extends GameComponent {
    /**
     * 初始化方法（异步，可传递不定长参数）
     * 在预制体打开时调用，用于加载资源、请求数据等
     * @param ...args 初始化参数（不定长参数）
     */
    protected async init(...args: any[]): Promise<void> {
        await super.init(...args);
        // 你的初始化逻辑
    }

    /**
     * 关闭方法（同步）
     * 在预制体关闭时调用，用于清理资源、保存数据等
     * 必须调用 super.close()，会自动处理缓存清理和销毁
     */
    protected close(): void {
        // 你的关闭逻辑
        super.close(); // 必须调用，会自动处理缓存清理和销毁
    }
}

