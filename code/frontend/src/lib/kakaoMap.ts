import type { Spot } from '../types'

// 카카오 지도 JavaScript 키. Kakao Developers 앱의 [플랫폼 키] > JavaScript 키이며, 도메인 등록으로 보호되는 공개용 키다.
// 없으면 지도 대신 자리표시를 보여준다. 설정 방법은 .env.example 참고.
const APP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined

export const hasKakaoMapKey = Boolean(APP_KEY && APP_KEY.trim())

let loading: Promise<typeof kakao.maps> | null = null

/**
 * 카카오 지도 SDK 를 한 번만 불러온다. autoload=false 로 스크립트를 받은 뒤 kakao.maps.load() 콜백이 끝나야 클래스를 쓸 수 있다.
 * 키가 없거나 스크립트를 받지 못하면(잘못된 키·미등록 도메인·카카오맵 사용 설정 OFF·네트워크) reject 된다.
 */
export function loadKakaoMaps(): Promise<typeof kakao.maps> {
  if (!hasKakaoMapKey) return Promise.reject(new Error('카카오 지도 키(VITE_KAKAO_MAP_KEY)가 설정되지 않았습니다.'))
  if (window.kakao?.maps?.LatLng) return Promise.resolve(window.kakao.maps)
  if (loading) return loading

  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(APP_KEY!.trim())}&autoload=false`
    script.async = true
    script.onload = () => {
      if (!window.kakao?.maps) {
        loading = null
        reject(new Error('카카오 지도 SDK 를 불러왔지만 kakao.maps 가 없습니다.'))
        return
      }
      window.kakao.maps.load(() => resolve(window.kakao!.maps))
    }
    script.onerror = () => {
      loading = null // 다음에 다시 시도할 수 있게 한다
      script.remove()
      reject(new Error('카카오 지도 SDK 를 불러오지 못했습니다.'))
    }
    document.head.appendChild(script)
  })
  return loading
}

export interface MapSpot {
  id: string
  name: string
  lat: number
  lng: number
}

export function toMapSpots(spots: Pick<Spot, 'id' | 'name' | 'coords'>[]): MapSpot[] {
  return spots.map((spot) => ({ id: spot.id, name: spot.name, lat: spot.coords.lat, lng: spot.coords.lng }))
}

// 카카오맵 앱/웹으로 넘어가는 링크. 키 없이 동작한다(https://apis.map.kakao.com/web/guide/ 의 URL 스킴).
// 이름에 쉼표가 있으면 링크 형식이 깨져서 공백으로 바꾼다.
function linkName(name: string): string {
  return encodeURIComponent(name.replace(/,/g, ' '))
}

export function kakaoMapViewUrl(spot: MapSpot): string {
  return `https://map.kakao.com/link/map/${linkName(spot.name)},${spot.lat},${spot.lng}`
}

export function kakaoMapRouteUrl(spot: MapSpot): string {
  return `https://map.kakao.com/link/to/${linkName(spot.name)},${spot.lat},${spot.lng}`
}
