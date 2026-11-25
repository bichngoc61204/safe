// Use Vite's built entry so the admin page always loads the same hashed assets.
// Social metadata must be in the original HTML, before any JavaScript executes.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {stripSocial,renderIntroduction} from './seo-pages.mjs';
const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const write=(path,text)=>writeFile(new URL(path,root),text);
const home=await read('dist/index.html');
const head=home.match(/<head>([\s\S]*?)<\/head>/)[1];
const admin=stripSocial(home)
  .replace(/<title>[^<]*<\/title>/,'<title>Đăng nhập quản trị | SafeMap An Thượng</title>')
  .replace(/<meta name="description"[^>]*>/,'<meta name="description" content="Khu vực quản trị SafeMap An Thượng." />')
  .replace(/<meta name="robots"[^>]*>/,'<meta name="robots" content="noindex, nofollow" />')
  .replace(/<div id="root">[\s\S]*?<\/body>/,'<div id="root"><main class="seo-intro"><h1>Quản trị SafeMap An Thượng</h1><p role="status">Đang mở trang đăng nhập…</p><noscript>Vui lòng bật JavaScript để đăng nhập.</noscript></main></div></body>');
await write('dist/admin.html',admin);
await mkdir(new URL('dist/gioi-thieu/',root),{recursive:true});
await write('dist/gioi-thieu/index.html',renderIntroduction(head,await read('seo/gioi-thieu.html')));
console.log('SEO: generated static introduction and noindex admin entry.');
