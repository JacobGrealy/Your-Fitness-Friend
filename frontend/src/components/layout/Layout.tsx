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
        <main className="pb-20 sm:pb-0 sm:ml-56 pt-14 sm:pt-4">
          <Outlet />
        </main>
        <BottomNav />
        <Sidebar />
      </div>
    </PageTitleProvider>
  )
}
