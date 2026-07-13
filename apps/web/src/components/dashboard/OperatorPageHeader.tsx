interface OperatorPageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
}

export function OperatorPageHeader({ eyebrow, title, description }: OperatorPageHeaderProps) {
  return (
    <header className="mb-10">
      {eyebrow && <p className="label-caps mb-4 tracking-widest text-gold">{eyebrow}</p>}
      <div className="decorative-rule mb-6" aria-hidden />
      <h1 className="font-serif text-[clamp(2rem,4vw,3rem)] font-light leading-tight text-luxury-on-surface">
        {title}
      </h1>
      {description && (
        <p className="mt-3 max-w-2xl text-lg font-light text-luxury-on-surface-variant">{description}</p>
      )}
    </header>
  );
}
