import { useEffect, useState } from 'react'
import { ApiError } from '../api/client'

interface Result<T> {
  key: string
  data?: T
  error?: unknown
}

const RETRY_MS = 3000
const MAX_RETRIES = 20

/**
 * key 가 바뀔 때마다 loader 를 실행해서 결과를 돌려주는 데이터 조회 훅.
 * - key 가 null 이면 아무것도 하지 않는다(idle, loading=false).
 * - 서버가 DATA_NOT_READY(시작 직후 동기화 중)라고 하면 3초마다 최대 20번 자동으로 다시 시도한다.
 * - loader 는 key 가 바뀔 때만 다시 실행되므로, loader 가 쓰는 값은 key 에 담아야 한다.
 */
export function useApiData<T>(loader: () => Promise<T>, key: string | null) {
  const [result, setResult] = useState<Result<T>>({ key: '' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (key === null) return
    let cancelled = false
    loader().then(
      (data) => {
        if (!cancelled) setResult({ key, data })
      },
      (error) => {
        if (!cancelled) setResult({ key, error })
      },
    )
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt])

  const current = key !== null && result.key === key
  const error = current ? result.error : undefined
  const waitingForServer = error instanceof ApiError && error.code === 'DATA_NOT_READY' && attempt < MAX_RETRIES

  useEffect(() => {
    if (!waitingForServer) return
    const timer = setTimeout(() => setAttempt((n) => n + 1), RETRY_MS)
    return () => clearTimeout(timer)
  }, [waitingForServer, attempt])

  const data = current ? result.data : undefined
  return {
    data,
    // 서버가 준비 중이라 재시도를 기다리는 동안에는 오류로 보여주지 않고 로딩으로 취급한다.
    error: waitingForServer ? undefined : error,
    loading: key !== null && (!current || (data === undefined && (error === undefined || waitingForServer))),
    waitingForServer,
    reload: () => {
      setResult({ key: '' })
      setAttempt((n) => n + 1)
    },
  }
}
