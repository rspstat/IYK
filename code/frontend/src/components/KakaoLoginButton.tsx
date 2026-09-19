import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { getErrorMessage } from '../api/client'
import { isKakaoLoginAvailable, startKakaoLogin } from '../lib/kakaoLogin'

// "또는" 구분선과 카카오로 계속하기 버튼. 서버에 카카오 로그인이 설정돼 있지 않으면 아무것도 그리지 않는다.
export default function KakaoLoginButton({ afterLoginPath }: { afterLoginPath: string }) {
  const [available, setAvailable] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    isKakaoLoginAvailable().then((value) => {
      if (!cancelled) setAvailable(value)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!available) return null

  async function handleClick() {
    setBusy(true)
    setError('')
    try {
      await startKakaoLogin(afterLoginPath) // 성공하면 카카오 로그인 창으로 이동한다
    } catch (e) {
      setError(getErrorMessage(e))
      setBusy(false)
    }
  }

  return (
    <div className="mt-4">
      <div className="flex items-center gap-3 text-[11px] text-neutral-400 dark:text-neutral-500">
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        또는
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#FEE500] py-3.5 text-sm font-bold text-[#191919] shadow-sm transition hover:brightness-95 disabled:opacity-60"
      >
        <MessageCircle className="h-5 w-5" strokeWidth={2.2} fill="currentColor" />
        {busy ? '카카오로 이동 중…' : '카카오로 계속하기'}
      </button>
      {error && <p className="mt-2 text-center text-xs font-medium text-primary-600 dark:text-primary-400">{error}</p>}
    </div>
  )
}
