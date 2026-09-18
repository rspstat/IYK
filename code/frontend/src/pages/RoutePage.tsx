import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
} from 'lucide-react'
import { MBTI_STYLES } from '../data/mbtiStyles'
import { MOCK_SPOTS } from '../data/mockSpots'
import { SPOT_GRADIENTS } from '../data/spotGradients'
import { useTravelStore } from '../store/useTravelStore'
import { useRequireAuth } from '../hooks/useRequireAuth'
import BottomNav from '../components/BottomNav'
import type { Spot } from '../types'

const PIN_SHADES = ['bg-primary-700', 'bg-primary-500', 'bg-primary-300']

// 지도 API 연동 전까지 핀 위치를 흉내 낸 좌표 (실제 좌표 아님, 0~100 백분율)
const PIN_POSITIONS = [
  { top: 32, left: 28 },
  { top: 46, left: 58 },
  { top: 66, left: 76 },
]

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
  const [searchParams] = useSearchParams()
  const mbtiParam = searchParams.get('mbti')?.toUpperCase()
  const style = MBTI_STYLES.find((s) => s.type === mbtiParam)

  const routeSpotIds = useTravelStore((state) => state.routeSpotIds)
  const removeFromRoute = useTravelStore((state) => state.removeFromRoute)
  const moveInRoute = useTravelStore((state) => state.moveInRoute)
  const setRouteOrder = useTravelStore((state) => state.setRouteOrder)
  const saveCurrentRoute = useTravelStore((state) => state.saveCurrentRoute)
  const requireAuth = useRequireAuth()
  const [saved, setSaved] = useState(false)

  const fallbackSpots = style
    ? MOCK_SPOTS.filter((spot) => spot.category === style.category).slice(0, 3)
    : MOCK_SPOTS.slice(0, 3)

  // routeSpotIds가 비어있으면(경로에 아무것도 안 담고 곧장 들어온 경우) 미리보기 목록을 실제 경로로 반영해서
  // 이후 빼기·순서변경·정렬이 바로 동작하게 만든다.
  useEffect(() => {
    if (routeSpotIds.length === 0 && fallbackSpots.length > 0) {
      setRouteOrder(fallbackSpots.map((spot) => spot.id))
    }
  }, [])

  const spots =
    routeSpotIds.length > 0
      ? (routeSpotIds.map((id) => MOCK_SPOTS.find((spot) => spot.id === id)).filter(Boolean) as Spot[])
      : fallbackSpots

  function handleSortNearest() {
    if (spots.length < 2) return
    const ordered = sortByNearestNeighbor(spots)
    setRouteOrder(ordered.map((spot) => spot.id))
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-md pb-24">
        <header className="flex items-center justify-between bg-white px-4 py-4 dark:bg-neutral-950">
          <Link to="/" className="text-primary-800 dark:text-primary-400">
            <ArrowLeft className="h-5 w-5" strokeWidth={2.4} />
          </Link>
          <h1 className="font-headline text-lg font-bold text-primary-800 dark:text-primary-400">
            여행 경로 확인
          </h1>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 ring-2 ring-primary-300 dark:bg-neutral-800 dark:text-neutral-500">
            <User className="h-5 w-5" strokeWidth={2} />
          </div>
        </header>

        <div className="relative h-[340px] w-full overflow-hidden bg-gradient-to-br from-secondary-100 via-secondary-50 to-tertiary-100 dark:from-secondary-950/40 dark:via-neutral-900 dark:to-tertiary-950/40">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            <polyline
              points={spots.map((_, i) => {
                const pos = PIN_POSITIONS[i] ?? PIN_POSITIONS[PIN_POSITIONS.length - 1]
                return `${pos.left},${pos.top}`
              }).join(' ')}
              fill="none"
              stroke="var(--color-primary-400)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          </svg>

          {spots.map((spot, index) => {
            const pos = PIN_POSITIONS[index] ?? PIN_POSITIONS[PIN_POSITIONS.length - 1]
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
            카카오 지도 연동 예정
          </span>
        </div>

        <div className="relative -mt-6 rounded-t-3xl bg-white px-5 pb-5 pt-5 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-base font-bold text-neutral-900 dark:text-neutral-50">
              오늘의 일정 ({spots.length}곳)
            </h2>
            <span className="rounded-full bg-secondary-400 px-3 py-1 text-xs font-bold text-neutral-900">
              {style ? `${style.type} 맞춤 경로` : '맞춤 경로'}
            </span>
          </div>

          {spots.length === 0 ? (
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
                          <div
                            className={`h-16 w-16 shrink-0 rounded-xl bg-gradient-to-br ${SPOT_GRADIENTS[spot.id] ?? 'from-neutral-300 to-neutral-400'}`}
                          />
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

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              disabled={saved || spots.length === 0}
              onClick={() =>
                requireAuth(() => {
                  saveCurrentRoute(spots.map((spot) => spot.id))
                  setSaved(true)
                })
              }
              className={`flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-bold shadow-sm transition disabled:opacity-40 ${
                saved ? 'bg-secondary-400 text-neutral-900' : 'bg-primary-800 text-white hover:bg-primary-900'
              }`}
            >
              {saved ? <Check className="h-4 w-4" strokeWidth={2.2} /> : <Save className="h-4 w-4" strokeWidth={2.2} />}
              {saved ? '저장 완료' : '경로 저장하기'}
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

      <BottomNav />
    </div>
  )
}
