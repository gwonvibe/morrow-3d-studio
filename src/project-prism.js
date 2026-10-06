import * as THREE from 'three';

export async function initProjectPrism(section, projectElements) {
  const host = section.querySelector('#process-world');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, .1, 70);
  const loader = new THREE.TextureLoader();
  const textures = await Promise.all(projectElements.map((project) => loader.loadAsync(project.dataset.image)));
  textures.forEach((texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  });

  const imageMaterial = (texture) => new THREE.MeshStandardMaterial({ map: texture, roughness: .78, metalness: 0 });
  const sides = textures.map(imageMaterial);
  const top = new THREE.MeshStandardMaterial({ color: 0x8b806e, roughness: .7, metalness: .08 });
  const bottom = new THREE.MeshStandardMaterial({ color: 0x2d302b, roughness: .82 });
  // BoxGeometry 면 순서: right, left, top, bottom, front, back.
  const prism = new THREE.Mesh(new THREE.BoxGeometry(7.2, 4.6, 7.2), [sides[1], sides[3], top, bottom, sides[0], sides[2]]);
  prism.castShadow = true;
  prism.receiveShadow = true;
  prism.rotation.order = 'YXZ';
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xf3f0e8, transparent: true, opacity: .42 });
  prism.add(new THREE.LineSegments(new THREE.EdgesGeometry(prism.geometry), edgeMaterial));
  scene.add(prism);

  scene.add(new THREE.HemisphereLight(0xfffdf6, 0x595c54, 2.4));
  const key = new THREE.DirectionalLight(0xfff5e6, 3.1);
  key.position.set(-6, 9, 11);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 35 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xe5edf0, 1.3);
  rim.position.set(8, 2, 4);
  scene.add(rim);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 16), new THREE.ShadowMaterial({ color: 0x262820, opacity: .12 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.55;
  floor.receiveShadow = true;
  scene.add(floor);

  let width = 0;
  let height = 0;
  let lastPose;
  function render(pose = lastPose) {
    if (pose) {
      prism.rotation.y = THREE.MathUtils.degToRad(pose.rotationY);
      prism.rotation.x = THREE.MathUtils.degToRad(pose.rotationX);
      prism.position.y = .18 + pose.lift;
    }
    renderer.render(scene, camera);
  }
  function resize() {
    width = host.clientWidth;
    height = host.clientHeight;
    if (!width || !height) return;
    const mobile = width <= 700;
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.25 : 1.6));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = mobile ? 42 : 31;
    camera.position.set(0, mobile ? .4 : .2, mobile ? 17 : 14);
    prism.scale.setScalar(mobile ? .58 : .7);
    camera.updateProjectionMatrix();
    render();
  }
  new ResizeObserver(resize).observe(host);
  resize();

  return {
    update(pose) {
      lastPose = pose;
      render(pose);
    },
  };
}
