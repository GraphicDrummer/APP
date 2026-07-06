# 딱. 개발 일지 (DEVLOG)

> 2026-07-03 ~ 2026-07-06, 개발 지식이 없는 상태에서 Claude Code와 함께
> 아이디어 → 프로덕션 배포까지 간 전 과정의 기록.
> 각 단계의 커밋 해시를 적어뒀으니 `git show 해시`로 언제든 그 시점 코드를 볼 수 있다.

---

## 타임라인

### 0단계 — 프로젝트 탄생 이전
- 원형은 `ttak_engine_demo.html` 단일 HTML 데모와 마스터 문서(PRD)였음.
- 핵심 아이디어: "모두의 시간을 모아 보여주는" 기존 서비스(When2meet류)와 달리,
  **딱 하나의 답을 골라주는** 추천 엔진이 중심.

### 1단계 — 프로젝트 셋업 + 엔진 이식 (`5c60987`, `a95eac9`)
- React 19 + Vite 8 + TypeScript + Tailwind 4 프로젝트 생성.
- HTML 데모의 `recommend()` 로직을 `src/engine.ts`로 이식하고 Vitest 테스트 7개 작성.
- 엔진 개념: 요일×시간 그리드에서 각 참여자의 상태를 평가해
  **완벽한 슬롯**(전원 가능·애매 0) → 없으면 **완화 사다리**(①애매 허용 ②선택 인원 제외)
  → **병목 인물**(이 사람만 풀리면 가능한 시간이 N개 늘어남) 순으로 계산.

### 2단계 — Supabase 저장 계층 (`b3bcd77`)
- 테이블 3개: `meetings` / `participants` / `availability`.
- Supabase 무료 프로젝트 + anon 키를 `.env`로 분리 (`.gitignore` 처리).
- `src/lib/db.ts`에 타입 안전 CRUD. 서버 코드 없이 브라우저 → Supabase 직접 통신.
- **배운 것**: supabase-js의 `Database` 제네릭은 `interface`가 아니라 `type` 별칭이어야
  동작한다 (암시적 인덱스 시그니처 문제). 이걸 몰라서 처음에 모든 쿼리가 `never` 타입이 됐었음.

### 3단계 — 모임 생성 → 링크 공유 흐름 (`f64be40`)
- react-router-dom 도입. `/`(생성), `/m/:code`(참여), `/demo`(엔진 데모).
- 추측 불가능한 base58 8자 `share_code` (crypto.getRandomValues) — 마이그레이션 0002.
- 그리드 좌표(요일,시각) ↔ 실제 timestamptz 변환은 `slots.ts`
  ("날짜범위 시작일이 속한 주의 월요일" 기준 — 의도적 단순화, 코드에 명시).

### 4단계 — 도메인 일반화 (`15293a5`, `473c0e1`, `8c9e89d`, `3b1a3d4`)
- "점심 시간 제외" 같은 **하드코딩된 의미 제거** — 12시도 평범한 후보로.
  회의뿐 아니라 일반 모임에도 쓰기 위해. 엔진이 시간 목록을 파라미터로 받게 변경.
- 주최자가 설문 **시간 범위**(hour_start/hour_end) 지정 — 마이그레이션 0003.
- **확정 기능**: `confirmed_slot` 컬럼(0004) + 완결 화면
  (구글 캘린더 URL, .ics 다운로드, 캔버스 PNG 저장, 링크 복사).
- **시간 표기 통일**: 앱 전체 `hhmm()` — "09:00" 콜론 24시간제.
- **문제/해결**: `<input type="datetime-local" step={900}>`은 크롬 피커의 분 목록을
  제한하지 못함(스냅만 되고 UX가 깨짐) → 네이티브 피커를 버리고
  날짜 input + 시간 select → 최종적으로 가로 스크롤 칩(ChipRow)으로 진화.

### 5단계 — 디자인 전면 적용 (Figma 연동)
- **토대** (`2332250`): Figma MCP 커넥터로 디자인 파일에서 정확한 값 추출
  (색상은 스크린샷 픽셀 샘플링까지 동원). Tailwind 4 `@theme`으로 토큰 중앙화:
  배경 #f5f6f8 · 잉크 #1a2028 · 파랑 #3182f6 · 초록 #27b25b · 노랑 #ffd230 · 빨강 #e5484d.
  Pretendard 폰트, 3단계 탭(정보/조율/확정), 공용 컴포넌트, DDACK 푸터.
- **모션** (`25f8b47`): motion(framer-motion) 도입. 토스 스타일 규칙 —
  스프링(stiffness 450/damping 32), 누를 때 scale 0.97, 리스트 40ms 스태거,
  헤드라인→본문 순차 진입, 요일 일괄 변경 시 위→아래 20ms 캐스케이드,
  하단 고정(sticky) CTA. `prefers-reduced-motion` 자동 대응.
