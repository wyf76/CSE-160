// main.js
// WOW FEATURE: Added full cue-ball physics, scoring, timer, AND decorative scene
// geometry (lamp posts + textured rails + custom OBJ model) as extra polish.
// Also: added yellow spheres along all rails, a “Life Lost!” flash, and a restart feature.

import * as THREE        from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MTLLoader }     from "three/addons/loaders/MTLLoader.js";
import { OBJLoader }     from "three/addons/loaders/OBJLoader.js";

// 0. Game Configuration & Global State

const NUM_TARGET_CUBES = 8;
const TABLE_LENGTH     = 20;
const TABLE_WIDTH      = 10;
const BALL_RADIUS      = 0.5;
const CUBE_SIZE        = 1.0;
const INITIAL_LIVES    = 3;
const INITIAL_TIME     = 120; // in seconds

// Physics parameters
const BALL_FRICTION = 0.98;       // How quickly the ball slows down
const BALL_BOUNCE_FACTOR = -0.8;  // Energy retained on collision with rails

let score    = 0;
let lives    = INITIAL_LIVES;
let timeLeft = INITIAL_TIME;
let gameOver = false;
let gameWon  = false;

const targetCubes = [];
let playerBall    = null;

// DOM elements for UI updates
const scoreboard = document.getElementById('scoreboard');
const livesDiv   = document.getElementById('lives');
const timerDiv   = document.getElementById('timer');
const messageDiv = document.getElementById('message'); // For game messages like "Life Lost!", "You Win!"

// 1. Scene Setup: Fog and Background/Environment

const scene = new THREE.Scene();
scene.fog  = new THREE.FogExp2(0x555555, 0.015); // Adds a bit of atmospheric depth

let skyTexture = null; // To hold our environment map
const equirectLoader = new THREE.TextureLoader();
equirectLoader.load(
  '../assets/billiard_hall.jpg', // Equirectangular image for the skybox
  (texture) => {
    texture.mapping    = THREE.EquirectangularReflectionMapping; // Correct mapping for environment
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.background   = texture; // Set as visible background
    scene.environment  = texture; // Set for reflections on materials
    skyTexture         = texture; // Store for use in materials if needed later
  },
  undefined,
  (err) => console.error('Error loading billiard_hall.jpg:', err)
);

// 2. Cameras: Perspective and Orthographic Views

const perspCam = new THREE.PerspectiveCamera(
  75, // Field of view
  window.innerWidth / window.innerHeight, // Aspect ratio
  0.1,  // Near clipping plane
  1000  // Far clipping plane
);
perspCam.position.set(0, 15, 25);
perspCam.lookAt(0, 0, 0);

// Factory function for the orthographic camera (useful for resize)
function makeOrthoCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  const frustumSize = 30;
  const orthoCamInstance = new THREE.OrthographicCamera(
    (-frustumSize * aspect) / 2, (frustumSize * aspect) / 2,
     frustumSize / 2, -frustumSize / 2,
    0.1, 1000
  );
  orthoCamInstance.position.set(0, 20, 0); // Top-down view
  orthoCamInstance.lookAt(0, 0, 0);
  orthoCamInstance.up.set(0, 1, 0); // Ensure 'up' is correct for top-down
  return orthoCamInstance;
}
let orthoCam   = makeOrthoCamera();
let activeCam  = perspCam; // Start with perspective view

// 3. Renderer: Displays the Scene

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x333333); // Dark gray background if skybox fails
renderer.shadowMap.enabled = true; // Enable shadows
document.body.appendChild(renderer.domElement);

// 4. Table Elements: Felt and Rails

// 4.1 Table Felt (the playing surface)
const feltGeo = new THREE.PlaneGeometry(TABLE_LENGTH, TABLE_WIDTH);
const feltMat = new THREE.MeshStandardMaterial({
  color: 0x0a4d0a, // Dark green
  roughness: 0.8,
  metalness: 0.1,
  envMap: skyTexture, // Subtle reflections from the environment
  envMapIntensity: 0.2
});
const felt = new THREE.Mesh(feltGeo, feltMat);
felt.rotation.x    = -Math.PI / 2; // Lay it flat
felt.receiveShadow = true; // Felt should receive shadows
scene.add(felt);

