import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

function blackOakMap(renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d');
  const pixels = context.createImageData(512, 512);
  let seed = 91;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let y = 0; y < 512; y++) {
    const wave = Math.sin(y * .055) * 10 + Math.sin(y * .013) * 16;
    for (let x = 0; x < 512; x++) {
      const value = 112 + wave + (random() - .5) * 18;
      const offset = (y * 512 + x) * 4;
      pixels.data[offset] = pixels.data[offset + 1] = pixels.data[offset + 2] = value;
      pixels.data[offset + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1.2, 3.2);
  map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return map;
}

function chairProfile() {
  const shape = new THREE.Shape();
  shape.moveTo(-1.36, 1.78);
  shape.bezierCurveTo(-1.34, 1.42, -1.12, .84, -.78, .54);
  shape.bezierCurveTo(-.4, .2, .14, .22, .56, .4);
  shape.bezierCurveTo(.82, .52, 1.1, .62, 1.36, .58);
  shape.lineTo(1.32, .42);
  shape.bezierCurveTo(1.04, .43, .78, .37, .52, .28);
  shape.bezierCurveTo(.04, .1, -.51, .12, -.88, .42);
  shape.bezierCurveTo(-1.2, .7, -1.48, 1.28, -1.48, 1.69);
  shape.bezierCurveTo(-1.48, 1.78, -1.42, 1.82, -1.36, 1.78);
  shape.closePath();
  return shape;
}

export function addSculpturalChair(model, renderer) {
  const grain = blackOakMap(renderer);
  const oak = new THREE.MeshPhysicalMaterial({
    color: 0x141713,
    roughness: .36,
    metalness: .04,
    clearcoat: .32,
    clearcoatRoughness: .58,
    bumpMap: grain,
    bumpScale: .018,
    envMapIntensity: 1.15,
  });
  const leather = new THREE.MeshPhysicalMaterial({ color: 0x20231f, roughness: .58, clearcoat: .08, clearcoatRoughness: .8 });
  const group = new THREE.Group();
  group.name = 'Chair_001';
  group.position.set(.12, .42, -.28);
  group.scale.setScalar(1.12);

  const shellGeometry = new THREE.ExtrudeGeometry(chairProfile(), {
    depth: .96,
    bevelEnabled: true,
    bevelSegments: 7,
    bevelSize: .035,
    bevelThickness: .035,
    curveSegments: 42,
    steps: 1,
  });
  shellGeometry.translate(0, 0, -.48);
  shellGeometry.computeVertexNormals();
  const shell = new THREE.Mesh(shellGeometry, oak);
  shell.name = 'Chair_shell';
  shell.castShadow = true;
  shell.receiveShadow = true;
  group.add(shell);

  const cushion = new THREE.Mesh(new RoundedBoxGeometry(.66, .18, .82, 6, .065), leather);
  cushion.name = 'Chair_headrest';
  cushion.position.set(-1.08, 1.58, 0);
  cushion.rotation.z = -.43;
  cushion.castShadow = true;
  group.add(cushion);

  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(shellGeometry, 38),
    new THREE.LineBasicMaterial({ color: 0x454a43, transparent: true, opacity: .24 }),
  );
  edge.renderOrder = 2;
  group.add(edge);

  const support = new THREE.Mesh(new RoundedBoxGeometry(1.18, .12, .7, 4, .035), oak);
  support.name = 'Chair_support';
  support.position.set(.18, -.16, 0);
  support.castShadow = true;
  support.receiveShadow = true;
  group.add(support);

  model.getObjectByName('Project_print').visible = false;
  model.getObjectByName('Print_backing').visible = false;
  model.add(group);
  return group;
}
