import { create } from 'zustand'

interface TravelState {
  likedSpotIds: string[]
  routeSpotIds: string[]
  toggleLike: (id: string) => void
  addToRoute: (id: string) => void
  removeFromRoute: (id: string) => void
  clearRoute: () => void
}

export const useTravelStore = create<TravelState>((set) => ({
  likedSpotIds: [],
  routeSpotIds: [],
  toggleLike: (id) =>
    set((state) => ({
      likedSpotIds: state.likedSpotIds.includes(id)
        ? state.likedSpotIds.filter((spotId) => spotId !== id)
        : [...state.likedSpotIds, id],
    })),
  addToRoute: (id) =>
    set((state) =>
      state.routeSpotIds.includes(id) ? state : { routeSpotIds: [...state.routeSpotIds, id] },
    ),
  removeFromRoute: (id) =>
    set((state) => ({
      routeSpotIds: state.routeSpotIds.filter((spotId) => spotId !== id),
    })),
  clearRoute: () => set({ routeSpotIds: [] }),
}))
