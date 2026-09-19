import { useEffect, useState } from 'react'
import { getErrorMessage } from '../api/client'
import { spotApi } from '../api/spots'
import { useSpotStore } from '../store/useSpotStore'
import type { Spot } from '../types'

/**
 * id 목록(찜, 경로 등)에 해당하는 관광지를 돌려준다. 이미 받은 것은 캐시에서 쓰고, 없는 것만 서버에서 한 번에 받아온다.
 * 결과는 ids 순서를 따르며 서버에 없는 id 는 빠진다.
 */
export function useSpotsByIds(ids: string[]): { spots: Spot[]; loading: boolean; error: string } {
  const byId = useSpotStore((state) => state.byId)
  const notFound = useSpotStore((state) => state.notFound)
  const [failed, setFailed] = useState<{ key: string; message: string } | null>(null)

  const missing = ids.filter((id) => !byId[id] && !notFound[id])
  const key = missing.join(',')
  const error = failed && failed.key === key ? failed.message : ''

  useEffect(() => {
    if (!key) return
    let cancelled = false
    const wanted = key.split(',')
    spotApi.byIds(wanted).then(
      (spots) => {
        if (cancelled) return
        const store = useSpotStore.getState()
        store.remember(spots)
        const found = new Set(spots.map((spot) => spot.id))
        store.markNotFound(wanted.filter((id) => !found.has(id)))
      },
      (e) => {
        if (!cancelled) setFailed({ key, message: getErrorMessage(e) })
      },
    )
    return () => {
      cancelled = true
    }
  }, [key])

  return {
    spots: ids.map((id) => byId[id]).filter((spot): spot is Spot => Boolean(spot)),
    loading: missing.length > 0 && !error,
    error,
  }
}
