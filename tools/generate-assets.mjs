import { mkdir, writeFile, cp } from "node:fs/promises";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { NodeIO } from "@gltf-transform/core";
import { KHRDracoMeshCompression } from "@gltf-transform/extensions";
import { draco } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";

globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
};
await mkdir("public/assets", { recursive: true });
const io = new NodeIO()
  .registerExtensions([KHRDracoMeshCompression])
  .registerDependencies({
    "draco3d.encoder": await draco3d.createEncoderModule(),
    "draco3d.decoder": await draco3d.createDecoderModule(),
  });
const exporter = new GLTFExporter();
const metal = new THREE.MeshStandardMaterial({
  color: 0xbfc6be,
  metalness: 1,
  roughness: 0.22,
});
const seed = new THREE.Group();
const geometry = new THREE.TorusKnotGeometry(1.12, 0.31, 280, 32, 2, 3);
geometry.scale(1, 1.17, 0.86);
const sculpture = new THREE.Mesh(geometry, metal);
sculpture.name = "Folded alloy";
seed.add(sculpture);
const rockGeometry = new THREE.IcosahedronGeometry(0.72, 3);
const positions = rockGeometry.attributes.position;
for (let i = 0; i < positions.count; i++) {
  const x = positions.getX(i),
    y = positions.getY(i),
    z = positions.getZ(i);
  const displacement =
    1 +
    0.13 * Math.sin(x * 9 + y * 5) * Math.cos(z * 8) +
    0.05 * Math.sin(y * 19);
  positions.setXYZ(
    i,
    x * displacement,
    y * displacement * 1.24,
    z * displacement * 0.8,
  );
}
rockGeometry.computeVertexNormals();
const rock = new THREE.Mesh(rockGeometry, metal);
rock.name = "Signal fragment";
const frame = new THREE.Mesh(
  new THREE.TorusGeometry(1.78, 0.012, 8, 180),
  metal,
);
frame.name = "Orbital frame";
for (const [name, object] of [
  ["seed", seed],
  ["fragment", rock],
  ["orbit", frame],
]) {
  const binary = await exporter.parseAsync(object, { binary: true });
  const document = await io.readBinary(new Uint8Array(binary));
  await document.transform(
    draco({ method: "edgebreaker", quantizePosition: 14 }),
  );
  await io.write(`public/assets/${name}.glb`, document);
}
// 외부 촬영 자산 없이 재생성 가능한 자체 제작 스튜디오 HDR 조명.
const width = 256,
  height = 128;
const pixels = Buffer.alloc(width * height * 4);
const gaussian = (x, y, cx, cy, sx, sy) =>
  Math.exp(-((x - cx) ** 2 / sx ** 2 + (y - cy) ** 2 / sy ** 2));
for (let y = 0; y < height; y++)
  for (let x = 0; x < width; x++) {
    const u = x / width,
      v = y / height;
    const softbox =
      12 * gaussian(u, v, 0.22, 0.37, 0.055, 0.28) +
      9 * gaussian(u, v, 0.72, 0.35, 0.08, 0.035) +
      5 * gaussian(u, v, 0.92, 0.43, 0.025, 0.3);
    const green = 2 * gaussian(u, v, 0.53, 0.52, 0.09, 0.2);
    const rgb = [
      0.045 + softbox + green * 0.55,
      0.05 + softbox + green,
      0.04 + softbox + green * 0.2,
    ];
    const exponent = Math.ceil(Math.log2(Math.max(...rgb)));
    const scale = 256 / 2 ** exponent;
    const offset = (y * width + x) * 4;
    pixels[offset] = Math.min(255, rgb[0] * scale);
    pixels[offset + 1] = Math.min(255, rgb[1] * scale);
    pixels[offset + 2] = Math.min(255, rgb[2] * scale);
    pixels[offset + 3] = exponent + 128;
  }
await writeFile(
  "public/assets/studio.hdr",
  Buffer.concat([
    Buffer.from(
      `#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${height} +X ${width}\n`,
    ),
    pixels,
  ]),
);
await cp("node_modules/three/examples/jsm/libs/draco/gltf", "public/draco", {
  recursive: true,
});
console.log("자체 제작 Draco GLB 3종, HDR 환경맵, 로컬 Draco 디코더 생성 완료");
