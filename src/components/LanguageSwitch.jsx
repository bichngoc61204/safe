export default function LanguageSwitch({lang,onChange,t,className=''}) {
  return <div className={`header-segments language-switch ${className}`} role="group" aria-label={t('language')}>
    <button type="button" lang="vi" aria-label="Tiếng Việt" aria-pressed={lang==='vi'} onClick={()=>onChange('vi')}>VI</button>
    <button type="button" lang="en" aria-label="English" aria-pressed={lang==='en'} onClick={()=>onChange('en')}>EN</button>
  </div>;
}
