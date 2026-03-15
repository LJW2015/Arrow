import { Node, Color, Component, Quat, Rect, Size, Vec2, Vec3, bezier, tween, v2, v3, view, misc, log } from "cc";
import { Debug } from "./Debug";
import { screen } from "cc";

/**
 * 工具类 (Utility)
 * 
 * 功能说明：
 * - 提供游戏开发中常用的工具方法
 * - 包含数据处理、数学计算、时间格式化、坐标转换等功能
 * 
 * 主要功能模块：
 * 1. 数据处理：对象/数组转换、深度拷贝、数据格式化等
 * 2. 数学计算：随机数、角度弧度转换、向量计算、贝塞尔曲线等
 * 3. 时间处理：时间格式化、日期计算、剩余时间计算等
 * 4. 坐标计算：坐标转换、距离计算、圆形/矩形随机点生成等
 * 5. 字符串处理：字符串长度、格式化、颜色转换等
 * 
 * 使用示例：
 * ```typescript
 * // 深度拷贝
 * let copy = Util.clone(original);
 * 
 * // 格式化金钱
 * let moneyStr = Util.formatMoney(10000); // "10K"
 * 
 * // 角度转弧度
 * let radian = Util.angle_to_radian(90);
 * 
 * // 生成随机点
 * let point = Util.getCircleRandPoint(100, centerPos);
 * ```
 */
export class Util extends Component {


