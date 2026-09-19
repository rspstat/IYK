import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Heart,
  Share2,
  MapPin,
  Clock,
  Phone,
  CalendarCheck,
  Route as RouteIcon,
  Plus,
  Check,
} from 'lucide-react'
import { MBTI_STYLES } from '../data/mbtiStyles'
import { MOCK_SPOTS } from '../data/mockSpots'
import { CATEGORY_META } from '../data/categoryMeta'
import { CATEGORY_ICON, CONGESTION_META } from '../data/spotMeta'
import { SPOT_GRADIENTS } from '../data/spotGradients'
import { useTravelStore } from '../store/useTravelStore'
import { useRequireAuth } from '../hooks/useRequireAuth'
import BottomNav from '../components/BottomNav'
import type { CongestionLevel } from '../types'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// 혼잡도가 높을수록 주황(primary) 불투명도를 높여서 한 가지 색조로 표현
const CALENDAR_COLOR: Record<CongestionLevel, string> = {
  low: 'bg-primary-500/20',
  medium: 'bg-primary-500/55',
  high: 'bg-primary-500',
}

function hashCode(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

// 관광지 집중률 방문자 추이 예측 API 연동 전까지 보여줄 30일 혼잡도 예측 (spot.congestion 기반 가상 생성)
function buildCongestionSeries(spotId: string, baseline: CongestionLevel): CongestionLevel[] {
  const weights: Record<CongestionLevel, [number, number]> = {
    low: [0.6, 0.9],
    medium: [0.25, 0.75],
    high: [0.1, 0.4],
  }
  const [lowCut, mediumCut] = weights[baseline]
  const seed = hashCode(spotId)
  return Array.from({ length: 30 }, (_, i) => {
    const x = Math.sin(seed + i * 12.9898) * 43758.5453
    const r = x - Math.floor(x)
    if (r < lowCut) return 'low'
    if (r < mediumCut) return 'medium'
    return 'high'
  })
}

export default function SpotDetailPage() {
  const navigate = useNavigate()
  const { spotId } = useParams<{ spotId: string }>()
  const spot = MOCK_SPOTS.find((s) => s.id === spotId)
  const likedSpotIds = useTravelStore((state) => state.likedSpotIds)
  const toggleLike = useTravelStore((state) => state.toggleLike)
  const routeSpotIds = useTravelStore((state) => state.routeSpotIds)
  const addToRoute = useTravelStore((state) => state.addToRoute)
  const removeFromRoute = useTravelStore((state) => state.removeFromRoute)
  const requireAuth = useRequireAuth()

  if (!spot) {
    return (
      <main className="mx-auto max-w-md px-6 py-12 text-center sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
        <p className="mb-4 text-neutral-500 dark:text-neutral-400">존재하지 않는 관광지입니다.</p>
        <Link to="/" className="text-primary-600 underline dark:text-primary-400">
          메인으로 돌아가기
        </Link>
      </main>
    )
  }

  const liked = likedSpotIds.includes(spot.id)
  const inRoute = routeSpotIds.includes(spot.id)
  const congestion = CONGESTION_META[spot.congestion]

  const recommendedTypes = MBTI_STYLES.filter((s) => s.category === spot.category)
    .slice(0, 2)
    .map((s) => s.type)

  const relatedSpots = MOCK_SPOTS.filter((s) => s.category === spot.category && s.id !== spot.id).slice(0, 3)

  const congestionSeries = buildCongestionSeries(spot.id, spot.congestion)
  const bestDayIndex = congestionSeries.findIndex((level) => level === 'low')
  const bestDayLabel =
    bestDayIndex >= 0 ? `${WEEKDAYS[bestDayIndex % 7]}요일 오전 10시` : '데이터 예측 중'

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-md pb-24 sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
        <div className={`relative h-64 w-full overflow-hidden bg-gradient-to-b ${SPOT_GRADIENTS[spot.id] ?? 'from-neutral-300 to-neutral-500'}`}>
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/40 to-transparent" />
          <header className="relative flex items-center justify-between px-4 pt-4">
            <button type="button" onClick={() => navigate(-1)} className="text-white drop-shadow">
              <ArrowLeft className="h-5 w-5" strokeWidth={2.4} />
            </button>
            <span className="text-sm font-bold text-white drop-shadow">Chungbuk MBTI Tour</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => requireAuth(() => toggleLike(spot.id))}
                aria-label="찜하기"
                className="text-white drop-shadow"
              >
                <Heart className="h-5 w-5" strokeWidth={2.2} fill={liked ? 'currentColor' : 'none'} />
              </button>
              <button type="button" aria-label="공유하기" className="text-white drop-shadow">
                <Share2 className="h-5 w-5" strokeWidth={2.2} />
              </button>
            </div>
          </header>

          <span
            className={`absolute bottom-3 right-4 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ${congestion.className}`}
          >
            <congestion.icon className="h-3 w-3" strokeWidth={2.2} />
            혼잡도: {congestion.label}
          </span>
        </div>

        <section className="relative -mt-6 rounded-t-3xl bg-white px-5 pt-5 pb-5 shadow-sm dark:bg-neutral-900">
          {recommendedTypes.length > 0 && (
            <span className="inline-block rounded-full bg-secondary-400 px-2.5 py-1 text-xs font-bold text-neutral-900">
              {recommendedTypes.join(' / ')} 추천
            </span>
          )}
          <h1 className="font-headline mt-3 text-xl font-bold leading-snug text-neutral-900 dark:text-neutral-50">
            {spot.name}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{spot.summary}</p>

          <div className="mt-4 flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <MapPin className="h-4 w-4 text-neutral-400" strokeWidth={2} />
              {spot.region} · 상세 위치 연동 예정
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <Clock className="h-4 w-4 text-neutral-400" strokeWidth={2} />
              운영시간 정보 연동 예정
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <Phone className="h-4 w-4 text-neutral-400" strokeWidth={2} />
              전화 문의 정보 연동 예정
            </div>
          </div>
        </section>

        <section className="mx-5 mt-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-sm font-bold text-neutral-900 dark:text-neutral-50">
              30일 방문 혼잡도 예측
            </h2>
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">데이터 출처: TourAPI</span>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1.5">
            {congestionSeries.map((level, i) => (
              <span key={i} className={`h-6 w-full rounded-md ${CALENDAR_COLOR[level]}`} />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-primary-50 p-3 dark:bg-primary-950/30">
            <CalendarCheck className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" strokeWidth={2.2} />
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              이번 주말 가장 쾌적한 방문일{' '}
              <span className="font-bold text-primary-700 dark:text-primary-400">{bestDayLabel}</span>
            </p>
          </div>
        </section>

        <section className="mt-7 px-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-headline text-base font-bold text-neutral-900 dark:text-neutral-50">
              이런 곳도 가보세요
            </h2>
            <span className="text-xs text-neutral-400 dark:text-neutral-500">더보기</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {relatedSpots.map((related) => {
              const relatedLiked = likedSpotIds.includes(related.id)
              const RelatedCategoryIcon = CATEGORY_ICON[related.category]
              return (
                <Link key={related.id} to={`/spot/${related.id}`} className="w-36 shrink-0">
                  <div
                    className={`relative h-24 overflow-hidden rounded-xl bg-gradient-to-br shadow-sm ${SPOT_GRADIENTS[related.id] ?? 'from-neutral-300 to-neutral-400'}`}
                  >
                    <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-white/85 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700 dark:bg-neutral-900/80 dark:text-neutral-200">
                      <RelatedCategoryIcon className="h-2.5 w-2.5" strokeWidth={2.2} />
                      {CATEGORY_META[related.category].label}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        requireAuth(() => toggleLike(related.id))
                      }}
                      aria-label="찜하기"
                      className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/85 text-xs dark:bg-neutral-900/80 ${relatedLiked ? 'text-primary-600' : 'text-neutral-400'}`}
                    >
                      {relatedLiked ? '♥' : '♡'}
                    </button>
                  </div>
                  <p className="mt-1.5 truncate text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    {related.name}
                  </p>
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500">{related.region}</p>
                </Link>
              )
            })}
          </div>
        </section>

        <section className="mt-7 px-5">
          <h2 className="font-headline mb-3 text-base font-bold text-neutral-900 dark:text-neutral-50">
            여행자 후기
          </h2>
          <div className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tertiary-100 text-xs font-bold text-tertiary-700 dark:bg-tertiary-900/40 dark:text-tertiary-300">
                  민
                </span>
                <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">여행자 민준</span>
              </div>
              <span className="text-xs text-neutral-400 dark:text-neutral-500">2시간 전</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
              생각보다 훨씬 좋았어요! {spot.name}, 다음에 또 오고 싶네요.
            </p>
            <div className="mt-2 flex items-center gap-3 text-xs text-neutral-400 dark:text-neutral-500">
              <span>♥ 24</span>
            </div>
          </div>
        </section>

        <div className="mt-7 flex gap-2 px-5">
          <Link
            to="/route"
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary-800 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-900"
          >
            <RouteIcon className="h-4 w-4" strokeWidth={2.2} />
            여행 경로 정하기
          </Link>
          <button
            type="button"
            onClick={() => requireAuth(() => (inRoute ? removeFromRoute(spot.id) : addToRoute(spot.id)))}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full border py-3.5 text-sm font-bold shadow-sm transition ${
              inRoute
                ? 'border-secondary-400 bg-secondary-400 text-neutral-900 hover:bg-secondary-500'
                : 'border-primary-800 bg-white text-primary-800 hover:bg-primary-50 dark:bg-neutral-900 dark:hover:bg-neutral-800'
            }`}
          >
            {inRoute ? <Check className="h-4 w-4" strokeWidth={2.2} /> : <Plus className="h-4 w-4" strokeWidth={2.2} />}
            {inRoute ? '경로에 추가됨' : '경로에 추가하기'}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
