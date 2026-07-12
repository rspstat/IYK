import { Link, useParams } from 'react-router-dom'
import { MOCK_SPOTS } from '../data/mockSpots'
import ApiPendingPlaceholder from '../components/ApiPendingPlaceholder'

export default function SpotDetailPage() {
  const { spotId } = useParams<{ spotId: string }>()
  const spot = MOCK_SPOTS.find((s) => s.id === spotId)

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        to="/"
        className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
      >
        &larr; 메인으로
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-50">
        {spot ? spot.name : '관광지'}
      </h1>
      {/* 국문 관광정보 서비스 연동 전까지 비활성화 — 바로 아래 "관광지 정보" placeholder와 중복돼서 뺌
      {spot && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {spot.region} · {spot.summary}
        </p>
      )}
      */}

      <div className="mt-6 space-y-6">
        <ApiPendingPlaceholder apiName="관광사진 API" description="사진 갤러리" className="h-64" />

        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            관광지 정보
          </h2>
          <ApiPendingPlaceholder
            apiName="국문 관광정보 서비스"
            description="소개 · 위치 · 운영시간"
            className="h-32"
          />
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            혼잡도 캘린더
          </h2>
          <ApiPendingPlaceholder
            apiName="관광지 집중률 방문자 추이 예측 API"
            description="향후 30일 혼잡도 · 추천 방문일"
            className="h-40"
          />
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            이런 곳도 가보세요
          </h2>
          <ApiPendingPlaceholder
            apiName="관광지별 연관 관광지 정보 API"
            description="연관 관광지 추천"
            className="h-32"
          />
        </div>

        <Link
          to="/route"
          className="block w-full rounded-lg bg-gray-900 py-3 text-center text-sm font-semibold text-white transition hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
        >
          여행 경로 정하기
        </Link>
      </div>
    </main>
  )
}
