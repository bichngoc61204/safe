import Icon from './Icon';
import {getSupportLevel,isCommunitySupport,supportLevels,supportLevelStyle} from '../lib/supportLevels';
export function SupportBadge({place,category,t,compact=false}){
 const level=getSupportLevel(place,category);
 if(!level)return null;
 return <span className={`support-badge ${compact?'is-compact':''}`} style={supportLevelStyle(level)} title={t(level.title)}><Icon name={level.icon} size={compact?13:15}/><span className="support-badge-label">{level.name}</span></span>;
}
export default function SupportLevelInfo({place,category,t,showBadge=true}){
 if(!isCommunitySupport(category))return null;
 const level=getSupportLevel(place,category);
 if(!level)return <p className="support-unassigned"><Icon name="info" size={14}/>{t('supportLevelUnassigned')}</p>;
 return <section style={supportLevelStyle(level)} className="support-level-info" aria-label={t('supportLevel')}>{showBadge&&<SupportBadge place={place} category={category} t={t}/>}<h4>{t(level.title)}</h4><ul>{level.services.map(service=><li key={service}><Icon name="check" size={14}/>{t(service)}</li>)}</ul></section>;
}

export function SupportLevelFilter({value,onChange,t,className=''}){
 return <div className={`support-level-filter ${className}`}><span>{t('supportFilterLabel')}</span><div className="category-chips" role="group" aria-label={t('supportLevel')}><button type="button" aria-pressed={value==='all'} onClick={()=>onChange('all')}>{t('all')}</button>{supportLevels.map(level=><button type="button" className="support-level-chip" style={supportLevelStyle(level)} key={level.id} aria-pressed={value===level.id} onClick={()=>onChange(level.id)}><Icon name={level.icon} size={14}/>{level.name}</button>)}</div></div>;
}
