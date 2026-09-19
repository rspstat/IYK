import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Search as SearchIcon, X, Heart, Check, Plus, SearchX } from 'lucide-react'
import { MOCK_SPOTS } from '../data/mockSpots'
import { CATEGORY_META } from '../data/categoryMeta'
import { CATEGORY_ICON, CONGESTION_META } from '../data/spotMeta'
import { SPOT_GRADIENTS } from '../data/spotGradients'
import { useTravelStore } from '../store/useTravelStore'
import { useRequireAuth } from '../hooks/useRequireAuth'
import BottomNav from '../components/BottomNav'
import type { MbtiCategory } from '../types'

export default function SearchPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo')
  const [query, setQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<MbtiCategory | 'all'>('all')

  const likedSpotIds = useTravelStore((state) => state.likedSpotIds)
  const toggleLike = useTravelStore((state) => state.toggleLike)
  const routeSpotIds = useTravelStore((state) => state.routeSpotIds)
  const addToRoute = useTravelStore((state) => state.addToRoute)
  const removeFromRoute = useTravelStore((state) => state.removeFromRoute)
  const requireAuth = useRequireAuth()

  const trimmedQuery = query.trim()

  const results = useMemo(() => {
    return MOCK_SPOTS.filter((spot) => {
      const matchesQuery =
        trimmedQuery.length === 0 ||
        spot.name.includes(trimmedQuery) ||
        spot.region.includes(trimmedQuery) ||
        spot.summary.includes(trimmedQuery)
      const matchesCategory = filterCategory === 'all' || spot.category === filterCategory
      return matchesQuery && matchesCategory
    })
  }, [trimmedQuery, filterCategory])

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className={`mx-auto max-w-md ${returnTo || routeSpotIds.length > 0 ? 'pb-32' : 'pb-24'}`}>
        <header className="flex items-center gap-2 bg-white px-4 py-4 dark:bg-neutral-950">
          <button type="button" onClick={() => navigate(-1)} className="text-neutral-900 dark:text-neutral-50">
            <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
          </button>
          <label className="flex flex-1 items-center gap-2 rounded-full bg-neutral-100 px-4 py-2.5 dark:bg-neutral-800">
            <SearchIcon className="h-4 w-4 shrink-0 text-neutral-400" strokeWidth={2.2} />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="여행지, 지역으로 검색"
              className="w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-50"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="검색어 지우기"
                className="text-neutral-400"
              >
                <X className="h-4 w-4" strokeWidth={2.2} />
              </button>
            )}
          </label>
        </header>

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
              전체
            </button>
            {(Object.keys(CATEGORY_META) as MbtiCategory[]).map((category) => {
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
                </button>
              )
            })}
          </div>
        </nav>

        <p className="px-5 py-1 text-xs text-neutral-400 dark:text-neutral-500">
          {trimmedQuery ? `'${trimmedQuery}' 검색 결과 ${results.length}건` : `충북 여행지 ${results.length}곳`}
        </p>

        {results.length === 0 ? (
          <div className="mx-5 mt-4 flex flex-col items-center rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-neutral-900">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400">
              <SearchX className="h-6 w-6" strokeWidth={2} />
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">검색 결과가 없어요.</p>
            <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
              다른 지역명이나 명소 이름으로 찾아보세요.
            </p>
          </div>
        ) : (
          <section className="flex flex-col gap-4 px-5 py-3">
            {results.map((spot) => {
              const congestion = CONGESTION_META[spot.congestion]
              const CategoryIcon = CATEGORY_ICON[spot.category]
              const liked = likedSpotIds.includes(spot.id)
              const inRoute = routeSpotIds.includes(spot.id)
              return (
                <article key={spot.id} className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-neutral-900">
                  <Link to={`/spot/${spot.id}`} className="block">
                    <div
                      className={`relative h-36 bg-gradient-to-br ${SPOT_GRADIENTS[spot.id] ?? 'from-neutral-300 to-neutral-400'}`}
                    >
                      <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-bold text-neutral-700 shadow-sm dark:bg-neutral-900/80 dark:text-neutral-200">
                        <CategoryIcon className="h-3.5 w-3.5" strokeWidth={2.2} />
                        {CATEGORY_META[spot.category].label}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          requireAuth(() => toggleLike(spot.id))
                        }}
                        aria-label="찜하기"
                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md dark:bg-neutral-900/85"
                      >
                        <Heart
                          className={`h-5 w-5 ${liked ? 'text-primary-600' : 'text-neutral-400'}`}
                          strokeWidth={2.2}
                          fill={liked ? 'currentColor' : 'none'}
                        />
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
                  </Link>

                  <div className="p-4">
                    <Link to={`/spot/${spot.id}`}>
                      <h3 className="font-headline text-base font-bold leading-snug text-neutral-900 dark:text-neutral-50">
                        {spot.name}
                      </h3>
                    </Link>
                    <p className="mt-1 line-clamp-2 text-xs text-neutral-400 dark:text-neutral-500">{spot.summary}</p>
                    <div className="mt-3 flex items-center justify-end border-t border-neutral-100 pt-2.5 dark:border-neutral-800">
                      <button
                        type="button"
                        onClick={() =>
                          requireAuth(() => (inRoute ? removeFromRoute(spot.id) : addToRoute(spot.id)))
                        }
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
        )}
      </div>

      {(returnTo || routeSpotIds.length > 0) && (
        <div className="fixed inset-x-0 bottom-20 z-40 px-5">
          <div className="mx-auto max-w-md">
            <button
              type="button"
              onClick={() => navigate(returnTo || '/route')}
              className="flex w-full items-center justify-between rounded-full bg-gradient-to-r from-primary-700 via-primary-600 to-secondary-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg transition"
            >
              <span className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-primary-700">
                  {routeSpotIds.length}
                </span>
                담은 명소로 경로 돌아가기
              </span>
              <ArrowRight className="h-5 w-5" strokeWidth={2.2} />
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
