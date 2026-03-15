import { Vec2 } from "cc";

/**
 * 日志级别枚举
 * 用于控制 Debug 类的日志输出级别
 */
enum DebugLevel {
    DEBUG = 0,    // 调试信息
    INFO = 1,     // 普通信息
    WARNING = 2,  // 警告信息
    ERROR = 3     // 错误信息
}

enum Mode {
    DEBUG = 0,    // 调试模式
    RELEASE = 1,  // 发布模式
    TEST = 2,     // 测试模式
}

/**
 * 游戏全局定义类 (Game Define)
 * 
 * 功能说明：
 * - 定义游戏全局变量和常量
 * - 包含游戏状态、视图尺寸、调试级别等配置
 * 
 * 使用场景：
 * - 游戏状态管理（启动、结束、暂停等）
 * - 视图尺寸配置
 * - 调试级别控制
 * - 屏幕震动参数配置
 */
export class GameDefine {
    public static gameStart = false;  //游戏是否启动
    public static gameOver = false;  //游戏结束
    public static gameTouch = false; //触摸移动

    public static readonly frameTime = 0.016; //固定帧时间
    public static readonly defaultFrameTime = 0.016; //固定帧默认时间

    public static readonly viewWidth = 750;
    public static readonly viewHeight = 1334;


    public static readonly ScreenShakeLevel = 1;//屏幕震动等级
    public static readonly ScreenShakeCount = 1;//屏幕震动次数
    public static readonly ScreenShakeInteval = 0.0333;//屏幕震动时间参数

    public static readonly DebugLevel = DebugLevel.DEBUG;//日志级别设置

    public static readonly Mode = Mode.DEBUG;

    public static readonly isCrypto = false; //是否加密

    public static readonly gameName = 'ttzhwzx'; //游戏Id（用于存储key前缀）

    public static readonly gameVersion = '2.0.0'

    public static readonly isDebug = (): boolean => {
        return this.Mode === Mode.DEBUG;
    }

    public static readonly useSDK = false; //是否使用SDK

}
