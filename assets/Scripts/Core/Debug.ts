import { Graphics, Rect, Node, Vec2 } from "cc";
import { GameDefine } from "./GameDefine";

/**
 * 调试工具类 (Debug)
 * 
 * 功能说明：
 * - 封装日志输出，支持不同级别的日志（log、info、warn、error）
 * - 根据 GameDefine.DebugLevel 控制日志输出
 * - 提供图形绘制工具，用于调试可视化
 * 
 * 日志级别：
 * - log: 调试信息（DebugLevel <= 0）
 * - info: 普通信息（DebugLevel <= 1）
 * - warn: 警告信息（DebugLevel <= 2）
 * - error: 错误信息（DebugLevel <= 3）
 * 
 * 使用示例：
 * ```typescript
 * Debug.log("调试信息");
 * Debug.info("普通信息");
 * Debug.warn("警告信息");
 * Debug.error("错误信息");
 * 
 * // 绘制调试图形
 * Debug.drawRect(node, rect);
 * ```
 */
export class Debug {
    /**
     * 格式化时间戳为可读格式
     * @returns 格式化的时间字符串 "HH:mm:ss.SSS"
     */
    private static _formatTime(): string {
        const now = new Date();
        const hours = this._padZero(now.getHours(), 2);
        const minutes = this._padZero(now.getMinutes(), 2);
        const seconds = this._padZero(now.getSeconds(), 2);
        const milliseconds = this._padZero(now.getMilliseconds(), 3);
        return `${hours}:${minutes}:${seconds}.${milliseconds}`;
    }

    /**
     * 补零工具方法
     * @param num 数字
     * @param length 目标长度
     * @returns 补零后的字符串
     */
    private static _padZero(num: number, length: number): string {
        let str = num.toString();
        while (str.length < length) {
            str = '0' + str;
        }
        return str;
    }

    static log(...params: any[]) {
        if (GameDefine.DebugLevel <= 0) {
            console.log(`[${this._formatTime()}] Debug:`, ...params);
        }
    }

    static info(...params: any[]) {
        if (GameDefine.DebugLevel <= 1) {
            console.info(`[${this._formatTime()}] Info:`, ...params);
        }
    }

    static warn(...params: any[]) {
        if (GameDefine.DebugLevel <= 2) {
            console.warn(`[${this._formatTime()}] Warn:`, ...params);
        }
    }

    static error(...params: any[]) {
        if (GameDefine.DebugLevel <= 3) {
            console.error(`[${this._formatTime()}] Error:`, ...params);
        }
    }


    public static drawFillRect(node: Node, rect: Rect): void {
        let g = node.addComponent(Graphics);
        g.fillColor.fromHEX('#ff0000');
        g.rect(rect.x, rect.y, rect.width, rect.height);
        g.fill();
    }

    public static drawRect(node: Node, rect: Rect): void {
        let g = node.addComponent(Graphics);
        g.lineWidth = 2;
        g.strokeColor.fromHEX('#ff0000');
        g.rect(rect.x, rect.y, rect.width, rect.height);
        g.stroke();
    }

    public static drawLine(node: Node): void {
        var g = node.addComponent(Graphics);
        g.lineWidth = 2;
        g.strokeColor.fromHEX('#ffffff');
        g.clear();
        g.moveTo(100, 100);
        g.lineTo(100, 200);
        g.lineTo(200, 200);
        g.stroke();
    }

    public static drawPolyGon(node: Node, points: Vec2[]): void {
        let tempNode = new Node();
        node.addChild(tempNode);
        let g = tempNode.addComponent(Graphics);
        g.lineWidth = 10;
        g.strokeColor.fromHEX("#ffffff")
        for (let i = 0; i < points.length; i++) {
            let p = points[i];
            if (i == 0) {
                g.moveTo(p.x, p.y);
            } else {
                g.lineTo(p.x, p.y);
            }
        }
        g.close();
        g.stroke();
    }

    public static drawBesize(node, startPos: Vec2, targetPos: Vec2, c1x: number, c1y: number, c2x: number, c2y: number) {
        let tempNode = new Node();
        node.addChild(tempNode);
        let g = tempNode.addComponent(Graphics);
        g.lineWidth = 10;
        g.strokeColor.fromHEX("#ffffff");
        g.moveTo(startPos.x, startPos.y);
        g.bezierCurveTo(c1x, c1y, c2x, c2y, targetPos.x, targetPos.y);
        g.stroke();
    };
}