- **화면별 적용** (`c7dfe2b` 정보 → `491c605` 조율 → `fd7db14` 확정):
  Figma 프레임별 design context를 추출해 픽셀 수준으로 맞춤.
  조율 화면이 앱의 심장 — 고정 크기 무텍스트 칸, 상태별 색상, 열 상태를 입는 요일 헤더,
  파랑(추천)/초록(확정)/NO PERFECT TIME(차선책+병목) 3상태 추천 카드.

### 6단계 — 폼 다듬기 (`dcca310`, `6862f75`)
- 4개 섹션 재구성: 모임 정보 / 후보 시간 찾기 / 참여자 / 응답 받기(선택, 기본 접힘).
- 마감 시각을 시간 범위와 같은 가로 칩 UI로 통일. 정시만 선택.

### 7단계 — 관리자 링크 + 보안 (`b425466`) ★ 가장 중요한 사건
- **요구**: 로그인 없이 주최자만 수정/확정할 수 있게.
- **구현**: 생성 시 `admin_key`(UUID) 발급 → 관리자 링크 `/m/코드?adminKey=...`.
- **사고 발견**: RLS가 `using (true)` 전면 허용이라 **anon 키만 있으면 누구나
  모든 모임의 admin_key를 통째로 조회 가능**했음 (curl로 실제 유출 확인).
  프론트엔드에 박힌 anon 키는 원래 공개값이므로 이건 실질적 보안 구멍.
- **해결** (마이그레이션 0006):
  1. anon의 meetings SELECT 권한 회수 → admin_key 제외 컬럼만 재허용 (컬럼 단위 grant)
  2. anon의 직접 UPDATE 완전 회수
  3. `SECURITY DEFINER` 함수 3개 (verify_admin_key / admin_update_meeting_info /
     admin_set_confirmed_slot) — share_code+admin_key가 둘 다 맞아야만 동작
  4. 프론트의 isAdmin 판정도 문자열 비교가 아니라 **서버 검증 결과** 기반으로 변경
- **검증**: 수정 후 curl로 직접 select/update 시도 → 42501 permission denied 확인.
- **함께 있었던 일**: 세션이 도중에 끊겨 절반만 적용된 상태(any 캐스팅 다수,
  build 스크립트에서 타입체크 제거, admin_code/admin_key 이름 불일치)를
  진단 → 전부 원인 수정으로 복구. "에러를 숨기지 말고 고친다" 원칙 확립.
- **SQL 삽질**: `uuid = text` 연산자 없음 에러 → `admin_key::text = p_admin_key` 캐스팅.

### 8단계 — 입력 모델 반전 (`1151f56`) ★ 제품 철학 변경
- 기본값을 "가능"에서 **"불가"로 뒤집음** — 참여자가 되는 시간을 **칠하는** 모델.
  순환: 불가(빈 회색, 기본) → 가능(파랑) → 애매(노랑) → 불가.
- 엔진 `CellState`: `'soft'|'blocked'` → `'available'|'soft'`.
  판정 로직만 뒤집고 recommend/사다리/병목은 무변경 (집계값 의미 보존).
- 프리셋을 "전원 가능으로 채운 뒤 안 되는 시간을 지우는" 방식으로 재작성 →
  기존 테스트 7개가 **수정 없이 그대로 통과** (동일 시나리오 보존 증명).
- DB: `state check ('available','soft')` — 마이그레이션 0007 (기존 데이터 폐기).
- 칩 스크롤 버그 동시 수정: 선택 칩 자동 스크롤 useEffect가 클릭마다 재발동해
  위치가 튀던 것 → 최초 렌더 1회만 + 마우스 드래그 스크롤 추가.
- 놀리는 톤 문구: "🐭 고민 중", "모두가 OO님만 기다리고 있어요!"

### 9단계 — 마감 다듬기 (`0fd4d90`, `d372d9c`, `b75952b`)
- /demo에 요일/시간 헤더 콜백이 연결 안 돼 있던 것 수정 (prop 누락).
- 범례를 그리드 컴포넌트 안으로 이동(어디서든 자동 표시), 시간 헤더도 버튼 스타일.
- 흐린 텍스트 농도 정리.
- **vercel.json** 추가 — SPA 딥링크(/m/코드) 404 방지 rewrite.

### 10단계 — 배포 트러블슈팅 ★ 배포의 모든 함정을 한 번에 경험
증상: 배포는 "Ready"인데 옛날 코드가 서빙됨. 원인이 4겹이었다:

1. **환경변수 없음** — Vercel에 VITE_SUPABASE_URL/KEY 미설정 → 추가.
   (함정: Key 칸에 URL 값을 넣으면 안 됨. Key=변수이름, Value=값.
   추가 후엔 반드시 재배포해야 반영 — Vite는 빌드 시점에 값을 박아넣음)
