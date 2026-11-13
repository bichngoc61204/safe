import { catalogGroups } from './catalogGroups.js';
import { readPlaceHours } from './placeHours.js';
import { placeWasteTypes } from './editorial.js';

export function catalogWorkbook({ places, categories }, t, lang) {
  const names = new Map(categories.map(category=>[category.id,category]));
  const label = category => lang==='en'?category?.nameEn:category?.name;
  const groupName = id => t(catalogGroups.find(group=>group.id===id)?.label??id);
  const header = keys => keys.map(key=>({
    value:key==='wasteTypes'?(lang==='en'?'Material type IDs':'Mã loại rác'):t(key), fontWeight:'bold', textColor:'#FFFFFF', backgroundColor:'#24654D',
  }));
  const makeSheet = (key, keys, widths, rows) => ({
    sheet:t(key), data:[header(keys),...rows], stickyRowsCount:1,
    columns:keys.map((_,index)=>({width:widths[index]??24})),
  });

  return [
    makeSheet('places',
      ['placeId','name','kind','category','categoryId','address','phone','status','owner','waste','wasteTypes','opensAt','closesAt','hours','latitude','longitude','image','galleryUrls','description','source','updated','publication','nameEn','addressEn','ownerEn','wasteEn','hoursEn','descriptionEn',...Array.from({length:7},(_,index)=>`day${index}`),'exceptions'],
      [38,38,20,24,24,46,19,20,26,28,26,15,15,21,15,15,40,40,40,22,24],
      places.map(place=>{
        const category=names.get(place.category);
        const {opensAt,closesAt,hours}=readPlaceHours(place);
        return [place.id,place.name,groupName(category.kind),label(category),category.id,place.address,place.phone??'',t(place.status),
          place.owner??'',place.waste??'',placeWasteTypes(place).join(';'),opensAt,closesAt,hours,place.lat,place.lng,place.image??'',(place.images??[]).join('\n'),
          place.description??'',place.source??'',place.updatedAt??'',t(place.visibility==='hidden'?'hidden':'published'),place.nameEn||'',place.addressEn||'',place.ownerEn||'',place.wasteEn||'',place.hoursEn||'',place.descriptionEn||'',
          ...Array.from({length:7},(_,index)=>{const day=place.schedule?.enabled&&place.schedule.days[index];return !day?'':day.closed?t('dayClosed'):day.allDay?'24/7':`${day.opensAt}-${day.closesAt}`;}),
          (place.schedule?.exceptions||[]).map(day=>`${day.date}=${day.closed?t('dayClosed'):day.allDay?'24/7':day.opensAt+'-'+day.closesAt}`).join(';')];
      })),
    makeSheet('categories',['category','kind','placeCount'],[34,22,18],
      categories.map(category=>[label(category),groupName(category.kind),places.filter(place=>place.category===category.id).length])),
  ];
}

export async function exportCatalog(data, t, lang) {
  const {default:writeExcelFile}=await import('write-excel-file/browser');
  await writeExcelFile(catalogWorkbook(data,t,lang)).toFile(`safemap-an-thuong-${new Date().toISOString().slice(0,10)}.xlsx`);
}
