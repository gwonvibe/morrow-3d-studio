import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { sampleLetter, splitFormProgress, sampleFormDoor } from './typography-motion.js';

// 직접 설계한 네 글자. 같은 윤곽을 HTML의 평면 SVG와 입체 메시에서 공유한다.
const outlines = [
  'M4 0H78V20H26V43H69V63H26V100H4Z',
  'M41 0C13 0 0 18 0 50S13 100 41 100S82 82 82 50S69 0 41 0Z M41 20C55 20 60 30 60 50S55 80 41 80S22 70 22 50S27 20 41 20Z',
  'M2 0H43C68 0 80 12 80 32C80 47 73 57 60 62L82 100H57L37 66H24V100H2Z M24 20V46H42C53 46 58 42 58 33S53 20 42 20Z',
  'M0 100V0H23L41 47L59 0H82V100H61V36L46 75H36L21 36V100Z',
];

export function initTypography() {
  const section = document.querySelector('#type-sequence');
  const stage = document.querySelector('#type-stage');
  const host = document.querySelector('#type-world');
  const slots = [...document.querySelectorAll('.letter-slot')];
  const svg = (d) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 82 100" aria-hidden="true"><path fill-rule="evenodd" d="${d}"/></svg>`;
  slots.forEach((slot, i) => { slot.innerHTML = svg(outlines[i]); slot.setAttribute('aria-hidden', 'true'); });
  let reduced = document.documentElement.classList.contains('reduce-motion');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 1, 3000); camera.position.z = 1000;
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .06); scene.environment = environment.texture;
  scene.environmentIntensity = .8; room.dispose(); pmrem.dispose();
  const key = new THREE.DirectionalLight(0xfff8eb, 3); key.position.set(-500, 600, 800); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 1.3); fill.position.set(500, -100, 600); scene.add(fill);
  const material = new THREE.MeshStandardMaterial({ color: 0x8d918d, metalness: .92, roughness: .29 });
  const loader = new SVGLoader();
  const letters = outlines.map((d) => {
    const paths = loader.parse(svg(d)).paths;
    const geometry = new THREE.ExtrudeGeometry(paths.flatMap((path) => path.toShapes()), {
      depth: 13, bevelEnabled: true, bevelThickness: .8, bevelSize: .65, bevelSegments: 2, steps: 1, curveSegments: 16,
    });
    geometry.translate(-41, -50, -6.5);
    const mesh = new THREE.Mesh(geometry, material); scene.add(mesh); return mesh;
  });
  let width, height, targets = [], p = 0, goal = 0, frame = 0, previous = performance.now(), visible = false;
  function requestRender() {
    if (!frame && visible && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function resize() {
    width = stage.clientWidth; height = stage.clientHeight;
    material.color.setHex(width <= 700 ? 0x626962 : 0x8d918d);
    renderer.setPixelRatio(Math.min(devicePixelRatio, width <= 700 ? 1.25 : 1.75));
    renderer.setSize(width, height);
    camera.aspect = width / height; camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(height / 2000)); camera.updateProjectionMatrix();
    const rect = stage.getBoundingClientRect();
    targets = slots.map((slot) => { const r = slot.getBoundingClientRect(); return { x: r.left - rect.left + r.width / 2 - width / 2, y: height / 2 - (r.top - rect.top + r.height / 2), scale: r.height / 100 }; });
    updateScroll();
  }
  function updateScroll() {
    // 3D 전시 실패 시 위쪽 journey 높이가 바뀌므로 위치를 캐시하지 않고 매번 읽는다.
    const rect = section.getBoundingClientRect();
    goal = THREE.MathUtils.clamp(-rect.top / Math.max(1, rect.height - height), 0, 1);
    requestRender();
  }
  function draw(time) {
    frame = 0;
    const dt = Math.min((time - previous) / 1000, .05); previous = time;
    if (!visible || document.hidden) return;
    p = reduced ? goal : THREE.MathUtils.damp(p, goal, 10, dt);
    if (Math.abs(p - goal) < .0001) p = goal;
    // 0~75%는 기존 조립, 75~100%는 문처럼 열림. 모션 줄이기에서는 열림도 단계로 끊는다.
    const split = splitFormProgress(p);
    const assemble = reduced ? 1 : split.assemble, door = reduced ? Math.round(split.door) : split.door;
    letters.forEach((mesh, i) => {
      const pose = sampleLetter(assemble, i), open = sampleFormDoor(door, i), target = targets[i];
      const scale = target.scale * pose.scale * open.scale;
      mesh.position.set(target.x + (pose.x + open.x) * width, target.y + pose.y * height, pose.z + open.z);
      mesh.rotation.set(pose.rx, pose.ry + open.ry, pose.rz);
      mesh.scale.set(scale, -scale, scale);
    });
    renderer.render(scene, camera);
    section.dataset.letterState = assemble >= .84 ? 'settled' : 'flying';
    if (!reduced && Math.abs(p - goal) > .0001) requestRender();
  }
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) { updateScroll(); p = goal; previous = performance.now(); requestRender(); }
    else if (frame) { cancelAnimationFrame(frame); frame = 0; }
  });
  visibility.observe(section);
  window.addEventListener('scroll', updateScroll, { passive: true });
  window.addEventListener('resize', resize);
  window.addEventListener('motionchange', (event) => { reduced = event.detail.reduced; p = goal; requestRender(); });
  document.addEventListener('visibilitychange', () => { previous = performance.now(); requestRender(); });
  // 문 열림용 CSS 변형이 꺼진 상태에서 글자 칸 위치를 잰다.
  section.classList.add('type-ready'); resize();
}
