import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { sampleMotion } from './pavilion-motion.js';
import { applyPavilionMaterials, addGallery } from './pavilion-materials.js';
import { addPavilionDetails } from './pavilion-details.js';

const world = document.querySelector('#world');
const journey = document.querySelector('#journey');
const project = document.querySelector('.project');
const loading = document.querySelector('#loading');
const bar = document.querySelector('.progress-track i');
const finePointer = matchMedia('(pointer: fine)');
let reduced = document.documentElement.classList.contains('reduce-motion');
let renderer, frame, dirty = true, ready = false, p = 0, targetP = 0;
let pointer = new THREE.Vector2(), pointerTarget = new THREE.Vector2();
let previous = performance.now();
let width = innerWidth, height = innerHeight;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeeede8);
scene.fog = new THREE.Fog(0xeeede8, 28, 65);
const camera = new THREE.PerspectiveCamera(38, width / height, .1, 100);
let slider, wing;
const lookAt = new THREE.Vector3();

function canvasMap(draw) {
  const canvas = document.createElement('canvas');
  canvas.width = 768; canvas.height = 1024;
  draw(canvas.getContext('2d'));
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return map;
}
function frontGraphic(ctx) {
  ctx.fillStyle = '#efeee7'; ctx.fillRect(0, 0, 768, 1024);
  ctx.fillStyle = '#252822';
  ctx.save(); ctx.translate(52, 630); ctx.scale(.79, 3.7);
  ctx.font = '700 145px Pretendard'; ctx.fillText('MORROW', 0, 0); ctx.restore();
  ctx.font = '400 18px Pretendard'; ctx.fillText('MORROW PAVILION / 001', 55, 870);
  ctx.font = '400 15px Pretendard'; ctx.fillText('OBJECT. SPACE. MOVEMENT.', 55, 901);
  ctx.strokeStyle = '#767c6c'; ctx.lineWidth = 1.5;
  for (const [x, y] of [[55, 55], [710, 55], [55, 960], [710, 960]]) {
    ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 10); ctx.stroke();
  }
}
function resize() {
  width = world.clientWidth; height = world.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer?.setPixelRatio(Math.min(devicePixelRatio, width <= 700 ? 1.25 : 1.75));
  renderer?.setSize(width, height);
  updateScroll(); requestRender();
}
function requestRender() {
  dirty = true;
  if (ready && !frame && !document.hidden) frame = requestAnimationFrame(draw);
}
function updateScroll() {
  targetP = THREE.MathUtils.clamp(scrollY / Math.max(1, journey.offsetHeight - height), 0, 1);
  requestRender();
}
function draw(time) {
  frame = 0;
  const dt = Math.min((time - previous) / 1000, .05); previous = time;
  if (!ready || document.hidden || scrollY > journey.offsetHeight) return;
  const moving = Math.abs(targetP - p) > .00005 || pointer.distanceTo(pointerTarget) > .0001;
  if (!dirty && !moving) return;
  p = reduced ? targetP : THREE.MathUtils.damp(p, targetP, 9, dt);
  if (Math.abs(p - targetP) < .00005) p = targetP;
  pointer.lerp(pointerTarget, 1 - Math.exp(-7 * dt));
  if (pointer.distanceTo(pointerTarget) < .0001) pointer.copy(pointerTarget);
  const state = sampleMotion(reduced ? 1 : p, width <= 700);
  slider.position.x = state.slide;
  wing.rotation.y = state.wing;
  camera.position.fromArray(state.camera);
  if (!reduced) { camera.position.x += pointer.x * .23; camera.position.y += pointer.y * .12; }
  lookAt.fromArray(state.target); camera.lookAt(lookAt);
  project.style.opacity = state.copy;
  project.style.transform = `translateY(${(1 - state.copy) * 14}px)`;
  project.classList.toggle('visible', state.copy > .01);
  project.setAttribute('aria-hidden', String(state.copy < .5));
  bar.style.transform = `scaleX(${p})`;
  renderer.render(scene, camera);
  dirty = false;
  if (Math.abs(targetP - p) > .00005 || pointer.distanceTo(pointerTarget) > .0001) frame = requestAnimationFrame(draw);
}
async function init() {
  await document.fonts.load('700 145px Pretendard');
  await document.fonts.load('400 18px Pretendard');
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .9;
  world.append(renderer.domElement);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let environment;
  try {
    const hdr = await new HDRLoader().loadAsync('/assets/studio.hdr');
    environment = pmrem.fromEquirectangular(hdr);
    hdr.dispose();
  } catch {
    const room = new RoomEnvironment();
    const windowReflection = new THREE.Mesh(new THREE.PlaneGeometry(3, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 8, 7.6), side: THREE.DoubleSide }));
    windowReflection.position.set(-8, 8, 8); windowReflection.lookAt(0, 4, 0); room.add(windowReflection);
    environment = pmrem.fromScene(room, .05);
    room.dispose();
  }
  scene.environment = environment.texture;
  scene.environmentIntensity = .8;
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xfffdf7, 0x756d61, 1));
  const light = new THREE.DirectionalLight(0xfff5df, 2.1);
  light.position.set(-8, 11, 7);
  light.castShadow = true;
  light.shadow.mapSize.set(width <= 700 ? 1024 : 2048, width <= 700 ? 1024 : 2048);
  Object.assign(light.shadow.camera, { left: -12, right: 12, top: 10, bottom: -10, near: .5, far: 40 });
  light.shadow.normalBias = .025;
  light.shadow.bias = -.00015;
  light.shadow.radius = 3;
  scene.add(light);
  const rim = new THREE.DirectionalLight(0xdde8ec, .85);
  rim.position.set(7, 6, -4);
  scene.add(rim);
  addGallery(scene);
  const { scene: model } = await new GLTFLoader().loadAsync('/assets/pavilion-blockout.glb');
  slider = model.getObjectByName('Front_slider');
  wing = model.getObjectByName('Right_hinge');
  model.traverse((object) => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
  const paperGrain = await applyPavilionMaterials(model, renderer);
  const front = model.getObjectByName('Front_graphic');
  front.material = new THREE.MeshStandardMaterial({ map: canvasMap(frontGraphic), roughness: .95, bumpMap: paperGrain, bumpScale: .006, side: THREE.FrontSide });
  front.castShadow = false;
  addPavilionDetails(model, scene);
  scene.add(model);
  ready = true; loading.hidden = true; journey.setAttribute('aria-busy', 'false');
  resize(); p = targetP;
  requestRender();
}
window.addEventListener('motionchange', (event) => {
  reduced = event.detail.reduced; pointerTarget.set(0, 0); requestRender();
});
window.addEventListener('scroll', updateScroll, { passive: true });
window.addEventListener('resize', resize);
window.addEventListener('pointermove', (event) => {
  if (reduced || !finePointer.matches || event.pointerType === 'touch') return;
  if (scrollY > journey.offsetHeight) return;
  pointerTarget.set(event.clientX / width * 2 - 1, 1 - event.clientY / height * 2); requestRender();
});
document.addEventListener('pointerleave', () => { pointerTarget.set(0, 0); requestRender(); });
document.addEventListener('visibilitychange', () => { previous = performance.now(); requestRender(); });
init().catch((error) => {
  console.error('3D 전시 장면 로딩 실패', error);
  document.body.classList.add('fallback');
  document.querySelector('#loading-label').textContent = '3D 대신 아래에서 작업 이미지를 볼 수 있습니다.';
  journey.setAttribute('aria-busy', 'false');
});
