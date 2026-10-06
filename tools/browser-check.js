// 앱 브라우저의 tab.playwright 또는 Playwright Page를 전달합니다.
// 준비 상태는 시간 지연 대신 실제 DOM 상태로 확인합니다.
export default async function check(page) {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const ready = () => page.locator('main[aria-busy="false"]').waitFor({ state: "visible" });
  await ready();
  assert(await page.getByRole("button", { name: "문을 지나 Tidal로 이동", exact: true }).isEnabled(), "첫 화면 진입 버튼");
  for (const [destination, selected] of [["Tidal", "02 Tidal"], ["Nocturne", "03 Nocturne"], ["Dune", "01 Dune"]]) {
    await page.getByRole("button", { name: `문을 지나 ${destination}로 이동`, exact: true }).click();
    await ready();
    assert(await page.getByRole("button", { name: selected, exact: true }).getAttribute("aria-pressed") === "true", `${destination} 도착 실패`);
  }
  await page.getByRole("button", { name: "움직임 일시정지", exact: true }).click();
  assert(await page.getByRole("button", { name: "움직임 재생", exact: true }).getAttribute("aria-pressed") === "true", "일시정지 상태");
  await page.getByRole("button", { name: "03 Nocturne", exact: true }).press("Enter");
  await ready();
  assert(await page.getByRole("button", { name: "03 Nocturne", exact: true }).getAttribute("aria-pressed") === "true", "키보드 탐색");
  await page.getByRole("button", { name: "01 Dune", exact: true }).click();
  await ready();
  await page.getByRole("button", { name: "이 공간에 대하여 ↗", exact: true }).click();
  assert(await page.getByRole("dialog").isVisible(), "소개창 열기");
  await page.getByRole("button", { name: "닫기", exact: true }).press("Escape");
  assert(!(await page.getByRole("dialog").isVisible()), "Escape 닫기");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert(!overflow, "가로 넘침");
  await page.getByRole("button", { name: "움직임 재생", exact: true }).click();
  return { result: "PASS", checks: ["세 풍경 순환", "일시정지", "키보드 풍경 선택", "소개창 열기", "Escape 닫기", "가로 넘침 없음"] };
}
