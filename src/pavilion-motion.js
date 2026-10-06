const clamp = (value) => Math.max(0, Math.min(1, value));
const smooth = (value) => { const t = clamp(value); return t * t * t * (t * (t * 6 - 15) + 10); };
const mix = (a, b, t) => a + (b - a) * t;
const vector = (a, b, t) => a.map((value, i) => mix(value, b[i], t));

// 동일한 진행률은 항상 동일한 자세를 만든다. 역방향 스크롤도 별도 상태가 없다.
export function sampleMotion(progress, compact = false) {
  const p = clamp(progress);
  const first = smooth(p * 2), second = smooth((p - .5) * 2);
  const start = compact ? [7, 5.2, 25] : [7, 4.4, 13.5];
  const middle = compact ? [3.5, 4.2, 22] : [3.6, 3.8, 12];
  const end = compact ? [.5, 4.5, 22] : [2.6, 3.3, 11.8];
  return {
    camera: p <= .5 ? vector(start, middle, first) : vector(middle, end, second),
    target: vector([-.3, 2.4, 0], compact ? [-.8, .8, 0] : [1.65, 2.5, 0], second),
    slide: mix(0, -1.4, first) + mix(0, -1.85, second),
    wing: mix(0, -.32, smooth(p)),
    copy: smooth((p - .72) / .23),
  };
}
