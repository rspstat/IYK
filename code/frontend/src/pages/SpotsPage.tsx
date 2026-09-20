import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart } from 'lucide-react'
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

const RESULT_LIMIT = 40

// 메인 화면 "충북 추천 명소" 더보기 → 전체 명소를 그리드로 보여주는 목록 페이지.
// 검색어/필터 없이 spotApi.search 를 넓게(limit 만) 호출해 충북 명소 전체를 훑어본다.
export default function SpotsPage() {
  const navigate = useNavigate()
  const likedSpotIds = useTravelStore((state) => state.likedSpotIds)
  const toggleLike = useTravelStore((state) => state.toggleLike)
  const requireAuth = useRequireAuth()
  const rememberSpots = useSpotStore((state) => state.remember)

  const spots = useApiData(() => spotApi.search({ limit: RESULT_LIMIT }), 'all-spots')
  const results = spots.data ?? []
  useEffect(() => {
    if (spots.data) rememberSpots(spots.data)
  }, [spots.data, rememberSpots])

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-md pb-24 sm:max-w-xl md:max-w-2xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
        <header className="flex items-center gap-3 bg-neutral-50 px-4 py-4 dark:bg-neutral-950">
          <button type="button" onClick={() => navigate(-1)} className="text-neutral-900 dark:text-neutral-50">
            <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
          </button>
          <h1 className="font-headline text-lg font-bold text-neutral-900 dark:text-neutral-50">충북 추천 명소</h1>
        </header>

        {spots.error !== undefined && !spots.loading ? (
          <div className="mx-5 mt-4 rounded-2xl bg-white p-6 text-center shadow-sm dark:bg-neutral-900">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{getErrorMessage(spots.error)}</p>
            <button
              type="button"
              onClick={spots.reload}
              className="mt-3 rounded-full bg-primary-800 px-5 py-2 text-xs font-bold text-white transition hover:bg-primary-900"
            >
              다시 시도
            </button>
          </div>
        ) : spots.loading && results.length === 0 ? (
          <div className="grid grid-cols-2 gap-4 px-5 py-3 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-neutral-900">
                <div className="h-32 bg-neutral-200 dark:bg-neutral-800" />
                <div className="space-y-2 p-3">
                  <div className="h-3.5 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-3 w-full rounded bg-neutral-100 dark:bg-neutral-800/70" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <section className="grid grid-cols-2 gap-4 px-5 py-3 sm:grid-cols-3 lg:grid-cols-4">
            {results.map((spot) => {
              const CategoryIcon = CATEGORY_ICON[spot.category]
              const liked = likedSpotIds.includes(spot.id)
              return (
                <article key={spot.id} className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-neutral-900">
                  <Link to={`/spot/${spot.id}`} className="block">
                    <SpotImage src={pickImage(spot, 'thumb')} seed={spot.id} className="h-32">
                      <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-bold text-neutral-700 shadow-sm dark:bg-neutral-900/80 dark:text-neutral-200">
                        <CategoryIcon className="h-3 w-3" strokeWidth={2.2} />
                        {CATEGORY_META[spot.category].label}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          requireAuth(() => toggleLike(spot.id))
                        }}
                        aria-label="찜하기"
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm dark:bg-neutral-900/85"
                      >
                        <Heart
                          className={`h-4 w-4 ${liked ? 'text-primary-600' : 'text-neutral-400'}`}
                          strokeWidth={2.2}
                          fill={liked ? 'currentColor' : 'none'}
                        />
                      </button>
                      <div className="absolute bottom-2 left-2 flex items-center gap-1">
                        <CongestionBadge level={spot.congestion} />
                        <span className="rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          {spot.region}
                        </span>
                      </div>
                    </SpotImage>
                  </Link>
                  <div className="p-3">
                    <Link to={`/spot/${spot.id}`}>
                      <h3 className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-50">{spot.name}</h3>
                    </Link>
                    {spot.summary && (
                      <p className="mt-1 line-clamp-2 text-xs text-neutral-400 dark:text-neutral-500">{spot.summary}</p>
                    )}
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
