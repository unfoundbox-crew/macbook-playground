/**
 * src/engine/renderer.js — WebGL renderer, camera, controls, lighting and the frame loop.
 *
 * createRenderer(canvas) → { renderer, scene, camera, controls, setBackground, renderOnce,
 *                            setRenderFn, onFrame, offFrame, start }
 * The loop runs frame hooks (fn(dt, t) in seconds), updates the controls, then calls renderFn.
 * Nothing here allocates per frame.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { VIEWS } from '../dims.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  const scene = new THREE.Scene();
  const background = new THREE.Color('#ffffff');
  scene.background = background;

  const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.005, 20);
  camera.position.fromArray(VIEWS.Hero.position);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.target.fromArray(VIEWS.Hero.target);
  controls.minDistance = 0.05;
  controls.maxDistance = 3;
  controls.maxPolarAngle = Math.PI / 2 + 0.19;
  controls.update();

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 1.0;
  pmrem.dispose();

  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(-0.6, 1.0, 0.8);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 0.3));

  function setBackground(color) {
    background.set(color);
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  });

  const hooks = [];
  function onFrame(fn) {
    if (!hooks.includes(fn)) hooks.push(fn);
  }
  function offFrame(fn) {
    const i = hooks.indexOf(fn);
    if (i >= 0) hooks.splice(i, 1);
  }

  let renderFn = () => renderer.render(scene, camera);
  function setRenderFn(fn) {
    renderFn = fn || (() => renderer.render(scene, camera));
  }

  const waiters = [];
  let running = false;
  let last = -1;

  function frame(timeMs) {
    const t = timeMs / 1000;
    const dt = last < 0 ? 0 : Math.min(t - last, 0.1);
    last = t;
    for (let i = 0; i < hooks.length; i++) hooks[i](dt, t);
    controls.update();
    renderFn();
    if (waiters.length) {
      for (let i = 0; i < waiters.length; i++) waiters[i]();
      waiters.length = 0;
    }
  }

  /** Resolves after the next frame has been drawn (draws one immediately if the loop is not running). */
  function renderOnce() {
    return new Promise((resolve) => {
      if (running) waiters.push(resolve);
      else {
        frame(performance.now());
        resolve();
      }
    });
  }

  function start() {
    if (running) return;
    running = true;
    renderer.setAnimationLoop(frame);
  }

  return { renderer, scene, camera, controls, setBackground, renderOnce, setRenderFn, onFrame, offFrame, start };
}
