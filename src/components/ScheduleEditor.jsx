import Icon from './Icon';
import { defaultSchedule } from '../lib/editorial';
export default function ScheduleEditor({value,onChange,t}){
 const schedule=value||defaultSchedule();
 const change=(index,next)=>onChange({...schedule,days:schedule.days.map((day,i)=>i===index?{...day,...next}:day)});
 function row(day,index,exception=false){
  const set=next=>exception?onChange({...schedule,exceptions:schedule.exceptions.map((item,i)=>i===index?{...item,...next}:item)}):change(index,next);
  return <div className="schedule-edit-row" key={exception?index:`day-${index}`}>
   {exception?<input type="date" required value={day.date} aria-label={t('exceptions')} onChange={event=>set({date:event.target.value})}/>:<strong>{t(`day${index}`)}</strong>}
   <label className="schedule-check"><input type="checkbox" checked={day.closed} onChange={event=>set({closed:event.target.checked})}/>{t('dayClosed')}</label>
   <label className="schedule-check"><input type="checkbox" checked={day.allDay} disabled={day.closed} onChange={event=>set({allDay:event.target.checked})}/>{t('allDay')}</label>
   <div className="schedule-times"><input type="time" disabled={day.closed||day.allDay} required={!day.closed&&!day.allDay} aria-label={`${exception?day.date:t(`day${index}`)} ${t('opensAt')}`} value={day.opensAt} onChange={event=>set({opensAt:event.target.value})}/><span>–</span><input type="time" disabled={day.closed||day.allDay} required={!day.closed&&!day.allDay} aria-label={`${exception?day.date:t(`day${index}`)} ${t('closesAt')}`} value={day.closesAt} onChange={event=>set({closesAt:event.target.value})}/></div>
   {exception&&<button type="button" className="icon-button" aria-label={t('delete')} onClick={()=>onChange({...schedule,exceptions:schedule.exceptions.filter((_,i)=>i!==index)})}><Icon name="x" size={15}/></button>}
  </div>;
 }
 return <fieldset className="schedule-editor"><legend>{t('weeklyHours')}</legend><label className="schedule-check schedule-enable"><input type="checkbox" checked={schedule.enabled} onChange={event=>onChange({...schedule,enabled:event.target.checked})}/>{t('enableSchedule')}</label>
  {schedule.enabled&&<details className="schedule-days"><summary>{t('weeklyHours')}</summary><button type="button" className="text-button" onClick={()=>onChange({...schedule,days:schedule.days.map(()=>({...schedule.days[0]}))})}>{t('copyMonday')}</button>
   {schedule.days.map((day,index)=>row(day,index))}<h4>{t('exceptions')}</h4>{schedule.exceptions.map((day,index)=>row(day,index,true))}
   <button type="button" className="button secondary" disabled={schedule.exceptions.length>=24} onClick={()=>onChange({...schedule,exceptions:[...schedule.exceptions,{date:'',closed:true,allDay:false,opensAt:'08:00',closesAt:'17:00'}]})}><Icon name="plus" size={15}/>{t('addException')}</button><p className="field-hint">{t('scheduleHint')}</p>
  </details>}
 </fieldset>;
}
