import { Node, AudioClip, AudioSource, director } from "cc";
import { Debug } from "./Debug";
import { ResourceMgr } from "./ResourceMgr";
import { LocalStorageMgr } from "./LocalStorageMgr";

/**
 * 音频配置接口（简化版，如果使用配置表可扩展）
 */
interface IAudioConfig {
    /** 音频文件名 */
    name: string;
    /** 音量（0-1） */
    volume?: number;
}

/**
 * 音频管理器 (Audio Manager)
 * 
 * 功能说明：
 * - 统一管理游戏中的背景音乐和音效播放
 * - 支持音量控制、开关控制、暂停恢复等功能
 * - 使用 ResourceMgr 加载音频资源
 * - 使用 LocalStorageMgr 持久化音频设置
 * 
 * 使用场景：
 * - 背景音乐播放
 * - 音效播放（按钮点击、游戏音效等）
 * - 音量设置和开关控制
 * 
 * 使用示例：
 * ```typescript
 * // 初始化
 * AudioMgr.init();
 * 
 * // 播放背景音乐
 * await AudioMgr.playMusic('music/bgm', true);
 * 
 * // 播放音效
 * await AudioMgr.playSound('sound/click');
 * 
 * // 设置音量
 * AudioMgr.setMusicVolume(0.5);
 * AudioMgr.setSoundVolume(0.8);
 * 
 * // 开关控制
 * AudioMgr.switchMusic(false);
 * AudioMgr.switchSound(true);
 * ```
 */
export class AudioMgr {
    // 持久化根节点
    private static _persistRootNode: Node | null = null;
    // 当前播放的背景音乐
    private static _currentMusic: AudioSource | null = null;
    // 音乐映射表（key: 音频名称，value: AudioSource）
    private static _musicMap: Map<string, AudioSource> = new Map();
    // 音效映射表（key: 音频名称，value: AudioSource[]）
    private static _soundMap: Map<string, AudioSource[]> = new Map();
    // 当前正在播放的音效列表
    private static _playingSounds: AudioSource[] = [];
    // 音乐音量（0-1）
    private static _musicVolume: number = 1;
    // 音效音量（0-1）
    private static _soundVolume: number = 1;
    // 音乐开关（true: 开启，false: 关闭）
    private static _musicEnabled: boolean = true;
    // 音效开关（true: 开启，false: 关闭）
    private static _soundEnabled: boolean = true;
    // 主音量（0-1），影响所有音频
    private static _mainVolume: number = 1;
    // 是否已初始化
    private static _isInitialized: boolean = false;

    /**
     * 初始化音频管理器
     */
    public static init() {
        if (this._isInitialized) {
            Debug.warn("AudioMgr already initialized");
            return;
        }

        // 创建持久化根节点
        const scene = director.getScene();
        if (!scene) {
            Debug.error("AudioMgr.init: scene is null");
            return;
        }

        this._persistRootNode = new Node('AudioMgr');
        scene.addChild(this._persistRootNode);
        director.addPersistRootNode(this._persistRootNode);

        this._isInitialized = true;
    }

    /**
     * 销毁音频管理器
     */
    public static destroy() {
        this.stopAll();
        this._musicMap.clear();
        this._soundMap.clear();
        this._playingSounds = [];
        
        if (this._persistRootNode) {
            this._persistRootNode.destroy();
            this._persistRootNode = null;
        }

        this._isInitialized = false;
    }

    /**
     * 播放背景音乐
     * @param path 音频资源路径
     * @param loop 是否循环播放（默认true）
     * @param volume 音量（0-1，可选，默认使用配置音量）
     * @returns Promise<void>
     */
    public static async playMusic(path: string, loop: boolean = true, volume?: number): Promise<void> {
        if (!this._isInitialized || !this._persistRootNode) {
            Debug.warn("AudioMgr.playMusic: not initialized");
            return;
        }

        try {
            // 停止当前音乐
            if (this._currentMusic) {
                this._currentMusic.stop();
            }

            // 检查是否已加载
            let musicSource = this._musicMap.get(path);
            if (!musicSource) {
                // 加载音频资源
                const clip = await ResourceMgr.loadRes<AudioClip>(path, AudioClip);
                if (!clip) {
                    Debug.error(`AudioMgr.playMusic: failed to load audio "${path}"`);
                    return;
                }

                // 创建 AudioSource
                musicSource = this._persistRootNode.addComponent(AudioSource);
                musicSource.clip = clip;
                musicSource.loop = loop;
                musicSource.playOnAwake = false;
                this._musicMap.set(path, musicSource);
            } else {
                musicSource.loop = loop;
            }

            // 设置音量
            const finalVolume = volume !== undefined ? volume : this._musicVolume;
            musicSource.volume = finalVolume * this._mainVolume;

            // 播放
            this._currentMusic = musicSource;
            if (this._musicEnabled) {
                musicSource.play();
            }
        } catch (err) {
            Debug.error(`AudioMgr.playMusic: error playing "${path}"`, err);
        }
    }

