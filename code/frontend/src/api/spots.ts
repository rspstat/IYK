import { request } from './client'
import type { CongestionLevel, MbtiCategory, Spot } from '../types'

// 응답 타입은 docs/md/api-spec.md(v1.4) 기준. 명세를 바꾸면 여기도 함께 바꾼다.

interface SpotDto {
  id: string
  name: string
  region: string
  category: MbtiCategory
  congestion: CongestionLevel | null
  summary: string | null
  imageUrl: string | null
  thumbnailUrl: string | null
  mapx: number
  mapy: number
}

interface SpotDetailDto extends SpotDto {
  description: string | null
  address: string | null
  operatingHours: string | null
  tel: string | null
  photos: string[]
  petFriendly: boolean
  barrierFree: boolean
}

export interface SpotDetail extends Spot {
  description: string | null
  address: string | null
  operatingHours: string | null
  tel: string | null
  photos: string[]
  petFriendly: boolean
  barrierFree: boolean
}

export interface CongestionDay {
  date: string // YYYY-MM-DD
  level: CongestionLevel
  score: number // 집중률(%) 원값
}

export interface Congestion {
  spotId: string
  forecast: CongestionDay[] // 예측 정보가 없는 관광지는 빈 배열
  recommendedDates: string[]
}

export interface Recommendation {
  mbti: string
  category: MbtiCategory
  style: { title: string; description: string; tags: string[]; tip: string }
  spots: Spot[]
}

function toSpot(dto: SpotDto): Spot {
  return {
    id: dto.id,
    name: dto.name,
    region: dto.region,
    category: dto.category,
    congestion: dto.congestion,
    summary: dto.summary,
    imageUrl: dto.imageUrl,
    thumbnailUrl: dto.thumbnailUrl,
    coords: { lat: dto.mapy, lng: dto.mapx },
  }
}

const enc = encodeURIComponent
const MAX_IDS_PER_REQUEST = 50 // 서버 상한 (SpotQueryService.MAX_IDS)

export const spotApi = {
  recommendations: async (mbti: string): Promise<Recommendation> => {
    const data = await request<Omit<Recommendation, 'spots'> & { spots: SpotDto[] }>(`/recommendations?mbti=${enc(mbti)}`)
    return { ...data, spots: data.spots.map(toSpot) }
  },

  detail: async (id: string): Promise<SpotDetail> => {
    const dto = await request<SpotDetailDto>(`/spots/${enc(id)}`)
    return {
      ...toSpot(dto),
      description: dto.description,
      address: dto.address,
      operatingHours: dto.operatingHours,
      tel: dto.tel,
      photos: dto.photos,
      petFriendly: dto.petFriendly,
      barrierFree: dto.barrierFree,
    }
  },

  related: async (id: string): Promise<Spot[]> =>
    (await request<{ spots: SpotDto[] }>(`/spots/${enc(id)}/related`)).spots.map(toSpot),

  congestion: (id: string, days = 30) => request<Congestion>(`/spots/${enc(id)}/congestion?days=${days}`),

  // 요청한 순서를 유지해서 돌려주고, 서버에 없는 id는 빠진다. 50개를 넘으면 나눠서 요청한다.
  byIds: async (ids: string[]): Promise<Spot[]> => {
    const chunks: string[][] = []
    for (let i = 0; i < ids.length; i += MAX_IDS_PER_REQUEST) chunks.push(ids.slice(i, i + MAX_IDS_PER_REQUEST))
    const results = await Promise.all(
      chunks.map((chunk) => request<{ spots: SpotDto[] }>(`/spots?ids=${chunk.map(enc).join(',')}`)),
    )
    return results.flatMap((result) => result.spots.map(toSpot))
  },

  search: async (params: { q?: string; category?: MbtiCategory | null; limit?: number }): Promise<Spot[]> => {
    const query = new URLSearchParams()
    if (params.q) query.set('q', params.q)
    if (params.category) query.set('category', params.category)
    if (params.limit) query.set('limit', String(params.limit))
    return (await request<{ spots: SpotDto[] }>(`/spots/search?${query.toString()}`)).spots.map(toSpot)
  },
}
