// Capturas de página inteira para revisão visual (Chrome headless + sharp).
//   node scripts/shots.mjs / 1366        →  _shots/home-1366-01.png, -02.png ...
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [route = '/', width = '1366', height = '7000'] = process.argv.slice(2);
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const name = (route === '/' ? 'home' : route.slice(1).replaceAll('/', '_')) + '-' + width;
fs.mkdirSync('_shots', { recursive: true });
const full = path.resolve(`_shots/${name}-full.png`);
execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${width},${height}`,
  '--virtual-time-budget=9000', `--screenshot=${full}`, `http://localhost:3040${route}?shot=1`], { stdio: 'ignore' });
const meta = await sharp(full).metadata();
const chunk = Number(width) < 700 ? 1400 : 1100;
let i = 0;
for (let y = 0; y < meta.height; y += chunk) {
  const h = Math.min(chunk, meta.height - y);
  // pula faixas vazias no fim da página
  const st = await sharp(full).extract({ left: 0, top: y, width: meta.width, height: h }).stats();
  if (st.channels.every(c => c.stdev < 1)) continue;
  await sharp(full).extract({ left: 0, top: y, width: meta.width, height: h }).toFile(`_shots/${name}-${String(++i).padStart(2, '0')}.png`);
}
console.log(`${name}: ${i} partes`);
