/**
 * Client Configuration Module
 * 
 * This module loads the API endpoint from a config file.
 * The config file is generated/updated by the server and served to clients.
 */

let API_ENDPOINT = 'http://localhost:3000'
let CONFIG_LOADED = false

/**
 * Load API endpoint from server config endpoint or use default
 */
async function loadApiConfig() {
  if (CONFIG_LOADED) return API_ENDPOINT

  try {
    // Attempt to fetch the dynamic config from the server
    // This endpoint will be served from the root or a config directory
    const response = await fetch('/api/config', { timeout: 2000 })
    if (response.ok) {
      const config = await response.json()
      if (config.publicUrl) {
        API_ENDPOINT = config.publicUrl
        CONFIG_LOADED = true
        console.log(`[Config] API endpoint: ${API_ENDPOINT}`)
        return API_ENDPOINT
      }
    }
  } catch (err) {
    console.warn('[Config] Could not load dynamic config, using default:', err.message)
  }

  CONFIG_LOADED = true
  return API_ENDPOINT
}

/**
 * Get the current API endpoint (loads config if needed)
 */
async function getApiEndpoint() {
  if (!CONFIG_LOADED) await loadApiConfig()
  return API_ENDPOINT
}

/**
 * Update the API endpoint (useful for debugging/testing)
 */
function setApiEndpoint(url) {
  API_ENDPOINT = url
  CONFIG_LOADED = true
}

/**
 * Helper function to fetch from the API
 * Automatically uses the configured endpoint
 */
async function apiFetch(path, options = {}) {
  const endpoint = await getApiEndpoint()
  const url = endpoint + path
  return fetch(url, options)
}

/**
 * Helper function to build full API URL
 * Automatically uses the configured endpoint
 */
async function getApiUrl(path) {
  const endpoint = await getApiEndpoint()
  return endpoint + path
}

// Preload config on page load to avoid race conditions
window.addEventListener('DOMContentLoaded', () => {
  loadApiConfig().catch(err => console.warn('Failed to preload config:', err))
})


