import Spinner from './Spinner'

/** Small, scoped feedback; never hides useful content or blocks navigation. */
export default function PendingStatus({ text = 'Updating…' }: { text?: string }) {
  return <span role="status" className="inline-flex items-center gap-2 text-sm"><Spinner />{text}</span>
}
