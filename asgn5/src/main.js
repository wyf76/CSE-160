// main.js
// WOW FEATURE: Added full cue-ball physics, scoring, timer, AND decorative scene
// geometry (lamp posts + textured rails + custom OBJ model) as extra polish.
// Also: added yellow spheres along all rails, a “Life Lost!” flash, a restart feature,
// and a startup instruction screen.

import * as THREE        from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MTLLoader }     from "three/addons/loaders/MTLLoader.js";
import { OBJLoader }     from "three/addons/loaders/OBJLoader.js";

// 0. CONSTANTS & GLOBALS

const NUM_TARGET_CUBES = 8;
const TABLE_LENGTH     = 20;
const TABLE_WIDTH      = 10;
const BALL_RADIUS      = 0.5;
const CUBE_SIZE        = 1.0;
const INITIAL_LIVES    = 3;
const INITIAL_TIME     = 120;

let score       = 0;
let lives       = INITIAL_LIVES;
let timeLeft    = INITIAL_TIME;
let gameOver    = false;
let gameWon     = false;
let gameStarted = false; // <— new flag

const targetCubes = [];
let playerBall    = null;

const scoreboard = document.getElementById('scoreboard');
const livesDiv   = document.getElementById('lives');
const timerDiv   = document.getElementById('timer');
const messageDiv = document.getElementById('message'); 
// We’ll reuse messageDiv to show instructions initially, then “Life Lost!”, “You Win!”, etc.

// 1. SCENE + FOG + BACKGROUND

const scene = new THREE.Scene();
scene.fog  = new THREE.FogExp2(0x555555, 0.015);

let skyTexture = null;
const equirectLoader = new THREE.TextureLoader();
equirectLoader.load(
  '../assets/billiard_hall.jpg',
  (texture) => {
    texture.mapping    = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.background   = texture;
    scene.environment  = texture;
    skyTexture         = texture;
  },
  undefined,
  (err) => console.error('Error loading billiard_hall.jpg:', err)
);

// 2. CAMERAS (PERSPECTIVE & ORTHOGRAPHIC) + ACTIVE CAMERA POINTER

const perspCam = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
perspCam.position.set(0, 15, 25);
perspCam.lookAt(0, 0, 0);

function makeOrthoCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  const frustumSize = 30;
  const orthoCam2 = new THREE.OrthographicCamera(
    (-frustumSize * aspect) / 2,
     (frustumSize * aspect) / 2,
     frustumSize / 2,
    -frustumSize / 2,
    0.1,
    1000
  );
  orthoCam2.position.set(0, 20, 0);
  orthoCam2.lookAt(0, 0, 0);
  orthoCam2.up.set(0, 1, 0);
  return orthoCam2;
}
let orthoCam   = makeOrthoCamera();
let activeCam  = perspCam;

// 3. RENDERER + SHADOW MAP

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x333333);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// 4. TABLE SURFACE + RAILS

// 4.1 Table felt
const feltGeo = new THREE.PlaneGeometry(TABLE_LENGTH, TABLE_WIDTH);
const feltMat = new THREE.MeshStandardMaterial({
  color: 0x0a4d0a,
  roughness: 0.8,
  metalness: 0.1,
  envMap: skyTexture,
  envMapIntensity: 0.2
});
const felt = new THREE.Mesh(feltGeo, feltMat);
felt.rotation.x    = -Math.PI / 2;
felt.receiveShadow = true;
scene.add(felt);

