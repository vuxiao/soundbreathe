import React, { useEffect, useState } from 'react';
import { Download, QrCode, X } from 'lucide-react';
import { PUBLIC_URL } from '../config/site';
import { generateIntroPosterDataUrl } from '../utils/introPosterCanvas';

interface IntroPosterModalProps {
  open: boolean;
  onClose: () => void;
}

export const IntroPosterModal: React.FC<IntroPosterModalProps> = ({ open, onClose }) => {
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || posterUrl) return;
    let active = true;
    setLoading(true);
    generateIntroPosterDataUrl(PUBLIC_URL)
      .then((dataUrl) => {
        if (active) setPosterUrl(dataUrl);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, posterUrl]);

  if (!open) return null;

  const handleDownload = () => {
    if (!posterUrl) return;
    const link = document.createElement('a');
    link.href = posterUrl;
    link.download = 'soundbreathe-product-intro-qr.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="产品介绍二维码海报"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 px-4 backdrop-blur-md"
      style={{
        paddingTop: 'max(16px, var(--safe-top))',
        paddingBottom: 'max(16px, var(--safe-bottom))',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel flex max-h-[90dvh] w-full max-w-[400px] flex-col overflow-hidden rounded-3xl text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-[#7dd3c8]" />
            <h2 className="font-serif-display text-base tracking-wide">产品介绍二维码海报</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭产品介绍海报"
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="no-scrollbar flex flex-1 flex-col items-center overflow-y-auto px-5 py-4">
          <div className="relative w-full max-w-[272px] overflow-hidden rounded-2xl border border-white/15 bg-[#050914] shadow-2xl">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt="声息 SoundBreathe 产品介绍二维码海报，长按可保存分享"
                className="block aspect-[9/16] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[9/16] w-full items-center justify-center text-xs text-white/50">
                {loading ? '正在绘制高清海报…' : '准备中…'}
              </div>
            )}
          </div>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-white/50">
            微信或手机浏览器可直接长按海报保存并分享给好友，
            <br />
            或点击下方按钮下载 1080×1920 高清原图
          </p>
        </div>

        <div className="border-t border-white/10 px-5 py-3.5">
          <button
            type="button"
            disabled={!posterUrl || loading}
            onClick={handleDownload}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#7dd3c8] to-[#9cdbd3] text-sm font-medium text-[#05141f] shadow-lg transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>保存高清介绍海报</span>
          </button>
        </div>
      </div>
    </div>
  );
};
