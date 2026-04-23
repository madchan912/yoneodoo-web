# 🌐 YoNeoDoo - Frontend (Web)

요너두 서비스의 사용자 대면 UI/UX 및 전반적인 클라이언트 상태 관리를 담당하는 프론트엔드 애플리케이션입니다.

## 🛠 Tech Stack
- **Library/Framework**: React.js (Vite), `react-router-dom` (라우팅)
- **Styling**: 인라인 스타일 (`App.jsx` 등)
- **Deployment**: Vercel (GitHub `main` 브랜치 푸시 시 자동 배포)

## 관리자 (MVP Admin)

- 경로: **`/admin`** — API의 `ADMIN_SECRET`과 동일한 값을 입력하면 `sessionStorage`에 보관되며, 이후 어드민 API 호출 시 **`X-Admin-Secret`** 헤더로 전송됩니다.
- 로컬 API 기본 시크릿은 `yoneodoo-api`의 `application-local.yaml` (`yoneodoo.admin.secret`)과 맞춰야 로그인에 성공합니다.

## 🚀 How to Run (Local)
1. 패키지 의존성을 설치합니다.
   ```bash
   npm install
   ```
2. `.env.example`을 복사해 `.env`(또는 `.env.local`)를 만들고 API 주소를 넣습니다. **`.env`는 Git에 포함되지 않습니다** (`.gitignore` 처리). 저장소에는 `.env.example`만 올립니다.
3. 로컬 개발 서버를 실행합니다.
   ```bash
   npm run dev
   ```
4. 프로덕션 빌드
   ```bash
   npm run build
   ```

## 🔐 Environment Variables (.env)
백엔드(API) 오리진만 넣습니다. **끝에 슬래시 없이** 적습니다.

- **`VITE_API_BASE_URL`**
  - 로컬: `http://localhost:8080`
  - 운영(Vercel 환경변수): `https://yoneodoo-api.onrender.com` 등 실제 API 호스트

프로덕션 빌드(`npm run build`) 시 `VITE_API_BASE_URL`이 비어 있으면 런타임에 오류가 납니다. Vercel 대시보드에서 반드시 설정하세요.

로컬에서 변수를 아직 안 넣었으면 개발 모드(`npm run dev`)에서는 `http://localhost:8080`으로 동작합니다.