// 4.2 Wood-textured rails
const woodTexLoader = new THREE.TextureLoader();
const woodTexture = woodTexLoader.load(
  '../assets/wood.jpg',
  (tex) => {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 1);
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

// Left rail
const railThickness = 1;
const railHeight    = 1;
const leftRailGeo = new THREE.BoxGeometry(
  railThickness,
  railHeight,
  TABLE_WIDTH + railThickness * 2
);
const leftRail = new THREE.Mesh(leftRailGeo, railMat);
leftRail.position.set(
  -TABLE_LENGTH / 2 - railThickness / 2,
   railHeight / 2,
   0
);
leftRail.castShadow   = true;
leftRail.receiveShadow = true;
scene.add(leftRail);

// Right rail
const rightRail = leftRail.clone();
rightRail.position.x = TABLE_LENGTH / 2 + railThickness / 2;
scene.add(rightRail);

// Top rail
const topRailGeo = new THREE.BoxGeometry(
  TABLE_LENGTH + railThickness * 2,
  railHeight,
  railThickness
);
const topRail = new THREE.Mesh(topRailGeo, railMat);
topRail.position.set(
  0,
  railHeight / 2,
  - (TABLE_WIDTH / 2 + railThickness / 2)
);
topRail.castShadow   = true;
topRail.receiveShadow = true;
scene.add(topRail);

// Bottom rail
const bottomRail = topRail.clone();
bottomRail.position.z = TABLE_WIDTH / 2 + railThickness / 2;
scene.add(bottomRail);

// 4.3 Decorative lamp post (CylinderGeometry)
{
  const cylGeo = new THREE.CylinderGeometry(0.2, 0.2, 3, 16);
  const cylMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.2,
    metalness: 0.8,
    envMap: skyTexture,
    envMapIntensity: 0.3
  });
  const lampPost = new THREE.Mesh(cylGeo, cylMat);
  lampPost.position.set(
    TABLE_LENGTH / 2 + 1,
    1.5,
    TABLE_WIDTH / 2 + 1
  );
  lampPost.castShadow   = true;
  lampPost.receiveShadow = false;
  scene.add(lampPost);
}

// 5. PLAYER SPHERE (CUE BALL) + INPUT HANDLING

// Create the cue ball (green sphere)
const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
const ballMat = new THREE.MeshStandardMaterial({
  color: 0x00aa00,
  roughness: 0.3,
  metalness: 0.5,
  envMap: skyTexture,
  envMapIntensity: 0.2
});
playerBall = new THREE.Mesh(ballGeo, ballMat);
playerBall.position.set(0, BALL_RADIUS, TABLE_WIDTH / 4);
playerBall.castShadow   = true;
playerBall.receiveShadow = true;
playerBall.userData.vx  = 0;
playerBall.userData.vz  = 0;
scene.add(playerBall);

// WASD fallback (unused until gameStarted = true)
const keysPressed = {};
window.addEventListener('keydown', (e) => { keysPressed[e.code] = true; });
window.addEventListener('keyup',   (e) => { keysPressed[e.code] = false; });

// Raycaster & aiming
let isAiming      = false;
const raycaster   = new THREE.Raycaster();
const aimTarget3D = new THREE.Vector3();
const ndcStart    = new THREE.Vector2();
const ndcEnd      = new THREE.Vector2();

// Aiming‐line material + placeholder
const aimLineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
let    aimLine         = null;

function cueIsStationary() {
  return Math.hypot(playerBall.userData.vx, playerBall.userData.vz) < 0.01;
}

