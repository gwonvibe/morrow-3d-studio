import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleLetter, splitFormProgress, sampleFormDoor } from '../src/typography-motion.js';

test('글자는 흩어진 자세에서 시작하고 네 글자 모두 정확히 착지한다', () => {
  for (let i = 0; i < 4; i++) {
    const start = sampleLetter(0, i), end = sampleLetter(1, i);
    assert.ok(Math.abs(start.x) + Math.abs(start.y) > .5);
    assert.deepEqual(end, { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, scale: 1, progress: 1 });
  }
});
test('착지 경로는 역방향에도 동일하고 범위 밖 입력을 제한한다', () => {
  for (let i = 0; i < 4; i++) {
    const pose = sampleLetter(.54, i);
    sampleLetter(1, i);
    assert.deepEqual(sampleLetter(.54, i), pose);
    assert.deepEqual(sampleLetter(-1, i), sampleLetter(0, i));
    assert.deepEqual(sampleLetter(2, i), sampleLetter(1, i));
    for (let p = 0; p <= 1; p += .01) assert.ok(Object.values(sampleLetter(p, i)).every(Number.isFinite));
  }
});
test('순차 도착하되 마지막 구간에는 모든 글자가 멈춘다', () => {
  assert.ok(sampleLetter(.35, 0).progress > sampleLetter(.35, 3).progress);
  for (let i = 0; i < 4; i++) assert.equal(sampleLetter(.86, i).progress, 1);
});
test('FORM 0~75%는 기존 조립, 75~100%에서만 문이 열린다', () => {
  assert.deepEqual(splitFormProgress(0), { assemble: 0, door: 0 });
  assert.deepEqual(splitFormProgress(.75), { assemble: 1, door: 0 });
  assert.deepEqual(splitFormProgress(1), { assemble: 1, door: 1 });
  assert.equal(splitFormProgress(.375).assemble, .5);
  assert.deepEqual(splitFormProgress(-1), splitFormProgress(0));
  assert.deepEqual(splitFormProgress(2), splitFormProgress(1));
  for (let i = 0; i < 4; i++) assert.equal(sampleLetter(splitFormProgress(.7).assemble, i).progress, 1);
});
test('문 열림은 좌우로 갈라지며 확장하고, 닫힘/역방향은 같은 자세로 돌아온다', () => {
  for (let i = 0; i < 4; i++) {
    assert.deepEqual(sampleFormDoor(0, i), { x: 0, z: 0, ry: 0, scale: 1, progress: 0 });
    const open = sampleFormDoor(1, i), side = i < 2 ? -1 : 1;
    assert.ok(open.x * side >= .5 && open.scale > 2 && Math.sign(open.ry) === side);
    const mid = sampleFormDoor(.4, i);
    sampleFormDoor(1, i);
    assert.deepEqual(sampleFormDoor(.4, i), mid);
    let previous = 0;
    for (let d = 0; d <= 1.0001; d += .05) {
      const pose = sampleFormDoor(d, i);
      assert.ok(Math.abs(pose.x) >= previous && Object.values(pose).every(Number.isFinite));
      previous = Math.abs(pose.x);
    }
  }
});
