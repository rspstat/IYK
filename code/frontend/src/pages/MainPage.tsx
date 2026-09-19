import { Link } from 'react-router-dom'
import {
  MapPin,
  User,
  ClipboardList,
  HeartHandshake,
  Sparkles,
  BrainCircuit,
  Wrench,
  Palette,
  Heart,
  Lightbulb,
  Flame,
  PartyPopper,
  Rocket,
  MessageSquare,
  Flag,
  Users,
  Megaphone,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'
import { MOCK_SPOTS } from '../data/mockSpots'
import { useTravelStore } from '../store/useTravelStore'
import { useRequireAuth } from '../hooks/useRequireAuth'
import BottomNav from '../components/BottomNav'

// 16개 유형을 표준 4x4 그리드 순서(IS·IN / ES·EN x J/P)로 배치
const GRID_ORDER = [
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
  'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP',
  'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
]

const MBTI_ICON_COLOR: Record<string, string> = {
  ISTJ: 'text-neutral-500',
  ISFJ: 'text-secondary-500',
  INFJ: 'text-tertiary-500',
  INTJ: 'text-primary-600',
  ISTP: 'text-primary-500',
  ISFP: 'text-secondary-600',
  INFP: 'text-tertiary-600',
  INTP: 'text-tertiary-500',
  ESTP: 'text-primary-600',
  ESFP: 'text-secondary-500',
  ENFP: 'text-primary-500',
  ENTP: 'text-tertiary-500',
  ESTJ: 'text-primary-700',
  ESFJ: 'text-secondary-600',
  ENFJ: 'text-tertiary-600',
  ENTJ: 'text-primary-600',
}

const MBTI_ICON: Record<string, LucideIcon> = {
  ISTJ: ClipboardList,
  ISFJ: HeartHandshake,
  INFJ: Sparkles,
  INTJ: BrainCircuit,
  ISTP: Wrench,
  ISFP: Palette,
  INFP: Heart,
  INTP: Lightbulb,
  ESTP: Flame,
  ESFP: PartyPopper,
  ENFP: Rocket,
  ENTP: MessageSquare,
  ESTJ: Flag,
  ESFJ: Users,
  ENFJ: Megaphone,
  ENTJ: BarChart3,
}

function MbtiIcon({ type, className = 'h-7 w-7' }: { type: string; className?: string }) {
  const Icon = MBTI_ICON[type]
  if (!Icon) return null
  return <Icon className={className} strokeWidth={1.8} />
}

// 관광사진 API 연동 전까지 명소 사진 자리를 대신할 그라디언트
const SPOT_GRADIENTS: Record<string, string> = {
  'danyang-manchonha': 'from-tertiary-400 via-tertiary-300 to-secondary-300',
  'goesan-sanmakigil': 'from-primary-200 via-primary-300 to-secondary-200',
}

export default function MainPage() {
  const likedSpotIds = useTravelStore((state) => state.likedSpotIds)
  const toggleLike = useTravelStore((state) => state.toggleLike)
  const requireAuth = useRequireAuth()
  const trendingSpots = MOCK_SPOTS.slice(0, 2)

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="mx-auto max-w-md pb-24 sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
        <header className="flex items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-1 text-primary-600 dark:text-primary-400">
            <MapPin className="h-4 w-4" strokeWidth={2} />
            <span className="text-sm font-bold">Chungbuk MBTI Tour</span>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
            <User className="h-5 w-5" strokeWidth={2} />
          </div>
        </header>

        <section className="flex flex-col items-center px-5 pb-3 pt-2 text-center">
          <div className="mb-2 animate-float rounded-2xl dark:bg-white dark:p-1.5">
            <img src="/logo.png" alt="여행가유" className="h-32 w-32 object-contain" />
          </div>
          <h1 className="font-headline text-base font-bold leading-snug text-neutral-900 dark:text-neutral-50">
            내 MBTI에 딱 맞는
            <br />
            충북 여행지를 찾아보세요!
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            16가지 성격 유형별로 큐레이션된
            <br />
            충청북도의 특별한 명소들을 제안합니다.
          </p>
        </section>

        <section className="grid grid-cols-4 gap-x-2 gap-y-4 px-5">
          {GRID_ORDER.map((type) => (
            <Link
              key={type}
              to={`/result/${type}`}
              className="flex flex-col items-center gap-1.5 transition hover:-translate-y-0.5"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 shadow-sm dark:bg-neutral-800">
                <MbtiIcon type={type} className={`h-7 w-7 ${MBTI_ICON_COLOR[type]}`} />
              </span>
              <span className="text-[11px] font-bold text-neutral-900 dark:text-neutral-100">{type}</span>
            </Link>
          ))}
        </section>

        <section className="mt-7 px-5">
          <Link
            to="/result/ENFP"
            className="relative block h-36 overflow-hidden rounded-2xl bg-gradient-to-br from-tertiary-400 via-tertiary-300 to-secondary-300 shadow-sm"
          >
            <span className="absolute left-3 top-3 rounded-full bg-primary-600 px-2 py-0.5 text-[11px] font-bold text-white">
              HOT TREND
            </span>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8">
              <p className="text-sm font-bold text-white">액티비티를 즐기는 ENFP라면?</p>
              <p className="mt-0.5 text-xs text-white/85">단양 패러글라이딩으로 스트레스 해소!</p>
            </div>
          </Link>
        </section>

        <section className="mt-7 px-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-headline text-base font-bold text-neutral-900 dark:text-neutral-50">요즘 뜨는 충북 명소</h2>
            <span className="text-xs text-neutral-400 dark:text-neutral-500">더보기</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {trendingSpots.map((spot) => {
              const liked = likedSpotIds.includes(spot.id)
              return (
                <Link key={spot.id} to={`/spot/${spot.id}`} className="block">
                  <div
                    className={`relative h-28 overflow-hidden rounded-xl bg-gradient-to-br shadow-sm ${SPOT_GRADIENTS[spot.id] ?? 'from-neutral-200 to-neutral-300'}`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        requireAuth(() => toggleLike(spot.id))
                      }}
                      aria-label="찜하기"
                      className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-sm shadow-sm ${liked ? 'text-primary-600' : 'text-neutral-400'}`}
                    >
                      {liked ? '♥' : '♡'}
                    </button>
                  </div>
                  <p className="mt-2 truncate text-xs font-semibold text-neutral-800 dark:text-neutral-100">
                    {spot.name}
                  </p>
                </Link>
              )
            })}
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  )
}