// pointerdown: begin aiming if gameStarted and we clicked near the cue ball
renderer.domElement.addEventListener('pointerdown', (evt) => {
  if (!gameStarted || !cueIsStationary() || gameOver || gameWon) return;
  ndcStart.set(
    (evt.clientX / window.innerWidth) * 2 - 1,
    -(evt.clientY / window.innerHeight) * 2 + 1
  );
  raycaster.setFromCamera(ndcStart, activeCam);
  const hits = raycaster.intersectObject(felt);
  if (hits.length > 0) {
    const pt = hits[0].point;
    if (pt.distanceTo(playerBall.position) < BALL_RADIUS * 2) {
      isAiming = true;

      // Create a zero‐length line (ball → ball) to start
      const points = [
        playerBall.position.clone(),
        playerBall.position.clone()
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      aimLine = new THREE.Line(lineGeo, aimLineMaterial);
      scene.add(aimLine);
    }
  }
});

// pointermove: update the aimTarget3D and stretch the line
renderer.domElement.addEventListener('pointermove', (evt) => {
  if (!gameStarted || !isAiming) return;
  ndcEnd.set(
    (evt.clientX / window.innerWidth) * 2 - 1,
    -(evt.clientY / window.innerHeight) * 2 + 1
  );
  raycaster.setFromCamera(ndcEnd, activeCam);
  const hits = raycaster.intersectObject(felt);
  if (hits.length > 0) {
    aimTarget3D.copy(hits[0].point);

    // Update the line endpoints: from ball to aimTarget3D
    if (aimLine) {
      const pts = [
        playerBall.position.clone(),
        aimTarget3D.clone()
      ];
      aimLine.geometry.setFromPoints(pts);
    }
  }
});

// pointerup: shoot the ball and remove the line
renderer.domElement.addEventListener('pointerup', (evt) => {
  if (!gameStarted || !isAiming) return;
  isAiming = false;
  ndcEnd.set(
    (evt.clientX / window.innerWidth) * 2 - 1,
    -(evt.clientY / window.innerHeight) * 2 + 1
  );
  raycaster.setFromCamera(ndcEnd, activeCam);
  const hits = raycaster.intersectObject(felt);
  if (hits.length > 0) {
    const hitPt = hits[0].point;
    const dir   = new THREE.Vector3().subVectors(hitPt, playerBall.position);
    dir.y = 0;
    if (dir.lengthSq() >= 1e-4) {
      dir.normalize();
      const dragDist = hitPt.distanceTo(playerBall.position);
      const strength = THREE.MathUtils.clamp(dragDist, 0, 6);
      playerBall.userData.vx = dir.x * strength;
      playerBall.userData.vz = dir.z * strength;
    }
  }

  // Remove the aiming line from the scene
  if (aimLine) {
    scene.remove(aimLine);
    aimLine.geometry.dispose();
    aimLine = null;
  }
});

// 6. TARGET CUBES + DECORATIVE SPHERES

function spawnTargetCubes() {
  // 6.1 Spawn the 8 red cubes
  const cubeGeo = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
  for (let i = 0; i < NUM_TARGET_CUBES; i++) {
    const margin = CUBE_SIZE * 2;
    const halfL  = TABLE_LENGTH / 2 - margin;
    const halfW  = TABLE_WIDTH / 2  - margin;
    const x      = THREE.MathUtils.randFloat(-halfL, +halfL);
    const z      = THREE.MathUtils.randFloat(-halfW, +halfW);

    const cubeMat = new THREE.MeshStandardMaterial({
      color: 0xff3333,
      roughness: 0.5,
      metalness: 0.3,
      envMap: skyTexture,
      envMapIntensity: 0.2
    });
    const cube = new THREE.Mesh(cubeGeo, cubeMat);
    cube.position.set(x, CUBE_SIZE / 2, z);
    cube.castShadow   = true;
    cube.receiveShadow = true;
    cube.userData.isCollected = false;
    scene.add(cube);
    targetCubes.push(cube);
  }

  // 6.2 Decorative yellow spheres along all four rails

  // a) Along top rail (parallel to X axis at z = -TABLE_WIDTH/2 - 0.8)
  addDecorSpheresAlongLine(
    new THREE.Vector3(-TABLE_LENGTH / 2, 0.3, -TABLE_WIDTH / 2 - 0.8),
    new THREE.Vector3( TABLE_LENGTH / 2, 0.3, -TABLE_WIDTH / 2 - 0.8),
    6
  );

  // b) Along bottom rail (parallel to X axis at z = +TABLE_WIDTH/2 + 0.8)
  addDecorSpheresAlongLine(
    new THREE.Vector3(-TABLE_LENGTH / 2, 0.3,  TABLE_WIDTH / 2 + 0.8),
    new THREE.Vector3( TABLE_LENGTH / 2, 0.3,  TABLE_WIDTH / 2 + 0.8),
    6
  );

  // c) Along left rail (parallel to Z axis at x = -TABLE_LENGTH/2 - 0.8)
  addDecorSpheresAlongLine(
    new THREE.Vector3(-TABLE_LENGTH / 2 - 0.8, 0.3, -TABLE_WIDTH / 2),
    new THREE.Vector3(-TABLE_LENGTH / 2 - 0.8, 0.3,  TABLE_WIDTH / 2),
    6
  );

  // d) Along right rail (parallel to Z axis at x = +TABLE_LENGTH/2 + 0.8)
  addDecorSpheresAlongLine(
    new THREE.Vector3( TABLE_LENGTH / 2 + 0.8, 0.3, -TABLE_WIDTH / 2),
    new THREE.Vector3( TABLE_LENGTH / 2 + 0.8, 0.3,  TABLE_WIDTH / 2),
    6
  );
}

// Helper: place `count` spheres evenly between startPoint and endPoint (inclusive)
function addDecorSpheresAlongLine(startPoint, endPoint, count) {
  const decorSphereGeo = new THREE.SphereGeometry(0.3, 16, 16);
  const decorSphereMat = new THREE.MeshStandardMaterial({
    color: 0xffff00,
    roughness: 0.4,
    metalness: 0.3,
    envMap: skyTexture,
    envMapIntensity: 0.2
  });

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1); // parameter from 0..1
    const x = THREE.MathUtils.lerp(startPoint.x, endPoint.x, t);
    const y = startPoint.y; // always the same height (0.3)
    const z = THREE.MathUtils.lerp(startPoint.z, endPoint.z, t);

    const sph = new THREE.Mesh(decorSphereGeo, decorSphereMat);
    sph.position.set(x, y, z);
    sph.castShadow   = true;
    sph.receiveShadow = false;
    scene.add(sph);
  }
}

