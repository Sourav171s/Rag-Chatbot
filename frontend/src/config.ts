// API configuration
// In Vite, environment variables are exposed via import.meta.env
// VITE_API_URL should be set to the backend URL in production (e.g., Render)
// If not set, defaults to empty string (uses relative paths with nginx proxy)
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Construct full API URL
export const getApiUrl = (endpoint: string): string => {
  // Remove leading slash from endpoint if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  
  // If API_BASE_URL is empty, use relative path (for Docker Compose with nginx proxy)
  if (!API_BASE_URL) {
    return `/${cleanEndpoint}`
  }
  
  // Ensure the base URL has a protocol, otherwise browser treats it as relative
  let baseUrl = API_BASE_URL
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`
  }
  
  // Remove trailing slash from base URL if present
  baseUrl = baseUrl.replace(/\/$/, '')
  
  // Otherwise, use the full base URL (for Render deployment)
  return `${baseUrl}/${cleanEndpoint}`
}
