import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { CreateMeetingPage } from './pages/CreateMeetingPage'
import { MeetingPage } from './pages/MeetingPage'
import { EngineDemo } from './pages/EngineDemo'
import { SplashScreen } from './components/SplashScreen'

function App() {
  return (
    // reducedMotion="user": prefers-reduced-motion 사용자는 transform 모션이 자동으로 최소화된다
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <SplashScreen>
          <Routes>
            {/* 주최자: 모임 생성 → 공유 링크 발급 */}
            <Route path="/" element={<CreateMeetingPage />} />
            {/* 참여자: 공유 링크로 진입해 가용 시간 입력.
                같은 경로에 ?adminKey=... 쿼리가 있고 검증에 성공하면 관리자 모드로 전환된다
                (로그인 없음 — MeetingPage 내부에서 verifyAdminKey로 서버 검증) */}
            <Route path="/m/:code" element={<MeetingPage />} />
            {/* 프리셋 기반 추천 엔진 데모 */}
            <Route path="/demo" element={<EngineDemo />} />
          </Routes>
        </SplashScreen>
      </BrowserRouter>
    </MotionConfig>
  )
}

export default App