spawnTargetCubes();

// 7. LIGHTING + CUSTOM 3D MODEL

// 7.1 DirectionalLight
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near   = 0.5;
dirLight.shadow.camera.far    = 100;
dirLight.shadow.camera.left   = -30;
dirLight.shadow.camera.right  = 30;
dirLight.shadow.camera.top    = 30;
dirLight.shadow.camera.bottom = -30;
scene.add(dirLight);

const dirHelper = new THREE.DirectionalLightHelper(dirLight, 2, 0xff0000);
scene.add(dirHelper);

// 7.2 HemisphereLight
const hemiLight = new THREE.HemisphereLight(0x88bbff, 0x222222, 0.6);
scene.add(hemiLight);

// 7.3 AmbientLight
const ambLight = new THREE.AmbientLight(0x444444, 0.4);
scene.add(ambLight);

// 7.4 PointLight on cue ball
const playerLight = new THREE.PointLight(0xffffff, 0.5, 15, 2);
playerLight.castShadow = true;
scene.add(playerLight);

const pointHelper = new THREE.PointLightHelper(playerLight, 0.5, 0x00ff00);
scene.add(pointHelper);

// Load custom 3D model (Pool_Cue.obj + Pool_Cue.mtl)
{
  const mtlLoader = new MTLLoader();
  mtlLoader.load(
    '../assets/Pool_Cue.mtl',
    (materials) => {
      materials.preload();
      const objLoader = new OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.load(
        '../assets/Pool_Cue.obj',
        (cueObj) => {
          cueObj.scale.set(0.2, 0.2, 0.2);
          cueObj.position.set(-10, 1, -8);
          cueObj.rotation.y = Math.PI / 4;
          cueObj.traverse((child) => {
            if (child.isMesh) {
              child.castShadow   = true;
              child.receiveShadow = true;
            }
          });
          scene.add(cueObj);
        },
        undefined,
        (err) => console.error('Error loading Pool_Cue.obj:', err)
      );
    },
    undefined,
    (err) => console.error('Error loading Pool_Cue.mtl:', err)
  );
}