// 4.2 Wood-Textured Rails
const woodTexLoader = new THREE.TextureLoader();
const woodTexture = woodTexLoader.load(
  '../assets/wood.jpg',
  (tex) => {
    tex.wrapS = THREE.RepeatWrapping; // Allow texture to repeat
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 1); // How many times to repeat
  },
  undefined,
  (err) => console.error('Error loading wood.jpg:', err)
);
const railMat = new THREE.MeshStandardMaterial({
  map: woodTexture,
  roughness: 0.7,
  metalness: 0.2,
  envMap: skyTexture,
  envMapIntensity: 0.1
});

// Rail dimensions
const railThickness = 1;
const railHeight    = 1;

// Left Rail
const leftRailGeo = new THREE.BoxGeometry(railThickness, railHeight, TABLE_WIDTH + railThickness * 2);
const leftRail = new THREE.Mesh(leftRailGeo, railMat);
leftRail.position.set(-TABLE_LENGTH / 2 - railThickness / 2, railHeight / 2, 0);
leftRail.castShadow = true;
leftRail.receiveShadow = true;
scene.add(leftRail);

// Right Rail (clone of left)
const rightRail = leftRail.clone();
rightRail.position.x = TABLE_LENGTH / 2 + railThickness / 2;
scene.add(rightRail);

// Top Rail
const topRailGeo = new THREE.BoxGeometry(TABLE_LENGTH + railThickness * 2, railHeight, railThickness);
const topRail = new THREE.Mesh(topRailGeo, railMat);
topRail.position.set(0, railHeight / 2, -(TABLE_WIDTH / 2 + railThickness / 2));
topRail.castShadow = true;
topRail.receiveShadow = true;
scene.add(topRail);

// Bottom Rail (clone of top)
const bottomRail = topRail.clone();
bottomRail.position.z = TABLE_WIDTH / 2 + railThickness / 2;
scene.add(bottomRail);

// 4.3 Decorative Lamp Post (adds to scene ambiance)
{ // Block scope for lamp post variables
  const cylGeo = new THREE.CylinderGeometry(0.2, 0.2, 3, 16);
  const cylMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc, roughness: 0.2, metalness: 0.8,
    envMap: skyTexture, envMapIntensity: 0.3
  });
  const lampPost = new THREE.Mesh(cylGeo, cylMat);
  lampPost.position.set(TABLE_LENGTH / 2 + 1, 1.5, TABLE_WIDTH / 2 + 1);
  lampPost.castShadow = true;
  scene.add(lampPost);
}

// 5. Player's Cue Ball & Input Handling

// Initialize the player's cue ball
const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
const ballMat = new THREE.MeshStandardMaterial({
  color: 0x00aa00, // Green
  roughness: 0.3, metalness: 0.5,
  envMap: skyTexture, envMapIntensity: 0.2
});
playerBall = new THREE.Mesh(ballGeo, ballMat);
playerBall.position.set(0, BALL_RADIUS, TABLE_WIDTH / 4); // Starting position
playerBall.castShadow = true;
playerBall.userData.vx = 0; // Velocity components
playerBall.userData.vz = 0;
scene.add(playerBall);

// Basic keyboard state tracking (e.g., for WASD if pointer controls fail or for other actions)
const keysPressed = {};
window.addEventListener('keydown', (e) => { keysPressed[e.code] = true; });
window.addEventListener('keyup',   (e) => { keysPressed[e.code] = false; });

// For mouse aiming mechanics
let isAiming      = false;
const raycaster   = new THREE.Raycaster(); // To find mouse intersection with table
const aimTarget3D = new THREE.Vector3();   // Where the mouse is pointing on the table
const ndcStart    = new THREE.Vector2();   // Mouse coords at start of aim (Normalized Device Coords)
const ndcEnd      = new THREE.Vector2();   // Mouse coords during aim

// Aiming line visual
const aimLineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red line
let   aimLine         = null; // Will hold the THREE.Line object

// Check if the cue ball is (mostly) stationary
function cueIsStationary() {
  return Math.hypot(playerBall.userData.vx, playerBall.userData.vz) < 0.01;
}

