import { catalogGroups } from './catalogGroups.js';

export function catalogWorkbook({ places, categories }, t, lang) {
  const names = new Map(categories.map(category=>[category.id,category]));
  const label = category => lang==='en'?category?.nameEn:category?.name;
  const groupName = id => t(catalogGroups.find(group=>group.id===id)?.label??id);
  const header = keys => keys.map(key=>({
    value:t(key), fontWeight:'bold', textColor:'#FFFFFF', backgroundColor:'#24654D',
  }));
  const makeSheet = (key, keys, widths, rows) => ({
    sheet:t(key), data:[header(keys),...rows], stickyRowsCount:1,
    columns:widths.map(width=>({width})),
  });

  return [
    makeSheet('places',
      ['name','kind','category','address','phone','status','owner','waste','hours','latitude','longitude','image','galleryUrls','description','source','updated'],
      [38,20,24,46,19,20,26,28,21,15,15,40,40,40,22,24],
      places.map(place=>{
        const category=names.get(place.category);
        return [place.name,groupName(category.kind),label(category),place.address,place.phone??'',t(place.status),
          place.owner??'',place.waste??'',place.hours??'',place.lat,place.lng,place.image??'',(place.images??[]).join('\n'),
          place.description??'',place.source??'',place.updatedAt??''];
      })),
    makeSheet('categories',['category','kind','placeCount'],[34,22,18],
      categories.map(category=>[label(category),groupName(category.kind),places.filter(place=>place.category===category.id).length])),
  ];
}

export async function exportCatalog(data, t, lang) {
  const {default:writeExcelFile}=await import('write-excel-file/browser');
  await writeExcelFile(catalogWorkbook(data,t,lang)).toFile(`safemap-an-thuong-${new Date().toISOString().slice(0,10)}.xlsx`);
}
