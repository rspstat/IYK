import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { likeApi, parseServerDate, type MyLike } from '../api/endpoints'

export interface SavedRoute {
  id: string
  name: string
  createdAt: number
  spotIds: string[]
}

interface TravelState {
  likedSpotIds: string[]
  likedAt: Record<string, number>
  routeSpotIds: string[]
  activeEditRouteId: string | null
  savedRoutes: SavedRoute[]
  // 서버(POST /api/spots/{id}/like)에 토글을 요청하고, 응답의 liked 값을 그대로 반영한다. 성공 여부를 반환.
  toggleLike: (id: string) => Promise<boolean>
  // 서버의 내 찜 목록(GET /api/me/likes)으로 로컬 캐시를 통째로 교체한다.
  setLikes: (likes: MyLike[]) => void
  resetLikes: () => void
  addToRoute: (id: string) => void
  removeFromRoute: (id: string) => void
  moveInRoute: (id: string, direction: 'up' | 'down') => void
  setRouteOrder: (spotIds: string[]) => void
  clearRoute: () => void
  setActiveEditRouteId: (id: string | null) => void
  saveCurrentRoute: (spotIds: string[], name?: string) => void
  updateSavedRoute: (id: string, spotIds: string[], name?: string) => void
  deleteSavedRoute: (id: string) => void
}

export const useTravelStore = create<TravelState>()(
  persist(
    (set) => ({
      likedSpotIds: [],
      likedAt: {},
      routeSpotIds: [],
      activeEditRouteId: null,
      savedRoutes: [],
      toggleLike: async (id) => {
        try {
          const { liked } = await likeApi.toggle(id)
          set((state) => {
            const withoutId = state.likedSpotIds.filter((spotId) => spotId !== id)
            if (!liked) {
              const nextLikedAt = { ...state.likedAt }
              delete nextLikedAt[id]
              return { likedSpotIds: withoutId, likedAt: nextLikedAt }
            }
            return {
              likedSpotIds: [...withoutId, id],
              likedAt: { ...state.likedAt, [id]: Date.now() },
            }
          })
          return true
        } catch (error) {
          // 실패하면 하트 상태를 바꾸지 않는다. 401이면 apiClient가 이미 로그아웃 처리했다.
          console.error('찜 토글 실패', error)
          return false
        }
      },
      setLikes: (likes) =>
        set({
          likedSpotIds: likes.map((like) => like.spotId),
          likedAt: Object.fromEntries(likes.map((like) => [like.spotId, parseServerDate(like.createdAt)])),
        }),
      resetLikes: () => set({ likedSpotIds: [], likedAt: {} }),
      addToRoute: (id) =>
        set((state) =>
          state.routeSpotIds.includes(id) ? state : { routeSpotIds: [...state.routeSpotIds, id] },
        ),
      removeFromRoute: (id) =>
        set((state) => ({
          routeSpotIds: state.routeSpotIds.filter((spotId) => spotId !== id),
        })),
      moveInRoute: (id, direction) =>
        set((state) => {
          const idx = state.routeSpotIds.indexOf(id)
          const swapWith = direction === 'up' ? idx - 1 : idx + 1
          if (idx === -1 || swapWith < 0 || swapWith >= state.routeSpotIds.length) return state
          const next = [...state.routeSpotIds]
          ;[next[idx], next[swapWith]] = [next[swapWith], next[idx]]
          return { routeSpotIds: next }
        }),
      setRouteOrder: (spotIds) => set({ routeSpotIds: spotIds }),
      clearRoute: () => set({ routeSpotIds: [] }),
      setActiveEditRouteId: (id) => set({ activeEditRouteId: id }),
      saveCurrentRoute: (spotIds, name) => {
        const createdAt = Date.now()
        const fallbackName = `${new Date(createdAt).getMonth() + 1}월 ${new Date(createdAt).getDate()}일 여행 코스`
        set((state) => ({
          savedRoutes: [
            ...state.savedRoutes,
            { id: `route-${createdAt}`, name: name?.trim() || fallbackName, createdAt, spotIds },
          ],
        }))
      },
      updateSavedRoute: (id, spotIds, name) =>
        set((state) => ({
          savedRoutes: state.savedRoutes.map((route) =>
            route.id === id ? { ...route, spotIds, name: name?.trim() || route.name } : route,
          ),
        })),
      deleteSavedRoute: (id) =>
        set((state) => ({
          savedRoutes: state.savedRoutes.filter((route) => route.id !== id),
        })),
    }),
    { name: 'iyk-travel' },
  ),
)
