import { useEffect, useState } from 'react'
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
  PawPrint,
  Accessibility,
  Info,
  Navigation,
  ExternalLink,
} from 'lucide-react'
import { ApiError, getErrorMessage } from '../api/client'
import { spotApi, type Congestion } from '../api/spots'
import { MBTI_STYLES } from '../data/mbtiStyles'
import { CATEGORY_META } from '../data/categoryMeta'
import { CATEGORY_ICON, CONGESTION_META } from '../data/spotMeta'
import { useTravelStore } from '../store/useTravelStore'
import { useSpotStore } from '../store/useSpotStore'
import { useRequireAuth } from '../hooks/useRequireAuth'
import { useApiData } from '../hooks/useApiData'
import BottomNav from '../components/BottomNav'
import CongestionBadge from '../components/CongestionBadge'
import KakaoMap from '../components/KakaoMap'
import ShareButton from '../components/ShareButton'
import SpotComments from '../components/SpotComments'
import { hasKakaoMapKey, kakaoMapRouteUrl, kakaoMapViewUrl, toMapSpots } from '../lib/kakaoMap'
import type { SharePayload } from '../lib/share'
import SpotImage from '../components/SpotImage'
import { pickImage } from '../data/spotImage'
import type { CongestionLevel } from '../types'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// 혼잡도가 높을수록 주황(primary) 불투명도를 높여서 한 가지 색조로 표현
const CALENDAR_COLOR: Record<CongestionLevel, string> = {
  low: 'bg-primary-500/20 text-neutral-700 dark:text-neutral-200',
  medium: 'bg-primary-500/55 text-neutral-900 dark:text-white',
  high: 'bg-primary-500 text-white',
}

// 'YYYY-MM-DD' 를 시간대 영향 없이 로컬 날짜로 다룬다.
function parseDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatMonthDay(iso: string) {
  const date = parseDate(iso)
  return `${date.getMonth() + 1}/${date.getDate()}(${WEEKDAYS[date.getDay()]})`
}

