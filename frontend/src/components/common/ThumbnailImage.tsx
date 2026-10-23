import { useState, type ImgHTMLAttributes } from 'react'
import { thumbnailUrl } from '@/utils/photoUrl'
type Props = ImgHTMLAttributes<HTMLImageElement> & { src: string }
/** Thumbnail failures fall back once; full-size viewer URLs stay independent. */
export default function ThumbnailImage(props: Props) {
  return <ThumbnailSource key={props.src} {...props} />
}
function ThumbnailSource({ src, onError, loading = 'lazy', ...props }: Props) {
  const [fallback, setFallback] = useState(false)
  const derivative = thumbnailUrl(src)
  return <img {...props} src={fallback ? src : derivative} loading={loading} onError={event => {
    if (!fallback && derivative !== src) setFallback(true)
    else onError?.(event)
  }} />
}
