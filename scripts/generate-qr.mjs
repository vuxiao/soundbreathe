import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';

const url = process.argv[2] || 'https://vuxiao.github.io/soundbreathe/';
const outPath = path.resolve(process.cwd(), 'qrcode.png');

await QRCode.toFile(outPath, url, {
  width: 600,
  margin: 3,
  errorCorrectionLevel: 'M',
  color: {
    dark: '#060a13',
    light: '#ffffff',
  },
});

// 反向解码校验
const pngBuffer = fs.readFileSync(outPath);
const decodedPng = PNG.sync.read(pngBuffer);
const qrResult = jsQR(
  new Uint8ClampedArray(decodedPng.data),
  decodedPng.width,
  decodedPng.height
);

if (!qrResult || qrResult.data !== url) {
  console.error('❌ 二维码解码校验失败:', qrResult?.data, '!==', url);
  process.exit(1);
}

const ascii = await QRCode.toString(url, {
  type: 'terminal',
  small: true,
  errorCorrectionLevel: 'M',
});

console.log(`✅ qrcode.png 已生成并通过解码校验: ${outPath}`);
console.log(`✅ 解码结果严格一致: ${qrResult.data}`);
console.log('\n--- 终端扫码二维码 ---\n');
console.log(ascii);
