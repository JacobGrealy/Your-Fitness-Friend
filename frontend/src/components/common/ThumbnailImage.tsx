import { useState, type ImgHTMLAttributes } from 'react'
import { thumbnailUrl } from '@/utils/photoUrl'
type Props = ImgHTMLAttributes<HTMLImageElement> & { src: string }
/** Keep the reserved image box through loading and either fallback failure. */
export default function ThumbnailImage(props: Props) {
  return <ThumbnailSource key={props.src} {...props} />
}
function ThumbnailSource({ src, onError, onLoad, loading = 'lazy', className = '', style, alt = '', ...props }: Props) {
  const [fallback, setFallback] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const derivative = thumbnailUrl(src)
  const decorative = !alt || props['aria-hidden'] === true || props['aria-hidden'] === 'true'
  return <span style={style} className={`relative inline-block overflow-hidden bg-gray-100 ${className}`} aria-hidden={decorative || undefined} aria-busy={decorative ? undefined : !loaded && !failed}>
    {!loaded && !failed && <span role={decorative ? undefined : 'status'} aria-label={decorative ? undefined : 'Loading photo'} aria-hidden={decorative || undefined} className="absolute inset-0 bg-gray-200 motion-safe:animate-pulse" />}
    {failed ? <span role={alt ? 'img' : undefined} aria-label={alt ? `${alt} — photo unavailable` : undefined} className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs" aria-hidden={!alt}>—</span> :
      <img {...props} alt={alt} className={`w-full h-full object-cover ${loaded ? '' : 'opacity-0'}`} src={fallback ? src : derivative} loading={loading}
        onLoad={event => { setLoaded(true); onLoad?.(event) }}
        onError={event => {
          if (!fallback && derivative !== src) setFallback(true)
          else { setFailed(true); onError?.(event) }
        }} />}
  </span>
}
