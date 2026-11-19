import QRCode from 'qrcode';
import { PUBLIC_URL } from '../config/site';

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

const HIGHLIGHTS = [
  {
    index: '01',
    title: '6 轨实时声学合成',
    desc: '纯前端 Web Audio 实时演算雨落、潮汐、炉火与深空，零外链秒开',
  },
  {
    index: '02',
    title: '4-7-8 呼吸光球节律',
    desc: '全屏沉浸式光球呼吸引导，吸气 4s · 屏息 7s · 呼气 8s 平复焦虑',
  },
  {
    index: '03',
    title: '睡眠渐弱与声景明信片',
    desc: '15/30/60 分钟温柔淡出入眠，一键生成今夜专属声景纪念海报',
  },
];

/**
 * 渲染 1080×1920 高清竖版「声息 · SoundBreathe」产品介绍 + 公网二维码合二为一官方海报
 */
export async function generateIntroPosterDataUrl(url = PUBLIC_URL): Promise<string> {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D 上下文不可用');
  }

  // 1. 深海静谧渐变底色
  const bg = ctx.createLinearGradient(0, 0, W * 0.35, H);
  bg.addColorStop(0, '#050914');
  bg.addColorStop(0.42, '#081423');
  bg.addColorStop(0.82, '#07111c');
  bg.addColorStop(1, '#040811');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 2. 深海冰青流光氛围光晕
  const glowTop = ctx.createRadialGradient(W * 0.5, H * 0.16, 20, W * 0.5, H * 0.16, 620);
  glowTop.addColorStop(0, 'rgba(125, 211, 200, 0.28)');
  glowTop.addColorStop(0.52, 'rgba(58, 128, 168, 0.09)');
  glowTop.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowTop;
  ctx.fillRect(0, 0, W, H);

  const glowMid = ctx.createRadialGradient(W * 0.16, H * 0.62, 10, W * 0.16, H * 0.62, 540);
  glowMid.addColorStop(0, 'rgba(84, 152, 198, 0.18)');
  glowMid.addColorStop(0.6, 'rgba(42, 92, 132, 0.04)');
  glowMid.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowMid;
  ctx.fillRect(0, 0, W, H);

  const glowBottom = ctx.createRadialGradient(W * 0.85, H * 0.85, 10, W * 0.85, H * 0.85, 500);
  glowBottom.addColorStop(0, 'rgba(125, 211, 200, 0.16)');
  glowBottom.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowBottom;
  ctx.fillRect(0, 0, W, H);

  // 3. 细腻星尘微粒
  for (let i = 0; i < 82; i++) {
    const sx = (((i * 223 + 61) % 1000) / 1000) * W;
    const sy = (((i * 419 + 89) % 1000) / 1000) * H;
    const sr = 1 + (i % 3) * 0.6;
    ctx.fillStyle = `rgba(218, 242, 248, ${(0.07 + (i % 5) * 0.042).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. 精致双层极细画框
  drawRoundedRect(ctx, 44, 44, W - 88, H - 88, 44);
  ctx.strokeStyle = 'rgba(202, 234, 244, 0.14)';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawRoundedRect(ctx, 60, 60, W - 120, H - 120, 34);
  ctx.strokeStyle = 'rgba(125, 211, 200, 0.07)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 5. 顶部眉题
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(125, 211, 200, 0.86)';
  ctx.font = '500 24px "SF Mono", Menlo, monospace';
  ctx.fillText('PURE WEB AUDIO  ·  MINDFULNESS', W / 2, 146);

  // 6. 中央呼吸水波星环徽章
  const emblemX = W / 2;
  const emblemY = 278;

  // 外虚线星轨
  ctx.save();
  ctx.setLineDash([7, 9]);
  ctx.strokeStyle = 'rgba(125, 211, 200, 0.34)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(emblemX, emblemY, 84, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 中层柔和细环
  ctx.strokeStyle = 'rgba(220, 244, 248, 0.18)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(emblemX, emblemY, 64, 0, Math.PI * 2);
  ctx.stroke();

  // 核心光球
  const orbGrad = ctx.createRadialGradient(
    emblemX - 14,
    emblemY - 14,
    6,
    emblemX,
    emblemY,
    46
  );
  orbGrad.addColorStop(0, 'rgba(218, 250, 246, 0.58)');
  orbGrad.addColorStop(0.55, 'rgba(110, 202, 196, 0.28)');
  orbGrad.addColorStop(1, 'rgba(15, 36, 56, 0.82)');
  ctx.fillStyle = orbGrad;
  ctx.beginPath();
  ctx.arc(emblemX, emblemY, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(180, 238, 232, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 核心极简 5 条声纹竖线
  const barHeights = [14, 28, 40, 26, 14];
  barHeights.forEach((bh, idx) => {
    const bx = emblemX + (idx - 2) * 11;
    drawRoundedRect(ctx, bx - 2.2, emblemY - bh / 2, 4.4, bh, 2.2);
    ctx.fillStyle = '#ebf9f7';
    ctx.fill();
  });

  // 7. 品牌主标题与诗意定位
  ctx.fillStyle = '#f2f8fb';
  ctx.font = '600 92px "Songti SC", "STSong", "Noto Serif SC", Georgia, serif';
  ctx.fillText('声  息', W / 2, 476);

  ctx.fillStyle = 'rgba(158, 222, 214, 0.78)';
  ctx.font = '400 32px Georgia, "Times New Roman", serif';
  ctx.fillText('S O U N D B R E A T H E', W / 2, 530);

  ctx.fillStyle = 'rgba(228, 240, 246, 0.72)';
  ctx.font = '400 32px "PingFang SC", -apple-system, sans-serif';
  ctx.fillText('把深夜的喧嚣关在门外，只留呼吸与万物声景', W / 2, 608);

  // 8. 优雅多层声纹曲线装饰
  const waveY = 716;
  const waveLeft = 116;
  const waveWidth = W - 232;
  const waveLayers = [
    { freq: 1.8, phase: 0.2, amp: 52, color: 'rgba(125, 211, 200, 0.72)', width: 3 },
    { freq: 2.7, phase: 1.5, amp: 34, color: 'rgba(164, 218, 240, 0.45)', width: 2.2 },
    { freq: 1.25, phase: 2.6, amp: 26, color: 'rgba(235, 246, 250, 0.25)', width: 1.6 },
  ];

  // 中心细基准线
  ctx.strokeStyle = 'rgba(205, 232, 244, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(waveLeft, waveY);
  ctx.lineTo(waveLeft + waveWidth, waveY);
  ctx.stroke();

  waveLayers.forEach((layer) => {
    ctx.beginPath();
    const steps = 180;
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      const x = waveLeft + u * waveWidth;
      const env = Math.sin(Math.PI * u);
      const y =
        waveY +
        (Math.sin(u * Math.PI * 2 * layer.freq + layer.phase) * 0.7 +
          Math.sin(u * Math.PI * 2 * layer.freq * 1.9 - layer.phase) * 0.3) *
          layer.amp *
          env *
          env;
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = layer.color;
    ctx.lineWidth = layer.width;
    ctx.stroke();
  });

  // 9. 三大核心功能看点卡片
  ctx.textAlign = 'left';
  const cardX = 100;
  const cardW = W - 200;
  const cardH = 166;
  const cardGap = 28;
  const startY = 824;

  HIGHLIGHTS.forEach((item, idx) => {
    const y = startY + idx * (cardH + cardGap);

    drawRoundedRect(ctx, cardX, y, cardW, cardH, 30);
    const cardBg = ctx.createLinearGradient(cardX, y, cardX + cardW, y + cardH);
    cardBg.addColorStop(0, 'rgba(19, 34, 52, 0.78)');
    cardBg.addColorStop(1, 'rgba(10, 19, 32, 0.88)');
    ctx.fillStyle = cardBg;
    ctx.fill();

    ctx.strokeStyle = 'rgba(196, 232, 244, 0.13)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 左侧序号徽章
    drawRoundedRect(ctx, cardX + 34, y + 44, 78, 78, 22);
    ctx.fillStyle = 'rgba(125, 211, 200, 0.14)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(125, 211, 200, 0.36)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#a2ebe1';
    ctx.font = '500 30px "SF Mono", Menlo, monospace';
    ctx.fillText(item.index, cardX + 34 + 39, y + 94);

    // 右侧标题与副文案
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f0f7fa';
    ctx.font = '600 34px "PingFang SC", -apple-system, sans-serif';
    ctx.fillText(item.title, cardX + 140, y + 74);

    ctx.fillStyle = 'rgba(218, 234, 244, 0.66)';
    ctx.font = '400 24px "PingFang SC", -apple-system, sans-serif';
    ctx.fillText(item.desc, cardX + 140, y + 122);
  });

  // 10. 底部高对比度公网二维码与扫码引导区
  const footerY = 1446;
  const footerH = 338;

  drawRoundedRect(ctx, 100, footerY, W - 200, footerH, 36);
  const footBg = ctx.createLinearGradient(100, footerY, W - 100, footerY + footerH);
  footBg.addColorStop(0, 'rgba(17, 32, 50, 0.86)');
  footBg.addColorStop(1, 'rgba(9, 17, 30, 0.94)');
  ctx.fillStyle = footBg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(125, 211, 200, 0.25)';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // 左侧扫码引导
  const leftTextX = 148;
  drawRoundedRect(ctx, leftTextX, footerY + 46, 214, 46, 23);
  ctx.fillStyle = 'rgba(125, 211, 200, 0.16)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(125, 211, 200, 0.35)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = '#b9f2ea';
  ctx.font = '500 22px "PingFang SC", -apple-system, sans-serif';
  ctx.fillText('免费开放 · 免登录', leftTextX + 22, footerY + 77);

  ctx.fillStyle = '#f2f8fb';
  ctx.font = '600 38px "Songti SC", "STSong", "Noto Serif SC", Georgia, serif';
  ctx.fillText('微信 / 相机扫码', leftTextX, footerY + 152);

  ctx.fillStyle = '#9ce6dc';
  ctx.font = '500 30px "PingFang SC", -apple-system, sans-serif';
  ctx.fillText('即刻免费聆听深夜声景', leftTextX, footerY + 206);

  ctx.fillStyle = 'rgba(210, 230, 240, 0.52)';
  ctx.font = '400 22px "SF Mono", Menlo, monospace';
  ctx.fillText(url.replace(/^https?:\/\//, ''), leftTextX, footerY + 266);

  // 右侧白底圆角真实二维码（高对比度、充足白边）
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, url, {
    width: 244,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#060c18',
      light: '#ffffff',
    },
  });

  const qrBoxSize = 264;
  const qrBoxX = W - 100 - 38 - qrBoxSize;
  const qrBoxY = footerY + (footerH - qrBoxSize) / 2;

  drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 24);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.drawImage(qrCanvas, qrBoxX + 10, qrBoxY + 10, qrBoxSize - 20, qrBoxSize - 20);

  // 极简页脚落款
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(215, 234, 244, 0.34)';
  ctx.font = '400 22px "PingFang SC", -apple-system, sans-serif';
  ctx.fillText('声息 · SoundBreathe  |  纯前端实时声学合成与 4-7-8 呼吸疗愈', W / 2, 1832);

  return canvas.toDataURL('image/png', 0.96);
}
