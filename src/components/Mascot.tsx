export type MascotName = 'welcome' | 'books' | 'celebration' | 'studying';

/**
 * Decorative illustration used to close out a page (see public/illustrations/CREDITS.md).
 * Purely ornamental, so it's hidden from assistive tech and never blocks first paint.
 */
export default function Mascot({
  name,
  size = 180,
  marginTop = 28,
}: {
  name: MascotName;
  size?: number;
  marginTop?: number;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop, opacity: 0.9 }}>
      <img
        src={`${import.meta.env.BASE_URL}illustrations/${name}.svg`}
        alt=""
        aria-hidden="true"
        loading="lazy"
        draggable={false}
        style={{ width: '100%', maxWidth: size, height: 'auto', pointerEvents: 'none' }}
      />
    </div>
  );
}
