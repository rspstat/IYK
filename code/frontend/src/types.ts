export type MbtiCategory = 'activity' | 'wellness' | 'nature' | 'family' | 'culture'

export interface MbtiStyle {
  type: string
  category: MbtiCategory
  title: string
  description: string
  tags: string[]
  tip: string
}

export type CongestionLevel = 'low' | 'medium' | 'high'

export interface Spot {
  id: string
  name: string
  region: string
  category: MbtiCategory
  congestion: CongestionLevel
  summary: string
}
