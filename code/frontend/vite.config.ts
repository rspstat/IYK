import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 개발 중에는 /api 를 로컬 백엔드(Spring Boot, 8080)로 넘긴다. 같은 출처로 호출되므로 CORS 설정이 필요 없다.
    // `vite preview`도 server.proxy를 그대로 물려받는다.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        // 브라우저가 붙이는 Origin 헤더를 지운다. 백엔드 CORS 는 http://localhost:5173 만 허용하지만, 프록시를 거치는 요청은
        // 사실상 같은 출처라 CORS 검사가 필요 없다. 이렇게 하면 127.0.0.1 이나 다른 포트로 열어도 로그인·찜이 동작한다.
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'))
        },
      },
    },
  },
})
