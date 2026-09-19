import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

// 로그인 필요한 액션(찜하기·경로 저장 등)을 감싸는 헬퍼.
// 비로그인 상태면 /login으로 보내고, 로그인 상태면 action을 바로 실행한다.
export function useRequireAuth() {
  const navigate = useNavigate()
  const location = useLocation()
  const isLoggedIn = useAuthStore((state) => state.user !== null)

  return (action: () => void, redirectTo: string = `${location.pathname}${location.search}`) => {
    if (!isLoggedIn) {
      navigate(`/login?redirect=${encodeURIComponent(redirectTo)}`)
      return
    }
    action()
  }
}
