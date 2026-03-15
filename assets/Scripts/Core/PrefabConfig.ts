/**
 * 预制体配置 (Prefab Config)
 * 
 * 功能说明：
 * - 定义所有预制体的路径常量
 * - 用于在代码中引用预制体，避免硬编码字符串路径
 * - 路径相对于 resources 目录
 * 
 * 使用示例：
 * ```typescript
 * await GameScene.openPrefab(PrefabConfig.Game);
 * ```
 * 
 * 版本：v1.0
 * 创建者：ljw
 */
export class PrefabConfig {
    /** 游戏主界面 */
    public static readonly Game = 'Prefab/Game';

    /** 调试界面 */
    public static readonly TDebug = 'Prefab/TDebug';

    /** 加载界面 */
    public static readonly WLoad = 'Prefab/WLoad';

    /** 通用弹窗界面 */
    public static readonly WCommon = 'Prefab/WCommon';

    /** 提示弹窗 */
    public static readonly PToast = 'Prefab/PToast';

    /** 游戏界面 */
    public static readonly GGame = 'Prefab/GGame';

    /** 主界面 */
    public static readonly GHome = 'Prefab/GHome';

    /** 结束界面 */
    public static readonly WEnd = 'Prefab/WEnd';

    /** 调试界面 */
    public static readonly TGameDebug = 'Prefab/TGameDebug';
}