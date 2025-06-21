// main.js
// Importar Three.js y ejemplos como módulos ES6 desde CDN (versión fija 0.150.1)
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/loaders/DRACOLoader.js';
import Stats from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/libs/stats.module.js';

// =============================================
// REFERENCIAS DOM
// =============================================
const loaderElement = document.getElementById('loader');
const loaderText = document.getElementById('loader-text');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const errorPanel = document.getElementById('error-panel');
const statsContainer = document.getElementById('stats');
const canvas = document.getElementById('scene');

let scene, camera, renderer, controls, stats;
let mainLight;
let anyModelLoaded = false; // para fallback

// =============================================
// CONFIGURACIÓN DE MODELOS
// =============================================
// Ajusta las rutas y extensiones reales. Asegúrate de que existan.
const butacasConfig = {
  path: 'https://6855fa47bf93d905f9d903c6--marvelous-tarsier-76efb4.netlify.app/butaca-s.glb',
  rows: 8,
  cols: 20,
  spacing: 1.8,
  startPosition: [0, 0, 15],
  scale: [1.5, 1.5, 1.5]
};

// driveModels: reemplaza con tus URLs o rutas locales
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

// =============================================
// UTILIDADES
// =============================================
function isWebGLAvailable() {
  try {
    const canvasTest = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvasTest.getContext('webgl') || canvasTest.getContext('experimental-webgl'))
    );
  } catch (e) {
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

// =============================================
// INICIALIZAR ESCENA, CÁMARA, RENDERER, CONTROLES, ILUMINACIÓN, STATS
// =============================================
function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a1a);
  scene.fog = new THREE.Fog(0x0a0a1a, 10, 100);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 8, 15);

  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
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

  // OrbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 5;
  controls.maxDistance = 30;
  controls.autoRotate = false;

  // Stats
  stats = Stats();
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.top = '0px';
  statsContainer.appendChild(stats.domElement);

  // Iluminación
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambientLight);

  mainLight = new THREE.DirectionalLight(0xffeedd, 2);
  mainLight.position.set(5, 15, 10);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 1024;
  mainLight.shadow.mapSize.height = 1024;
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

// =============================================
// CREAR BUTACAS (fallback si falla, se ignora)
// =============================================
function createButacas() {
  return new Promise((resolve) => {
    // Intentar cargar; si falla, se ignora y resolve()
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    dracoLoader.setDecoderConfig({ type: 'js' });

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    updateProgress(0, 'Cargando modelo de butacas...');

    gltfLoader.load(
      butacasConfig.path,
      (gltf) => {
        anyModelLoaded = true;
        const model = gltf.scene;
        const rows = butacasConfig.rows;
        const cols = butacasConfig.cols;
        const spacing = butacasConfig.spacing;
        const startX = - (cols * spacing) / 3;
        const startZ = butacasConfig.startPosition[2];

        model.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        for (let row = 0; row < rows; row++) {
          const rowCols = cols - row;
          const offsetX = row * spacing / 2;
          for (let col = 0; col < rowCols; col++) {
            const butaca = model.clone();
            butaca.position.set(
              startX + col * spacing + offsetX,
              butacasConfig.startPosition[1],
              startZ + row * spacing
            );
            butaca.scale.set(...butacasConfig.scale);
            scene.add(butaca);
          }
        }
        updateProgress(20, 'Butacas creadas');
        resolve();
      },
      (xhr) => {
        if (xhr.total) {
          const percent = (xhr.loaded / xhr.total) * 20;
          updateProgress(percent, 'Cargando modelo de butacas...');
        }
      },
      (error) => {
        console.warn('No se pudieron cargar butacas:', error);
        // Mostrar en consola, pero no bloquea
        resolve();
      }
    );
  });
}

// =============================================
// CARGA DE MODELOS ADICIONALES (Drive o locales)
// =============================================
function loadDriveModels() {
  return new Promise((resolve) => {
    const total = driveModels.length;
    if (total === 0) {
      resolve();
      return;
    }
    let loadedCount = 0;
    updateProgress(20, 'Cargando modelos adicionales...');

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    dracoLoader.setDecoderConfig({ type: 'js' });

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    driveModels.forEach(config => {
      if (!config.path || config.path.trim() === '') {
        console.warn(`Ruta vacía para modelo ${config.name}, omitiendo.`);
        loadedCount++;
        if (loadedCount === total) resolve();
        return;
      }
      gltfLoader.load(
        config.path,
        (gltf) => {
          anyModelLoaded = true;
          const model = gltf.scene;
          if (config.position) model.position.set(...config.position);
          if (config.rotation) model.rotation.set(...config.rotation);
          if (config.scale) model.scale.set(...config.scale);

          model.traverse(child => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                child.material.depthWrite = true;
                child.material.vertexColors = false;
              }
            }
          });

          scene.add(model);
          loadedCount++;
          const percent = 20 + (loadedCount / total * 80);
          updateProgress(percent, `Cargando ${config.name}...`);
          if (loadedCount === total) resolve();
        },
        (xhr) => {
          if (xhr.total) {
            const percent = 20 + ((loadedCount + xhr.loaded / xhr.total) / total * 80);
            updateProgress(percent, `Cargando ${config.name}...`);
          }
        },
        (error) => {
          console.warn(`No se pudo cargar ${config.name}:`, error);
          loadedCount++;
          if (loadedCount === total) resolve();
        }
      );
    });
  });
}

// =============================================
// FALLBACK: agregar un cubo si no se cargó ningún modelo
// =============================================
function addFallbackCube() {
  const geometry = new THREE.BoxGeometry(2, 2, 2);
  const material = new THREE.MeshStandardMaterial({ color: 0x44aa88 });
  const cube = new THREE.Mesh(geometry, material);
  cube.castShadow = true;
  cube.receiveShadow = true;
  scene.add(cube);
  anyModelLoaded = true;
  // Ajustar cámara para ver el cubo
  camera.position.set(5, 5, 5);
  camera.lookAt(cube.position);
}

// =============================================
// ANIMACIÓN Y REDIMENSIÓN
// =============================================
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
    const newSize = isMobile ? 512 : 1024;
    mainLight.shadow.mapSize.set(newSize, newSize);
  }
}

// =============================================
// INICIALIZACIÓN PRINCIPAL
// =============================================
async function init() {
  try {
    if (!isWebGLAvailable()) {
      const msg = 'Tu navegador no soporta WebGL. Actualiza o usa Chrome/Firefox.';
      showError(msg, true);
      throw new Error(msg);
    }
    initScene();
    const minLoaderTime = 3000;
    const startTime = performance.now();

    await createButacas();
    await loadDriveModels();

    // Si no se cargó nada, agregar cubo de fallback
    if (!anyModelLoaded) {
      console.warn('No se cargó ningún modelo, mostrando cubo de fallback.');
      addFallbackCube();
    }

    const elapsed = performance.now() - startTime;
    const remaining = Math.max(0, minLoaderTime - elapsed);
    setTimeout(() => {
      // Vista final: ajusta según escena real
      if (anyModelLoaded) {
        // Puedes personalizar la posición inicial de la cámara para tu escena:
        camera.position.set(0, 15, 40);
        camera.lookAt(0, 5, 15);
      }
      hideLoader();
    }, remaining);

    animate();
  } catch (error) {
    console.error('Error en init:', error);
    showError(`Error de inicialización: ${error.message}`, true);
  }
}

// Arrancar la app
init();
