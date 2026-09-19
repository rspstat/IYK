import { create } from 'zustand'
import type { Spot } from '../types'

// 화면 여러 곳(추천 결과, 검색, 찜 목록, 경로)이 같은 관광지를 다시 받지 않도록 한 번 받은 관광지를 기억해 둔다.
// 새로고침하면 사라지는 메모리 캐시이고, 찜·경로에는 id 만 저장한다(관광지 정보는 서버가 기준).
interface SpotCacheState {
  byId: Record<string, Spot>
  // 서버가 모른다고 한 id(데이터에서 사라진 관광지 등). 같은 id를 계속 다시 요청하지 않게 기억한다.
  notFound: Record<string, true>
  remember: (spots: Spot[]) => void
  markNotFound: (ids: string[]) => void
}

export const useSpotStore = create<SpotCacheState>()((set) => ({
  byId: {},
  notFound: {},
  remember: (spots) =>
    set((state) => {
      const byId = { ...state.byId }
      spots.forEach((spot) => {
        byId[spot.id] = spot
      })
      return { byId }
    }),
  markNotFound: (ids) =>
    set((state) => {
      const notFound = { ...state.notFound }
      ids.forEach((id) => {
        notFound[id] = true
      })
      return { notFound }
    }),
}))
