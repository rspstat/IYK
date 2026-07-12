import { Link, useParams } from 'react-router-dom'
import { MBTI_STYLES } from '../data/mbtiStyles'
import { MOCK_SPOTS } from '../data/mockSpots'
import { CATEGORY_META } from '../data/categoryMeta'
import { useTravelStore } from '../store/useTravelStore'
import ApiPendingPlaceholder from '../components/ApiPendingPlaceholder'
// import type { CongestionLevel } from '../types'

// 혼잡도 예측 API 연동 전까지 비활성화 — 실제 데이터 없이 여유/보통/혼잡을 표시하면 오해를 줄 수 있음
// const CONGESTION_META: Record<CongestionLevel, { label: string; className: string }> = {
//   low: {
//     label: '여유',
//     className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
//   },
//   medium: {
//     label: '보통',
//     className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
//   },
//   high: {
//     label: '혼잡',
//     className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
//   },
// }

export default function ResultPage() {
  const { mbti } = useParams<{ mbti: string }>()
  const style = MBTI_STYLES.find((s) => s.type === mbti?.toUpperCase())
  const likedSpotIds = useTravelStore((state) => state.likedSpotIds)
  const toggleLike = useTravelStore((state) => state.toggleLike)

  if (!style) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12 text-center">
        <p className="mb-4 text-gray-500 dark:text-gray-400">알 수 없는 MBTI 유형입니다.</p>
        <Link to="/" className="text-purple-600 underline dark:text-purple-400">
          메인으로 돌아가기
        </Link>
      </main>
    )
  }

  const meta = CATEGORY_META[style.category]
  const spots = MOCK_SPOTS.filter((spot) => spot.category === style.category)

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link
        to="/"
        className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
      >
        &larr; 다른 유형 선택하기
      </Link>

      <section className={`mt-4 rounded-2xl border-2 p-6 ${meta.card}`}>
        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${meta.badge}`}>
          {meta.label}
        </span>
        <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-gray-50">
          {style.type} · {style.title}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">{style.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {style.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-gray-200 bg-white/70 px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-300"
            >
              {tag}
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">추천 팁 · {style.tip}</p>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-50">추천 명소</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {spots.map((spot) => {
              // const congestion = CONGESTION_META[spot.congestion]
              const liked = likedSpotIds.includes(spot.id)
              return (
                <div
                  key={spot.id}
                  className="relative rounded-xl border border-gray-200 p-4 transition hover:shadow-md dark:border-gray-800 dark:hover:border-gray-700 dark:hover:shadow-none"
                >
                  <button
                    type="button"
                    onClick={() => toggleLike(spot.id)}
                    aria-label="찜하기"
                    className={`absolute right-3 top-3 text-lg ${liked ? 'text-red-500 dark:text-red-400' : 'text-gray-300 dark:text-gray-600'}`}
                  >
                    {liked ? '♥' : '♡'}
                  </button>
                  <Link to={`/spot/${spot.id}`} className="block">
                    <ApiPendingPlaceholder apiName="관광사진 API" className="mb-3 h-48 rounded-lg text-xs" />
                    <div className="flex items-center justify-between pr-6">
                      <span className="font-semibold text-gray-900 dark:text-gray-50">
                        {spot.name}
                      </span>
                      {/* 혼잡도 예측 API 연동 전까지 비활성화
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${congestion.className}`}>
                        {congestion.label}
                      </span>
                      */}
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{spot.region}</p>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{spot.summary}</p>
                  </Link>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-50">충청북도 지도</h2>
          <ApiPendingPlaceholder
            apiName="카카오 지도 API"
            description="추천 명소 위치 핀 표시"
            className="h-72"
          />
        </div>
      </section>
    </main>
  )
}
