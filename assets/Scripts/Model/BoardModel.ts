/**
 * 棋盘数据模型 - 数字合成消除
 * 玩法：点击+1，≥3连通合并，下落补全，可撤销
 * 版本：v1.0 创建者：ljw
 */
import { LevelCfg } from "../Core/CfgMgr";
import { Util } from "../Core/Util";

/** 关卡配置（兼容旧逻辑） */
export interface ILevelConfig {
    level: number;
    maxSteps: number;
    targetNum: number;
    cols: number;
    rows: number;
    initGrid?: number[][];
}

/** 关卡初始化参数：棋盘大小、目标、初始填充数字范围 */
export interface ILevelInitOptions {
    /** 棋盘大小 [列数, 行数] */
    size: [number, number];
    /** 目标数字（合并出≥此数字即过关），可传多个则取第一个 */
    target: number | number[];
    /** 初始填充数字范围 [最小值, 最大值]，随机在此区间生成 */
    startNumRange: [number, number];
    /** 最大步数（可选，默认 5） */
    maxSteps?: number;
}

/** 单组合成信息：选定格子 + 其余格子，用于动画 */
export interface IMergeGroup {
    chosen: { col: number; row: number };
    others: { col: number; row: number }[];
    val: number;
    newVal: number;
}

/** 默认关卡配置 */
export const DEFAULT_LEVEL_CONFIGS: ILevelConfig[] = [
    { level: 1, maxSteps: 5, cols: 9, rows: 9, targetNum: 5 },
    { level: 2, maxSteps: 8, cols: 9, rows: 9, targetNum: 6 },
    { level: 3, maxSteps: 10, cols: 9, rows: 9, targetNum: 7 },
    { level: 4, maxSteps: 12, cols: 9, rows: 9, targetNum: 8 },
    { level: 5, maxSteps: 15, cols: 9, rows: 9, targetNum: 9 },
];

export class BoardModel {
    /** 棋盘数据，0=空 */
    private _grid: number[][] = [];
    /** 列数 */
    private _cols: number = 9;
    /** 行数 */
    private _rows: number = 9;
    /** 剩余步数 */
    private _stepsRemain: number = 0;
    /** 步数上限 */
    private _maxSteps: number = 5;
    /** 当前关卡 */
    private _level: number = 1;
    /** 目标数字数组，完成最后一项时关卡才算完成 */
    private _targetArr: number[] = [5];
    /** 本关最高合并数字（BEST） */
    private _bestNum: number = 0;
    /** 当前连锁数 */
    private _chainCount: number = 0;
    /** 撤销栈 */
    private _undoStack: string[] = [];
    /** 棋盘是否稳定（仅稳定时才检查合成，合成中为不稳定） */
    private _isStable: boolean = true;
    /** 初始数字范围，用于下落后的空位填充 */
    private _startNumRange: [number, number] = [1, 1];
    private static readonly UNDO_LIMIT = 20;

    get grid(): number[][] { return this._grid; }
    get cols(): number { return this._cols; }
    get rows(): number { return this._rows; }
    get stepsRemain(): number { return this._stepsRemain; }
    get level(): number { return this._level; }
    /** 目标数组最后一项（过关需达到的数字） */
    get targetNum(): number { return this._targetArr[this._targetArr.length - 1] ?? 5; }
    /** 目标数组 */
    get targetArr(): number[] { return this._targetArr; }
    get bestNum(): number { return this._bestNum; }
    get chainCount(): number { return this._chainCount; }
    get canUndo(): boolean { return this._undoStack.length > 0; }
    get isStable(): boolean { return this._isStable; }

    /** 获取指定位置的值，0表示空 */
    getAt(col: number, row: number): number {
        if (row < 0 || row >= this._rows || col < 0 || col >= this._cols) return 0;
        return this._grid[row][col] || 0;
    }

