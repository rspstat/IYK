import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi, userApi } from '../api/endpoints'

interface AuthUser {
  id: number
  // 이메일로 가입한 계정만 있다. 카카오 계정은 이메일을 받지 않아 null 이다.
  email: string | null
  nickname: string
  // 프로필 사진(data URL). 없으면 null. 이 필드가 생기기 전에 저장된 로그인 정보에는 없을 수 있다(undefined).
  profileImage?: string | null
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  // 실패하면 ApiError를 throw한다(메시지는 서버의 error.message).
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, nickname: string) => Promise<void>
  // 카카오가 리다이렉트로 돌려준 인가 코드로 로그인한다(처음이면 서버가 계정을 만든다).
  loginWithKakao: (code: string, redirectUri: string) => Promise<void>
  // 서버에 닉네임을 바꾸고 로그인 정보에도 반영한다. 실패하면 ApiError를 throw한다.
  changeNickname: (nickname: string) => Promise<void>
  // 서버의 내 정보(이메일·닉네임·프로필 사진)로 로그인 정보를 새로 맞춘다. 실패해도 조용히 넘어간다(화면은 저장된 값을 계속 쓴다).
  refreshProfile: () => Promise<void>
  // 프로필 사진을 바꾸거나(data URL) 지운다(null). 실패하면 ApiError를 throw한다.
  changeProfileImage: (image: string | null) => Promise<void>
  logout: () => void
}

// 백엔드 JWT 인증(POST /api/auth/register, /login, /kakao). 토큰은 localStorage에 저장한다.
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      login: async (email, password) => {
        const { accessToken, user } = await authApi.login(email, password)
        // 로그인 응답에는 email이 없어서 입력값을 그대로 보관한다.
        set({ token: accessToken, user: { id: user.id, email, nickname: user.nickname, profileImage: null } })
      },
      signup: async (email, password, nickname) => {
        await authApi.register(email, password, nickname)
        await get().login(email, password)
      },
      loginWithKakao: async (code, redirectUri) => {
        const { accessToken, user } = await authApi.kakaoLogin(code, redirectUri)
        set({ token: accessToken, user: { id: user.id, email: null, nickname: user.nickname, profileImage: null } })
      },
      changeNickname: async (nickname) => {
        const updated = await userApi.changeNickname(nickname)
        const current = get().user
        // 요청 중에 로그아웃했으면 반영할 계정이 없다.
        if (current) set({ user: { ...current, nickname: updated.nickname } })
      },
      refreshProfile: async () => {
        const startedFor = get().user?.id
        if (startedFor === undefined) return
        try {
          const me = await userApi.me()
          const current = get().user
          // 요청 중에 로그아웃했거나 다른 계정으로 바뀌었으면 반영하지 않는다.
          if (current && current.id === startedFor) {
            set({ user: { ...current, email: me.email, nickname: me.nickname, profileImage: me.profileImage } })
          }
        } catch {
          // 네트워크 오류 등은 무시한다. 401(만료)은 api 클라이언트가 이미 로그아웃 처리한다.
        }
      },
      changeProfileImage: async (image) => {
        let saved: string | null = null
        if (image === null) await userApi.removeProfileImage()
        else saved = (await userApi.setProfileImage(image)).profileImage
        const current = get().user
        if (current) set({ user: { ...current, profileImage: saved } })
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