// 8. ORBIT CONTROLS

const controls = new OrbitControls(activeCam, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);
controls.update();

// Disable orbiting until Ctrl is held
controls.enableRotate = false;

// When Ctrl is pressed, allow rotation; when released, disable it again
window.addEventListener('keydown', (e) => {
  if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
    controls.enableRotate = true;
  }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
    controls.enableRotate = false;
  }
});

// 9. WINDOW RESIZE HANDLING

window.addEventListener('resize', () => {
  perspCam.aspect = window.innerWidth / window.innerHeight;
  perspCam.updateProjectionMatrix();
  orthoCam = makeOrthoCamera();
  renderer.setSize(window.innerWidth, window.innerHeight);
  controls.object = activeCam;
  controls.update();
});

// 10. CAMERA TOGGLE (“C” key)

window.addEventListener('keydown', (evt) => {
  if (evt.code === 'KeyC') {
    activeCam    = (activeCam === perspCam ? orthoCam : perspCam);
    controls.object = activeCam;
    controls.update();
  }
});

// 11. UI: SCORE / LIVES / TIMER UPDATES

function updateUI() {
  scoreboard.textContent = `Score: ${score}`;
  livesDiv.textContent   = `Lives: ${lives}`;
  timerDiv.textContent   = `Time: ${Math.ceil(timeLeft)}`;
}

// Show a “Life Lost!” message for 1 second
function showLifeLost() {
  messageDiv.style.display = 'block';
  messageDiv.innerText     = 'Life Lost!';
  setTimeout(() => {
    if (!gameOver && !gameWon) {
      messageDiv.style.display = 'none';
    }
  }, 1000);
}

// End‐game function now suggests pressing “R” to restart
function endGame(win) {
  gameOver = true;
  gameWon  = win;
  if (win) {
    messageDiv.innerText = 'You Win!  Press R to Restart';
  } else {
    messageDiv.innerText = 'Game Over!  Press R to Restart';
  }
  messageDiv.style.display = 'block';
}

// 12. RESET LOGIC

function resetGame() {
  // Remove existing cubes
  for (let cube of targetCubes) {
    scene.remove(cube);
  }
  targetCubes.length = 0;

  // Reset score/lives/time
  score    = 0;
  lives    = INITIAL_LIVES;
  timeLeft = INITIAL_TIME;
  gameOver = false;
  gameWon  = false;
  gameStarted = false; // require pressing Space again

  // Hide messageDiv (instructions/GameOver/You Win)
  messageDiv.style.display = 'none';

  // Reset cue ball position & velocity
  playerBall.position.set(0, BALL_RADIUS, TABLE_WIDTH / 4);
  playerBall.userData.vx = 0;
  playerBall.userData.vz = 0;

  // Spawn new cubes
  spawnTargetCubes();

  // Update UI text (score, lives, timer)
  updateUI();

  // Show instructions again
  showInstructions();
}

// Listen for “R” key to restart after win/lose
window.addEventListener('keydown', (e) => {
  if ((gameOver || gameWon) && e.code === 'KeyR') {
    resetGame();
  }
});

// 13. INSTRUCTIONS LOGIC

function showInstructions() {
  messageDiv.style.display = 'block';
  messageDiv.innerHTML = `
    <strong>Instructions</strong><br>
    • Click & drag on the cue ball to aim.<br>
    • Hold Ctrl + right‐drag to move the camera.<br>
    • Release to shoot and collect all 8 red cubes.<br>
    • You have ${INITIAL_LIVES} lives & ${INITIAL_TIME} seconds.<br>
    • Losing a life flashes “Life Lost!” when you pocket the cue ball.<br>
    • Press <strong>Space</strong> to begin<br>
    &nbsp;Press <strong>R</strong> anytime after win/lose to restart
  `;
}

