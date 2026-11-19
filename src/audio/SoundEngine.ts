import type { MixVolumes, TrackId } from '../config/site';

interface TrackNodes {
  gain: GainNode;
  cleanup: () => void;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

/**
 * 纯前端 Web Audio API 程序化疗愈音频合成引擎
 * - 零外部音频外链
 * - 适配 iOS Safari / 微信浏览器自动播放解锁策略
 * - 全程使用指数/线性时间斜坡平滑过渡，避免开关爆音
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private fadeGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private timeDomainData: Uint8Array<ArrayBuffer> | null = null;
  private tracks: Partial<Record<TrackId, TrackNodes>> = {};
  private volumes: MixVolumes = {
    rain: 0.72,
    ocean: 0,
    fire: 0.34,
    crickets: 0,
    cosmos: 0.24,
    forest: 0,
  };
  private isPlaying = false;
  private initialized = false;
  private fadeOutActive = false;

  /**
   * 同步惰性初始化并解锁移动端 AudioContext（必须在用户点击/触摸事件栈内调用）
   */
  public async unlockAndEnsure(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }

    // iOS Safari / 微信浏览器：播放 1 帧静音缓冲强制激活音频通道
    try {
      const silentBuf = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
      const silentSrc = this.ctx.createBufferSource();
      silentSrc.buffer = silentBuf;
      silentSrc.connect(this.ctx.destination);
      silentSrc.start(0);
    } catch {
      // 忽略旧环境容错
    }

    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        // 某些浏览器在非手势期调用时可能拒绝，等待下一次手势
      }
    }

    if (!this.initialized) {
      this.buildGraph();
      this.initialized = true;
    }

    return this.ctx.state === 'running';
  }

  private buildGraph(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);

    const fadeGain = ctx.createGain();
    fadeGain.gain.setValueAtTime(1.0, ctx.currentTime);

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-16, ctx.currentTime);
    compressor.knee.setValueAtTime(24, ctx.currentTime);
    compressor.ratio.setValueAtTime(4, ctx.currentTime);
    compressor.attack.setValueAtTime(0.015, ctx.currentTime);
    compressor.release.setValueAtTime(0.25, ctx.currentTime);

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.85;

    masterGain.connect(fadeGain);
    fadeGain.connect(compressor);
    compressor.connect(analyser);
    analyser.connect(ctx.destination);

    this.masterGain = masterGain;
    this.fadeGain = fadeGain;
    this.analyser = analyser;
    this.timeDomainData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));

    // 构建 6 条独立程序化环境音轨
    this.tracks.rain = this.createRainTrack(ctx, masterGain);
    this.tracks.ocean = this.createOceanTrack(ctx, masterGain);
    this.tracks.fire = this.createFireTrack(ctx, masterGain);
    this.tracks.crickets = this.createCricketsTrack(ctx, masterGain);
    this.tracks.cosmos = this.createCosmosTrack(ctx, masterGain);
    this.tracks.forest = this.createForestTrack(ctx, masterGain);

    // 同步初始轨道音量
    (Object.keys(this.volumes) as TrackId[]).forEach((id) => {
      this.applyTrackGain(id, this.volumes[id], 0.02);
    });
  }

  public async play(): Promise<void> {
    await this.unlockAndEnsure();
    if (!this.ctx || !this.masterGain || !this.fadeGain) return;

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume().catch(() => {});
    }

    const now = this.ctx.currentTime;
    this.fadeOutActive = false;

    // 恢复 fadeGain 到 1
    this.fadeGain.gain.cancelScheduledValues(now);
    this.fadeGain.gain.setValueAtTime(Math.max(this.fadeGain.gain.value, 0.0001), now);
    this.fadeGain.gain.linearRampToValueAtTime(1.0, now + 0.15);

    // 平滑淡入 masterGain（0.65s），完全消除爆音
    this.masterGain.gain.cancelScheduledValues(now);
    const current = Math.max(this.masterGain.gain.value, 0.0001);
    this.masterGain.gain.setValueAtTime(current, now);
    this.masterGain.gain.linearRampToValueAtTime(0.88, now + 0.65);

    this.isPlaying = true;
  }

  public pause(): void {
    this.isPlaying = false;
    this.fadeOutActive = false;
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.42);
  }

  /**
   * 睡眠定时最后 10 秒平滑淡出至 0
   */
  public startSleepFadeOut(durationSec: number): void {
    if (!this.ctx || !this.fadeGain || !this.isPlaying) return;
    if (this.fadeOutActive) return;

    this.fadeOutActive = true;
    const now = this.ctx.currentTime;
    const safeDuration = Math.max(durationSec, 0.5);
    this.fadeGain.gain.cancelScheduledValues(now);
    this.fadeGain.gain.setValueAtTime(this.fadeGain.gain.value, now);
    this.fadeGain.gain.linearRampToValueAtTime(0.0001, now + safeDuration);
  }

  public cancelSleepFadeOut(): void {
    this.fadeOutActive = false;
    if (!this.ctx || !this.fadeGain) return;
    const now = this.ctx.currentTime;
    this.fadeGain.gain.cancelScheduledValues(now);
    this.fadeGain.gain.setValueAtTime(this.fadeGain.gain.value, now);
    this.fadeGain.gain.linearRampToValueAtTime(1.0, now + 0.35);
  }

  public setTrackVolume(id: TrackId, value: number): void {
    const clamped = Math.max(0, Math.min(1, value));
    this.volumes[id] = clamped;
    this.applyTrackGain(id, clamped, 0.06);
  }

  public setAllVolumes(next: MixVolumes): void {
    (Object.keys(next) as TrackId[]).forEach((id) => {
      const clamped = Math.max(0, Math.min(1, next[id] ?? 0));
      this.volumes[id] = clamped;
      this.applyTrackGain(id, clamped, 0.18);
    });
  }

  private applyTrackGain(id: TrackId, value: number, timeConstant: number): void {
    const track = this.tracks[id];
    if (!track || !this.ctx) return;
    // 采用听觉平方曲线，小音量微调更细腻
    const perceived = value * value * 0.92;
    track.gain.gain.setTargetAtTime(perceived, this.ctx.currentTime, timeConstant);
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * 实时音频能量 (0 ~ 1)，用于驱动背景流体光晕呼吸
   */
  public getEnergyLevel(): number {
    if (!this.isPlaying) return 0;
    if (!this.analyser || !this.timeDomainData) {
      // 尚未建图时根据音量估算能量
      const total = Object.values(this.volumes).reduce((s, v) => s + v, 0);
      return Math.min(1, total / 2.2) * 0.45;
    }

    this.analyser.getByteTimeDomainData(this.timeDomainData);
    let sumSq = 0;
    for (let i = 0; i < this.timeDomainData.length; i++) {
      const normalized = (this.timeDomainData[i] - 128) / 128;
      sumSq += normalized * normalized;
    }
    const rms = Math.sqrt(sumSq / this.timeDomainData.length);
    return Math.min(1, rms * 3.8);
  }

  public resumeIfNeeded(): void {
    if (this.isPlaying && this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // =========================================================================
  // 噪声缓冲生成工具（全部无缝循环）
  // =========================================================================

  private createPinkNoiseBuffer(ctx: AudioContext, seconds = 6): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      let b3 = 0;
      let b4 = 0;
      let b5 = 0;
      let b6 = 0;

      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
        b6 = white * 0.115926;
      }

      // 首尾微弱交叉淡入淡出消除循环接缝
      const fadeLen = Math.min(1024, Math.floor(length / 20));
      for (let i = 0; i < fadeLen; i++) {
        const t = i / fadeLen;
        data[i] = data[i] * t + data[length - fadeLen + i] * (1 - t);
      }
    }
    return buffer;
  }

  private createBrownNoiseBuffer(ctx: AudioContext, seconds = 8): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let lastOut = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 2.1;
      }
      const fadeLen = Math.min(2048, Math.floor(length / 16));
      for (let i = 0; i < fadeLen; i++) {
        const t = i / fadeLen;
        data[i] = data[i] * t + data[length - fadeLen + i] * (1 - t);
      }
    }
    return buffer;
  }

  private createWhiteNoiseBuffer(ctx: AudioContext, seconds = 5): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.35;
      }
    }
    return buffer;
  }

  // =========================================================================
  // 1. 细雨落窗（滤波粉红噪声 + 微弱随机雨滴敲窗脉冲）
  // =========================================================================
  private createRainTrack(ctx: AudioContext, destination: AudioNode): TrackNodes {
    const trackGain = ctx.createGain();
    trackGain.gain.setValueAtTime(0, ctx.currentTime);
    trackGain.connect(destination);

    const pinkBuf = this.createPinkNoiseBuffer(ctx, 6);
    const src = ctx.createBufferSource();
    src.buffer = pinkBuf;
    src.loop = true;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(220, ctx.currentTime);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2300, ctx.currentTime);
    lp.Q.setValueAtTime(0.65, ctx.currentTime);

    // 轻微阵雨起伏 LFO
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.14, ctx.currentTime);
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.setValueAtTime(340, ctx.currentTime);
    lfo.connect(lfoDepth);
    lfoDepth.connect(lp.frequency);

    const bedGain = ctx.createGain();
    bedGain.gain.setValueAtTime(1.15, ctx.currentTime);

    src.connect(hp);
    hp.connect(lp);
    lp.connect(bedGain);
    bedGain.connect(trackGain);

    src.start();
    lfo.start();

    // 细腻雨滴敲窗层：构造稀疏脉冲缓冲
    const dropLen = Math.floor(ctx.sampleRate * 5);
    const dropBuf = ctx.createBuffer(2, dropLen, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = dropBuf.getChannelData(ch);
      for (let i = 0; i < dropLen; i++) {
        if (Math.random() < 0.00055) {
          const amp = (0.18 + Math.random() * 0.45) * (Math.random() > 0.5 ? 1 : -1);
          const decay = Math.floor(24 + Math.random() * 65);
          for (let k = 0; k < decay && i + k < dropLen; k++) {
            d[i + k] += amp * Math.exp(-k / (decay * 0.25)) * Math.sin(k * 0.42);
          }
        }
      }
    }

    const dropSrc = ctx.createBufferSource();
    dropSrc.buffer = dropBuf;
    dropSrc.loop = true;
    const dropBp = ctx.createBiquadFilter();
    dropBp.type = 'bandpass';
    dropBp.frequency.setValueAtTime(2900, ctx.currentTime);
    dropBp.Q.setValueAtTime(2.2, ctx.currentTime);

    const dropGain = ctx.createGain();
    dropGain.gain.setValueAtTime(0.32, ctx.currentTime);

    dropSrc.connect(dropBp);
    dropBp.connect(dropGain);
    dropGain.connect(trackGain);
    dropSrc.start();

    return {
      gain: trackGain,
      cleanup: () => {
        src.stop();
        lfo.stop();
        dropSrc.stop();
      },
    };
  }

  // =========================================================================
  // 2. 深夜海浪（LFO 慢速潮汐调制褐噪声 + 浪花高频呼吸）
  // =========================================================================
  private createOceanTrack(ctx: AudioContext, destination: AudioNode): TrackNodes {
    const trackGain = ctx.createGain();
    trackGain.gain.setValueAtTime(0, ctx.currentTime);
    trackGain.connect(destination);

    const brownBuf = this.createBrownNoiseBuffer(ctx, 8);
    const src = ctx.createBufferSource();
    src.buffer = brownBuf;
    src.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(380, ctx.currentTime);
    lp.Q.setValueAtTime(0.9, ctx.currentTime);

    const waveGain = ctx.createGain();
    waveGain.gain.setValueAtTime(0.55, ctx.currentTime);

    // 约 9 秒一次缓慢海浪潮汐 LFO
    const tideLfo = ctx.createOscillator();
    tideLfo.type = 'sine';
    tideLfo.frequency.setValueAtTime(0.11, ctx.currentTime);

    const freqMod = ctx.createGain();
    freqMod.gain.setValueAtTime(280, ctx.currentTime);

    const ampMod = ctx.createGain();
    ampMod.gain.setValueAtTime(0.32, ctx.currentTime);

    tideLfo.connect(freqMod);
    freqMod.connect(lp.frequency);
    tideLfo.connect(ampMod);
    ampMod.connect(waveGain.gain);

    src.connect(lp);
    lp.connect(waveGain);
    waveGain.connect(trackGain);

    src.start();
    tideLfo.start();

    return {
      gain: trackGain,
      cleanup: () => {
        src.stop();
        tideLfo.stop();
      },
    };
  }

  // =========================================================================
  // 3. 壁炉柴火（低频暖噪火床 + 随机火星噼啪脉冲）
  // =========================================================================
  private createFireTrack(ctx: AudioContext, destination: AudioNode): TrackNodes {
    const trackGain = ctx.createGain();
    trackGain.gain.setValueAtTime(0, ctx.currentTime);
    trackGain.connect(destination);

    // 底层暖轰鸣
    const brownBuf = this.createBrownNoiseBuffer(ctx, 6);
    const rumbleSrc = ctx.createBufferSource();
    rumbleSrc.buffer = brownBuf;
    rumbleSrc.loop = true;

    const rumbleLp = ctx.createBiquadFilter();
    rumbleLp.type = 'lowpass';
    rumbleLp.frequency.setValueAtTime(145, ctx.currentTime);

    const rumbleGain = ctx.createGain();
    rumbleGain.gain.setValueAtTime(0.95, ctx.currentTime);

    rumbleSrc.connect(rumbleLp);
    rumbleLp.connect(rumbleGain);
    rumbleGain.connect(trackGain);
    rumbleSrc.start();

    // 上层火星噼啪脉冲
    const crackleLen = Math.floor(ctx.sampleRate * 6);
    const crackleBuf = ctx.createBuffer(2, crackleLen, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = crackleBuf.getChannelData(ch);
      for (let i = 0; i < crackleLen; i++) {
        const r = Math.random();
        if (r < 0.00042) {
          // 清脆短火星
          const amp = (0.35 + Math.random() * 0.65) * (Math.random() > 0.5 ? 1 : -1);
          const len = Math.floor(14 + Math.random() * 38);
          for (let k = 0; k < len && i + k < crackleLen; k++) {
            data[i + k] += amp * Math.exp(-k / 7) * (Math.random() * 0.6 + 0.4);
          }
        } else if (r > 0.99982) {
          // 沉厚木炭爆裂
          const amp = (0.55 + Math.random() * 0.4) * (Math.random() > 0.5 ? 1 : -1);
          const len = Math.floor(65 + Math.random() * 110);
          for (let k = 0; k < len && i + k < crackleLen; k++) {
            data[i + k] += amp * Math.exp(-k / 24) * Math.sin(k * 0.25);
          }
        }
      }
    }

    const crackleSrc = ctx.createBufferSource();
    crackleSrc.buffer = crackleBuf;
    crackleSrc.loop = true;

    const crackleHp = ctx.createBiquadFilter();
    crackleHp.type = 'highpass';
    crackleHp.frequency.setValueAtTime(950, ctx.currentTime);

    const crackleLp = ctx.createBiquadFilter();
    crackleLp.type = 'lowpass';
    crackleLp.frequency.setValueAtTime(5200, ctx.currentTime);

    const crackleGain = ctx.createGain();
    crackleGain.gain.setValueAtTime(0.68, ctx.currentTime);

    crackleSrc.connect(crackleHp);
    crackleHp.connect(crackleLp);
    crackleLp.connect(crackleGain);
    crackleGain.connect(trackGain);
    crackleSrc.start();

    return {
      gain: trackGain,
      cleanup: () => {
        rumbleSrc.stop();
        crackleSrc.stop();
      },
    };
  }

  // =========================================================================
  // 4. 夏夜虫鸣（高频双失谐正弦 + 颤音 AM + 间歇呼吸节律）
  // =========================================================================
  private createCricketsTrack(ctx: AudioContext, destination: AudioNode): TrackNodes {
    const trackGain = ctx.createGain();
    trackGain.gain.setValueAtTime(0, ctx.currentTime);
    trackGain.connect(destination);

    // 预合成 7 秒自然蟋蟀声景循环缓冲（比持续纯振荡器听感更自然且低 CPU）
    const seconds = 7;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, length, ctx.sampleRate);
    const sr = ctx.sampleRate;

    // 两组远近错落的虫鸣节律
    const voices = [
      { freq: 4180, detune: 19, chirpRate: 26, pulsePeriod: 1.75, duty: 0.34, panL: 0.78, panR: 0.38, gain: 0.14 },
      { freq: 4620, detune: 14, chirpRate: 31, pulsePeriod: 2.33, duty: 0.28, panL: 0.35, panR: 0.82, gain: 0.10 },
    ];

    const left = buf.getChannelData(0);
    const right = buf.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sr;
      let sampleL = 0;
      let sampleR = 0;

      for (const v of voices) {
        const phaseInPeriod = (t % v.pulsePeriod) / v.pulsePeriod;
        if (phaseInPeriod < v.duty) {
          // 平滑窗口包络
          const local = phaseInPeriod / v.duty;
          const windowEnv = Math.sin(Math.PI * local);
          // 翅翼快速颤振调制
          const trill = 0.5 + 0.5 * Math.sin(2 * Math.PI * v.chirpRate * t);
          const carrier =
            0.6 * Math.sin(2 * Math.PI * v.freq * t) +
            0.4 * Math.sin(2 * Math.PI * (v.freq + v.detune) * t);
          const val = carrier * trill * windowEnv * windowEnv * v.gain;
          sampleL += val * v.panL;
          sampleR += val * v.panR;
        }
      }

      left[i] = sampleL;
      right[i] = sampleR;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(4350, ctx.currentTime);
    bp.Q.setValueAtTime(1.6, ctx.currentTime);

    const innerGain = ctx.createGain();
    innerGain.gain.setValueAtTime(0.72, ctx.currentTime);

    src.connect(bp);
    bp.connect(innerGain);
    innerGain.connect(trackGain);
    src.start();

    return {
      gain: trackGain,
      cleanup: () => {
        src.stop();
      },
    };
  }

  // =========================================================================
  // 5. 宇宙深空（多声部微失谐低频 Drone 和弦 + 超慢呼吸滤镜）
  // =========================================================================
  private createCosmosTrack(ctx: AudioContext, destination: AudioNode): TrackNodes {
    const trackGain = ctx.createGain();
    trackGain.gain.setValueAtTime(0, ctx.currentTime);
    trackGain.connect(destination);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(290, ctx.currentTime);
    lp.Q.setValueAtTime(1.4, ctx.currentTime);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.055, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(125, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(lp.frequency);

    const chordGain = ctx.createGain();
    chordGain.gain.setValueAtTime(0.24, ctx.currentTime);

    // 温暖深邃的 A 大九/五度空灵低频和弦 (A1, E2, A2微失谐, E3微失谐)
    const freqs: Array<{ f: number; type: OscillatorType; g: number }> = [
      { f: 55.0, type: 'sine', g: 0.42 },
      { f: 82.41, type: 'triangle', g: 0.24 },
      { f: 110.35, type: 'sine', g: 0.22 },
      { f: 164.45, type: 'sine', g: 0.14 },
    ];

    const oscs: OscillatorNode[] = [];
    for (const item of freqs) {
      const osc = ctx.createOscillator();
      osc.type = item.type;
      osc.frequency.setValueAtTime(item.f, ctx.currentTime);

      const g = ctx.createGain();
      g.gain.setValueAtTime(item.g, ctx.currentTime);

      osc.connect(g);
      g.connect(lp);
      osc.start();
      oscs.push(osc);
    }

    lp.connect(chordGain);
    chordGain.connect(trackGain);
    lfo.start();

    return {
      gain: trackGain,
      cleanup: () => {
        oscs.forEach((o) => o.stop());
        lfo.stop();
      },
    };
  }

  // =========================================================================
  // 6. 森林微风（带通扫频白噪/粉噪 + 异步阵风 LFO）
  // =========================================================================
  private createForestTrack(ctx: AudioContext, destination: AudioNode): TrackNodes {
    const trackGain = ctx.createGain();
    trackGain.gain.setValueAtTime(0, ctx.currentTime);
    trackGain.connect(destination);

    const whiteBuf = this.createWhiteNoiseBuffer(ctx, 5);
    const src = ctx.createBufferSource();
    src.buffer = whiteBuf;
    src.loop = true;

    const bp1 = ctx.createBiquadFilter();
    bp1.type = 'bandpass';
    bp1.frequency.setValueAtTime(520, ctx.currentTime);
    bp1.Q.setValueAtTime(2.1, ctx.currentTime);

    const bp2 = ctx.createBiquadFilter();
    bp2.type = 'bandpass';
    bp2.frequency.setValueAtTime(1180, ctx.currentTime);
    bp2.Q.setValueAtTime(2.4, ctx.currentTime);

    // 异步双 LFO 扫频，避免机械周期感
    const lfo1 = ctx.createOscillator();
    lfo1.frequency.setValueAtTime(0.075, ctx.currentTime);
    const lfo1Depth = ctx.createGain();
    lfo1Depth.gain.setValueAtTime(240, ctx.currentTime);
    lfo1.connect(lfo1Depth);
    lfo1Depth.connect(bp1.frequency);

    const lfo2 = ctx.createOscillator();
    lfo2.frequency.setValueAtTime(0.125, ctx.currentTime);
    const lfo2Depth = ctx.createGain();
    lfo2Depth.gain.setValueAtTime(420, ctx.currentTime);
    lfo2.connect(lfo2Depth);
    lfo2Depth.connect(bp2.frequency);

    const mixGain1 = ctx.createGain();
    mixGain1.gain.setValueAtTime(0.62, ctx.currentTime);
    const mixGain2 = ctx.createGain();
    mixGain2.gain.setValueAtTime(0.32, ctx.currentTime);

    src.connect(bp1);
    src.connect(bp2);
    bp1.connect(mixGain1);
    bp2.connect(mixGain2);
    mixGain1.connect(trackGain);
    mixGain2.connect(trackGain);

    src.start();
    lfo1.start();
    lfo2.start();

    return {
      gain: trackGain,
      cleanup: () => {
        src.stop();
        lfo1.stop();
        lfo2.stop();
      },
    };
  }
}

export const soundEngine = new SoundEngine();
