import { KAKAO_JS_KEY, hasKakaoKey } from './kakaoKey'

// 카카오 JavaScript SDK (카카오톡 공유용). 버전과 SRI 해시는 Kakao Developers 문서의 스크립트 태그 그대로다.
// 버전을 올릴 때는 문서에서 새 버전의 integrity 값도 함께 가져와야 한다.
const SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js'
const SDK_INTEGRITY = 'sha384-OL+ylM/iuPLtW5U3XcvLSGhE8JzReKDank5InqlHGWPhb4140/yrBw0bg0y7+C9J'

let loading: Promise<typeof Kakao> | null = null

/**
 * 카카오 JS SDK 를 한 번만 불러오고 Kakao.init 까지 마친다.
 * 키가 없거나 스크립트를 받지 못하면 reject 된다(다음에 다시 시도할 수 있다).
 */
export function loadKakaoSdk(): Promise<typeof Kakao> {
  if (!hasKakaoKey) return Promise.reject(new Error('카카오 JavaScript 키가 설정되지 않았습니다.'))
  if (window.Kakao?.isInitialized()) return Promise.resolve(window.Kakao)
  if (loading) return loading

  loading = new Promise((resolve, reject) => {
    const finish = () => {
      const sdk = window.Kakao
      if (!sdk) {
        loading = null
        reject(new Error('카카오 SDK 를 불러왔지만 Kakao 객체가 없습니다.'))
        return
      }
      if (!sdk.isInitialized()) sdk.init(KAKAO_JS_KEY)
      resolve(sdk)
    }
    if (window.Kakao) {
      finish()
      return
    }
    const script = document.createElement('script')
    script.src = SDK_URL
    script.integrity = SDK_INTEGRITY
    script.crossOrigin = 'anonymous'
    script.async = true
    script.onload = finish
    script.onerror = () => {
      loading = null
      script.remove()
      reject(new Error('카카오 SDK 를 불러오지 못했습니다.'))
    }
    document.head.appendChild(script)
  })
  return loading
}
