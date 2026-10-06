import { mkdir, writeFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => { this.result = result; this.onloadend?.(); });
  }
};
const root = new THREE.Group();
root.name = 'Aether_Pavilion';
const clay = new THREE.MeshStandardMaterial({ name: 'Clay', color: 0xc9c6bf, roughness: .8 });
const edge = new THREE.MeshStandardMaterial({ name: 'Frame', color: 0x737571, roughness: .65 });
const base = new THREE.MeshStandardMaterial({ name: 'Podium', color: 0x96928a, roughness: .9 });
const paper = new THREE.MeshStandardMaterial({ name: 'Paper', color: 0xf0ede4, roughness: .95 });
function box(name, size, position, material = clay, parent = root) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}
box('Base_lower', [10.2, .22, 3.5], [-.65, .11, 0], base);
box('Base_upper', [9.2, .22, 2.85], [-.35, .33, -.1], base);
box('Rear_wall', [6.7, 4.4, .14], [0, 2.64, -1.15]);
for (const x of [-3.35, -1.63, 1.63, 3.35]) {
  box(`Post_${x}`, [.065, 4.4, .065], [x, 2.64, .45], edge);
  box(`Roof_rail_${x}`, [.065, .065, 1.66], [x, 4.82, -.34], edge);
}
for (const y of [.5, 4.8]) box(`Crossbar_${y}`, [6.8, .065, .065], [0, y, .45], edge);
box('Left_fixed_panel', [1.62, 4.3, .07], [-2.48, 2.61, .32]);
const wing = new THREE.Group();
wing.name = 'Right_hinge';
wing.position.set(1.72, .46, .38);
root.add(wing);
box('Right_wing', [1.7, 4.3, .075], [.85, 2.15, 0], clay, wing);
const slider = new THREE.Group();
slider.name = 'Front_slider';
slider.position.set(0, .48, .84);
root.add(slider);
box('Front_panel', [3.2, 4.23, .09], [0, 2.115, 0], paper, slider);
const label = new THREE.Mesh(new THREE.PlaneGeometry(3.12, 4.15), paper);
label.name = 'Front_graphic';
label.position.set(0, 2.115, .051);
slider.add(label);
box('Print_backing', [2.65, 3.55, .05], [0, 2.64, -1.01], edge);
const print = new THREE.Mesh(new THREE.PlaneGeometry(2.55, 3.45), paper);
print.name = 'Project_print';
print.position.set(0, 2.64, -.975);
root.add(print);
const binary = await new GLTFExporter().parseAsync(root, { binary: true });
await mkdir('public/assets', { recursive: true });
await writeFile('public/assets/pavilion-blockout.glb', Buffer.from(binary));
console.log(`pavilion-blockout.glb 생성: ${binary.byteLength} bytes / 슬라이더·힌지 분리`);
