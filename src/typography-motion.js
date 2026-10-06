const clamp = (value) => Math.max(0, Math.min(1, value));
const starts = [
  { x: -.62, y: .08, z: 260, rx: -.08, ry: -.62, rz: -.05 },
  { x: -.27, y: -.29, z: 310, rx: .12, ry: -.28, rz: .04 },
  { x: .28, y: .29, z: 360, rx: -.1, ry: .3, rz: -.04 },
  { x: .62, y: -.08, z: 410, rx: .08, ry: .62, rz: .05 },
];
const smoother = (value) => { const t = clamp(value); return t * t * t * (t * (t * 6 - 15) + 10); };

// FORM 구간 진행률을 0~75% 조립, 75~100% 문 열림으로 나눈다. 조립 경로 자체는 그대로 쓴다.
export function splitFormProgress(progress) {
  const p = clamp(progress), t = clamp((p - .75) / .25);
  return { assemble: clamp(p / .75), door: smoother(t) };
}

// F·O는 왼쪽, R·M은 오른쪽 문짝처럼 앞으로 커지며 바깥으로 회전해 화면 밖으로 빠진다.
const sides = [-1, -1, 1, 1];
export function sampleFormDoor(door, index) {
  const d = clamp(door), side = sides[index], outer = index === 0 || index === 3;
  if (d === 0) return { x: 0, z: 0, ry: 0, scale: 1, progress: 0 };
  return { x: side * (outer ? .58 : .74) * d, z: 260 * d, ry: side * 1.2 * d, scale: 1 + 1.4 * d, progress: d };
}

export function sampleLetter(progress, index) {
  const t = clamp((clamp(progress) - .05 - index * .06) / .6);
  const ease = smoother(t), remaining = 1 - ease;
  const from = starts[index];
  if (t === 1) return { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, scale: 1, progress: 1 };
  return {
    x: from.x * remaining, y: from.y * remaining, z: from.z * remaining,
    rx: from.rx * remaining, ry: from.ry * remaining, rz: from.rz * remaining,
    scale: .72 + .28 * ease, progress: ease,
  };
}
