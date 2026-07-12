import type { MbtiCategory } from '../types'

interface CategoryMeta {
  label: string
  apis: string[]
  badge: string
  card: string
}

export const CATEGORY_META: Record<MbtiCategory, CategoryMeta> = {
  activity: {
    label: '액티비티·레저',
    apis: ['두루누비', '국문관광정보(레포츠)'],
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    card: 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30',
  },
  wellness: {
    label: '힐링·웰니스',
    apis: ['웰니스관광정보'],
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    card: 'border-teal-200 bg-teal-50 dark:border-teal-900 dark:bg-teal-950/30',
  },
  nature: {
    label: '자연·캠핑',
    apis: ['고캠핑정보', '두루누비'],
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    card: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30',
  },
  family: {
    label: '동반·가족',
    apis: ['반려동물 동반여행', '무장애 여행정보'],
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    card: 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30',
  },
  culture: {
    label: '문화·역사',
    apis: ['국문관광정보(문화시설·관광지)'],
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    card: 'border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/30',
  },
}
