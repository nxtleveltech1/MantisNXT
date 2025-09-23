import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use

  // Launch browser for setup
  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    // Wait for server to be ready
    await page.goto(baseURL || 'http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Perform any necessary authentication or data seeding
    console.log('✅ Application is ready for testing')

  } catch (error) {
    console.error('❌ Failed to setup test environment:', error)
    throw error
  } finally {
    await browser.close()
  }
}

export default globalSetup