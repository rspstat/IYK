import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Maximize2,
  MapPin,
  Share2,
  Sparkles,
  ChevronRight,
  Lightbulb,
  Route as RouteIcon,
} from 'lucide-react'
import { spotApi } from '../api/spots'
import { getErrorMessage } from '../api/client'
import { MBTI_STYLES } from '../data/mbtiStyles'
import { CATEGORY_META } from '../data/categoryMeta'
import { CATEGORY_ICON } from '../data/spotMeta'
import { useTravelStore } from '../store/useTravelStore'
import { useSpotStore } from '../store/useSpotStore'
import { useRequireAuth } from '../hooks/useRequireAuth'
import { useApiData } from '../hooks/useApiData'
import ApiPendingPlaceholder from '../components/ApiPendingPlaceholder'
import BottomNav from '../components/BottomNav'
import CongestionBadge from '../components/CongestionBadge'
import KakaoMap from '../components/KakaoMap'
import ShareButton from '../components/ShareButton'
import { toMapSpots } from '../lib/kakaoMap'
import type { SharePayload } from '../lib/share'
import SpotImage from '../components/SpotImage'
import { pickImage } from '../data/spotImage'

export default function ResultPage() {
  const { mbti } = useParams<{ mbti: string }>()
  const navigate = useNavigate()
  const style = MBTI_STYLES.find((s) => s.type === mbti?.toUpperCase())
  const likedSpotIds = useTravelStore((state) => state.likedSpotIds)
  const toggleLike = useTravelStore((state) => state.toggleLike)
  const setRouteOrder = useTravelStore((state) => state.setRouteOrder)
  const rememberSpots = useSpotStore((state) => state.remember)
  const requireAuth = useRequireAuth()

  // 추천 명소는 서버(한국관광공사 데이터 기반)에서 받아온다. 유형별 성향 문구는 화면이 바로 그릴 수 있게 로컬 데이터를 쓴다.
  const { data, error, loading, waitingForServer, reload } = useApiData(
    () => spotApi.recommendations(style!.type),
    style ? style.type : null,
  )

  useEffect(() => {
    if (data) rememberSpots(data.spots)
  }, [data, rememberSpots])

  if (!style) {
    return (
      <main className="mx-auto max-w-md px-6 py-12 text-center sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
        <p className="mb-4 text-neutral-500 dark:text-neutral-400">알 수 없는 MBTI 유형입니다.</p>
        <Link to="/" className="text-primary-600 underline dark:text-primary-400">
          메인으로 돌아가기
        </Link>
      </main>
    )
  }

  const spots = data?.spots ?? []
  const CategoryIcon = CATEGORY_ICON[style.category]

  // 공유 카드: 추천 상위 3곳의 이름과 첫 번째 관광지 사진
  const topNames = spots.slice(0, 3).map((spot) => spot.name)
  const sharePayload: SharePayload = {
    title: `${style.type} ${style.title}의 충북 여행지`,
    description:
      topNames.length > 0
        ? `${topNames.join(', ')}${spots.length > 3 ? ` 외 ${spots.length - 3}곳` : ''} 추천`
        : `${style.type}에게 어울리는 충북 여행지를 찾아보세요`,
    imageUrl: spots[0] ? pickImage(spots[0], 'full') : null,
    path: `/result/${style.type}`,
  }

  // 함수 선언은 호이스팅돼서 위의 `if (!style) return` 타입 좁히기가 이어지지 않으므로 화살표 함수로 둔다.
  const handleAddRoute = () => {
    requireAuth(() => {
      setRouteOrder(spots.map((spot) => spot.id))
      navigate(`/route?mbti=${style.type}`)
    })
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-md pb-24 sm:max-w-xl md:max-w-2xl lg:max-w-5xl xl:max-w-6xl">
        <header className="flex items-center justify-between px-5 pt-5">
          <Link to="/" className="flex items-center gap-2 text-neutral-900 dark:text-neutral-50">
            <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
            <span className="font-headline text-base font-bold">추천 결과</span>
          </Link>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
            <User className="h-5 w-5" strokeWidth={2} />
          </div>
        </header>

        {/* 데스크탑(lg~)에서는 좌: 스타일카드+지도+액션버튼(스크롤해도 화면에 붙어있는 sticky) /
            우: 추천 스팟 리스트(자유 스크롤) 2단 구성. 모바일~태블릿은 기존처럼 위→아래 순서로 쌓인다. */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:px-5 lg:pt-4">
          <div>
            <div className="lg:sticky lg:top-6 lg:flex lg:flex-col lg:gap-4">
              <section className="mx-5 mt-4 rounded-2xl bg-white p-5 shadow-sm dark:bg-neutral-900 lg:mx-0 lg:mt-0">
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
                <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-primary-50 px-3 py-2 text-[11px] leading-relaxed text-primary-800 dark:bg-primary-950/30 dark:text-primary-200">
                  <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
                  {style.tip}
                </p>
              </section>

              <section className="mx-5 mt-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-900 lg:mx-0 lg:mt-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-headline text-sm font-bold text-neutral-900 dark:text-neutral-50">여행 지도</h2>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500">추천 명소 위치 확인하세요</p>
                  </div>
                  <Maximize2 className="h-4 w-4 text-neutral-400 dark:text-neutral-500" strokeWidth={2} />
                </div>
                <div className="mt-3">
                  <KakaoMap
                    spots={toMapSpots(spots)}
                    numbered
                    className="h-72 rounded-xl"
                    onSelectSpot={(id) => navigate(`/spot/${id}`)}
                    fallback={
                      <ApiPendingPlaceholder
                        apiName="카카오 지도"
                        description="VITE_KAKAO_MAP_KEY 를 설정하면 추천 명소가 지도에 표시돼요"
                        className="h-36"
                      />
                    }
                  />
                </div>
              </section>

              <div className="mx-5 mt-4 flex flex-col gap-2 lg:mx-0 lg:mt-0">
                <button
                  type="button"
                  onClick={handleAddRoute}
                  disabled={spots.length === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-primary-800 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-900 disabled:opacity-40"
                >
                  <RouteIcon className="h-4 w-4" strokeWidth={2.2} />
                  {spots.length}개 경로 담기
                </button>
                <ShareButton
                  payload={sharePayload}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-primary-500 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-600"
                >
                  <Share2 className="h-4 w-4" strokeWidth={2.2} />
                  친구에게 결과 공유하기
                </ShareButton>
              </div>
            </div>
          </div>

          <section className="mt-7 px-5 lg:mt-0 lg:px-0">
            <h2 className="font-headline mb-3 flex items-center gap-1.5 text-base font-bold text-neutral-900 dark:text-neutral-50">
              <Sparkles className="h-4 w-4 text-primary-500" strokeWidth={2.2} />
              당신만을 위한 추천 스팟
            </h2>

            {loading && (
              <div className="flex flex-col gap-4" aria-busy="true">
                {waitingForServer && (
                  <p className="rounded-2xl bg-white p-4 text-center text-xs text-neutral-500 shadow-sm dark:bg-neutral-900 dark:text-neutral-400">
                    충북 관광 데이터를 준비하고 있어요. 잠시만 기다려주세요…
                  </p>
                )}
                {[0, 1, 2].map((i) => (
                  <div key={i} className="animate-pulse overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-neutral-900">
                    <div className="h-40 bg-neutral-200 dark:bg-neutral-800" />
                    <div className="space-y-2 p-4">
                      <div className="h-4 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
                      <div className="h-3 w-full rounded bg-neutral-100 dark:bg-neutral-800/70" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && error !== undefined && (
              <div className="rounded-2xl bg-white p-6 text-center shadow-sm dark:bg-neutral-900">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{getErrorMessage(error)}</p>
                <button
                  type="button"
                  onClick={reload}
                  className="mt-3 rounded-full bg-primary-800 px-5 py-2 text-xs font-bold text-white transition hover:bg-primary-900"
                >
                  다시 시도
                </button>
              </div>
            )}

            {!loading && error === undefined && spots.length === 0 && (
              <p className="rounded-2xl bg-white p-6 text-center text-sm text-neutral-500 shadow-sm dark:bg-neutral-900 dark:text-neutral-400">
                추천할 명소를 아직 찾지 못했어요.
              </p>
            )}

            <div className="flex flex-col gap-4">
              {spots.map((spot, index) => {
                const liked = likedSpotIds.includes(spot.id)
                return (
                  <div key={spot.id} className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-neutral-900">
                    {/* 처음 보이는 3장만 원본(선명), 나머지는 썸네일(약 20KB)로 데이터 사용량을 줄인다 */}
                    <SpotImage src={pickImage(spot, index < 3 ? 'full' : 'thumb')} seed={spot.id} className="h-40">
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
                      <CongestionBadge level={spot.congestion} className="absolute bottom-2.5 right-2.5" />
                    </SpotImage>
                    <div className="p-4">
                      <p className="font-headline text-sm font-bold text-neutral-900 dark:text-neutral-50">
                        {spot.name}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                        <MapPin className="h-3 w-3" strokeWidth={2.2} />
                        {spot.region}
                      </p>
                      {spot.summary && (
                        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                          {spot.summary}
                        </p>
                      )}
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
      </div>

      <BottomNav />
    </div>
  )
}
