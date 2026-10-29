import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

let entryServerPath = path.resolve('.ssr/entry-server.js');
if (!existsSync(entryServerPath)) {
  const findEntry = async (dir) => {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = await findEntry(fullPath);
          if (found) return found;
        } else if (entry.name.startsWith('entry-server') && entry.name.endsWith('.js')) {
          return fullPath;
        }
      }
    } catch {}
    return null;
  };
  const found = await findEntry(path.resolve('.ssr'));
  if (found) entryServerPath = found;
}
const {render} = await import(pathToFileURL(entryServerPath).href);
const base=await readFile('dist/index.html','utf8');
for(const [path,title,description] of [['/','Proofloom — Packaging artwork review','Compare packaging artwork with approved specifications, review discrepancies side by side, and keep corrections moving toward approval.'],['/privacy','Privacy draft — Proofloom','How the Proofloom review website handles sample data and email drafts.'],['/terms','Terms draft — Proofloom','Terms for the Proofloom review website and fictional interactive demonstration.'],['/brand','Brand assets — Proofloom','Original Proofloom vector logos, favicons and downloadable brand assets.'],['/app','Interactive prototype — Proofloom','Run a full packaging review with fictional data: specification, exact checks, AI suggestions, studio corrections, re-checks and a two-person print decision.'],['/404','Page not found — Proofloom','This Proofloom page could not be found.']]){
let html=base.replace('<!--app-html-->',render(path)).replace(/<title>.*?<\/title>/,`<title>${title}</title>`).replace(/name="description" content="[^"]*"/,`name="description" content="${description}"`).replace(/rel="canonical" href="[^"]*"/,`rel="canonical" href="https://proofloom.space${path==='/'?'/':path}"`).replace(/property="og:url" content="[^"]*"/,`property="og:url" content="https://proofloom.space${path==='/'?'/':path}"`).replace(/property="og:title" content="[^"]*"/,`property="og:title" content="${title}"`).replace(/property="og:description" content="[^"]*"/,`property="og:description" content="${description}"`);
if(path==='/')html=html.replace('</head>',`<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'Organization',name:'Proofloom',url:'https://proofloom.space/',email:'tolu@proofloom.space',foundingDate:'2026',description:'B2B SaaS project building packaging artwork comparison and review tools.',logo:'https://proofloom.space/brand/logo-dark.png'})}</script></head>`);
if(path==='/')await writeFile('dist/index.html',html);else if(path==='/404')await writeFile('dist/404.html',html);else{await mkdir(`dist${path}`,{recursive:true});await writeFile(`dist${path}/index.html`,html);}}
console.log('Prerendered Home, Privacy, Terms, Brand, Prototype and 404.');
