import { test, expect } from '@playwright/test'

test.describe('Profile Photo Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Login with existing user
    await page.goto('http://localhost:5173/auth/login')
    await page.waitForTimeout(2000)
    
    await page.getByPlaceholder('Enter your email').fill('playwright3@test.com')
    await page.getByPlaceholder('Enter your password').fill('testpass123')
    await page.getByRole('button', { name: 'Sign In' }).click()
    
    // Wait for redirect to dashboard
    await page.waitForURL('http://localhost:5173/dashboard', { timeout: 10000 })
    await page.waitForTimeout(1000)
  })

  test('avatar click opens crop modal', async ({ page }) => {
    // Navigate to profile page
    await page.goto('http://localhost:5173/profile')
    await page.waitForTimeout(2000)
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'tests/e2e/screenshots/profile-before.png' })
    
    // Check if we're on the profile page
    const url = page.url()
    console.log(`Current URL: ${url}`)
    
    // Find the avatar (the circular element with the initial)
    const avatar = page.locator('div.relative.group').first()
    const avatarCount = await avatar.count()
    console.log(`Avatar elements found: ${avatarCount}`)
    
    if (avatarCount === 0) {
      await page.screenshot({ path: 'tests/e2e/screenshots/profile-no-avatar.png' })
      throw new Error('No avatar element found on profile page')
    }
    
    // Click the avatar to trigger the file input
    await avatar.click()
    
    // In headless mode, the file picker doesn't open, so we need to
    // directly open the crop modal by simulating the file selection
    // Use page.evaluate to directly set the cropModalOpen state
    await page.evaluate(() => {
      // Find the file input and programmatically set a file
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (fileInput) {
        // Create a dummy file
        const blob = new Blob(['test'], { type: 'image/jpeg' })
        const file = new File([blob], 'test.jpg', { type: 'image/jpeg' })
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        fileInput.files = dataTransfer.files
        // Trigger the change event
        fileInput.dispatchEvent(new Event('change', { bubbles: true }))
      }
    })
    
    // Wait a moment for the modal to appear
    await page.waitForTimeout(1000)
    
    // The crop modal should now be open
    const chooseButton = page.locator('button:has-text("Choose a photo")')
    
    if (await chooseButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Crop modal is visible - test passed')
    } else {
      await page.screenshot({ path: 'tests/e2e/screenshots/profile-after.png' })
      const modal = page.locator('div.fixed.inset-0.z-50')
      const exists = await modal.count()
      console.log(`Modal elements found: ${exists}`)
      throw new Error(`Crop modal not found. Modal elements: ${exists}`)
    }
  })
})
