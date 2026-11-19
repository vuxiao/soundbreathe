import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookmarkPlus,
  Image as ImageIcon,
  Info,
  Moon,
  QrCode,
  RotateCcw,
  Trash2,
  Wind,
  X,
} from 'lucide-react';
import {
  BUILTIN_PRESETS,
  CUSTOM_PRESETS_STORAGE_KEY,
  LAST_MIX_STORAGE_KEY,
  TRACKS,
  type MixVolumes,
  type PresetConfig,
  type TrackId,
} from './config/site';
import { soundEngine } from './audio/SoundEngine';
import { AmbientCanvas } from './components/AmbientCanvas';
import { IntroCover } from './components/IntroCover';
import { IntroPosterModal } from './components/IntroPosterModal';
import { TrackIcon } from './components/TrackIcon';
import { VolumeSlider } from './components/VolumeSlider';
import { BreathModal } from './components/BreathModal';
import { TimerModal, formatCountdown } from './components/TimerModal';
import { PostcardModal } from './components/PostcardModal';

const DEFAULT_VOLUMES: MixVolumes = { ...BUILTIN_PRESETS[0].volumes };

function loadSavedMix(): MixVolumes {
  try {
    const raw = localStorage.getItem(LAST_MIX_STORAGE_KEY);
    if (!raw) return DEFAULT_VOLUMES;
    const parsed = JSON.parse(raw) as Partial<MixVolumes>;
    const next: MixVolumes = { ...DEFAULT_VOLUMES };
    for (const t of TRACKS) {
      const val = parsed[t.id];
      if (typeof val === 'number' && !Number.isNaN(val)) {
        next[t.id] = Math.max(0, Math.min(1, val));
      }
    }
    return next;
  } catch {
    return DEFAULT_VOLUMES;
  }
}

function loadCustomPresets(): PresetConfig[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PresetConfig =>
        item &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        item.volumes &&
        typeof item.volumes === 'object'
    );
  } catch {
    return [];
  }
}

function volumesEqual(a: MixVolumes, b: MixVolumes): boolean {
  return TRACKS.every((t) => Math.abs((a[t.id] || 0) - (b[t.id] || 0)) < 0.015);
}

