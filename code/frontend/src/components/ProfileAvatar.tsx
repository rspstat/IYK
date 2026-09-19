import { User } from 'lucide-react'

interface ProfileAvatarProps {
  // 프로필 사진(data URL). 없으면 기본 사람 아이콘을 보여준다.
  image?: string | null
  // 원의 크기·색 등(예: "h-9 w-9 bg-neutral-100 ..."). 아이콘 크기는 iconClassName 으로 정한다.
  className: string
  iconClassName: string
}

export default function ProfileAvatar({ image, className, iconClassName }: ProfileAvatarProps) {
  return (
    <span className={`flex items-center justify-center overflow-hidden rounded-full ${className}`}>
      {image ? (
        <img src={image} alt="" className="h-full w-full object-cover" />
      ) : (
        <User className={iconClassName} strokeWidth={2} />
      )}
    </span>
  )
}
