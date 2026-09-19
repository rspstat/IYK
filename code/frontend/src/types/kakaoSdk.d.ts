// 카카오 JavaScript SDK(kakao.min.js) 중 카카오톡 공유에 쓰는 부분만 선언한 최소 타입.
// (지도 SDK 는 소문자 `kakao`, 이 SDK 는 대문자 `Kakao` 로 서로 다른 전역이다. 지도 쪽은 kakao.d.ts 참고.)
// 문서: https://developers.kakao.com/docs/latest/ko/kakaotalk-share/js-link

declare namespace Kakao {
  function init(appKey: string): void
  function isInitialized(): boolean

  namespace Share {
    interface Link {
      mobileWebUrl: string
      webUrl: string
    }

    function sendDefault(settings: {
      objectType: 'feed'
      content: { title: string; description?: string; imageUrl: string; link: Link }
      buttons?: { title: string; link: Link }[]
    }): void
  }
}

interface Window {
  Kakao?: typeof Kakao
}