export function App() {
  // 首屏默认展示「产品介绍页（Intro Cover）」
  const [showIntro, setShowIntro] = useState(true);
  const [introPosterOpen, setIntroPosterOpen] = useState(false);

  const [volumes, setVolumes] = useState<MixVolumes>(() => loadSavedMix());
  const [customPresets, setCustomPresets] = useState<PresetConfig[]>(() => loadCustomPresets());
  const [isPlaying, setIsPlaying] = useState(false);

  // 弹窗状态
  const [breathOpen, setBreathOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [postcardOpen, setPostcardOpen] = useState(false);

  // 保存自定义配方状态
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // 睡眠定时状态
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);

  // 轻提示 Toast
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // 记录静音前音量用于点击图标快捷切换
  const lastNonZeroRef = useRef<Partial<Record<TrackId, number>>>({});

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  // 持久化当前混音配方与同步引擎
  useEffect(() => {
    soundEngine.setAllVolumes(volumes);
    try {
      localStorage.setItem(LAST_MIX_STORAGE_KEY, JSON.stringify(volumes));
    } catch {
      // 隐私模式下忽略存储异常
    }
  }, [volumes]);

  // 持久化自定义预设
  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(customPresets));
    } catch {
      // 忽略存储异常
    }
  }, [customPresets]);

  // 页面切回前台时尝试恢复 iOS Safari / 微信挂起的 AudioContext
  useEffect(() => {
    const onVisChange = () => {
      if (document.visibilityState === 'visible') {
        soundEngine.resumeIfNeeded();
      }
    };
    document.addEventListener('visibilitychange', onVisChange);
    return () => document.removeEventListener('visibilitychange', onVisChange);
  }, []);

  // 睡眠定时器倒计时 & 最后 10 秒平滑淡出至 0 并暂停
  useEffect(() => {
    if (remainingSec === null) return;

    if (remainingSec <= 0) {
      soundEngine.pause();
      setIsPlaying(false);
      setRemainingSec(null);
      setSelectedMinutes(null);
      showToast('睡眠定时结束，晚安好梦');
      return;
    }

    if (remainingSec <= 10 && isPlaying) {
      soundEngine.startSleepFadeOut(remainingSec);
    }

    const timer = window.setTimeout(() => {
      setRemainingSec((prev) => (prev === null ? null : Math.max(0, prev - 1)));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [remainingSec, isPlaying, showToast]);

  const allPresets = useMemo(
    () => [...BUILTIN_PRESETS, ...customPresets],
    [customPresets]
  );

  const activePreset = useMemo(
    () => allPresets.find((p) => volumesEqual(p.volumes, volumes)) ?? null,
    [allPresets, volumes]
  );

  const activeTrackCount = useMemo(
    () => TRACKS.filter((t) => (volumes[t.id] || 0) > 0.01).length,
    [volumes]
  );

  // 从首屏产品介绍页步入主工作台：利用此次点击手势同步预热解锁 AudioContext
  const handleEnterApp = () => {
    void soundEngine.unlockAndEnsure();
    setShowIntro(false);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleTogglePlay = async () => {
    if (isPlaying) {
      soundEngine.pause();
      setIsPlaying(false);
      return;
    }

    // 若全部音轨为 0，自动恢复默认雨夜配方
    const totalVol = Object.values(volumes).reduce((s, v) => s + v, 0);
    if (totalVol < 0.02) {
      setVolumes({ ...BUILTIN_PRESETS[0].volumes });
      soundEngine.setAllVolumes(BUILTIN_PRESETS[0].volumes);
    }

    await soundEngine.play();
    setIsPlaying(true);
  };

  const handleSelectPreset = async (preset: PresetConfig) => {
    const next = { ...preset.volumes };
    setVolumes(next);
    soundEngine.setAllVolumes(next);
    if (!isPlaying) {
      await soundEngine.play();
      setIsPlaying(true);
    }
    showToast(`已切换至「${preset.name}」`);
  };

  const handleTrackChange = useCallback((id: TrackId, nextVal: number) => {
    if (nextVal > 0.02) {
      lastNonZeroRef.current[id] = nextVal;
    }
    setVolumes((prev) => ({ ...prev, [id]: nextVal }));
    soundEngine.setTrackVolume(id, nextVal);
  }, []);

  const handleToggleTrackMute = (id: TrackId) => {
    const current = volumes[id] || 0;
    if (current > 0.02) {
      lastNonZeroRef.current[id] = current;
      handleTrackChange(id, 0);
    } else {
      const restored = lastNonZeroRef.current[id] ?? 0.55;
      handleTrackChange(id, restored);
    }
  };

  const handleSelectSleepTimer = (minutes: number | null) => {
    if (minutes === null) {
      setSelectedMinutes(null);
      setRemainingSec(null);
      soundEngine.cancelSleepFadeOut();
      showToast('已关闭睡眠定时');
      return;
    }

    setSelectedMinutes(minutes);
    setRemainingSec(minutes * 60);
    soundEngine.cancelSleepFadeOut();
    showToast(`已设定 ${minutes} 分钟后平滑淡出`);

    if (!isPlaying) {
      void soundEngine.play().then(() => setIsPlaying(true));
    }
  };

  const handleSaveCustomPreset = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPresetName.trim();
    if (!trimmed) {
      showToast('请为这份声景配方起个名字');
      return;
    }
    const created: PresetConfig = {
      id: `custom-${Date.now()}`,
      name: trimmed.slice(0, 10),
      tagline: '专属自定义混音',
      volumes: { ...volumes },
      isCustom: true,
    };
    setCustomPresets((prev) => [created, ...prev].slice(0, 8));
    setNewPresetName('');
    setSaveDialogOpen(false);
    showToast(`已保存专属配方「${created.name}」`);
  };

  const handleDeleteCustomPreset = (id: string, name: string) => {
    setCustomPresets((prev) => prev.filter((p) => p.id !== id));
    showToast(`已删除「${name}」`);
  };

  const handleResetMix = () => {
    const zeroMix: MixVolumes = {
      rain: 0,
      ocean: 0,
      fire: 0,
      crickets: 0,
      cosmos: 0,
      forest: 0,
    };
    setVolumes(zeroMix);
    showToast('已归零全部音轨');
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full justify-center overflow-x-hidden bg-[#060a13] text-[#ebf2f7]">
      {/* 防闪屏深海流体光晕画布（100lvh + GPU 层固定） */}
      <AmbientCanvas volumes={volumes} isPlaying={isPlaying} />
      <div
        className="grain-overlay pointer-events-none fixed inset-0 opacity-55"
        aria-hidden="true"
      />

      {showIntro ? (
        <IntroCover
          onEnter={handleEnterApp}
          onOpenPoster={() => setIntroPosterOpen(true)}
        />
      ) : (
        /* 主混音工作台（桌面端居中呈现精致手机画框） */
        <main
          data-testid="mixer-workspace"
          className="animate-view-in relative z-10 flex min-h-[100dvh] w-full max-w-[430px] flex-col px-5 sm:my-6 sm:min-h-[calc(100dvh-48px)] sm:rounded-[38px] sm:border sm:border-white/12 sm:bg-[#070d18]/48 sm:shadow-[0_24px_80px_rgba(0,0,0,0.75)]"
          style={{
            paddingTop: 'max(16px, var(--safe-top))',
            paddingBottom: 'max(24px, var(--safe-bottom))',
          }}
        >
          {/* 顶部极简导航栏 */}
          <header className="flex items-center justify-between pt-1">
            <div>
              <div className="flex items-baseline gap-2">
                <h1 className="font-serif-display text-[21px] font-medium tracking-[0.12em] text-white">
                  声息
                </h1>
                <span className="text-[10px] font-light tracking-[0.22em] text-[#98d8d0]/75 uppercase">
                  SoundBreathe
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-white/48">
                {isPlaying
                  ? `聆听中 · ${activePreset ? activePreset.name : `${activeTrackCount} 轨自由混音`}`
                  : '深海静谧白噪音 · 呼吸疗愈'}
              </p>
            </div>

            {/* 顶部右侧：动态声波胶囊 + 产品介绍/海报快捷入口 */}
            <div className="flex items-center gap-1.5">
              <div className="glass-pill flex h-9 items-center gap-1.5 rounded-full px-2.5">
                <div className="flex h-3 items-end gap-[2px]" aria-hidden="true">
                  {[0.1, 0.45, 0.25, 0.6].map((delay, i) => (
                    <span
                      key={i}
                      className={`w-[2px] rounded-full bg-[#7dd3c8] transition-all ${
                        isPlaying ? 'animate-soundbar h-full' : 'h-[4px] opacity-40'
                      }`}
                      style={isPlaying ? { animationDelay: `${delay}s` } : undefined}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-white/75">{isPlaying ? '聆听' : '待机'}</span>
              </div>

              <button
                type="button"
                data-testid="topbar-poster-btn"
                onClick={() => setIntroPosterOpen(true)}
                aria-label="打开产品介绍二维码海报"
                title="产品介绍二维码海报"
                className="glass-pill flex h-9 w-9 items-center justify-center rounded-full text-[#9cdbd3] transition hover:border-[#7dd3c8]/40 hover:text-white active:scale-95"
              >
                <QrCode className="h-4 w-4" />
              </button>

              <button
                type="button"
                data-testid="topbar-intro-btn"
                onClick={() => setShowIntro(true)}
                aria-label="重新查看产品介绍页"
                title="产品介绍"
                className="glass-pill flex h-9 w-9 items-center justify-center rounded-full text-white/72 transition hover:border-[#7dd3c8]/40 hover:text-white active:scale-95"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* 中央 Hero 声景播放光球（升级待机呼吸细环 + 播放水波扩散涟漪） */}
          <section className="relative my-3.5 flex flex-col items-center">
            <div className="relative flex h-[138px] w-[138px] items-center justify-center">
              {/* 播放态双层丝滑水波涟漪 */}
              {isPlaying && (
                <>
                  <div className="animate-ripple pointer-events-none absolute inset-4 rounded-full border border-[#7dd3c8]/45" />
                  <div className="animate-ripple-delayed pointer-events-none absolute inset-4 rounded-full border border-[#9ce2d9]/35" />
                </>
              )}

              {/* 待机态双层柔和呼吸细环 */}
              <div
                className={`pointer-events-none absolute inset-0 rounded-full border border-dashed border-[#7dd3c8]/24 ${
                  isPlaying ? 'animate-slow-rotate opacity-95' : 'animate-orb-breathe opacity-55'
                }`}
              />
              <div
                className={`pointer-events-none absolute inset-3 rounded-full border transition-all duration-700 ${
                  isPlaying
                    ? 'scale-105 border-[#7dd3c8]/34'
                    : 'animate-orb-breathe scale-95 border-white/14'
                }`}
              />

              {/* 主播放 / 暂停按钮 */}
              <button
                type="button"
                data-testid="master-play-btn"
                onClick={() => void handleTogglePlay()}
                aria-label={isPlaying ? '暂停环境音' : '开始播放环境音'}
                className={`relative flex h-[84px] w-[84px] items-center justify-center rounded-full border transition-all duration-300 active:scale-95 ${
                  isPlaying
                    ? 'border-[#8be0d5]/60 bg-gradient-to-br from-[#7dd3c8]/34 via-[#205168]/52 to-[#0b1929]/90 text-[#f1fbfa] shadow-[0_0_38px_rgba(125,211,200,0.34),inset_0_1px_16px_rgba(255,255,255,0.22)]'
                    : 'border-white/22 bg-gradient-to-br from-[#1b3146]/72 via-[#0f1f31]/84 to-[#08121f]/94 text-white/95 shadow-[0_12px_30px_rgba(0,0,0,0.55),inset_0_1px_14px_rgba(210,242,248,0.14)] hover:border-[#7dd3c8]/45'
                }`}
              >
                {isPlaying ? (
                  <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current" aria-hidden="true">
                    <rect x="5.5" y="4.5" width="4.4" height="15" rx="2" />
                    <rect x="14.1" y="4.5" width="4.4" height="15" rx="2" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="ml-0.5 h-7 w-7 fill-current" aria-hidden="true">
                    <path d="M6.8 4.8c0-1.35 1.47-2.18 2.63-1.49l10.6 6.2c1.15.67 1.15 2.31 0 2.98l-10.6 6.2c-1.16.69-2.63-.14-2.63-1.49V4.8Z" />
                  </svg>
                )}
              </button>
            </div>

            {/* 睡眠定时器实时等宽倒计时或场景诗句 */}
            {remainingSec !== null ? (
              <button
                type="button"
                onClick={() => setTimerOpen(true)}
                className="mt-1 flex items-center gap-2 rounded-full border border-[#7dd3c8]/35 bg-[#7dd3c8]/12 px-3.5 py-1 text-xs text-[#c7f5ee] transition hover:bg-[#7dd3c8]/20"
              >
                <Moon className="h-3.5 w-3.5 text-[#7dd3c8]" />
                <span className="font-mono-timer tracking-wider">
                  {formatCountdown(remainingSec)}
                </span>
                <span className="text-[11px] text-white/60">
                  {remainingSec <= 10 ? '淡出中…' : '后淡出暂停'}
                </span>
              </button>
            ) : (
              <p className="mt-1 text-xs tracking-wider text-white/50">
                {activePreset ? activePreset.tagline : '自由调配你的专属深夜声景'}
              </p>
            )}
          </section>

          {/* 三大核心疗愈功能快捷栏（统一深海冰青与月白视觉体系，零杂色） */}
          <section aria-label="疗愈工具" className="grid grid-cols-3 gap-2">
            <button
              type="button"
              data-testid="open-breath-btn"
              onClick={() => setBreathOpen(true)}
              className="surface-card flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-white/85 transition hover:border-[#7dd3c8]/35 hover:text-white active:scale-[0.97]"
            >
              <Wind className="h-4 w-4 text-[#7dd3c8]" strokeWidth={1.75} />
              <span className="text-[11.5px] font-medium">4-7-8 呼吸</span>
            </button>

            <button
              type="button"
              data-testid="open-timer-btn"
              onClick={() => setTimerOpen(true)}
              className={`surface-card flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition active:scale-[0.97] ${
                remainingSec !== null
                  ? 'border-[#7dd3c8]/50 text-[#c9f6ef]'
                  : 'text-white/85 hover:border-[#7dd3c8]/35 hover:text-white'
              }`}
            >
              <Moon className="h-4 w-4 text-[#7dd3c8]" strokeWidth={1.75} />
              <span className="text-[11.5px] font-medium">
                {remainingSec !== null ? formatCountdown(remainingSec) : '睡眠定时'}
              </span>
            </button>

            <button
              type="button"
              data-testid="open-postcard-btn"
              onClick={() => setPostcardOpen(true)}
              className="surface-card flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-white/85 transition hover:border-[#7dd3c8]/35 hover:text-white active:scale-[0.97]"
            >
              <ImageIcon className="h-4 w-4 text-[#7dd3c8]" strokeWidth={1.75} />
              <span className="text-[11.5px] font-medium">声景明信片</span>
            </button>
          </section>

          {/* 场景预设与自定义混音配方 */}
          <section aria-label="场景预设" className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[11px] font-medium tracking-[0.16em] text-white/55 uppercase">
                场景预设
              </h2>
              <button
                type="button"
                data-testid="save-preset-btn"
                onClick={() => setSaveDialogOpen(true)}
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-[#8de0d6] transition hover:bg-white/5 active:scale-95"
              >
                <BookmarkPlus className="h-3.5 w-3.5" />
                <span>保存配方</span>
              </button>
            </div>

            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
              {allPresets.map((preset) => {
                const isSelected = activePreset?.id === preset.id;
                return (
                  <div
                    key={preset.id}
                    className={`flex shrink-0 items-center rounded-full border transition ${
                      isSelected
                        ? 'border-[#7dd3c8]/60 bg-[#7dd3c8]/18 text-[#e6fbf8] shadow-[0_0_14px_rgba(125,211,200,0.18)]'
                        : 'border-white/10 bg-[#0d1928]/80 text-white/72 hover:bg-white/[0.08]'
                    }`}
                  >
                    <button
                      type="button"
                      data-testid={`preset-${preset.id}`}
                      onClick={() => void handleSelectPreset(preset)}
                      className="flex h-9 items-center px-3.5 text-xs font-medium whitespace-nowrap"
                    >
                      {preset.name}
                    </button>
                    {preset.isCustom && (
                      <button
                        type="button"
                        aria-label={`删除自定义配方 ${preset.name}`}
                        onClick={() => handleDeleteCustomPreset(preset.id, preset.name)}
                        className="mr-1 flex h-7 w-7 items-center justify-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-rose-300"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 2×3 精致声景混音矩阵（告别冗长列表，零 backdrop-filter，丝滑零闪屏） */}
          <section aria-label="环境音轨混音器" className="mt-4 flex-1">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[11px] font-medium tracking-[0.16em] text-white/55 uppercase">
                声景矩阵 · {activeTrackCount} / {TRACKS.length}
              </h2>
              <button
                type="button"
                onClick={handleResetMix}
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-white/45 transition hover:bg-white/5 hover:text-white/80"
              >
                <RotateCcw className="h-3 w-3" />
                <span>清空</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {TRACKS.map((track) => {
                const vol = volumes[track.id] || 0;
                const active = vol > 0.01;
                return (
                  <div
                    key={track.id}
                    className={`surface-card rounded-2xl px-3 pt-2.5 pb-0.5 transition-colors duration-200 ${
                      active ? 'border-white/18' : 'opacity-78'
                    }`}
                    style={
                      active
                        ? {
                            borderColor: `${track.accent}42`,
                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.09), 0 8px 22px -14px rgba(${track.glowRgba.join(
                              ','
                            )}, 0.42)`,
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleTrackMute(track.id)}
                        className="flex min-w-0 items-center gap-2 text-left"
                      >
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-colors"
                          style={{
                            color: active ? track.accent : 'rgba(220,234,242,0.44)',
                            borderColor: active ? `${track.accent}44` : 'rgba(255,255,255,0.08)',
                            backgroundColor: active
                              ? `${track.accent}18`
                              : 'rgba(255,255,255,0.03)',
                          }}
                        >
                          <TrackIcon id={track.id} className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-medium text-white/95">
                            {track.name}
                          </div>
                          <div className="truncate text-[9.5px] tracking-wider text-white/36">
                            {track.enName}
                          </div>
                        </div>
                      </button>

                      <span
                        className="font-mono-timer shrink-0 text-[11px]"
                        style={{ color: active ? track.accent : 'rgba(255,255,255,0.3)' }}
                      >
                        {Math.round(vol * 100)}%
                      </span>
                    </div>

                    {/* 44px 触控热区 + touch-pan-y 方向仲裁防冲突滑块 */}
                    <div className="mt-0.5 px-2">
                      <VolumeSlider
                        value={vol}
                        accent={track.accent}
                        label={track.name}
                        onChange={(next) => handleTrackChange(track.id, next)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 底部极简说明 */}
          <footer className="mt-5 text-center text-[11px] tracking-wider text-white/30">
            纯前端 Web Audio 实时合成 · 零外链静谧疗愈
          </footer>
        </main>
      )}

      {/* 保存自定义配方弹层 */}
      {saveDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="保存自定义混音配方"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/68 px-5 backdrop-blur-md"
          onClick={() => setSaveDialogOpen(false)}
        >
          <form
            onSubmit={handleSaveCustomPreset}
            onClick={(e) => e.stopPropagation()}
            className="glass-panel w-full max-w-[360px] rounded-3xl p-5 text-white"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif-display text-base">保存专属声景配方</h2>
              <button
                type="button"
                onClick={() => setSaveDialogOpen(false)}
                aria-label="关闭保存弹窗"
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/55 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-white/50">
              当前 6 轨音量配比将保存在本机，随时一键唤醒。
            </p>
            <input
              type="text"
              maxLength={10}
              autoFocus
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="例如：深夜自习、秋雨微眠"
              className="mt-3.5 h-11 w-full rounded-2xl border border-white/15 bg-white/[0.06] px-3.5 text-sm text-white placeholder-white/30 focus:border-[#7dd3c8]/60 focus:outline-none"
            />
            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={() => setSaveDialogOpen(false)}
                className="flex h-11 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm text-white/70"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex h-11 flex-1 items-center justify-center rounded-2xl bg-[#7dd3c8] text-sm font-medium text-[#04121b] transition hover:brightness-110"
              >
                保存
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 官方「产品介绍 + 公网二维码」合二为一海报弹窗 */}
      <IntroPosterModal
        open={introPosterOpen}
        onClose={() => setIntroPosterOpen(false)}
      />

      {/* 4-7-8 呼吸疗愈全屏模式 */}
      <BreathModal open={breathOpen} onClose={() => setBreathOpen(false)} />

      {/* 睡眠定时器弹窗 */}
      <TimerModal
        open={timerOpen}
        remainingSec={remainingSec}
        selectedMinutes={selectedMinutes}
        onSelectMinutes={handleSelectSleepTimer}
        onClose={() => setTimerOpen(false)}
      />

      {/* 今日声景明信片海报生成弹窗 */}
      <PostcardModal
        open={postcardOpen}
        presetName={activePreset ? activePreset.name : '专属声景配方'}
        volumes={volumes}
        onClose={() => setPostcardOpen(false)}
      />

      {/* 底部轻提示 Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="glass-pill pointer-events-none fixed bottom-8 left-1/2 z-[60] -translate-x-1/2 rounded-full border-[#7dd3c8]/30 px-4 py-2 text-xs text-[#e3f9f6] shadow-xl"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
