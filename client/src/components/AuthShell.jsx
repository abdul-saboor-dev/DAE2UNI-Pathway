function AuthShell({ eyebrow, title, description, children, aside }) {
  return (
    <section className="site-container grid gap-0 py-10 lg:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)] lg:py-16">
      <div className="rounded-t-[var(--ui-radius-lg)] bg-navy px-6 py-10 text-white sm:px-9 lg:rounded-l-[var(--ui-radius-lg)] lg:rounded-tr-none lg:px-10 lg:py-14">
        <p className="eyebrow text-[var(--brand-cyan)]">{eyebrow}</p>
        <h1 className="page-title mt-4 max-w-[14ch] text-4xl text-white sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-md text-base leading-7 text-white/75">{description}</p>
        {aside}
      </div>
      <div className="form-surface min-w-0 rounded-t-none p-6 sm:p-9 lg:rounded-l-none lg:rounded-tr-[var(--ui-radius-lg)]">
        {children}
      </div>
    </section>
  )
}

export default AuthShell
