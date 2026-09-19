import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        print('Navigating...')
        await page.goto('http://localhost:5173/auth')
        await page.fill('input[type="email"]', 'demo@example.com')
        await page.fill('input[type="password"]', 'password')
        await page.click('button:has-text("Sign In")')
        await page.wait_for_url('http://localhost:5173/')
        print('Logged in!')
        
        await page.goto('http://localhost:5173/article/cd785202-e728-42fa-a7de-07d2c1d3e90d')
        await page.wait_for_selector('h1', timeout=10000)
        await asyncio.sleep(2) # let react render
        
        content = await page.content()
        if 'Audio is unavailable' in content:
            print('FOUND: Audio is unavailable')
        else:
            print('NOT FOUND: Audio is unavailable')
            
        iframes = await page.query_selector_all('iframe')
        print(f'Found {len(iframes)} iframes')
        for i, frame in enumerate(iframes):
            src = await frame.get_attribute('src')
            print(f'Iframe {i} src:', src)
            
        await browser.close()

asyncio.run(main())