    /**
     * 播放音效
     * @param path 音频资源路径
     * @param loop 是否循环播放（默认false）
     * @param volume 音量（0-1，可选，默认使用配置音量）
     * @returns Promise<void>
     */
    public static async playSound(path: string, loop: boolean = false, volume?: number): Promise<void> {
        if (!this._isInitialized || !this._persistRootNode) {
            Debug.warn("AudioMgr.playSound: not initialized");
            return;
        }

        if (!this._soundEnabled) {
            return;
        }

        try {
            // 加载音频资源
            const clip = await ResourceMgr.loadRes<AudioClip>(path, AudioClip);
            if (!clip) {
                Debug.error(`AudioMgr.playSound: failed to load audio "${path}"`);
                return;
            }

            // 获取或创建 AudioSource
            let soundSource: AudioSource | null = null;
            const soundList = this._soundMap.get(path);
            
            if (soundList && soundList.length > 0) {
                // 从池中获取
                soundSource = soundList.pop()!;
            } else {
                // 创建新的
                soundSource = this._persistRootNode.addComponent(AudioSource);
            }

            soundSource.clip = clip;
            soundSource.loop = loop;
            soundSource.playOnAwake = false;

            // 设置音量
            const finalVolume = volume !== undefined ? volume : this._soundVolume;
            soundSource.volume = finalVolume * this._mainVolume;

            // 播放
            soundSource.play();
            this._playingSounds.push(soundSource);

            // 播放结束后回收到池中
            if (!loop) {
                const duration = soundSource.duration * 1000;
                setTimeout(() => {
                    if (soundSource && !soundSource.playing) {
                        this._recycleSound(path, soundSource);
                    }
                }, duration);
            }
        } catch (err) {
            Debug.error(`AudioMgr.playSound: error playing "${path}"`, err);
        }
    }

    /**
     * 回收音效到池中
     */
    private static _recycleSound(path: string, source: AudioSource) {
        const index = this._playingSounds.indexOf(source);
        if (index >= 0) {
            this._playingSounds.splice(index, 1);
        }

        source.stop();
        source.clip = null;

        let soundList = this._soundMap.get(path);
        if (!soundList) {
            soundList = [];
            this._soundMap.set(path, soundList);
        }
        soundList.push(source);
    }

    /**
     * 停止当前背景音乐
     */
    public static stopMusic() {
        if (this._currentMusic) {
            this._currentMusic.stop();
            this._currentMusic = null;
        }
    }

    /**
     * 暂停当前背景音乐
     */
    public static pauseMusic() {
        if (this._currentMusic && this._currentMusic.playing) {
            this._currentMusic.pause();
        }
    }

    /**
     * 恢复当前背景音乐
     */
    public static resumeMusic() {
        if (this._currentMusic && this._musicEnabled) {
            this._currentMusic.play();
        }
    }

    /**
     * 停止所有音效
     */
    public static stopAllSounds() {
        this._playingSounds.forEach(source => {
            if (source && source.playing) {
                source.stop();
            }
        });
        this._playingSounds = [];
    }

    /**
     * 停止所有音频（音乐和音效）
     */
    public static stopAll() {
        this.stopMusic();
        this.stopAllSounds();
    }

    /**
     * 设置音乐音量
     * @param volume 音量（0-1）
     */
    public static setMusicVolume(volume: number) {
        this._musicVolume = Math.max(0, Math.min(1, volume));
        
        // 更新当前音乐音量
        if (this._currentMusic) {
            this._currentMusic.volume = this._musicVolume * this._mainVolume;
        }

        // 更新所有已加载的音乐
        this._musicMap.forEach(source => {
            if (source) {
                source.volume = this._musicVolume * this._mainVolume;
            }
        });

    }

