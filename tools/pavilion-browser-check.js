export default async function check(page) {
  const assert = (value, message) => { if (!value) throw new Error(message); };
  await page.locator('#journey[aria-busy="false"]').waitFor({ state: 'visible' });
  await page.getByRole('link', { name: '도착 구간', exact: true }).click();
  await page.locator('.project[aria-hidden="false"]').waitFor({ state: 'visible' });
  assert(await page.getByRole('link', { name: '도착 구간', exact: true }).getAttribute('aria-current') === 'step', '도착 설명 노출');
  await page.getByRole('link', { name: '시작 구간', exact: true }).press('Enter');
  await page.waitForFunction(() => document.querySelector('.steps a')?.getAttribute('aria-current') === 'step' && document.querySelector('.project').getAttribute('aria-hidden') === 'true');
  assert(await page.locator('.project').getAttribute('aria-hidden') === 'true', '역방향 복귀 후 설명 숨김');
  await page.getByRole('link', { name: '중간 구간', exact: true }).click();
  await page.locator('.steps a[href="#middle"][aria-current="step"]').waitFor();
  assert(await page.getByRole('link', { name: '중간 구간', exact: true }).getAttribute('aria-current') === 'step', '중간 구간');
  await page.getByRole('button', { name: '모션 줄이기', exact: true }).click();
  await page.getByRole('button', { name: '모션 줄임 · 켜짐', exact: true }).waitFor({ state: 'visible' });
  await page.locator('.project[aria-hidden="false"]').waitFor({ state: 'visible' });
  assert(await page.locator('.project').getAttribute('aria-hidden') === 'false', '모션 줄임에서도 콘텐츠 접근');
  await page.getByRole('button', { name: '모션 줄임 · 켜짐', exact: true }).click();
  const layout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    canvasHeight: document.querySelector('canvas').getBoundingClientRect().height,
    viewportHeight: innerHeight,
  }));
  assert(!layout.overflow, '가로 넘침');
  assert(Math.abs(layout.canvasHeight - layout.viewportHeight) < 1, '캔버스 리사이즈');
  return { result: 'PASS', checks: ['도착', '키보드 역방향 복귀', '중간', '모션 줄임', '가로 넘침 없음', '캔버스 크기'] };
}
