/**
 * 数字合成消除 - 游戏主界面
 * 版本：v1.0 创建者：ljw
 */
import { _decorator, Node, Label, Sprite, Button, UITransform, Color, Layout, instantiate, tween, Tween, UIOpacity, Vec3 } from 'cc';
import { GameComponent } from '../GameFrame/GameComponent';
import { MergeGameCtl } from '../Controller/MergeGameCtl';
import { EventMgr } from '../Core/EventMgr';
import { EventConstants } from '../Core/Constants';
import { GameConstants } from '../Core/Constants';
import { g_scene } from '../GameFrame/GameScene';
import { g_logic } from '../GameFrame/GameLogic';
import { g_data } from '../GameFrame/GameData';
import { PrefabConfig } from '../Core/PrefabConfig';
import { ResourceMgr } from '../Core/ResourceMgr';
import { CfgMgr, LevelCfg } from '../Core/CfgMgr';
import { Util } from '../Core/Util';
const { ccclass, property } = _decorator;

const BOARD_SIZE = 700;
/** 合并动画基础时长（s），以组内最短路径为参考，统一到达 */
const MERGE_ANIM_BASE = 0.4;
/** 下落动画时长范围（ms）：距离越大时间越长 */
const FALL_ANIM_MS_MIN = 180;
const FALL_ANIM_MS_MAX = 650;
/** 合成流程各阶段间隔（s） */
const MERGE_STAGE_INTERVAL = 0.1;
/** 棋子填充出现动画时长 */
const FILL_APPEAR_DUR = 0.1;

@ccclass('GGame')
export class GGame extends GameComponent {
    //棋盘
    conternt: Node = null;

    //棋盘格子
    cellNodes: Node[][] = [];
    //等级
    lblLevel: Label = null;
    //分数
    lblScore: Label = null;
    //剩余步数
    lblSteps: Label = null;
    //目标布局
    layTarget: Layout = null;
    //棋盘格子预制体
    nodeClone: Node = null;

    //目标节点预制体
    nodeTarget: Node = null;

    size: [number, number] = [5, 5];
    minNum: number = 2;
    target: number[] = [];
    private _cellSize = 0;
    private _gap = 5;
    private _totalW = 0;
    private _totalH = 0;

    protected async init(...args: any[]): Promise<void> {
        await super.init(...args);       
        this.conternt = this.getNode('content');
        this.lblLevel = this.getLabel('lblLevel');
        this.lblScore = this.getLabel('lblScore');
        this.lblSteps = this.getLabel('lblSteps');
        this.layTarget = this.getLayout('layTarget');
        this.nodeClone = this.getNode('nodeClone');
        this.nodeTarget = this.getNode('nodeTarget');
        this.setBtnEven('btnShuffle', this._onShuffle);
        EventMgr.on(EventConstants.GAME_WIN, this._onWin, this);
        EventMgr.on(EventConstants.GAME_FAIL, this._onFail, this);
        EventMgr.on(EventConstants.GAME_LEVEL_UPDATE, this._onBoardUpdate, this);
        EventMgr.on(EventConstants.GAME_SCORE_STEPS_UPDATE, this._onScoreStepsUpdate, this);
        MergeGameCtl.startLevel();
        this.initUI();
    }

    private initUI(): void {
        this.size = MergeGameCtl.getSize();
        this.minNum = MergeGameCtl.getStartNumRange()[0];
        this.lblLevel.string = `第${MergeGameCtl.level}关`;
        this.updateTarget();
        this.updateGrid();
        this.checkMergeFlow();  // 棋盘初始化后检查是否可以合成（带动画）
    }

    private updateTarget(): void {
        this.target = MergeGameCtl.getTargetArr();
        this.layTarget.node.removeAllChildren();
        const grayColor = new Color(80, 99, 99, 255);
        for (let i = 0; i < this.target.length; i++) {
            const targetNode = instantiate(this.nodeTarget);
            targetNode.setParent(this.layTarget.node);
            const achieved = MergeGameCtl.hasTargetAchieved(this.target[i]);
            const sprite = targetNode.getComponent(Sprite);
            if (sprite) {
                sprite.color = achieved
                    ? Util.stringToColor(GameConstants.BG_COLOR_ARR[(this.target[i] - 1) % GameConstants.BG_COLOR_ARR.length])
                    : grayColor;
            }
            this.getLabel('lbl', targetNode).string = this.target[i].toString();
        }
    }

