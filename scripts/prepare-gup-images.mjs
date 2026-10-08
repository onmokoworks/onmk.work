import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(await readFile(new URL('./gup-images.json',import.meta.url),'utf8'));
const root=new URL(process.argv.includes('--site')?'../public/char-space/':'../',import.meta.url);
const entries=Object.values(manifest.images),failures=[];let cursor=0;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
await mkdir(new URL('assets/gup/',root),{recursive:true});
async function worker(){while(cursor<entries.length){const entry=entries[cursor++];if(!/^assets\/gup\/[a-z0-9_-]+\.(png|jpg)$/.test(entry.image))throw new Error('Unexpected image path');const file=new URL(entry.image,root);try{if(hash(await readFile(file))===entry.sha256)continue;}catch{}
 for(let attempt=0;attempt<3;attempt++){try{const response=await fetch(entry.url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error('HTTP '+response.status);const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length!==entry.bytes||hash(bytes)!==entry.sha256)throw new Error('Source image differs from manifest');await writeFile(new URL(entry.image+'.pending',root),bytes);await rename(new URL(entry.image+'.pending',root),file);break;}catch(error){if(attempt===2)failures.push(entry.image+': '+error.message);}}
}}
await Promise.all(Array.from({length:4},worker));
console.log(`GuP: ${entries.length} images checked, ${failures.length} failures`);if(failures.length)throw new Error(failures.join('\n'));
