'use client';

type ImgProps = {
  size?: number;
  className?: string;
};

/** Chart mark (bars + growth arrow) — sidebar, favicon-sized spots. */
export function BrandMark({ size = 32, className }: ImgProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/icon.png"
      width={size}
      height={size}
      alt=""
      aria-hidden
      className={className}
      style={{ display: 'block', borderRadius: Math.max(6, Math.round(size * 0.2)), objectFit: 'cover' }}
    />
  );
}

/** NG monogram — collapsed sidebar / dense chrome. */
export function BrandMonogram({ size = 32, className }: ImgProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/monogram.png"
      width={size}
      height={size}
      alt=""
      aria-hidden
      className={className}
      style={{ display: 'block', borderRadius: Math.max(6, Math.round(size * 0.2)), objectFit: 'cover' }}
    />
  );
}

type WordmarkProps = {
  compact?: boolean;
  className?: string;
};

/** NIVESH (navy/white) + GURU (teal). */
export function BrandWordmark({ compact = false, className }: WordmarkProps) {
  return (
    <span className={`ng-wordmark${compact ? ' ng-wordmark--compact' : ''}${className ? ` ${className}` : ''}`}>
      <span className="ng-wordmark__nivesh">NIVESH</span>
      <span className="ng-wordmark__guru">GURU</span>
    </span>
  );
}

type LockupProps = {
  /** When true, use the official full logo PNG (icon + wordmark + tagline). */
  useImage?: boolean;
  className?: string;
  height?: number;
};

/**
 * Full brand lockup for login / marketing.
 * Default is the composed mark + wordmark (avoids raster artifacts in logo.png).
 */
export function BrandLockup({ useImage = false, className, height = 56 }: LockupProps) {
  if (useImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/brand/logo.png"
        alt="NiveshGuru — Investment Simplified"
        className={className}
        style={{
          display: 'block',
          height,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          objectPosition: 'left center',
          background: 'transparent',
        }}
      />
    );
  }

  const mark = Math.max(28, Math.round(height * 0.72));
  return (
    <div
      className={`ng-lockup${className ? ` ${className}` : ''}`}
      style={{ minHeight: height }}
      aria-label="NiveshGuru — Investment Simplified"
    >
      <BrandMark size={mark} />
      <div className="ng-lockup__text">
        <BrandWordmark />
        <span className="ng-lockup__tag">Investment · Simplified</span>
      </div>
    </div>
  );
}