    private _getCellPos(col: number, row: number): Vec3 {
        const x = -this._totalW / 2 + this._cellSize / 2 + col * (this._cellSize + this._gap);
        const y = this._totalH / 2 - this._cellSize / 2 - row * (this._cellSize + this._gap);
        return new Vec3(x, y, 0);
    }

    private updateGrid(): void {
        const [cols, rows] = this.size;
        this._gap = 5;
        this._cellSize = Math.min(
            (BOARD_SIZE - (cols - 1) * this._gap) / cols,
            (BOARD_SIZE - (rows - 1) * this._gap) / rows
        );
        this._totalW = cols * this._cellSize + (cols - 1) * this._gap;
        this._totalH = rows * this._cellSize + (rows - 1) * this._gap;

        this.conternt.removeAllChildren();
        this.cellNodes = [];
        const board = MergeGameCtl.board;

        for (let r = 0; r < rows; r++) {
            const rowNodes: Node[] = [];
            for (let c = 0; c < cols; c++) {
                const cell = instantiate(this.nodeClone);
                cell.setParent(this.conternt);

                const ut = cell.getComponent(UITransform) || cell.addComponent(UITransform);
                ut.setContentSize(this._cellSize, this._cellSize);

                cell.setPosition(this._getCellPos(c, r));

                const col = c, row = r;
                cell.on(Node.EventType.TOUCH_START, () => {
                    if (MergeGameCtl.clickCell(col, row)) {
                        this.checkMergeFlow(col, row);
                    }
                }, this);

                rowNodes.push(cell);
            }
            this.cellNodes.push(rowNodes);
        }
        this._refreshGrid();
    }

    private _refreshGrid(): void {
        const board = MergeGameCtl.board;
        const colorLen = GameConstants.BG_COLOR_ARR.length;
        for (let r = 0; r < this.cellNodes.length; r++) {
            for (let c = 0; c < this.cellNodes[r].length; c++) {
                const cell = this.cellNodes[r][c];
                if (!cell || !cell.isValid) continue;
                cell.setSiblingIndex(r + c);
                Tween.stopAllByTarget(cell);  // 停止该格子上所有 tween，避免残余动画
                cell.setPosition(this._getCellPos(c, r));  // 重置位置（动画后需还原）
                const val = board.getAt(c, r);
                const sprite = cell.getComponent(Sprite);
                const label = this.getLabel('lbl', cell) || cell.getComponentInChildren(Label);
                if(val == 0){
                    cell.active = false;
                }else{
                    cell.active = true;
                }
                if (sprite) {
                    const idx = val > 0 ? (val - 1) % colorLen : 0;
                    sprite.color = Util.stringToColor(GameConstants.BG_COLOR_ARR[idx]);
                }
                if (label) {
                    label.string = val > 0 ? val.toString() : '';
                    label.color = new Color(255, 255, 255);
                }
            }
        }
    }

    private _onBoardUpdate(): void {
        this.initUI();
    }

    /** 合成流程（带动画）：获取合成信息 -> 播放动画 -> 应用 -> 下落填充 -> 继续检查直到稳定 */
    private checkMergeFlow(clickedCol?: number, clickedRow?: number): void {
        const info = MergeGameCtl.getMergeInfo(clickedCol, clickedRow);
        if (!info) {
            MergeGameCtl.setMergeInProgress(false);
            EventMgr.emit(EventConstants.GAME_SCORE_STEPS_UPDATE);
            if (MergeGameCtl.board.checkWin(MergeGameCtl.getTargetNum())) {
                g_data.setMaxStage(Math.max(g_data.getMaxStage(), MergeGameCtl.level + 1));
                EventMgr.emit(EventConstants.GAME_WIN);
            } else if (MergeGameCtl.board.checkLose(MergeGameCtl.getTargetNum())) {
                EventMgr.emit(EventConstants.GAME_FAIL);
            }
            this._refreshGrid();
            return;
        }
        MergeGameCtl.setMergeInProgress(true);
        this._playMergeAnimation(info, () => {
            this.scheduleOnce(() => {
                MergeGameCtl.applyMergeOnly(info);
                this._refreshGrid();
                this.scheduleOnce(() => {
                    this._playFallAnimation(() => {
                        this.scheduleOnce(() => {
                            const filled = MergeGameCtl.applyFallAndFill();
                            this._refreshGrid();
                            this._playFillAppearAnimation(filled, () => {
                                this.scheduleOnce(() => this.checkMergeFlow(), MERGE_STAGE_INTERVAL);
                            });
                        }, MERGE_STAGE_INTERVAL);
                    });
                }, MERGE_STAGE_INTERVAL);
            }, MERGE_STAGE_INTERVAL);
        });
    }

