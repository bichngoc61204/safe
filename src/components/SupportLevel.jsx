import Icon from './Icon';
import {getSupportLevel,isCommunitySupport} from '../lib/supportLevels';
export function SupportBadge({place,category,t,compact=false}){
 const level=getSupportLevel(place,category);
 if(!level)return null;
 return <span className={`support-badge ${compact?'is-compact':''}`} style={{'--support-ink':level.color,'--support-wash':level.wash}} title={t(level.title)}><Icon name={level.icon} size={compact?13:15}/>{compact&&level.id==='family_friendly'?'Family Friendly':level.name}</span>;
}
export default function SupportLevelInfo({place,category,t,showBadge=true}){
 if(!isCommunitySupport(category))return null;
 const level=getSupportLevel(place,category);
 if(!level)return <p className="support-unassigned"><Icon name="info" size={14}/>{t('supportLevelUnassigned')}</p>;
 return <section className="support-level-info" aria-label={t('supportLevel')}>{showBadge&&<SupportBadge place={place} category={category} t={t}/>}<h4>{t(level.title)}</h4><ul>{level.services.map(service=><li key={service}><Icon name="check" size={14}/>{t(service)}</li>)}</ul></section>;
}
