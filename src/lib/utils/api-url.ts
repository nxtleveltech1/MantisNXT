const DEFAULT_APP_URL = 'http://localhost:3000'

const normalizeBaseUrl = (url: string) => url.replace(/\/$/, '')

export const getAppBaseUrl = () => {
  const base = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL
  return normalizeBaseUrl(base)
}

export const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (typeof window !== 'undefined') {
    return normalizedPath
  }

  return `${getAppBaseUrl()}${normalizedPath}`
}


