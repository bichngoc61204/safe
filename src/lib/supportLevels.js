const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().trim();
export const supportLevels=[
 {id:'safe_point',name:'Safe Point',icon:'shield',color:'#34658C',wash:'#EDF4FA',title:'supportSafeTitle',services:['supportInitial','supportGuidance','supportReferral']},
 {id:'family_friendly',name:'Family Friendly',icon:'family',color:'#A83569',wash:'#FCF0F5',title:'supportFamilyTitle',services:['supportWomenChildren','supportLostChildren','supportRestWater','supportReferral']},
 {id:'safe_hub',name:'Safe Hub',icon:'hub',color:'#176B47',wash:'#EDF6EF',title:'supportHubTitle',services:['supportPoliceConnection','supportMedicalConnection','supportEssentialConnection','supportWithinCapacity']},
];
export function isCommunitySupport(category){
 if(category?.kind!=='safe')return false;
 if(typeof category.supportLevels==='boolean')return category.supportLevels;
 return category.id==='safe'||['ho tro cong dong','diem ho tro cong dong','community support','community support points'].includes(normalize(category.name))||normalize(category.nameEn)==='community support';
}
export const isSupportLevel=value=>supportLevels.some(level=>level.id===value);
export const getSupportLevel=(place,category)=>isCommunitySupport(category)?supportLevels.find(level=>level.id===place?.supportLevel):undefined;
// Presentation only: keep stored category IDs and custom data unchanged.
export function categoryVisualIcon(category){
 if(isCommunitySupport(category))return 'community';
 if(category?.kind==='safe'&&(category.id==='police'||normalize(category.name)==='cong an'||normalize(category.nameEn)==='police'))return 'police';
 return category?.icon||'pin';
}
export const supportLevelStyle=level=>({'--support-ink':level.color,'--support-wash':level.wash,'--chip-color':level.color});
export function supportMarkerCategory(place,category){
 const level=getSupportLevel(place,category);
 return level?{...category,icon:categoryVisualIcon(category),name:`${category.name} · ${level.name}`,nameEn:`${category.nameEn} · ${level.name}`}:{...category,icon:categoryVisualIcon(category)};
}
export function parseSupportLevel(value){
 const text=normalize(value).replace(/[_-]/g,' ');
 return supportLevels.find(level=>[level.id,level.name,...({safe_point:['SafePoint'],family_friendly:['Family Friendly Point'],safe_hub:['SafeHub']}[level.id]),{safe_point:'Điểm hỗ trợ an toàn',family_friendly:'Điểm hỗ trợ thân thiện với gia đình',safe_hub:'Điểm hỗ trợ trọng yếu'}[level.id]].some(label=>normalize(label).replace(/[_-]/g,' ')===text))?.id;
}

export function requiresSupportLevel(place,before,categories){
 const category=categories.find(item=>item.id===place.category);
 if(!isCommunitySupport(category))return false;
 const old=before.places.find(item=>item.id===place.id);
 return !old||!isCommunitySupport(before.categories.find(item=>item.id===old.category))||((old.visibility==='hidden'||Boolean(old.deletedAt))&&place.visibility!=='hidden'&&!place.deletedAt);
}
