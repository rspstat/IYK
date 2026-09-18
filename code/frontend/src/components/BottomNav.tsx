import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, Search, Heart, User } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isLoggedIn = useAuthStore((state) => state.user !== null)

  const activeClass = 'text-primary-500 dark:text-primary-400'
  const inactiveClass = 'text-neutral-400 dark:text-neutral-500'

  function goToFavorites() {
    if (!isLoggedIn) {
      navigate(`/login?redirect=${encodeURIComponent('/favorites')}`)
      return
    }
    navigate('/favorites')
  }

  function goToMyPage() {
    if (!isLoggedIn) {
      navigate(`/login?redirect=${encodeURIComponent('/')}`)
      return
    }
    navigate('/')
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-100 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto flex max-w-md items-center justify-between px-8 py-2.5">
        <Link to="/" className={`flex flex-col items-center gap-0.5 ${pathname === '/' ? activeClass : inactiveClass}`}>
          <Home className="h-5 w-5" strokeWidth={2} />
          <span className="text-[11px] font-semibold">Home</span>
        </Link>
        <button type="button" className={`flex flex-col items-center gap-0.5 ${inactiveClass}`}>
          <Search className="h-5 w-5" strokeWidth={2} />
          <span className="text-[11px]">Search</span>
        </button>
        <button
          type="button"
          onClick={goToFavorites}
          className={`flex flex-col items-center gap-0.5 ${pathname === '/favorites' ? activeClass : inactiveClass}`}
        >
          <Heart className="h-5 w-5" strokeWidth={2} fill={pathname === '/favorites' ? 'currentColor' : 'none'} />
          <span className="text-[11px] font-semibold">Favorites</span>
        </button>
        <button type="button" onClick={goToMyPage} className={`flex flex-col items-center gap-0.5 ${inactiveClass}`}>
          <User className="h-5 w-5" strokeWidth={2} />
          <span className="text-[11px]">My Page</span>
        </button>
      </div>
    </nav>
  )
}
