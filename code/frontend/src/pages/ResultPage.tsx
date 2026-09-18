import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Maximize2,
  MapPin,
  Share2,
  Sparkles,
  ChevronRight,
  Route as RouteIcon,
} from 'lucide-react'
import { MBTI_STYLES } from '../data/mbtiStyles'
import { MOCK_SPOTS } from '../data/mockSpots'
import { CATEGORY_META } from '../data/categoryMeta'
import { CATEGORY_ICON, CONGESTION_META } from '../data/spotMeta'
import { SPOT_GRADIENTS } from '../data/spotGradients'
import { useTravelStore } from '../store/useTravelStore'
import { useRequireAuth } from '../hooks/useRequireAuth'
import BottomNav from '../components/BottomNav'

export default function ResultPage() {
  const { mbti } = useParams<{ mbti: string }>()
  const style = MBTI_STYLES.find((s) => s.type === mbti?.toUpperCase())
  const likedSpotIds = useTravelStore((state) => state.likedSpotIds)
  const toggleLike = useTravelStore((state) => state.toggleLike)
  const requireAuth = useRequireAuth()

  if (!style) {
    return (
      <main className="mx-auto max-w-md px-6 py-12 text-center">
        <p className="mb-4 text-neutral-500 dark:text-neutral-400">알 수 없는 MBTI 유형입니다.</p>
        <Link to="/" className="text-primary-600 underline dark:text-primary-400">
          메인으로 돌아가기
        </Link>
      </main>
    )
  }

  const spots = MOCK_SPOTS.filter((spot) => spot.category === style.category)
  const CategoryIcon = CATEGORY_ICON[style.category]

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-md pb-24">
        <header className="flex items-center justify-between px-5 pt-5">
          <Link to="/" className="flex items-center gap-2 text-neutral-900 dark:text-neutral-50">
            <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
            <span className="font-headline text-base font-bold">추천 결과</span>
          </Link>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
            <User className="h-5 w-5" strokeWidth={2} />
          </div>
        </header>

        <section className="mx-5 mt-4 rounded-2xl bg-white p-5 shadow-sm dark:bg-neutral-900">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary-500 px-2.5 py-1 text-xs font-bold text-white">
              {style.type}
            </span>
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{style.title}</span>
          </div>
          <h1 className="font-headline mt-3 text-lg font-bold leading-snug text-neutral-900 dark:text-neutral-50">
            {style.type}를 위한 충북의 보석같은 여행지
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            {style.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {style.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>

        <section className="mx-5 mt-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline text-sm font-bold text-neutral-900 dark:text-neutral-50">여행 지도</h2>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500">추천 명소 위치 확인하세요</p>
            </div>
            <Maximize2 className="h-4 w-4 text-neutral-400 dark:text-neutral-500" strokeWidth={2} />
          </div>
          <div className="relative mt-3 flex h-36 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-secondary-100 via-secondary-50 to-tertiary-100 dark:from-secondary-950/40 dark:via-neutral-900 dark:to-tertiary-950/40">
            <MapPin className="absolute left-8 top-6 h-6 w-6 text-primary-600" strokeWidth={2} fill="currentColor" fillOpacity={0.15} />
            <MapPin className="absolute right-10 top-10 h-7 w-7 text-primary-600" strokeWidth={2} fill="currentColor" fillOpacity={0.15} />
            <MapPin className="absolute bottom-6 left-1/3 h-6 w-6 text-primary-600" strokeWidth={2} fill="currentColor" fillOpacity={0.15} />
            <span className="absolute bottom-2 right-2 rounded-full bg-white/80 px-2 py-0.5 text-[10px] text-neutral-500 dark:bg-neutral-900/80 dark:text-neutral-400">
              지도 연동 예정
            </span>
          </div>
        </section>

        <div className="mx-5 mt-4">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary-500 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-600"
          >
            <Share2 className="h-4 w-4" strokeWidth={2.2} />
            친구에게 결과 공유하기
          </button>
        </div>

        <section className="mt-7 px-5">
          <h2 className="font-headline mb-3 flex items-center gap-1.5 text-base font-bold text-neutral-900 dark:text-neutral-50">
            <Sparkles className="h-4 w-4 text-primary-500" strokeWidth={2.2} />
            당신만을 위한 추천 스팟
          </h2>
          <div className="flex flex-col gap-4">
            {spots.map((spot) => {
              const liked = likedSpotIds.includes(spot.id)
              const congestion = CONGESTION_META[spot.congestion]
              const CongestionIcon = congestion.icon
              return (
                <div key={spot.id} className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-neutral-900">
                  <div
                    className={`relative h-40 bg-gradient-to-br ${SPOT_GRADIENTS[spot.id] ?? 'from-neutral-300 to-neutral-400'}`}
                  >
                    <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-white/85 px-2 py-1 text-[11px] font-semibold text-neutral-700 dark:bg-neutral-900/80 dark:text-neutral-200">
                      <CategoryIcon className="h-3 w-3" strokeWidth={2.2} />
                      {CATEGORY_META[spot.category].label}
                    </span>
                    <button
                      type="button"
                      onClick={() => requireAuth(() => toggleLike(spot.id))}
                      aria-label="찜하기"
                      className={`absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/85 dark:bg-neutral-900/80 ${liked ? 'text-primary-600' : 'text-neutral-400'}`}
                    >
                      {liked ? '♥' : '♡'}
                    </button>
                    <span
                      className={`absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${congestion.className}`}
                    >
                      <CongestionIcon className="h-3 w-3" strokeWidth={2.2} />
                      혼잡도 {congestion.label}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="font-headline text-sm font-bold text-neutral-900 dark:text-neutral-50">
                      {spot.name}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                      {spot.summary}
                    </p>
                    <Link
                      to={`/spot/${spot.id}`}
                      className="mt-2 inline-flex items-center gap-0.5 text-xs font-semibold text-tertiary-600 dark:text-tertiary-400"
                    >
                      자세히 보기
                      <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <Link
        to={`/route?mbti=${style.type}`}
        aria-label="여행 경로 짜기"
        className="fixed bottom-24 right-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition hover:bg-primary-700"
      >
        <RouteIcon className="h-5 w-5" strokeWidth={2.2} />
      </Link>

      <BottomNav />
    </div>
  )
}
