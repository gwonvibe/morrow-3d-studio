import './pavilion.css';
import './site.css';
import './story.css';
import './story.js';

const button = document.querySelector('#motion');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
let userReduced = false;
function updateMotion() {
  const reduced = userReduced || preference.matches;
  document.documentElement.classList.toggle('reduce-motion', reduced);
  button.setAttribute('aria-pressed', String(reduced));
  button.textContent = reduced ? '모션 줄임 · 켜짐' : '모션 줄이기';
  button.disabled = preference.matches;
  button.title = preference.matches ? '기기의 움직임 줄이기 설정이 적용되었습니다.' : '';
  window.dispatchEvent(new CustomEvent('motionchange', { detail: { reduced } }));
}
button.addEventListener('click', () => { userReduced = !userReduced; updateMotion(); });
preference.addEventListener('change', updateMotion);
updateMotion();
// 모션 설정은 3D 구간에만 의미가 있으므로, 그 구간이 화면 하단을 덮을 때만 버튼을 보인다.
const motionZones = new Set();
const zoneObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => entry.isIntersecting ? motionZones.add(entry.target) : motionZones.delete(entry.target));
  button.classList.toggle('is-away', !motionZones.size);
  // 고정 장면이 아닌 흐르는 Studio 위에서는 본문이 헤더 밑으로 비치지 않게 한다.
  document.body.classList.toggle('content-zone', ![...motionZones].some((zone) => zone.id !== 'studio'));
}, { rootMargin: '-85% 0px 0px 0px' });
document.querySelectorAll('#journey, #type-sequence, .story-scene').forEach((zone) => zoneObserver.observe(zone));

// 텍스트와 이미지가 먼저 보이게 하고, 무거운 3D 코드는 별도로 불러온다.
import('./pavilion.js').catch(showFallback);
const sequence = document.querySelector('#type-sequence');
const observer = new IntersectionObserver((entries) => {
  if (!entries.some((entry) => entry.isIntersecting)) return;
  observer.disconnect();
  import('./typography.js').then(({ initTypography }) => initTypography()).catch((error) => {
    console.error('입체 타이포그래피를 불러오지 못했습니다.', error);
    sequence.classList.remove('type-ready');
  });
}, { rootMargin: '100% 0px' });
observer.observe(sequence);

const process = document.querySelector('#process');
let projectPrism;
process.addEventListener('projectpose', (event) => projectPrism?.update(event.detail));
const processObserver = new IntersectionObserver((entries) => {
  if (!entries.some((entry) => entry.isIntersecting)) return;
  processObserver.disconnect();
  import('./project-prism.js').then(({ initProjectPrism }) => initProjectPrism(process, [...process.querySelectorAll('.process-project')])).then((controller) => {
    projectPrism = controller;
    if (process.projectPose) projectPrism.update(process.projectPose);
  }).catch((error) => {
    process.classList.add('process-fallback');
    console.error('3D 프로젝트 오브젝트를 불러오지 못했습니다.', error);
  });
}, { rootMargin: '100% 0px' });
processObserver.observe(process);

function showFallback(error) {
  console.error('전시 공간을 불러오지 못했습니다.', error);
  document.body.classList.add('fallback');
  document.querySelector('#journey').setAttribute('aria-busy', 'false');
  document.querySelector('#loading-label').textContent = '3D 대신 아래에서 작업 이미지를 볼 수 있습니다.';
}
