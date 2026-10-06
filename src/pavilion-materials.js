import * as THREE from 'three';

// 작은 표면 요철만 절차적으로 만든다. 목재와 내부 작업물은 별도 이미지 자산이다.
function grainMap(brushed = false) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const pixels = ctx.createImageData(512, 512);
  let seed = 37;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const lines = Array.from({ length: 512 }, () => random());
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const value = 128 + (brushed ? (lines[x] - .5) * 24 : 0) + (random() - .5) * (brushed ? 8 : 22);
    const i = (y * 512 + x) * 4;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
    pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(brushed ? 3 : 5, brushed ? 1 : 5);
  return map;
}

export async function applyPavilionMaterials(model, renderer) {
  const loader = new THREE.TextureLoader();
  const [wood, artwork] = await Promise.all([
    loader.loadAsync('/assets/pavilion-walnut.webp'),
    loader.loadAsync('/assets/pavilion-chair.webp'),
  ]);
  for (const map of [wood, artwork]) {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  }
  wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
  // 코드 생성 GLB의 평면 UV 방향을 유지한다.
  const grain = grainMap(true), plaster = grainMap();
  const metal = new THREE.MeshPhysicalMaterial({ color: 0xc5c8c9, metalness: 1, roughness: .48, roughnessMap: grain, bumpMap: grain, bumpScale: .004, clearcoat: .12, clearcoatRoughness: .34, envMapIntensity: 1.25 });
  const frame = new THREE.MeshPhysicalMaterial({ color: 0xa7aaac, metalness: 1, roughness: .2, clearcoat: .2, clearcoatRoughness: .24, envMapIntensity: 1.35 });
  const rear = new THREE.MeshStandardMaterial({ color: 0xd7d2c7, roughness: .94, bumpMap: plaster, bumpScale: .012, envMapIntensity: .55 });
  const walnut = new THREE.MeshPhysicalMaterial({ map: wood, color: 0xb9a38c, roughness: .42, bumpMap: wood, bumpScale: .011, clearcoat: .18, clearcoatRoughness: .72, envMapIntensity: .9 });
  model.traverse((mesh) => {
    if (!mesh.isMesh) return;
    if (mesh.name.startsWith('Base_')) mesh.material = walnut;
    else if (/^(Post_|Roof_rail_|Crossbar_)/.test(mesh.name) || mesh.name === 'Print_backing') mesh.material = frame;
    else if (mesh.name === 'Rear_wall') mesh.material = rear;
    else if (['Left_fixed_panel', 'Right_wing', 'Front_panel'].includes(mesh.name)) mesh.material = metal;
  });
  const print = model.getObjectByName('Project_print');
  print.material = new THREE.MeshStandardMaterial({ map: artwork, roughness: .82 });
  print.castShadow = false;
  return plaster;
}

export function addGallery(scene) {
  const stone = grainMap();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), new THREE.MeshStandardMaterial({ color: 0xcac5b9, roughness: .72, bumpMap: stone, bumpScale: .025 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.02; floor.receiveShadow = true; scene.add(floor);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(80, 25, .3), new THREE.MeshStandardMaterial({ color: 0xdcd7cb, roughness: .94, bumpMap: stone, bumpScale: .014 }));
  wall.position.set(0, 12.4, -5); wall.receiveShadow = true; scene.add(wall);

  const window = new THREE.Group(); window.position.set(-8.5, 4.7, 0);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(10, 9), new THREE.MeshBasicMaterial({ color: 0xf5f5f0, side: THREE.DoubleSide }));
  pane.rotation.y = Math.PI / 2; window.add(pane);
  const trim = new THREE.MeshStandardMaterial({ color: 0x787b76, metalness: .55, roughness: .4 });
  for (const z of [-5, -2.5, 0, 2.5, 5]) {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(.12, 9, .07), trim);
    mullion.position.set(.04, 0, z); window.add(mullion);
  }
  for (const y of [-4.5, -1.5, 1.5, 4.5]) {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(.12, .07, 10), trim);
    mullion.position.set(.04, y, 0); window.add(mullion);
  }
  scene.add(window);

  // 창틀 무늬를 조명의 투사 맵으로 사용한다. 패널과 바닥에는 실제 그림자가 더해진다.
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = '#171717';
  for (const x of [0, 170, 340, 505]) ctx.fillRect(x, 0, 7, 512);
  for (const y of [0, 255, 505]) ctx.fillRect(0, y, 512, 7);
  const sunlight = new THREE.SpotLight(0xfff1da, 300, 0, .68, .16, 2);
  sunlight.position.set(-7.5, 8, 3.5); sunlight.target.position.set(1, 0, -1.8);
  sunlight.map = new THREE.CanvasTexture(canvas);
  sunlight.castShadow = true; sunlight.shadow.mapSize.set(2048, 2048);
  sunlight.shadow.normalBias = .025; sunlight.shadow.bias = -.0001;
  sunlight.shadow.radius = 3;
  scene.add(sunlight, sunlight.target);
}
