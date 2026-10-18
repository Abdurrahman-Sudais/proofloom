import {readFile,writeFile,readdir} from 'node:fs/promises';
let html=await readFile('dist/index.html','utf8');
const assets={};for(const f of await readdir('public/brand')){const type=f.endsWith('.svg')?'image/svg+xml':'image/png';assets[`/brand/${f}`]=`data:${type};base64,${(await readFile(`public/brand/${f}`)).toString('base64')}`;}
const css=html.match(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/)[1];
const script=html.match(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/)[1];
html=html.replace(/<link rel="stylesheet"[^>]*>/,`<style>${await readFile(`dist${css}`,'utf8')}</style>`).replace(/<script type="module"[^>]*src="[^"]+"[^>]*><\/script>/,'');
for(const [path,data] of Object.entries(assets))html=html.split(`src="${path}"`).join(`src="${data}"`).split(`href="${path}"`).join(`href="${data}"`);
const js=(await readFile(`dist${script}`,'utf8')).replace(/<\/script/gi,'<\\/script');
html=html.replace('</body>',()=>`<script>window.__proofloomPreview=true;window.__proofloomAssets=${JSON.stringify(assets)};</script><script type="module">${js}</script></body>`);
await writeFile('../Proofloom-review-preview.html',html);
console.log('Created self-contained offline review preview.');
