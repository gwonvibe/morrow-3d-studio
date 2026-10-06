import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export const destinations = [
  { name: "Dune", title: "The quiet dune.", description: "바람이 지나간 자리에, 아직 이름 없는 풍경.\n문 하나를 지나 다른 감각을 만나보세요.", coordinates: "24° 18′ N   13° 06′ E", material: "BRUSHED ALUMINIUM · WARM LIGHT", sky: "#c8bca8", fog: "#d4c3a6", ground: "#b69a71", light: "#fff0d1", sun: "#fff4da" },
  { name: "Tidal", title: "Where the tide rests.", description: "물결 위에 잠시 머무는 은빛의 시간.\n고요한 수평선 끝에서 다음 문이 열립니다.", coordinates: "58° 42′ N   06° 12′ E", material: "POLISHED SILVER · DIFFUSED LIGHT", sky: "#263f44", fog: "#496c70", ground: "#26474d", light: "#d4eee4", sun: "#e4ebe0" },
  { name: "Nocturne", title: "After the last light.", description: "하루의 마지막 빛이 사라진 뒤의 푸른 고요.\n이 문을 지나면 따뜻한 모래로 돌아갑니다.", coordinates: "36° 09′ N   116° 48′ W", material: "DARK CHROME · MOONLIGHT", sky: "#172230", fog: "#485369", ground: "#343847", light: "#a7bce0", sun: "#f1e6d8" },
];
const vertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

function landscape(index) {
  const palette = destinations[index];
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.sky);
  scene.fog = new THREE.Fog(palette.fog, 12, 66);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 20), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color(palette.sky) }, bottom: { value: new THREE.Color(palette.fog) } },
    vertexShader: `varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform vec3 top;uniform vec3 bottom;varying vec3 vP;void main(){float y=normalize(vP).y;vec3 c=mix(bottom,top,smoothstep(-.05,.55,y));gl_FragColor=vec4(c,1.);}`,
  }));
  scene.add(sky);
  const geometry = new THREE.PlaneGeometry(180, 180, 220, 220);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i);
    const distance = Math.hypot(x - 2.1, z);
    const amplitude = THREE.MathUtils.smoothstep(distance, 2, 15);
    const dune = Math.sin(x * .22 + Math.sin(z * .095) * 2.8) * 2.1 + Math.sin(z * .16 + x * .065) * 1.25;
    const ripple = Math.sin(x * 3.2 + Math.sin(z * .55) * 3) * .022;
    positions.setY(i, -2.08 + (index === 1 ? dune * .08 + ripple * .7 : dune * amplitude + ripple));
  }
  geometry.computeVertexNormals();
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: palette.ground, metalness: index === 1 ? .68 : .08,
    roughness: index === 1 ? .24 : .88,
  });
  groundMaterial.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vTerrain;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvTerrain = position;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vTerrain;")
      .replace("#include <color_fragment>", `#include <color_fragment>
      float wind = sin(vTerrain.x * 19. + sin(vTerrain.z * .65) * 5. + vTerrain.z * 6.);
      float detail = .95 + .05 * wind;
      diffuseColor.rgb *= detail;`);
  };
  const ground = new THREE.Mesh(geometry, groundMaterial);
  ground.receiveShadow = true;
  scene.add(ground);
  const key = new THREE.DirectionalLight(palette.light, index === 2 ? 1.4 : 2.4);
  key.position.set(-8, 7, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: .5, far: 40 });
  key.shadow.bias = -.001;
  key.shadow.normalBias = .04;
  scene.add(key, new THREE.HemisphereLight(palette.light, palette.ground, index === 2 ? .7 : .95));
  const sun = new THREE.Mesh(new THREE.CircleGeometry(index === 2 ? 1.1 : 2, 64), new THREE.MeshBasicMaterial({ color: palette.sun, fog: false }));
  sun.position.set(index === 2 ? -12 : 15, index === 2 ? 12 : 9, -48);
  scene.add(sun);
  return scene;
}

