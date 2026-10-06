import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import checkPavilion from './pavilion-browser-check.js';

mkdirSync('output/playwright', { recursive: true });
const script = `async (page) => {
  const checkPavilion = ${checkPavilion.toString()};
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const results = [];
  for (const size of [{width:1440,height:900},{width:390,height:844}]) {
    await page.setViewportSize(size);
    await page.goto('http://127.0.0.1:4174/');
    const hero = await checkPavilion(page);
    await page.locator('#form').evaluate(el => el.scrollIntoView());
    await page.locator('#type-sequence[data-letter-state="settled"]').waitFor({timeout:10000});
    await page.screenshot({path:'output/playwright/site-form-'+size.width+'.png'});
    await page.evaluate(() => {
      const s = document.querySelector('#type-sequence');
      window.scrollTo(0, s.offsetTop + (s.offsetHeight - innerHeight) * .28);
    });
    await page.locator('#type-sequence[data-letter-state="flying"]').waitFor({timeout:10000});
    await page.screenshot({path:'output/playwright/site-flying-'+size.width+'.png'});
    await page.getByRole('button',{name:'모션 줄이기',exact:true}).click();
    await page.locator('#type-sequence[data-letter-state="settled"]').waitFor({timeout:10000});
    await page.getByRole('button',{name:'모션 줄임 · 켜짐',exact:true}).click();
    await page.locator('#type-sequence[data-letter-state="flying"]').waitFor({timeout:10000});
    for (const name of ['Work','Studio','Contact']) {
      await page.getByRole('link',{name,exact:true}).click();
      await page.waitForTimeout(350);
      if (name === 'Work') await page.locator('.work-image img').evaluate(img => img.decode());
      await page.screenshot({path:'output/playwright/site-'+name.toLowerCase()+'-'+size.width+'.png'});
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (overflow) throw new Error(name+' 가로 넘침 '+size.width);
    }
    await page.getByRole('link',{name:'Back to top ↑',exact:true}).click();
    await page.waitForFunction(()=>scrollY===0);
    await page.screenshot({path:'output/playwright/site-start-'+size.width+'.png'});
    results.push({size,hero,typography:'착지/역방향/모션 줄임 통과',navigation:'작업/소개/문의/처음으로 통과'});
  }
  if (errors.length) throw new Error(errors.join('; '));
  return {results,errors};
}`;
const output = execFileSync('npx', ['--offline', '--package', '@playwright/cli', 'playwright-cli', '--session', 'aether-full', 'run-code', script], { encoding: 'utf8', timeout: 90000 });
console.log(output.split('### Ran Playwright code')[0]);
