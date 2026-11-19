import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';

const targetUrl = process.argv[2] || 'https://vuxiao.github.io/soundbreathe/';
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

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
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  const response = await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
  if (!response) throw new Error('未收到页面响应');
  const status = response.status();
  console.log(`- HTTP 状态码: ${status}`);
  if (status !== 200) throw new Error(`期望 HTTP 200，实际为 ${status}`);

  // 检查横向溢出
  const overflowInfo = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    innerWidth: window.innerWidth,
  }));
  console.log(`- 视口宽度检查:`, overflowInfo);
  if (overflowInfo.scrollWidth > overflowInfo.clientWidth) {
    throw new Error(`发现横向溢出: scrollWidth=${overflowInfo.scrollWidth} > clientWidth=${overflowInfo.clientWidth}`);
  }

  // 检查 6 个音量滑块触控热区 >= 44px
  const sliderHeights = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="slider"]')).map((el) =>
      Math.round(el.getBoundingClientRect().height)
    )
  );
  console.log(`- 滑块数量与热区高度(px):`, sliderHeights);
  if (sliderHeights.length < 6 || sliderHeights.some((h) => h < 44)) {
    throw new Error(`滑块数量不足或热区小于 44px: ${JSON.stringify(sliderHeights)}`);
  }

  // 1. 点击播放按钮
  const playBtn = page.getByTestId('master-play-btn');
  await playBtn.click();
  await page.waitForTimeout(450);
  const playLabelAfter = await playBtn.getAttribute('aria-label');
  console.log(`- 点击播放后按钮状态: ${playLabelAfter}`);
  if (playLabelAfter !== '暂停环境音') {
    throw new Error(`播放按钮未切换状态: ${playLabelAfter}`);
  }

  // 2. 切换场景预设「海边发呆」
  await page.getByTestId('preset-seaside-drift').click();
  await page.waitForTimeout(300);

  // 3. 保存自定义配方到 localStorage
  await page.getByTestId('save-preset-btn').click();
  await page.fill('input[placeholder*="深夜自习"]', '深夜自习');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(250);
  const storedCustom = await page.evaluate(() =>
    localStorage.getItem('soundbreathe.custom_presets.v1')
  );
  if (!storedCustom || !storedCustom.includes('深夜自习')) {
    throw new Error('自定义配方未能正确持久化至 localStorage');
  }
  console.log('- 自定义配方 localStorage 持久化通过');

  // 4. 打开 4-7-8 呼吸疗愈模式并验证
  await page.getByTestId('open-breath-btn').click();
  await page.waitForTimeout(400);
  const breathDialogVisible = await page.getByRole('dialog', { name: '4-7-8 呼吸疗愈模式' }).isVisible();
  if (!breathDialogVisible) throw new Error('呼吸疗愈弹窗未正常打开');
  console.log('- 4-7-8 呼吸疗愈全屏模式通过');
  await page.getByRole('button', { name: '退出呼吸疗愈模式' }).click();
  await page.waitForTimeout(200);

  // 5. 打开睡眠定时器并设定 15 分钟
  await page.getByTestId('open-timer-btn').click();
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: /15m/ }).click();
  await page.waitForTimeout(350);
  const timerBtnText = await page.getByTestId('open-timer-btn').innerText();
  if (!/\d{2}:\d{2}/.test(timerBtnText)) {
    throw new Error(`睡眠定时倒计时未显示: ${timerBtnText}`);
  }
  console.log(`- 睡眠定时器倒计时通过: ${timerBtnText.replace(/\s+/g, ' ')}`);

  // 6. 打开「今日声景明信片」并验证生成的海报 PNG 包含有效真实公网二维码
  await page.getByTestId('open-postcard-btn').click();
  const posterImg = page.locator('img[alt*="今日声景明信片海报"]');
  await posterImg.waitFor({ state: 'visible', timeout: 8000 });
  const posterSrc = await posterImg.getAttribute('src');
  if (!posterSrc || !posterSrc.startsWith('data:image/png;base64,')) {
    throw new Error('明信片海报未生成有效 PNG DataURL');
  }

  // 对明信片右下角二维码区域裁剪解码，端到端确认明信片内二维码可扫描且指向公网 URL！
  const posterBuf = Buffer.from(posterSrc.replace(/^data:image\/png;base64,/, ''), 'base64');
  const fullPng = PNG.sync.read(posterBuf);
  const cropX = 720;
  const cropY = 1540;
  const cropW = 260;
  const cropH = 260;
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
  const posterQr = jsQR(cropData, cropW, cropH);
  console.log(`- 明信片海报内嵌二维码解码结果: ${posterQr?.data ?? '未识别'}`);
  if (!posterQr || posterQr.data !== targetUrl) {
    throw new Error(`明信片内嵌二维码不匹配: ${posterQr?.data} !== ${targetUrl}`);
  }

  await page.getByRole('button', { name: '关闭明信片' }).click();
  await page.waitForTimeout(200);

  if (consoleErrors.length > 0 || pageErrors.length > 0) {
    throw new Error(
      `发现运行时错误: consoleErrors=${JSON.stringify(consoleErrors)}, pageErrors=${JSON.stringify(pageErrors)}`
    );
  }

  console.log('✅ 所有线上 390x844 移动端验收检查全部通过！');
} finally {
  await browser.close();
}
