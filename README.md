# 딱. (DDACK) — 모두에게 딱 맞는 시간

> 모두의 시간을 모으지 않아요. **딱 하나를 골라드려요.**

모임 시간 조율 웹앱. 주최자가 모임을 만들고 링크를 공유하면, 참여자들이 되는 시간을 칠하고,
추천 엔진이 전원이 가능한 "완벽한 시간" 하나를 골라줍니다. 완벽한 시간이 없으면
차선책(애매한 시간 포함 / 일부 제외)과 병목 인물까지 알려줍니다.

**프로덕션**: https://ttak-eight.vercel.app

## 핵심 흐름

```
주최자: 모임 생성 (제목·날짜범위·시간범위·참여자·마감)
  → 참여자 링크(/m/코드) + 관리자 링크(/m/코드?adminKey=...) 발급
참여자: 링크 접속 → 되는 시간을 그리드에 칠하고 저장
엔진: 실시간 추천 (완벽한 슬롯 / 차선책 사다리 / 병목 분석)
관리자: 시간 확정 → 완결 화면 (구글 캘린더 추가, .ics, 이미지 저장, 링크 공유)
```

## 기술 스택

| 영역 | 선택 |
|---|---|
| 프론트엔드 | React 19 + TypeScript + Vite 8 |
| 스타일 | Tailwind CSS 4 (`@theme` 디자인 토큰, `src/index.css`) + Pretendard |
| 모션 | motion (framer-motion) — 스프링·스태거·누르는 맛 |
| 라우팅 | react-router-dom 7 (SPA) |
| 백엔드 | Supabase (Postgres + RLS + SECURITY DEFINER RPC) — 별도 서버 없음 |
| 배포 | Vercel (GitHub main 브랜치 push 시 자동 배포) |
| 테스트 | Vitest (`src/engine.test.ts`) |

## 빠른 시작 (로컬)

```bash
npm install
cp .env.example .env   # Supabase URL/anon key 채우기 (Supabase 대시보드 → Settings → API)
npm run dev            # http://localhost:5173
```

| 명령 | 역할 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입체크(tsc -b) + 프로덕션 빌드 — 커밋 전 필수 |
| `npm test` | 엔진 단위 테스트 |

## 프로젝트 구조

```
src/
  engine.ts            추천 엔진 (앱의 심장 — 순수 함수, 테스트 있음)
  engine.test.ts       엔진 테스트
  presets.ts           데모 시나리오 데이터
  index.css            디자인 토큰 (@theme — 색·라운드·그림자 전부 여기)
  lib/
    supabase.ts        Supabase 클라이언트 (.env 필요)
    db.ts              모든 DB 접근 (CRUD + 관리자 RPC)
    database.types.ts  DB 타입 (schema.sql과 1:1 수동 동기화)
    slots.ts           그리드 좌표 ↔ 실제 시각 변환, hhmm 표기
    calendar.ts        .ics 생성, 구글 캘린더 URL
    resultImage.ts     확정 결과 PNG (캔버스 직접 드로잉)
    motion.ts          공통 모션 상수 (스프링, 스태거)
  components/          공용 UI (그리드, 추천카드, 칩, 탭, 버튼 등)
  pages/
    CreateMeetingPage  정보 단계 (생성 폼 + 링크 발급 화면)
    MeetingPage        조율 + 확정 단계 (참여자/관리자 겸용)
    EngineDemo         /demo — 프리셋으로 엔진 체험
supabase/
  schema.sql           전체 스키마 최종본 (새 프로젝트 셋업용)
  migrations/          변경 이력 — 순서대로 SQL Editor에서 실행
vercel.json            SPA 라우팅 rewrite (딥링크 404 방지)
```

## 문서

- **[docs/DEVLOG.md](docs/DEVLOG.md)** — 상세 개발 일지: 무엇을 만들었고, 어떤 문제가 있었고, 어떻게 해결했는지
- **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** — 혼자 개발하는 법: 환경 세팅(로컬/클라우드), DB 변경 절차, 배포 파이프라인, 문제 대처

## 배포 파이프라인 (한 장 요약)

```
코드 수정 → npm run build && npm test 통과 확인
  → git commit → git push origin main
  → GitHub이 Vercel에 알림 → Vercel 자동 빌드·배포 (1~2분)
  → https://ttak-eight.vercel.app 반영
```

DB 스키마 변경은 자동이 아닙니다 — `supabase/migrations/`에 SQL 파일을 만들고
**Supabase 대시보드 → SQL Editor에서 직접 실행**해야 합니다. (자세한 절차는 DEVELOPMENT.md)