export async function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  const mobile = () => innerWidth <= 650;
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile() ? 1.25 : 1.5));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  container.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, .1, 150);
  const previewCamera = new THREE.PerspectiveCamera(48, .59, .1, 150);
  previewCamera.position.set(0, .8, 10);
  previewCamera.lookAt(0, .2, -8);
  const scenes = destinations.map((_, i) => landscape(i));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04);
  scenes.forEach((scene) => { scene.environment = environment.texture; scene.environmentIntensity = .55; });
  room.dispose();
  pmrem.dispose();
  const portal = new THREE.Group();
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, 1.55, 2.4, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absellipse(0, 0, 1.28, 2.13, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const frameGeometry = new THREE.ExtrudeGeometry(shape, { depth: .34, bevelEnabled: true, bevelSegments: 5, steps: 1, bevelSize: .075, bevelThickness: .075, curveSegments: 120 });
  frameGeometry.translate(0, 0, -.17);
  const metal = new THREE.MeshPhysicalMaterial({ color: "#c4c8c4", metalness: 1, roughness: .26, clearcoat: .38, envMapIntensity: 1.6 });
  const frame = new THREE.Mesh(frameGeometry, metal);
  frame.castShadow = true;
  portal.add(frame);
  const trimMaterial = new THREE.MeshStandardMaterial({ color: "#dce1de", metalness: 1, roughness: .14 });
  // 윤곽을 겹쳐 금속 프레임의 두께와 모따기를 표현합니다.
  for (const depth of [-.23, .23]) {
    const curve = new THREE.EllipseCurve(0, 0, 1.565, 2.415);
    const points = curve.getPoints(160).map((point) => new THREE.Vector3(point.x, point.y, depth));
    const trim = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 160, .018, 6, true), trimMaterial);
    portal.add(trim);
  }
  const grooveMaterial = new THREE.MeshStandardMaterial({ color: "#656f6b", metalness: 1, roughness: .42 });
  const grooveGeometry = new THREE.BoxGeometry(.17, .006, .012);
  const grooves = new THREE.InstancedMesh(grooveGeometry, grooveMaterial, 144);
  const groove = new THREE.Object3D();
  for (let i = 0; i < 144; i++) {
    const angle = (i / 144) * Math.PI * 2;
    groove.position.set(Math.cos(angle) * 1.42, Math.sin(angle) * 2.27, .256);
    groove.rotation.z = Math.atan2(Math.sin(angle) / 2.27, Math.cos(angle) / 1.42);
    groove.updateMatrix();
    grooves.setMatrixAt(i, groove.matrix);
  }
  portal.add(grooves);
  const renderTarget = new THREE.WebGLRenderTarget(512, 864, { type: THREE.HalfFloatType });
  const opening = new THREE.Mesh(new THREE.CircleGeometry(1, 120), new THREE.MeshBasicMaterial({ map: renderTarget.texture }));
  opening.scale.set(1.28, 2.13, 1);
  opening.position.z = .015;
  portal.add(opening);
  const footShadow = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, vertexShader: vertex,
    fragmentShader: `varying vec2 vUv;void main(){vec2 p=(vUv-.5)*2.;float a=exp(-dot(p,p)*5.)*.42;gl_FragColor=vec4(.10,.09,.07,a);}`,
  }));
  footShadow.rotation.x = -Math.PI / 2;
  footShadow.position.y = -2.045;
  const composer = new EffectComposer(renderer);
  const pass = new RenderPass(scenes[0], camera);
  composer.addPass(pass);
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .11, .4, 1.8));
  composer.addPass(new OutputPass());
  let current = 0, paused = false, reduced = false, time = 0, dirty = true, advance = 0;
  const pointer = new THREE.Vector2(), target = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const pointerPosition = new THREE.Vector2();
  let onEnter = () => {};
  function setDestination(index) {
    current = index;
    scenes[index].add(portal, footShadow);
    pass.scene = scenes[index];
    metal.roughness = index === 1 ? .16 : .29;
    metal.color.set(index === 2 ? "#7b8591" : "#c4c8c4");
    dirty = true;
  }
  setDestination(0);
  window.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || paused || reduced) return;
    target.set(event.clientX / innerWidth - .5, event.clientY / innerHeight - .5);
    dirty = true;
  }, { passive: true });
  document.addEventListener("pointerleave", () => { target.set(0, 0); dirty = true; });
  window.addEventListener("scroll", () => { dirty = true; }, { passive: true });
  // 보이는 포털 면을 레이캐스팅하고, 키보드용 HTML 버튼도 유지합니다.
  window.addEventListener("click", (event) => {
    if (event.target.closest("button,a,dialog")) return;
    const canvasRect = container.getBoundingClientRect();
    pointerPosition.set((event.clientX - canvasRect.left) / canvasRect.width * 2 - 1, -(event.clientY - canvasRect.top) / canvasRect.height * 2 + 1);
    raycaster.setFromCamera(pointerPosition, camera);
    if (raycaster.intersectObject(opening).length) onEnter();
  });
  const resize = () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile() ? 1.25 : 1.5));
    renderer.setSize(container.clientWidth, container.clientHeight);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(container.clientWidth, container.clientHeight);
    dirty = true;
  };
  new ResizeObserver(resize).observe(container);
  const look = new THREE.Vector3();
  const projected = new THREE.Vector3();
  return {
    render(delta) {
      const moving = !paused && !reduced;
      if (!moving && !dirty && advance === 0) return;
      if (moving) time += delta;
      pointer.lerp(moving ? target : new THREE.Vector2(), 1 - Math.exp(-delta * 4));
      const isMobile = mobile();
      portal.position.set(isMobile ? 0 : 2.25, isMobile ? .25 : .42, 0);
      portal.scale.setScalar(isMobile ? .62 : 1);
      portal.rotation.set(pointer.y * .045, -.16 + pointer.x * .13 + (moving ? Math.sin(time * .18) * .018 : 0), -.055);
      footShadow.position.x = portal.position.x;
      camera.position.set(pointer.x * .18 + advance * portal.position.x, (isMobile ? 1.15 : 1.35) - advance * .6, (isMobile ? 12.8 : 11.8) - advance * 8.8);
      look.set(advance * portal.position.x, isMobile ? .7 : .4, 0);
      camera.lookAt(look);
      previewCamera.position.x = pointer.x * .18;
      renderer.setRenderTarget(renderTarget);
      renderer.render(scenes[(current + 1) % scenes.length], previewCamera);
      renderer.setRenderTarget(null);
      composer.render();
      projected.copy(portal.position).project(camera);
      const enter = document.querySelector("#enter");
      if (advance === 0) {
        const rect = document.querySelector("main").getBoundingClientRect();
        const canvasRect = container.getBoundingClientRect();
        enter.style.left = `${canvasRect.left + (projected.x * .5 + .5) * canvasRect.width - rect.left}px`;
        enter.style.top = `${canvasRect.top + (-projected.y * .5 + .5) * canvasRect.height - rect.top + (isMobile ? 58 : 86)}px`;
      }
      dirty = false;
    },
    setDestination,
    setAdvance(value) { advance = value; dirty = true; },
    setPaused(value) { paused = value; dirty = true; },
    setReduced(value) { reduced = value; pointer.set(0, 0); target.set(0, 0); dirty = true; },
    onEnter(callback) { onEnter = callback; },
    getStats() { return { current, paused, reduced, advance, time, triangles: renderer.info.render.triangles, calls: renderer.info.render.calls, camera: camera.position.toArray() }; },
  };
}
