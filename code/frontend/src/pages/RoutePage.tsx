import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Layers,
  LocateFixed,
  MapPin,
  Car,
  Save,
  Check,
  Waypoints,
  ArrowUp,
  ArrowDown,
  X,
  Pencil,
  Plus,
} from 'lucide-react'
import { MBTI_STYLES } from '../data/mbtiStyles'
import { useTravelStore } from '../store/useTravelStore'
import { useNavGuardStore } from '../store/useNavGuardStore'
import { useRequireAuth } from '../hooks/useRequireAuth'
import { useSpotsByIds } from '../hooks/useSpotsByIds'
import BottomNav from '../components/BottomNav'
import KakaoMap from '../components/KakaoMap'
import SpotImage from '../components/SpotImage'
import { toMapSpots } from '../lib/kakaoMap'
import { pickImage } from '../data/spotImage'
import type { Spot } from '../types'

const PIN_SHADES = ['bg-primary-700', 'bg-primary-500', 'bg-primary-300']

// 카카오 지도 연동 전까지 쓰는 약식 지도: 관광지의 실제 좌표를 영역 안의 상대 위치(0~100%)로 바꿔 핀을 놓는다.
// 관광지 사이의 상대적인 방향과 거리만 맞고, 실제 지도(도로·지형)는 아니다.
function pinPositions(spots: Spot[]) {
  if (spots.length === 0) return []
  const lats = spots.map((spot) => spot.coords.lat)
  const lngs = spots.map((spot) => spot.coords.lng)
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2
  const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
  const lngScale = Math.cos((midLat * Math.PI) / 180) // 경도 1도는 위도 1도보다 짧다
  const spanX = (Math.max(...lngs) - Math.min(...lngs)) * lngScale
  const spanY = Math.max(...lats) - Math.min(...lats)
  const span = Math.max(spanX, spanY) || 1 // 한 곳이거나 같은 위치면 가운데에 놓는다
  return spots.map((spot) => ({
    left: 50 + (((spot.coords.lng - midLng) * lngScale) / span) * 68,
    top: 50 - ((spot.coords.lat - midLat) / span) * 56,
  }))
}

