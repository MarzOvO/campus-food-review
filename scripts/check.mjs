import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'assets/data.js'),'utf8'),context);
const dishes=context.window.DISHES;
assert.equal(dishes.length,12);
assert.equal(new Set(dishes.map(d=>d.id)).size,dishes.length);
for(const d of dishes){assert.ok(d.price>0);assert.ok(d.rating>=1&&d.rating<=5);assert.ok(d.spicy>=0&&d.spicy<=2);assert.ok(d.count>0);assert.ok(fs.existsSync(path.join(root,d.image)));assert.ok(d.reviews.length>0);assert.ok(d.tags.length>=2);}
for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){if(!match[1].includes('://'))assert.ok(fs.existsSync(path.join(root,match[1])),`Missing resource: ${match[1]}`);}
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,'Duplicate HTML ids');
assert.ok(dishes.filter(d=>d.price<=10&&d.vegetarian).length>=2,'Budget vegetarian choices');
assert.ok(dishes.some(d=>d.spicy===0));
assert.ok(fs.existsSync(path.join(root,'.nojekyll')));
console.log(`PASS: ${dishes.length} dishes, unique IDs, valid fields, local resources and Pages entrypoint.`);
