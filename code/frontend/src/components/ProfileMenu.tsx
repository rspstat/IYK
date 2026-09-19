import { useEffect, useRef, useState } from 'react'
import { Camera, ImageOff, LogOut } from 'lucide-react'
import ProfileAvatar from './ProfileAvatar'

interface ProfileMenuProps {
  // 현재 프로필 사진(data URL). 없으면 null/undefined.
  image?: string | null
  // 사진을 올리거나 지우는 중이면 true. 그동안 사진 메뉴는 누를 수 없다.
  busy: boolean
  onPickFile: (file: File) => void
  onRemove: () => void
  onLogout: () => void
}

const itemClass =
  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-neutral-800 transition hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-100 dark:hover:bg-neutral-800'

// 마이페이지 오른쪽 위 프로필 아이콘 + 드롭다운(프로필 사진 변경 / 삭제 / 로그아웃).
export default function ProfileMenu({ image, busy, onPickFile, onRemove, onLogout }: ProfileMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // 메뉴 밖을 누르거나 Esc 를 누르면 닫는다.
  useEffect(() => {
    if (!open) return
    const closeOnOutside = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  function choosePhoto() {
    setOpen(false)
    fileRef.current?.click()
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="프로필 메뉴"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex rounded-full transition ${busy ? 'opacity-60' : 'hover:opacity-80'}`}
      >
        <ProfileAvatar
          image={image}
          className="h-9 w-9 bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500"
          iconClassName="h-5 w-5"
        />
      </button>

      {/* 메뉴를 닫은 뒤에도 파일 선택 결과를 받아야 해서 항상 렌더링해 둔다. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        aria-label="프로필 사진 파일 선택"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          // 같은 사진을 다시 골라도 change 가 발생하도록 비워 둔다.
          e.target.value = ''
          if (file) onPickFile(file)
        }}
      />

      {open && (
        <div
          role="menu"
          aria-label="프로필 메뉴"
          className="absolute right-0 top-11 z-30 w-52 rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-700"
        >
          <button type="button" role="menuitem" disabled={busy} onClick={choosePhoto} className={itemClass}>
            <Camera className="h-4 w-4 text-neutral-500 dark:text-neutral-400" strokeWidth={2} />
            프로필 사진 변경
          </button>
          {image && (
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={() => {
                setOpen(false)
                onRemove()
              }}
              className={itemClass}
            >
              <ImageOff className="h-4 w-4 text-neutral-500 dark:text-neutral-400" strokeWidth={2} />
              프로필 사진 삭제
            </button>
          )}
          <div className="my-1 h-px bg-neutral-100 dark:bg-neutral-800" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
            className={itemClass}
          >
            <LogOut className="h-4 w-4 text-neutral-500 dark:text-neutral-400" strokeWidth={2} />
            로그아웃
          </button>
        </div>
      )}
    </div>
  )
}
