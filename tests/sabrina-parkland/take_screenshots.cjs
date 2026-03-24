const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });

  const files = [
    { html: '02_bill_of_materials.html', png: '02_bill_of_materials.png' },
    { html: '03_interference_report.html', png: '03_interference_report.png' },
    { html: '04_nesting_plan.html', png: '04_nesting_plan.png' },
  ];

  const dir = __dirname;

  for (const f of files) {
    const page = await context.newPage();
    await page.goto('file://' + path.join(dir, f.html));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(dir, f.png), fullPage: true });
    console.log('Screenshot: ' + f.png);
    await page.close();
  }

  await browser.close();
  console.log('Done — all screenshots saved.');
})();