// Wait for Space to start
window.addEventListener('keydown', (e) => {
  if (!gameStarted && e.code === 'Space') {
    gameStarted = true;
    messageDiv.style.display = 'none';
    // Start the clock immediately
    gameClock.start();
  }
});

// 14. PHYSICS & COLLISION CHECKS

function updateCueBallPhysics() {
  playerBall.position.x += playerBall.userData.vx;
  playerBall.position.z += playerBall.userData.vz;
  playerBall.userData.vx *= 0.98;
  playerBall.userData.vz *= 0.98;

  const halfL = TABLE_LENGTH / 2 - BALL_RADIUS;
  if (playerBall.position.x <= -halfL) {
    playerBall.position.x = -halfL;
    playerBall.userData.vx *= -0.8;
  }
  if (playerBall.position.x >= halfL) {
    playerBall.position.x = halfL;
    playerBall.userData.vx *= -0.8;
  }

  const halfW = TABLE_WIDTH / 2 - BALL_RADIUS;
  if (playerBall.position.z <= -halfW) {
    playerBall.position.z = -halfW;
    playerBall.userData.vz *= -0.8;
  }
  if (playerBall.position.z >= halfW) {
    playerBall.position.z = halfW;
    playerBall.userData.vz *= -0.8;
  }
}

function checkCueBallPocketed() {
  const px = playerBall.position.x;
  const pz = playerBall.position.z;
  const corners = [
    { x: +TABLE_LENGTH / 2, z: +TABLE_WIDTH / 2 },
    { x: +TABLE_LENGTH / 2, z: -TABLE_WIDTH / 2 },
    { x: -TABLE_LENGTH / 2, z: +TABLE_WIDTH / 2 },
    { x: -TABLE_LENGTH / 2, z: -TABLE_WIDTH / 2 }
  ];
  for (let c of corners) {
    const dx = px - c.x;
    const dz = pz - c.z;
    if (dx * dx + dz * dz <= (BALL_RADIUS * 2) ** 2) {
      return true;
    }
  }
  return false;
}

function checkCubeCollisions() {
  for (let i = targetCubes.length - 1; i >= 0; i--) {
    const cube = targetCubes[i];
    const dx   = cube.position.x - playerBall.position.x;
    const dz   = cube.position.z - playerBall.position.z;
    if (dx * dx + dz * dz <= (BALL_RADIUS + CUBE_SIZE / 2) ** 2) {
      scene.remove(cube);
      targetCubes.splice(i, 1);
      score++;
      updateUI();
      if (score === NUM_TARGET_CUBES) {
        endGame(true);
      }
    }
  }
}

// 15. GAME TIMER

const gameClock = new THREE.Clock(false); // start paused

function updateGameTimer() {
  if (!gameStarted || gameOver || gameWon) return;
  const dt = gameClock.getDelta();
  timeLeft -= dt;
  if (timeLeft <= 0) {
    timeLeft = 0;
    endGame(false);
  }
  updateUI();
}

// 16. ANIMATION / RENDER LOOP

function animate() {
  requestAnimationFrame(animate);

  if (gameStarted && !gameOver && !gameWon) {
    updateCueBallPhysics();

    if (checkCueBallPocketed()) {
      lives--;
      updateUI();
      showLifeLost();

      if (lives <= 0) {
        endGame(false);
      } else {
        // Respawn the cue ball
        playerBall.position.set(0, BALL_RADIUS, TABLE_WIDTH / 4);
        playerBall.userData.vx = 0;
        playerBall.userData.vz = 0;
      }
    }

    checkCubeCollisions();
    updateGameTimer();
  }

  // Keep the point light above the cue ball
  playerLight.position.set(
    playerBall.position.x,
    playerBall.position.y + 3,
    playerBall.position.z
  );

  // Slight ball rotation for visual feedback
  playerBall.rotation.x += 0.02;
  playerBall.rotation.z += 0.02;

  controls.update();
  renderer.render(scene, activeCam);
}

animate();

// 17. INITIAL SETUP

updateUI();
showInstructions();
