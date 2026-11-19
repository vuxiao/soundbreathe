import QRCode from 'qrcode';
import { PUBLIC_URL, TRACKS, type MixVolumes } from '../config/site';

export interface PostcardOptions {
  moodText: string;
  presetName: string;
  volumes: MixVolumes;
  url?: string;
}

const WEEKDAYS_CN = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const cleaned = text.trim() || '此刻万籁俱寂，唯有呼吸与声息相伴。';
  const lines: string[] = [];
  let current = '';

  for (const ch of Array.from(cleaned)) {
    if (ch === '\n') {
      lines.push(current);
      current = '';
      continue;
    }
    const next = current + ch;
    if (ctx.measureText(next).width > maxWidth && current.length > 0) {
      lines.push(current);
      current = ch;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

/**
 * 纯前端 HTML5 Canvas 生成 1080×1920 高清竖版「今日声景明信片」海报
 * - 包含深海流体背景、日期、混音配方谐波可视化波形、用户心情文案、指向公网的真实二维码
 */
export async function generatePostcardDataUrl(options: PostcardOptions): Promise<string> {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D 上下文不可用');
  }

  const targetUrl = options.url || PUBLIC_URL;
  const activeTracks = TRACKS.filter((t) => (options.volumes[t.id] || 0) > 0.02).sort(
    (a, b) => (options.volumes[b.id] || 0) - (options.volumes[a.id] || 0)
  );

  // 1. 深海静谧背景渐变
  const bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
  bg.addColorStop(0, '#050914');
  bg.addColorStop(0.45, '#091524');
  bg.addColorStop(0.85, '#07111b');
  bg.addColorStop(1, '#04070f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 2. 根据当前混音配方渲染柔和氛围光斑
  const primaryGlow = activeTracks[0]?.glowRgba ?? [100, 198, 212];
  const secondaryGlow = activeTracks[1]?.glowRgba ?? [82, 132, 214];

  const glow1 = ctx.createRadialGradient(W * 0.78, H * 0.2, 20, W * 0.78, H * 0.2, 680);
  glow1.addColorStop(0, `rgba(${primaryGlow[0]}, ${primaryGlow[1]}, ${primaryGlow[2]}, 0.32)`);
  glow1.addColorStop(0.55, `rgba(${primaryGlow[0]}, ${primaryGlow[1]}, ${primaryGlow[2]}, 0.07)`);
  glow1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);

  const glow2 = ctx.createRadialGradient(W * 0.22, H * 0.56, 20, W * 0.22, H * 0.56, 620);
  glow2.addColorStop(0, `rgba(${secondaryGlow[0]}, ${secondaryGlow[1]}, ${secondaryGlow[2]}, 0.24)`);
  glow2.addColorStop(0.6, `rgba(${secondaryGlow[0]}, ${secondaryGlow[1]}, ${secondaryGlow[2]}, 0.04)`);
  glow2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  // 细微星点
  for (let i = 0; i < 65; i++) {
    const sx = ((i * 197 + 43) % 1000) / 1000 * W;
    const sy = ((i * 389 + 71) % 1000) / 1000 * (H * 0.75);
    const sr = 1 + (i % 3) * 0.65;
    ctx.fillStyle = `rgba(220, 242, 248, ${(0.08 + (i % 5) * 0.045).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // 细框线装饰
  drawRoundedRect(ctx, 48, 48, W - 96, H - 96, 44);
  ctx.strokeStyle = 'rgba(205, 232, 244, 0.14)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 3. 顶部日期与品牌眉题
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const weekday = WEEKDAYS_CN[now.getDay()];

  ctx.fillStyle = 'rgba(125, 211, 200, 0.85)';
  ctx.font = '500 26px "SF Mono", Menlo, monospace';
  ctx.fillText(`SOUNDSCAPE POSTCARD  ·  ${yyyy}.${mm}.${dd}`, 104, 152);

  ctx.fillStyle = 'rgba(235, 242, 247, 0.55)';
  ctx.font = '400 28px "PingFang SC", -apple-system, sans-serif';
  ctx.fillText(weekday, 104, 202);

  ctx.fillStyle = '#ebf4f8';
  ctx.font = '600 66px "Songti SC", "STSong", "Noto Serif SC", Georgia, serif';
  ctx.fillText('声息', 104, 304);

  ctx.fillStyle = 'rgba(235, 242, 247, 0.52)';
  ctx.font = '400 28px Georgia, serif';
  ctx.fillText('SoundBreathe', 256, 300);

  // 当前场景胶囊标签
  const tagText = `此刻声景 · ${options.presetName || '自定义配方'}`;
  ctx.font = '400 28px "PingFang SC", -apple-system, sans-serif';
  const tagW = ctx.measureText(tagText).width + 52;
  drawRoundedRect(ctx, 104, 344, tagW, 56, 28);
  ctx.fillStyle = 'rgba(125, 211, 200, 0.14)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(125, 211, 200, 0.32)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#c8f5ee';
  ctx.fillText(tagText, 130, 381);

  // 4. 混音配方声纹波形卡片
  const cardX = 96;
  const cardY = 456;
  const cardW = W - 192;
  const cardH = 490;

  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 36);
  ctx.fillStyle = 'rgba(15, 25, 40, 0.58)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(205, 232, 244, 0.14)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 绘制多层谐波声纹曲线（由 6 轨音量确定性生成）
  const waveCenterY = cardY + 195;
  const waveLeft = cardX + 52;
  const waveWidth = cardW - 104;

  // 中心极细基准线
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(waveLeft, waveCenterY);
  ctx.lineTo(waveLeft + waveWidth, waveCenterY);
  ctx.stroke();

  const tracksToDraw = activeTracks.length > 0 ? activeTracks : [TRACKS[0]];
  tracksToDraw.forEach((track, idx) => {
    const vol = Math.max(0.18, options.volumes[track.id] || 0.25);
    const freqBase = 1.4 + idx * 0.72;
    const phase = idx * 1.15;
    const amp = 26 + vol * 92;

    ctx.beginPath();
    const steps = 160;
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      const x = waveLeft + u * waveWidth;
      // 两端归零的汉宁窗包络，线条优雅舒展
      const env = Math.sin(Math.PI * u);
      const yOffset =
        (Math.sin(u * Math.PI * 2 * freqBase + phase) * 0.65 +
          Math.sin(u * Math.PI * 2 * (freqBase * 2.1) - phase) * 0.35) *
        amp *
        env *
        env;
      const y = waveCenterY + yOffset;
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    const [r, g, b] = track.glowRgba;
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(0.42 + vol * 0.48).toFixed(3)})`;
    ctx.lineWidth = 3.2;
    ctx.stroke();
  });

  // 波形下方展示 6 轨音频能量柱与配比文字
  const barAreaTop = cardY + 338;
  const colW = (cardW - 96) / TRACKS.length;

  TRACKS.forEach((track, i) => {
    const v = options.volumes[track.id] || 0;
    const cx = cardX + 48 + i * colW + colW / 2;

    // 迷你轨道条
    const barW = colW - 26;
    const bx = cx - barW / 2;
    drawRoundedRect(ctx, bx, barAreaTop, barW, 8, 4);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fill();

    if (v > 0.01) {
      drawRoundedRect(ctx, bx, barAreaTop, Math.max(8, barW * v), 8, 4);
      ctx.fillStyle = track.accent;
      ctx.fill();
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = v > 0.01 ? 'rgba(240, 248, 252, 0.92)' : 'rgba(240, 248, 252, 0.34)';
    ctx.font = '400 24px "PingFang SC", -apple-system, sans-serif';
    ctx.fillText(track.name.slice(0, 2), cx, barAreaTop + 46);

    ctx.fillStyle = v > 0.01 ? track.accent : 'rgba(240, 248, 252, 0.25)';
    ctx.font = '400 22px "SF Mono", Menlo, monospace';
    ctx.fillText(`${Math.round(v * 100)}%`, cx, barAreaTop + 82);
  });
  ctx.textAlign = 'left';

  // 5. 当下心情诗意文案区
  const quoteTop = 1048;
  ctx.fillStyle = 'rgba(125, 211, 200, 0.35)';
  ctx.font = '600 92px Georgia, serif';
  ctx.fillText('“', 100, quoteTop + 34);

  ctx.fillStyle = '#f0f6fa';
  ctx.font = '500 44px "Songti SC", "STSong", "Noto Serif SC", Georgia, serif';
  const moodLines = wrapLines(ctx, options.moodText, W - 240, 4);
  moodLines.forEach((line, idx) => {
    ctx.fillText(line, 120, quoteTop + 96 + idx * 72);
  });

  // 优雅分隔线
  ctx.strokeStyle = 'rgba(205, 232, 244, 0.15)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(104, 1468);
  ctx.lineTo(W - 104, 1468);
  ctx.stroke();

  // 6. 底部真实公网二维码与引导区
  const footerY = 1528;
  drawRoundedRect(ctx, 96, footerY, W - 192, 268, 34);
  ctx.fillStyle = 'rgba(15, 26, 42, 0.68)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(205, 232, 244, 0.14)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#ebf4f8';
  ctx.font = '600 36px "Songti SC", "STSong", "Noto Serif SC", Georgia, serif';
  ctx.fillText('扫码聆听此刻声景', 148, footerY + 96);

  ctx.fillStyle = 'rgba(220, 236, 244, 0.62)';
  ctx.font = '400 26px "PingFang SC", -apple-system, sans-serif';
  ctx.fillText('声息 · SoundBreathe  白噪音混音与 4-7-8 呼吸', 148, footerY + 148);

  ctx.fillStyle = 'rgba(125, 211, 200, 0.78)';
  ctx.font = '400 22px "SF Mono", Menlo, monospace';
  ctx.fillText(targetUrl.replace(/^https?:\/\//, ''), 148, footerY + 202);

  // 生成高对比度真实可扫描 QR 码并绘制到右下角白底圆角框中
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, targetUrl, {
    width: 196,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#08111f',
      light: '#ffffff',
    },
  });

  const qrBoxSize = 212;
  const qrBoxX = W - 96 - 32 - qrBoxSize;
  const qrBoxY = footerY + (268 - qrBoxSize) / 2;

  drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 20);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.drawImage(qrCanvas, qrBoxX + 8, qrBoxY + 8, qrBoxSize - 16, qrBoxSize - 16);

  return canvas.toDataURL('image/png', 0.96);
}
