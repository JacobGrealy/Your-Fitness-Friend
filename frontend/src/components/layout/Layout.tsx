import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'
import Header from './Header'
import { PageTitleProvider } from './PageTitleContext'

export default function Layout() {
  return (
    <PageTitleProvider>
      <div className="min-h-screen bg-[#f2f2f2]">
        <Header className="sm:hidden" />
        {/* pb/pt carry the safe-area insets on top of the bar heights, so the
            bottom nav clears the gesture bar and content clears the notch. */}
        <main className="pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-0 sm:ml-56 pt-[calc(3.5rem+env(safe-area-inset-top))] sm:pt-4">
          <Outlet />
        </main>
        <BottomNav />
        <Sidebar />
      </div>
    </PageTitleProvider>
  )
}
