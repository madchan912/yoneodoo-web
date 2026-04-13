# 🌐 YoNeoDoo - Frontend (Web)

요너두 서비스의 사용자 대면 UI/UX 및 전반적인 클라이언트 상태 관리를 담당하는 프론트엔드 애플리케이션입니다. 

## 🛠 Tech Stack
- **Library/Framework**: React.js
- **Styling**: CSS / Styled-components (사용하신 환경에 맞춰 수정해주세요)
- **Deployment**: Vercel (GitHub `main` 브랜치 푸시 시 자동 배포)

## 🚀 How to Run (Local)
1. 패키지 의존성을 설치합니다.
   ```bash
   npm install
   ```
2. 루트 디렉토리에 `.env` 파일을 생성하고 로컬 백엔드 주소를 매핑합니다.
3. 로컬 개발 서버를 실행합니다.
   ```bash
   npm start
   ```

## 🔐 Environment Variables (.env)
프론트엔드가 백엔드(API)와 정상적으로 통신하기 위해 다음 환경변수가 필요합니다.
- `REACT_APP_API_BASE_URL`
  - 로컬 구동 시: `http://localhost:8080`
  - 운영 배포 시(Vercel 환경변수): `https://[Render_App_URL]`
