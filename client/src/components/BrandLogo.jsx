import logoUrl from '../assets/dae2uni-mark.png'

function BrandLogo({ variant = 'navigation' }) {
  return (
    <span className={`brand-logo brand-logo--${variant}`}>
      <img className="brand-logo__image" src={logoUrl} alt="DAE2UNI" />
    </span>
  )
}

export default BrandLogo
