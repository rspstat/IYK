export type MbtiCategory = 'activity' | 'wellness' | 'nature' | 'family' | 'culture'

export interface MbtiStyle {
  type: string
  category: MbtiCategory
  title: string
  description: string
  tags: string[]
  tip: string
}

export type CongestionLevel = 'low' | 'medium' | 'high'

export interface Spot {
  id: string
  name: string
  region: string
  category: MbtiCategory
  // 오늘 기준 혼잡도. null 이면 한국관광공사 혼잡도 예측 데이터에 없는 관광지(예측 정보 없음)라서 뱃지를 보여주지 않는다.
  congestion: CongestionLevel | null
  // 소개글 앞부분. 아직 없으면 서버가 주소로 대체해서 내려준다.
  summary: string | null
  // 대표 이미지(원본, 수백 KB)와 목록용 썸네일(약 20KB). 화면에서는 thumbnailUrl ?? imageUrl 로 쓴다.
  imageUrl: string | null
  thumbnailUrl: string | null
  // 서버는 mapx(경도)/mapy(위도)로 내려주고, 경로 계산 코드가 쓰기 쉽게 api/spots.ts 에서 바꿔 담는다.
  coords: { lat: number; lng: number }
}
