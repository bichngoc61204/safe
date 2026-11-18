import logo from '../assets/safemap-symbol.png';
import '../brand.css';

export default function BrandLogo({className='', decorative=false}) {
  return <img className={`brand-logo ${className}`} src={logo} alt={decorative?'':'SafeMap An Thượng'} width="256" height="256" decoding="async"/>;
}

export function BrandIdentity({t,className=''}) {
  return <span className={`brand-lockup ${className}`}><span className="brand-mark"><BrandLogo decorative/></span><span className="brand-copy"><strong>SafeMap<span className="brand-separator" aria-hidden="true">/</span><b>An Thượng</b></strong><small>{t('brandTagline')}</small></span></span>;
}
