import type { Spot } from '../types'

// 목록 카드는 작은 썸네일(약 20KB)을, 큰 화면은 원본을 쓴다. 한쪽만 있으면 있는 쪽을 쓴다.
export function pickImage(spot: Pick<Spot, 'imageUrl' | 'thumbnailUrl'>, size: 'thumb' | 'full'): string | null {
  return size === 'thumb' ? (spot.thumbnailUrl ?? spot.imageUrl) : (spot.imageUrl ?? spot.thumbnailUrl)
}