2. **GitHub 기본 브랜치가 엉뚱한 브랜치** — 초기 셋업 때 생긴
   `claude/recommendation-engine-setup-gknema`가 default로 남아있었음 → main으로 변경.
3. **★ 진짜 원인: 최초 배포가 Git이 아니라 Vercel Drop(수동 폴더 업로드)** —
   이후 누른 모든 Redeploy가 16시간 전 업로드 스냅샷만 재탕하고 있었음.
   구분법: 배포 목록에서 "Vercel Drop"/"Redeploy of..."는 커밋 없음(=Git 아님),
   정상 Git 배포는 브랜치명+커밋 메시지가 표시됨.
4. **git 명령을 엉뚱한 폴더에서 실행** — `C:\Users\KWONDO`에서 실행해
   `fatal: not a git repository`. 저장소 폴더(`D:\!CLAUDE\APP`)에서 해야 함.

해결: 기본 브랜치 변경 + Git 재연결 + 저장소 폴더에서 빈 커밋 push
(`git commit --allow-empty`) → 첫 진짜 Git 배포 성공. 이후로는 push만 하면 자동 배포.

---

## 문제 → 해결 사전 (다시 만나면 여기부터)

| 증상 | 원인 | 해결 |
|---|---|---|
| `node`/`npm` 명령 없음 | Node.js 미설치 또는 새 환경 | `winget install OpenJS.NodeJS.LTS`, 새 터미널 열기 |
| Supabase 쿼리 타입이 전부 `never` | Database 타입을 interface로 정의 | `type` 별칭으로 (database.types.ts 주석 참고) |
| "column ... does not exist" | 마이그레이션 미실행 | supabase/migrations/ 순서대로 SQL Editor에서 실행 |
| `operator does not exist: uuid = text` | 타입 불일치 비교 | `컬럼::text = 값` 캐스팅 |
| datetime 피커에 이상한 분 표시 | 크롬이 step 무시 | 네이티브 피커 대신 select/칩 UI |
| 칩 클릭 시 스크롤 튐 | 자동 스크롤 effect가 매번 재발동 | 마운트 1회만 실행 |
| 빌드는 되는데 타입 에러 방치됨 | build 스크립트에서 tsc 제거됨 | `"build": "tsc -b && vite build"` 유지, any로 덮지 말 것 |
| 배포했는데 옛날 코드 | Vercel Drop 재탕 / 캐시 | 배포 Source 탭에서 커밋 확인, 시크릿 창 테스트 |
| /m/코드 직접 열면 404 | SPA rewrite 없음 | vercel.json rewrites |
| 환경변수 바꿨는데 반영 안 됨 | Vite는 빌드 타임 주입 | Vercel에서 Redeploy |
| `fatal: not a git repository` | 저장소 밖에서 git 실행 | `cd D:\!CLAUDE\APP` 후 실행 |
| git 커밋 메시지에 따옴표로 깨짐(PowerShell) | 인자 파싱 | 메시지를 파일로 저장 후 `git commit -F 파일` |

---

## 보안 메모 (현재 상태와 알려진 한계)

**지켜지고 있는 것**
- `admin_key`는 anon이 SELECT 불가 (DB 권한 레벨 차단). 검증/수정은 SECURITY DEFINER RPC로만.
- meetings 직접 UPDATE 불가. `.env`는 gitignore.

**알려진 잔여 리스크 (의도적으로 미룸 — 나중에 할 일)**
- meetings DELETE가 anon에 열려 있음 (앱 UI에는 없지만 API로는 가능)
- participants/availability는 여전히 전면 허용 — 링크만 알면 남의 응답 수정 가능
- share_code를 알면 누구나 조회 가능 (링크 기반 서비스의 태생적 특성)
- 과거 Vercel Drop 배포에 .env가 포함됨 → anon 키라 실해 없음, Drop 배포 삭제 권장

---

## 이 프로젝트에서 확립한 원칙

1. **에러를 숨기지 않는다** — any 캐스팅, 빌드 스크립트에서 타입체크 제거 같은
   우회는 반드시 나중에 더 크게 돌아온다. 원인을 고친다.
2. **커밋 전 `npm run build && npm test`** — 둘 다 통과해야 push.
3. **DB 변경은 3점 세트** — migrations/NNNN.sql 파일 + schema.sql 갱신 +
   database.types.ts 갱신. 그리고 SQL Editor에서 직접 실행.
4. **검증은 실물로** — 보안은 curl로 직접 뚫어보고, UI는 브라우저에서 직접 클릭해서.
5. **커밋 메시지에 "왜"를 남긴다** — 이 일지가 가능한 이유.
