function AuthShell({ eyebrow, title, description, children, aside }) {
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[0.82fr_1.18fr] lg:px-10 lg:py-16">
      <div className="self-center">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-leaf">{eyebrow}</p>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-md text-base leading-7 text-ink/65">{description}</p>
        {aside}
      </div>
      <div className="rounded-[2rem] border border-white/80 bg-white/80 p-6 shadow-[0_30px_90px_-45px_rgba(16,42,42,0.5)] backdrop-blur sm:p-9">
        {children}
      </div>
    </section>
  )
}

export default AuthShell
