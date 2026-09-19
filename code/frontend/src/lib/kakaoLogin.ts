import { authApi } from '../api/endpoints'

// 카카오 로그인(인가 코드 방식)의 브라우저 쪽 절차.
//   1) startKakaoLogin: state 를 만들어 저장하고, 서버가 알려준 카카오 로그인 주소로 이동
//   2) (카카오 로그인 창에서 동의) → 카카오가 /auth/kakao/callback?code=...&state=... 로 되돌려 보냄
//   3) 콜백 화면(KakaoCallbackPage)이 consumeKakaoLoginState 로 state 를 검증하고 code 를 서버에 보냄

const STATE_KEY = 'iyk-kakao-state'
const REDIRECT_KEY = 'iyk-kakao-redirect'

// 카카오 콘솔의 Redirect URI 에 등록한 값과 정확히 같아야 한다(개발 중에는 http://localhost:5173/auth/kakao/callback).
export const kakaoRedirectUri = () => `${window.location.origin}/auth/kakao/callback`

// 서버가 카카오 로그인을 쓸 수 있게 설정돼 있는지(한 번만 물어본다). 실패하면 버튼을 숨긴다.
let providersCheck: Promise<boolean> | null = null
export function isKakaoLoginAvailable(): Promise<boolean> {
  providersCheck ??= authApi.providers().then(
    (providers) => providers.kakao,
    () => false,
  )
  return providersCheck
}

function randomState(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** 카카오 로그인 창으로 이동한다. 로그인이 끝나면 afterLoginPath 로 돌아온다. */
export async function startKakaoLogin(afterLoginPath: string): Promise<void> {
  const state = randomState()
  sessionStorage.setItem(STATE_KEY, state)
  sessionStorage.setItem(REDIRECT_KEY, afterLoginPath)
  const { url } = await authApi.kakaoLoginUrl(kakaoRedirectUri(), state)
  window.location.assign(url)
}

/** 콜백에서 돌려받은 state 가 우리가 만든 것과 같은지 확인하고(CSRF 방지) 저장해 둔 값을 지운다. */
export function consumeKakaoLoginState(returnedState: string | null): { valid: boolean; afterLoginPath: string } {
  const expected = sessionStorage.getItem(STATE_KEY)
  const afterLoginPath = sessionStorage.getItem(REDIRECT_KEY) || '/'
  sessionStorage.removeItem(STATE_KEY)
  sessionStorage.removeItem(REDIRECT_KEY)
  return { valid: Boolean(expected) && expected === returnedState, afterLoginPath }
}
