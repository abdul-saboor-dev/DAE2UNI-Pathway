function AuthShell({ eyebrow, title, description, children, aside }) {
  return (
    <section className="site-container grid gap-9 py-10 lg:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)] lg:gap-12 lg:py-16">
      <div className="self-start border-l border-[var(--ui-border-strong)] px-2 py-3 pl-6 sm:pl-8 lg:mt-8">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title mt-4 max-w-[14ch] text-4xl text-navy sm:text-5xl">{title}</h1>
        <p className="body-copy mt-5 max-w-md text-base">{description}</p>
        {aside}
      </div>
      <div className="form-surface min-w-0 p-6 sm:p-9">
        {children}
      </div>
    </section>
  )
}

export default AuthShell
