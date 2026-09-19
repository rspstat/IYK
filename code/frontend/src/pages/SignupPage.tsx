import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Mail, Lock, User } from 'lucide-react'
import { getErrorMessage } from '../api/client'
import { useAuthStore } from '../store/useAuthStore'

export default function SignupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'
  const signup = useAuthStore((state) => state.signup)

  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signup(email, password, nickname)
      navigate(redirectTo)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 pt-5 sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
        <button type="button" onClick={() => navigate(-1)} className="self-start text-neutral-900 dark:text-neutral-50">
          <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
        </button>

        <div className="mt-8 flex flex-col items-center text-center">
          <img src="/logo.png" alt="여행가유" className="h-24 w-24 object-contain" />
          <h1 className="font-headline mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-50">
            여행가유 회원가입
          </h1>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            나만의 MBTI 여행 코스를 저장해보세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
          <label className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-3 dark:border-neutral-700">
            <User className="h-4 w-4 text-neutral-400" strokeWidth={2} />
            <input
              type="text"
              required
              placeholder="닉네임"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-transparent text-sm text-neutral-900 outline-none dark:text-neutral-50"
            />
          </label>
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
              minLength={4}
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent text-sm text-neutral-900 outline-none dark:text-neutral-50"
            />
          </label>

          {error && <p className="text-xs font-medium text-primary-600 dark:text-primary-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-full bg-primary-800 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-900 disabled:opacity-60"
          >
            {submitting ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-neutral-500 dark:text-neutral-400">
          이미 계정이 있으신가요?{' '}
          <Link
            to={`/login?redirect=${encodeURIComponent(redirectTo)}`}
            className="font-semibold text-primary-600 dark:text-primary-400"
          >
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}