    /**
     * 填充出现动画：从上半格下落到指定位置，透明度 0->255，0.2s
     */
    private _playFillAppearAnimation(filled: { col: number; row: number }[], onDone: () => void): void {
        if (filled.length === 0) {
            onDone();
            return;
        }
        const halfCell = (this._cellSize + this._gap) / 2;
        const anims: Promise<void>[] = [];
        for (const p of filled) {
            const cell = this.cellNodes[p.row]?.[p.col];
            if (!cell || !cell.isValid) continue;
            const targetPos = this._getCellPos(p.col, p.row);
            const startPos = new Vec3(targetPos.x, targetPos.y + halfCell, 0);
            cell.setPosition(startPos);
            let uiOpacity = cell.getComponent(UIOpacity);
            if (!uiOpacity) uiOpacity = cell.addComponent(UIOpacity);
            uiOpacity.opacity = 0;
            anims.push(new Promise<void>(resolve => {
                tween(cell).to(FILL_APPEAR_DUR, { position: targetPos }).start();
                tween(uiOpacity).to(FILL_APPEAR_DUR, { opacity: 255 }).call(() => resolve()).start();
            }));
        }
        Promise.all(anims).then(() => onDone());
    }

    /**
     * 播放下落动画：FLIP 位移动画，时长与下落距离相关 180–650ms
     * 隐藏“纯目标格”避免下落棋子与目标格重叠
     */
    private _playFallAnimation(onDone: () => void): void {
        const moves = MergeGameCtl.getFallMoves();
        if (moves.length === 0) {
            onDone();
            return;
        }
        const targets = new Set<string>();
        const sources = new Set<string>();
        for (const m of moves) {
            if (m.fromRow === m.toRow) continue;
            targets.add(`${m.col},${m.toRow}`);
            sources.add(`${m.col},${m.fromRow}`);
        }
        const toHide: Node[] = [];
        targets.forEach(key => {
            if (sources.has(key)) return;  // 同时为下落源，不隐藏
            const [c, r] = key.split(',').map(Number);
            const cell = this.cellNodes[r]?.[c];
            if (cell && cell.isValid && cell.active) {
                cell.active = false;
                toHide.push(cell);
            }
        });

        const anims: Promise<void>[] = [];
        for (const m of moves) {
            if (m.fromRow === m.toRow) continue;
            const cell = this.cellNodes[m.fromRow]?.[m.col];
            if (cell && cell.isValid) {
                const dropRows = m.toRow - m.fromRow;
                const durationMs = Math.min(FALL_ANIM_MS_MAX, Math.max(FALL_ANIM_MS_MIN, FALL_ANIM_MS_MIN + dropRows * 100));
                const targetPos = this._getCellPos(m.col, m.toRow);
                anims.push(new Promise<void>(resolve => {
                    Tween.stopAllByTarget(cell);
                    tween(cell).to(durationMs / 1000, { position: targetPos }).call(() => resolve()).start();
                }));
            }
        }
        Promise.all(anims).then(() => {
            toHide.forEach(n => { n.active = true; });
            onDone();
        });
    }

