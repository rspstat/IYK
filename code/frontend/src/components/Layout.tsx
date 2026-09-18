import { Link, Outlet, useLocation } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'

export default function Layout() {
  const { pathname } = useLocation()
  const hasCustomHeader =
    pathname === '/' ||
    pathname.startsWith('/result/') ||
    pathname === '/route' ||
    pathname.startsWith('/spot/') ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/favorites'

  return (
    <div className="min-h-screen bg-white text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
      {!hasCustomHeader && (
        <header className="border-b border-gray-100 dark:border-gray-800">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link to="/" className="flex items-center gap-1 text-sm font-bold tracking-tight">
              <img src="/icon.png" alt="" className="h-7 w-7 rounded-lg" />
              여행가유
            </Link>
            <ThemeToggle />
          </div>
        </header>
      )}
      <Outlet />
    </div>
  )
}
