import { execFileSync } from 'node:child_process';

const script = `async (page) => {
  await page.setViewportSize({width:1440,height:900});
  await page.addInitScript(() => {
    window.__aetherDraws = {world:0,type:0};
    window.__aetherReady = null;
    for (const name of ['drawElements','drawArrays']) {
      const original = WebGL2RenderingContext.prototype[name];
      WebGL2RenderingContext.prototype[name] = function(...args) {
        if (this.canvas.parentElement?.id === 'world') window.__aetherDraws.world++;
        if (this.canvas.parentElement?.id === 'type-world') window.__aetherDraws.type++;
        return original.apply(this,args);
      };
    }
    new MutationObserver((_,observer) => {
      if (document.querySelector('#journey')?.getAttribute('aria-busy') === 'false') {
        window.__aetherReady = performance.now(); observer.disconnect();
      }
    }).observe(document,{subtree:true,attributes:true,attributeFilter:['aria-busy']});
  });
  const loads=[];
  for(let i=0;i<3;i++) {
    await page.goto('http://127.0.0.1:4175/');
    await page.locator('#journey[aria-busy="false"]').waitFor();
    loads.push(await page.evaluate(()=>({readyMs:Math.round(window.__aetherReady),domMs:Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd),typeLoaded:performance.getEntriesByType('resource').some(r=>r.name.includes('/typography-'))})));
  }
  // 고정 대기는 준비 상태 대용이 아니라, 정지 구간의 draw 호출 수를 측정하는 표본 시간이다.
  await page.waitForTimeout(700);
  const idleBefore=await page.evaluate(()=>({...window.__aetherDraws}));
  await page.waitForTimeout(500);
  const idleAfter=await page.evaluate(()=>({...window.__aetherDraws}));
  await page.getByRole('link',{name:'다음 장면 ↘',exact:true}).click();
  await page.locator('#type-sequence[data-letter-state="settled"]').waitFor();
  await page.getByRole('link',{name:'Contact',exact:true}).click();
  await page.waitForTimeout(500);
  const offBefore=await page.evaluate(()=>({...window.__aetherDraws}));
  await page.waitForTimeout(500);
  const offAfter=await page.evaluate(()=>({...window.__aetherDraws}));
  if (JSON.stringify(offBefore)!==JSON.stringify(offAfter)) throw new Error('화면 밖에서 렌더링 지속');
  await page.getByRole('link',{name:'Morrow 시작으로',exact:true}).click();
  return {loads,idle:{before:idleBefore,after:idleAfter},offscreen:{before:offBefore,after:offAfter},scope:'로컬 Chrome 데스크톱, 제한 없는 로컬 네트워크, 반복 로딩; 실제 모바일/CWV 측정 아님'};
}`;
const output = execFileSync('npx', ['--offline', '--package', '@playwright/cli', 'playwright-cli', '--session', 'aether-full', 'run-code', script], { encoding: 'utf8', timeout: 90000 });
console.log(output.split('### Ran Playwright code')[0]);
