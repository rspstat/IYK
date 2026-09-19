import { CONGESTION_META } from '../data/spotMeta'
import type { CongestionLevel } from '../types'

// 오늘 기준 혼잡도 뱃지. level 이 null 이면(한국관광공사 예측 데이터에 없는 관광지) 아무것도 그리지 않는다 — 값을 지어내지 않는다.
export default function CongestionBadge({ level, className = '' }: { level: CongestionLevel | null; className?: string }) {
  if (!level) return null
  const meta = CONGESTION_META[level]
  return (
    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.className} ${className}`}>
      <meta.icon className="h-3 w-3" strokeWidth={2.2} />
      혼잡도 {meta.label}
    </span>
  )
}
