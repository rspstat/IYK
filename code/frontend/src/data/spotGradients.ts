// 대표 이미지가 없거나 불러오지 못한 관광지의 자리를 채울 그라디언트.
// 관광지 id 로 색을 정해서 같은 관광지는 늘 같은 색이다. (Tailwind 가 클래스를 찾을 수 있게 문자열 그대로 나열한다.)
const GRADIENTS = [
  'from-tertiary-400 via-tertiary-300 to-secondary-300',
  'from-secondary-400 via-secondary-300 to-tertiary-200',
  'from-tertiary-300 via-tertiary-200 to-primary-100',
  'from-secondary-300 via-secondary-200 to-tertiary-100',
  'from-primary-200 via-primary-100 to-tertiary-100',
  'from-tertiary-400 via-tertiary-200 to-secondary-200',
  'from-secondary-400 via-secondary-200 to-tertiary-100',
  'from-tertiary-300 via-secondary-200 to-secondary-100',
  'from-secondary-300 via-secondary-200 to-primary-100',
  'from-tertiary-200 via-secondary-100 to-primary-100',
  'from-primary-300 via-primary-200 to-secondary-100',
  'from-primary-400 via-primary-200 to-tertiary-100',
  'from-neutral-300 via-neutral-200 to-primary-100',
  'from-primary-300 via-secondary-200 to-tertiary-100',
]

export function gradientFor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
}
