import { Zap, HeartPulse, Trees, Users, Landmark, Smile, Footprints, AlertTriangle, type LucideIcon } from 'lucide-react'
import type { CongestionLevel, MbtiCategory } from '../types'

export const CATEGORY_ICON: Record<MbtiCategory, LucideIcon> = {
  activity: Zap,
  wellness: HeartPulse,
  nature: Trees,
  family: Users,
  culture: Landmark,
}

export const CONGESTION_META: Record<CongestionLevel, { label: string; icon: LucideIcon; className: string }> = {
  low: {
    label: '여유',
    icon: Smile,
    className: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-900/40 dark:text-secondary-300',
  },
  medium: {
    label: '보통',
    icon: Footprints,
    className: 'bg-tertiary-100 text-tertiary-700 dark:bg-tertiary-900/40 dark:text-tertiary-300',
  },
  high: {
    label: '혼잡',
    icon: AlertTriangle,
    className: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
  },
}
