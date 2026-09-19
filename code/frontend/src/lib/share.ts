import { loadKakaoSdk } from './kakaoSdk'

export interface SharePayload {
  title: string
  // 한두 줄 소개. 카카오톡 카드와 기기 공유 본문에 쓰인다.
  description: string
  // 카카오톡 카드 이미지. 카카오 서버가 가져가야 해서 공개 https 주소여야 한다(관광공사 사진이면 된다).
  imageUrl: string | null
  // 공유할 앱 안의 경로. 예: /result/INTP, /spot/2707444
  path: string
}

// 공유 링크의 기준 주소. 배포 후에는 VITE_PUBLIC_URL 로 실제 서비스 주소를 지정한다(없으면 지금 접속한 주소).
// localhost 로 공유한 링크는 받는 사람의 기기에서 열리지 않으니 개발 중 확인용이다.
export function shareUrl(path: string): string {
  const configured = (import.meta.env.VITE_PUBLIC_URL as string | undefined)?.trim().replace(/\/$/, '')
  return `${configured || window.location.origin}${path}`
}

// 링크 복사. 보안 컨텍스트가 아니어서 Clipboard API 가 막히면 오래된 방식(execCommand)으로 다시 시도한다.
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 아래 대체 방식으로 진행
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  } catch {
    return false
  }
}

export const canNativeShare = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function'

export type ShareResult = 'done' | 'cancelled' | 'failed'

// 기기의 공유 시트(모바일 카카오톡·메시지·인스타그램 등)를 연다.
export async function nativeShare(payload: SharePayload): Promise<ShareResult> {
  try {
    await navigator.share({ title: payload.title, text: payload.description, url: shareUrl(payload.path) })
    return 'done'
  } catch (error) {
    return error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : 'failed'
  }
}

// 카카오톡 공유(피드 카드). PC 에서는 카카오톡 공유 창이 팝업으로 열리고, 모바일에서는 카카오톡 앱으로 넘어간다.
export async function kakaoShare(payload: SharePayload): Promise<ShareResult> {
  try {
    const sdk = await loadKakaoSdk()
    const url = shareUrl(payload.path)
    const link = { mobileWebUrl: url, webUrl: url }
    sdk.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: payload.title,
        description: payload.description,
        // feed 템플릿은 이미지가 필요하다. 사진이 없으면 서비스 로고를 쓴다.
        imageUrl: payload.imageUrl ?? `${new URL(url).origin}/logo.png`,
        link,
      },
      buttons: [{ title: '여행가유에서 보기', link }],
    })
    return 'done'
  } catch {
    return 'failed'
  }
}
