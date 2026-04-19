import { Outlet } from 'react-router-dom'

function Layout() {
  return (
    <div className="min-h-screen bg-base-200">
      <Outlet />
    </div>
  )
}

export default Layout
