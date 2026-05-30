interface PageHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
  /** Solo marca y título, sin subtítulo ni línea decorativa. */
  compact?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  className = '',
  compact = false,
}: PageHeaderProps) {
  return (
    <header className={`${compact ? 'mb-3' : 'mb-7'} ${className}`.trim()}>
      <div className={`flex items-center gap-2.5 ${compact ? 'mb-1.5' : 'mb-3'}`}>
        <img
          src="/imagenes/LOGO.png"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-full object-cover shadow-sm ring-2 ring-white/80"
        />
        <span className="badge-brand">Bolis &amp; Más</span>
      </div>
      <h1
        className={`break-words font-extrabold leading-tight tracking-tight text-stone-900 ${
          compact ? 'text-lg sm:text-xl' : 'text-xl sm:text-[1.65rem]'
        }`}
      >
        {title}
      </h1>
      {!compact && subtitle ? (
        <p className="mt-2 text-sm font-semibold leading-relaxed text-stone-800">
          {subtitle}
        </p>
      ) : null}
      {!compact ? (
        <div className="mt-4 h-1.5 w-12 rounded-full bg-brand" aria-hidden />
      ) : null}
    </header>
  );
}
