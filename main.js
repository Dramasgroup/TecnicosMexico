// Función para verificar WebGL sin depender de Detector
function isWebGLAvailable() {
    try {
        const canvas = document.createElement('canvas');
        return !!(
            window.WebGLRenderingContext &&
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        );
    } catch (e) {
        return false;
    }
}

// Elementos UI
const loaderElement = document.getElementById('loader');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const errorPanel = document.getElementById('error-panel');
const statsContainer = document.getElementById('stats');

// Verificar WebGL
if (!isWebGLAvailable()) {
    const errorMessage = 'Tu navegador no soporta WebGL. Actualiza o usa Chrome/Firefox.';
    document.getElementById('error-panel').innerHTML = `
        <strong>Error Crítico:</strong> ${errorMessage}
        <button class="retry-btn" onclick="window.location.reload()">
            <i class="fas fa-sync-alt"></i> Reintentar
        </button>
    `;
    document.getElementById('error-panel').style.display = 'block';
    throw new Error(errorMessage);
}

// Escena principal
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);
scene.fog = new THREE.Fog(0x0a0a1a, 10, 100);

// Cámara
const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 8, 15);

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('scene'),
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

// Controles
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 5;
controls.maxDistance = 30;
controls.autoRotate = false;

// Iluminación
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffeedd, 2);
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

// Configuración de modelos
const modelConfigs = [
    { name: 'cabina', path: 'models/dir-cabina.glb', position: [0, 1.5, -25], rotation: [0, Math.PI, 0] },
    { name: 'techopar', path: 'models/techopar.glb', position: [0, 25, 0], rotation: [0, Math.PI, 0] },
    { name: 'pilar', path: 'models/pilar.glb', position: [-12, 0, -5], scale: [1, 1, 1] },
    { name: 'pilariz', path: 'models/pilariz.glb', position: [12, 0, -5], scale: [1, 1, 1] },
    { name: 'director', path: 'models/dir-cabina1.glb', position: [0, 4.5, -1.5], rotation: [0, Math.PI, 0] },
    { name: 'escenario', path: 'models/asdf.glb', position: [0, 0, 0], scale: [1.2, 1, 1.2] },
    { name: 'fachada', path: 'models/fach-muro1.glb', position: [0, 15, -25] },
    { name: 'focos', path: 'models/focos.glb', position: [0, 5.5, -1.5], scale: [0.8, 0.8, 0.8] }
];

// Cargador Draco
const dracoLoader = new THREE.DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
dracoLoader.setDecoderConfig({ type: 'js' });

const gltfLoader = new THREE.GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// Estadísticas
const stats = new Stats();
stats.domElement.style.position = 'absolute';
stats.domElement.style.top = '0px';
statsContainer.appendChild(stats.domElement);

// Funciones de utilidad
function updateProgress(percent, message) {
    const clampedPercent = Math.min(100, Math.max(0, percent));
    progressFill.style.width = `${clampedPercent}%`;
    progressText.textContent = `${Math.round(clampedPercent)}%`;
    if (message) document.querySelector('.loader-text').textContent = message;
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

// Carga de modelos
async function loadAllModels() {
    try {
        updateProgress(0, 'Iniciando carga...');
        
        for (let i = 0; i < modelConfigs.length; i++) {
            const config = modelConfigs[i];
            await new Promise((resolve) => {
                gltfLoader.load(
                    config.path,
                    (gltf) => {
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
                        updateProgress(((i + 1) / modelConfigs.length * 100), `Cargando ${config.name}...`);
                        resolve();
                    },
                    (xhr) => {
                        const percent = (i / modelConfigs.length * 100) + (xhr.loaded / xhr.total * (100 / modelConfigs.length));
                        updateProgress(percent, `Cargando ${config.name}...`);
                    },
                    (error) => {
                        console.error(`Error cargando ${config.name}:`, error);
                        showError(`Error cargando ${config.name}: ${error.message || 'Error de red'}`);
                        resolve();
                    }
                );
            });
        }
        
        return true;
    } catch (error) {
        console.error('Error crítico:', error);
        showError(`Error crítico: ${error.message}`, true);
        return false;
    }
}

// Eventos
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    const isMobile = window.innerWidth < 768;
    renderer.setPixelRatio(isMobile ? 1 : Math.min(2, window.devicePixelRatio));
    mainLight.shadow.mapSize.set(isMobile ? 512 : 1024);
});

// Animación
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    stats.update();
}

// Inicialización
async function init() {
    try {
        const minLoaderTime = 3000;
        const startTime = performance.now();
        
        const success = await loadAllModels();
        
        const elapsed = performance.now() - startTime;
        const remaining = Math.max(0, minLoaderTime - elapsed);
        
        setTimeout(() => {
            if (success) {
                camera.position.set(0, 15, 40);
                camera.lookAt(0, 5, 15);
                hideLoader();
            }
        }, remaining);
    } catch (error) {
        console.error('Error en init:', error);
        showError(`Error de inicialización: ${error.message}`, true);
    }
}

// Iniciar
init();
animate();