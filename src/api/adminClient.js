import axios from 'axios'
import { getApiBaseUrl } from '../config/apiBase'
import { ADMIN_SESSION_KEY } from '../admin/adminSession'

export const adminClient = axios.create({
  baseURL: getApiBaseUrl(),
})

adminClient.interceptors.request.use((config) => {
  const secret = sessionStorage.getItem(ADMIN_SESSION_KEY)
  if (secret) {
    config.headers = config.headers || {}
    config.headers['X-Admin-Secret'] = secret
  }
  return config
})
