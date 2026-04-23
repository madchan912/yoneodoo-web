/**
 * Spring Boot API 오리진 (스킴 + 호스트 + 포트). 끝에 슬래시 없음.
 * 예: http://localhost:8080
 */
export function getApiBaseUrl() {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (typeof raw === 'string' && raw.trim() !== '') {
    return raw.trim().replace(/\/+$/, '')
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:8080'
  }
  throw new Error(
    'VITE_API_BASE_URL이 설정되지 않았습니다. .env.local에 예: VITE_API_BASE_URL=http://localhost:8080 를 넣거나, Vercel 등 배포 환경변수에 설정하세요.'
  )
}
