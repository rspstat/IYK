import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Heart,
  MapPin,
  Clock,
  Check,
  Plus,
  Compass,
  Rocket,
} from 'lucide-react'
import { MBTI_STYLES } from '../data/mbtiStyles'
import { MOCK_SPOTS } from '../data/mockSpots'
import { CATEGORY_META } from '../data/categoryMeta'
import { CATEGORY_ICON, CONGESTION_META } from '../data/spotMeta'
import { SPOT_GRADIENTS } from '../data/spotGradients'
import { useTravelStore } from '../store/useTravelStore'
import { useAuthStore } from '../store/useAuthStore'
import BottomNav from '../components/BottomNav'
import type { MbtiCategory } from '../types'

function formatLikedDate(timestamp: number) {
  const d = new Date(timestamp)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} 찜함`
}

function recommendedTypeFor(category: MbtiCategory) {
  return MBTI_STYLES.find((s) => s.category === category)?.type
}

export default function FavoritesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/route'
  const isLoggedIn = useAuthStore((state) => state.user !== null)

  const likedSpotIds = useTravelStore((state) => state.likedSpotIds)
  const likedAt = useTravelStore((state) => state.likedAt)
  const toggleLike = useTravelStore((state) => state.toggleLike)
  const routeSpotIds = useTravelStore((state) => state.routeSpotIds)
  const addToRoute = useTravelStore((state) => state.addToRoute)
  const removeFromRoute = useTravelStore((state) => state.removeFromRoute)

  const [filterCategory, setFilterCategory] = useState<MbtiCategory | 'all'>('all')
  const [selectedIds, setSelectedIds] = useState<string[]>(() => likedSpotIds)

  const likedSpots = useMemo(
    () =>
      likedSpotIds
        .map((id) => MOCK_SPOTS.find((spot) => spot.id === id))
        .filter((spot): spot is (typeof MOCK_SPOTS)[number] => Boolean(spot))
        .sort((a, b) => (likedAt[b.id] ?? 0) - (likedAt[a.id] ?? 0)),
    [likedSpotIds, likedAt],
  )

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<MbtiCategory, number>> = {}
    likedSpots.forEach((spot) => {
      counts[spot.category] = (counts[spot.category] ?? 0) + 1
    })
    return counts
  }, [likedSpots])

  const topCategory = useMemo(() => {
    const entries = Object.entries(categoryCounts) as [MbtiCategory, number][]
    if (entries.length === 0) return null
    return entries.sort((a, b) => b[1] - a[1])[0][0]
  }, [categoryCounts])

  const visibleSpots =
    filterCategory === 'all' ? likedSpots : likedSpots.filter((spot) => spot.category === filterCategory)

  if (!isLoggedIn) {
    return <Navigate to={`/login?redirect=${encodeURIComponent('/favorites')}`} replace />
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  function handleUnlike(id: string) {
    toggleLike(id)
    setSelectedIds((prev) => prev.filter((s) => s !== id))
  }

  function buildRouteFromSelection() {
    if (selectedIds.length === 0) return
    selectedIds.forEach((id) => addToRoute(id))
    navigate(returnTo)
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-md pb-32 sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
        <header className="flex items-center justify-between bg-white px-4 py-4 dark:bg-neutral-950">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate(-1)} className="text-neutral-900 dark:text-neutral-50">
              <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
            </button>
            <img src="/logo.png" alt="" className="h-7 w-7 object-contain" />
            <span className="font-headline text-base font-bold text-neutral-900 dark:text-neutral-50">
              찜한 여행지
            </span>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
            <User className="h-5 w-5" strokeWidth={2} />
          </div>
        </header>

        {likedSpots.length === 0 ? (
          <section className="mx-5 mt-6 flex flex-col items-center rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-neutral-900">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400">
              <Compass className="h-6 w-6" strokeWidth={2} />
            </div>
            <h2 className="font-headline text-base font-bold text-neutral-900 dark:text-neutral-50">
              아직 찜한 곳이 없어요
            </h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              마음에 드는 명소를 하트로 찜해보세요.
            </p>
            <Link
              to="/"
              className="mt-4 rounded-full bg-primary-800 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-900"
            >
              MBTI 여행지 둘러보기
            </Link>
          </section>
        ) : (
          <>
            <section className="px-5 pt-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-neutral-900">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h1 className="font-headline text-lg font-bold leading-snug text-neutral-900 dark:text-neutral-50">
                      내가 찜한 충북 <span className="text-primary-600 dark:text-primary-400">{likedSpots.length}곳</span>
                    </h1>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {topCategory
                        ? `${CATEGORY_META[topCategory].label} 위주로 모아봤어요`
                        : '다양한 카테고리의 명소 모음'}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400">
                    <Heart className="h-6 w-6" strokeWidth={2.2} fill="currentColor" />
                  </div>
                </div>
              </div>
            </section>

            <nav aria-label="카테고리 필터" className="px-5 py-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setFilterCategory('all')}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold shadow-sm transition ${
                    filterCategory === 'all'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300'
                  }`}
                >
                  전체 <span className="opacity-80">{likedSpots.length}</span>
                </button>
                {(Object.keys(categoryCounts) as MbtiCategory[]).map((category) => {
                  const Icon = CATEGORY_ICON[category]
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setFilterCategory(category)}
                      className={`flex shrink-0 items-center gap-1 rounded-full px-4 py-2 text-xs font-bold shadow-sm transition ${
                        filterCategory === category
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                      {CATEGORY_META[category].label}
                      <span className="opacity-80">{categoryCounts[category]}</span>
                    </button>
                  )
                })}
              </div>
            </nav>

            <section className="flex items-center justify-between px-5 py-1">
              <div className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
                <Clock className="h-3.5 w-3.5" strokeWidth={2} />
                최근 찜한 순 · 선택 {selectedIds.length}개
              </div>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-xs font-medium text-neutral-400 hover:text-neutral-600 dark:text-neutral-500"
                >
                  선택 해제
                </button>
              )}
            </section>

            <section className="flex flex-col gap-4 px-5 py-3">
              {visibleSpots.map((spot) => {
                const congestion = CONGESTION_META[spot.congestion]
                const recommendedType = recommendedTypeFor(spot.category)
                const selected = selectedIds.includes(spot.id)
                const inRoute = routeSpotIds.includes(spot.id)
                return (
                  <article key={spot.id} className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-neutral-900">
                    <div
                      className={`relative h-44 bg-gradient-to-br ${SPOT_GRADIENTS[spot.id] ?? 'from-neutral-300 to-neutral-400'}`}
                    >
                      <div className="absolute left-3 top-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleSelected(spot.id)}
                          aria-label="경로 만들기에 포함"
                          className={`flex h-7 w-7 items-center justify-center rounded-full shadow-md transition ${
                            selected ? 'bg-primary-600 text-white' : 'bg-white/85 text-neutral-400 dark:bg-neutral-900/80'
                          }`}
                        >
                          <Check className="h-4 w-4" strokeWidth={2.4} />
                        </button>
                        {recommendedType && (
                          <span className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-bold text-primary-700 shadow-sm dark:bg-neutral-900/80 dark:text-primary-400">
                            #{recommendedType}추천
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnlike(spot.id)}
                        aria-label="찜 해제"
                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-primary-600 shadow-md dark:bg-neutral-900/85"
                      >
                        <Heart className="h-5 w-5" strokeWidth={2.2} fill="currentColor" />
                      </button>
                      <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                        <span
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${congestion.className}`}
                        >
                          <congestion.icon className="h-3 w-3" strokeWidth={2.2} />
                          혼잡도 {congestion.label}
                        </span>
                        <span className="rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white">
                          {spot.region}
                        </span>
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="font-headline text-base font-bold leading-snug text-neutral-900 dark:text-neutral-50">
                        {spot.name}
                      </h3>
                      <p className="mt-1 flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
                        <MapPin className="h-3.5 w-3.5 text-tertiary-500" strokeWidth={2} />
                        {spot.region} · 상세 위치 연동 예정
                      </p>
                      <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2.5 text-xs text-neutral-400 dark:border-neutral-800 dark:text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" strokeWidth={2} />
                          {likedAt[spot.id] ? formatLikedDate(likedAt[spot.id]) : '찜함'}
                        </span>
                        <button
                          type="button"
                          onClick={() => (inRoute ? removeFromRoute(spot.id) : addToRoute(spot.id))}
                          className={`flex items-center gap-0.5 text-xs font-bold ${
                            inRoute ? 'text-secondary-500' : 'text-primary-600 hover:underline dark:text-primary-400'
                          }`}
                        >
                          {inRoute ? '경로에 담김' : '경로 추가'}
                          {inRoute ? (
                            <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
                          ) : (
                            <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </section>
          </>
        )}
      </div>

      {likedSpots.length > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-40 px-5">
          <div className="mx-auto max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
            <button
              type="button"
              onClick={buildRouteFromSelection}
              disabled={selectedIds.length === 0}
              className="flex w-full items-center justify-between rounded-full bg-gradient-to-r from-primary-700 via-primary-600 to-secondary-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg transition disabled:opacity-40"
            >
              <span className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-primary-700">
                  {selectedIds.length}
                </span>
                선택한 명소로 여행 코스 만들기
              </span>
              <Rocket className="h-5 w-5" strokeWidth={2.2} />
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