    /**
     * 判断传入的参数是否为空的Object。数组或undefined会返回false
     * @param obj
     */
    public static isEmptyObject(obj: any) {
        let result: boolean = true;
        if (obj && obj.constructor === Object) {
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    result = false;
                    break;
                }
            }
        } else {
            result = false;
        }

        return result;
    }

    /**
     * 获取字符串长度
     * @param {string} render 
     * @returns 
     */
    public static getStringLength(render: string) {
        let strArr: string = render;
        let len: number = 0;
        for (let i: number = 0, n = strArr.length; i < n; i++) {
            let val: number = strArr.charCodeAt(i);
            if (val <= 255) {
                len = len + 1;
            } else {
                len = len + 2;
            }
        }

        return Math.ceil(len / 2);
    }

    /**
     * 从n个数中获取m个随机数
     * @param {Number} n   总数
     * @param {Number} m    获取数
     * @returns {Array} array   获取数列
     */
    public static getRandomNFromM(n: number, m: number) {
        let array: any[] = [];
        let intRd: number = 0;
        let count: number = 0;

        while (count < m) {
            if (count >= n + 1) {
                break;
            }

            intRd = this.getRandomInt(0, n);
            var flag = 0;
            for (var i = 0; i < count; i++) {
                if (array[i] === intRd) {
                    flag = 1;
                    break;
                }
            }

            if (flag === 0) {
                array[count] = intRd;
                count++;
            }
        }

        return array;
    }

    /**
     * 获取随机整数
     * @param {Number} min 最小值
     * @param {Number} max 最大值
     * @returns 
     */
    public static getRandomInt(min: number, max: number) {
        let r: number = Math.random();
        let rr: number = r * (max - min + 1) + min;
        return Math.floor(rr);
    }

    /**
     * 将数组转化为object。
     * @param { any} srcObj 
     * @param { string} objectKey 
     * @returns 
     */
    public static arrayToObject(srcObj: any, objectKey: string) {

        let resultObj: { [key: string]: any } = {};

        // to object
        for (var key in srcObj) {
            if (!srcObj.hasOwnProperty(key) || !srcObj[key][objectKey]) {
                continue;
            }

            resultObj[srcObj[key][objectKey]] = srcObj[key];
        }


    }

    /**
     * 深度拷贝
     * @param {any} sObj 拷贝的对象
     * @returns 
     */
    public static clone(sObj: any) {
        if (sObj === null || typeof sObj !== "object") {
            return sObj;
        }

        let s: { [key: string]: any } = {};
        if (sObj.constructor === Array) {
            s = [];
        }

        for (let i in sObj) {
            if (sObj.hasOwnProperty(i)) {
                s[i] = this.clone(sObj[i]);
            }
        }

        return s;
    }

    /**
   * 将object转化为数组
   * @param { any} srcObj  
   * @returns 
   */
    public static objectToArray(srcObj: { [key: string]: any }) {

        let resultArr: any[] = [];

        // to array
        for (let key in srcObj) {
            if (!srcObj.hasOwnProperty(key)) {
                continue;
            }

            resultArr.push(srcObj[key]);
        }

        return resultArr;
    }

    /**
   * 格式化钱数，超过10000 转换位 10K   10000K 转换为 10M
   * @param {number}money 需要被格式化的数值
   * @returns {string}返回 被格式化的数值
   */
    public static formatMoney(money: number) {
        let arrUnit: string[] = ['', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y', 'B', 'N', 'D'];

        let strValue: string = '';
        for (let idx: number = 0; idx < arrUnit.length; idx++) {
            if (money >= 10000) {
                money /= 1000;
            } else {
                strValue = Math.floor(money) + arrUnit[idx];
                break;
            }
        }

        if (strValue === '') {
            strValue = Math.floor(money) + 'U'; //超过最大值就加个U
        }

        return strValue;
    }

    /**
    * 格式化钱数，超过10000 转换位 10K   10000K 转换为 10M
    * @param {number}money 需要被格式化的数值
    * @returns {string}返回 被格式化的数值
    */
    public static newFormatMoney(money: number) {
        if (money < 10000) {
            return money.toString();
        }
        let arrUnit: string[] = ['', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y', 'B', 'N', 'D'];
        let strValue: string = '';
        for (let idx: number = 0; idx < arrUnit.length; idx++) {
            if (money >= 10000) {
                money /= 1000;
            } else {
                strValue = money.toFixed(1) + arrUnit[idx];
                break;
            }
        }

        if (strValue === '') {
            strValue = Math.floor(money) + 'U'; //超过最大值就加个U
        }

        return strValue;
    }

    /**
    * 判断是否是新的一天
    * @param {Object|Number} dateValue 时间对象 todo MessageCenter 与 pve 相关的时间存储建议改为 Date 类型
    * @returns {boolean}
    */
    public static isNewDay(dateValue: any) {
        // todo：是否需要判断时区？
        var oldDate: any = new Date(dateValue);
        var curDate: any = new Date();

        var oldYear = oldDate.getYear();
        var oldMonth = oldDate.getMonth();
        var oldDay = oldDate.getDate();
        var curYear = curDate.getYear();
        var curMonth = curDate.getMonth();
        var curDay = curDate.getDate();

        if (curYear > oldYear) {
            return true;
        } else {
            if (curMonth > oldMonth) {
                return true;
            } else {
                if (curDay > oldDay) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * 获取对象属性数量
     * @param {object} 对象
     * @returns 
     */
    public static getPropertyCount(o: Object) {
        var n, count = 0;
        for (n in o) {
            if (o.hasOwnProperty(n)) {
                count++;
            }
        }
        return count;
    }

    /**
     * 返回一个差异化数组（将array中diff里的值去掉）
     * @param array
     * @param diff
     */
    public static difference(array: [], diff: any) {
        let result: any[] = [];
        if (array.constructor !== Array || diff.constructor !== Array) {
            return result;
        }

        let length = array.length;
        for (let i: number = 0; i < length; i++) {
            if (diff.indexOf(array[i]) === -1) {
                result.push(array[i]);
            }
        }

        return result;
    }

    public static trim(str: string) {
        return str.replace(/(^\s*)|(\s*$)/g, "");
    }

    public static format(s: string, params: string) {
        s = s.replace(new RegExp('\\{' + 0 + '\\}', 'gm'), params);
        return s;
    }

    public static format1(s: string, params: Array<string>) {
        var i = params.length;
        while (i--) {
            s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), params[i]);
        }
        return s;
    }

    /**
     * 判断当前时间是否在有效时间内
     * @param {String|Number} start 起始时间。带有时区信息
     * @param {String|Number} end 结束时间。带有时区信息
     */
    public static isNowValid(start: any, end: any) {
        var startTime = new Date(start);
        var endTime = new Date(end);
        var result = false;

        if (startTime.getDate() + '' !== 'NaN' && endTime.getDate() + '' !== 'NaN') {
            var curDate = new Date();
            result = curDate < endTime && curDate > startTime;
        }

        return result;
    }

    /**
     * 返回相隔天数
     * @param start 
     * @param end 
     * @returns 
     */
    public static getDeltaDays(start: any, end: any) {
        start = new Date(start);
        end = new Date(end);

        let startYear: number = start.getFullYear();
        let startMonth: number = start.getMonth() + 1;
        let startDate: number = start.getDate();
        let endYear: number = end.getFullYear();
        let endMonth: number = end.getMonth() + 1;
        let endDate: number = end.getDate();

        start = new Date(startYear + '/' + startMonth + '/' + startDate + ' GMT+0800').getTime();
        end = new Date(endYear + '/' + endMonth + '/' + endDate + ' GMT+0800').getTime();

        let deltaTime = end - start;
        return Math.floor(deltaTime / (24 * 60 * 60 * 1000));
    }

    /**
     * 获取数组最小值
     * @param array 数组
     * @returns 
     */
    public static getMin(array: number[]) {
        let result: number = null!;
        if (array.constructor === Array) {
            let length = array.length;
            for (let i = 0; i < length; i++) {
                if (i === 0) {
                    result = Number(array[0]);
                } else {
                    result = result > Number(array[i]) ? Number(array[i]) : result;
                }
            }
        }

        return result;
    }

    /**
     * 格式化两位小数点
     * @param time 
     * @returns 
     */
    public static formatTwoDigits(time: number) {
        //@ts-ignore
        return (Array(2).join(0) + time).slice(-2);
    }

    /**
     * 获取格式化后的日期（不含小时分秒）
     */
    public static getDay() {
        let date: Date = new Date();

        return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
    }

    /**
    * 获取格式化后的日期（不含小时分秒）
    */
    public static formatDate(time: number) {
        let date: Date = new Date(time);

        return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
    }



    /**
     *  根据剩余毫秒数格式化剩余时间 返回 HH:MM:SS
     *
     * @param {Number} ms
     */
    public static formatTimeForMillisecond(ms: number): Object {
        let second: number = Math.floor(ms / 1000 % 60);
        let minute: number = Math.floor(ms / 1000 / 60 % 60);
        let hour: number = Math.floor(ms / 1000 / 60 / 60);
        return { 'hour': hour, 'minute': minute, 'second': second };
    }


    /**
     * 将数组内容进行随机排列
     * @param {Array}arr 需要被随机的数组 
     * @returns 
     */
    public static rand(arr: any[]): [] {
        let arrClone = this.clone(arr);
        // 首先从最大的数开始遍历，之后递减
        for (let i: number = arrClone.length - 1; i >= 0; i--) {
            // 随机索引值randomIndex是从0-arrClone.length中随机抽取的
            const randomIndex: number = Math.floor(Math.random() * (i + 1));
            // 下面三句相当于把从数组中随机抽取到的值与当前遍历的值互换位置
            const itemIndex: number = arrClone[randomIndex];
            arrClone[randomIndex] = arrClone[i];
            arrClone[i] = itemIndex;
        }
        // 每一次的遍历都相当于把从数组中随机抽取（不重复）的一个元素放到数组的最后面（索引顺序为：len-1,len-2,len-3......0）
        return arrClone;
    }


    /**
    * 获得开始和结束两者之间相隔分钟数
    *
    * @static
    * @param {number} start
    * @param {number} end
    * @memberof Util
    */
    public static getOffsetMimutes(start: number, end: number) {
        let offSetTime: number = end - start;
        let minute: number = Math.floor((offSetTime % (1000 * 60 * 60)) / (1000 * 60));
        return minute;
    }

    /**
     * 返回指定小数位的数值
     * @param {number} num 
     * @param {number} idx 
     */
    public static formatNumToFixed(num: number, idx: number = 0) {
        return Number(num.toFixed(idx));
    }

    /** 返回当天剩余时间 */
    public static dayRemainingTime(): string[] {
        let h: string = "";
        let m: string = "";
        let s: string = "";
        let curMilliseconds = new Date().getTime();
        let milliseconds = new Date(new Date().toLocaleDateString()).getTime() + 24 * 60 * 60 * 1000;
        let diff = milliseconds - curMilliseconds;
        let second: number = Math.floor(diff / 1000 % 60);
        if (second >= 10) {
            s = second.toString();
        } else {
            s = "0" + second;
        }
        let minute: number = Math.floor(diff / 1000 / 60 % 60);
        if (minute >= 10) {
            m = minute.toString();
        } else {
            m = "0" + minute;
        }
        let hour: number = Math.floor(diff / 1000 / 60 / 60);
        if (hour >= 10) {
            h = hour.toString();
        } else {
            h = "0" + hour;
        }
        return [h, m, s];
    }

    /**
     * 用于数值到达另外一个目标数值之间进行平滑过渡运动效果
     * @param {number} targetValue 目标数值 
     * @param {number} curValue 当前数值
     * @param {number} ratio    过渡比率
     * @returns 
     */
    public static lerp(targetValue: number, curValue: number, ratio: number = 0.25) {
        let v: number = curValue;
        if (targetValue > curValue) {
            v = curValue + (targetValue - curValue) * ratio;
        } else if (targetValue < curValue) {
            v = curValue - (curValue - targetValue) * ratio;
        }

        return v;
    }

    /**
     * base64转buffer
     * @param base64 
     * @returns 
     */
    static base64ToArrayBuffer(base64: any): any {
        var arr = base64.split(",");
        var binaryString = atob(base64)
        var len = binaryString.length
        var bytes = new Uint8Array(len)
        for (let index = 0; index < len; index++) {
            bytes[index] = binaryString.charCodeAt(index)

        }
        return bytes.buffer
    }

    // uint8array转为base64字符串
    static uint8arrayToBase64(u8Arr) {
        let CHUNK_SIZE = 0x8000; //arbitrary number
        let index = 0;
        let length = u8Arr.length;
        let result = '';
        let slice;
        while (index < length) {
            slice = u8Arr.subarray(index, Math.min(index + CHUNK_SIZE, length));
            result += String.fromCharCode.apply(null, slice);
            index += CHUNK_SIZE;
        }
        // web image base64图片格式: "data:image/png;base64," + b64encoded;
        // return  "data:image/png;base64," + btoa(result);
        return btoa(result);
    }
    // base64字符串转为uint8array数组
    static base64ToUint8Array(base64String) {
        let padding = '='.repeat((4 - base64String.length % 4) % 4);
        let base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
        let rawData = window.atob(base64);
        let outputArray = new Uint8Array(rawData.length);
        for (var i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }


    /**
     * buffer转base64
     * @param buffer 
     * @returns 
     */
    static arrayBufferToBase64(buffer: any) {
        var binary = '';
        var bytes = new Uint8Array(buffer);
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    /**
     * 计算两个节点的xz坐标的弧度
     * @param x1 
     * @param z1 
     * @param x2 
     * @param z2 
     * @returns 
     */
    public static checkTwoPosEulRad(x1: number, z1: number, x2: number, z2: number) {
        return Math.atan2(x1 - x2, z1 - z2);
    }

    /**
    * 获取两个坐标在xz轴的距离
    * @param x1 
    * @param z1 
    * @param x2 
    * @param z2 
    * @returns 
    */
    public static getTwoPosXZLength(x1: number, z1: number, x2: number, z2: number) {
        const x = x1 - x2;
        const z = z1 - z2;
        return Math.sqrt(x * x + z * z);
    }

    /**
     * 将当前的string型 转化为vec3类型数据
     * @param dataString string
     * @returns Vec3
     */
    public static setStringToVec3(dataString: string) {
        const data = dataString.split(',');
        return new Vec3(Number(data[0]), Number(data[1]), Number(data[2]));
    }

    /**
     * 将当前的string型 转化为Quat类型数据
     * @param dataString string
     * @returns Quat
     */
    public static setStringToQuate(dataString: string) {
        const data = dataString.split(',');
        return new Quat(Number(data[0]), Number(data[1]), Number(data[2]), Number(data[3]));
    }

    /**
     * 获取给定范围内随机值
     * @param num 0-n的n的具体数值
     * @param isIncludeMinus 是否包含负数
     * @returns 
     */
    public static getRandomRange(num: number, isIncludeMinus?: boolean) {
        if (isIncludeMinus) {
            return (Math.random() > 0.5 ? 1 : -1) * Math.random() * num;
        }
        return Math.random() * num;
    }

    /**
    * 获得一定角度一定距离的坐标X
    * @param distance 
    * @param eulRad 
    * @returns 
    */
    public static getDirectionOfDistanceX(distance: number, eulRad: number) {
        return distance * Math.sin(eulRad);
    }

    /**
     * 获得一定角度一定距离的坐标Z
     * @param distance 
     * @param eulRad 
     * @returns 
     */
    public static getDirectionOfDistanceZ(distance: number, eulRad: number) {
        return distance * Math.cos(eulRad);
    }

    /* 角度转弧度 */
    public static angle_to_radian(angle: number): number {
        // 角度转弧度公式
        // π / 180 * 角度

        // 计算出弧度
        let radian = Math.PI / 180 * angle;
        // 返回弧度
        return (radian);
    }


    /* 弧度转角度 */
    public static radian_to_angle(radian: number): number {
        // 弧度转角度公式
        // 180 / π * 弧度

        // 计算出角度
        let angle = 180 / Math.PI * radian;
        // 返回弧度
        return (angle);
    }


    /* 角度转向量   */
    public static angle_to_vector(angle: number): Vec2 {
        // tan = sin / cos
        // 将传入的角度转为弧度
        let radian = this.angle_to_radian(angle);
        // 算出cos,sin和tan
        let cos = Math.cos(radian);// 邻边 / 斜边
        let sin = Math.sin(radian);// 对边 / 斜边
        let tan = sin / cos;// 对边 / 邻边
        // 结合在一起并归一化
        let vec = new Vec2(cos, sin).normalize();
        // 返回向量
        return (vec);
    }


    /* 向量转角度 */
    public static vector_to_angle(vector: Vec2): number {
        if (vector.x == 0 && vector.y == 0) {
            return null;
        }
        // 将传入的向量归一化
        let dir = v2(vector.x, vector.y).normalize();
        // 计算出目标角度的弧度
        let radian = dir.signAngle(new Vec2(1, 0));
        // 把弧度计算成角度
        let angle = -this.radian_to_angle(radian);
        // 返回角度
        return (angle);
    }

    /* 根据剩余秒数格式化剩余时间 返回 HH:MM:SS */
    public static timeToString(time: any) {
        let h = Math.floor(time / 3600) < 10 ? '0' + Math.floor(time / 3600) : Math.floor(time / 3600);
        let m = Math.floor((time / 60 % 60)) < 10 ? '0' + Math.floor((time / 60 % 60)) : Math.floor((time / 60 % 60));
        let s = Math.floor((time % 60)) < 10 ? '0' + Math.floor((time % 60)) : Math.floor((time % 60));

        let res = '';
        if (h != '00') {
            res = `${h}:${m}:${s}`;
            return res;
        }
        else {
            res = `${m}:${s}`;
            return res;
        }
    }

    /* 根据剩余秒数格式化剩余时间 返回 HH时MM分SS秒 */
    public static timeToStrings(time: any) {
        let h = Math.floor(time / 3600) < 10 ? '0' + Math.floor(time / 3600) : Math.floor(time / 3600);
        let m = Math.floor((time / 60 % 60)) < 10 ? '0' + Math.floor((time / 60 % 60)) : Math.floor((time / 60 % 60));
        let s = Math.floor((time % 60)) < 10 ? '0' + Math.floor((time % 60)) : Math.floor((time % 60));

        let res = '';
        res = `${h}:${m}:${s}`;
        return res;
    }

    /* 根据剩余秒数格式化剩余时间 返回 HH时MM分SS秒 */
    public static getTimeToString(time: any) {
        let h = Math.floor(time / 3600) < 10 ? '0' + Math.floor(time / 3600) : Math.floor(time / 3600);
        let m = Math.floor((time / 60 % 60)) < 10 ? '0' + Math.floor((time / 60 % 60)) : Math.floor((time / 60 % 60));
        let s = Math.floor((time % 60)) < 10 ? '0' + Math.floor((time % 60)) : Math.floor((time % 60));

        let res = '';
        if (h != '00') {
            res = `${h}时${m}分`;
            return res;
        }
        else if (m != '00') {
            res = `${m}分${s}秒`;
            return res;
        }
        else {
            res = `${s}秒`;
            return res;
        }
    }

    /* 获取今日剩余时间 返回剩余秒数 */
    public static getTodayRemainingtime() {
        let startTime: any = new Date().getTime();
        let endTime: any = new Date(new Date().toLocaleDateString()).getTime();
        let days = (endTime - startTime) / 1000 / 3600 / 24;
        let day = Math.floor(days);
        let hours = (days - day) * 24;
        let hour: any = Math.floor(hours);
        let minutes = (hours - hour) * 60;
        let minute: any = Math.floor(minutes);
        let seconds = (minutes - minute) * 60;
        let second: any = Math.floor(seconds);
        if (hour > 0) {
            hour = hour < 10 ? '0' + hour : hour;
            minute = minute < 10 ? '0' + minute : minute;
            second = second < 10 ? '0' + second : second;
            return `${hour}:${minute}:${second}:`;
        }
        else {
            minute = minute < 10 ? '0' + minute : minute;
            second = second < 10 ? '0' + second : second;
            return `${minute}:${second}:`;
        }

    }

    /* 获取当前月的天数 */
    public static getMonthDay() {
        var date = new Date();
        var year = date.getFullYear();
        var month = date.getMonth() + 1;
        var d = new Date(year, month, 0);
        return d.getDate();
    }

    public static getMonth() {
        var date = new Date();
        var month = date.getMonth() + 1;
        return month;
    }

    public static stringToColor(colorStr: string) {
        const s = colorStr.startsWith('#') ? colorStr.slice(1) : colorStr;
        const r = this.hex2int(s[0], 16) + this.hex2int(s[1], 1);
        const g = this.hex2int(s[2], 16) + this.hex2int(s[3], 1);
        const b = this.hex2int(s[4], 16) + this.hex2int(s[5], 1);
        return new Color(r, g, b, 255);
    }

    public static hex2int(hex: string, digit: number) {
        let code = hex.charCodeAt(0);
        if (48 <= code && code < 58) {
            code -= 48;
        } else {
            code = (code & 0xdf) - 65 + 10;
        }
        return code * digit;
    }

    /**
     * 根据时间戳获取具体的时间
     * @param time  秒
     */
    public static getDateDetail(time: number) {
        let date = new Date(time * 1000);
        let n = date.toLocaleString();
        return n;
    }

    public static parseTimeTwo(time: number) {
        if (time) {
            let date = new Date(time * 1000);
            let year = date.getFullYear()
            /* 在日期格式中，月份是从0开始的，因此要加0
             * 使用三元表达式在小于10的前面加0，以达到格式统一  如 09:11:05
             * */
            let month = date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1
            let day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate()
            let hours = date.getHours() < 10 ? '0' + date.getHours() : date.getHours()
            let minutes = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()
            // 拼接
            return year + '年' + month + '月' + day + '日 ' + hours + ':' + minutes
        } else {
            return ''
        }
    }

    /**
     * 获取圆内随机点
     * @param r 
     * @param pos 
     */
    public static getCircleRandPoint(r: number, pos: Vec2) {
        let x = pos.x + (Math.random() - 0.5) * 2 * r;
        let y = pos.y + (Math.random() - 0.5) * 2 * r;
        return new Vec2(x, y);
    }


    /**
   * 以某点为圆心，生成圆周上等分点的坐标
   *
   * @param {number} r 半径
   * @param {Vec2} pos 圆心坐标
   * @param {number} count 等分点数量
   * @param {number} [randomScope=80] 等分点的随机波动范围
   * @returns {Vec2[]} 返回等分点坐标
   */
    public static getCirclePoints(r: number, pos: Vec2, count: number, randomScope: number = 60, dir = 1): Vec2[] {
        let points = [];
        let radians = dir * (Math.PI / 180) * Math.round(360 / count);
        for (let i = 0; i < count; i++) {
            let x = pos.x + r * Math.sin(radians * i);
            let y = pos.y + r * Math.cos(radians * i);
            points.unshift(new Vec2(x + Math.random() * randomScope, y + Math.random() * randomScope));
        }
        return points;
    }

    /**
  * 以某点为圆心，生成圆周上等分点的坐标
  *
  * @param {number} r 半径
  * @param {Vec2} pos 圆心坐标
  * @param {number} count 等分点数量
  * @param {number} [randomScope=80] 等分点的随机波动范围
  * @returns {Vec2[]} 返回等分点坐标
  */
    public static getCircleRandomPoints(r: number, pos: Vec3, count: number, randomScope: number = 60): Vec3[] {
        let points = [];
        let radians = (Math.PI / 180) * Math.round(360 / count);
        let offerR = Math.random() * Math.PI;
        for (let i = 0; i < count; i++) {
            let x = pos.x + r * Math.sin(radians * i + offerR);
            let y = pos.y + r * Math.cos(radians * i + offerR);
            points.unshift(new Vec3(x + Math.random() * randomScope, y + Math.random() * randomScope, 0));
        }
        return points;
    }

    /**
     * 通过半径和角度获取坐标
     * @param r 
     * @param pos 
     * @param angle 
     * @returns 
     */
    public static getCirclePos(r: number, pos: Vec3, angle: number) {
        let radians = (Math.PI / 180) * angle;
        let x = pos.y + r * Math.cos(radians);
        let y = pos.x + r * Math.sin(radians);
        return new Vec3(x, y, 0);

    }

    /**
     * 获取上下随机坐标
     * @param r 
     * @param pos 
     * @param count 
     * @param randomScope 
     * @returns 
     */
    public static getUpDownRandomPoints(r: number, pos: Vec3, count: number, randomScope: number = 300): Array<Vec3> {
        let points = [];
        for (let i = 0; i < count; i++) {
            let dir = Math.floor(Math.random() * 100) <= 50 ? 1 : -1;
            let x = (Math.random() - 0.5) * 2 * randomScope;
            let y = pos.y + (r + Math.random() * 60) * dir;
            points.unshift(new Vec3(x, y, 0));
        }
        return points;
    }

    /**
     * 固定方形小地图刷怪
     * @param r 
     * @param pos 
     * @param count 
     * @param limtMoveWidth 
     * @param limtMoveHeight 
     * @returns 
     */
    public static getLeftRightRectRandomPoints1(r: number, pos: Vec3, count: number, limtMoveWidth: number, limtMoveHeight: number, randomScope: number = 20): Array<Vec3> {
        let points = [];
        if (limtMoveWidth > limtMoveHeight) {
            r = limtMoveHeight / 2 - randomScope;
        }
        else {
            r = limtMoveWidth / 2 - randomScope;
        }
        r = limtMoveWidth / 2 - randomScope;
        let radians = (Math.PI / 180) * Math.round(360 / count);
        let offerR = Math.random() * Math.PI;
        let rec = new Rect(-limtMoveWidth / 2, -limtMoveHeight / 2, limtMoveWidth, limtMoveHeight);
        let index = 0;
        for (let i = 0; i < count; i++) {
            let x = pos.x + r * Math.sin(radians * i + offerR);
            let y = pos.y + r * Math.cos(radians * i + offerR);
            //判断当前坐标是否在方形内内
            let newPos = new Vec2(x + Math.random() * randomScope, y + Math.random() * randomScope);
            if (rec.contains(newPos)) {
                points.unshift(new Vec3(newPos.x, newPos.y, 0));
            }
            else {
                if (points.length) {
                    //存在 从现有的点取
                    index = Math.floor(Math.random() * points.length);
                    let copyPos = this.clone(points[index]);
                    let randPos = new Vec3(copyPos.x + (Math.random() - 0.5) * 2 * 20, copyPos.y + (Math.random() - 0.5) * 2 * 20, 0);
                    points.unshift(randPos);
                }
                else {
                    //方形内随机取随机取
                    r = limtMoveHeight / 2 - randomScope;
                    let newPosArr = this.getCircleRandomPoints(r, new Vec3(0, 0, 0), 10, 20);
                    index = Math.floor(Math.random() * newPosArr.length);
                    points.unshift(newPosArr[index]);
                }
            }
        }
        return points;
    }


    public static uuid() {
        var s = [];
        var hexDigits = "0123456789abcdef";
        for (var i = 0; i < 36; i++) {
            s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
        }
        s[14] = "4"; // bits 12-15 of the time_hi_and_version field to 0010
        s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1); // bits 6-7 of the clock_seq_hi_and_reserved to 01
        s[8] = s[13] = s[18] = s[23] = "-";

        var uuid = s.join("");
        return uuid;
    }


    /**
 * 生成一个用不重复的ID
 * @param { Number } randomLength
 */
    public static getUuid(randomLength: number) {
        return Number(Math.random().toString().substr(2, randomLength) + Date.now()).toString(36)
    }

    /** 获取指定月份天数 */
    public static getMonthDays(year: number, month: number): number {
        let date = new Date(year, month, 0);
        return date.getDate();
    }

    /** 获取指定月份第一天时间戳 */
    public static getMonthDayMilliseconds(year: number, month: number): number {
        let date = new Date(year, month, 1);
        return date.getTime();
    }

    public static getDayHour(time: number) {
        let date = new Date(time);
        let day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
        let hours = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
        let minutes = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
        // 拼接
        return day + '天' + hours + '时';
    }

    public static getWinSize(): Size {
        return screen.windowSize;
        return view.getVisibleSize();
    }

    public static getBezierPoint(begin: Vec2, ctrl1: Vec2, ctrl2: Vec2, end: Vec2, t: number): Vec2 {
        const x = begin.x * (1 - t) * (1 - t) * (1 - t) + 3 * ctrl1.x * t * (1 - t) * (1 - t) + 3 * ctrl2.x * t * t * (1 - t) + end.x * t * t * t;
        const y = begin.y * (1 - t) * (1 - t) * (1 - t) + 3 * ctrl1.y * t * (1 - t) * (1 - t) + 3 * ctrl2.y * t * t * (1 - t) + end.y * t * t * t;
        return v2(x, y);
    }

    /**
 *  二阶贝塞尔曲线 运动
 * @param target
 * @param {number} duration
 * @param {} c1 起点坐标
 * @param {} c2 控制点
 * @param {Vec3} to 终点坐标
 * @param opts
 * @returns {any}
 * TweenUtils.bezierTo(this.spNode,2,v2(-200,-200),v2(200,0),v3(350,400,0),null).start()
 */
    public static bezierTo(target: any, duration: number, c1: Vec2, c2: Vec2, to: Vec3, opts: any) {
        opts = opts || Object.create(null);
        /**
         * @desc 二阶贝塞尔
         * @param {number} t 当前百分比
         * @param {} p1 起点坐标
         * @param {} cp 控制点
         * @param {} p2 终点坐标
         * @returns {any}
         */
        let twoBezier = (t: number, p1: Vec2, cp: Vec2, p2: Vec3) => {
            let x = (1 - t) * (1 - t) * p1.x + 2 * t * (1 - t) * cp.x + t * t * p2.x;
            let y = (1 - t) * (1 - t) * p1.y + 2 * t * (1 - t) * cp.y + t * t * p2.y;
            return v3(x, y, 0);
        };
        opts.onUpdate = (arg: Vec3, ratio: number) => {
            target.position = twoBezier(ratio, c1, c2, to);
        };
        return tween(target).to(duration, {}, opts);
    }

    /* 贝塞尔曲线运动 */
    public static playTargetTween(target: Node, playTime: number, targetPos: Vec2) {
        return new Promise((resolve, reject) => {
            var startPos = target.position;
            var startAngle = target.eulerAngles;
            var targetTween = tween(startPos);
            let c1 = new Vec2();
            const mixY = 100;
            const maxY = 200;
            const mixX = 100;
            const maxX = 200;
            var progressX = function (start, end, current, t) {
                //@ts-ignore
                current = bezier(start, mixX, maxX, end, t);
                return current;
            };
            var progressY = function (start, end, current, t) {
                //@ts-ignore
                current = bezier(start, mixY, maxY, end, t);
                return current;
            };

            targetTween.parallel(
                tween().to(playTime, { x: -target.position.x }, {
                    progress: progressX, easing: "smooth", onUpdate: () => {
                        target.setPosition(startPos);
                    }
                }),
                tween().to(playTime, { y: 0 }, {
                    progress: progressY, easing: "smooth", onUpdate: () => {
                        target.setPosition(startPos);
                    }
                }),
            ).start();
            tween(startAngle).to(playTime, { z: 360 }, {
                onUpdate: () => {
                    target.eulerAngles = startAngle;
                }
            }).call(() => {
                resolve(1);
            }).start();
        })
    }

    /**
     * 贝塞尔曲线 
     * Util.targetBezier(this.node, startPos, targetPos, 1, 0, 0.72, 0.1, 1).then(() => {
             PoolManager.instance.putNode(this.node);
         });
     * @param target 
     * @param startPos 
     * @param targetPos 
     * @param time 
     * @param px1 
     * @param py1 
     * @param px2 
     * @param py2 
     * @returns 
     */
    public static targetBezier(target: Node, startPos: Vec2, targetPos: Vec2, time: number, px1: number, py1: number, px2: number, py2: number) {
        return new Promise((resolve, reject) => {
            let tweenObj = { t: 0 };
            let prePos = new Vec2(startPos.x, startPos.y);
            tween(tweenObj).to(time, { t: 1 }, {
                onUpdate: (tar, t) => {
                    const p0 = v2(0, 0);
                    const p1 = v2(px1, py1);
                    const p2 = v2(px2, py2);
                    const p3 = v2(1, 1);
                    const x = p0.x * (1 - t) * (1 - t) * (1 - t) + 3 * p1.x * t * (1 - t) * (1 - t) + 3 * p2.x * t * t * (1 - t) + p3.x * t * t * t;
                    const y = p0.y * (1 - t) * (1 - t) * (1 - t) + 3 * p1.y * t * (1 - t) * (1 - t) + 3 * p2.y * t * t * (1 - t) + p3.y * t * t * t;
                    let posx = (targetPos.x - startPos.x) * x + startPos.x;
                    let posy = (targetPos.y - startPos.y) * y + startPos.y;
                    let curPos = new Vec2(posx, posy);
                    target.setPosition(posx, posy);
                    let vector = new Vec2();
                    Vec2.subtract(vector, curPos, prePos);
                    let r = vector.signAngle(v2(0, 1));
                    let angle = misc.radiansToDegrees(r);
                    target.angle = -angle;
                    prePos = curPos.clone();
                }
            }).call(() => {
                resolve(1);
            }).start();
        })
    }

    /**
     * 贝塞尔加缩放
     * @param tweenObj 
     * @param target 
     * @param startPos 
     * @param targetPos 
     * @param time 
     * @param scale 
     * @param px1 
     * @param py1 
     * @param px2 
     * @param py2 
     * @returns 
     */
    public static targetScaleBezier(tweenObj: any, target: Node, startPos: Vec3, targetPos: Vec3, time: number, scale: number, px1: number, py1: number, px2: number, py2: number) {
        return new Promise((resolve, reject) => {
            let t1 = tween(tweenObj).to(time, { t: 1 }, {
                onUpdate: (tar, t) => {
                    const p0 = v2(0, 0);
                    const p1 = v2(px1, py1);
                    const p2 = v2(px2, py2);
                    const p3 = v2(1, 1);
                    const x = p0.x * (1 - t) * (1 - t) * (1 - t) + 3 * p1.x * t * (1 - t) * (1 - t) + 3 * p2.x * t * t * (1 - t) + p3.x * t * t * t;
                    const y = p0.y * (1 - t) * (1 - t) * (1 - t) + 3 * p1.y * t * (1 - t) * (1 - t) + 3 * p2.y * t * t * (1 - t) + p3.y * t * t * t;
                    let posx = (targetPos.x - startPos.x) * x + startPos.x;
                    let posy = (targetPos.y - startPos.y) * y + startPos.y;
                    target.setPosition(posx, posy);
                }
            });
            let t2 = tween(tweenObj).to(time, { scale: scale }, {
                onUpdate: (tar: any, t) => {
                    target.setScale(tar.scale, tar.scale, tar.scale);
                }
            });
            tween(tweenObj).parallel(t1, t2).call(() => {
                resolve(1);
            }).start();
        })

    }

    // 根据 传入 C 值，计算该C值下，最小暴击范围的平均暴击率
    private static PFromC(c: number): number {
        let dCurP: number = 0;
        let dPreSuccessP: number = 0;
        let dPE: number = 0;
        let nMaxFail = Math.ceil(1 / c);
        for (let i = 1; i <= nMaxFail; ++i) {
            dCurP = Math.min(1, i * c) * (1 - dPreSuccessP);
            dPreSuccessP += dCurP;
            dPE += i * dCurP;
        }
        return 1 / dPE;
    }

    // 根据传入的暴击率，计算 PRD 算法中的系数 C
    public static CFromP(p: number): number {
        let dUp: number = p;
        let dLow: number = 0;
        let dMid: number = p;
        let dPLast: number = 1;
        while (true) {
            dMid = (dUp + dLow) / 2;
            let dPtested: number = this.PFromC(dMid);

            if (Math.abs(dPtested - dPLast) <= 0.00005) break;

            if (dPtested > p) dUp = dMid;
            else dLow = dMid;

            dPLast = dPtested;
        }

        return dMid;
    }

    /* 计算两线段的交点坐标 */
    public static segmentsIntr(a, b, c, d) {

        // 三角形abc 面积的2倍 
        var area_abc = (a.x - c.x) * (b.y - c.y) - (a.y - c.y) * (b.x - c.x);

        // 三角形abd 面积的2倍 
        var area_abd = (a.x - d.x) * (b.y - d.y) - (a.y - d.y) * (b.x - d.x);

        // 面积符号相同则两点在线段同侧,不相交 (对点在线段上的情况,本例当作不相交处理); 
        if (area_abc * area_abd >= 0) {
            return false;
        }

        // 三角形cda 面积的2倍 
        var area_cda = (c.x - a.x) * (d.y - a.y) - (c.y - a.y) * (d.x - a.x);
        // 三角形cdb 面积的2倍 
        // 注意: 这里有一个小优化.不需要再用公式计算面积,而是通过已知的三个面积加减得出. 
        var area_cdb = area_cda + area_abc - area_abd;
        if (area_cda * area_cdb >= 0) {
            return false;
        }

        //计算交点坐标 
        var t = area_cda / (area_abd - area_abc);
        var dx = t * (b.x - a.x),
            dy = t * (b.y - a.y);
        return v2(a.x + dx, a.y + dy);
    }



    /* 贝塞尔曲线分线段数量 */
    public static bezier_length(start_point, ctrl1, ctrl2, end_point, count: number = 20) {
        var prev_point = start_point;

        var length = 0;

        var t = 0.05;
        for (var i = 0; i < 20; i++) {
            var x = start_point.x * (1 - t) * (1 - t) * (1 - t) + 3 * ctrl1.x * t * (1 - t) * (1 - t) + 3 * ctrl2.x * t * t * (1 - t) + end_point.x * t * t * t;

            var y = start_point.y * (1 - t) * (1 - t) * (1 - t) + 3 * ctrl1.y * t * (1 - t) * (1 - t) + 3 * ctrl2.y * t * t * (1 - t) + end_point.y * t * t * t;

            var now_point = new Vec2(x, y);

            var dir = now_point.subtract(prev_point);

            prev_point = now_point;

            length += dir.length();

            t += 0.05;

        }

        return length;

    }


    /**
     * @param weights 权重数组 随机一个
     * @returns 
     */
    static weightRandomIdx(weights: number[]) {
        if (weights.length <= 1) {
            return 0;
        }

        let tw: number = 0;
        for (let i = 0; i < weights.length; i++) {
            tw += weights[i];
        }
        let rw = Math.random() * tw;
        let sw: number = 0, ew: number = 0;

        for (let i = 0; i < weights.length; i++) {
            ew = sw + weights[i];
            if (sw < rw && rw <= ew) {
                return i;
            }
            sw = ew;
        }
        return 0;
    }

    /**小数去0 */
    public static numMoveZoro(num: string) {
        if (num.indexOf('.') < 0) {
            return num;
        }
        num = num.replace(/0+?$/g, '')
        if (num[num.length - 1] == '.') {
            num = num.replace(/[.$]/, '');
        }
        return num;
    }

    /**
     * 获取矩形区域内随机坐标点
     * @param rect 
     */
    public static getRectRandPos(rect: Rect) {
        let pos = new Vec3();
        let randX = Math.random() * rect.width;
        let randY = Math.random() * rect.height;
        pos.x = rect.x + randX;
        pos.y = rect.y + randY;
        return pos;
    }

    public static adapterScale() {
        let designSize = view.getDesignResolutionSize();
        let visibleSize = view.getVisibleSize();
        let scale = visibleSize.width / designSize.width;
        return scale
    }
}
