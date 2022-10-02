import * as THREE from '/build/three.module.js';
// import MouseMeshInteraction from '/build/three_mmi.js';
import { OrbitControls } from '/jsm/controls/OrbitControls.js';
import Stats from '/jsm/libs/stats.module.js';
import { BufferGeometryUtils } from '/jsm/utils/BufferGeometryUtils.js';
import { EffectComposer } from '/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '/jsm/postprocessing/UnrealBloomPass.js';

// MMIH

class MouseMeshInteractionHandler {
  constructor(mesh_name, handler_function) {
    this.mesh_name = mesh_name;
    this.handler_function = handler_function;
  }
}

class MouseMeshInteraction {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.updated = false;
    this.event = '';

    // last mesh that the mouse cursor was over
    this.last_mouseenter_mesh = undefined;
    // last mesh that the mouse was pressing down
    this.last_pressed_mesh = undefined;

    this.handlers = new Map();

    this.handlers.set('click', []);
    this.handlers.set('dblclick', []);
    this.handlers.set('contextmenu', []);

    this.handlers.set('mousedown', []);
    this.handlers.set('mouseup', []);
    this.handlers.set('mouseenter', []);
    this.handlers.set('mouseleave', []);

    window.addEventListener('mousemove', this);

    window.addEventListener('click', this);
    window.addEventListener('dblclick', this);
    window.addEventListener('contextmenu', this);

    window.addEventListener('mousedown', this);
  }

  handleEvent(e) {
    switch (e.type) {
      case 'mousemove':
        {
          this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
          this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
          this.updated = true;
          this.event = 'motion';
        }
        break;
      default: {
        this.updated = true;
        this.event = e.type;
      }
    }
  }

  addHandler(mesh_name, event_type, handler_function) {
    if (this.handlers.has(event_type)) {
      this.handlers
        .get(event_type)
        .push(
          new MouseMeshInteractionHandler(mesh_name, handler_function)
        );
    }
  }

  update() {
    if (this.updated) {
      // update the picking ray with the camera and mouse position
      this.raycaster.setFromCamera(this.mouse, this.camera);

      // calculate objects intersecting the picking ray
      const intersects = this.raycaster.intersectObjects(
        this.scene.children,
        true
      );

      if (intersects.length > 0) {
        // special test for events: 'mouseenter', 'mouseleave'
        if (this.event === 'motion') {
          let mouseenter_handlers = this.handlers.get('mouseenter');
          let mouseleave_handlers = this.handlers.get('mouseleave');

          if (mouseleave_handlers.length > 0) {
            for (const handler of mouseleave_handlers) {
              // if mesh was entered by mouse previously, but not anymore, that means it has been mouseleave'd
              if (
                this.last_mouseenter_mesh !== undefined &&
                intersects[0].object !== this.last_mouseenter_mesh &&
                handler.mesh_name === this.last_mouseenter_mesh.name
              ) {
                handler.handler_function(this.last_mouseenter_mesh);
                break;
              }
            }
          }

          if (mouseenter_handlers.length > 0) {
            for (const handler of mouseenter_handlers) {
              if (
                handler.mesh_name === intersects[0].object.name &&
                intersects[0].object !== this.last_mouseenter_mesh
              ) {
                this.last_mouseenter_mesh = intersects[0].object;
                handler.handler_function(intersects[0].object);
                break;
              }
            }
          }
        } else {
          // if mouseup event has occurred
          if (
            this.event === 'click' &&
            this.last_pressed_mesh === intersects[0].object
          ) {
            for (const handler of this.handlers.get('mouseup')) {
              if (handler.mesh_name === intersects[0].object.name) {
                handler.handler_function(intersects[0].object);
                break;
              }
            }
            this.last_pressed_mesh = undefined;
          }

          // for mouseup event handler to work
          if (this.event === 'mousedown') {
            this.last_pressed_mesh = intersects[0].object;
          }

          let handlers_of_event = this.handlers.get(this.event);
          for (const handler of handlers_of_event) {
            if (handler.mesh_name === intersects[0].object.name) {
              handler.handler_function(intersects[0].object);
              break;
            }
          }
        }
      }
      // if mouse doesn't intersect any meshes
      else if (this.event === 'motion') {
        // special test for 'mouseleave' event
        // 			(since it may be triggered when cursor doesn't intersect with any meshes)
        for (const handler of this.handlers.get('mouseleave')) {
          // if mesh was entered by mouse previously, but not anymore, that means it has been mouseleave'd
          if (
            this.last_mouseenter_mesh !== undefined &&
            handler.mesh_name === this.last_mouseenter_mesh.name
          ) {
            handler.handler_function(this.last_mouseenter_mesh);
            this.last_mouseenter_mesh = undefined;
            break;
          }
        }
      }

      this.updated = false;
    }
  }
}

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

  const mmi = new MouseMeshInteraction(scene, camera);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    4,
    12,
    0
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
  moonMesh.name = 'moon';
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
    mesh.name = 'smPoint';
    mesh.position.set(coord.x, coord.y, coord.z);
    group.add(mesh);
    group79Sm.add(mesh);
  });
  coord83Ai.forEach((coord) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereBufferGeometry(0.008, 10, 10),
      mat83Ai
    );
    mesh.name = 'aiPoint';
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
    mesh.name = 'dmPoint';
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

  mmi.addHandler('dmPoint', 'mouseenter', (e) => {
    console.log(e);
  });
  mmi.addHandler('smPoint', 'mouseenter', (e) => {
    console.log(e);
  });
  mmi.addHandler('aiPoint', 'mouseenter', (e) => {
    console.log(e);
  });
  mmi.addHandler('dmPoint', 'click', (e) => {
    console.log(e);
  });
  mmi.addHandler('smPoint', 'click', (e) => {
    console.log(e);
  });
  mmi.addHandler('aiPoint', 'click', (e) => {
    console.log(e);
  });
  const animate = () => {
    requestAnimationFrame(animate);
    moonMesh.rotation.y -= 0.001;
    galaxyMesh.rotation.y -= 0.0011;
    camera.layers.set(1);
    mmi.update();
    bloomComposer.render();
    renderer.clearDepth();
    camera.layers.set(0);
    render();
  };
  animate();
})();
