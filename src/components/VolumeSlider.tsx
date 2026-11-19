import React, { useCallback, useRef } from 'react';

interface VolumeSliderProps {
  value: number; // 0 ~ 1
  accent: string;
  label: string;
  onChange: (next: number) => void;
}

/**
 * 移动端高顺滑度触控音量滑块
 * - 触控热区高度固定 44px（满足移动端无障碍与手指触控规范）
 * - 支持 Pointer 拖拽、点击直达以及键盘方向键微调
 */
export const VolumeSlider: React.FC<VolumeSliderProps> = ({
  value,
  accent,
  label,
  onChange,
}) => {
  const railRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const rail = railRef.current;
      if (!rail) return;
      const rect = rail.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const snapped = ratio < 0.02 ? 0 : Math.round(ratio * 100) / 100;
      onChange(snapped);
    },
    [onChange]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(1, Math.round((value + 0.05) * 100) / 100));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(0, Math.round((value - 0.05) * 100) / 100));
    }
  };

  const percent = Math.round(value * 100);

  return (
    <div
      ref={railRef}
      role="slider"
      tabIndex={0}
      aria-label={`${label}音量`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      className="group relative flex h-11 min-h-[44px] w-full cursor-pointer touch-none items-center select-none focus:outline-none"
    >
      {/* 底层轨道 */}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        {/* 已激活音量填充 */}
        <div
          className="h-full rounded-full transition-[width] duration-75 ease-out"
          style={{
            width: `${percent}%`,
            background: `linear-gradient(90deg, ${accent}66 0%, ${accent} 100%)`,
            boxShadow: value > 0 ? `0 0 12px ${accent}80` : 'none',
          }}
        />
      </div>

      {/* 玻璃光泽拖拽手柄 */}
      <div
        className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-150 group-active:scale-125"
        style={{ left: `${percent}%` }}
      >
        <div
          className="h-5 w-5 rounded-full border border-white/60 shadow-lg"
          style={{
            backgroundColor: value > 0 ? '#ebf6f9' : 'rgba(180, 200, 215, 0.45)',
            boxShadow:
              value > 0
                ? `0 0 0 4px ${accent}26, 0 2px 10px rgba(0, 0, 0, 0.55)`
                : '0 2px 8px rgba(0, 0, 0, 0.45)',
          }}
        />
      </div>
    </div>
  );
};
