import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const mix = (from, to, amount) => from + (to - from) * amount;

export function initScene(container, colors) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.25 : 1.6));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, container.clientWidth / container.clientHeight, 0.1, 50);
  camera.position.set(0, 0.15, 10.8);

  const environmentScene = new RoomEnvironment();
  const environment = new THREE.PMREMGenerator(renderer).fromScene(environmentScene, 0.04);
  scene.environment = environment.texture;
  environmentScene.dispose();

  const sculpture = new THREE.Group();
  scene.add(sculpture);

  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: colors.object,
    metalness: 0.28,
    roughness: 0.24,
    clearcoat: 0.72,
    clearcoatRoughness: 0.2,
    envMapIntensity: 1.35
  });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: colors.ink, metalness: 0.7, roughness: 0.24 });
  const accentMaterial = new THREE.MeshPhysicalMaterial({ color: colors.accent, metalness: 0.1, roughness: 0.33, clearcoat: 0.5 });

  const body = new THREE.Mesh(new RoundedBoxGeometry(2.5, 3.7, 0.72, 8, 0.18), bodyMaterial);
  body.castShadow = true;
  body.receiveShadow = true;
  body.rotation.z = -0.13;
  sculpture.add(body);

  const inset = new THREE.Mesh(new RoundedBoxGeometry(1.48, 2.52, 0.79, 8, 0.12), darkMaterial);
  inset.position.set(0.3, 0.06, 0.18);
  inset.rotation.z = -0.13;
  inset.castShadow = true;
  sculpture.add(inset);

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.25, 72), accentMaterial);
  disc.rotation.x = Math.PI / 2;
  disc.position.set(-0.28, 0.22, 0.78);
  disc.castShadow = true;
  sculpture.add(disc);

  const orbit = new THREE.Mesh(
    new THREE.TorusGeometry(2.35, 0.038, 16, 180),
    new THREE.MeshStandardMaterial({ color: colors.ink, metalness: 0.82, roughness: 0.18 })
  );
  orbit.rotation.set(1.05, 0.08, -0.28);
  sculpture.add(orbit);

  const smallOrbit = new THREE.Mesh(
    new THREE.TorusGeometry(1.68, 0.018, 12, 160),
    new THREE.MeshStandardMaterial({ color: colors.accent, metalness: 0.5, roughness: 0.25 })
  );
  smallOrbit.rotation.set(0.94, 0.3, 0.42);
  sculpture.add(smallOrbit);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ color: colors.ink, opacity: 0.16 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.44;
  floor.receiveShadow = true;
  scene.add(floor);

  const key = new THREE.DirectionalLight('#ffffff', 4.2);
  key.position.set(-4, 7, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 25 });
  key.shadow.bias = -0.0005;
  scene.add(key);

  const rim = new THREE.DirectionalLight(colors.accent, 2.6);
  rim.position.set(5, 1, -4);
  scene.add(rim, new THREE.HemisphereLight('#fffdf7', '#8b887e', 1.25));

  const pointer = new THREE.Vector2();
  const pointerTarget = new THREE.Vector2();
  let progress = 0;
  let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = true;

  function onPointerMove(event) {
    if (reduced || event.pointerType !== 'mouse') return;
    pointerTarget.set(event.clientX / innerWidth - 0.5, event.clientY / innerHeight - 0.5);
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerleave', () => pointerTarget.set(0, 0));
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(container);

  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio, width < 700 ? 1.25 : 1.6));
    renderer.setSize(width, height);
  }
  new ResizeObserver(resize).observe(container);

  let lastFrame = performance.now();
  let elapsed = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    const delta = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    elapsed += delta;
    pointer.lerp(pointerTarget, 1 - Math.pow(0.001, delta));
    const drift = reduced ? 0 : Math.sin(elapsed * 0.45) * 0.035;
    sculpture.rotation.y = mix(-0.42, 0.36, progress) + pointer.x * 0.32;
    sculpture.rotation.x = -0.08 + pointer.y * 0.18;
    sculpture.rotation.z = drift + progress * 0.08;
    sculpture.position.y = mix(0.05, -0.65, progress) + drift;
    sculpture.scale.setScalar(mix(1, 0.82, progress));
    orbit.rotation.z += reduced ? 0 : delta * 0.08;
    smallOrbit.rotation.z -= reduced ? 0 : delta * 0.05;
    camera.position.z = mix(10.8, 9.5, progress);
    camera.lookAt(0, -0.08, 0);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  return {
    update(nextProgress) { progress = clamp(nextProgress); },
    setReduced(value) {
      reduced = value;
      if (value) pointerTarget.set(0, 0);
    }
  };
}
