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
