import { create } from 'zustand'

// 저장하지 않은 편집 내용이 있는 화면(예: 경로 수정 중)이 다른 화면으로 이동을 가로채고 싶을 때 등록하는 가드.
// guard가 false를 반환하면 그 화면이 자체적으로 확인 UI를 띄우고 이동 여부를 처리한다고 간주해 즉시 이동을 멈춘다.
type NavGuard = (to: string) => boolean

interface NavGuardState {
  guard: NavGuard | null
  setGuard: (guard: NavGuard | null) => void
}

export const useNavGuardStore = create<NavGuardState>((set) => ({
  guard: null,
  setGuard: (guard) => set({ guard }),
}))
