import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '../api/endpoints'

interface AuthUser {
  id: number
  email: string
  nickname: string
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  // 실패하면 ApiError를 throw한다(메시지는 서버의 error.message).
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, nickname: string) => Promise<void>
  logout: () => void
}

// 백엔드 JWT 인증(POST /api/auth/register, /login). 토큰은 localStorage에 저장한다.
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      login: async (email, password) => {
        const { accessToken, user } = await authApi.login(email, password)
        // 로그인 응답에는 email이 없어서 입력값을 그대로 보관한다.
        set({ token: accessToken, user: { id: user.id, email, nickname: user.nickname } })
      },
      signup: async (email, password, nickname) => {
        await authApi.register(email, password, nickname)
        await get().login(email, password)
      },
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'iyk-auth',
      // v0은 localStorage로 흉내낸 mock 인증(가입자 목록과 비밀번호 평문 포함)이었다. 그 데이터는 버린다.
      version: 1,
      migrate: () => ({ user: null, token: null }),
      partialize: (state) => ({ user: state.user, token: state.token }),
    },
  ),
)
