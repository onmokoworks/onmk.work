// 芸祭の展示機で /geisai2026/ を動かすローカルサーバー。
// `npm run build` 済みの dist/ を配信し、/api/geisai2026/moderate で Clef-flash（Workers AI）に卑猥語の判定を中継する。
// CLOUDFLARE_ACCOUNT_ID と CLOUDFLARE_AUTH_TOKEN（Workers AI の権限）は .env に置く（ブラウザには渡さない）。
import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {extname, join, normalize} from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const dist = join(root, 'dist');
const port = Number(process.env.PORT) || 4326;
const env = Object.fromEntries((await readFile(join(root, '.env'), 'utf8').catch(() => '')).split('\n')
  .map(line => line.match(/^\s*([\w.]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map(([, key, value]) => [key, value.replace(/^(['"])(.*)\1$/, '$2')]));
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || env.CLOUDFLARE_ACCOUNT_ID;
const apiKey = process.env.CLOUDFLARE_AUTH_TOKEN || env.CLOUDFLARE_AUTH_TOKEN;
if (!accountId || !apiKey) console.warn('CLOUDFLARE_ACCOUNT_ID か CLOUDFLARE_AUTH_TOKEN がないので、卑猥語の判定はせずに配信だけします。');

const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8'};

async function moderate(text) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/cloudflare/clef-flash`, {
    method: 'POST',
    headers: {Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json'},
    signal: AbortSignal.timeout(4000),
    body: JSON.stringify({
      model: 'clef-flash',
      state: {text},
      questions: {
        lewd: {type: 'noul', instructions: 'Does `text`, typed by a visitor at a public art exhibition (usually Japanese), contain anything sexual, obscene, or lewd that would be inappropriate on a public screen, including words like エロ or えろい, slang, euphemisms, and spellings deliberately split or disguised with spaces, kana, kanji, romaji, or symbols such as ○ or π?'},
        // 一つの質問だと崩した表記の確率が低く出るので、別に聞いて高いほうを使う。
        disguised: {type: 'noul', instructions: 'Does `text` contain an obscene word, such as a word for genitals or sex, written with spaces, ○, ×, *, or other symbols inserted between or replacing some of its letters?'},
      },
    }),
  });
  const {success, result, errors} = await response.json();
  if (!response.ok || !success) throw new Error(`Clef-flash ${response.status} ${JSON.stringify(errors)}`);
  const probability = answer => typeof answer === 'number' ? answer : answer?.noul ?? 0;
  return Math.max(probability(result.answers?.lewd), probability(result.answers?.disguised));
}

createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname === '/api/geisai2026/moderate' && request.method === 'POST') {
    try {
      let body = '';
      for await (const chunk of request) { body += chunk; if (body.length > 20000) throw new Error('too long'); }
      const text = String(JSON.parse(body).text ?? '').slice(0, 2000);
      const probability = accountId && apiKey && text.trim() ? await moderate(text) : 0;
      response.writeHead(200, {'Content-Type': 'application/json'}).end(JSON.stringify({probability}));
    } catch (error) {
      console.warn('判定に失敗:', error.message);
      response.writeHead(502, {'Content-Type': 'application/json'}).end(JSON.stringify({error: error.message}));
    }
    return;
  }
  if (url.pathname === '/') { response.writeHead(302, {Location: '/geisai2026/'}).end(); return; }
  let path = normalize(join(dist, decodeURIComponent(url.pathname)));
  if (!path.startsWith(dist)) { response.writeHead(403).end(); return; }
  try {
    if ((await stat(path)).isDirectory()) path = join(path, 'index.html');
    const data = await readFile(path);
    response.writeHead(200, {'Content-Type': types[extname(path)] ?? 'application/octet-stream'}).end(data);
  } catch {
    response.writeHead(404).end('not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}/geisai2026/`));