    /**
     * 设置音效音量
     * @param volume 音量（0-1）
     */
    public static setSoundVolume(volume: number) {
        this._soundVolume = Math.max(0, Math.min(1, volume));

        // 更新正在播放的音效音量
        this._playingSounds.forEach(source => {
            if (source) {
                source.volume = this._soundVolume * this._mainVolume;
            }
        });

    }

    /**
     * 设置主音量（影响所有音频）
     * @param volume 音量（0-1）
     */
    public static setMainVolume(volume: number) {
        this._mainVolume = Math.max(0, Math.min(1, volume));
        this.setMusicVolume(this._musicVolume);
        this.setSoundVolume(this._soundVolume);
    }

    /**
     * 获取音乐音量
     */
    public static getMusicVolume(): number {
        return this._musicVolume;
    }

    /**
     * 获取音效音量
     */
    public static getSoundVolume(): number {
        return this._soundVolume;
    }

    /**
     * 获取主音量
     */
    public static getMainVolume(): number {
        return this._mainVolume;
    }

    /**
     * 开关音乐
     * @param enabled 是否开启
     */
    public static switchMusic(enabled: boolean) {
        this._musicEnabled = enabled;
        if (enabled) {
            this.resumeMusic();
        } else {
            this.pauseMusic();
        }
    }

    /**
     * 开关音效
     * @param enabled 是否开启
     */
    public static switchSound(enabled: boolean) {
        this._soundEnabled = enabled;
        if (!enabled) {
            this.stopAllSounds();
        }
    }

    /**
     * 检查音乐是否开启
     */
    public static isMusicEnabled(): boolean {
        return this._musicEnabled;
    }

    /**
     * 检查音效是否开启
     */
    public static isSoundEnabled(): boolean {
        return this._soundEnabled;
    }

    /**
     * 检查指定音乐是否正在播放
     * @param path 音频路径
     */
    public static isMusicPlaying(path: string): boolean {
        const music = this._musicMap.get(path);
        return music ? music.playing : false;
    }

    /**
     * 检查指定音效是否正在播放
     * @param path 音频路径
     */
    public static isSoundPlaying(path: string): boolean {
        return this._playingSounds.some(source => {
            return source.clip && source.clip.name === path && source.playing;
        });
    }

    /**
     * 预加载音乐
     * @param paths 音频路径数组
     */
    public static async preloadMusics(paths: string[]): Promise<void> {
        if (!this._isInitialized || !this._persistRootNode) {
            Debug.warn("AudioMgr.preloadMusics: not initialized");
            return;
        }

        for (const path of paths) {
            try {
                if (this._musicMap.has(path)) {
                    continue; // 已加载
                }

                const clip = await ResourceMgr.loadRes<AudioClip>(path, AudioClip);
                if (clip) {
                    const musicSource = this._persistRootNode.addComponent(AudioSource);
                    musicSource.clip = clip;
                    musicSource.playOnAwake = false;
                    this._musicMap.set(path, musicSource);
                }
            } catch (err) {
                Debug.error(`AudioMgr.preloadMusics: failed to preload "${path}"`, err);
            }
        }
    }

    /**
     * 释放指定音乐资源
     * @param paths 音频路径数组
     */
    public static releaseMusics(paths: string[]): void {
        for (const path of paths) {
            const music = this._musicMap.get(path);
            if (music) {
                if (this._currentMusic === music) {
                    this._currentMusic = null;
                }
                music.stop();
                music.destroy();
                this._musicMap.delete(path);
                ResourceMgr.releaseRes(path);
            }
        }
    }

    /**
     * 释放指定音效资源
     * @param paths 音频路径数组
     */
    public static releaseSounds(paths: string[]): void {
        for (const path of paths) {
            const soundList = this._soundMap.get(path);
            if (soundList) {
                soundList.forEach(source => {
                    source.stop();
                    source.destroy();
                });
                this._soundMap.delete(path);
                ResourceMgr.releaseRes(path);
            }
        }
    }
}