    /** 初始化关卡：根据棋盘大小和初始数字范围填充棋盘 */
    initLevel(cfgLevel: LevelCfg): void {
        const [cols, rows] = cfgLevel.size;
        const [minNum, maxNum] = cfgLevel.startNumRange;
        const maxSteps = (cfgLevel as any).maxSteps ?? 5;

        this._level = cfgLevel.id;
        this._cols = cols;
        this._rows = rows;
        this._targetArr = [...cfgLevel.target];
        this._startNumRange = [...cfgLevel.startNumRange];
        this._maxSteps = maxSteps;
        this._stepsRemain = maxSteps;
        this._bestNum = 0;
        this._chainCount = 0;
        this._undoStack = [];
        this._isStable = true;

        // 根据棋盘大小创建网格，用 startNumRange 内的随机数填充
        this._grid = [];
        const range = maxNum - minNum + 1;
        for (let r = 0; r < rows; r++) {
            const row: number[] = [];
            for (let c = 0; c < cols; c++) {
                row.push(minNum + Math.floor(Math.random() * range));
            }
            this._grid.push(row);
        }
    }

    /** 获取当前关卡配置 */
    getLevelConfig(configs: ILevelConfig[]): ILevelConfig | null {
        return configs.find(c => c.level === this._level) || null;
    }

    /** 保存快照用于撤销 */
    private _pushUndo(): void {
        const snap = JSON.stringify(this._grid);
        this._undoStack.push(snap);
        if (this._undoStack.length > BoardModel.UNDO_LIMIT) {
            this._undoStack.shift();
        }
    }

    /** 撤销一步 */
    undo(): boolean {
        if (this._undoStack.length === 0) return false;
        const snap =         this._undoStack.pop()!;
        this._grid = JSON.parse(snap);
        this._stepsRemain = Math.min(this._maxSteps, this._stepsRemain + 1);
        return true;
    }

