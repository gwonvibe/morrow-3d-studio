import './style.css';
import { brand } from './brand.js';
import { initScene } from './scene.js';

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smoothstep = (start, end, value) => {
  const amount = clamp((value - start) / (end - start));
  return amount * amount * (3 - 2 * amount);
};

function lines(value) {
  return String(value).split('\n').map((line) => document.createTextNode(line));
}

function setMultiline(element, value) {
  element.replaceChildren();
  lines(value).forEach((line, index) => {
    if (index) element.append(document.createElement('br'));
    element.append(line);
  });
}

function applyBrand() {
  const root = document.documentElement;
  Object.entries(brand.colors).forEach(([name, value]) => root.style.setProperty(`--${name}`, value));
  document.title = `${brand.name} — ${brand.descriptor}`;
  document.querySelector('meta[name="description"]').content = `${brand.name} — ${brand.heroStatement}`;
  document.querySelector('meta[name="theme-color"]').content = brand.colors.paper;

  document.querySelectorAll('[data-brand-name]').forEach((element) => { element.textContent = brand.name; });
  document.querySelector('[data-descriptor]').textContent = brand.descriptor;
  document.querySelector('[data-hero-statement]').textContent = brand.heroStatement;
  document.querySelector('[data-work-title]').textContent = brand.workTitle;
  document.querySelector('[data-work-intro]').textContent = brand.workIntro;
  document.querySelector('[data-about-word]').textContent = brand.aboutWord;
  setMultiline(document.querySelector('[data-about-title]'), brand.aboutTitle);
  document.querySelector('[data-about-body]').textContent = brand.aboutBody;
  document.querySelector('[data-industry]').textContent = brand.industry;
  document.querySelector('[data-location]').textContent = brand.location;
  document.querySelector('[data-founded]').textContent = brand.founded;
  setMultiline(document.querySelector('[data-contact-title]'), brand.contactTitle);
  document.querySelector('[data-footer-note]').textContent = brand.descriptor;
  const contact = document.querySelector('[data-contact-link]');
  contact.href = `mailto:${brand.contactEmail}`;
  contact.firstChild.textContent = `${brand.contactEmail} `;

  const title = document.querySelector('.hero-title');
  title.setAttribute('aria-label', brand.name);
  title.replaceChildren(...[...brand.name].map((letter, index) => {
    const span = document.createElement('span');
    span.textContent = letter === ' ' ? '\u00a0' : letter;
    span.style.setProperty('--i', index);
    return span;
  }));

  const list = document.querySelector('[data-projects]');
  list.replaceChildren(...brand.projects.map((project, index) => {
    const item = document.createElement('li');
    item.className = `project-card project-card-${index + 1} reveal`;
    item.innerHTML = `
      <figure class="project-visual" data-tilt>
        <img src="${project.image}" alt="${project.alt}" width="1536" height="1024" loading="lazy" decoding="async" />
        <span class="project-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
      </figure>
      <div class="project-meta">
        <h3>${project.title}</h3>
        <p>${project.type} · ${project.year}</p>
        <p>${project.description}</p>
      </div>`;
    return item;
  }));
}

applyBrand();

let sceneController;
try {
  sceneController = initScene(document.querySelector('#scene'), brand.colors);
  document.documentElement.classList.add('scene-ready');
} catch (error) {
  document.documentElement.classList.add('scene-fallback');
  console.error('3D 장면을 표시하지 못했습니다.', error);
}

const motionButton = document.querySelector('#motion-toggle');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let userReduced = false;

function updateMotion() {
  const reduced = userReduced || motionPreference.matches;
  document.documentElement.classList.toggle('reduce-motion', reduced);
  motionButton.setAttribute('aria-pressed', String(reduced));
  motionButton.textContent = reduced ? '모션 켜기' : '모션 줄이기';
  motionButton.disabled = motionPreference.matches;
  sceneController?.setReduced(reduced);
  updatePage();
}

motionButton.addEventListener('click', () => {
  userReduced = !userReduced;
  updateMotion();
});
motionPreference.addEventListener('change', updateMotion);

const letters = [...document.querySelectorAll('.hero-title span')];
const letterSeeds = letters.map((_, index) => ({
  x: (index % 2 ? 1 : -1) * (70 + index * 14),
  y: (index % 3 - 1) * 130 - 30,
  z: 360 + index * 95,
  rx: (index % 2 ? -1 : 1) * (42 + index * 4),
  ry: (index % 3 - 1) * 58
}));

function updateLetters(progress, reduced) {
  const settled = reduced ? 1 : smoothstep(0.02, 0.38, progress);
  letters.forEach((letter, index) => {
    const seed = letterSeeds[index];
    const remain = 1 - settled;
    letter.style.transform = `translate3d(${seed.x * remain}px, ${seed.y * remain}px, ${seed.z * remain}px) rotateX(${seed.rx * remain}deg) rotateY(${seed.ry * remain}deg)`;
    letter.style.opacity = String(0.12 + settled * 0.88);
  });
}

function updatePage() {
  const hero = document.querySelector('#hero');
  const distance = Math.max(1, hero.offsetHeight - innerHeight);
  const heroProgress = clamp(scrollY / distance);
  const reduced = document.documentElement.classList.contains('reduce-motion');
  updateLetters(heroProgress, reduced);
  sceneController?.update(heroProgress);
  document.documentElement.style.setProperty('--hero-progress', heroProgress.toFixed(4));
  const pageDistance = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  document.querySelector('.progress i').style.transform = `scaleX(${clamp(scrollY / pageDistance)})`;
}

let framePending = false;
window.addEventListener('scroll', () => {
  if (framePending) return;
  framePending = true;
  requestAnimationFrame(() => {
    updatePage();
    framePending = false;
  });
}, { passive: true });
window.addEventListener('resize', updatePage);

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.14 });
document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

document.querySelectorAll('[data-tilt]').forEach((card) => {
  card.addEventListener('pointermove', (event) => {
    if (document.documentElement.classList.contains('reduce-motion') || event.pointerType !== 'mouse') return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.setProperty('--ry', `${x * 7}deg`);
    card.style.setProperty('--rx', `${y * -6}deg`);
  });
  card.addEventListener('pointerleave', () => {
    card.style.setProperty('--ry', '0deg');
    card.style.setProperty('--rx', '0deg');
  });
});

updateMotion();
