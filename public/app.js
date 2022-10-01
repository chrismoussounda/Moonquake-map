import * as THREE from '/build/three.module.js';
import { OrbitControls } from '/jsm/controls/OrbitControls.js';
import Stats from '/jsm/libs/stats.module.js';
import { BufferGeometryUtils } from '/jsm/utils/BufferGeometryUtils.js';
import { EffectComposer } from '/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '/jsm/postprocessing/UnrealBloomPass.js';

// global variables

(async () => {
  const canvas = document.querySelector('.webgl');

  // scene setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.0001,
    1000
  );

  camera.position.set(0, 0, 5);
  scene.add(camera);
  // renderer setup
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(
    window.devicePixelRatio ? window.devicePixelRatio : 1
  );
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 0.0);
  renderer.updateShadowMap.enable = true;
  renderer.updateShadowMap.type = THREE.PCFSoftShadowMap;

  const renderScene = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    4,
    12,
    2
  );

  const bloomComposer = new EffectComposer(renderer);
  bloomComposer.setSize(window.innerWidth, window.innerHeight);
  bloomComposer.renderToScreen = true;
  bloomComposer.addPass(renderScene);
  bloomComposer.addPass(bloomPass);

  const control = new OrbitControls(camera, renderer.domElement);
  control.minDistance = 1.2;
  control.maxDistance = 1000;
  control.autoRotateSpeed = 1;
  control.keys = {
    LEFT: 'ArrowLeft',
    UP: 'ArrowUp',
    RIGHT: 'ArrowRight',
    BOTTOM: 'ArrowDown',
  };

  const moonGeometry = new THREE.SphereGeometry(1, 64, 64);

  const moonMaterial = new THREE.MeshPhongMaterial({
    map: THREE.ImageUtils.loadTexture(
      './textures/lroc_color_poles_8k.jpg'
    ),
    bumpMap: THREE.ImageUtils.loadTexture(
      './textures/ldem_16_uint.jpg'
    ),
    bumpScale: 0.2,
  });

  const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
  scene.add(moonMesh);
  const ambiantLight = new THREE.AmbientLightProbe(0xffffff, 0.2);
  scene.add(ambiantLight);

  const pointLight = new THREE.DirectionalLight(0xffffff, 0.6);
  pointLight.position.set(5, 5, 3);
  scene.add(pointLight);

  const galaxyGeometry = new THREE.SphereGeometry(40, 64, 64);
  const galaxyMaterial = new THREE.MeshPhongMaterial({
    map: THREE.ImageUtils.loadTexture(
      './textures/8k_stars_milky_way.jpg'
    ),
    side: THREE.BackSide,
    shininess: 0,
  });

  const galaxyMesh = new THREE.Mesh(galaxyGeometry, galaxyMaterial);
  scene.add(galaxyMesh);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.updateProjectionMatrix();
    bloomComposer.setSize(window.innerWidth, window.innerHeight);

    render();
  });
  const render = () => renderer.render(scene, camera);

  const latLongToVector3 = (lat, lon, radius, heigth) => {
    let phi = (lat * Math.PI) / 180;
    let theta = ((lon - 180) * Math.PI) / 180;
    var x = -(radius + heigth) * Math.cos(phi) * Math.cos(theta);
    var y = (radius + heigth) * Math.sin(phi);
    var z = (radius + heigth) * Math.cos(phi) * Math.sin(theta);
    return new THREE.Vector3(x, y, z);
  };

  const getVectors = (datas) =>
    datas.map((data) => latLongToVector3(data.Lat, data.Long, 1, 0));

  const res79 = await fetch('./data/nakamura_1979_sm_locations.json');
  const res83 = await fetch('./data/nakamura_1983_ai_locations.json');
  const res05 = await fetch('./data/nakamura_2005_dm_locations.json');
  const datas79 = await res79.json();
  const datas83 = await res83.json();
  const datas05 = await res05.json();

  const coord79Sm = getVectors(datas79);
  const coord83Ai = getVectors(datas83);
  const coord05Dm = getVectors(datas05);

  // material to use for each of our elements. Could use a set of materials to
  // add colors relative to the density. Not done here.
  const mat05Dm = new THREE.MeshLambertMaterial({
    color: 0x000000,
    opacity: 0.6,
    emissive: 0xff0000,
  });
  const mat79Sm = new THREE.MeshLambertMaterial({
    color: 0x000000,
    opacity: 0.6,
    emissive: 0x00ff00,
  });
  const mat83Ai = new THREE.MeshLambertMaterial({
    color: 0x000000,
    opacity: 0.6,
    emissive: 0x0000ff,
  });
  const boxes = [];
  const moon = new THREE.Object3D();
  const group = new THREE.Group();
  const group79Sm = new THREE.Group();
  const group83Ai = new THREE.Group();
  const group05Dm = new THREE.Group();
  coord79Sm.forEach((coord) => {
    // create the cube
    const mesh = new THREE.Mesh(
      new THREE.SphereBufferGeometry(0.008, 10, 10),
      mat79Sm
    );
    mesh.position.set(coord.x, coord.y, coord.z);
    group.add(mesh);
    group79Sm.add(mesh);
  });
  coord83Ai.forEach((coord) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereBufferGeometry(0.008, 10, 10),
      mat83Ai
    );
    mesh.position.set(coord.x, coord.y, coord.z);
    group.add(mesh);
    group83Ai.add(mesh);
  });
  coord05Dm.forEach((coord) => {
    // create the cube
    const mesh = new THREE.Mesh(
      new THREE.SphereBufferGeometry(0.008, 10, 10),
      mat05Dm
    );
    mesh.position.set(coord.x, coord.y, coord.z);
    group.add(mesh);
    group05Dm.add(mesh);
  });

  scene.add(group79Sm);
  scene.add(group83Ai);
  scene.add(group05Dm);
  const moonPivot = new THREE.Object3D();
  moonMesh.add(moonPivot);
  moonPivot.add(group79Sm);
  moonPivot.add(group83Ai);
  moonPivot.add(group05Dm);

  const mmi = MouseMesh;

  const animate = () => {
    requestAnimationFrame(animate);
    moonMesh.rotation.y -= 0.001;
    galaxyMesh.rotation.y -= 0.0011;
    camera.layers.set(1);
    bloomComposer.render();
    renderer.clearDepth();
    camera.layers.set(0);
    render();
  };
  animate();
})();
