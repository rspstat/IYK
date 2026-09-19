import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Send, Trash2 } from 'lucide-react'
import { getErrorMessage } from '../api/client'
import { commentApi, parseServerDate, type Comment } from '../api/endpoints'
import { useAuthStore } from '../store/useAuthStore'

const MAX_LENGTH = 1000 // 백엔드 comments.content 컬럼 길이(VARCHAR 1000)

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatRelativeTime(value: string) {
  const time = parseServerDate(value)
  if (Number.isNaN(time)) return ''
  const minutes = Math.floor(Math.max(0, Date.now() - time) / 60000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  const d = new Date(time)
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
}

// 관광지 후기(댓글). 목록 조회는 누구나, 작성·삭제는 로그인한 사용자(삭제는 본인 글만).
// 부모가 key={spotId}로 렌더링해서 관광지가 바뀌면 상태가 초기화된다.
export default function SpotComments({ spotId }: { spotId: string }) {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    let cancelled = false
    commentApi
      .list(spotId)
      .then(({ comments }) => {
        if (!cancelled) setComments(comments)
      })
      .catch((error) => {
        if (!cancelled) setLoadError(getErrorMessage(error))
      })
    return () => {
      cancelled = true
    }
  }, [spotId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) return
    setActionError('')
    setSubmitting(true)
    try {
      const created = await commentApi.create(spotId, trimmed)
      setComments((prev) => [created, ...(prev ?? [])])
      setContent('')
    } catch (error) {
      setActionError(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(commentId: number) {
    if (!window.confirm('이 후기를 삭제할까요?')) return
    setActionError('')
    try {
      await commentApi.remove(commentId)
      setComments((prev) => prev?.filter((comment) => comment.id !== commentId) ?? null)
    } catch (error) {
      setActionError(getErrorMessage(error))
    }
  }

  const loginPath = `/login?redirect=${encodeURIComponent(`${location.pathname}${location.search}`)}`

  return (
    <section className="mt-7 px-5">
      <h2 className="font-headline mb-3 text-base font-bold text-neutral-900 dark:text-neutral-50">
        여행자 후기
        {comments && <span className="ml-1.5 text-primary-600 dark:text-primary-400">{comments.length}</span>}
      </h2>

      {user ? (
        <form
          onSubmit={handleSubmit}
          className="mb-3 flex items-end gap-2 rounded-2xl bg-white p-3 shadow-sm dark:bg-neutral-900"
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={MAX_LENGTH}
            rows={2}
            placeholder={`${user.nickname}님, 다녀온 후기를 남겨보세요`}
            className="w-full resize-none bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-50"
          />
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            aria-label="후기 등록"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-800 text-white transition hover:bg-primary-900 disabled:opacity-40"
          >
            <Send className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </form>
      ) : (
        <Link
          to={loginPath}
          className="mb-3 flex items-center justify-center rounded-full border border-dashed border-primary-300 py-2.5 text-xs font-bold text-primary-700 transition hover:bg-primary-50 dark:border-primary-800 dark:text-primary-400 dark:hover:bg-primary-950/30"
        >
          로그인하고 후기 남기기
        </Link>
      )}

      {actionError && <p className="mb-3 text-xs font-medium text-primary-600 dark:text-primary-400">{actionError}</p>}

      {loadError ? (
        <p className="rounded-2xl bg-neutral-50 p-4 text-center text-xs text-neutral-500 dark:bg-neutral-800/40 dark:text-neutral-400">
          {loadError}
        </p>
      ) : comments === null ? (
        <p className="rounded-2xl bg-neutral-50 p-4 text-center text-xs text-neutral-400 dark:bg-neutral-800/40 dark:text-neutral-500">
          후기를 불러오는 중...
        </p>
      ) : comments.length === 0 ? (
        <p className="rounded-2xl bg-neutral-50 p-4 text-center text-xs text-neutral-500 dark:bg-neutral-800/40 dark:text-neutral-400">
          아직 후기가 없어요. 첫 후기를 남겨보세요!
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((comment) => (
            <article key={comment.id} className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tertiary-100 text-xs font-bold text-tertiary-700 dark:bg-tertiary-900/40 dark:text-tertiary-300">
                    {Array.from(comment.author)[0]}
                  </span>
                  <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{comment.author}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500">
                  <span>{formatRelativeTime(comment.createdAt)}</span>
                  {user?.id === comment.authorId && (
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      aria-label="후기 삭제"
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                {comment.content}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
