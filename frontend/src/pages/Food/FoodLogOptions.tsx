import { useEffect } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { usePageTitle } from '@/components/layout/PageTitleContext'
import { resolveReturnTo, returnState } from '@/utils/returnTo'

const choices = [
  { title: 'Quick Add', detail: 'Enter a food and its nutrition yourself.', path: '/food/log/select', mark: '+' },
  { title: 'Barcode Scan', detail: 'Scan a package or type its barcode.', path: '/food/log', method: 'barcode', mark: '▥' },
  { title: 'Photo', detail: 'Photograph a meal and review the food analysis.', path: '/food/photo-log', mark: '◎' },
  { title: 'Search', detail: 'Find saved foods, recent entries, or food database results.', path: '/food/log', mark: '⌕' },
]
export default function FoodLogOptions() {
  const { setTitle } = usePageTitle()
  const location = useLocation()
  const [params] = useSearchParams()
  useEffect(() => { setTitle('Log Food') }, [setTitle])
  const originState = returnState(resolveReturnTo(location.state))
  return <div className="p-4 space-y-5">
    <header className="border-l-4 border-[#185ADB] pl-4 py-2"><p className="text-xs uppercase tracking-widest text-[#757575]">Your food diary</p><h1 className="text-2xl font-bold text-[#212121]">How would you like to log?</h1><p className="mt-1 text-sm text-[#757575]">Choose the easiest way for this meal.</p></header>
    <nav aria-label="Food logging options" className="space-y-3">{choices.map(choice => {
      const query = new URLSearchParams(params)
      query.delete('method')
      if (choice.method) query.set('method', choice.method)
      const to = choice.path + (query.size ? '?' + query.toString() : '')
      return <Link key={choice.title} to={to} state={originState} className="flex items-center gap-4 border border-[#e0e0e0] rounded-xl p-4 bg-white hover:bg-[#eef4ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#185ADB]">
        <span aria-hidden="true" className="w-11 h-11 rounded-lg bg-[#eef4ff] text-[#185ADB] text-3xl flex items-center justify-center shrink-0">{choice.mark}</span>
        <span className="flex-1 min-w-0"><span className="block text-base font-semibold text-[#212121]">{choice.title}</span><span className="block mt-1 text-sm text-[#757575]">{choice.detail}</span></span>
        <span aria-hidden="true" className="text-[#185ADB] text-xl">›</span>
      </Link>
    })}</nav>
  </div>
}
