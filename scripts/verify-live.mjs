import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';

const targetUrl = process.argv[2] || 'https://vuxiao.github.io/soundbreathe/';
const screenshotDir = process.argv[3] || '';
const introPosterOutPath = process.argv[4] || path.resolve(process.cwd(), 'product-intro-qr.png');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function decodeQrRegion(pngBuffer, cropX, cropY, cropW, cropH) {
  const fullPng = PNG.sync.read(pngBuffer);
  const cropData = new Uint8ClampedArray(cropW * cropH * 4);
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const srcIdx = ((cropY + y) * fullPng.width + (cropX + x)) * 4;
      const dstIdx = (y * cropW + x) * 4;
      cropData[dstIdx] = fullPng.data[srcIdx];
      cropData[dstIdx + 1] = fullPng.data[srcIdx + 1];
      cropData[dstIdx + 2] = fullPng.data[srcIdx + 2];
      cropData[dstIdx + 3] = fullPng.data[srcIdx + 3];
    }
  }
  return jsQR(cropData, cropW, cropH);
}

console.log(`🔍 开始在 390x844 移动端视口验收线上地址: ${targetUrl}`);

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required'],
});

try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  });

  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  const response = await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
  if (!response) throw new Error('未收到页面响应');
  const status = response.status();
  console.log(`- HTTP 状态码: ${status}`);
  if (status !== 200) throw new Error(`期望 HTTP 200，实际为 ${status}`);

  // 1. 验证首屏「产品介绍页（Intro Cover）」
  await page.getByTestId('intro-cover').waitFor({ state: 'visible', timeout: 6000 });
  const introOverflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  console.log('- 首屏产品介绍页视口宽度:', introOverflow);
  if (introOverflow.scrollWidth > introOverflow.clientWidth) {
    throw new Error(`产品介绍页发现横向溢出: ${JSON.stringify(introOverflow)}`);
  }

  if (screenshotDir) {
    fs.mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({ path: `${screenshotDir}/intro-mobile.png`, fullPage: false });
  }

  // 2. 在介绍页打开「产品介绍二维码海报」，导出 product-intro-qr.png 并用 jsQR 严格解码校验
  await page.getByTestId('open-intro-poster-btn').click();
  const introPosterImg = page.locator('img[alt*="产品介绍二维码海报"]');
  await introPosterImg.waitFor({ state: 'visible', timeout: 10000 });
  const introPosterSrc = await introPosterImg.getAttribute('src');
  if (!introPosterSrc || !introPosterSrc.startsWith('data:image/png;base64,')) {
    throw new Error('产品介绍二维码海报未生成有效 PNG DataURL');
  }

  const introPosterBuf = Buffer.from(
    introPosterSrc.replace(/^data:image\/png;base64,/, ''),
    'base64'
  );
  fs.writeFileSync(introPosterOutPath, introPosterBuf);
  if (screenshotDir) {
    fs.writeFileSync(`${screenshotDir}/product-intro-qr.png`, introPosterBuf);
  }

  // 解码产品介绍海报右下角二维码区域 (qrBoxX=678, qrBoxY=1483, size=264 -> 宽松裁剪 660,1465,300,300)
  const introQr = decodeQrRegion(introPosterBuf, 660, 1465, 300, 300);
  console.log(`- 产品介绍海报二维码解码结果: ${introQr?.data ?? '未识别'}`);
  if (!introQr || introQr.data !== targetUrl) {
    throw new Error(`产品介绍海报内嵌二维码解码不匹配: ${introQr?.data} !== ${targetUrl}`);
  }
  console.log(`- 已导出并验证官方宣传海报: ${introPosterOutPath}`);

  await page.getByRole('button', { name: '关闭产品介绍海报' }).click();
  await page.waitForTimeout(200);

  // 3. 点击主 CTA「戴上耳机 · 步入声息」进入主混音工作台
  await page.getByTestId('enter-app-btn').click();
  await page.getByTestId('mixer-workspace').waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(350);

  // 验证主工作台零横向溢出
  const mixerOverflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  console.log('- 主混音工作台视口宽度:', mixerOverflow);
  if (mixerOverflow.scrollWidth > mixerOverflow.clientWidth) {
    throw new Error(`主混音工作台发现横向溢出: ${JSON.stringify(mixerOverflow)}`);
  }

  // 验证 6 轨音量滑块热区 >= 44px 且配置 touch-pan-y
  const sliderAudit = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="slider"]')).map((el) => ({
      height: Math.round(el.getBoundingClientRect().height),
      touchAction: getComputedStyle(el).touchAction,
    }))
  );
  console.log('- 滑块热区与手势策略:', sliderAudit);
  if (
    sliderAudit.length < 6 ||
    sliderAudit.some((s) => s.height < 44 || !s.touchAction.includes('pan-y'))
  ) {
    throw new Error(`滑块热区或 touch-pan-y 校验失败: ${JSON.stringify(sliderAudit)}`);
  }

  // 4. 专项防闪屏验证：模拟上下快速滑动 + 地址栏小幅高度抖动（不清空 Canvas 缓冲区）
  const canvasBefore = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="ambient-canvas"]');
    const ctx = c.getContext('2d');
    const px = ctx.getImageData(Math.floor(c.width / 2), Math.floor(c.height / 4), 1, 1).data;
    return { w: c.width, h: c.height, rgb: [px[0], px[1], px[2]] };
  });

  // 模拟快速上下滚动
  await page.evaluate(() => {
    window.scrollTo(0, 180);
    window.scrollTo(0, 0);
    window.scrollTo(0, 140);
    window.scrollTo(0, 0);
  });

  // 模拟移动端浏览器地址栏伸缩（高度变化 68px < 160px）
  await page.setViewportSize({ width: 390, height: 776 });
  await page.waitForTimeout(80);
  const canvasDuringSmallResize = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="ambient-canvas"]');
    const ctx = c.getContext('2d');
    const px = ctx.getImageData(Math.floor(c.width / 2), Math.floor(c.height / 4), 1, 1).data;
    return { w: c.width, h: c.height, rgb: [px[0], px[1], px[2]] };
  });

  if (
    canvasDuringSmallResize.w !== canvasBefore.w ||
    canvasDuringSmallResize.h !== canvasBefore.h
  ) {
    throw new Error(
      `地址栏微幅高度抖动触发了 Canvas 尺寸重置: before=${JSON.stringify(canvasBefore)}, after=${JSON.stringify(canvasDuringSmallResize)}`
    );
  }
  if (
    canvasDuringSmallResize.rgb[0] === 0 &&
    canvasDuringSmallResize.rgb[1] === 0 &&
    canvasDuringSmallResize.rgb[2] === 0
  ) {
    throw new Error('地址栏高度抖动后 Canvas 出现纯黑空帧');
  }
  console.log('- 防闪屏校验通过（地址栏小幅高度变化未重设 Canvas 缓冲区，像素稳定非黑）:', canvasDuringSmallResize);

  // 恢复标准视口并确认无毛玻璃堆叠在音轨卡片上
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(100);

  const blurCount = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('main *'));
    return all.filter((el) => {
      const bf = getComputedStyle(el).backdropFilter || getComputedStyle(el).webkitBackdropFilter;
      return bf && bf !== 'none';
    }).length;
  });
  console.log(`- 主工作台活跃 backdrop-filter 节点数（仅顶部胶囊）: ${blurCount}`);
  if (blurCount > 4) {
    throw new Error(`主工作台 backdrop-filter 节点过多 (${blurCount})，存在滚动合成闪屏风险`);
  }

  // 5. 核心功能全流程验收
  const playBtn = page.getByTestId('master-play-btn');
  await playBtn.click();
  await page.waitForTimeout(450);
  if ((await playBtn.getAttribute('aria-label')) !== '暂停环境音') {
    throw new Error('播放按钮未切换为暂停状态');
  }
  if (screenshotDir) {
    await page.screenshot({ path: `${screenshotDir}/home-mobile.png`, fullPage: false });
  }

  // 切换场景预设并保存自定义配方
  await page.getByTestId('preset-seaside-drift').click();
  await page.waitForTimeout(250);
  await page.getByTestId('save-preset-btn').click();
  await page.fill('input[placeholder*="深夜自习"]', '深夜自习');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(250);
  const storedCustom = await page.evaluate(() =>
    localStorage.getItem('soundbreathe.custom_presets.v1')
  );
  if (!storedCustom || !storedCustom.includes('深夜自习')) {
    throw new Error('自定义配方未持久化到 localStorage');
  }
  console.log('- 播放控制、预设切换与自定义配方持久化通过');

  // 验证顶栏重新呼出产品介绍页并返回
  await page.getByTestId('topbar-intro-btn').click();
  await page.getByTestId('intro-cover').waitFor({ state: 'visible', timeout: 4000 });
  await page.getByTestId('enter-app-btn').click();
  await page.getByTestId('mixer-workspace').waitFor({ state: 'visible', timeout: 4000 });
  console.log('- 顶栏重新呼出产品介绍页并切回工作台通过');

  // 4-7-8 呼吸疗愈模式
  await page.getByTestId('open-breath-btn').click();
  await page.waitForTimeout(500);
  if (!(await page.getByRole('dialog', { name: '4-7-8 呼吸疗愈模式' }).isVisible())) {
    throw new Error('4-7-8 呼吸疗愈弹窗未显示');
  }
  if (screenshotDir) {
    await page.screenshot({ path: `${screenshotDir}/breath-mobile.png`, fullPage: false });
  }
  await page.getByRole('button', { name: '退出呼吸疗愈模式' }).click();
  await page.waitForTimeout(200);
  console.log('- 4-7-8 呼吸疗愈全屏模式通过');

  // 睡眠定时 15 分钟
  await page.getByTestId('open-timer-btn').click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: /15m/ }).click();
  await page.waitForTimeout(300);
  const timerText = await page.getByTestId('open-timer-btn').innerText();
  if (!/\d{2}:\d{2}/.test(timerText)) {
    throw new Error(`睡眠定时倒计时未显示: ${timerText}`);
  }
  console.log(`- 睡眠定时器倒计时通过: ${timerText.replace(/\s+/g, ' ')}`);

  // 今日声景明信片及内嵌二维码解码校验
  await page.getByTestId('open-postcard-btn').click();
  const posterImg = page.locator('img[alt*="今日声景明信片海报"]');
  await posterImg.waitFor({ state: 'visible', timeout: 8000 });
  const posterSrc = await posterImg.getAttribute('src');
  const posterBuf = Buffer.from(posterSrc.replace(/^data:image\/png;base64,/, ''), 'base64');
  const postcardQr = decodeQrRegion(posterBuf, 720, 1540, 260, 260);
  console.log(`- 声景明信片内嵌二维码解码结果: ${postcardQr?.data ?? '未识别'}`);
  if (!postcardQr || postcardQr.data !== targetUrl) {
    throw new Error(`声景明信片二维码解码不匹配: ${postcardQr?.data}`);
  }
  await page.getByRole('button', { name: '关闭明信片' }).click();

  if (consoleErrors.length > 0 || pageErrors.length > 0) {
    throw new Error(
      `发现运行时错误: consoleErrors=${JSON.stringify(consoleErrors)}, pageErrors=${JSON.stringify(pageErrors)}`
    );
  }

  console.log('✅ 所有线上 390x844 移动端全量验收检查（含防闪屏、介绍页与海报二维码）全部通过！');
} finally {
  await browser.close();
}
