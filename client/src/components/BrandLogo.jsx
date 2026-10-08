import logoUrl from '../assets/dae2uni-pathway-logo.svg'

function BrandLogo({ variant = 'navigation', whiteBackdrop = false }) {
  return (
    <span className={`brand-logo brand-logo--${variant}${whiteBackdrop ? ' brand-logo--white-backdrop' : ''}`}>
      <img className="brand-logo__image" src={logoUrl} alt="DAE2UNI Pathway" />
    </span>
  )
}

export default BrandLogo
