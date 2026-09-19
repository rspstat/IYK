import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Search as SearchIcon, X, Heart, Check, Plus, SearchX } from 'lucide-react'
import { getErrorMessage } from '../api/client'
import { spotApi } from '../api/spots'
import { CATEGORY_META } from '../data/categoryMeta'
import { CATEGORY_ICON } from '../data/spotMeta'
import { useTravelStore } from '../store/useTravelStore'
import { useSpotStore } from '../store/useSpotStore'
import { useRequireAuth } from '../hooks/useRequireAuth'
import { useApiData } from '../hooks/useApiData'
import BottomNav from '../components/BottomNav'
import CongestionBadge from '../components/CongestionBadge'
import SpotImage from '../components/SpotImage'
import { pickImage } from '../data/spotImage'
import type { MbtiCategory } from '../types'

const RESULT_LIMIT = 30
const DEBOUNCE_MS = 300

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

  const rememberSpots = useSpotStore((state) => state.remember)

  const trimmedQuery = query.trim()
  // 타이핑할 때마다 요청하지 않고, 입력이 잠시 멈춘 뒤에 서버에 검색한다.
  const [debouncedQuery, setDebouncedQuery] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(trimmedQuery), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [trimmedQuery])

  const search = useApiData(
    () => spotApi.search({ q: debouncedQuery, category: filterCategory === 'all' ? null : filterCategory, limit: RESULT_LIMIT }),
    `${debouncedQuery}|${filterCategory}`,
  )
  const results = search.data ?? []
  useEffect(() => {
    if (search.data) rememberSpots(search.data)
  }, [search.data, rememberSpots])

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div
        className={`mx-auto max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl ${returnTo || routeSpotIds.length > 0 ? 'pb-32' : 'pb-24'}`}
      >
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
          {search.loading
            ? '검색 중…'
            : `${debouncedQuery ? `'${debouncedQuery}' 검색 결과` : '충북 여행지'} ${results.length}${results.length >= RESULT_LIMIT ? '곳 이상' : '곳'}`}
        </p>

        {search.error !== undefined && !search.loading ? (
          <div className="mx-5 mt-4 rounded-2xl bg-white p-6 text-center shadow-sm dark:bg-neutral-900">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{getErrorMessage(search.error)}</p>
            <button
              type="button"
              onClick={search.reload}
              className="mt-3 rounded-full bg-primary-800 px-5 py-2 text-xs font-bold text-white transition hover:bg-primary-900"
            >
              다시 시도
            </button>
          </div>
        ) : search.loading && results.length === 0 ? (
          <div className="flex flex-col gap-4 px-5 py-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-neutral-900">
                <div className="h-36 bg-neutral-200 dark:bg-neutral-800" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-3 w-full rounded bg-neutral-100 dark:bg-neutral-800/70" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
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
              const CategoryIcon = CATEGORY_ICON[spot.category]
              const liked = likedSpotIds.includes(spot.id)
              const inRoute = routeSpotIds.includes(spot.id)
              return (
                <article key={spot.id} className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-neutral-900">
                  <Link to={`/spot/${spot.id}`} className="block">
                    <SpotImage src={pickImage(spot, 'thumb')} seed={spot.id} className="h-36">
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
                        <CongestionBadge level={spot.congestion} />
                        <span className="rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white">
                          {spot.region}
                        </span>
                      </div>
                    </SpotImage>
                  </Link>

                  <div className="p-4">
                    <Link to={`/spot/${spot.id}`}>
                      <h3 className="font-headline text-base font-bold leading-snug text-neutral-900 dark:text-neutral-50">
                        {spot.name}
                      </h3>
                    </Link>
                    {spot.summary && (
                      <p className="mt-1 line-clamp-2 text-xs text-neutral-400 dark:text-neutral-500">{spot.summary}</p>
                    )}
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
          <div className="mx-auto max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
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