    /** 打乱棋盘：随机交换非空格子 */
    shuffle(): void {
        const cells: { col: number; row: number; val: number }[] = [];
        for (let r = 0; r < this._rows; r++) {
            for (let c = 0; c < this._cols; c++) {
                const v = this._grid[r][c];
                if (v > 0) cells.push({ col: c, row: r, val: v });
            }
        }
        // Fisher-Yates 洗牌
        for (let i = cells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cells[i].val, cells[j].val] = [cells[j].val, cells[i].val];
        }
        // 清空后按新顺序填入
        for (let r = 0; r < this._rows; r++) {
            for (let c = 0; c < this._cols; c++) {
                this._grid[r][c] = 0;
            }
        }
        let idx = 0;
        for (let r = 0; r < this._rows && idx < cells.length; r++) {
            for (let c = 0; c < this._cols && idx < cells.length; c++) {
                this._grid[r][c] = cells[idx].val;
                idx++;
            }
        }
    }

    /** 点击格子使其+1，返回是否成功（会扣步数并触发合并流程） */
    clickCell(col: number, row: number): boolean {
        if (this._stepsRemain <= 0) return false;
        const v = this.getAt(col, row);
        if (v <= 0) return false;
        if (v >= 9) return false; // 最大9，不再加

        this._pushUndo();
        this._grid[row][col] = v + 1;
        this._stepsRemain--;
        return true;
    }

    /** 查找连通块（四方向，相同数字） */
    private _findConnected(col: number, row: number, val: number): { col: number; row: number }[] {
        const visited: boolean[][] = this._grid.map(r => r.map(() => false));
        const result: { col: number; row: number }[] = [];
        const stack: { col: number; row: number }[] = [{ col, row }];
        const d = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        while (stack.length > 0) {
            const { col: c, row: r } = stack.pop()!;
            if (r < 0 || r >= this._rows || c < 0 || c >= this._cols) continue;
            if (visited[r][c] || this._grid[r][c] !== val) continue;
            visited[r][c] = true;
            result.push({ col: c, row: r });
            for (const [dx, dy] of d) {
                stack.push({ col: c + dx, row: r + dy });
            }
        }
        return result;
    }

    /**
     * 非点击触发时按“边缘优先”选择合并目标（随机三种策略之一）
     * - 左边最近：组内列最小；同列多个取行最大
     * - 最下最近：组内行最大；同行多个取列最小
     * - 最右最近：组内列最大；同列多个取行最大
     */
    private _pickChosenByEdgePriority(group: { col: number; row: number }[]): { col: number; row: number } {
        const strategies = [
            () => {
                const minCol = Math.min(...group.map(p => p.col));
                const cands = group.filter(p => p.col === minCol);
                return cands.reduce((a, b) => (a.row >= b.row ? a : b));
            },
            () => {
                const maxRow = Math.max(...group.map(p => p.row));
                const cands = group.filter(p => p.row === maxRow);
                return cands.reduce((a, b) => (a.col <= b.col ? a : b));
            },
            () => {
                const maxCol = Math.max(...group.map(p => p.col));
                const cands = group.filter(p => p.col === maxCol);
                return cands.reduce((a, b) => (a.row >= b.row ? a : b));
            },
        ];
        const idx = Math.floor(Math.random() * strategies.length);
        return strategies[idx]();
    }

    /**
     * 获取可合成信息（不修改棋盘），用于动画
     * @param chosenCol 玩家点击的列（点击触发时作为选定格子）
     * @param chosenRow 玩家点击的行
     * @returns 首组合成信息，无则返回 null
     */
    getMergeInfo(chosenCol?: number, chosenRow?: number): IMergeGroup | null {
        const checked: boolean[][] = this._grid.map(r => r.map(() => false));
        for (let r = this._rows - 1; r >= 0; r--) {
            for (let c = 0; c < this._cols; c++) {
                const v = this._grid[r][c];
                if (v <= 0 || checked[r][c]) continue;
                const group = this._findConnected(c, r, v);
                if (group.length >= 3) {
                    let chosen: { col: number; row: number };
                    if (chosenCol !== undefined && chosenRow !== undefined) {
                        const idx = group.findIndex(p => p.col === chosenCol && p.row === chosenRow);
                        chosen = idx >= 0 ? group[idx] : this._pickChosenByEdgePriority(group);
                    } else {
                        chosen = this._pickChosenByEdgePriority(group);
                    }
                    const others = group.filter(p => p.col !== chosen.col || p.row !== chosen.row);
                    return {
                        chosen: { col: chosen.col, row: chosen.row },
                        others,
                        val: v,
                        newVal: Math.min(v + 1, 9),
                    };
                }
                for (const p of group) checked[p.row][p.col] = true;
            }
        }
        return null;
    }

    /** 应用合成信息（修改棋盘），需先完成动画再调用 */
    applyMergeInfo(group: IMergeGroup): void {
        for (const p of group.others) this._grid[p.row][p.col] = 0;
        this._grid[group.chosen.row][group.chosen.col] = group.newVal;
        this._bestNum = Math.max(this._bestNum, group.newVal);
        this._chainCount++;
        this._stepsRemain = Math.min(this._maxSteps, this._stepsRemain + 1);  // 每次合成+1，连锁累加，不超过上限
    }

    /** 仅应用合成（不下落、不填充） */
    applyMergeOnly(group: IMergeGroup): void {
        this._isStable = false;
        this.applyMergeInfo(group);
    }

    /** 下落 + 空位填充（下落动画完成后调用），返回新填充的位置 */
    applyFallAndFill(): { col: number; row: number }[] {
        this.fall();
        const filled = this.fillEmpty();
        this._isStable = true;
        return filled;
    }

    /** 合成 + 下落 + 空位填充（同步，无动画） */
    applyMergeFallAndFill(group: IMergeGroup): void {
        this._isStable = false;
        this.applyMergeInfo(group);
        this.fall();
        this.fillEmpty();
        this._isStable = true;
    }

    /** 获取下落移动列表（不修改棋盘），用于动画 */
    getFallMoves(): { col: number; fromRow: number; toRow: number; val: number }[] {
        const moves: { col: number; fromRow: number; toRow: number; val: number }[] = [];
        for (let c = 0; c < this._cols; c++) {
            const colVals: { row: number; val: number }[] = [];
            for (let r = 0; r < this._rows; r++) {
                const v = this._grid[r][c];
                if (v > 0) colVals.push({ row: r, val: v });
            }
            // 与 fall() 一致：colVals[i] 落位到 _rows - colVals.length + i（最底下的棋子落到底，上面的依次往上堆）
            const newRows: number[] = [];
            for (let i = 0; i < colVals.length; i++) {
                newRows.push(this._rows - colVals.length + i);
            }
            for (let i = 0; i < colVals.length; i++) {
                const fromRow = colVals[i].row;
                const toRow = newRows[i];
                if (fromRow !== toRow) {
                    moves.push({ col: c, fromRow, toRow, val: colVals[i].val });
                }
            }
        }
        return moves;
    }

    /** 下落：每列从下往上填充，空位留0 */
    fall(): void {
        for (let c = 0; c < this._cols; c++) {
            const colVals: number[] = [];
            for (let r = 0; r < this._rows; r++) {
                const v = this._grid[r][c];
                if (v > 0) colVals.push(v);
            }
            for (let r = this._rows - 1; r >= 0; r--) {
                const idx = this._rows - 1 - r;
                this._grid[r][c] = idx < colVals.length ? colVals[colVals.length - 1 - idx] : 0;
            }
        }
    }

    /** 空位填充：将0格子填入 startNumRange 内的随机数，返回被填充的位置 */
    fillEmpty(): { col: number; row: number }[] {
        const filled: { col: number; row: number }[] = [];
        const [minNum, maxNum] = this._startNumRange;
        const range = maxNum - minNum + 1;
        for (let r = 0; r < this._rows; r++) {
            for (let c = 0; c < this._cols; c++) {
                if (this._grid[r][c] === 0) {
                    this._grid[r][c] = minNum + Math.floor(Math.random() * range);
                    filled.push({ col: c, row: r });
                }
            }
        }
        return filled;
    }

    /** 执行一次合并检测与下落（同步，无动画），按左到右、下到上扫描 */
    processMerge(): { merged: boolean; maxNum: number } {
        let merged = false;
        let maxNum = 0;
        const toClear: { col: number; row: number }[] = [];
        const toMerge: { col: number; row: number; newVal: number }[] = [];
        const checked: boolean[][] = this._grid.map(r => r.map(() => false));

        // 扫描顺序：左到右(col 0..cols-1)，下到上(row rows-1..0)
        for (let r = this._rows - 1; r >= 0; r--) {
            for (let c = 0; c < this._cols; c++) {
                const v = this._grid[r][c];
                if (v <= 0 || checked[r][c]) continue;
                const group = this._findConnected(c, r, v);
                if (group.length >= 3) {
                    merged = true;
                    const newVal = Math.min(v + 1, 9);
                    maxNum = Math.max(maxNum, newVal);
                    const center = group[Math.floor(group.length / 2)];
                    for (const p of group) {
                        toClear.push(p);
                        checked[p.row][p.col] = true;
                    }
                    toMerge.push({ col: center.col, row: center.row, newVal });
                }
            }
        }

        for (const p of toClear) {
            this._grid[p.row][p.col] = 0;
        }
        for (const m of toMerge) {
            this._grid[m.row][m.col] = m.newVal;
        }

        if (merged) {
            this._bestNum = Math.max(this._bestNum, maxNum);
            this._chainCount++;
        }

        return { merged, maxNum };
    }

    /**
     * 执行完整合成轮：仅稳定时检查；左到右、下到上扫描；
     * 发现可合成则变为不稳定，执行合成+下落，恢复稳定后继续检查，直到无合成。
     */
    doFullMergeRound(): { maxNum: number } {
        if (!this._isStable) return { maxNum: 0 };

        let maxNum = 0;
        const maxRounds = 50; // 防止死循环
        for (let round = 0; round < maxRounds; round++) {
            const { merged, maxNum: m } = this.processMerge();
            maxNum = Math.max(maxNum, m);
            if (!merged) break;

            this._isStable = false;  // 发生合成，进入不稳定
            this.fall();             // 下落补全
            this._isStable = true;   // 合成结束，恢复稳定
        }
        return { maxNum };
    }

    /** 检查是否达到目标数字 */
    checkWin(targetNum: number): boolean {
        for (let r = 0; r < this._rows; r++) {
            for (let c = 0; c < this._cols; c++) {
                if (this._grid[r][c] >= targetNum) return true;
            }
        }
        return false;
    }

    /** 检查是否失败（步数用完且未达成目标） */
    checkLose(targetNum: number): boolean {
        return this._stepsRemain <= 0 && !this.checkWin(targetNum);
    }
}
