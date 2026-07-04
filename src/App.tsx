import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { CreateMeetingPage } from './pages/CreateMeetingPage'
import { MeetingPage } from './pages/MeetingPage'
import { EngineDemo } from './pages/EngineDemo'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 주최자: 모임 생성 → 공유 링크 발급 */}
        <Route path="/" element={<CreateMeetingPage />} />
        {/* 참여자: 공유 링크로 진입해 가용 시간 입력 */}
        <Route path="/m/:code" element={<MeetingPage />} />
        {/* 프리셋 기반 추천 엔진 데모 */}
        <Route path="/demo" element={<EngineDemo />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
