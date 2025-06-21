// IMPORTS desde CDN: NUNCA usar import 'three' directo
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/loaders/DRACOLoader.js';
import Stats from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/libs/stats.module.js';

// Verificación rápida en consola
console.log('Three.js versión:', THREE.REVISION);

const loaderElement = document.getElementById('loader');
const loaderText = document.getElementById('loader-text');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const errorPanel = document.getElementById('error-panel');
const statsContainer = document.getElementById('stats');
const canvas = document.getElementById('scene');

let scene, camera, renderer, controls, stats;
let mainLight;
let anyModelLoaded = false;

// CONFIGURACIÓN DE MODELOS (mantén tus URLs reales aquí)
const butacasConfig = {
  path: 'https://6855fa47bf93d905f9d903c6--marvelous-tarsier-76efb4.netlify.app/butaca-s.glb',
  rows: 8,
  cols: 20,
  spacing: 1.8,
  startPosition: [0, 0, 15],
  scale: [1.5, 1.5, 1.5]
};

const driveModels = [
  {
    name: 'muro1-s',
    path: 'https://6855fa47bf93d905f9d903c6--marvelous-tarsier-76efb4.netlify.app/muro1-s.glb',
    position: [0, 1.5, -25],
    rotation: [0, Math.PI, 0],
    scale: [1, 1, 1]
  },
  {
    name: 'techopar',
    path: 'https://6855fa47bf93d905f9d903c6--marvelous-tarsier-76efb4.netlify.app/techopar-s.glb',
    position: [0, 25, 0],
    rotation: [0, Math.PI, 0],
    scale: [1, 1, 1]
  },
  {
    name: 'pilar',
    path: 'https://6855fa47bf93d905f9d903c6--marvelous-tarsier-76efb4.netlify.app/pilar-s.gltf',
    position: [-12, 0, -5],
    scale: [1, 1, 1]
  },
  {
    name: 'pilariz',
    path: 'https://6855fa47bf93d905f9d903c6--marvelous-tarsier-76efb4.netlify.app/pilariz-s.glb',
    position: [12, 0, -15],
    scale: [1, 1, 1]
  },
  {
    name: 'director',
    path: 'https://6855fa47bf93d905f9d903c6--marvelous-tarsier-76efb4.netlify.app/dir-s.glb',
    position: [0, 4.5, -1.5],
    rotation: [0, Math.PI, 0],
    scale: [1, 1, 1]
  },
  {
    name: 'escenario',
    // Si GitHub Pages, reemplaza por URL absoluta:
    // path: 'https://usuario.github.io/TuRepositorio/models/escenario.glb'
    path: 'models/escenario.glb',
    position: [0, 0, 0],
    scale: [1.2, 1, 1.2]
  },
  {
    name: 'fachada',
    path: 'https://6855fa47bf93d905f9d903c6--marvelous-tarsier-76efb4.netlify.app/asdf.glb',
    position: [0, 15, -25],
    scale: [1, 1, 1]
  },
  {
    name: 'mur2-',
    path: 'models/focos.glb',
    position: [0, 5.5, -1.5],
    scale: [0.8, 0.8, 0.8]
  }
];

function isWebGLAvailable() {
  try {
    const canvasTest = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvasTest.getContext('webgl') || canvasTest.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

function updateProgress(percent, message) {
  const clamped = Math.min(100, Math.max(0, percent));
  progressFill.style.width = `${clamped}%`;
  progressText.textContent = `${Math.round(clamped)}%`;
  if (message) loaderText.textContent = message;
}

function showError(message, isFatal = false) {
  errorPanel.style.display = 'block';
  errorPanel.innerHTML = `
    <strong>${isFatal ? 'Error Crítico' : 'Advertencia'}:</strong> ${message}
    <button class="retry-btn" onclick="window.location.reload()">
      <i class="fas fa-sync-alt"></i> Reintentar
    </button>
  `;
  if (isFatal) loaderElement.style.background = 'rgba(10, 10, 26, 0.9)';
}

function hideLoader() {
  loaderElement.style.opacity = '0';
  setTimeout(() => loaderElement.style.display = 'none', 500);
}

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a1a);
  scene.fog = new THREE.Fog(0x0a0a1a, 10, 100);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 10, 60);
  camera.lookAt(0, 5, 0);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 5;
  controls.maxDistance = 100;

  stats = Stats();
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.top = '0px';
  statsContainer.appendChild(stats.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambientLight);

  mainLight = new THREE.DirectionalLight(0xffeedd, 2);
  mainLight.position.set(5, 15, 10);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.set(1024, 1024);
  mainLight.shadow.camera.near = 1;
  mainLight.shadow.camera.far = 50;
  mainLight.shadow.normalBias = 0.05;
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0x6688cc, 0.8);
  fillLight.position.set(-5, 5, -5);
  scene.add(fillLight);

  const backLight = new THREE.DirectionalLight(0x445588, 0.5);
  backLight.position.set(0, 5, -10);
  scene.add(backLight);

  window.addEventListener('resize', onWindowResize);
}

