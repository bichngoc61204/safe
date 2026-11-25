export const stripSocial=html=>html
  .replace(/\s*<meta\b[^>]*(?:property="og:|name="twitter:)[^>]*>/g,'')
  .replace(/\s*<link\b[^>]*rel="canonical"[^>]*>/g,'')
  .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'');

export function renderIntroduction(head,template){
let infoHead=stripSocial(head)
  .replace(/\s*<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g,'')
  .replace(/\s*<link\b[^>]*(?:href="\/assets\/|rel="modulepreload"|rel="preconnect"|href="https:\/\/fonts\.)[^>]*>/g,'')
  .replace(/<title>[^<]*<\/title>/,'<title>SafeMap An Thượng là gì? Tìm điểm an toàn và hỗ trợ tại Đà Nẵng</title>')
  .replace(/<meta name="description"[^>]*>/,'<meta name="description" content="Tìm hiểu bản đồ SafeMap An Thượng, Đà Nẵng: điểm an toàn, hỗ trợ cộng đồng, điểm xanh và ba mức Safe Point, Family Friendly, Safe Hub." />');
// Inherit the share image without maintaining a second set of image URLs.
const social=head.match(/<meta\b[^>]*(?:property="og:|name="twitter:)[^>]*>/g).join('\n');
infoHead+=social.replace(/(property="og:url" content=")[^"]+/, '$1https://www.safemap-anthuong.com/gioi-thieu/')
  .replace(/((?:property="og:title"|name="twitter:title") content=")[^"]+/g,'$1Giới thiệu SafeMap An Thượng — Bản đồ cộng đồng Đà Nẵng');
infoHead+='\n<link rel="canonical" href="https://www.safemap-anthuong.com/gioi-thieu/" />\n';
infoHead+='<script type="application/ld+json">'+JSON.stringify({
  '@context':'https://schema.org','@type':'AboutPage',url:'https://www.safemap-anthuong.com/gioi-thieu/',
  name:'Giới thiệu SafeMap An Thượng',inLanguage:'vi',
  isPartOf:{'@type':'WebSite','@id':'https://www.safemap-anthuong.com/#website',url:'https://www.safemap-anthuong.com/',name:'SafeMap An Thượng'},
})+'</script>';
return template.replace('<!-- seo:head -->',infoHead);
}
