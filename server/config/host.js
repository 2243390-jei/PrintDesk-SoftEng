/**
 * Host Configuration Module
 * 
 * This module handles prompting for and storing the server host/port configuration.
 * Allows the server to be accessed from other devices on the network.
 */

const readline = require('readline')
const fs = require('fs')
const path = require('path')
const os = require('os')

const CONFIG_FILE = path.join(__dirname, 'server-config.json')

// Default configuration
const DEFAULT_CONFIG = {
  host: '0.0.0.0',
  port: 3000,
  publicUrl: 'http://localhost:3000'
}

/**
 * Get the machine's local IP address
 */
function getLocalIp() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return 'localhost'
}

/**
 * Load existing configuration or return defaults
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8')
      return JSON.parse(data)
    }
  } catch (err) {
    console.warn('Could not load existing config, using defaults:', err.message)
  }
  return DEFAULT_CONFIG
}

/**
 * Save configuration to file
 */
function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8')
  } catch (err) {
    console.warn('Could not save config:', err.message)
  }
}

/**
 * Prompt user for host/port configuration
 */
async function promptForConfig() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    console.log('\n========== PrintDesk Server Configuration ==========')
    console.log('Configure the server endpoint for network access.\n')

    const question = (query) => new Promise((res) => rl.question(query, res))

    ;(async () => {
      const currentConfig = loadConfig()
      const localIp = getLocalIp()
      
      console.log(`Your machine IP on network: ${localIp}`)
      console.log(`Current public URL: ${currentConfig.publicUrl}\n`)

      // Ask for public URL (the address other devices will use)
      const urlInput = await question(`Enter public URL for other devices (e.g., http://${localIp}:3000) [press Enter for default]: `)
      let publicUrl = urlInput.trim() || currentConfig.publicUrl
      
      // Ensure publicUrl has http:// protocol
      if (!publicUrl.startsWith('http://') && !publicUrl.startsWith('https://')) {
        publicUrl = 'http://' + publicUrl
      }
      
      // Parse host and port from publicUrl
      let host = '0.0.0.0' // Always listen on all interfaces
      let port = 3000
      
      try {
        const url = new URL(publicUrl)
        port = parseInt(url.port) || 3000
      } catch (e) {
        console.warn('Could not parse URL, using defaults')
      }

      const config = { host, port, publicUrl }

      console.log(`\n✅ Configuration set:`)
      console.log(`  Server listening on: ${host}:${port}`)
      console.log(`  Public URL for clients: ${publicUrl}`)
      console.log(`  Other devices access: ${publicUrl}`)
      console.log('====================================================\n')

      saveConfig(config)
      rl.close()
      resolve(config)
    })()
  })
}

module.exports = { loadConfig, saveConfig, promptForConfig, CONFIG_FILE, getLocalIp }

