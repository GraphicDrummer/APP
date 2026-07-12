// 확정 결과를 PNG로 저장 — 외부 라이브러리 없이 캔버스에 직접 그린다.

export interface ResultImageInput {
  title: string
  organizer: string
  /** 예: "2026-07-06 (월) 14:00" */
  timeText: string
}

export function downloadResultPng({ title, organizer, timeText }: ResultImageInput): void {
  const W = 800
  const H = 420
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 배경 + 카드 테두리 — 픽셀 팔레트(진한 잉크 테두리 + 포인트 파랑)
  ctx.fillStyle = '#e9e9e9'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#303030'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.roundRect(24, 24, W - 48, H - 48, 24)
  ctx.fill()
  ctx.stroke()

  const font = (size: number, weight = 700) =>
    `${weight} ${size}px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`
  ctx.textAlign = 'center'

  // 체크 배지
  ctx.fillStyle = '#1a82ff'
  ctx.beginPath()
  ctx.arc(W / 2, 110, 34, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.moveTo(W / 2 - 15, 110)
  ctx.lineTo(W / 2 - 4, 122)
  ctx.lineTo(W / 2 + 17, 97)
  ctx.stroke()

  ctx.fillStyle = '#6f6f6f'
  ctx.font = font(20, 600)
  ctx.fillText(`${organizer} 님의 모임`, W / 2, 180)

  ctx.fillStyle = '#303030'
  ctx.font = font(34, 800)
  ctx.fillText(title, W / 2, 222)

  ctx.fillStyle = '#1a82ff'
  ctx.font = font(46, 800)
  ctx.fillText(timeText, W / 2, 290)

  ctx.fillStyle = '#8a8a8a'
  ctx.font = font(17, 600)
  ctx.fillText('딱 — 모두의 시간을 모으지 않아요. 딱 하나를 골라드려요.', W / 2, 348)

  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title}-확정.png`
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}