// Pointer Down: Start aiming if player clicks near the cue ball
renderer.domElement.addEventListener('pointerdown', (evt) => {
  if (!cueIsStationary() || gameOver || gameWon) return; // Can only aim if ball is still and game is on

  ndcStart.set(
    (evt.clientX / window.innerWidth) * 2 - 1,
    -(evt.clientY / window.innerHeight) * 2 + 1
  );
  raycaster.setFromCamera(ndcStart, activeCam);
  const hits = raycaster.intersectObject(felt); // Check intersection with the table felt

  if (hits.length > 0) {
    const pt = hits[0].point;
    // Only start aiming if click is close to the ball
    if (pt.distanceTo(playerBall.position) < BALL_RADIUS * 2) {
      isAiming = true;

      // Create an initial aiming line (from ball to itself, effectively zero length)
      const points = [playerBall.position.clone(), playerBall.position.clone()];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      aimLine = new THREE.Line(lineGeo, aimLineMaterial);
      scene.add(aimLine);
    }
  }
});

// Pointer Move: Update the aiming line as the mouse moves
renderer.domElement.addEventListener('pointermove', (evt) => {
  if (!isAiming) return;

  ndcEnd.set(
    (evt.clientX / window.innerWidth) * 2 - 1,
    -(evt.clientY / window.innerHeight) * 2 + 1
  );
  raycaster.setFromCamera(ndcEnd, activeCam);
  const hits = raycaster.intersectObject(felt);

  if (hits.length > 0) {
    aimTarget3D.copy(hits[0].point); // Target is where mouse intersects table

    // Update the aiming line to stretch from ball to current mouse target
    if (aimLine) {
      const pts = [playerBall.position.clone(), aimTarget3D.clone()];
      aimLine.geometry.setFromPoints(pts);
    }
  }
});

// Pointer Up: Shoot the ball based on aim direction and strength
renderer.domElement.addEventListener('pointerup', (evt) => {
  if (!isAiming) return;
  isAiming = false;

  // Finalize aim target based on mouse up position
  ndcEnd.set(
    (evt.clientX / window.innerWidth) * 2 - 1,
    -(evt.clientY / window.innerHeight) * 2 + 1
  );
  raycaster.setFromCamera(ndcEnd, activeCam);
  const hits = raycaster.intersectObject(felt);

  if (hits.length > 0) {
    const hitPt = hits[0].point;
    const dir   = new THREE.Vector3().subVectors(hitPt, playerBall.position);
    dir.y = 0; // We only care about movement on the XZ plane

    if (dir.lengthSq() >= 1e-4) { // Ensure there's some direction
      dir.normalize();
      const dragDist = hitPt.distanceTo(playerBall.position); // Distance dragged determines power
      const strength = THREE.MathUtils.clamp(dragDist, 0, 6); // Cap the power
      playerBall.userData.vx = dir.x * strength;
      playerBall.userData.vz = dir.z * strength;
    }
  }

  // Clean up the aiming line from the scene
  if (aimLine) {
    scene.remove(aimLine);
    aimLine.geometry.dispose(); // Important for memory management
    aimLine = null;
  }
});

// 6. Target Cubes & Decorative Rail Spheres

