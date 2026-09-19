// 앱 시작 시 main.tsx가 한 번 import한다(부수효과 전용 모듈).
// - API 클라이언트에 로그인 토큰 조회와 401 처리를 연결한다.
// - 로그인 상태가 바뀌면 찜 목록을 서버 기준으로 맞춘다.
import { configureApi } from '../api/client'
import { likeApi } from '../api/endpoints'
import { useAuthStore } from './useAuthStore'
import { useTravelStore } from './useTravelStore'

configureApi({
  getToken: () => useAuthStore.getState().token,
  // 만료·위조된 토큰: 로그아웃시키면 이후 동작은 requireAuth가 로그인 화면으로 보낸다.
  onUnauthorized: () => useAuthStore.getState().logout(),
})

async function syncLikes() {
  const tokenAtStart = useAuthStore.getState().token
  try {
    const { likes } = await likeApi.mine()
    // 응답을 기다리는 사이에 로그아웃/계정 전환이 있었다면 결과를 버린다.
    if (useAuthStore.getState().token === tokenAtStart) useTravelStore.getState().setLikes(likes)
  } catch {
    // 네트워크 오류면 기존 캐시를 유지하고, 401이면 클라이언트가 이미 로그아웃 처리했다.
  }
}

useAuthStore.subscribe((state, previous) => {
  if (state.token === previous.token) return
  if (state.token) void syncLikes()
  else useTravelStore.getState().resetLikes()
})

// 새로고침한 경우: 로그인 상태면 서버 기준으로 다시 맞추고, 로그아웃 상태면 남아있는 찜 캐시를 비운다.
if (useAuthStore.getState().token) void syncLikes()
else useTravelStore.getState().resetLikes()
