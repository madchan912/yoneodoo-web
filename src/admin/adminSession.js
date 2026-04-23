export const ADMIN_SESSION_KEY = 'yoneodoo_admin_secret'

export function getAdminSecret() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) || ''
}

export function setAdminSecret(secret) {
  sessionStorage.setItem(ADMIN_SESSION_KEY, secret)
}

export function clearAdminSecret() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY)
}
