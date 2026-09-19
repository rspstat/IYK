import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Copy, MessageCircle, Smartphone, X } from 'lucide-react'
import { hasKakaoKey } from '../lib/kakaoKey'
import {
  canNativeShare,
  copyToClipboard,
  kakaoShare,
  nativeShare,
  shareUrl,
  type SharePayload,
} from '../lib/share'

interface ShareButtonProps {
  payload: SharePayload
  className?: string
  ariaLabel?: string
  // 버튼 안에 넣을 내용(아이콘, 문구)
  children: ReactNode
}

/**
 * 누르면 공유 시트(카카오톡 / 링크 복사 / 기기 공유)를 여는 버튼.
 * - 카카오톡: 카카오 JavaScript 키가 있을 때만 사용할 수 있다(피드 카드로 공유).
 * - 링크 복사: 항상 사용할 수 있다.
 * - 다른 앱으로 공유: 브라우저가 Web Share API 를 지원할 때만 보인다(주로 모바일).
 */
export default function ShareButton({ payload, className = '', ariaLabel, children }: ShareButtonProps) {
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  function close() {
    setOpen(false)
    setNotice('')
  }

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setNotice('')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  async function handleCopy() {
    const ok = await copyToClipboard(shareUrl(payload.path))
    setNotice(ok ? '링크를 복사했어요.' : '링크를 복사하지 못했어요. 주소창의 주소를 직접 복사해주세요.')
  }

  async function handleKakao() {
    setBusy(true)
    const result = await kakaoShare(payload)
    setBusy(false)
    if (result === 'failed') {
      setNotice('카카오톡 공유를 열지 못했어요. 잠시 후 다시 시도하거나 링크를 복사해서 보내주세요.')
    } else {
      close()
    }
  }

  async function handleNative() {
    const result = await nativeShare(payload)
    if (result === 'failed') setNotice('공유 창을 열지 못했어요. 링크 복사를 이용해주세요.')
    else if (result === 'done') close()
  }

  const optionClass =
    'flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={ariaLabel} className={className}>
        {children}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 sm:items-center" onClick={close}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label="공유하기"
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 shadow-xl sm:rounded-3xl dark:bg-neutral-900"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-headline text-base font-bold text-neutral-900 dark:text-neutral-50">공유하기</h2>
                <button
                  type="button"
                  onClick={close}
                  aria-label="닫기"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                >
                  <X className="h-4 w-4" strokeWidth={2.4} />
                </button>
              </div>

              {/* 공유될 내용 미리보기 */}
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-neutral-50 p-3 dark:bg-neutral-800/50">
                {payload.imageUrl && (
                  <img src={payload.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-50">{payload.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">{payload.description}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleKakao}
                  disabled={!hasKakaoKey || busy}
                  className={`${optionClass} bg-[#FEE500] text-[#191919] hover:brightness-95`}
                >
                  <MessageCircle className="h-5 w-5" strokeWidth={2.2} fill="currentColor" />
                  {busy ? '카카오톡을 여는 중…' : '카카오톡으로 공유'}
                </button>
                {!hasKakaoKey && (
                  <p className="-mt-1 px-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                    카카오톡 공유는 카카오 JavaScript 키(VITE_KAKAO_JS_KEY)를 설정하면 사용할 수 있어요.
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`${optionClass} bg-neutral-100 text-neutral-800 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700`}
                >
                  <Copy className="h-5 w-5" strokeWidth={2.2} />
                  링크 복사
                </button>
                {canNativeShare() && (
                  <button
                    type="button"
                    onClick={handleNative}
                    className={`${optionClass} bg-neutral-100 text-neutral-800 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700`}
                  >
                    <Smartphone className="h-5 w-5" strokeWidth={2.2} />
                    다른 앱으로 공유
                  </button>
                )}
              </div>

              {notice && (
                <p role="status" className="mt-3 text-center text-xs font-medium text-primary-700 dark:text-primary-400">
                  {notice}
                </p>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
