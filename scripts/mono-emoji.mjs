// Writes greyscale copies of public/emoji/*.svg into public/emoji/mono/.
// The home timeline shows these instead of applying a CSS filter, which some
// browsers skipped on first paint. Run again after adding an emoji:
//   node scripts/mono-emoji.mjs
import {mkdir, readdir, readFile, writeFile} from 'node:fs/promises';

const source = new URL('../public/emoji/', import.meta.url);
const output = new URL('mono/', source);
await mkdir(output, {recursive: true});

// Same weights as CSS grayscale(1).
const grey = (hex) => {
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  const value = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b).toString(16).padStart(2, '0');
  return `#${value}${value}${value}`;
};

for (const name of await readdir(source)) {
  if (!name.endsWith('.svg')) continue;
  const svg = await readFile(new URL(name, source), 'utf8');
  const colours = svg.match(/(fill|stroke|stop-color)="(?!#|none)[^"]*"/g);
  if (colours) throw new Error(`${name}: unsupported colour ${colours[0]}`);
  await writeFile(new URL(name, output), svg.replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (_, hex) => grey(hex)));
  console.log(`mono: ${name}`);
}
