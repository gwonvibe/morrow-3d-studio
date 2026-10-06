import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleMotion } from '../src/pavilion-motion.js';

test('시작과 도착, 범위 밖 스크롤', () => {
  assert.equal(sampleMotion(0).slide, 0);
  assert.equal(sampleMotion(1).slide, -3.25);
  assert.deepEqual(sampleMotion(-1), sampleMotion(0));
  assert.deepEqual(sampleMotion(2), sampleMotion(1));
});
test('앞뒤 스크롤은 같은 위치로 복귀한다', () => {
  const first = sampleMotion(.35);
  sampleMotion(.95);
  assert.deepEqual(sampleMotion(.35), first);
});
test('패널은 역행 없이 열리고 도착에서 설명이 나타난다', () => {
  let previous = 0;
  for (let i = 0; i <= 100; i++) {
    const state = sampleMotion(i / 100);
    assert.ok(state.slide <= previous);
    previous = state.slide;
    assert.ok(state.camera.every(Number.isFinite));
  }
  assert.equal(sampleMotion(0).copy, 0);
  assert.equal(sampleMotion(1).copy, 1);
});
test('중간 지점 연속성과 모바일 구도', () => {
  const a = sampleMotion(.5 - .0001), b = sampleMotion(.5 + .0001);
  assert.ok(Math.abs(a.slide - b.slide) < .01);
  assert.ok(sampleMotion(0, true).camera[2] > sampleMotion(0).camera[2]);
});
