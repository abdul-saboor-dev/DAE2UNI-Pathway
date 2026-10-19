export default function CataloguePageHeader({ eyebrow, title, description }) {
  return (
    <header className="panel-surface px-6 py-7 sm:px-9 sm:py-9">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="page-title mt-3 max-w-4xl text-4xl text-navy sm:text-5xl">{title}</h1>
      <p className="body-copy mt-4 max-w-3xl text-base sm:text-lg">{description}</p>
    </header>
  )
}
