import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import MainPage from './pages/MainPage'
import ResultPage from './pages/ResultPage'
import SpotDetailPage from './pages/SpotDetailPage'
import RoutePage from './pages/RoutePage'
import SearchPage from './pages/SearchPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import FavoritesPage from './pages/FavoritesPage'
import MyPage from './pages/MyPage'
import KakaoCallbackPage from './pages/KakaoCallbackPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<MainPage />} />
          <Route path="/result/:mbti" element={<ResultPage />} />
          <Route path="/spot/:spotId" element={<SpotDetailPage />} />
          <Route path="/route" element={<RoutePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/auth/kakao/callback" element={<KakaoCallbackPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/mypage" element={<MyPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
