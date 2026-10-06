import { splitFormProgress } from './typography-motion.js';
import { sampleWorkReveal, sampleMaterial, sampleProjectPrism, sampleStudio, sampleGallery, sampleEnding } from './story-motion.js';

// FORM 이후 장면은 CSS sticky/transform/mask로 그리고, 여기서는 스크롤 진행률을 CSS 변수로만 넘긴다.
const clamp = (value) => Math.max(0, Math.min(1, value));
const type = document.querySelector('#type-sequence');
const workReveal = document.querySelector('.work-reveal');
const material = document.querySelector('#material');
const process = document.querySelector('#process');
const studio = document.querySelector('#studio');
const gallery = document.querySelector('#gallery');
const ending = document.querySelector('#ending');
const callouts = [...material.querySelectorAll('.material-callout, .material-dot')];
const projects = [...process.querySelectorAll('.process-project')];
const galleryStage = gallery.querySelector('.gallery-stage');
const track = gallery.querySelector('.gallery-track');
const frames = [...track.children];
const current = gallery.querySelector('.gallery-current');
let reduced = document.documentElement.classList.contains('reduce-motion'), frame = 0, galleryDistance = 0;

const set = (element, values) => Object.entries(values).forEach(([name, value]) => element.style.setProperty(`--${name}`, String(Math.round(value * 10000) / 10000)));
// 고정 장면: 스테이지가 붙어 있는 동안 0→1. lead만큼은 앞 장면과 겹쳐 0으로 머문다.
function pinned(element, lead = 0) {
  const rect = element.getBoundingClientRect();
  return clamp((-rect.top - lead) / Math.max(1, rect.height - innerHeight - lead));
}
// 흐르는 장면: 섹션 머리가 화면 아래로 들어와 꼬리가 위로 나갈 때까지 0→1.
function passing(element) {
  const rect = element.getBoundingClientRect();
  return clamp((innerHeight - rect.top) / (innerHeight + rect.height));
}

function update() {
  frame = 0;
  const split = splitFormProgress(pinned(type));
  const door = reduced ? Math.round(split.door) : split.door;
  set(type, { door });
  type.dataset.door = door === 0 ? 'closed' : door >= .999 ? 'open' : 'opening';

  const lead = Math.max(0, type.getBoundingClientRect().bottom - workReveal.getBoundingClientRect().top - innerHeight);
  const work = sampleWorkReveal(reduced ? 1 : pinned(workReveal, lead));
  set(workReveal, { 'inset-x': work.insetX, 'inset-y': work.insetY, 'image-scale': work.imageScale, 'type-x': work.typeX, 'type-y': work.typeY, caption: work.caption });

  let look = sampleMaterial(pinned(material));
  if (reduced) look = sampleMaterial([0, .5, 1][look.step]);
  set(material, { 'f-top': look.frame[0], 'f-right': look.frame[1], 'f-bottom': look.frame[2], 'f-left': look.frame[3], 'm-scale': look.scale, 'm-x': look.x, 'm-y': look.y, 'm-ry': look.ry, 'm-depth': look.depth });
  callouts.forEach((element) => set(element, { o: look.callouts[element.dataset.step] }));
  material.dataset.step = look.step;

  let projectPose = sampleProjectPrism(pinned(process), projects.length);
  if (reduced) projectPose = sampleProjectPrism(projectPose.active / (projects.length - 1), projects.length);
  projects.forEach((project, i) => {
    const active = i === projectPose.active;
    set(project, { 'project-o': projectPose.entries[i] });
    project.classList.toggle('is-active', active);
    project.setAttribute('aria-hidden', String(!active));
  });
  process.dataset.project = String(projectPose.active);
  process.projectPose = projectPose;
  process.dispatchEvent(new CustomEvent('projectpose', { detail: projectPose }));

  const room = sampleStudio(reduced ? 1 : passing(studio));
  set(studio, { 'row-0': room.rows[0], 'row-1': room.rows[1], 'row-2': room.rows[2], rx: room.mask.rx, ry: room.mask.ry, cx: room.mask.cx, cy: room.mask.cy, 'image-scale': room.imageScale, rotate: room.rotate, 'studio-tilt': room.tilt });

  let reel = sampleGallery(pinned(gallery), frames.length);
  if (reduced) reel = sampleGallery(reel.active / (frames.length - 1), frames.length);
  set(gallery, { 'gallery-x': -reel.x * galleryDistance });
  frames.forEach((item, i) => set(item, { focus: reel.focus[i], tilt: reel.poses[i].tilt, depth: reel.poses[i].depth, lift: reel.poses[i].lift }));
  current.textContent = String(reel.active + 1).padStart(2, '0');

  const close = sampleEnding(reduced ? 1 : pinned(ending));
  set(ending, { 'e-x': close.insetX, 'e-y': close.insetY, 'e-scale': close.imageScale, 'e-panel': close.panel });
}
function request() { if (!frame) frame = requestAnimationFrame(update); }
function measure() { galleryDistance = Math.max(0, track.scrollWidth - galleryStage.clientWidth); request(); }

window.addEventListener('scroll', request, { passive: true });
window.addEventListener('resize', measure);
window.addEventListener('motionchange', (event) => { reduced = event.detail.reduced; request(); });
// 지연 로딩 이미지가 크기를 확정하면 가로 이동 거리를 다시 잰다.
frames.forEach((item) => item.querySelector('img').addEventListener('load', measure, { once: true }));
measure(); update();
