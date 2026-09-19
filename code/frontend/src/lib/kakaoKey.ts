// 카카오 JavaScript 키. 지도와 카카오톡 공유가 같은 키(같은 카카오 앱)를 쓴다.
// VITE_KAKAO_JS_KEY 를 우선하고, 없으면 예전 이름인 VITE_KAKAO_MAP_KEY 를 쓴다. 설정 방법은 .env.example 참고.
const raw = (import.meta.env.VITE_KAKAO_JS_KEY ?? import.meta.env.VITE_KAKAO_MAP_KEY) as string | undefined

export const KAKAO_JS_KEY = raw?.trim() ?? ''
export const hasKakaoKey = KAKAO_JS_KEY !== ''
