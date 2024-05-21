import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
import { PointerLockControls } from "./PointerLockControls.js";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";
import * as CANNON from 'cannon-es';

// Crear el mundo de Cannon.js
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

// Crear el suelo en Cannon.js
const groundMaterial = new CANNON.Material();
const groundShape = new CANNON.Plane();
const groundBody = new CANNON.Body({ mass: 0, material: groundMaterial });
groundBody.addShape(groundShape);
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

// Crear la cámara en Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(-28.45931758375557, 1.3743563513191528, -44.543291626790186);

// Añadir controles de cámara
let controls = new PointerLockControls(camera, document.body);
document.addEventListener('click', () => controls.lock());

// Crear un cuerpo físico para la cámara
const cameraShape = new CANNON.Sphere(1.0);
const cameraBody = new CANNON.Body({ mass: 1 });
cameraBody.addShape(cameraShape);
cameraBody.position.set(camera.position.x, camera.position.y, camera.position.z);
world.addBody(cameraBody);

// Cargar un modelo 3D con GLTFLoader
let object;
const loader = new GLTFLoader();
loader.load(
  'models/u/scene.gltf',
  function (gltf) {
    object = gltf.scene;
    scene.add(object);
  },
  function (xhr) {
    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
  },
  function (error) {
    console.error(error);
  }
);

// Crear el renderizador de Three.js
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("container3D").appendChild(renderer.domElement);

// Añadir luces a la escena
const topLight = new THREE.DirectionalLight(0xffffff, 1);
topLight.position.set(500, 500, 500);
topLight.castShadow = true;
scene.add(topLight);

const ambientLightU = new THREE.AmbientLight(0x333333, 5);
scene.add(ambientLightU);

// Configurar controles táctiles y joystick
const sensitivity = 0.002;
let lastTouchX = null;
let lastTouchY = null;
renderer.domElement.addEventListener('touchstart', (e) => {
  const touch = e.touches[0];
  lastTouchX = touch.clientX;
  lastTouchY = touch.clientY;
});
renderer.domElement.addEventListener('touchmove', (e) => {
  if (e.touches.length === 1 && lastTouchX !== null && lastTouchY !== null) {
    const touch = e.touches[0];
    const deltaX = touch.clientX - lastTouchX;
    const deltaY = touch.clientY - lastTouchY;
    controls.getObject().rotation.y -= deltaX * sensitivity;
    controls.getObject().rotation.x -= deltaY * sensitivity;
    const xLimit = Math.PI / 2;
    controls.getObject().rotation.x = Math.max(
      -xLimit,
      Math.min(xLimit, controls.getObject().rotation.x)
    );
    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
  }
});
renderer.domElement.addEventListener('touchend', (e) => {
  lastTouchX = null;
  lastTouchY = null;
});

const joystickContainer = document.getElementById("joystick-container");
const joystick = document.getElementById("joystick");
let startPos = null;
let currentPos = null;
let isDragging = false;
joystickContainer.addEventListener("touchstart", (e) => {
  startPos = e.touches[0];
  currentPos = startPos;
  isDragging = true;
});
joystickContainer.addEventListener("touchmove", (e) => {
  if (!isDragging) return;
  const deltaX = e.touches[0].clientX - startPos.clientX;
  const deltaY = e.touches[0].clientY - startPos.clientY;
  const maxRadius = joystickContainer.clientWidth / 2;
  const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
  if (distance > maxRadius) {
    deltaX *= maxRadius / distance;
    deltaY *= maxRadius / distance;
  }
  joystick.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
  keys["KeyW"] = deltaY < 0;
  keys["KeyS"] = deltaY > 0;
  keys["KeyA"] = deltaX < 0;
  keys["KeyD"] = deltaX > 0;
});
joystickContainer.addEventListener("touchend", () => {
  isDragging = false;
  joystick.style.transform = "translate(-50%, -50%)";
  keys["KeyW"] = false;
  keys["KeyS"] = false;
  keys["KeyA"] = false;
  keys["KeyD"] = false;
});

// Configurar controles de teclado para movimiento WASD
const keys = {};
document.addEventListener('keydown', (event) => {
  keys[event.code] = true;
});
document.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

// Función para verificar colisiones usando raycasting
function checkCollision(position, direction) {
  const raycaster = new THREE.Raycaster();
  raycaster.set(position, direction);
  const intersects = raycaster.intersectObjects(scene.children, true);
  return intersects.length > 0 && intersects[0].distance < 1.5;
}

let movementSpeed = 0.5;

// Función de animación
function animate() {
  requestAnimationFrame(animate);
  world.step(1 / 60);

  const moveDirection = new THREE.Vector3();
  const horizontalDirection = new THREE.Vector3();
  camera.getWorldDirection(horizontalDirection);
  horizontalDirection.y = 0;
  horizontalDirection.normalize();

  if (keys['KeyW']) {
    movementSpeed = 0.5;
    moveDirection.add(horizontalDirection);
  }
  if (keys['KeyS']) {
    movementSpeed = 0.5;
    moveDirection.add(horizontalDirection.multiplyScalar(-1));
  }
  const left = new THREE.Vector3().crossVectors(camera.up, horizontalDirection);
  const right = new THREE.Vector3().crossVectors(horizontalDirection, camera.up);
  if (keys['KeyA']) {
    movementSpeed = 0.5;
    moveDirection.add(left);
  }
  if (keys['KeyD']) {
    movementSpeed = 0.5;
    moveDirection.add(right);
  }
  if (keys['ShiftLeft']) {
    movementSpeed = 1.5;
  }

  moveDirection.normalize().multiplyScalar(movementSpeed);
  cameraBody.velocity.set(moveDirection.x, cameraBody.velocity.y, moveDirection.z);

  camera.position.copy(cameraBody.position);

  renderer.render(scene, camera);
}

// Iniciar animación
animate();
