const clamp = (value) => Math.max(0, Math.min(1, value));
const smooth = (value) => { const t = clamp(value); return t * t * t * (t * (t * 6 - 15) + 10); };
const mix = (a, b, t) => a + (b - a) * t;
const span = (p, from, to) => smooth((p - from) / (to - from));

// 모든 장면은 스크롤 진행률 하나로 결정된다. 이전 상태를 기억하지 않으므로 역방향도 같은 자세로 돌아온다.

// Work: 세로 슬릿 → 넓은 프레임, 화면보다 큰 FOLD 02가 오른쪽에서 들어온다.
export function sampleWorkReveal(progress) {
  const p = clamp(progress), open = span(p, .3, .75);
  return {
    open,
    insetX: mix(46.5, 0, open), insetY: mix(9, 0, open),
    imageScale: mix(1.22, 1, open),
    typeX: mix(28, -48, span(p, 0, .58)) - 3 * span(p, .58, 1),
    typeY: mix(8, 0, span(p, 0, .42)),
    caption: span(p, .78, .95),
  };
}

// Material: 작품은 고정하고 프레이밍만 바꾼다. 콘텐츠 위치는 이미지 백분율 기준.
const framings = [
  { frame: [6, 0, 6, 0], scale: 1, x: 0, y: 0, ry: 0, depth: 0 },
  { frame: [0, 27, 0, 27], scale: 2.4, x: 12, y: -38, ry: -4.5, depth: 28 },
  { frame: [30, 0, 20, 0], scale: 1.6, x: 0, y: -30, ry: 3.5, depth: 18 },
];
export function sampleMaterial(progress) {
  const p = clamp(progress);
  const position = span(p, .26, .4) + span(p, .6, .74);
  const index = Math.min(1, Math.floor(position)), t = position - index;
  const a = framings[index], b = framings[index + 1];
  return {
    position,
    step: Math.round(position),
    frame: a.frame.map((value, i) => mix(value, b.frame[i], t)),
    scale: mix(a.scale, b.scale, t), x: mix(a.x, b.x, t), y: mix(a.y, b.y, t),
    ry: mix(a.ry, b.ry, t), depth: mix(a.depth, b.depth, t),
    // 두 콜아웃이 동시에 보이지 않도록 중간 지점에서 둘 다 0이 된다.
    callouts: framings.map((_, i) => clamp(1 - Math.abs(position - i) * 2)),
  };
}

// Recent projects: 세로 스크롤을 직육면체의 Y축 회전으로 바꾼다.
export function sampleProjectPrism(progress, count = 4) {
  const p = clamp(progress), at = p * (count - 1);
  const segment = Math.min(count - 2, Math.floor(at));
  const position = p === 1 ? count - 1 : segment + smooth(at - segment);
  const active = Math.round(position);
  return {
    position,
    active,
    rotationY: position * -90,
    rotationX: Math.sin(position * Math.PI) * -1.8,
    lift: Math.sin(position * Math.PI) * .16,
    entries: Array.from({ length: count }, (_, i) => i === active ? clamp(1 - Math.abs(position - i) * 1.6) : 0),
  };
}

// Studio: 섹션이 화면을 통과하는 동안의 진행률. 고정 없이 흐르는 본문과 함께 움직인다.
export function sampleStudio(progress) {
  const p = clamp(progress), e = smooth(p);
  return {
    rows: [mix(6, -20, e), mix(-24, 4, e), mix(2, -24, e)],
    mask: { rx: mix(20, 46, span(p, .1, .6)), ry: mix(30, 48, span(p, .1, .6)), cx: mix(60, 52, e), cy: mix(44, 50, e) },
    imageScale: mix(1.18, 1, span(p, .1, .7)),
    rotate: mix(-40, 220, p),
    tilt: mix(-3.5, 2.5, e),
  };
}

// Gallery: 세로 진행률을 가로 이동량(0~1)으로 바꾼다. 양 끝은 잠시 머문다.
export function sampleGallery(progress, count = 3) {
  const x = span(progress, .08, .92), at = x * (count - 1);
  return {
    x, active: Math.round(at),
    focus: Array.from({ length: count }, (_, i) => clamp(1 - Math.abs(at - i))),
    poses: Array.from({ length: count }, (_, i) => {
      const delta = Math.max(-1, Math.min(1, (i - at) / 1.25));
      const focus = clamp(1 - Math.abs(at - i));
      return { tilt: delta * -6, depth: focus * 42, lift: (1 - focus) * 12 };
    }),
  };
}

// Ending: 전면 이미지가 액자로 물러나고, 오프닝에서 열렸던 은빛 패널이 다시 닫힌다.
export function sampleEnding(progress) {
  const p = clamp(progress), frame = span(p, 0, .45);
  return {
    insetX: mix(0, 14, frame), insetY: mix(0, 10, frame),
    imageScale: mix(1.12, 1, frame),
    panel: mix(-100, 0, span(p, .3, .72)),
  };
}

// 모션 줄이기: 연속 이동 대신 단계마다 끊어서 보여준다.
export function quantize(progress, steps) {
  return Math.round(clamp(progress) * steps) / steps;
}
