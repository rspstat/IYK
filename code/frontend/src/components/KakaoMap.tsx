import { useEffect, useRef, useState, type ReactNode } from 'react'
import { hasKakaoMapKey, loadKakaoMaps, type MapSpot } from '../lib/kakaoMap'

interface KakaoMapProps {
  spots: MapSpot[]
  // 방문 순서(spots 배열 순서)대로 선으로 잇는다.
  showRoute?: boolean
  // 마커에 1, 2, 3… 순번을 적는다.
  numbered?: boolean
  // always: 모든 마커에 이름 표시 / onSelect: 마커를 눌렀을 때만 그 마커의 이름 표시
  labels?: 'always' | 'onSelect'
  className?: string
  // 이름표를 눌렀을 때(onSelect 모드) 호출된다. 보통 상세 페이지 이동.
  onSelectSpot?: (id: string) => void
  // 키가 없거나 SDK 를 불러오지 못했을 때 대신 보여줄 내용
  fallback: ReactNode
}

// 충청북도 가운데(청주 부근). 관광지가 없을 때 지도를 여기에 둔다.
const CHUNGBUK_CENTER = { lat: 36.64, lng: 127.49 }
const PRIMARY = '#c14b14' // tailwind primary-700

function markerElement(options: {
  text: string
  name: string
  showLabel: boolean
  active: boolean
  onPinClick: () => void
  onLabelClick: () => void
}): HTMLElement {
  // 이름은 TourAPI 에서 온 외부 데이터라서 innerHTML 이 아니라 textContent 로만 넣는다.
  const root = document.createElement('div')
  root.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer'

  const pin = document.createElement('span')
  const size = options.active ? 32 : 26
  pin.textContent = options.text
  pin.style.cssText = `display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:${PRIMARY};color:#fff;font:700 12px sans-serif;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)`
  pin.addEventListener('click', options.onPinClick)
  root.appendChild(pin)

  if (options.showLabel) {
    const label = document.createElement('span')
    label.textContent = options.name
    label.style.cssText =
      'max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:2px 8px;border-radius:9999px;background:#fff;color:#404040;font:600 11px sans-serif;box-shadow:0 1px 3px rgba(0,0,0,.3)'
    label.addEventListener('click', options.onLabelClick)
    root.appendChild(label)
  }
  return root
}

/**
 * 카카오 지도. spots 를 마커로 표시하고 화면에 맞게 확대/이동한다.
 * VITE_KAKAO_MAP_KEY 가 없거나 SDK 를 불러오지 못하면 fallback 을 대신 그린다(실패했을 때는 원인 안내를 덧붙인다).
 */
export default function KakaoMap({
  spots,
  showRoute = false,
  numbered = false,
  labels = 'onSelect',
  className = '',
  onSelectSpot,
  fallback,
}: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<kakao.maps.Map | null>(null)
  const drawnRef = useRef<{ setMap(map: kakao.maps.Map | null): void }[]>([])
  const onSelectRef = useRef(onSelectSpot)
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>(hasKakaoMapKey ? 'loading' : 'failed')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    onSelectRef.current = onSelectSpot
  }, [onSelectSpot])

  // 1) SDK 를 불러오고 지도를 만든다.
  useEffect(() => {
    if (!hasKakaoMapKey) return
    let cancelled = false
    loadKakaoMaps().then(
      (maps) => {
        const container = containerRef.current
        if (cancelled || !container) return
        mapRef.current = new maps.Map(container, { center: new maps.LatLng(CHUNGBUK_CENTER.lat, CHUNGBUK_CENTER.lng), level: 10 })
        setStatus('ready')
      },
      () => {
        if (!cancelled) setStatus('failed')
      },
    )
    return () => {
      cancelled = true
      drawnRef.current.forEach((item) => item.setMap(null))
      drawnRef.current = []
      mapRef.current = null
    }
  }, [])

  const spotsKey = spots.map((spot) => `${spot.id}:${spot.lat}:${spot.lng}`).join('|')

  // 2) 관광지가 바뀌면 그 범위가 한눈에 들어오도록 지도를 맞춘다. (마커를 눌렀을 때는 지도를 움직이지 않는다.)
  useEffect(() => {
    const map = mapRef.current
    if (status !== 'ready' || !map) return
    const maps = window.kakao!.maps
    map.relayout()
    if (spots.length === 0) {
      map.setCenter(new maps.LatLng(CHUNGBUK_CENTER.lat, CHUNGBUK_CENTER.lng))
      map.setLevel(10)
    } else if (spots.length === 1) {
      map.setCenter(new maps.LatLng(spots[0].lat, spots[0].lng))
      map.setLevel(5)
    } else {
      const bounds = new maps.LatLngBounds()
      spots.forEach((spot) => bounds.extend(new maps.LatLng(spot.lat, spot.lng)))
      map.setBounds(bounds, 48, 32, 48, 32)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, spotsKey])

  // 3) 마커와 경로선을 그린다.
  useEffect(() => {
    const map = mapRef.current
    if (status !== 'ready' || !map) return
    const maps = window.kakao!.maps
    drawnRef.current.forEach((item) => item.setMap(null))
    drawnRef.current = []

    if (showRoute && spots.length >= 2) {
      const line = new maps.Polyline({
        path: spots.map((spot) => new maps.LatLng(spot.lat, spot.lng)),
        strokeWeight: 4,
        strokeColor: PRIMARY,
        strokeOpacity: 0.85,
        strokeStyle: 'solid',
      })
      line.setMap(map)
      drawnRef.current.push(line)
    }

    spots.forEach((spot, index) => {
      const active = selectedId === spot.id
      const overlay = new maps.CustomOverlay({
        position: new maps.LatLng(spot.lat, spot.lng),
        content: markerElement({
          text: numbered ? String(index + 1) : '',
          name: spot.name,
          showLabel: labels === 'always' || active,
          active,
          onPinClick: () => setSelectedId((current) => (current === spot.id ? null : spot.id)),
          onLabelClick: () => onSelectRef.current?.(spot.id),
        }),
        yAnchor: 1,
        zIndex: active ? 10 : 1,
        clickable: true, // 마커를 눌러도 지도 드래그·클릭으로 처리되지 않게 한다
      })
      overlay.setMap(map)
      drawnRef.current.push(overlay)
    })
  }, [status, spotsKey, showRoute, numbered, labels, selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'failed') {
    return (
      <>
        {fallback}
        {hasKakaoMapKey && (
          <p className="mt-1 text-[10px] leading-relaxed text-neutral-400 dark:text-neutral-500">
            카카오 지도를 불러오지 못했어요. Kakao Developers 앱의 JavaScript 키, 사이트 도메인 등록, 카카오맵 사용 설정(ON)을
            확인해주세요.
          </p>
        )}
      </>
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />
      {status === 'loading' && (
        <div className="absolute inset-0 animate-pulse bg-neutral-100 dark:bg-neutral-800" aria-busy="true" />
      )}
    </div>
  )
}
