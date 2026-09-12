const DEFAULT_FALLBACK = 'https://placehold.co/900x1200/171719/c9ff38?text=FashionXpress'

export function SafeImage({ src, alt = '', fallback, ...props }) {
  const fallbackSrc = fallback ?? (alt
    ? `https://placehold.co/900x1200/171719/c9ff38?text=${encodeURIComponent(alt)}`
    : DEFAULT_FALLBACK)

  function handleError(event) {
    const image = event.currentTarget
    if (image.src !== fallbackSrc) image.src = fallbackSrc
  }

  return <img src={src || fallbackSrc} alt={alt} onError={handleError} {...props} />
}
