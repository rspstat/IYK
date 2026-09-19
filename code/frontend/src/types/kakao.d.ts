// 카카오 지도 JavaScript SDK 중 이 프로젝트가 쓰는 부분만 선언한 최소 타입.
// (공식 타입 패키지가 없어 직접 선언한다. 더 쓰게 되면 필요한 것만 여기에 추가한다.)
// SDK 문서: https://apis.map.kakao.com/web/documentation/

declare namespace kakao.maps {
  class LatLng {
    constructor(latitude: number, longitude: number)
  }

  class LatLngBounds {
    constructor()
    extend(latlng: LatLng): void
  }

  class Map {
    constructor(container: HTMLElement, options: { center: LatLng; level?: number })
    setCenter(latlng: LatLng): void
    setLevel(level: number): void
    setBounds(bounds: LatLngBounds, paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number): void
    relayout(): void
  }

  class Polyline {
    constructor(options: {
      path: LatLng[]
      strokeWeight?: number
      strokeColor?: string
      strokeOpacity?: number
      strokeStyle?: string
    })
    setMap(map: Map | null): void
  }

  class CustomOverlay {
    constructor(options: {
      position: LatLng
      content: HTMLElement | string
      xAnchor?: number
      yAnchor?: number
      zIndex?: number
      clickable?: boolean
    })
    setMap(map: Map | null): void
  }

  // autoload=false 로 SDK 를 불러온 뒤, 이 콜백 안에서부터 위 클래스를 쓸 수 있다.
  function load(callback: () => void): void
}

interface Window {
  kakao?: typeof kakao
}