function formatStopTime(index: number) {
  const totalMinutes = 10 * 60 + index * 150
  let hours = Math.floor(totalMinutes / 60) % 24
  const minutes = totalMinutes % 60
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`
}

// 두 좌표 사이의 직선 거리(km) — Haversine 공식
function distanceKm(a: Spot['coords'], b: Spot['coords']) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const c = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng
  return 2 * R * Math.asin(Math.sqrt(c))
}

// 실제 도로 상황 API 연동 전까지 직선거리 기반으로 추정한 이동시간(평균 시속 40km 가정)
function estimateTravel(a: Spot, b: Spot) {
  const km = distanceKm(a.coords, b.coords)
  const minutes = Math.max(5, Math.round((km / 40) * 60))
  return { distanceLabel: `${km.toFixed(1)}km`, timeLabel: `${minutes}분` }
}

// 별명을 입력하지 않았을 때 담긴 명소 이름을 바탕으로 자연스러운 기본 이름을 만들어준다.
function generateRouteName(spots: Spot[]) {
  if (spots.length === 0) return '나의 여행 코스'
  if (spots.length === 1) return `${spots[0].name} 코스`
  if (spots.length === 2) return `${spots[0].name} · ${spots[1].name} 코스`
  return `${spots[0].name} 외 ${spots.length - 1}곳 코스`
}

// 첫 스팟에서 시작해 매번 가장 가까운 곳을 다음 목적지로 고르는 최근접 이웃 정렬
function sortByNearestNeighbor(spots: Spot[]) {
  if (spots.length < 2) return spots
  const remaining = [...spots]
  const ordered = [remaining.shift()!]
  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1]
    let nearestIndex = 0
    let nearestDistance = Infinity
    remaining.forEach((spot, i) => {
      const d = distanceKm(last.coords, spot.coords)
      if (d < nearestDistance) {
        nearestDistance = d
        nearestIndex = i
      }
    })
    ordered.push(remaining.splice(nearestIndex, 1)[0])
  }
  return ordered
}

export default function RoutePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const mbtiParam = searchParams.get('mbti')?.toUpperCase()
  const style = MBTI_STYLES.find((s) => s.type === mbtiParam)
  const editId = searchParams.get('editId')

  const routeSpotIds = useTravelStore((state) => state.routeSpotIds)
  const activeEditRouteId = useTravelStore((state) => state.activeEditRouteId)
  const savedRoutes = useTravelStore((state) => state.savedRoutes)
  const removeFromRoute = useTravelStore((state) => state.removeFromRoute)
  const moveInRoute = useTravelStore((state) => state.moveInRoute)
  const setRouteOrder = useTravelStore((state) => state.setRouteOrder)
  const clearRoute = useTravelStore((state) => state.clearRoute)
  const setActiveEditRouteId = useTravelStore((state) => state.setActiveEditRouteId)
  const saveCurrentRoute = useTravelStore((state) => state.saveCurrentRoute)
  const updateSavedRoute = useTravelStore((state) => state.updateSavedRoute)
  const setNavGuard = useNavGuardStore((state) => state.setGuard)
  const requireAuth = useRequireAuth()
  const [saved, setSaved] = useState(false)
  const [savedName, setSavedName] = useState('')
  const [savedSpotIds, setSavedSpotIds] = useState<string[]>([])
  const [routeName, setRouteName] = useState('')
  const [pendingNav, setPendingNav] = useState<string | null>(null)

  const editingRoute = editId ? savedRoutes.find((route) => route.id === editId) : undefined

  // editId로 처음 들어온 경우에만 저장해둔 경로를 편집 대상으로 불러온다. activeEditRouteId로 "같은 편집 세션"인지
  // 구분해서, 명소 추가하기 → 찜한 여행지 → 다시 이 페이지로 돌아오는 흐름에서 방금 추가한 명소가 저장된 옛 목록으로
  // 덮어써지지 않게 한다.
  useEffect(() => {
    if (editingRoute) {
      if (activeEditRouteId !== editId) {
        setRouteOrder(editingRoute.spotIds)
        setRouteName(editingRoute.name)
        setActiveEditRouteId(editId)
      }
    } else if (!editId) {
      if (activeEditRouteId !== null) setActiveEditRouteId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId])

  // 저장/수정 직후에는 clearRoute()로 routeSpotIds가 비워지므로, 방금 저장한 내용이 빈 화면으로 바뀌어 보이지 않도록
  // 저장 시점에 담아둔 savedSpotIds를 그대로 보여준다. 경로에는 id 만 저장돼 있어서 관광지 정보는 서버에서 받아온다.
  const { spots, loading: spotsLoading, error: spotsError } = useSpotsByIds(saved ? savedSpotIds : routeSpotIds)
  const positions = pinPositions(spots)

  const autoRouteName = generateRouteName(spots)
  // 저장하지 않은 이동 경고는 "저장된 경로를 편집 중"일 때만 띄운다. 새 경로 만들기 화면은 기본적으로
  // 미리보기 경로(fallbackSpots)가 항상 채워져 있어서, 편집 여부와 무관하게 매번 경고가 뜨는 걸 막기 위함.
  const isDirty = Boolean(editId) && !saved && spots.length > 0

  function handleSortNearest() {
    if (spots.length < 2) return
    const ordered = sortByNearestNeighbor(spots)
    setRouteOrder(ordered.map((spot) => spot.id))
  }

  function performSave() {
    const finalName = routeName.trim() || autoRouteName
    const spotIds = spots.map((spot) => spot.id)
    if (editId) {
      updateSavedRoute(editId, spotIds, finalName)
    } else {
      saveCurrentRoute(spotIds, finalName)
    }
    setSavedSpotIds(spotIds)
    setSavedName(finalName)
    setSaved(true)
    // 저장/수정이 끝나면 화면을 다시 초기 상태로 되돌려서, 다음에 들어올 때 방금 편집한 내용이 남아있지 않게 한다.
    clearRoute()
    setActiveEditRouteId(null)
    setRouteName('')
  }

  // 저장하지 않은 변경 사항이 있는 동안 다른 화면(하단 내비게이션, 뒤로가기)으로 이동하려 하면
  // 이 화면이 먼저 확인 창을 띄우고 이동을 직접 처리하도록 전역 가드에 등록해둔다.
  useEffect(() => {
    setNavGuard((to) => {
      if (isDirty) {
        setPendingNav(to)
        return false
      }
      return true
    })
    return () => setNavGuard(null)
  }, [isDirty, setNavGuard])

  function attemptLeave(to: string) {
    if (isDirty) {
      setPendingNav(to)
      return
    }
    navigate(to)
  }

  function handleSaveAndLeave() {
    requireAuth(() => {
      performSave()
      const to = pendingNav
      setPendingNav(null)
      if (to) navigate(to)
    })
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-md pb-24 sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
        <header className="flex items-center justify-between bg-white px-4 py-4 dark:bg-neutral-950">
          <button type="button" onClick={() => attemptLeave('/')} className="text-primary-800 dark:text-primary-400">
            <ArrowLeft className="h-5 w-5" strokeWidth={2.4} />
          </button>
          <h1 className="font-headline text-lg font-bold text-primary-800 dark:text-primary-400">
            여행 경로 확인
          </h1>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 ring-2 ring-primary-300 dark:bg-neutral-800 dark:text-neutral-500">
            <User className="h-5 w-5" strokeWidth={2} />
          </div>
        </header>

        {/* 카카오 지도(키가 있을 때). 키가 없거나 불러오지 못하면 실제 좌표로 그린 약식 지도를 대신 보여준다. */}
        <KakaoMap
          spots={toMapSpots(spots)}
          showRoute
          numbered
          // 지점이 많으면 이름표끼리 겹쳐 읽을 수 없으니, 5곳까지만 항상 보여주고 그 이상은 마커를 눌렀을 때만 보여준다.
          labels={spots.length <= 5 ? 'always' : 'onSelect'}
          className="h-[340px] w-full"
          fallback={
        <div className="relative h-[340px] w-full overflow-hidden bg-gradient-to-br from-secondary-100 via-secondary-50 to-tertiary-100 dark:from-secondary-950/40 dark:via-neutral-900 dark:to-tertiary-950/40">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            <polyline
              points={positions.map((pos) => `${pos.left},${pos.top}`).join(' ')}
              fill="none"
              stroke="var(--color-primary-400)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          </svg>

          {spots.map((spot, index) => {
            const pos = positions[index]
            return (
              <div
                key={spot.id}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
                style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white shadow-md ${PIN_SHADES[index % PIN_SHADES.length]}`}
                >
                  {index + 1}
                </span>
                <span className="whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-700 shadow-sm dark:bg-neutral-900 dark:text-neutral-200">
                  {spot.name}
                </span>
              </div>
            )
          })}

          <div className="absolute right-3 top-3 flex flex-col gap-2">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-500 shadow-md dark:bg-neutral-900 dark:text-neutral-300"
            >
              <Layers className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-500 shadow-md dark:bg-neutral-900 dark:text-neutral-300"
            >
              <LocateFixed className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          <span className="absolute bottom-2 left-2 rounded-full bg-white/80 px-2 py-0.5 text-[10px] text-neutral-500 dark:bg-neutral-900/80 dark:text-neutral-400">
            약식 지도 · 카카오 지도 키를 설정하면 실제 지도로 표시돼요
          </span>
        </div>
          }
        />

        <div className="relative -mt-6 rounded-t-3xl bg-white px-5 pb-5 pt-5 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-base font-bold text-neutral-900 dark:text-neutral-50">
              오늘의 일정 ({spots.length}곳)
            </h2>
            <span className="rounded-full bg-secondary-400 px-3 py-1 text-xs font-bold text-neutral-900">
              {style ? `${style.type} 맞춤 경로` : '맞춤 경로'}
            </span>
          </div>

          <Link
            to={`/search?returnTo=${encodeURIComponent(editId ? `/route?editId=${editId}` : '/route')}`}
            className="mt-3 flex items-center justify-center gap-1.5 rounded-full border border-dashed border-primary-300 py-2.5 text-xs font-bold text-primary-700 transition hover:bg-primary-50 dark:border-primary-800 dark:text-primary-400 dark:hover:bg-primary-950/30"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
            경로에 명소 추가하기
          </Link>

          {spotsLoading || (spots.length === 0 && spotsError) ? (
            <p className="mt-6 rounded-2xl bg-neutral-50 p-6 text-center text-sm text-neutral-500 dark:bg-neutral-800/40 dark:text-neutral-400" aria-busy={spotsLoading}>
              {spotsLoading ? '경로의 명소를 불러오는 중…' : spotsError}
            </p>
          ) : spots.length === 0 ? (
            <div className="mt-6 flex flex-col items-center rounded-2xl bg-neutral-50 p-6 text-center dark:bg-neutral-800/40">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                경로에 담긴 명소가 없어요. 찜한 여행지에서 추가해보세요.
              </p>
              <Link
                to="/favorites"
                className="mt-3 rounded-full bg-primary-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-primary-900"
              >
                찜한 여행지 보기
              </Link>
            </div>
          ) : (
            <div className="mt-4 flex flex-col">
              {spots.map((spot, index) => {
                const next = spots[index + 1]
                const travel = next ? estimateTravel(spot, next) : null
                return (
                  <div key={spot.id}>
                    <div className="relative flex gap-3">
                      <button
                        type="button"
                        onClick={() => removeFromRoute(spot.id)}
                        aria-label="경로에서 빼기"
                        className="absolute -top-1 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-500"
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={2.4} />
                      </button>
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${PIN_SHADES[index % PIN_SHADES.length]}`}
                      >
                        {index + 1}
                      </span>
                      <div className="flex flex-1 items-start justify-between gap-2 pb-1 pr-7">
                        <div>
                          <p className="text-xs font-bold text-primary-600 dark:text-primary-400">
                            {formatStopTime(index)}
                          </p>
                          <p className="font-headline mt-0.5 text-base font-bold leading-snug text-neutral-900 dark:text-neutral-50">
                            {spot.name}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
                            <MapPin className="h-3 w-3" strokeWidth={2.2} />
                            {spot.region}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => moveInRoute(spot.id, 'up')}
                              disabled={index === 0}
                              aria-label="위로 이동"
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 disabled:opacity-30 dark:bg-neutral-800 dark:text-neutral-400"
                            >
                              <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.4} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveInRoute(spot.id, 'down')}
                              disabled={index === spots.length - 1}
                              aria-label="아래로 이동"
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 disabled:opacity-30 dark:bg-neutral-800 dark:text-neutral-400"
                            >
                              <ArrowDown className="h-3.5 w-3.5" strokeWidth={2.4} />
                            </button>
                          </div>
                          <SpotImage src={pickImage(spot, 'thumb')} seed={spot.id} className="h-16 w-16 shrink-0 rounded-xl" />
                        </div>
                      </div>
                    </div>

                    {travel && (
                      <div className="ml-4 flex items-center gap-2 py-1">
                        <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700" />
                        <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                          <Car className="h-3 w-3" strokeWidth={2.2} />
                          {travel.timeLabel} ({travel.distanceLabel})
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {!saved && spots.length > 0 && (
            <label className="mt-5 flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-3 dark:border-neutral-700">
              <Pencil className="h-4 w-4 shrink-0 text-neutral-400" strokeWidth={2} />
              <input
                type="text"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                placeholder={`경로 별명 (예: ${autoRouteName})`}
                className="w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-50"
              />
            </label>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={saved || spots.length === 0 || spotsLoading}
              onClick={() => requireAuth(performSave)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-bold shadow-sm transition disabled:opacity-40 ${
                saved ? 'bg-secondary-400 text-neutral-900' : 'bg-primary-800 text-white hover:bg-primary-900'
              }`}
            >
              {saved ? <Check className="h-4 w-4" strokeWidth={2.2} /> : <Save className="h-4 w-4" strokeWidth={2.2} />}
              {saved
                ? `'${savedName}' ${editId ? '수정' : '저장'} 완료`
                : editId
                  ? '경로 수정하기'
                  : '경로 저장하기'}
            </button>
            <button
              type="button"
              onClick={handleSortNearest}
              disabled={spots.length < 2}
              className="flex items-center justify-center gap-2 rounded-full bg-tertiary-400 px-5 py-3 text-sm font-bold text-neutral-900 shadow-sm transition hover:bg-tertiary-500 disabled:opacity-40"
            >
              <Waypoints className="h-4 w-4" strokeWidth={2.2} />
              가까운 순 정렬
            </button>
          </div>
        </div>
      </div>

      {pendingNav && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-xs rounded-2xl bg-white p-5 text-center shadow-xl dark:bg-neutral-900">
            <p className="font-headline text-base font-bold text-neutral-900 dark:text-neutral-50">
              저장하지 않은 변경 사항이 있어요
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              지금 나가면 {editId ? '수정' : '저장'}한 내용이 사라져요. 계속 편집하시겠어요?
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSaveAndLeave}
                className="rounded-full bg-primary-800 py-2.5 text-sm font-bold text-white transition hover:bg-primary-900"
              >
                저장하고 이동하기
              </button>
              <button
                type="button"
                onClick={() => setPendingNav(null)}
                className="rounded-full bg-neutral-100 py-2.5 text-sm font-bold text-neutral-700 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
              >
                계속 편집하기
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
