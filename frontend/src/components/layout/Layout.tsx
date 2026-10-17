import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'
import Header from './Header'
import { PageTitleProvider } from './PageTitleContext'

export default function Layout() {
  return (
    <PageTitleProvider>
      {/* The shell owns the viewport height. Pages rendered here must NOT set
          min-h-screen: 100vh plus the bar paddings below made every page 136px
          taller than the screen, so short pages could be scrolled into empty
          space (FF-0051). 100svh rather than 100vh so a browser's collapsing URL
          bar cannot recreate the overshoot. */}
      <div className="flex min-h-[100svh] flex-col bg-[#f2f2f2]">
        <Header className="sm:hidden" />
        {/* pb/pt carry the safe-area insets on top of the bar heights, so the
            bottom nav clears the gesture bar and content clears the notch. */}
        <main className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-0 sm:ml-56 pt-[calc(3.5rem+env(safe-area-inset-top))] sm:pt-4">
          <Outlet />
        </main>
        <BottomNav />
        <Sidebar />
      </div>
    </PageTitleProvider>
  )
}
