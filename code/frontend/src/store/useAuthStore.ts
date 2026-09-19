import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthUser {
  email: string
  nickname: string
}

interface RegisteredUser extends AuthUser {
  password: string
}

interface AuthState {
  user: AuthUser | null
  registeredUsers: RegisteredUser[]
  login: (email: string, password: string) => boolean
  signup: (email: string, password: string, nickname: string) => boolean
  logout: () => void
}

// 백엔드 연동 전까지 회원가입/로그인을 localStorage로 흉내낸 mock 인증
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      registeredUsers: [],
      login: (email, password) => {
        const found = get().registeredUsers.find((u) => u.email === email)
        if (!found || found.password !== password) return false
        set({ user: { email: found.email, nickname: found.nickname } })
        return true
      },
      signup: (email, password, nickname) => {
        if (get().registeredUsers.some((u) => u.email === email)) return false
        const nextUser: RegisteredUser = { email, password, nickname }
        set((state) => ({
          registeredUsers: [...state.registeredUsers, nextUser],
          user: { email, nickname },
        }))
        return true
      },
      logout: () => set({ user: null }),
    }),
    { name: 'iyk-auth' },
  ),
)
