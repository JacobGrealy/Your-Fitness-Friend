import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import Header from './Header'
import { PageTitleProvider } from './PageTitleContext'

export default function Layout() {
  return (
    <PageTitleProvider>
      <div className="min-h-screen bg-[#f2f2f2]">
        <Header />
        <main className="pb-20 sm:pb-0 pt-14 sm:pt-4">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </PageTitleProvider>
  )
}
