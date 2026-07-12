import { useNavigate } from 'react-router-dom'
import { MBTI_STYLES } from '../data/mbtiStyles'
import { CATEGORY_META } from '../data/categoryMeta'

export default function MainPage() {
  const navigate = useNavigate()

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10 text-center">
        <p className="mb-2 text-sm font-medium text-purple-600 dark:text-purple-400">
          MBTI 기반 충청북도 여행 장소 추천 플랫폼
        </p>
        <div className="mb-4 flex items-center justify-center gap-1.5">
          <img src="/icon.png" alt="여행가유" className="h-12 w-12 rounded-2xl" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">여행가유</h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400">
          내 성향에 맞는 충청북도 여행지를 찾아보세요
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MBTI_STYLES.map((style) => {
          const meta = CATEGORY_META[style.category]
          return (
            <button
              key={style.type}
              type="button"
              onClick={() => navigate(`/result/${style.type}`)}
              className={`rounded-xl border-2 py-6 text-center transition hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-none ${meta.card}`}
            >
              <span className="block text-lg font-bold text-gray-900 dark:text-gray-50">
                {style.type}
              </span>
              <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                {meta.label}
              </span>
            </button>
          )
        })}
      </div>
    </main>
  )
}
