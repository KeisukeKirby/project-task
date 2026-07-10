const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('pageerror', err => {
    console.log('--- PAGE ERROR ---');
    console.log(err.message);
    console.log(err.stack);
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('--- CONSOLE ERROR ---');
      console.log(msg.text());
    }
  });
  
  console.log('Waiting for Next.js to start...');
  let loaded = false;
  for (let i = 0; i < 20; i++) {
    try {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 5000 });
      loaded = true;
      break;
    } catch (e) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  if (!loaded) {
    console.log('Failed to load localhost:3000');
    process.exit(1);
  }
  
  console.log('Page loaded. Waiting for task to appear...');
  await page.waitForTimeout(3000); 
  
  const taskLocator = page.locator('.gantt-bar').first();
  if (await taskLocator.count() > 0) {
    console.log('Clicking task...');
    await taskLocator.click();
    await page.waitForTimeout(2000);
    console.log('Wait completed.');
  } else {
    console.log('No task found! Dumping body text:');
    console.log(await page.locator('body').innerText());
  }
  
  await browser.close();
  process.exit(0);
})();
