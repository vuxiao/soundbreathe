import React from 'react';
import { Moon, X } from 'lucide-react';

interface TimerModalProps {
  open: boolean;
  remainingSec: number | null;
  selectedMinutes: number | null;
  onSelectMinutes: (minutes: number | null) => void;
  onClose: () => void;
}

const TIMER_OPTIONS = [
  { minutes: 15, label: '15 分钟', desc: '小憩片刻' },
  { minutes: 30, label: '30 分钟', desc: '睡前冥想' },
  { minutes: 60, label: '60 分钟', desc: '深沉入眠' },
];

export function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const TimerModal: React.FC<TimerModalProps> = ({
  open,
  remainingSec,
  selectedMinutes,
  onSelectMinutes,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="睡眠定时器"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 px-4 backdrop-blur-md sm:items-center"
      style={{ paddingBottom: 'max(16px, var(--safe-bottom))' }}
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-[396px] rounded-3xl p-5 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7dd3c8]/15 text-[#7dd3c8]">
              <Moon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-serif-display text-base tracking-wide text-white">睡眠定时</h2>
              <p className="text-[11px] text-white/50">结束前 10 秒自动平滑淡出并暂停</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="关闭睡眠定时"
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 当前倒计时状态 */}
        {remainingSec !== null && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-[#7dd3c8]/25 bg-[#7dd3c8]/10 px-4 py-3">
            <div>
              <p className="text-xs text-[#a9e8df]">定时进行中</p>
              <p className="text-[11px] text-white/55">
                {remainingSec <= 10 ? '正在平滑淡出音量…' : '到点前 10 秒开始渐弱'}
              </p>
            </div>
            <span className="font-mono-timer text-2xl font-light text-white">
              {formatCountdown(remainingSec)}
            </span>
          </div>
        )}

        {/* 时长选项 */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {TIMER_OPTIONS.map((opt) => {
            const active = selectedMinutes === opt.minutes && remainingSec !== null;
            return (
              <button
                key={opt.minutes}
                type="button"
                onClick={() => {
                  onSelectMinutes(opt.minutes);
                  onClose();
                }}
                className={`flex min-h-[78px] flex-col items-center justify-center rounded-2xl border px-2 py-3 transition active:scale-95 ${
                  active
                    ? 'border-[#7dd3c8]/60 bg-[#7dd3c8]/18 text-white shadow-[0_0_20px_rgba(125,211,200,0.18)]'
                    : 'border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]'
                }`}
              >
                <span className="font-mono-timer text-lg font-medium">{opt.minutes}m</span>
                <span className="mt-0.5 text-[11px] text-white/55">{opt.desc}</span>
              </button>
            );
          })}
        </div>

        {/* 取消按钮 */}
        <button
          type="button"
          onClick={() => {
            onSelectMinutes(null);
            onClose();
          }}
          className="mt-4 flex h-11 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm text-white/70 transition hover:bg-white/[0.09] hover:text-white active:scale-[0.99]"
        >
          {remainingSec !== null ? '取消定时，持续播放' : '保持常亮播放'}
        </button>
      </div>
    </div>
  );
};
