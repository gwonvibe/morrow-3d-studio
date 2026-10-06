import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

// FORM 문 열림 → Work → Material → Process → Studio → Gallery → Ending 검사.
// `aether-full` 세션과 AETHER_URL이 가리키는 개발 서버가 필요하다. 화면 캡처는 output/playwright/story-*.png.
mkdirSync('output/playwright', { recursive: true });
const baseUrl = process.env.AETHER_URL ?? 'http://127.0.0.1:4174/';
const script = `async (page) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const results = [];
  const scrollTo = async (selector, progress, lead = false) => {
    await page.evaluate(([selector, progress, lead]) => {
      const el = document.querySelector(selector), top = el.getBoundingClientRect().top + scrollY;
      const offset = lead ? document.querySelector('#type-sequence').getBoundingClientRect().bottom - el.getBoundingClientRect().top - innerHeight : 0;
      window.scrollTo({ top: top + offset + (el.offsetHeight - innerHeight - offset) * progress, behavior: 'instant' });
    }, [selector, progress, lead]);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  };
  const state = () => page.evaluate(() => {
    const css = (el, name) => getComputedStyle(el).getPropertyValue(name).trim();
    const type = document.querySelector('#type-sequence'), work = document.querySelector('.work-reveal');
    return {
      door: type.dataset.door, doorValue: css(type, '--door'), letter: type.dataset.letterState,
      work: ['--inset-x', '--type-x', '--caption'].map((name) => css(work, name)).join(','),
      step: document.querySelector('#material').dataset.step,
      callouts: [...document.querySelectorAll('.material-callout')].map((el) => +getComputedStyle(el).opacity),
      projects: [...document.querySelectorAll('.process-project')].map((el) => +getComputedStyle(el).opacity),
      active: document.querySelector('.process-project.is-active h3')?.textContent ?? null,
      galleryX: css(document.querySelector('#gallery'), '--gallery-x'),
      current: document.querySelector('.gallery-current').textContent,
      ending: css(document.querySelector('#ending'), '--e-panel'),
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size);
    await page.goto(${JSON.stringify(baseUrl)});
    await page.locator('#journey[aria-busy="false"]').waitFor();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const shots = [['type', '#type-sequence', .7], ['door', '#type-sequence', .86], ['work-slit', '.work-reveal', .05, true], ['work-open', '.work-reveal', .5, true], ['work-type', '.work-reveal', .95, true],
      ['material-0', '#material', .1], ['material-1', '#material', .5], ['material-2', '#material', .9],
      ['process-0', '#process', .02], ['process-1', '#process', .34], ['process-2', '#process', .66], ['process-3', '#process', .98],
      ['studio', '#studio', .2], ['gallery-0', '#gallery', .02], ['gallery-1', '#gallery', .5], ['gallery-2', '#gallery', .98],
      ['ending-0', '#ending', .05], ['ending-1', '#ending', 1]];
    const seen = {};
    for (const [name, selector, progress, lead] of shots) {
      await scrollTo(selector, progress, lead);
      if (name.startsWith('process')) await page.locator('#process-world canvas').waitFor();
      if (name === 'door' || name === 'type') await page.waitForTimeout(500);
      await page.evaluate(() => Promise.all([...document.images].filter((img) => img.getBoundingClientRect().top < innerHeight * 2).map((img) => img.decode().catch(() => {}))));
      seen[name] = await state();
      assert(!seen[name].overflow, name + ' 가로 넘침 ' + size.width);
      await page.screenshot({ path: 'output/playwright/story-' + name + '-' + size.width + '.png' });
    }
    assert(seen.type.door === 'closed' && seen.type.letter === 'settled', 'FORM 75% 이전에는 닫힘');
    assert(seen.door.door === 'opening', 'FORM 75~100% 문 열림');
    assert(seen['work-slit'].door === 'open', 'Work 진입 시 FORM 숨김');
    assert(['material-0', 'material-1', 'material-2'].every((name, i) => seen[name].step === String(i) && seen[name].callouts.filter((o) => o > 0).length === 1 && seen[name].callouts[i] === 1), 'Material 3단계 단일 콜아웃');
    assert(['process-0', 'process-1', 'process-2', 'process-3'].map((name) => seen[name].active).join() === 'Hush Table,Veil Light,Tide Bench,Courtyard 03', 'Recent projects 4면 회전');
    assert(['gallery-0', 'gallery-1', 'gallery-2'].map((name) => seen[name].current).join() === '01,02,03', 'Gallery 3프레임');
    assert(seen['ending-0'].ending === '-100' && seen['ending-1'].ending === '0', 'Ending 패널 닫힘');
    // 끝까지 갔다가 역스크롤로 돌아오면 같은 상태여야 한다.
    for (const [selector, progress, lead] of [['#type-sequence', .9], ['.work-reveal', .4, true], ['#material', .45], ['#process', .6], ['#gallery', .3]]) {
      await scrollTo(selector, progress, lead);
      await page.waitForTimeout(400);
      const before = await state();
      await scrollTo('#ending', 1);
      await scrollTo(selector, progress, lead);
      await page.waitForTimeout(400);
      assert(JSON.stringify(await state()) === JSON.stringify(before), '역스크롤 불일치 ' + selector);
    }
    // Work 링크는 문이 다 열린 슬릿 장면에 도착한다.
    await page.getByRole('link', { name: 'Work', exact: true }).click();
    await page.waitForTimeout(900);
    const atWork = await state();
    assert(atWork.door === 'open' && parseFloat(atWork.work) > 40, 'Work 링크 도착 ' + JSON.stringify(atWork));
    // 모션 줄이기: 연속 이동 대신 단계 상태.
    await scrollTo('#gallery', .3);
    await page.getByRole('button', { name: '모션 줄이기', exact: true }).click();
    await page.waitForTimeout(100);
    const reducedState = await state();
    assert(reducedState.galleryX === '-0' || reducedState.current === '02' || reducedState.current === '01', '모션 줄임 갤러리 단계');
    await scrollTo('.work-reveal', .1, true);
    assert((await state()).work.startsWith('0,'), '모션 줄임에서 Work 프레임 즉시 열림');
    await scrollTo('#type-sequence', .8);
    assert((await state()).door === 'closed', '모션 줄임에서 문 단계 전환(닫힘)');
    await scrollTo('#type-sequence', .95);
    assert((await state()).door === 'open', '모션 줄임에서 문 단계 전환(열림)');
    await page.getByRole('button', { name: '모션 줄임 · 켜짐', exact: true }).click();
    await page.getByRole('link', { name: 'Back to top ↑', exact: true }).focus();
    assert(await page.evaluate(() => document.activeElement?.textContent === 'Back to top ↑'), '푸터 링크 키보드 포커스');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => scrollY === 0);
    results.push({ size, scenes: Object.keys(seen).length, reverse: '5개 장면 역스크롤 일치', reduced: '단계 전환', keyboard: '마지막 링크 포커스·이동' });
  }
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 800 });
    for (const selector of ['#type-sequence', '.work-reveal', '#material', '#process', '#studio', '#gallery', '#ending']) {
      await scrollTo(selector, .5);
      assert(!(await state()).overflow, '가로 넘침 ' + width + ' ' + selector);
    }
  }
  assert(!errors.length, errors.join('; '));
  return { results, widths: [320, 390, 768, 1440] };
}`;
const output = execFileSync('npx', ['--offline', '--package', '@playwright/cli', 'playwright-cli', '--session', 'aether-full', 'run-code', script], { encoding: 'utf8', timeout: 240000 });
console.log(output.split('### Ran Playwright code')[0]);
