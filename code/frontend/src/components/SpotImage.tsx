import { useState, type ReactNode } from 'react'
import { gradientFor } from '../data/spotGradients'

interface SpotImageProps {
  src: string | null
  // 이미지가 없거나 불러오지 못했을 때 색을 정하는 값(보통 관광지 id)
  seed: string
  className?: string
  children?: ReactNode
}

// 관광지 사진 영역. 뱃지·버튼 같은 children 은 사진 위에 겹쳐서 놓는다.
// 사진은 화면에 가까워졌을 때 불러오고(lazy), 실패하면 그라디언트 배경이 그대로 보인다.
export default function SpotImage({ src, seed, className = '', children }: SpotImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = src !== null && src !== failedSrc
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${gradientFor(seed)} ${className}`}>
      {showImage && (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {children}
    </div>
  )
}
