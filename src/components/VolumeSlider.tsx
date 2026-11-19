import React, { useCallback, useRef } from 'react';

interface VolumeSliderProps {
  value: number; // 0 ~ 1
  accent: string;
  label: string;
  onChange: (next: number) => void;
}

type GestureMode = 'idle' | 'pending' | 'drag' | 'scroll';

/**
 * 移动端高顺滑度触控音量滑块
 * - 触控热区高度固定 44px
 * - 使用 touch-pan-y + 方向意图仲裁，不抢占纵向页面滚动
 * - 仅在水平拖拽或原地轻点（Tap）时更新音量
 */
export const VolumeSlider: React.FC<VolumeSliderProps> = ({
  value,
  accent,
  label,
  onChange,
}) => {
  const railRef = useRef<HTMLDivElement | null>(null);
  const gestureRef = useRef<{
    mode: GestureMode;
    pointerId: number | null;
    startX: number;
    startY: number;
  }>({
    mode: 'idle',
    pointerId: null,
    startX: 0,
    startY: 0,
  });

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
    // 鼠标操作直接进入拖拽，触摸操作进入方向仲裁以放行纵向滚动
    if (e.pointerType === 'mouse') {
      gestureRef.current = {
        mode: 'drag',
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
      updateFromClientX(e.clientX);
      return;
    }

    gestureRef.current = {
      mode: 'pending',
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (g.pointerId !== e.pointerId) return;

    if (g.mode === 'scroll' || g.mode === 'idle') return;

    if (g.mode === 'pending') {
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      // 优先识别纵向滑动，立即放行给浏览器滚动
      if (absY > 6 && absY >= absX) {
        g.mode = 'scroll';
        return;
      }

      // 确认水平拖拽意图后再捕获指针并更新音量
      if (absX > 6 && absX > absY) {
        g.mode = 'drag';
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // 忽略部分旧 WebKit 捕获异常
        }
        updateFromClientX(e.clientX);
      }
      return;
    }

    if (g.mode === 'drag') {
      updateFromClientX(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (g.pointerId !== e.pointerId) return;

    if (g.mode === 'pending') {
      // 原地轻点（Tap）直达目标音量
      updateFromClientX(e.clientX);
    } else if (g.mode === 'drag' && e.currentTarget.hasPointerCapture(e.pointerId)) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // 忽略释放异常
      }
    }

    gestureRef.current = { mode: 'idle', pointerId: null, startX: 0, startY: 0 };
  };

  const handlePointerCancel = () => {
    gestureRef.current = { mode: 'idle', pointerId: null, startX: 0, startY: 0 };
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
      onPointerCancel={handlePointerCancel}
      onKeyDown={handleKeyDown}
      className="group relative flex h-11 min-h-[44px] w-full cursor-pointer touch-pan-y items-center select-none focus:outline-none"
    >
      {/* 底层轨道 */}
      <div className="relative h-[5px] w-full overflow-hidden rounded-full bg-white/10">
        {/* 已激活音量流光填充 */}
        <div
          className="h-full rounded-full transition-[width] duration-75 ease-out"
          style={{
            width: `${percent}%`,
            background: `linear-gradient(90deg, ${accent}55 0%, ${accent} 100%)`,
            boxShadow: value > 0 ? `0 0 10px ${accent}78` : 'none',
          }}
        />
      </div>

      {/* 精致月白光泽圆点手柄 */}
      <div
        className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-150 group-active:scale-125"
        style={{ left: `${percent}%` }}
      >
        <div
          className="h-4 w-4 rounded-full border border-white/65 shadow-md"
          style={{
            backgroundColor: value > 0 ? '#eef7fa' : 'rgba(182, 202, 216, 0.42)',
            boxShadow:
              value > 0
                ? `0 0 0 3.5px ${accent}28, 0 2px 8px rgba(0, 0, 0, 0.5)`
                : '0 2px 6px rgba(0, 0, 0, 0.45)',
          }}
        />
      </div>
    </div>
  );
};
