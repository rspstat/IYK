import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Trash2, Waypoints, ChevronRight, Compass, Pencil, Check, X } from 'lucide-react'
import { getErrorMessage } from '../api/client'
import { useTravelStore } from '../store/useTravelStore'
import { useAuthStore } from '../store/useAuthStore'
import { useSpotsByIds } from '../hooks/useSpotsByIds'
import { makeProfileImage, ProfileImageError } from '../lib/profileImage'
import BottomNav from '../components/BottomNav'
import ProfileAvatar from '../components/ProfileAvatar'
import ProfileMenu from '../components/ProfileMenu'

function formatSavedDate(timestamp: number) {
  const d = new Date(timestamp)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} 저장`
}

// 서버(UserService.NICKNAME_MAX_LENGTH)와 같은 값이어야 한다.
const NICKNAME_MAX_LENGTH = 20

export default function MyPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const changeNickname = useAuthStore((state) => state.changeNickname)
  const changeProfileImage = useAuthStore((state) => state.changeProfileImage)
  const refreshProfile = useAuthStore((state) => state.refreshProfile)
  const logout = useAuthStore((state) => state.logout)
  const isLoggedIn = user !== null

  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameDraft, setNicknameDraft] = useState('')
  const [nicknameSaving, setNicknameSaving] = useState(false)
  const [nicknameError, setNicknameError] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  // 다른 기기에서 바꾼 사진·닉네임도 보이도록 들어올 때마다 서버 값으로 맞춘다.
  useEffect(() => {
    void refreshProfile()
  }, [refreshProfile])

  const savedRoutes = useTravelStore((state) => state.savedRoutes)
  const deleteSavedRoute = useTravelStore((state) => state.deleteSavedRoute)

  const sortedRoutes = useMemo(
    () => [...savedRoutes].sort((a, b) => b.createdAt - a.createdAt),
    [savedRoutes],
  )

  // 저장한 경로에는 관광지 id 만 들어 있어서, 경로에 표시할 이름은 서버에서 받아온다(경로들이 공유하는 id 는 한 번만).
  const allSpotIds = useMemo(() => Array.from(new Set(sortedRoutes.flatMap((route) => route.spotIds))), [sortedRoutes])
  const { spots: knownSpots } = useSpotsByIds(allSpotIds)
  const spotsById = useMemo(() => new Map(knownSpots.map((spot) => [spot.id, spot])), [knownSpots])

  if (!isLoggedIn) {
    // 로그아웃해서 비로그인이 된 경우에는 로그인 화면이 아니라 홈으로 가야 하므로 리다이렉트하지 않는다.
    if (loggingOut) return null
    return <Navigate to={`/login?redirect=${encodeURIComponent('/mypage')}`} replace />
  }

  function startEditNickname() {
    setNicknameDraft(user!.nickname)
    setNicknameError(null)
    setEditingNickname(true)
  }

  function cancelEditNickname() {
    if (nicknameSaving) return
    setEditingNickname(false)
    setNicknameError(null)
  }

  async function saveNickname() {
    if (nicknameSaving) return
    const next = nicknameDraft.trim()
    if (next === '') {
      setNicknameError('닉네임을 입력해주세요.')
      return
    }
    // 바뀐 게 없으면 서버에 보내지 않고 닫는다.
    if (next === user!.nickname) {
      setEditingNickname(false)
      return
    }
    setNicknameSaving(true)
    setNicknameError(null)
    try {
      await changeNickname(next)
      setEditingNickname(false)
    } catch (err) {
      setNicknameError(getErrorMessage(err))
    } finally {
      setNicknameSaving(false)
    }
  }

  // next 가 null 이면 프로필 사진 삭제, File 이면 줄여서 올린다.
  async function updatePhoto(next: File | null) {
    if (photoBusy) return
    setPhotoBusy(true)
    setPhotoError(null)
    try {
      await changeProfileImage(next === null ? null : await makeProfileImage(next))
    } catch (err) {
      setPhotoError(err instanceof ProfileImageError ? err.message : getErrorMessage(err))
    } finally {
      setPhotoBusy(false)
    }
  }

  function handleLogout() {
    // 로그아웃하면 이 페이지의 "로그인 필요" 리다이렉트가 동작하므로, 표시를 해 두고 홈으로 보낸다.
    setLoggingOut(true)
    navigate('/', { replace: true })
    logout()
  }

  function handleView(routeId: string) {
    navigate(`/route?editId=${routeId}`)
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-md pb-28 sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
        <header className="flex items-center justify-between bg-white px-4 py-4 dark:bg-neutral-950">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate(-1)} className="text-neutral-900 dark:text-neutral-50">
              <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
            </button>
            <span className="font-headline text-base font-bold text-neutral-900 dark:text-neutral-50">
              마이페이지
            </span>
          </div>
          <ProfileMenu
            image={user.profileImage}
            busy={photoBusy}
            onPickFile={(file) => void updatePhoto(file)}
            onRemove={() => void updatePhoto(null)}
            onLogout={handleLogout}
          />
        </header>

        <section className="px-5 pt-4">
          <div className="flex items-center gap-3 rounded-2xl bg-white p-5 shadow-sm dark:bg-neutral-900">
            <ProfileAvatar
              image={user.profileImage}
              className={`h-12 w-12 shrink-0 bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400 ${photoBusy ? 'opacity-60' : ''}`}
              iconClassName="h-6 w-6"
            />
            <div className="min-w-0 flex-1">
              {editingNickname ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    void saveNickname()
                  }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    autoFocus
                    value={nicknameDraft}
                    maxLength={NICKNAME_MAX_LENGTH}
                    disabled={nicknameSaving}
                    aria-label="닉네임"
                    onChange={(e) => setNicknameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') cancelEditNickname()
                    }}
                    className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-transparent px-2.5 py-1.5 font-headline text-base font-bold text-neutral-900 outline-none focus:border-primary-600 dark:border-neutral-700 dark:text-neutral-50"
                  />
                  <button
                    type="submit"
                    disabled={nicknameSaving}
                    aria-label="닉네임 저장"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-800 text-white transition hover:bg-primary-900 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" strokeWidth={2.4} />
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditNickname}
                    disabled={nicknameSaving}
                    aria-label="닉네임 수정 취소"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-400"
                  >
                    <X className="h-4 w-4" strokeWidth={2.4} />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-1.5">
                  <p className="truncate font-headline text-base font-bold text-neutral-900 dark:text-neutral-50">
                    {user.nickname}
                  </p>
                  <button
                    type="button"
                    onClick={startEditNickname}
                    aria-label="닉네임 수정"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </button>
                </div>
              )}
              {nicknameError && (
                <p role="alert" className="mt-1 text-xs font-medium text-primary-600 dark:text-primary-400">
                  {nicknameError}
                </p>
              )}
              <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">{user.email ?? '카카오 계정으로 로그인'}</p>
            </div>
          </div>
          {photoError && (
            <p role="alert" className="mt-2 px-1 text-xs font-medium text-primary-600 dark:text-primary-400">
              {photoError}
            </p>
          )}
        </section>

        <section className="mt-5 px-5">
          <h2 className="font-headline text-sm font-bold text-neutral-900 dark:text-neutral-50">
            저장한 여행 경로 <span className="text-primary-600 dark:text-primary-400">{sortedRoutes.length}</span>
          </h2>

          {sortedRoutes.length === 0 ? (
            <div className="mt-3 flex flex-col items-center rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-neutral-900">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400">
                <Compass className="h-6 w-6" strokeWidth={2} />
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">아직 저장한 여행 경로가 없어요.</p>
              <Link
                to="/route"
                className="mt-4 rounded-full bg-primary-800 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-900"
              >
                여행 경로 만들러 가기
              </Link>
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {sortedRoutes.map((route) => {
                const spots = route.spotIds.map((id) => spotsById.get(id)).filter((spot) => spot !== undefined)
                return (
                  <article key={route.id} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-900">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-headline text-base font-bold leading-snug text-neutral-900 dark:text-neutral-50">
                          {route.name}
                        </h3>
                        <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                          {formatSavedDate(route.createdAt)} · {route.spotIds.length}곳
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteSavedRoute(route.id)}
                        aria-label="저장한 경로 삭제"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-500"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2.2} />
                      </button>
                    </div>

                    {spots.length > 0 && (
                      <p className="mt-2 flex items-start gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-tertiary-500" strokeWidth={2} />
                        {spots.map((spot) => spot.name).join(' → ')}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => handleView(route.id)}
                      className="mt-3 flex w-full items-center justify-between rounded-full bg-neutral-50 px-4 py-2.5 text-xs font-bold text-primary-700 transition hover:bg-neutral-100 dark:bg-neutral-800 dark:text-primary-400"
                    >
                      <span className="flex items-center gap-1.5">
                        <Waypoints className="h-3.5 w-3.5" strokeWidth={2.2} />
                        경로 다시 보기
                      </span>
                      <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </button>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <BottomNav />
    </div>
  )
}
