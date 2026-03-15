/**
 * 常量配置类 (Constants)
 * 
 * 功能说明：
 * - 定义游戏中的常量配置
 * - 包含配置路径、存储标识、版本配置等
 * 
 * 注意事项：
 * - 修改 cacheVersionConfig 版本号时，如果版本号不同且 needForceUpdate 为 true，会清空所有本地存储数据
 * - 版本号使用字符串格式，如 "1.0.0"
 * - needForceUpdate 为 false 时，版本号不同只会更新版本号，不会清空数据
 */
export class Constants {
    public static ConfigPath = 'ConfigData/';
    //数据存储
    public static cacheVersion = 'cacheVersion';
    
    public static gameConfigId = 'gameData';//游戏数据
    public static playerConfigId = 'playerData';//玩家数据
    // 游戏数据版本号（字符串格式，如 "1.0.0"）
    public static cacheVersionConfig = '1.0.0';
    // 是否需要强制更新（当版本号不同且此字段为 true 时，会清空所有本地存储数据）
    // true: 版本号不同时强制清空数据（存档升级）
    // false: 版本号不同时保留数据，只更新版本号
    public static needForceUpdate = false;
}

/**
 * 游戏常量配置
 * 包含所有硬编码的数值常量，避免魔法数字
 */
export class GameConstants {
    public static LOAD_PROGRESS_CONFIG = 80;
    public static LOAD_PROGRESS_SCENE = 20;
    public static PROGRESS_COMPLETE = 100;
    // 棋盘渲染配置
    public static BOARD_CELL_SIZE = 68;
    public static BOARD_CELL_COLUMN = 9;
    public static BOARD_EXTRA_ROWS = 5; // 网格比当前最大行数多出的预留行数

    /** 20种马卡龙配色，作为数字底板背景色 */
    public static BG_COLOR_ARR = [
        '#3AC26F', '#F7B32B', '#37A8E8', '#FF7B57', '#EA5DAE', '#36C1AA', '#9B6ADB', 
    ];
    /** 数字文字颜色（白色） */
    public static NUM_COLOR_WHITE = '#FFFFFF';
}

/**
 * 事件常量配置
 */
export class EventConstants {
    /** 游戏开始事件 */
    public static EVENT_GAME_START = 'game_start';
    /** 游戏结束事件 */
    public static EVENT_GAME_END = 'game_end';
    /** 游戏暂停事件 */
    public static EVENT_GAME_PAUSE = 'game_pause';
    /** 游戏恢复事件 */
    public static EVENT_GAME_RESUME = 'game_resume';
    /** 显示顶层遮罩（屏蔽点击） */
    public static EVENT_SHOW_TOP_MASK = 'show_top_mask';
    /** 登录结束事件 */
    public static EVENT_LOGIN_END = 'login_end';
    /** 加载数据结束事件 */
    public static EVENT_LOADDATA_END = 'loaddata_end';
    /** 加载完成事件 */
    public static EVENT_LOAD_COMPLETE = 'load_complete';

     /** 关闭预制体事件（用于解耦 GameComponent 和 GameScene 的循环引用） */
     public static EVENT_CLOSE_PREFAB = 'event_close_prefab';
     /** 注册更新函数事件（用于解耦 GameComponent 和 GameLogic 的循环引用） */
     public static EVENT_REGISTER_UPDATE_FUNC = 'event_register_update_func';
     /** 移除更新函数事件（用于解耦 GameComponent 和 GameLogic 的循环引用） */
     public static EVENT_REMOVE_UPDATE_FUNC = 'event_remove_update_func';

    //=======================================================================================

    /** 打开通用窗口事件 */
    public static UI_OPEN_COMMON_WINDOW = 'ui_open_common_window';
   
    /** 显示提示弹窗事件 */
    public static UI_SHOW_TOAST = 'ui_show_toast';


    //====================================游戏事件=============================================
    /** 选择棋子事件 */
    public static GAME_SELECT_CELL = 'game_select_cell';
    /** 提示棋子事件 */
    public static GAME_HINT_CELL = 'game_hint_cell';
    /** 追加棋子事件 */
    public static GAME_ADD_CELL = 'game_add_cell';
    /** 开始清除棋子事件 */
    public static GAME_START_CLEAR_CELLS = 'game_start_clear_cells';
    /** 结束清除棋子事件 */
    public static GAME_END_CLEAR_CELLS = 'game_end_clear_cells';
    /** 无法清除事件（值可以配对但位置不连通） */
    public static GAME_CANNOT_CLEAR = 'game_cannot_clear';
    /** 更新追加次数事件 */
    public static GAME_UPDATE_ADD_REMAIN = 'game_update_add_remain';
    /** 更新提示次数事件 */
    public static GAME_UPDATE_HINT_REMAIN = 'game_update_hint_remain';
    /** 关卡胜利事件 */
    public static GAME_WIN = 'game_win';
    /** 关卡失败事件 */
    public static GAME_FAIL = 'game_fail';

    /** 更新关卡事件 */
    public static GAME_LEVEL_UPDATE = 'game_level_update';
    /** 分数、步数变化事件 */
    public static GAME_SCORE_STEPS_UPDATE = 'game_score_steps_update';
}

export enum UILayer {
    BACKGROUND = "background",
    UI = "ui",
    WINDOW = "window",
    POPUP = "popup",
    TOP_MOST = "topMost",
    TOP_MASK = "topMask",
}


