import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SavedRoute {
  id: string
  createdAt: number
  spotIds: string[]
}

interface TravelState {
  likedSpotIds: string[]
  likedAt: Record<string, number>
  routeSpotIds: string[]
  savedRoutes: SavedRoute[]
  toggleLike: (id: string) => void
  addToRoute: (id: string) => void
  removeFromRoute: (id: string) => void
  moveInRoute: (id: string, direction: 'up' | 'down') => void
  setRouteOrder: (spotIds: string[]) => void
  clearRoute: () => void
  saveCurrentRoute: (spotIds: string[]) => void
}

export const useTravelStore = create<TravelState>()(
  persist(
    (set) => ({
      likedSpotIds: [],
      likedAt: {},
      routeSpotIds: [],
      savedRoutes: [],
      toggleLike: (id) =>
        set((state) => {
          if (state.likedSpotIds.includes(id)) {
            const nextLikedAt = { ...state.likedAt }
            delete nextLikedAt[id]
            return {
              likedSpotIds: state.likedSpotIds.filter((spotId) => spotId !== id),
              likedAt: nextLikedAt,
            }
          }
          return {
            likedSpotIds: [...state.likedSpotIds, id],
            likedAt: { ...state.likedAt, [id]: Date.now() },
          }
        }),
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
      saveCurrentRoute: (spotIds) =>
        set((state) => ({
          savedRoutes: [
            ...state.savedRoutes,
            { id: `route-${Date.now()}`, createdAt: Date.now(), spotIds },
          ],
        })),
    }),
    { name: 'iyk-travel' },
  ),
)
