import React, { useEffect, useState } from 'react';
import { Download, Sparkles, X } from 'lucide-react';
import { MOOD_SUGGESTIONS, PUBLIC_URL, type MixVolumes } from '../config/site';
import { generatePostcardDataUrl } from '../utils/postcardCanvas';

interface PostcardModalProps {
  open: boolean;
  presetName: string;
  volumes: MixVolumes;
  onClose: () => void;
}

export const PostcardModal: React.FC<PostcardModalProps> = ({
  open,
  presetName,
  volumes,
  onClose,
}) => {
  const [moodText, setMoodText] = useState(MOOD_SUGGESTIONS[0]);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async (textOverride?: string) => {
    setGenerating(true);
    try {
      const dataUrl = await generatePostcardDataUrl({
        moodText: textOverride ?? moodText,
        presetName,
        volumes,
        url: PUBLIC_URL,
      });
      setPosterUrl(dataUrl);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (open) {
      void handleGenerate(moodText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const handleDownload = () => {
    if (!posterUrl) return;
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = posterUrl;
    link.download = `soundbreathe-postcard-${dateStamp}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="今日声景明信片"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 px-4 backdrop-blur-md"
      style={{
        paddingTop: 'max(16px, var(--safe-top))',
        paddingBottom: 'max(16px, var(--safe-bottom))',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel flex max-h-[90dvh] w-full max-w-[404px] flex-col overflow-hidden rounded-3xl text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部栏 */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#7dd3c8]" />
            <h2 className="font-serif-display text-base tracking-wide">今日声景明信片</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭明信片"
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 内容滚动区 */}
        <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-4">
          {/* 心情输入 */}
          <label className="block text-xs text-white/60" htmlFor="mood-input">
            写一句此刻心情（自动印入明信片）
          </label>
          <textarea
            id="mood-input"
            rows={2}
            maxLength={64}
            value={moodText}
            onChange={(e) => setMoodText(e.target.value)}
            placeholder="今晚想对自己说点什么……"
            className="mt-2 w-full resize-none rounded-2xl border border-white/12 bg-white/[0.05] px-3.5 py-2.5 text-sm leading-relaxed text-white placeholder-white/30 focus:border-[#7dd3c8]/50 focus:outline-none"
          />

          {/* 快捷灵感语句 */}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {MOOD_SUGGESTIONS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setMoodText(item);
                  void handleGenerate(item);
                }}
                className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/65 transition hover:border-[#7dd3c8]/40 hover:text-white"
              >
                灵感 {idx + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void handleGenerate()}
              className="ml-auto rounded-full border border-[#7dd3c8]/40 bg-[#7dd3c8]/15 px-3 py-1 text-[11px] font-medium text-[#c9f6ef] transition hover:bg-[#7dd3c8]/25 active:scale-95"
            >
              {generating ? '绘制中…' : '刷新明信片'}
            </button>
          </div>

          {/* 竖版海报高清预览 */}
          <div className="mt-4 flex flex-col items-center">
            <div className="relative w-full max-w-[264px] overflow-hidden rounded-2xl border border-white/15 bg-[#060a14] shadow-2xl">
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt="今日声景明信片海报，长按可保存分享"
                  className="block aspect-[9/16] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[9/16] w-full items-center justify-center text-xs text-white/45">
                  正在绘制声景明信片…
                </div>
              )}
            </div>
            <p className="mt-2.5 text-center text-[11px] text-white/45">
              手机端可直接长按上方海报保存分享，或点击下方按钮下载原图
            </p>
          </div>
        </div>

        {/* 底部保存按钮 */}
        <div className="border-t border-white/10 px-5 py-3.5">
          <button
            type="button"
            disabled={!posterUrl || generating}
            onClick={handleDownload}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#5ec2b7] to-[#689bd8] text-sm font-medium text-[#04101a] shadow-lg transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>保存高清明信片</span>
          </button>
        </div>
      </div>
    </div>
  );
};
