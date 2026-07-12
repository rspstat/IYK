import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import MainPage from './pages/MainPage'
import ResultPage from './pages/ResultPage'
import SpotDetailPage from './pages/SpotDetailPage'
import RoutePage from './pages/RoutePage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<MainPage />} />
          <Route path="/result/:mbti" element={<ResultPage />} />
          <Route path="/spot/:spotId" element={<SpotDetailPage />} />
          <Route path="/route" element={<RoutePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
