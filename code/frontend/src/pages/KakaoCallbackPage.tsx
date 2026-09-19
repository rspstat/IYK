import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getErrorMessage } from '../api/client'
import { consumeKakaoLoginState, kakaoRedirectUri } from '../lib/kakaoLogin'
import { useAuthStore } from '../store/useAuthStore'

// 카카오 로그인 창에서 돌아오는 화면(/auth/kakao/callback?code=...&state=...).
// 인가 코드는 한 번만 쓸 수 있어서, 개발 모드(StrictMode)에서 효과가 두 번 실행돼도 서버에는 한 번만 보낸다.
export default function KakaoCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const loginWithKakao = useAuthStore((state) => state.loginWithKakao)
  const started = useRef(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (started.current) return
    started.current = true

    const code = searchParams.get('code')
    const kakaoError = searchParams.get('error')
    const { valid, afterLoginPath } = consumeKakaoLoginState(searchParams.get('state'))

    if (kakaoError) {
      // 사용자가 카카오 동의 화면에서 취소하면 error=access_denied 로 돌아온다.
      setError(kakaoError === 'access_denied' ? '카카오 로그인을 취소했어요.' : '카카오 로그인 중 문제가 생겼어요. 다시 시도해주세요.')
      return
    }
    if (!code || !valid) {
      setError('올바르지 않은 로그인 요청이에요. 처음부터 다시 시도해주세요.')
      return
    }
    loginWithKakao(code, kakaoRedirectUri()).then(
      () => navigate(afterLoginPath, { replace: true }),
      (e) => setError(getErrorMessage(e)),
    )
  }, [searchParams, loginWithKakao, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 dark:bg-neutral-950">
      <div className="text-center">
        {error ? (
          <>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">{error}</p>
            <Link
              to="/login"
              replace
              className="mt-4 inline-block rounded-full bg-primary-800 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-primary-900"
            >
              로그인으로 돌아가기
            </Link>
          </>
        ) : (
          <p className="text-sm text-neutral-500 dark:text-neutral-400" aria-busy="true">
            카카오 로그인 중이에요…
          </p>
        )}
      </div>
    </div>
  )
}
