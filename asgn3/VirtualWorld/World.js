let gl, canvas;
let a_Position, a_TexCoord;
let u_ModelMatrix, u_ViewMatrix, u_ProjMatrix, u_Sampler;
let projMatrix = new Matrix4(), viewMatrix = new Matrix4();
let g_camera;
let wallTexture, groundTexture, skyTexture;

// Maze generator
function generateMaze(rows, cols) {
  if (rows % 2 === 0) rows++;
  if (cols % 2 === 0) cols++;
  let m = Array.from({ length: rows }, () => Array(cols).fill(1));
  function carve(r, c) {
    m[r][c] = 0;
    [[-2,0],[2,0],[0,-2],[0,2]]
      .sort(() => Math.random() - 0.5)
      .forEach(([dr, dc]) => {
        let nr = r + dr, nc = c + dc;
        if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 && m[nr][nc] === 1) {
          m[r + dr/2][c + dc/2] = 0;
          carve(nr, nc);
        }
      });
  }
  carve(1,1);
  // Carve entrance (left wall) and exit (right wall)
  m[1][0] = 0;               // entrance at row=1, col=0
  m[rows-2][cols-1] = 0;     // exit at row=rows-2, col=cols-1
  return m;
}

const CELL_SIZE = 0.5;
let maze;

function main() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl');
  initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE);

  // Attribute & uniform locations
  a_Position  = gl.getAttribLocation(gl.program,'a_Position');
  a_TexCoord  = gl.getAttribLocation(gl.program,'a_TexCoord');
  u_ModelMatrix = gl.getUniformLocation(gl.program,'u_ModelMatrix');
  u_ViewMatrix  = gl.getUniformLocation(gl.program,'u_ViewMatrix');
  u_ProjMatrix  = gl.getUniformLocation(gl.program,'u_ProjMatrix');
  u_Sampler     = gl.getUniformLocation(gl.program,'u_Sampler');

  gl.enable(gl.DEPTH_TEST);
  projMatrix.setPerspective(60, canvas.width/canvas.height, 0.1, 1000);

  // Load all three textures
  let loaded = 0;
  function check() { if (++loaded === 3) start(); }

  wallTexture   = loadTexture('../assets/wall.jpg',   check);
  groundTexture = loadTexture('../assets/ground.jpg', check);
  skyTexture    = loadTexture('../assets/sky.jpg',    check);
}

function isPowerOf2(value) {
  return (value & (value - 1)) === 0;
}

function loadTexture(url, onload) {
  const tex = gl.createTexture();
  const img = new Image();
  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(
      gl.TEXTURE_2D, 0,
      gl.RGBA, gl.RGBA,
      gl.UNSIGNED_BYTE,
      img
    );

    if (isPowerOf2(img.width) && isPowerOf2(img.height)) {
      // POT: generate mipmaps, allow repeating if you like
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    } else {
      // NPOT: clamp & no mipmaps
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    onload();
  };
  img.src = url;
  return tex;
}

function start() {
  maze = generateMaze(25,25);
  g_camera = new Camera();
  setupInput();
  let lastTime = 0;
  function tick(now) {
  if (lastTime !== 0) {
    const fps = 1000 / (now - lastTime);
    document.getElementById('fps').innerText = `FPS: ${fps.toFixed(1)}`;
  }
  lastTime = now;

  render();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
}

function setupInput() {
  document.onkeydown = e => {
    const k = e.key.toLowerCase();
    if (k==='w') g_camera.forward();
    if (k==='s') g_camera.back();
    if (k==='a') g_camera.left();
    if (k==='d') g_camera.right();
    if (k==='q') g_camera.panLeft(5);
    if (k==='e') g_camera.panRight(5);
    render();
  };
  canvas.onclick = () => canvas.requestPointerLock();
  document.onmousemove = e => {
    if (document.pointerLockElement === canvas) {
      g_camera.rotate(e.movementX, e.movementY);
      render();
    }
  };
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Set view/proj
  viewMatrix.setLookAt(
    g_camera.eye.elements[0], g_camera.eye.elements[1], g_camera.eye.elements[2],
    g_camera.at.elements[0],  g_camera.at.elements[1],  g_camera.at.elements[2],
    0,1,0
  );
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);

  const n = maze.length;

  // Draw ground plane first
  let ground = new Cube(gl, groundTexture);
  ground.modelMatrix.setTranslate(0, -0.01, 0)
    .scale(n*CELL_SIZE, 0.02, n*CELL_SIZE);
  gl.bindTexture(gl.TEXTURE_2D, groundTexture);
  ground.draw(a_Position, a_TexCoord, u_ModelMatrix, u_ViewMatrix, u_ProjMatrix, u_Sampler, viewMatrix, projMatrix);

  // Draw maze walls
  gl.bindTexture(gl.TEXTURE_2D, wallTexture);
  for (let x = 0; x < n; x++) {
    for (let z = 0; z < n; z++) {
      if (maze[x][z] === 1) {
        let wall = new Cube(gl, wallTexture);
        wall.modelMatrix.setTranslate(
          (x - n/2) * CELL_SIZE,
          CELL_SIZE/2,
          (z - n/2) * CELL_SIZE
        ).scale(CELL_SIZE, CELL_SIZE, CELL_SIZE);
        wall.draw(a_Position, a_TexCoord, u_ModelMatrix, u_ViewMatrix, u_ProjMatrix, u_Sampler, viewMatrix, projMatrix);
      }
    }
  }

  // Draw skybox last (disable depth write)
  gl.depthMask(false);
  gl.bindTexture(gl.TEXTURE_2D, skyTexture);
  let sky = new Cube(gl, skyTexture);
  sky.modelMatrix.setTranslate(
    g_camera.eye.elements[0],
    g_camera.eye.elements[1],
    g_camera.eye.elements[2]
  ).scale(50, 50, 50);
  sky.draw(a_Position, a_TexCoord, u_ModelMatrix, u_ViewMatrix, u_ProjMatrix, u_Sampler, viewMatrix, projMatrix);
  gl.depthMask(true);
}

// Vertex Shader
const VSHADER_SOURCE = `
attribute vec4 a_Position;
attribute vec2 a_TexCoord;
uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjMatrix;
varying vec2 v_TexCoord;
void main() {
  gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
  v_TexCoord = a_TexCoord;
}`;

// Fragment Shader
const FSHADER_SOURCE = `
precision mediump float;
uniform sampler2D u_Sampler;
varying vec2 v_TexCoord;
void main() {
  gl_FragColor = texture2D(u_Sampler, v_TexCoord);
}`;