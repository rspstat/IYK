import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Mail, Lock } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'
  const login = useAuthStore((state) => state.login)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (login(email, password)) {
      navigate(redirectTo)
    } else {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 pt-5">
        <button type="button" onClick={() => navigate(-1)} className="self-start text-neutral-900 dark:text-neutral-50">
          <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
        </button>

        <div className="mt-8 flex flex-col items-center text-center">
          <img src="/logo.png" alt="여행가유" className="h-24 w-24 object-contain" />
          <h1 className="font-headline mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-50">
            로그인하고 시작하기
          </h1>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            찜하기·경로 저장은 로그인 후 이용할 수 있어요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
          <label className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-3 dark:border-neutral-700">
            <Mail className="h-4 w-4 text-neutral-400" strokeWidth={2} />
            <input
              type="email"
              required
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent text-sm text-neutral-900 outline-none dark:text-neutral-50"
            />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-3 dark:border-neutral-700">
            <Lock className="h-4 w-4 text-neutral-400" strokeWidth={2} />
            <input
              type="password"
              required
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent text-sm text-neutral-900 outline-none dark:text-neutral-50"
            />
          </label>

          {error && <p className="text-xs font-medium text-primary-600 dark:text-primary-400">{error}</p>}

          <button
            type="submit"
            className="mt-2 rounded-full bg-primary-800 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-900"
          >
            로그인
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-neutral-500 dark:text-neutral-400">
          계정이 없으신가요?{' '}
          <Link
            to={`/signup?redirect=${encodeURIComponent(redirectTo)}`}
            className="font-semibold text-primary-600 dark:text-primary-400"
          >
            회원가입
          </Link>
        </p>
      </div>
    </div>
  )
}
