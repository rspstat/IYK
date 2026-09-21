// 카카오 JavaScript 키. 지도와 카카오톡 공유가 같은 키(같은 카카오 앱)를 쓴다.
// VITE_KAKAO_JS_KEY 를 우선하고, 없거나 비어 있으면 예전 이름인 VITE_KAKAO_MAP_KEY 를 쓴다. 설정 방법은 .env.example 참고.
// 빈 문자열도 "없음"으로 본다: 배포 화면에서 값을 비워 둔 채로 저장해도 저장소 .env 의 키로 넘어가야 한다.
const clean = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

export const KAKAO_JS_KEY = clean(import.meta.env.VITE_KAKAO_JS_KEY) || clean(import.meta.env.VITE_KAKAO_MAP_KEY)
export const hasKakaoKey = KAKAO_JS_KEY !== ''