function spawnTargetCubes() {
  // 6.1 Spawn the 8 red target cubes randomly
  const cubeGeo = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
  for (let i = 0; i < NUM_TARGET_CUBES; i++) {
    const margin = CUBE_SIZE * 2; // Keep cubes away from edges
    const halfL  = TABLE_LENGTH / 2 - margin;
    const halfW  = TABLE_WIDTH / 2  - margin;
    const x      = THREE.MathUtils.randFloat(-halfL, +halfL);
    const z      = THREE.MathUtils.randFloat(-halfW, +halfW);

    const cubeMat = new THREE.MeshStandardMaterial({
      color: 0xff3333, // Red
      roughness: 0.5, metalness: 0.3,
      envMap: skyTexture, envMapIntensity: 0.2
    });
    const cube = new THREE.Mesh(cubeGeo, cubeMat);
    cube.position.set(x, CUBE_SIZE / 2, z); // Place on table surface
    cube.castShadow = true;
    cube.userData.isCollected = false; // Custom flag, though not used in current collision logic
    scene.add(cube);
    targetCubes.push(cube);
  }

  // 6.2 Decorative yellow spheres along all four rails (for visual polish)
  const decorSphereY = 0.3; // Height of decorative spheres
  const decorRailOffset = 0.8; // How far from the table edge
  const decorSphereCount = 6; // Number of spheres per rail segment

  // Top rail spheres (X-axis)
  addDecorSpheresAlongLine(
    new THREE.Vector3(-TABLE_LENGTH / 2, decorSphereY, -TABLE_WIDTH / 2 - decorRailOffset),
    new THREE.Vector3( TABLE_LENGTH / 2, decorSphereY, -TABLE_WIDTH / 2 - decorRailOffset),
    decorSphereCount
  );
  // Bottom rail spheres (X-axis)
  addDecorSpheresAlongLine(
    new THREE.Vector3(-TABLE_LENGTH / 2, decorSphereY,  TABLE_WIDTH / 2 + decorRailOffset),
    new THREE.Vector3( TABLE_LENGTH / 2, decorSphereY,  TABLE_WIDTH / 2 + decorRailOffset),
    decorSphereCount
  );
  // Left rail spheres (Z-axis)
  addDecorSpheresAlongLine(
    new THREE.Vector3(-TABLE_LENGTH / 2 - decorRailOffset, decorSphereY, -TABLE_WIDTH / 2),
    new THREE.Vector3(-TABLE_LENGTH / 2 - decorRailOffset, decorSphereY,  TABLE_WIDTH / 2),
    decorSphereCount
  );
  // Right rail spheres (Z-axis)
  addDecorSpheresAlongLine(
    new THREE.Vector3( TABLE_LENGTH / 2 + decorRailOffset, decorSphereY, -TABLE_WIDTH / 2),
    new THREE.Vector3( TABLE_LENGTH / 2 + decorRailOffset, decorSphereY,  TABLE_WIDTH / 2),
    decorSphereCount
  );
}

// Helper: Distributes 'count' decorative spheres evenly between startPoint and endPoint.
function addDecorSpheresAlongLine(startPoint, endPoint, count) {
  const decorSphereGeo = new THREE.SphereGeometry(0.3, 16, 16);
  const decorSphereMat = new THREE.MeshStandardMaterial({
    color: 0xffff00, // Yellow
    roughness: 0.4, metalness: 0.3,
    envMap: skyTexture, envMapIntensity: 0.2
  });

  for (let i = 0; i < count; i++) {
    const t = (count <= 1) ? 0 : i / (count - 1); // Interpolation factor (0 to 1)
    const x = THREE.MathUtils.lerp(startPoint.x, endPoint.x, t);
    const y = startPoint.y; // Keep Y constant for spheres on a rail
    const z = THREE.MathUtils.lerp(startPoint.z, endPoint.z, t);

    const sph = new THREE.Mesh(decorSphereGeo, decorSphereMat);
    sph.position.set(x, y, z);
    sph.castShadow = true;
    scene.add(sph);
  }
}

spawnTargetCubes(); // Initial population of cubes and decor

// 7. Lighting Setup: Illuminating the Scene

// 7.1 DirectionalLight (like sunlight, casts shadows)
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(10, 20, 10); // Angled light
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048); // Shadow map resolution
dirLight.shadow.camera.near = 0.5; dirLight.shadow.camera.far = 100;
dirLight.shadow.camera.left = -30; dirLight.shadow.camera.right = 30;
dirLight.shadow.camera.top = 30; dirLight.shadow.camera.bottom = -30;
scene.add(dirLight);

// Helper to visualize directional light source (optional, for debugging)
// const dirHelper = new THREE.DirectionalLightHelper(dirLight, 2, 0xff0000);
// scene.add(dirHelper);

// 7.2 HemisphereLight (ambient light from sky and ground)
const hemiLight = new THREE.HemisphereLight(0x88bbff, 0x222222, 0.6); // Sky color, ground color, intensity
scene.add(hemiLight);

// 7.3 AmbientLight (basic overall light, no direction)
const ambLight = new THREE.AmbientLight(0x444444, 0.4);
scene.add(ambLight);

// 7.4 PointLight attached to the cue ball (moves with the ball)
const playerLight = new THREE.PointLight(0xffffff, 0.5, 15, 2); // Color, intensity, distance, decay
playerLight.castShadow = true; // Can cast shadows, but might be expensive
scene.add(playerLight);

// Helper to visualize point light (optional)
// const pointHelper = new THREE.PointLightHelper(playerLight, 0.5, 0x00ff00);
// scene.add(pointHelper);

