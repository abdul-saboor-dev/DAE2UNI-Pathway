function LoadingScreen({ label = 'Loading your pathway…' }) {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-7xl items-center justify-center px-6" role="status">
      <div className="text-center">
        <span className="mx-auto block size-10 animate-spin rounded-full border-4 border-bluewash border-t-academic" aria-hidden="true" />
        <p className="mt-4 font-semibold text-ink/70">{label}</p>
      </div>
    </div>
  )
}

export default LoadingScreen
