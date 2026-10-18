// Development helper. Uses runtime sharp when SHARP_PATH is supplied.
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const sharp=require(process.env.SHARP_PATH||'sharp');
for(const name of ['logo-dark','logo-light','symbol-dark','symbol-light','avatar','social-preview'])await sharp(`public/brand/${name}.svg`,{density:192}).png().toFile(`public/brand/${name}.png`);
for(const [name,size] of [['favicon-16',16],['favicon-32',32],['apple-touch-icon',180]])await sharp('public/brand/favicon.svg').resize(size,size).png().toFile(`public/brand/${name}.png`);
console.log('Transparent logos and PNG icon sizes exported.');
