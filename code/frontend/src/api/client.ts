// 백엔드 REST 호출용 얇은 fetch 래퍼. 요청/응답 계약은 docs/md/api-spec.md 참고.
//
// 스토어를 직접 import하지 않는다(useAuthStore → api → useAuthStore 순환 방지).
// 토큰 조회와 401 처리는 앱 시작 시 store/authSync.ts에서 configureApi()로 주입한다.

// 개발 서버(vite)는 /api 를 localhost:8080 으로 프록시한다(vite.config.ts).
// 백엔드를 다른 주소에 배포하면 VITE_API_BASE_URL(예: https://api.example.com/api)로 덮어쓴다.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

interface ApiConfig {
  getToken: () => string | null
  // 토큰을 실어 보낸 요청이 401을 받았을 때(만료·위조) 호출된다. 보통 로그아웃 처리.
  onUnauthorized: () => void
}

let config: ApiConfig = { getToken: () => null, onUnauthorized: () => {} }

export function configureApi(next: ApiConfig) {
  config = next
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  // true면 로그인 토큰을 Authorization 헤더에 싣는다.
  auth?: boolean
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false } = options
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = auth ? config.getToken() : null
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', '서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요.')
  }

  if (response.ok) {
    return (response.status === 204 ? undefined : await response.json()) as T
  }

  // 서버 에러 포맷: { "error": { "code": "...", "message": "..." } }
  let code = 'UNKNOWN_ERROR'
  let message = '요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.'
  try {
    const parsed = await response.json()
    if (parsed?.error) {
      code = parsed.error.code ?? code
      message = parsed.error.message ?? message
    }
  } catch {
    // 본문이 없거나 JSON이 아닌 응답(프록시 오류 등)은 기본 문구를 쓴다.
  }
  if (response.status === 401 && token) config.onUnauthorized()
  throw new ApiError(response.status, code, message)
}

export function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : '알 수 없는 오류가 발생했어요.'
}
