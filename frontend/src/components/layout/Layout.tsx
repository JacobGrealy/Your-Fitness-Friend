import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import Header from './Header'

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      <Header />
      <main className="pb-20 sm:pb-0 pt-4 sm:pt-0">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
