import "./style.css";
import gsap from "gsap";
import { createScene, destinations } from "./scene.js";

const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
const main = document.querySelector("main");
const loading = document.querySelector("#loading");
const enter = document.querySelector("#enter");
const tabs = [...document.querySelectorAll("[data-scene]")];
const motion = document.querySelector("#motion");
const dialog = document.querySelector("#about");
const veil = document.querySelector("#veil");
let current = 0, busy = true, paused = motionPreference.matches, world, journey;
let last = performance.now();
const travel = { value: 0 };
function setBusy(value) {
  busy = value;
  main.setAttribute("aria-busy", String(value));
  enter.disabled = value;
  tabs.forEach((button) => { button.disabled = value; });
}
function renderLabels() {
  const scene = destinations[current];
  const next = destinations[(current + 1) % destinations.length];
  document.body.dataset.scene = String(current);
  document.querySelector("#scene-index").textContent = String(current + 1).padStart(2, "0");
  document.querySelector("#scene-title").textContent = scene.title;
  const description = document.querySelector("#scene-description");
  description.replaceChildren();
  scene.description.split("\n").forEach((line, index) => {
    if (index) description.append(document.createElement("br"));
    description.append(document.createTextNode(line));
  });
  document.querySelector("#coordinates").textContent = scene.coordinates;
  document.querySelector("#material-label").textContent = scene.material;
  document.querySelector(".enter-destination").textContent = `ENTER ${next.name.toUpperCase()}`;
  enter.setAttribute("aria-label", `문을 지나 ${next.name}로 이동`);
  tabs.forEach((button) => button.setAttribute("aria-pressed", String(Number(button.dataset.scene) === current)));
}
function finish() {
  travel.value = 0;
  world.setAdvance(0);
  gsap.set(veil, { opacity: 0 });
  gsap.set(".headline,.scene-story,.scene-spec,.portal-caption,.enter", { opacity: 1 });
  setBusy(false);
  document.querySelector("#announcement").textContent = `${destinations[current].name} 풍경으로 이동했습니다.`;
}
function navigate(index) {
  if (busy || index === current || !world) return;
  const focused = document.activeElement;
  setBusy(true);
  const commit = () => { current = index; world.setDestination(current); renderLabels(); };
  if (motionPreference.matches || paused) {
    commit();
    finish();
    if (focused instanceof HTMLElement) focused.focus({ preventScroll: true });
    return;
  }
  journey = gsap.timeline({ onComplete: () => {
    finish();
    if (focused instanceof HTMLElement) focused.focus({ preventScroll: true });
  } });
  journey.to(".headline,.scene-story,.scene-spec,.portal-caption,.enter", { opacity: 0, duration: .28 }, 0)
    .to(travel, { value: 1, duration: 1.05, ease: "power2.inOut", onUpdate: () => world.setAdvance(travel.value) }, 0)
    .to(veil, { opacity: 1, duration: .28, onComplete: commit }, .75)
    .call(() => { travel.value = 0; world.setAdvance(0); }, [], 1.04)
    .to(veil, { opacity: 0, duration: .65, ease: "power1.out" }, 1.07)
    .to(".headline,.scene-story,.scene-spec,.portal-caption,.enter", { opacity: 1, duration: .6, stagger: .045 }, 1.12);
}
tabs.forEach((button) => button.addEventListener("click", () => navigate(Number(button.dataset.scene))));
enter.addEventListener("click", () => navigate((current + 1) % destinations.length));
function syncMotion() {
  motion.setAttribute("aria-pressed", String(paused));
  motion.disabled = motionPreference.matches;
  motion.setAttribute("aria-label", motionPreference.matches ? "움직임 줄이기 설정 적용 중" : paused ? "움직임 재생" : "움직임 일시정지");
  motion.textContent = paused ? "▷" : "Ⅱ";
  world?.setPaused(paused);
}
motion.addEventListener("click", () => {
  paused = !paused;
  if (paused && journey?.isActive()) journey.progress(1);
  syncMotion();
});
motionPreference.addEventListener("change", () => {
  paused = motionPreference.matches;
  if (motionPreference.matches && journey?.isActive()) journey.progress(1);
  world?.setReduced(motionPreference.matches);
  syncMotion();
});
document.querySelector("#about-open").addEventListener("click", () => dialog.showModal());
dialog.addEventListener("click", (event) => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});
syncMotion();
try {
  world = await createScene(document.querySelector("#world"));
  world.setPaused(paused);
  world.setReduced(motionPreference.matches);
  world.onEnter(() => navigate((current + 1) % destinations.length));
  renderLabels();
  setBusy(false);
  loading.hidden = true;
  document.documentElement.dataset.ready = "true";
  function frame(now) {
    const delta = Math.min((now - last) / 1000, .05);
    last = now;
    if (!document.hidden) world.render(delta);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  if (!motionPreference.matches) gsap.from(".headline,.scene-story,.portal-caption,.enter", { opacity: 0, duration: 1.2, stagger: .14, clearProps: "opacity", ease: "power2.out" });
  window.morrow = { ready: true, stats: () => ({ ...world.getStats(), busy, destination: destinations[current].name }) };
} catch (error) {
  console.error("Morrow 장면 초기화 실패", error);
  loading.textContent = "3D를 표시할 수 없습니다. 새로고침하거나 다른 브라우저에서 열어주세요.";
  main.setAttribute("aria-busy", "false");
  enter.hidden = true;
  motion.disabled = true;
}
