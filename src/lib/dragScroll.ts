// 가로 스크롤 공통 인터랙션 — 스크롤바를 숨긴 컨테이너(시간 칩, 참여자 탭,
// 시간표 그리드)에서 마우스 드래그로 부드럽게 스크롤할 수 있게 한다.
// 터치는 브라우저 네이티브 스크롤에 맡기고(pointerType 검사), 드래그로 판정된
// 제스처 끝의 click은 onClickCapture에서 삼켜 칩/칸이 잘못 눌리는 걸 막는다.
// 모든 가로 스크롤 UI가 이 훅 하나를 쓰면 앱 전체의 스크롤 감각이 통일된다.

import { useRef, type RefObject } from 'react'

export function useDragScroll(ref: RefObject<HTMLElement | null>) {
  const drag = useRef({ down: false, moved: false, startX: 0, startScroll: 0 })

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    const el = ref.current
    if (!el) return
    drag.current = { down: true, moved: false, startX: e.clientX, startScroll: el.scrollLeft }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.down) return
    const el = ref.current
    if (!el) return
    const dx = e.clientX - drag.current.startX
    if (Math.abs(dx) > 4) drag.current.moved = true
    el.scrollLeft = drag.current.startScroll - dx
  }

  const endDrag = () => {
    if (!drag.current.down) return
    drag.current.down = false
    // 드래그 직후의 click이 캡처 단계에서 걸러진 다음에 플래그를 리셋한다
    window.setTimeout(() => {
      drag.current.moved = false
    }, 0)
  }

  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerLeave: endDrag,
    onClickCapture,
  }
}

/** 가로 스크롤 컨테이너 공통 클래스 — 스크롤바 숨김 + 드래그 커서 */
export const dragScrollCls =
  'overflow-x-auto overflow-y-hidden touch-pan-x cursor-grab active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
