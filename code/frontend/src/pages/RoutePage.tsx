import { Link } from 'react-router-dom'
import ApiPendingPlaceholder from '../components/ApiPendingPlaceholder'

export default function RoutePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        to="/"
        className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
      >
        &larr; 메인으로
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-50">여행 경로</h1>
      <p className="mt-2 text-gray-500 dark:text-gray-400">
        선택한 관광지들을 잇는 여행 경로를 지도에서 확인할 수 있습니다.
      </p>
      <ApiPendingPlaceholder
        apiName="카카오 지도 API"
        description="추천 관광지 핀 표시 · 방문 순서 경로 시각화"
        className="mt-6 h-96"
      />
    </main>
  )
}
