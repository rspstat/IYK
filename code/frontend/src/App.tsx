import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import MainPage from './pages/MainPage'
import ResultPage from './pages/ResultPage'
import SpotDetailPage from './pages/SpotDetailPage'
import RoutePage from './pages/RoutePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import FavoritesPage from './pages/FavoritesPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<MainPage />} />
          <Route path="/result/:mbti" element={<ResultPage />} />
          <Route path="/spot/:spotId" element={<SpotDetailPage />} />
          <Route path="/route" element={<RoutePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
