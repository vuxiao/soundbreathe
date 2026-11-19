import React from 'react';
import { AudioLines, Headphones, Moon, QrCode, Wind } from 'lucide-react';

interface IntroCoverProps {
  onEnter: () => void;
  onOpenPoster: () => void;
}

const FEATURES = [
  {
    icon: AudioLines,
    title: '6 轨实时声学合成',
    desc: '纯 Web Audio 演算雨落、潮汐、炉火与深空，零外链秒开',
  },
  {
    icon: Wind,
    title: '4-7-8 呼吸光球节律',
    desc: '跟随视觉缩放平复睡前焦虑，找回绵长稳定的呼吸频率',
  },
  {
    icon: Moon,
    title: '睡眠渐弱与声景明信片',
    desc: '定时温柔淡出入眠，把今夜声景与心情印成分享海报',
  },
];

export const IntroCover: React.FC<IntroCoverProps> = ({ onEnter, onOpenPoster }) => {
  return (
    <div
      data-testid="intro-cover"
      className="animate-view-in relative z-10 flex min-h-[100dvh] w-full max-w-[430px] flex-col justify-between px-5 sm:my-6 sm:min-h-[calc(100dvh-48px)] sm:rounded-[38px] sm:border sm:border-white/12 sm:bg-[#070d18]/48 sm:shadow-[0_24px_80px_rgba(0,0,0,0.75)]"
      style={{
        paddingTop: 'max(22px, var(--safe-top))',
        paddingBottom: 'max(24px, var(--safe-bottom))',
      }}
    >
      {/* 顶部眉题与呼吸星环徽章 */}
      <div className="flex flex-col items-center pt-1 text-center">
        <p className="font-mono-timer text-[10px] tracking-[0.28em] text-[#7dd3c8]/85 uppercase">
          PURE WEB AUDIO · MINDFULNESS
        </p>

        {/* 动态呼吸水波星环徽章 */}
        <div className="relative mt-5 flex h-[112px] w-[112px] items-center justify-center">
          <div className="animate-orb-breathe pointer-events-none absolute inset-0 rounded-full border border-[#7dd3c8]/22" />
          <div className="animate-slow-rotate pointer-events-none absolute inset-2 rounded-full border border-dashed border-[#7dd3c8]/30" />
          <div className="relative flex h-[66px] w-[66px] items-center justify-center rounded-full border border-[#c6f3ec]/35 bg-gradient-to-br from-[#7dd3c8]/26 via-[#1a4358]/55 to-[#091523]/90 shadow-[0_0_32px_rgba(125,211,200,0.28),inset_0_1px_12px_rgba(255,255,255,0.18)]">
            <div className="flex h-6 items-center gap-[3.5px]" aria-hidden="true">
              {[0.38, 0.72, 1, 0.68, 0.36].map((h, i) => (
                <span
                  key={i}
                  className="w-[2.5px] rounded-full bg-[#e9faf7]"
                  style={{ height: `${Math.round(h * 22)}px`, opacity: 0.65 + h * 0.35 }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 衬线大标题与核心副标 */}
        <h1 className="font-serif-display mt-5 text-[34px] font-medium tracking-[0.2em] text-white">
          声息
        </h1>
        <p className="mt-0.5 text-xs font-light tracking-[0.34em] text-[#9de0d7]/75 uppercase">
          SoundBreathe
        </p>
        <p className="mt-3 max-w-[300px] text-[13px] leading-relaxed text-white/65">
          把深夜的喧嚣关在门外，只留呼吸与万物声景
        </p>
      </div>

      {/* 三大核心亮点微卡片 */}
      <section aria-label="产品亮点" className="my-5 flex flex-col gap-2.5">
        {FEATURES.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="surface-card flex items-start gap-3.5 rounded-2xl px-4 py-3.5"
            >
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#7dd3c8]/28 bg-[#7dd3c8]/12 text-[#7dd3c8]">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
              </div>
              <div className="min-w-0">
                <h2 className="text-[13.5px] font-medium tracking-wide text-white/95">
                  {item.title}
                </h2>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-white/52">
                  {item.desc}
                </p>
              </div>
            </div>
          );
        })}
      </section>

      {/* 底部行动按钮区 */}
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          data-testid="enter-app-btn"
          onClick={onEnter}
          className="flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#72ccc1] via-[#8ad9cf] to-[#98ddd5] text-[14px] font-medium tracking-wider text-[#05141e] shadow-[0_10px_30px_-8px_rgba(125,211,200,0.52)] transition hover:brightness-105 active:scale-[0.985]"
        >
          <Headphones className="h-4 w-4" strokeWidth={2.1} />
          <span>戴上耳机 · 步入声息</span>
        </button>

        <button
          type="button"
          data-testid="open-intro-poster-btn"
          onClick={onOpenPoster}
          className="surface-card flex h-[44px] w-full items-center justify-center gap-2 rounded-2xl text-xs font-medium tracking-wide text-[#c8ece7] transition hover:border-[#7dd3c8]/35 hover:text-white active:scale-[0.985]"
        >
          <QrCode className="h-3.5 w-3.5 text-[#7dd3c8]" />
          <span>获取产品介绍二维码图</span>
        </button>
      </div>
    </div>
  );
};
