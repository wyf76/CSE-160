let canvas, gl;
let a_Position, a_TexCoord, u_ModelMatrix, u_ViewMatrix, u_ProjMatrix, u_Sampler;
let projMatrix = new Matrix4();
let viewMatrix = new Matrix4();
let cameraPos = {x: 16, y: 2, z: 16}, yaw = 0, pitch = 0;
let groundTexture, wallTexture, skyTexture;
let cubes = [];
let keys = {};

function main() {
  canvas = document.getElementById("webgl");
  gl = canvas.getContext("webgl");

  const VSHADER_SOURCE = `
    attribute vec4 a_Position;
    attribute vec2 a_TexCoord;
    uniform mat4 u_ModelMatrix, u_ViewMatrix, u_ProjMatrix;
    varying vec2 v_TexCoord;
    void main() {
      gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
      v_TexCoord = a_TexCoord;
    }
  `;

  const FSHADER_SOURCE = `
    precision mediump float;
    uniform sampler2D u_Sampler;
    varying vec2 v_TexCoord;
    void main() {
      gl_FragColor = texture2D(u_Sampler, v_TexCoord);
    }
  `;

  initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE);
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
  u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');

  projMatrix.setPerspective(60, canvas.width / canvas.height, 0.1, 1000);
  gl.enable(gl.DEPTH_TEST);

  loadTextures(() => {
    generateWorld();
    requestAnimationFrame(tick);
  });

  initInput();
}

function initInput() {
  document.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
  document.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

  canvas.addEventListener('click', () => canvas.requestPointerLock());
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
      document.addEventListener('mousemove', onMouseMove);
    } else {
      document.removeEventListener('mousemove', onMouseMove);
    }
  });
}

function onMouseMove(e) {
  const sensitivity = 0.2;
  yaw += e.movementX * sensitivity;
  pitch -= e.movementY * sensitivity;
  pitch = Math.max(-89, Math.min(89, pitch));
}

function updateCamera(dt) {
  const speed = 5 * dt;
  const radYaw = yaw * Math.PI / 180;
  const dirX = Math.sin(radYaw), dirZ = -Math.cos(radYaw);
  const rightX = Math.cos(radYaw), rightZ = Math.sin(radYaw);

  if (keys['w']) { cameraPos.x += dirX * speed; cameraPos.z += dirZ * speed; }
  if (keys['s']) { cameraPos.x -= dirX * speed; cameraPos.z -= dirZ * speed; }
  if (keys['a']) { cameraPos.x -= rightX * speed; cameraPos.z -= rightZ * speed; }
  if (keys['d']) { cameraPos.x += rightX * speed; cameraPos.z += rightZ * speed; }
}

function tick(timestamp) {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  updateCamera(1/60);

  const dirX = Math.sin(yaw * Math.PI/180) * Math.cos(pitch * Math.PI/180);
  const dirY = Math.sin(pitch * Math.PI/180);
  const dirZ = -Math.cos(yaw * Math.PI/180) * Math.cos(pitch * Math.PI/180);
  const at = [cameraPos.x + dirX, cameraPos.y + dirY, cameraPos.z + dirZ];
  viewMatrix.setLookAt(cameraPos.x, cameraPos.y, cameraPos.z, ...at, 0, 1, 0);

  for (let cube of cubes) {
    cube.draw(viewMatrix, projMatrix, a_Position, a_TexCoord, u_ModelMatrix, u_Sampler, u_ViewMatrix, u_ProjMatrix);
  }
  requestAnimationFrame(tick);
}