// Load custom 3D model (Pool Cue as decoration)
{ // Block scope for loaders
  const mtlLoader = new MTLLoader();
  mtlLoader.load('../assets/Pool_Cue.mtl', (materials) => {
    materials.preload();
    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.load('../assets/Pool_Cue.obj', (cueObj) => {
      cueObj.scale.set(0.2, 0.2, 0.2);
      cueObj.position.set(-10, 1, -8); // Position it somewhere in the scene
      cueObj.rotation.y = Math.PI / 4;
      cueObj.traverse((child) => { // Ensure all parts of the model cast/receive shadows
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      scene.add(cueObj);
    }, undefined, (err) => console.error('Error loading Pool_Cue.obj:', err));
  }, undefined, (err) => console.error('Error loading Pool_Cue.mtl:', err));
}

// 8. Orbit Controls: For Camera Navigation

const controls = new OrbitControls(activeCam, renderer.domElement);
controls.enableDamping = true; // Smooths out camera movement
controls.target.set(0, 0, 0); // Camera orbits around the center of the table
controls.update();

// 9. Window Resize Handling: Keep Scene Proportioned

window.addEventListener('resize', () => {
  // Update perspective camera
  perspCam.aspect = window.innerWidth / window.innerHeight;
  perspCam.updateProjectionMatrix();

  // Recreate orthographic camera with new aspect ratio
  orthoCam = makeOrthoCamera();
  // If orthoCam is active, make sure controls know about the new instance
  if (activeCam === orthoCam || controls.object === orthoCam) { // A bit defensive
      controls.object = orthoCam;
  }


  renderer.setSize(window.innerWidth, window.innerHeight);
  controls.update(); // Important after camera changes
});

// 10. Camera Toggle: Switch between Perspective and Orthographic ("C" key)

window.addEventListener('keydown', (evt) => {
  if (evt.code === 'KeyC') {
    activeCam = (activeCam === perspCam ? orthoCam : perspCam);
    controls.object = activeCam; // Tell controls to use the new active camera
    controls.update();
  }
});

// 11. UI Updates: Score, Lives, Timer

function updateUI() {
  scoreboard.textContent = `Score: ${score}`;
  livesDiv.textContent   = `Lives: ${lives}`;
  timerDiv.textContent   = `Time: ${Math.ceil(timeLeft)}`;
}

// Briefly flash "Life Lost!" message on screen
function showLifeLost() {
  messageDiv.style.display = 'block';
  messageDiv.innerText     = 'Life Lost!';
  setTimeout(() => {
    // Only hide if game isn't over (win/loss messages persist)
    if (!gameOver && !gameWon) {
      messageDiv.style.display = 'none';
    }
  }, 1000); // Message visible for 1 second
}

// Handle game end conditions (win or loss) and offer restart
function endGame(isWin) {
  gameOver = true;
  gameWon  = isWin;
  messageDiv.innerText = isWin ? 'You Win!  Press R to Restart' : 'Game Over!  Press R to Restart';
  messageDiv.style.display = 'block';
}

// 12. Game Reset Logic

function resetGame() {
  // Clear existing target cubes from scene and array
  for (let cube of targetCubes) {
    scene.remove(cube);
    // Consider disposing geometry/material if creating many unique ones, but here they are shared.
  }
  targetCubes.length = 0; // Empty the array

  // Reset game state variables
  score    = 0;
  lives    = INITIAL_LIVES;
  timeLeft = INITIAL_TIME;
  gameOver = false;
  gameWon  = false;

  messageDiv.style.display = 'none'; // Hide any end-game messages

  // Reset cue ball position and velocity
  playerBall.position.set(0, BALL_RADIUS, TABLE_WIDTH / 4);
  playerBall.userData.vx = 0;
  playerBall.userData.vz = 0;

  spawnTargetCubes(); // Create a new set of target cubes
  updateUI(); // Refresh score/lives/timer display
}

// Listen for "R" key to restart the game after it has ended
window.addEventListener('keydown', (e) => {
  if ((gameOver || gameWon) && e.code === 'KeyR') {
    resetGame();
  }
});

// 13. Physics & Collision Detection

function updateCueBallPhysics() {
  // Apply velocity
  playerBall.position.x += playerBall.userData.vx;
  playerBall.position.z += playerBall.userData.vz;

  // Apply friction
  playerBall.userData.vx *= BALL_FRICTION;
  playerBall.userData.vz *= BALL_FRICTION;

  // Rail collision checks and response
  const halfL = TABLE_LENGTH / 2 - BALL_RADIUS; // Effective boundary
  if (playerBall.position.x <= -halfL) {
    playerBall.position.x = -halfL; // Clamp position
    playerBall.userData.vx *= BALL_BOUNCE_FACTOR; // Reverse and dampen velocity
  }
  if (playerBall.position.x >= halfL) {
    playerBall.position.x = halfL;
    playerBall.userData.vx *= BALL_BOUNCE_FACTOR;
  }

  const halfW = TABLE_WIDTH / 2 - BALL_RADIUS;
  if (playerBall.position.z <= -halfW) {
    playerBall.position.z = -halfW;
    playerBall.userData.vz *= BALL_BOUNCE_FACTOR;
  }
  if (playerBall.position.z >= halfW) {
    playerBall.position.z = halfW;
    playerBall.userData.vz *= BALL_BOUNCE_FACTOR;
  }
}

// Check if the cue ball has entered a "pocket" (simplified as corners)
function checkCueBallPocketed() {
  const px = playerBall.position.x;
  const pz = playerBall.position.z;
  // Define approximate corner pocket locations
  const corners = [
    { x: +TABLE_LENGTH / 2, z: +TABLE_WIDTH / 2 }, { x: +TABLE_LENGTH / 2, z: -TABLE_WIDTH / 2 },
    { x: -TABLE_LENGTH / 2, z: +TABLE_WIDTH / 2 }, { x: -TABLE_LENGTH / 2, z: -TABLE_WIDTH / 2 }
  ];
  for (let c of corners) {
    const dx = px - c.x;
    const dz = pz - c.z;
    // If ball is close enough to a corner, consider it pocketed
    if (dx * dx + dz * dz <= (BALL_RADIUS * 2) ** 2) { // Using squared distance for efficiency
      return true;
    }
  }
  return false;
}

// Check for collisions between cue ball and target cubes
function checkCubeCollisions() {
  for (let i = targetCubes.length - 1; i >= 0; i--) { // Iterate backwards for safe removal
    const cube = targetCubes[i];
    const dx   = cube.position.x - playerBall.position.x;
    const dz   = cube.position.z - playerBall.position.z;

    // Simple circular collision detection on XZ plane
    if (dx * dx + dz * dz <= (BALL_RADIUS + CUBE_SIZE / 2) ** 2) {
      scene.remove(cube); // Remove from scene
      targetCubes.splice(i, 1); // Remove from array
      score++;
      updateUI();

      if (score === NUM_TARGET_CUBES) { // All cubes collected
        endGame(true); // Player wins!
      }
    }
  }
}

// 14. Game Timer Logic

const gameClock = new THREE.Clock(); // For delta time calculation

function updateGameTimer() {
  if (gameOver || gameWon) return; // Timer stops when game ends

  const dt = gameClock.getDelta(); // Time since last frame
  timeLeft -= dt;
  if (timeLeft <= 0) {
    timeLeft = 0;
    endGame(false); // Time's up, player loses
  }
  updateUI(); // Refresh timer display
}

// 15. Animation Loop: The Heartbeat of the Game

function animate() {
  requestAnimationFrame(animate); // Request the next frame

  if (!gameOver && !gameWon) { // Only update game logic if game is active
    updateCueBallPhysics();

    if (checkCueBallPocketed()) {
      lives--;
      updateUI();
      showLifeLost(); // Visual feedback for losing a life

      if (lives <= 0) {
        endGame(false); // No lives left, player loses
      } else {
        // Respawn the cue ball to its starting position
        playerBall.position.set(0, BALL_RADIUS, TABLE_WIDTH / 4);
        playerBall.userData.vx = 0;
        playerBall.userData.vz = 0;
      }
    }

    checkCubeCollisions();
    updateGameTimer();
  }

  // Keep the point light positioned slightly above the cue ball
  playerLight.position.set(
    playerBall.position.x,
    playerBall.position.y + 3, // Offset light upwards
    playerBall.position.z
  );

  // Add a little spin to the ball for visual effect (doesn't affect physics)
  playerBall.rotation.x += 0.02;
  playerBall.rotation.z += 0.02;

  controls.update(); // Update camera controls
  renderer.render(scene, activeCam); // Render the scene
}

// 16. Initial Setup Calls
updateUI(); // Set initial score/lives/time display
animate();  // Start the animation loop!