import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 개발 중에는 /api 를 로컬 백엔드(Spring Boot, 8080)로 넘긴다. 같은 출처로 호출되므로 CORS 설정이 필요 없다.
    // `vite preview`도 server.proxy를 그대로 물려받는다.
    proxy: { '/api': 'http://localhost:8080' },
  },
})
