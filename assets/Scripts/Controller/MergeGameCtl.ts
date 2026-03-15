/**
 * 数字合成消除 - 游戏逻辑控制器
 * 版本：v1.0 创建者：ljw
 */
import { BoardModel, IMergeGroup } from "../Model/BoardModel";
import { EventMgr } from "../Core/EventMgr";
import { EventConstants } from "../Core/Constants";
import { g_data } from "../GameFrame/GameData";
import { CfgMgr, LevelCfg } from "../Core/CfgMgr";

export class MergeGameCtl {
    private static _level: number = 1;
    private static _cfgLevel: LevelCfg | null = null;
    private static _board: BoardModel = new BoardModel();

    static get level(): number { return this._level; }
    static set level(value: number) { this._level = value; }
    static get board(): BoardModel { return this._board; }
    static get cfgLevel(): LevelCfg | null { return this._cfgLevel; }

    /** 获取棋盘大小 [列, 行] */
    static getSize(): [number, number] {
        return [this._board.cols, this._board.rows];
    }

    /** 获取过关需达到的目标数字（数组最后一项） */
    static getTargetNum(): number {
        return this._board.targetNum;
    }

    /** 获取目标数组（用于展示进度） */
    static getTargetArr(): number[] {
        return this._board.targetArr;
    }

    /** 获取初始填充数字范围（来自配置，若无则 [1,1]） */
    static getStartNumRange(): [number, number] {
        return this._cfgLevel?.startNumRange ?? [1, 1];
    }

    /**
     * 开始游戏/关卡
     * @param level 关卡 id，不传则用当前 _level
     * @param options 可选覆盖：棋盘大小、目标、初始填充数字范围
     */
    static startLevel(): void {
        this._level = g_data.getCurrentStage();
        this._cfgLevel = CfgMgr.getDataById<LevelCfg>('LevelCfg', this._level);
        this._board.initLevel(this._cfgLevel);
        EventMgr.emit(EventConstants.GAME_SCORE_STEPS_UPDATE);
    }

    /** 合成流程进行中时屏蔽点击 */
    static setMergeInProgress(v: boolean): void {
        this._mergeInProgress = v;
    }
    private static _mergeInProgress = false;

    /** 点击格子：仅使数字+1，返回是否成功；合成进行中直接拒绝 */
    static clickCell(col: number, row: number): boolean {
        if (this._mergeInProgress) return false;
        const ok = this._board.clickCell(col, row);
        if (ok) EventMgr.emit(EventConstants.GAME_SCORE_STEPS_UPDATE);
        return ok;
    }

    /** 获取可合成信息（不修改棋盘） */
    static getMergeInfo(chosenCol?: number, chosenRow?: number): IMergeGroup | null {
        return this._board.getMergeInfo(chosenCol, chosenRow);
    }

    /** 仅应用合成（不下落） */
    static applyMergeOnly(group: IMergeGroup): void {
        this._board.applyMergeOnly(group);
    }

    /** 获取下落移动列表（用于动画） */
    static getFallMoves(): { col: number; fromRow: number; toRow: number; val: number }[] {
        return this._board.getFallMoves();
    }

    /** 下落 + 空位填充（下落动画完成后调用），返回新填充的位置 */
    static applyFallAndFill(): { col: number; row: number }[] {
        return this._board.applyFallAndFill();
    }

    /** 检查合成（无动画，同步处理，用于非动画场景） */
    static checkMerge(): void {
        const { maxNum } = this._board.doFullMergeRound();
        EventMgr.emit(EventConstants.GAME_SELECT_CELL, { maxNum });
        EventMgr.emit(EventConstants.GAME_SCORE_STEPS_UPDATE);
        this._checkWinLose();
    }

    /** 撤销 */
    static undo(): boolean {
        const ok = this._board.undo();
        if (ok) {
            EventMgr.emit(EventConstants.GAME_LEVEL_UPDATE);
            EventMgr.emit(EventConstants.GAME_SCORE_STEPS_UPDATE);
        }
        return ok;
    }

    /** 打乱棋盘 */
    static shuffle(): void {
        this._board.shuffle();
        EventMgr.emit(EventConstants.GAME_LEVEL_UPDATE);
        EventMgr.emit(EventConstants.GAME_SCORE_STEPS_UPDATE);
    }

    private static _checkWinLose(): void {
        const target = this._board.targetNum;
        if (this._board.checkWin(target)) {
            g_data.setMaxStage(Math.max(g_data.getMaxStage(), this._level + 1));
            EventMgr.emit(EventConstants.GAME_WIN);
        } else if (this._board.checkLose(target)) {
            EventMgr.emit(EventConstants.GAME_FAIL);
        }
    }

    static getScore(): number {
        return this._board.bestNum;
    }

    static getStepsRemain(): number {
        return this._board.stepsRemain;
    }

    /** 目标数字是否已达成（棋盘上是否出现该数字） */
    static hasTargetAchieved(num: number): boolean {
        const board = this._board;
        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c < board.cols; c++) {
                if (board.getAt(c, r) >= num) return true;
            }
        }
        return false;
    }
}
