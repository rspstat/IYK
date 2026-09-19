import { request } from './client'

// 응답 타입은 docs/md/api-spec.md 기준. 명세를 바꾸면 여기도 함께 바꾼다.

export interface RegisterResponse {
  id: number
  email: string
  nickname: string
}

export interface LoginResponse {
  accessToken: string
  user: { id: number; nickname: string }
}

export interface LikeResult {
  spotId: string
  liked: boolean
  likeCount: number
}

export interface MyLike {
  spotId: string
  createdAt: string
}

export interface Comment {
  id: number
  authorId: number
  author: string
  content: string
  createdAt: string
}

// 서버는 시간대 없는 LocalDateTime을 마이크로초(6자리)까지 내려준다. 브라우저별 파싱 차이를 피하려고 ms(3자리)까지만 쓴다.
export function parseServerDate(value: string): number {
  return Date.parse(value.replace(/(\.\d{3})\d+/, '$1'))
}

const spotPath = (spotId: string) => `/spots/${encodeURIComponent(spotId)}`

export const authApi = {
  register: (email: string, password: string, nickname: string) =>
    request<RegisterResponse>('/auth/register', { method: 'POST', body: { email, password, nickname } }),
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', { method: 'POST', body: { email, password } }),
  // 로그인 방식별 사용 가능 여부. kakao 가 false 면 서버에 카카오 로그인 키가 없다는 뜻이라 버튼을 숨긴다.
  providers: () => request<{ kakao: boolean }>('/auth/providers'),
  // 카카오 로그인 창 주소. client_id(REST API 키)를 프론트에 두지 않으려고 서버가 만들어 준다.
  kakaoLoginUrl: (redirectUri: string, state: string) =>
    request<{ url: string }>(`/auth/kakao/login-url?redirectUri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`),
  // 카카오가 돌려준 인가 코드를 서버로 보내 우리 서비스의 로그인 토큰으로 바꾼다.
  kakaoLogin: (code: string, redirectUri: string) =>
    request<LoginResponse>('/auth/kakao', { method: 'POST', body: { code, redirectUri } }),
}

export const userApi = {
  // 닉네임 변경. 서버가 앞뒤 공백을 지운 값을 돌려준다.
  changeNickname: (nickname: string) =>
    request<LoginResponse['user']>('/me/nickname', { method: 'PUT', body: { nickname }, auth: true }),
}

export const likeApi = {
  toggle: (spotId: string) => request<LikeResult>(`${spotPath(spotId)}/like`, { method: 'POST', auth: true }),
  mine: () => request<{ likes: MyLike[] }>('/me/likes', { auth: true }),
}

export const commentApi = {
  list: (spotId: string) => request<{ comments: Comment[] }>(`${spotPath(spotId)}/comments`),
  create: (spotId: string, content: string) =>
    request<Comment>(`${spotPath(spotId)}/comments`, { method: 'POST', body: { content }, auth: true }),
  remove: (commentId: number) => request<void>(`/comments/${commentId}`, { method: 'DELETE', auth: true }),
}
