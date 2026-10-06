import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleWorkReveal, sampleMaterial, sampleProjectPrism, sampleStudio, sampleGallery, sampleEnding, quantize } from '../src/story-motion.js';

const samplers = [sampleWorkReveal, sampleMaterial, sampleProjectPrism, sampleStudio, sampleGallery, sampleEnding];
const finite = (value) => typeof value === 'boolean' || (Array.isArray(value) ? value.every(finite) : typeof value === 'object' ? Object.values(value).every(finite) : Number.isFinite(value));

test('모든 장면은 같은 진행률에 같은 상태를 내고 범위 밖을 제한한다', () => {
  for (const sample of samplers) {
    const mid = sample(.43);
    sample(.97); sample(.1);
    assert.deepEqual(sample(.43), mid);
    assert.deepEqual(sample(-2), sample(0));
    assert.deepEqual(sample(3), sample(1));
    for (let p = 0; p <= 1; p += .01) assert.ok(finite(sample(p)));
  }
});
test('Work는 세로 슬릿에서 넓은 프레임으로 열리고 FOLD 02가 절제된 궤도로 이동한다', () => {
  const slit = sampleWorkReveal(0), wide = sampleWorkReveal(1);
  assert.ok(100 - slit.insetX * 2 < 10 && slit.insetY > 0);
  assert.equal(wide.insetX, 0); assert.equal(wide.insetY, 0); assert.equal(wide.imageScale, 1);
  assert.ok(slit.typeX >= 25 && wide.typeX <= -48);
  assert.equal(slit.caption, 0); assert.equal(wide.caption, 1);
  let previous = 101;
  for (let p = 0; p <= 1; p += .02) { const { insetX } = sampleWorkReveal(p); assert.ok(insetX <= previous); previous = insetX; }
});
test('Material은 3단계 프레이밍이 서로 다르고 콜아웃은 한 번에 하나만 보인다', () => {
  const steps = [0, .5, 1].map(sampleMaterial);
  assert.deepEqual(steps.map((s) => s.step), [0, 1, 2]);
  assert.equal(new Set(steps.map((s) => JSON.stringify([s.frame, s.scale, s.x, s.y]))).size, 3);
  steps.forEach((s, i) => assert.deepEqual(s.callouts, [0, 1, 2].map((j) => (i === j ? 1 : 0))));
  for (let p = 0; p <= 1; p += .005) assert.ok(sampleMaterial(p).callouts.filter((o) => o > 0).length <= 1);
});
test('Recent projects 직육면체는 네 면을 90도씩 회전하며 하나의 프로젝트만 활성화한다', () => {
  const centers = [0, 1, 2, 3].map((i) => sampleProjectPrism(i / 3));
  assert.deepEqual(centers.map(({ active }) => active), [0, 1, 2, 3]);
  assert.deepEqual(centers.map(({ rotationY }) => rotationY || 0), [0, -90, -180, -270]);
  centers.forEach((pose, i) => {
    assert.equal(pose.entries.filter((opacity) => opacity > 0).length, 1);
    assert.equal(pose.entries[i], 1);
  });
  let previous = 0;
  for (let p = 0; p <= 1; p += .005) {
    const pose = sampleProjectPrism(p);
    assert.ok(pose.rotationY <= previous);
    assert.ok(pose.entries.filter((opacity) => opacity > 0).length <= 1);
    previous = pose.rotationY;
  }
});
test('Studio 마스크는 타원으로 남고 원형 캡션은 진행률에 따라 회전한다', () => {
  const start = sampleStudio(0), end = sampleStudio(1);
  assert.ok(end.mask.rx > start.mask.rx && end.mask.rx < 50 && end.mask.rx !== end.mask.ry);
  assert.ok(end.rotate > start.rotate);
  assert.ok(start.rows[0] > end.rows[0] && start.rows[1] < end.rows[1]);
});
test('Gallery는 첫·마지막 프레임에서 머물고 각 프레임을 차례로 지난다', () => {
  const start = sampleGallery(0), end = sampleGallery(1);
  assert.deepEqual({ x: start.x, active: start.active, focus: start.focus }, { x: 0, active: 0, focus: [1, 0, 0] });
  assert.deepEqual(sampleGallery(.05), sampleGallery(0));
  assert.deepEqual({ x: end.x, active: end.active, focus: end.focus }, { x: 1, active: 2, focus: [0, 0, 1] });
  assert.ok(start.poses[0].depth > start.poses[1].depth && end.poses[2].depth > end.poses[1].depth);
  assert.equal(sampleGallery(.5).active, 1);
  let previous = 0;
  for (let p = 0; p <= 1; p += .01) { const { x } = sampleGallery(p); assert.ok(x >= previous); previous = x; }
});
test('Ending은 전면 이미지에서 액자로 물러나며 패널이 닫힌다', () => {
  assert.deepEqual(sampleEnding(0), { insetX: 0, insetY: 0, imageScale: 1.12, panel: -100 });
  const end = sampleEnding(1);
  assert.equal(end.panel, 0); assert.ok(end.insetX > 0);
});
test('모션 줄이기 단계화는 결정적이다', () => {
  assert.equal(quantize(.24, 2), 0); assert.equal(quantize(.26, 2), .5); assert.equal(quantize(2, 2), 1);
});
