import { readFile, mkdir, stat, open, writeFile, rename } from 'node:fs/promises';
const manifest = JSON.parse(await readFile(new URL('./char-space-images.json', import.meta.url), 'utf8'));
const root = new URL('../public/char-space/', import.meta.url);
const checkOnly = process.argv.includes('--check');
const entries = [...new Map(Object.values(manifest.images).map(entry => [entry.image, entry])).values()];
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
let cursor = 0, restored = 0, existing = 0;
const failures = [];
async function valid(path, entry) {
  try {
    const info = await stat(path);
    if (info.size !== entry.bytes) return false;
    const file = await open(path, 'r');
    try {
      const head = Buffer.alloc(24);
      await file.read(head, 0, head.length, 0);
      return head.subarray(0, 8).equals(signature) && head.readUInt32BE(16) === entry.width && head.readUInt32BE(20) === entry.height;
    } finally { await file.close(); }
  } catch { return false; }
}
if (!checkOnly) await mkdir(new URL('assets/standing/', root), { recursive: true });
async function worker() {
  while (cursor < entries.length) {
    const entry = entries[cursor++];
    if (!/^assets\/standing\/\d+\.png$/.test(entry.image)) throw new Error(`Unexpected asset path: ${entry.image}`);
    const path = new URL(entry.image, root);
    if (await valid(path, entry)) { existing++; continue; }
    if (checkOnly) { failures.push(entry.image); continue; }
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(entry.url, { signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length !== entry.bytes || !bytes.subarray(0, 8).equals(signature) || bytes.readUInt32BE(16) !== entry.width || bytes.readUInt32BE(20) !== entry.height) throw new Error('Image differs from the saved manifest');
        const pending = new URL(`${entry.image}.pending`, root);
        await writeFile(pending, bytes); await rename(pending, path);
        restored++;
        if (restored % 50 === 0) console.log(`Restored ${restored} images`);
        break;
      } catch (error) {
        if (attempt === 2) failures.push(`${entry.image}: ${error.message}`);
      }
    }
  }
}
await Promise.all(Array.from({ length: 3 }, worker));
console.log(`${existing} existing, ${restored} restored, ${failures.length} missing or invalid (${entries.length} unique images).`);
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
