import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};
const publicDir = new URL('../dist/', import.meta.url);
const files = (await readdir(publicDir, { withFileTypes: true }))
  .filter(entry => entry.isFile() && types[entry.name.slice(entry.name.lastIndexOf('.'))])
  .map(entry => entry.name)
  .sort();
const assets = Object.fromEntries(await Promise.all(files.map(async name => {
  const type = types[name.slice(name.lastIndexOf('.'))];
  return ['/' + name, { type, content: await readFile(new URL(name, publicDir), 'utf8') }];
})));
const entry = await readFile(new URL('../server/index.js', import.meta.url), 'utf8');
const supporter = await readFile(new URL('../server/supporter.js', import.meta.url), 'utf8');
const supporterImport = "import { handleSupporter } from './supporter.js';";
if (!entry.includes(supporterImport) || !assets['/index.html']) throw new Error('Missing Worker entry or game HTML');
const html = assets['/index.html'];
html.content = html.content.replace(/\b(src|href)="([^"]+)"/g, (attribute, name, path) => {
  const asset = assets['/' + path];
  if (!asset) return attribute;
  const revision = createHash('sha256').update(asset.content).digest('hex').slice(0, 12);
  return name + '="' + path + '?v=' + revision + '"';
});
const output = new URL('server/', publicDir);
await mkdir(output, { recursive: true });
await writeFile(new URL('index.js', output),
  supporter + '\nconst publicAssets = ' + JSON.stringify(assets) + ';\n' + entry.replace(supporterImport, ''));
