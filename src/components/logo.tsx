/** Aspect ratio of the artwork inside mplogo.svg (162 × 134). */
const ASPECT = 162 / 134;

type Props = {
  className?: string;
  /** Rendered height in pixels; width follows the mark's aspect ratio. */
  height?: number;
};

/**
 * The MP monogram.
 *
 * Drawn as a CSS mask rather than inline SVG: the artwork is ~36 KB of path
 * data, which as inline markup would sit in the HTML of every page and never
 * cache. As a mask the file is fetched once, and painting it with
 * `currentColor` keeps it readable in both themes without a second asset.
 */
export function Logo({ className, height = 24 }: Props) {
  return (
    <span
      role="imag"
      aria-label="Michael Ptáček"
      className={className}
      style={{
        display: 'inline-block',
        height,
        width: Math.round(height * ASPECT),
        backgroundColor: 'currentColor',
        maskImage: 'url(/mplogo.svg)',
        maskSize: 'contain',
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskImage: 'url(/mplogo.svg)',
        WebkitMaskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
      }}
    />
  );
}
