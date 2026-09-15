const DEFAULT_FALLBACK = '/images/hero-model.jpg'

export function SafeImage({ src, alt = '', fallback = DEFAULT_FALLBACK, priority = false, width = 900, height = 1200, ...props }) {

  function handleError(event) {
    const image = event.currentTarget
    if (image.dataset.fallbackApplied) return
    image.dataset.fallbackApplied = 'true'
    image.src = fallback
  }

  return <img src={src || fallback} alt={alt} width={width} height={height} loading={priority ? 'eager' : 'lazy'} decoding="async" fetchPriority={priority ? 'high' : 'auto'} onError={handleError} {...props} />
}