function createButacas() {
  return new Promise(resolve => {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    dracoLoader.setDecoderConfig({ type: 'js' });
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    updateProgress(0, 'Cargando butacas...');
    gltfLoader.load(
      butacasConfig.path,
      gltf => {
        anyModelLoaded = true;
        const model = gltf.scene;
        model.traverse(c => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });
        const { rows, cols, spacing, startPosition, scale } = butacasConfig;
        const startX = - (cols * spacing) / 3;
        const startZ = startPosition[2];
        for (let row = 0; row < rows; row++) {
          const rowCols = cols - row;
          const offsetX = row * spacing / 2;
          for (let col = 0; col < rowCols; col++) {
            const butaca = model.clone();
            butaca.position.set(
              startX + col * spacing + offsetX,
              startPosition[1],
              startZ + row * spacing
            );
            butaca.scale.set(...scale);
            scene.add(butaca);
          }
        }
        updateProgress(20, 'Butacas listas');
        resolve();
      },
      xhr => {
        if (xhr.total) {
          const percent = (xhr.loaded / xhr.total) * 20;
          updateProgress(percent, 'Cargando butacas...');
        }
      },
      error => {
        console.warn('Error al cargar butacas:', error);
        resolve();
      }
    );
  });
}

function loadDriveModels() {
  return new Promise(resolve => {
    const total = driveModels.length;
    if (total === 0) return resolve();
    let loadedCount = 0;
    updateProgress(20, 'Cargando modelos adicionales...');
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    dracoLoader.setDecoderConfig({ type: 'js' });
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    driveModels.forEach(config => {
      if (!config.path) {
        loadedCount++;
        if (loadedCount === total) resolve();
        return;
      }
      gltfLoader.load(
        config.path,
        gltf => {
          anyModelLoaded = true;
          const model = gltf.scene;
          if (config.position) model.position.set(...config.position);
          if (config.rotation) model.rotation.set(...config.rotation);
          if (config.scale) model.scale.set(...config.scale);
          model.traverse(c => {
            if (c.isMesh) {
              c.castShadow = true;
              c.receiveShadow = true;
              if (c.material) {
                c.material.depthWrite = true;
                c.material.vertexColors = false;
              }
            }
          });
          scene.add(model);
          loadedCount++;
          const percent = 20 + (loadedCount / total * 80);
          updateProgress(percent, `Cargando ${config.name}...`);
          if (loadedCount === total) resolve();
        },
        xhr => {
          if (xhr.total) {
            const percent = 20 + ((loadedCount + xhr.loaded / xhr.total) / total * 80);
            updateProgress(percent, `Cargando ${config.name}...`);
          }
        },
        error => {
          console.warn(`Error al cargar ${config.name}:`, error);
          loadedCount++;
          if (loadedCount === total) resolve();
        }
      );
    });
  });
}

function addFallbackCube() {
  const geo = new THREE.BoxGeometry(2, 2, 2);
  const mat = new THREE.MeshStandardMaterial({ color: 0x44aa88 });
  const cube = new THREE.Mesh(geo, mat);
  cube.castShadow = true;
  cube.receiveShadow = true;
  scene.add(cube);
  anyModelLoaded = true;
  camera.position.set(5, 5, 5);
  camera.lookAt(cube.position);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
  stats.update();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  const isMobile = window.innerWidth < 768;
  renderer.setPixelRatio(isMobile ? 1 : Math.min(2, window.devicePixelRatio));
  if (mainLight && mainLight.shadow && mainLight.shadow.map) {
    const size = isMobile ? 512 : 1024;
    mainLight.shadow.mapSize.set(size, size);
  }
}

async function init() {
  try {
    if (!isWebGLAvailable()) {
      const msg = 'WebGL no disponible. Usa un navegador actualizado.';
      showError(msg, true);
      throw new Error(msg);
    }
    initScene();
    const minLoaderTime = 3000;
    const start = performance.now();

    await createButacas();
    await loadDriveModels();

    if (!anyModelLoaded) {
      console.warn('No se cargó ningún modelo; mostrando cubo de fallback.');
      addFallbackCube();
    }

    const elapsed = performance.now() - start;
    const delay = Math.max(0, minLoaderTime - elapsed);
    setTimeout(() => {
      if (anyModelLoaded) {
        camera.position.set(0, 15, 40);
        camera.lookAt(0, 5, 15);
      }
      hideLoader();
    }, delay);

    animate();
  } catch (err) {
    console.error('Init error:', err);
    showError(`Error de inicialización: ${err.message}`, true);
  }
}

init();
