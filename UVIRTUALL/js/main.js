//Import the THREE.js library
import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
// To allow for the camera to move around the scene
import { PointerLockControls } from "./PointerLockControls.js";
// To allow for importing the .gltf file
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";

// Crear la escena, cámara y renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(-40.55047238258363, 1.3743563513191528, -36.83054421594724);

//Keep the 3D object on a global variable so we can access it later
let object;

//Set which object to render
let objToRender = 'u';

//Instantiate a loader for the .gltf file
const loader = new GLTFLoader();

//Load the file
loader.load(
  `models/${objToRender}/scene.gltf`,
  function (gltf) {
    //If the file is loaded, add it to the scene
    object = gltf.scene;
    scene.add(object);
  },
  function (xhr) {
    //While it is loading, log the progress
    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
  },
  function (error) {
    //If there is an error, log it
    console.error(error);
  }
);

//Instantiate a new renderer and set its size
const renderer = new THREE.WebGLRenderer({ alpha: true }); //Alpha: true allows for the transparent background
renderer.setSize(window.innerWidth, window.innerHeight);


//Add the renderer to the DOM
document.getElementById("container3D").appendChild(renderer.domElement);

//Add lights to the scene, so we can actually see the 3D model
const topLight = new THREE.DirectionalLight(0xffffff, 1); // (color, intensity)
topLight.position.set(500, 500, 500) //top-left-ish
topLight.castShadow = true;
scene.add(topLight);


const ambientLightU = new THREE.AmbientLight(0x333333, objToRender === "u" ? 5 : 1);
scene.add(ambientLightU);

document.body.appendChild(renderer.domElement);


let controls = new PointerLockControls(camera, renderer.domElement);

// Pointer Lock para mantener el mouse en el área de renderizado
renderer.domElement.addEventListener('click', () => {
  controls.lock();
});


// Configurar la sensibilidad para los controles táctiles
const sensitivity = 0.002;

// Para almacenar la posición del toque anterior
let lastTouchX = null;
let lastTouchY = null;

// Para habilitar el bloqueo táctil, como una alternativa al pointer lock
renderer.domElement.addEventListener('touchstart', (e) => {
  const touch = e.touches[0];
  lastTouchX = touch.clientX;
  lastTouchY = touch.clientY;
});

// Para mover la cámara con el movimiento táctil
renderer.domElement.addEventListener('touchmove', (e) => {
  if (e.touches.length === 1 && lastTouchX !== null && lastTouchY !== null) {
    const touch = e.touches[0];
    
    // Calcular la diferencia entre el toque actual y el anterior
    const deltaX = touch.clientX - lastTouchX;
    const deltaY = touch.clientY - lastTouchY;

    // Aplicar la rotación a la cámara
    controls.getObject().rotation.y -= deltaX * sensitivity; // Rotar sobre el eje Y
    controls.getObject().rotation.x -= deltaY * sensitivity; // Rotar sobre el eje X
    
    // Limitar la rotación en el eje X para evitar giros completos
    const xLimit = Math.PI / 2; // 90 grados como máximo
    controls.getObject().rotation.x = Math.max(
      -xLimit,
      Math.min(xLimit, controls.getObject().rotation.x)
    );

    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
  }
});

// Limpiar la posición del toque cuando el toque termina
renderer.domElement.addEventListener('touchend', (e) => {
  lastTouchX = null;
  lastTouchY = null;
});

// Joystick analógico para controlar el movimiento
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
  
  // Limitar el movimiento del joystick dentro del container
  const maxRadius = joystickContainer.clientWidth / 2;
  const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

  if (distance > maxRadius) {
    deltaX *= maxRadius / distance;
    deltaY *= maxRadius / distance;
  }

  joystick.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

  // Direcciones de movimiento
  keys["KeyW"] = deltaY < 0; // Arriba
  keys["KeyS"] = deltaY > 0; // Abajo
  keys["KeyA"] = deltaX < 0; // Izquierda
  keys["KeyD"] = deltaX > 0; // Derecha
});

joystickContainer.addEventListener("touchend", () => {
  isDragging = false;
  joystick.style.transform = "translate(-50%, -50%)";
  keys["KeyW"] = false;
  keys["KeyS"] = false;
  keys["KeyA"] = false;
  keys["KeyD"] = false;
});

// Movimiento con teclas WASD en un plano horizontal
const keys = {};
document.addEventListener('keydown', (event) => {
    keys[event.code] = true;
});
document.addEventListener('keyup', (event) => {
    keys[event.code] = false;
});

// Función para actualizar el movimiento con WASD
function updateMovement() {
    let speed = 0.5; // Velocidad de movimiento
    const moveDirection = new THREE.Vector3(); // Dirección del movimiento

    // Obtener la dirección horizontal de la cámara (ignorando el componente Y)
    const horizontalDirection = new THREE.Vector3();
    camera.getWorldDirection(horizontalDirection); // Dirección actual de la cámara
    horizontalDirection.y = 0; // Ignorar el componente vertical para movimiento horizontal
    horizontalDirection.normalize(); // Normalizar para mantener consistencia

    // Movimiento hacia adelante/atrás según la dirección horizontal
    if (keys['KeyW']) {
        moveDirection.add(horizontalDirection); // Avanzar
    }

    if (keys['KeyS']) {
        moveDirection.add(horizontalDirection.multiplyScalar(-1)); // Retroceder
    }

    // Movimiento hacia la izquierda/derecha según la dirección horizontal
    const left = new THREE.Vector3().crossVectors(camera.up, horizontalDirection); // Vector hacia la izquierda
    const right = new THREE.Vector3().crossVectors(horizontalDirection, camera.up); // Vector hacia la derecha

    if (keys['KeyA']) {
        moveDirection.add(left); // Moverse hacia la izquierda
    }

    if (keys['KeyD']) {
        moveDirection.add(right); // Moverse hacia la derecha
    }

    if (keys['ShiftLeft']) {
      speed = 1.5;
  }
    // Normalizar para mantener velocidad constante en movimientos diagonales
    moveDirection.normalize().multiplyScalar(speed);

    // Aplicar el movimiento a la posición de la cámara
    camera.position.add(moveDirection);
}

//Render the scene
function animate() {
  requestAnimationFrame(animate);
  updateMovement();
  renderer.render(scene, camera);
}

//Start the 3D rendering
animate();