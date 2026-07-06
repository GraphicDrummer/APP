# 혼자 개발하는 법 (DEVELOPMENT GUIDE)

> 개발 지식이 없어도 이 문서 순서대로 하면 됩니다.
> 목표: 어떤 컴퓨터에서든 30분 안에 개발 가능한 상태 만들기 + 안전하게 배포하기.

---

## 1. 내 계정/서비스 지도 (북마크 추천)

| 서비스 | 역할 | 주소 |
|---|---|---|
| GitHub | 코드 원본 저장소 | https://github.com/GraphicDrummer/APP |
| Vercel | 배포 (사이트 호스팅) | https://vercel.com → ttak 프로젝트 |
| Supabase | 데이터베이스 | https://supabase.com/dashboard |
| 프로덕션 | 실제 서비스 | https://ttak-eight.vercel.app |

**황금률**: 코드의 원본은 언제나 GitHub `main` 브랜치. 로컬 컴퓨터는 사본일 뿐.
컴퓨터가 없어져도 GitHub에 다 있다.

---

## 2. 환경 세팅

### A. 로컬 (Windows) — 처음 하는 컴퓨터 기준

```powershell
# 1) Node.js 설치 (이미 있으면 생략, node --version으로 확인)
winget install OpenJS.NodeJS.LTS
# 설치 후 터미널을 새로 열어야 인식됨

# 2) 코드 받기
git clone https://github.com/GraphicDrummer/APP.git
cd APP

# 3) 의존성 설치
npm install

# 4) 환경변수 — .env 파일 만들기
copy .env.example .env
# 메모장으로 .env를 열고 두 값을 채운다:
#   Supabase 대시보드 → 프로젝트 → Settings → API 에서
#   Project URL → VITE_SUPABASE_URL
#   anon public 키 → VITE_SUPABASE_ANON_KEY

# 5) 실행
npm run dev
# → http://localhost:5173
```

### B. 클라우드 — GitHub Codespaces (로컬 설치 없이, 어디서든)

이 저장소에는 `.devcontainer/devcontainer.json`이 있어서 **원클릭**으로 됩니다:

1. https://github.com/GraphicDrummer/APP 접속
2. 초록 **Code** 버튼 → **Codespaces** 탭 → **Create codespace on main**
3. 브라우저 안에 VS Code가 열리고 `npm install`이 자동 실행됨
4. **딱 하나 수동 작업**: 터미널에서 `cp .env.example .env` 후 `.env`에 Supabase 값 채우기
   (비밀값이라 저장소에 없음 — Supabase 대시보드 → Settings → API에서 복사)
5. 터미널에 `npm run dev` → 우측 하단 "포트 5173 열림" 알림에서 브라우저로 열기

무료 한도: 개인 계정 월 120시간(코어 기준) — 취미 개발엔 충분.

### C. 클라우드 — claude.ai/code (AI와 함께 개발)

1. https://claude.ai/code 접속 → GitHub 연동 → `GraphicDrummer/APP` 선택
2. 로컬과 똑같이 Claude에게 작업을 시키고, 결과를 main에 push하게 하면
   Vercel이 자동 배포. **로컬 컴퓨터가 아예 필요 없는** 개발 경로.
3. 단, Supabase 마이그레이션 실행은 여전히 대시보드에서 직접.

---

## 3. 일상 개발 루틴 (매번 이 순서)

```
① 시작:   git pull origin main          ← 항상 최신으로 시작
② 개발:   npm run dev 켜두고 수정        ← 저장하면 브라우저 자동 반영
③ 검증:   npm run build && npm test     ← 둘 다 통과해야 다음 단계
④ 저장:   git add -A
          git commit -m "무엇을 왜 바꿨는지"
⑤ 배포:   git push origin main          ← 1~2분 뒤 자동으로 사이트 반영
⑥ 확인:   Vercel Deployments에서 Ready 확인 → 실제 URL 시크릿 창으로 열기
```

⚠️ 여러 컴퓨터를 오갈 때 ①을 빼먹으면 충돌이 납니다. 시작할 때 무조건 pull.

---

## 4. DB(Supabase) 변경 절차 — 코드와 달리 자동이 아님!

스키마(테이블/컬럼/권한)를 바꿀 때는 **3점 세트 + 수동 실행**:

1. `supabase/migrations/NNNN_설명.sql` 새 파일 작성 (번호는 기존 다음 번호)
2. `supabase/schema.sql`도 같은 내용 반영 (새 프로젝트 셋업용 최종본)
3. `src/lib/database.types.ts` 타입 갱신
4. **Supabase 대시보드 → SQL Editor에 마이그레이션 SQL을 붙여넣고 Run** ← 이게 실제 적용
5. 앱에서 동작 확인 후 커밋·push

미실행 상태로 코드만 배포하면 "column does not exist" 에러가 납니다.
지금까지 실행된 마이그레이션: 0002~0007 (전부 적용 완료 상태).

---

## 5. 배포 파이프라인 상세

```
git push origin main
   │  (GitHub → Vercel 웹훅)
   ▼
Vercel이 main 최신 커밋을 받아 빌드 (npm install → npm run build)
   │  이때 Environment Variables가 코드에 주입됨 (빌드 타임!)
   ▼
성공 시 Production 배포 교체 → ttak-eight.vercel.app
```

**꼭 기억할 것들**
- 환경변수를 바꾸면 → 자동 반영 안 됨 → Deployments에서 **Redeploy** 필요
- Redeploy는 "그 배포 당시의 커밋"을 다시 빌드함 (최신 코드 아님!) —
  최신 코드 배포는 반드시 **push로**
- 배포가 진짜 Git에서 왔는지 확인: Deployments 목록에서
  브랜치명+커밋 메시지가 보이면 정상, "Vercel Drop"/"Redeploy of..."만 보이면 비정상
- 옛날 화면이 보이면 먼저 **시크릿 창**으로 확인 (브라우저 캐시)

---

## 6. 새 Supabase 프로젝트를 처음부터 세팅해야 할 때

(프로젝트를 옮기거나 날렸을 때)

1. supabase.com에서 새 프로젝트 생성 (리전: Northeast Asia - Seoul)
2. SQL Editor에 `supabase/schema.sql` 전체 붙여넣고 Run — 마이그레이션 전부 반영된 최종본
3. Settings → API에서 URL/anon key 복사 → 로컬 `.env` + Vercel 환경변수 갱신
4. Vercel Redeploy

---

## 7. 자주 쓰는 진단 명령

```powershell
git status              # 지금 뭐가 바뀌어 있나
git log --oneline -10   # 최근 커밋 10개
git diff                # 커밋 안 된 변경 내용
npm run build           # 타입 에러 포함 전체 검증
npm test                # 엔진 테스트
```

문제가 생기면 → [DEVLOG.md](DEVLOG.md)의 "문제 → 해결 사전" 표부터 확인.

---

## 8. 절대 하지 말 것

- ❌ `.env`를 커밋하거나 채팅/스크린샷에 그대로 노출 (anon 키는 괜찮지만 습관이 위험)
- ❌ 타입 에러를 `any`나 빌드 스크립트 수정으로 덮기 — 반드시 원인 수정
- ❌ Supabase 대시보드에서 마이그레이션 파일 없이 즉흥적으로 스키마 변경 —
  코드와 DB가 어긋나기 시작하면 추적이 매우 어려움 (7단계에서 실제로 겪음)
- ❌ main 이외 상태에서 오래 작업 — 이 프로젝트는 main 단일 브랜치 흐름