function CongestionCalendar({ congestion, loading }: { congestion: Congestion | undefined; loading: boolean }) {
  const forecast = congestion?.forecast ?? []
  const recommended = new Set(congestion?.recommendedDates ?? [])
  // 첫 예측일의 요일만큼 앞을 비워서 달력처럼 요일 칸에 맞춘다.
  const leadingBlanks = forecast.length > 0 ? parseDate(forecast[0].date).getDay() : 0

  return (
    <section className="mx-5 mt-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-900 lg:mx-0 lg:mt-0">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-sm font-bold text-neutral-900 dark:text-neutral-50">
          {forecast.length > 0 ? `${forecast.length}일 방문 혼잡도 예측` : '방문 혼잡도 예측'}
        </h2>
        <span className="text-[10px] text-neutral-400 dark:text-neutral-500">데이터 출처: 한국관광공사</span>
      </div>

      {loading && <div className="mt-3 h-32 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />}

      {!loading && forecast.length === 0 && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-neutral-50 p-3 text-xs leading-relaxed text-neutral-500 dark:bg-neutral-800/40 dark:text-neutral-400">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" strokeWidth={2} />
          이 관광지는 한국관광공사 혼잡도 예측 데이터에 아직 없어요.
        </p>
      )}

      {forecast.length > 0 && (
        <>
          <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
            {formatMonthDay(forecast[0].date)} ~ {formatMonthDay(forecast[forecast.length - 1].date)}
          </p>
          <div className="mt-3 grid grid-cols-7 gap-1.5 text-center text-[10px] text-neutral-400 dark:text-neutral-500">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-1.5">
            {Array.from({ length: leadingBlanks }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {forecast.map((day) => (
              <span
                key={day.date}
                title={`${formatMonthDay(day.date)} · 집중률 ${Math.round(day.score)}%`}
                className={`flex h-8 items-center justify-center rounded-md text-[11px] font-semibold ${CALENDAR_COLOR[day.level]} ${
                  recommended.has(day.date) ? 'ring-2 ring-secondary-500' : ''
                }`}
              >
                {Number(day.date.slice(8))}
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3 text-[10px] text-neutral-500 dark:text-neutral-400">
            {(['low', 'medium', 'high'] as const).map((level) => (
              <span key={level} className="flex items-center gap-1">
                <span className={`h-2.5 w-2.5 rounded-sm ${CALENDAR_COLOR[level].split(' ')[0]}`} />
                {CONGESTION_META[level].label}
              </span>
            ))}
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm ring-2 ring-secondary-500" />
              추천일
            </span>
          </div>
          {congestion && congestion.recommendedDates.length > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-primary-50 p-3 dark:bg-primary-950/30">
              <CalendarCheck className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" strokeWidth={2.2} />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                가장 쾌적한 방문일{' '}
                <span className="font-bold text-primary-700 dark:text-primary-400">
                  {congestion.recommendedDates.map(formatMonthDay).join(', ')}
                </span>
              </p>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default function SpotDetailPage() {
  const navigate = useNavigate()
  const { spotId } = useParams<{ spotId: string }>()
  const detail = useApiData(() => spotApi.detail(spotId!), spotId ?? null)
  const related = useApiData(() => spotApi.related(spotId!), spotId ?? null)
  const congestion = useApiData(() => spotApi.congestion(spotId!), spotId ?? null)

  const likedSpotIds = useTravelStore((state) => state.likedSpotIds)
  const toggleLike = useTravelStore((state) => state.toggleLike)
  const routeSpotIds = useTravelStore((state) => state.routeSpotIds)
  const addToRoute = useTravelStore((state) => state.addToRoute)
  const removeFromRoute = useTravelStore((state) => state.removeFromRoute)
  const rememberSpots = useSpotStore((state) => state.remember)
  const requireAuth = useRequireAuth()
  const [photoIndex, setPhotoIndex] = useState(0)
  const [expanded, setExpanded] = useState(false)

  const spot = detail.data
  const relatedSpots = related.data
  useEffect(() => {
    if (spot) rememberSpots([spot])
  }, [spot, rememberSpots])
  useEffect(() => {
    if (relatedSpots) rememberSpots(relatedSpots)
  }, [relatedSpots, rememberSpots])

  if (detail.loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950" aria-busy="true">
        <div className="mx-auto max-w-md pb-24 sm:max-w-xl md:max-w-2xl lg:max-w-5xl xl:max-w-6xl">
          <div className="h-64 animate-pulse bg-neutral-200 dark:bg-neutral-800" />
          <div className="space-y-3 p-5">
            <div className="h-5 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-3 w-full animate-pulse rounded bg-neutral-100 dark:bg-neutral-800/70" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800/70" />
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  if (!spot) {
    const notFound = detail.error instanceof ApiError && detail.error.code === 'SPOT_NOT_FOUND'
    return (
      <main className="mx-auto max-w-md px-6 py-12 text-center sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
        <p className="mb-4 text-neutral-500 dark:text-neutral-400">
          {notFound ? '존재하지 않는 관광지입니다.' : getErrorMessage(detail.error)}
        </p>
        {!notFound && (
          <button
            type="button"
            onClick={detail.reload}
            className="mr-3 rounded-full bg-primary-800 px-5 py-2 text-xs font-bold text-white transition hover:bg-primary-900"
          >
            다시 시도
          </button>
        )}
        <Link to="/" className="text-primary-600 underline dark:text-primary-400">
          메인으로 돌아가기
        </Link>
      </main>
    )
  }

  const liked = likedSpotIds.includes(spot.id)
  const inRoute = routeSpotIds.includes(spot.id)
  const CategoryIcon = CATEGORY_ICON[spot.category]
  const photos = spot.photos.length > 0 ? spot.photos : [pickImage(spot, 'full')].filter((url): url is string => Boolean(url))
  const introduction = spot.description ?? spot.summary
  const sharePayload: SharePayload = {
    title: spot.name,
    description: [spot.region, (introduction ?? '').replace(/\s+/g, ' ').slice(0, 80)].filter(Boolean).join(' · '),
    imageUrl: pickImage(spot, 'full'),
    path: `/spot/${spot.id}`,
  }
  const longIntroduction = (introduction?.length ?? 0) > 140

  const recommendedTypes = MBTI_STYLES.filter((s) => s.category === spot.category)
    .slice(0, 2)
    .map((s) => s.type)

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-md pb-24 sm:max-w-xl md:max-w-2xl lg:max-w-5xl xl:max-w-6xl">
        {/* 데스크탑(lg~)에서는 좌: 사진+정보카드+위치/액션버튼(스크롤해도 화면에 붙어있는 sticky) /
            우: 혼잡도 예측+연관 명소+댓글(자유 스크롤) 2단 구성. 모바일~태블릿은 기존처럼 위→아래로 쌓인다. */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:px-5 lg:pt-4">
          <div>
            <div className="lg:sticky lg:top-6 lg:flex lg:flex-col lg:gap-4">
              <div className="relative h-64 w-full overflow-hidden lg:rounded-2xl">
                {/* 사진 갤러리: 좌우로 밀어서 넘기는 슬라이드 */}
                <div
                  className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  onScroll={(e) => setPhotoIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
                >
                  {(photos.length > 0 ? photos : [null]).map((url, i) => (
                    <SpotImage key={`${i}-${url}`} src={url} seed={spot.id} className="h-full w-full shrink-0 snap-center" />
                  ))}
                </div>
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/40 to-transparent" />
                <header className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-4">
                  <button type="button" onClick={() => navigate(-1)} aria-label="뒤로 가기" className="text-white drop-shadow">
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
                    <ShareButton payload={sharePayload} ariaLabel="공유하기" className="text-white drop-shadow">
                      <Share2 className="h-5 w-5" strokeWidth={2.2} />
                    </ShareButton>
                  </div>
                </header>

                {photos.length > 1 && (
                  <span className="pointer-events-none absolute bottom-8 left-4 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white">
                    {Math.min(photoIndex + 1, photos.length)} / {photos.length}
                  </span>
                )}
                <CongestionBadge level={spot.congestion} className="pointer-events-none absolute bottom-8 right-4 shadow-sm" />
              </div>

              <section className="relative -mt-6 rounded-t-3xl bg-white px-5 pt-5 pb-5 shadow-sm dark:bg-neutral-900 lg:mt-0 lg:rounded-2xl">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                    <CategoryIcon className="h-3 w-3" strokeWidth={2.2} />
                    {CATEGORY_META[spot.category].label}
                  </span>
                  {recommendedTypes.length > 0 && (
                    <span className="rounded-full bg-secondary-400 px-2.5 py-1 text-xs font-bold text-neutral-900">
                      {recommendedTypes.join(' / ')} 추천
                    </span>
                  )}
                  {spot.petFriendly && (
                    <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      <PawPrint className="h-3 w-3" strokeWidth={2.2} />
                      반려동물 동반
                    </span>
                  )}
                  {spot.barrierFree && (
                    <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      <Accessibility className="h-3 w-3" strokeWidth={2.2} />
                      무장애 여행
                    </span>
                  )}
                </div>
                <h1 className="font-headline mt-3 text-xl font-bold leading-snug text-neutral-900 dark:text-neutral-50">
                  {spot.name}
                </h1>

                {introduction && (
                  <>
                    <p
                      className={`mt-2 whitespace-pre-line text-sm leading-relaxed text-neutral-500 dark:text-neutral-400 ${
                        expanded ? '' : 'line-clamp-4'
                      }`}
                    >
                      {introduction}
                    </p>
                    {longIntroduction && (
                      <button
                        type="button"
                        onClick={() => setExpanded((value) => !value)}
                        className="mt-1 text-xs font-semibold text-primary-600 dark:text-primary-400"
                      >
                        {expanded ? '접기' : '더보기'}
                      </button>
                    )}
                  </>
                )}

                <div className="mt-4 flex flex-col gap-2.5">
                  <div className="flex items-start gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" strokeWidth={2} />
                    {spot.address ?? spot.region}
                  </div>
                  {spot.operatingHours && (
                    <div className="flex items-start gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" strokeWidth={2} />
                      {spot.operatingHours}
                    </div>
                  )}
                  {spot.tel && (
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <Phone className="h-4 w-4 shrink-0 text-neutral-400" strokeWidth={2} />
                      <a href={`tel:${spot.tel.replace(/[^0-9+]/g, '')}`} className="hover:underline">
                        {spot.tel}
                      </a>
                    </div>
                  )}
                </div>
              </section>

              <section className="mx-5 mt-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-900 lg:mx-0 lg:mt-0">
                <h2 className="font-headline text-sm font-bold text-neutral-900 dark:text-neutral-50">위치</h2>
                {hasKakaoMapKey && (
                  <KakaoMap spots={toMapSpots([spot])} className="mt-3 h-44 rounded-xl" fallback={null} />
                )}
                {/* 아래 링크는 카카오 지도 키 없이도 동작한다(카카오맵 웹/앱으로 이동) */}
                <div className="mt-3 flex gap-2">
                  <a
                    href={kakaoMapViewUrl(toMapSpots([spot])[0])}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-neutral-200 py-2.5 text-xs font-bold text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.2} />
                    카카오맵에서 보기
                  </a>
                  <a
                    href={kakaoMapRouteUrl(toMapSpots([spot])[0])}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary-800 py-2.5 text-xs font-bold text-white transition hover:bg-primary-900"
                  >
                    <Navigation className="h-3.5 w-3.5" strokeWidth={2.2} />
                    길찾기
                  </a>
                </div>
              </section>

              <div className="mt-7 flex gap-2 px-5 lg:mt-0 lg:px-0">
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
          </div>

          <div className="lg:flex lg:flex-col lg:gap-4">
            <CongestionCalendar congestion={congestion.data} loading={congestion.loading} />

            {(related.loading || (relatedSpots && relatedSpots.length > 0)) && (
              <section className="mt-7 px-5 lg:mt-0 lg:px-0">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-headline text-base font-bold text-neutral-900 dark:text-neutral-50">
                    이런 곳도 가보세요
                  </h2>
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500">한국관광공사 연관 관광지</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {related.loading &&
                    [0, 1, 2].map((i) => <div key={i} className="h-32 w-36 shrink-0 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />)}
                  {(relatedSpots ?? []).map((item) => {
                    const itemLiked = likedSpotIds.includes(item.id)
                    const RelatedCategoryIcon = CATEGORY_ICON[item.category]
                    return (
                      <Link key={item.id} to={`/spot/${item.id}`} className="w-36 shrink-0">
                        <SpotImage src={pickImage(item, 'thumb')} seed={item.id} className="h-24 rounded-xl shadow-sm">
                          <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-white/85 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700 dark:bg-neutral-900/80 dark:text-neutral-200">
                            <RelatedCategoryIcon className="h-2.5 w-2.5" strokeWidth={2.2} />
                            {CATEGORY_META[item.category].label}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              requireAuth(() => toggleLike(item.id))
                            }}
                            aria-label="찜하기"
                            className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/85 text-xs dark:bg-neutral-900/80 ${itemLiked ? 'text-primary-600' : 'text-neutral-400'}`}
                          >
                            {itemLiked ? '♥' : '♡'}
                          </button>
                        </SpotImage>
                        <p className="mt-1.5 truncate text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-neutral-400 dark:text-neutral-500">{item.region}</p>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}

            <SpotComments key={spot.id} spotId={spot.id} className="mt-7 px-5 lg:mt-0 lg:px-0" />
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
