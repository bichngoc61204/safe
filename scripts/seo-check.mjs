// Check the actual deployable HTML, not just the source templates.
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const origin='https://www.safemap-anthuong.com';
const config=JSON.parse(await read('vercel.json'));
const sitemap=new JSDOM(await read('dist/sitemap.xml'),{contentType:'text/xml'}).window.document;
const urls=[...sitemap.querySelectorAll('loc')].map(el=>new URL(el.textContent));
assert.equal(new Set(urls.map(url=>url.href)).size,urls.length);
assert(urls.some(url=>url.pathname==='/'));
assert(urls.some(url=>url.pathname==='/gioi-thieu/'));
for(const url of urls){
  assert.equal(url.origin,origin);
  assert(!/admin|api|game/.test(url.pathname),'Private/removed routes must not be advertised.');
  const file=`dist${url.pathname}index.html`;
  const document=new JSDOM(await read(file)).window.document;
  const meta=name=>document.querySelector(`meta[name="${name}"],meta[property="${name}"]`)?.content;
  assert.equal(document.querySelectorAll('title').length,1);
  assert(document.title.includes('SafeMap An Thượng'));
  assert(meta('description')?.length>70);
  assert(!/noindex/.test(meta('robots')));
  assert.equal(document.querySelectorAll('link[rel="canonical"]').length,1);
  assert.equal(document.querySelector('link[rel="canonical"]').href,url.href);
  assert.equal(meta('og:url'),url.href);
  assert.equal(meta('og:image'),meta('twitter:image'));
  assert.equal(meta('og:image:width'),'1200');
  assert.equal(meta('og:image:height'),'630');
  const image=new URL(meta('og:image'));
  assert.equal(image.origin,origin);
  const bytes=await readFile(new URL(`dist${image.pathname}`,root));
  assert(bytes.length>1000&&bytes.length<300_000,'Share image must be a real, lightweight image.');
  assert.equal(bytes.readUInt16BE(0),0xffd8,'A JPEG URL must actually contain JPEG data.');
  assert.equal(document.querySelectorAll('h1').length,1);
  assert(document.querySelector('main').textContent.includes('Đà Nẵng'));
  for(const script of document.querySelectorAll('script[type="application/ld+json"]')){
    const schema=JSON.parse(script.textContent);
    assert.equal(schema['@context'],'https://schema.org');
  }
  for(const element of document.querySelectorAll('[src],link[href],a[href]')){
    const path=element.getAttribute('src')||element.getAttribute('href');
    if(!path?.startsWith('/')||path.startsWith('//'))continue;
    await access(new URL(`dist${path}${path.endsWith('/')?'index.html':''}`,root));
  }
}
const info=new JSDOM(await read('dist/gioi-thieu/index.html')).window.document;
assert.equal(info.querySelectorAll('script:not([type="application/ld+json"])').length,0,'Introduction must work without JavaScript.');
assert.equal(info.querySelectorAll('details').length,5);
const admin=new JSDOM(await read('dist/admin.html')).window.document;
assert.match(admin.querySelector('meta[name="robots"]').content,/noindex/);
assert(!admin.querySelector('[property^="og:"],link[rel="canonical"],script[type="application/ld+json"]'));
assert(admin.querySelector('script[type="module"][src^="/assets/"]'),'Admin must retain the working app entry.');
for(const path of ['/admin','/admin/']){
  assert.equal(config.rewrites.find(rule=>rule.source===path)?.destination,'/admin.html');
}
for(const path of ['/admin','/admin/','/admin.html']){
  assert(config.headers.find(rule=>rule.source===path)?.headers.some(header=>header.key==='X-Robots-Tag'&&header.value.includes('noindex')));
}
assert.match(await read('dist/robots.txt'),/Sitemap: https:\/\/www\.safemap-anthuong\.com\/sitemap\.xml/);
assert(!/Disallow:\s*\/(?:$|admin)/m.test(await read('dist/robots.txt')),'Do not prevent crawlers from reading the admin noindex.');
console.log('SEO checks passed: public metadata, static content, sitemap, share image, asset links and admin noindex.');