    /**
     * 播放合成动画：两段轴向移动（先水平后垂直），组内统一到达时间
     * 若同行则仅水平、同列则仅垂直；否则分两段
     */
    private _playMergeAnimation(group: import("../Model/BoardModel").IMergeGroup, onDone: () => void): void {
        const chosen = group.chosen;
        const chosenPos = this._getCellPos(chosen.col, chosen.row);
        // 组内最大曼哈顿距离作为参考，统一时长
        let maxManhattan = 0;
        for (const p of group.others) {
            const m = Math.abs(p.col - chosen.col) + Math.abs(p.row - chosen.row);
            if (m > maxManhattan) maxManhattan = m;
        }
        const totalDur = Math.max(0.3, MERGE_ANIM_BASE + 0.06 * maxManhattan);

        const prom: Promise<void>[] = [];
        for (const p of group.others) {
            const cell = this.cellNodes[p.row]?.[p.col];
            if (!cell || !cell.isValid) continue;
            const dx = chosen.col - p.col;
            const dy = chosen.row - p.row;
            const adx = Math.abs(dx);
            const ady = Math.abs(dy);

            if (adx === 0 && ady === 0) {
                prom.push(Promise.resolve());
                continue;
            }
            if (adx === 0) {
                // 同列，仅垂直
                prom.push(new Promise<void>(resolve => {
                    Tween.stopAllByTarget(cell);
                    tween(cell).to(totalDur, { position: chosenPos }).call(() => resolve()).start();
                }));
            } else if (ady === 0) {
                // 同行，仅水平
                prom.push(new Promise<void>(resolve => {
                    Tween.stopAllByTarget(cell);
                    tween(cell).to(totalDur, { position: chosenPos }).call(() => resolve()).start();
                }));
            } else {
                // 两段：先水平后垂直
                const midPos = this._getCellPos(chosen.col, p.row);
                const t1 = totalDur * (adx / (adx + ady));
                const t2 = totalDur - t1;
                prom.push(new Promise<void>(resolve => {
                    cell.setSiblingIndex(999);
                    Tween.stopAllByTarget(cell);
                    tween(cell)
                        .to(t1, { position: midPos })
                        .to(t2, { position: chosenPos })
                        .call(() => resolve())
                        .start();
                }));
            }
        }
        Promise.all(prom).then(() => onDone());
    }

    private _onScoreStepsUpdate(): void {
        if (this.lblScore) this.lblScore.string = `分数: ${MergeGameCtl.getScore()}`;
        if (this.lblSteps) this.lblSteps.string = `剩余步数: ${MergeGameCtl.getStepsRemain()}`;
        this.updateTarget();  // 刷新目标达成状态
    }

    private _onBack(): void {
        g_logic.exitGame();
    }

    private _onShuffle(): void {
        MergeGameCtl.shuffle();
    }

    private _onUndo(): void {
        MergeGameCtl.undo();
    }

    private _onRules(): void {
        g_scene.openMultyPrefab(PrefabConfig.WCommon, {
            title: '玩法',
            content: '• 点击任意方块使其数字+1\n• 当形成≥3个相同数字的连通块时合并为更大数字\n• 合并后空位下落补全并可能触发连锁\n• 撤销可回到上一步',
            lbl1: '知道了',
            btn1Callback: () => {},
            btn2Callback: undefined,
            closeOnMask: true,
        });
    }

    private _onWin(): void {
        g_scene.openMultyPrefab(PrefabConfig.WCommon, {
            title: '通关成功',
            content: '恭喜过关！',
            lbl1: '继续',
            lbl2: '返回',
            btn1Callback: () => {
                g_data.setCurrentStage(g_data.getCurrentStage() + 1);
                MergeGameCtl.startLevel();
                EventMgr.emit(EventConstants.GAME_LEVEL_UPDATE);
            },
            btn2Callback: () => g_logic.exitGame(),
            closeOnMask: false,
        });
    }

    private _onFail(): void {
        g_scene.openMultyPrefab(PrefabConfig.WCommon, {
            title: '挑战失败',
            content: '步数用完了，再试一次吧！',
            lbl1: '重来',
            lbl2: '返回',
            btn1Callback: () => {
                MergeGameCtl.startLevel();
                EventMgr.emit(EventConstants.GAME_LEVEL_UPDATE);
            },
            btn2Callback: () => g_logic.exitGame(),
            closeOnMask: false,
        });
    }

    public async close(): Promise<void> {
        EventMgr.off(EventConstants.GAME_WIN, this._onWin, this);
        EventMgr.off(EventConstants.GAME_FAIL, this._onFail, this);
        EventMgr.off(EventConstants.GAME_LEVEL_UPDATE, this._onBoardUpdate, this);
        EventMgr.off(EventConstants.GAME_SCORE_STEPS_UPDATE, this._onScoreStepsUpdate, this);
        await super.close();
    }
}
