import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// 고정된 받침과 액자에만 쓰는 접촉 음영. 움직이는 패널의 그림자는 실시간 조명이 맡는다.
function contactShade(width, height, softness, opacity) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(512, 256);
  const fullWidth = width + softness * 6, fullHeight = height + softness * 6;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 512; x++) {
    const dx = Math.max(0, Math.abs((x / 511 - .5) * fullWidth) - width / 2);
    const dy = Math.max(0, Math.abs((y / 255 - .5) * fullHeight) - height / 2);
    const i = (y * 512 + x) * 4;
    pixels.data[i] = 35; pixels.data[i + 1] = 29; pixels.data[i + 2] = 22;
    pixels.data[i + 3] = Math.round(255 * Math.exp(-(dx * dx + dy * dy) / (2 * softness * softness)));
  }
  ctx.putImageData(pixels, 0, 0);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(fullWidth, fullHeight), new THREE.MeshBasicMaterial({ map, transparent: true, opacity, depthWrite: false, toneMapped: false }));
}

function panelRibs(parent, count, width, height, position, material) {
  const geometry = new RoundedBoxGeometry(.012, height, .018, 1, .004);
  const ribs = new THREE.InstancedMesh(geometry, material, count);
  ribs.name = 'Panel_micro_ribs';
  const transform = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    transform.position.set(position.x - width / 2 + width * (i + .5) / count, position.y, position.z);
    transform.updateMatrix();
    ribs.setMatrixAt(i, transform.matrix);
  }
  ribs.instanceMatrix.needsUpdate = true;
  parent.add(ribs);
}

export function addPavilionDetails(model, scene) {
  const size = new THREE.Vector3();
  model.traverse((mesh) => {
    if (!mesh.isMesh || ['Front_graphic', 'Project_print', 'Rear_wall'].includes(mesh.name)) return;
    mesh.geometry.computeBoundingBox(); mesh.geometry.boundingBox.getSize(size);
    const old = mesh.geometry;
    mesh.geometry = new RoundedBoxGeometry(size.x, size.y, size.z, 2, mesh.name.startsWith('Base_') ? .018 : .008);
    old.dispose();
    if (mesh.name.startsWith('Base_')) {
      // 얇은 받침 면에 나뭇결 전체가 압축되지 않도록 실제 길이를 기준으로 UV를 잡는다.
      const { position, normal, uv } = mesh.geometry.attributes;
      for (let i = 0; i < position.count; i++) {
        const top = Math.abs(normal.getY(i)) > .8, end = Math.abs(normal.getX(i)) > .8;
        uv.setXY(i, (end ? position.getZ(i) : position.getX(i)) / 3 + .5, (top ? position.getZ(i) / 2 : position.getY(i) / .8) + .5);
      }
      uv.needsUpdate = true;
    }
  });

  const steel = new THREE.MeshStandardMaterial({ color: 0x9da1a0, metalness: 1, roughness: .28 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x393d39, metalness: .7, roughness: .46 });
  const boltGeometry = new THREE.CylinderGeometry(.024, .024, .011, 12);
  boltGeometry.rotateX(Math.PI / 2);
  const bolts = new THREE.InstancedMesh(boltGeometry, steel, 16);
  const transform = new THREE.Object3D(); let i = 0;
  for (const x of [-3.35, -1.63, 1.63, 3.35]) for (const y of [.63, .81, 4.49, 4.67]) {
    transform.position.set(x, y, .491); transform.updateMatrix(); bolts.setMatrixAt(i++, transform.matrix);
  }
  bolts.instanceMatrix.needsUpdate = true; model.add(bolts);
  const hinge = model.getObjectByName('Right_hinge');
  const pinGeometry = new THREE.CylinderGeometry(.043, .043, .24, 16);
  for (const y of [.43, 2.15, 3.87]) {
    const pin = new THREE.Mesh(pinGeometry, steel); pin.position.set(-.015, y, .025); hinge.add(pin);
    const leaf = new THREE.Mesh(new RoundedBoxGeometry(.14, .2, .014, 1, .006), dark);
    leaf.position.set(.065, y, .049); hinge.add(leaf);
  }
  const slider = model.getObjectByName('Front_slider');
  for (const x of [-1.44, 1.44]) {
    const bracket = new THREE.Mesh(new RoundedBoxGeometry(.11, .18, .045, 1, .008), steel);
    bracket.position.set(x, 4.24, -.04); slider.add(bracket);
  }
  panelRibs(model, 18, 1.48, 4.14, new THREE.Vector3(-2.48, 2.61, .366), steel);
  panelRibs(hinge, 18, 1.54, 4.14, new THREE.Vector3(.85, 2.15, .049), steel);

  const footGeometry = new RoundedBoxGeometry(.24, .035, .22, 2, .01);
  const feet = new THREE.InstancedMesh(footGeometry, dark, 4);
  const foot = new THREE.Object3D();
  [[-3.35, .46], [-3.35, -.9], [3.35, .46], [3.35, -.9]].forEach(([x, z], index) => {
    foot.position.set(x, .455, z); foot.updateMatrix(); feet.setMatrixAt(index, foot.matrix);
  });
  feet.instanceMatrix.needsUpdate = true; model.add(feet);

  const floorShade = contactShade(10.12, 3.42, .17, .42);
  floorShade.rotation.x = -Math.PI / 2; floorShade.position.set(-.65, -.011, 0); scene.add(floorShade);
  const frameShade = contactShade(2.64, 3.54, .045, .2);
  frameShade.position.set(.015, 2.625, -1.073); model.add(frameShade);
}
