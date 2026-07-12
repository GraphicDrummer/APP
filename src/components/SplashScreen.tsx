// 앱 첫 진입 스플래시 — 탭하면 인트로 영상(오디오 포함)이 전체화면으로 재생되고,
// 끝나면 자동으로 실제 앱 화면(children)이 드러난다. 영상 오디오는 브라우저가
// 자동재생을 막지 않도록, 탭(사용자 제스처) 직후 동기적으로 play()를 호출한다.

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

type Stage = 'splash' | 'video' | 'done'

const INTRO_SEEN_KEY = 'introSeen'

// 참여자/관리자 공유 링크(/m/..., /s/...)로 곧장 들어온 방문은 스플래시를 아예
// 생략한다 — 링크를 받은 사람은 이미 '딱'을 아는 사람이라 인트로가 방해만 된다.
// 같은 세션(탭)에서 스플래시를 이미 본 경우도 재진입 시 건너뛴다.
function shouldSkipSplash(): boolean {
  const path = window.location.pathname
  if (path.startsWith('/m/') || path.startsWith('/s/')) return true
  try {
    return sessionStorage.getItem(INTRO_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

function markIntroSeen() {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, '1')
  } catch {
    // sessionStorage 차단(시크릿 모드 등) — 이번 세션에서만 스플래시가 다시 뜨는 정도로 그친다
  }
}

export function SplashScreen({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = useState<Stage>(() => (shouldSkipSplash() ? 'done' : 'splash'))
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (stage === 'done') markIntroSeen()
  }, [stage])

  useEffect(() => {
    if (stage !== 'video') return
    const v = videoRef.current
    if (!v) return
    v.muted = false
    void v.play().catch(() => {
      // 오디오 자동재생이 막히면 음소거로라도 재생을 이어간다
      v.muted = true
      void v.play()
    })
  }, [stage])

  return (
    <>
      {children}
      <AnimatePresence>
        {stage !== 'done' && (
          <motion.div
            key="splash-overlay"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-50"
          >
            {stage === 'splash' ? (
              <button
                type="button"
                data-testid="splash-tap"
                onClick={() => setStage('video')}
                className="relative w-full h-full flex flex-col items-center overflow-hidden cursor-pointer"
                style={{ backgroundColor: '#E6EBEE' }}
              >
                <img
                  src="/intro_image.png"
                  alt=""
                  aria-hidden
                  className="absolute bottom-0 left-0 w-full object-contain object-bottom"
                />
                <img src="/logo.png" alt="딱" className="relative z-10 mt-[15%] w-[120px] object-contain" />
                <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 rounded-full bg-white/80 px-4 py-2 font-galmuri11 text-[15px] font-bold text-ink/80 shadow-pill">
                  탭해서 시작
                </p>
              </button>
            ) : (
              <div className="relative w-full h-full bg-black">
                <video
                  ref={videoRef}
                  data-testid="intro-video"
                  src="/intro.mp4"
                  playsInline
                  onEnded={() => setStage('done')}
                  className="w-full h-full object-contain"
                />
                <button
                  type="button"
                  data-testid="skip-intro"
                  onClick={() => setStage('done')}
                  className="absolute top-4 right-4 rounded-full bg-black/50 text-white font-galmuri11 text-[12px] font-bold px-3 py-1.5 cursor-pointer"
                >
                  건너뛰기
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
