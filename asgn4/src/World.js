// Vertex Shader
const VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_TexCoord;
  attribute vec3 a_Normal;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjMatrix;
  uniform mat4 u_NormalMatrix;
  varying vec2 v_TexCoord;
  varying vec3 v_Normal;
  varying vec3 v_Position;
  void main() {
    gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
    v_Position = vec3(u_ModelMatrix * a_Position);
    v_Normal = normalize(vec3(u_NormalMatrix * vec4(a_Normal, 0.0)));
    v_TexCoord = a_TexCoord;
  }`;

// Fragment Shader
const FSHADER_SOURCE = `
  precision mediump float;

  varying vec2 v_TexCoord;
  varying vec3 v_Normal;
  varying vec3 v_Position;

  // Uniforms
  uniform sampler2D u_Sampler;
  uniform bool u_UseTexture;
  uniform vec4 u_BaseColor;
  uniform bool u_NormalsOn;
  uniform vec3 u_CameraPos;
  
  uniform bool u_PointLightOn;
  uniform vec3 u_PointLightPos;
  uniform vec3 u_PointLightColor;

  uniform bool u_SpotlightOn;
  uniform vec3 u_SpotlightPos;
  uniform vec3 u_SpotlightDir;
  uniform float u_SpotlightCutoff;

  void main() {
    if (u_NormalsOn) {
      gl_FragColor = vec4(v_Normal * 0.5 + 0.5, 1.0);
      return;
    }

    vec3 baseColor = u_UseTexture ? texture2D(u_Sampler, v_TexCoord).rgb : u_BaseColor.rgb;
    vec3 finalColor = 0.15 * baseColor; // Ambient light
    
    vec3 viewDir = normalize(u_CameraPos - v_Position);

    // Point Light Calculation
    if (u_PointLightOn) {
      vec3 pointL_dir = normalize(u_PointLightPos - v_Position);
      float pointL_diff = max(dot(v_Normal, pointL_dir), 0.0);
      vec3 pointL_diffuse = pointL_diff * u_PointLightColor * baseColor;

      vec3 pointL_reflectDir = reflect(-pointL_dir, v_Normal);
      float pointL_spec_val = pow(max(dot(viewDir, pointL_reflectDir), 0.0), 32.0);
      vec3 pointL_specular = 0.5 * pointL_spec_val * u_PointLightColor;
      
      finalColor += pointL_diffuse + pointL_specular;
    }

    // Spotlight Calculation
    if (u_SpotlightOn) {
      vec3 spotL_dir = normalize(u_SpotlightPos - v_Position);
      float spotL_angle = dot(spotL_dir, -u_SpotlightDir);

      if (spotL_angle > u_SpotlightCutoff) {
        float falloff = pow(spotL_angle, 2.0);

        float spotL_diff = max(dot(v_Normal, spotL_dir), 0.0);
        vec3 spotL_diffuse = spotL_diff * baseColor * falloff;

        vec3 spotL_reflectDir = reflect(-spotL_dir, v_Normal);
        float spotL_spec_val = pow(max(dot(viewDir, spotL_reflectDir), 0.0), 32.0);
        vec3 spotL_specular = 0.5 * spotL_spec_val * falloff * u_PointLightColor;

        finalColor += spotL_diffuse + spotL_specular;
      }
    }

    gl_FragColor = vec4(finalColor, 1.0);
  }`;

// --- Global Variables ---
let gl, canvas;
let projMatrix = new Matrix4();
let viewMatrix = new Matrix4();
let g_camera;
let wallTexture, groundTexture, skyTexture, chestTexture;

// Lighting Globals
let g_pointLightOn = true;
let g_pointLightPos = [0, 2, 5];
let g_pointLightColor = [1.0, 1.0, 1.0];
let g_spotlightOn = true;
let g_normalsOn = false;
let g_lightAnimationOn = true;

// Scene Object Globals
const CELL_SIZE = 2.0;
let maze;
let wallCubes = [];
let groundCube, skyCube, treasureCube, g_sphere, g_lightMarker, g_hatModel;
let lastTime = 0;

function main() {
  canvas = document.getElementById("webgl");
  gl = canvas.getContext("webgl");
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.error("Failed to initialize shaders.");
    return;
  }
  gl.enable(gl.DEPTH_TEST);
  projMatrix.setPerspective(60, canvas.width / canvas.height, 0.1, 1000);

  let loaded = 0;
  function check() {
    if (++loaded === 4) start();
  }
  wallTexture = loadTexture("../assets/wall.jpg", check);
  groundTexture = loadTexture("../assets/ground.jpg", check);
  skyTexture = loadTexture("../assets/sky.jpg", check);
  chestTexture = loadTexture("../assets/treasure.jpg", check);
}

function start() {
  maze = generateMaze(15, 15);
  g_camera = new Camera();

  const n = maze.length;
  groundCube = new Cube(gl, groundTexture);
  groundCube.modelMatrix
    .setTranslate(0, -0.5, 0)
    .scale(n * CELL_SIZE, 0.1, n * CELL_SIZE);

  for (let x = 0; x < n; x++) {
    for (let z = 0; z < n; z++) {
      if (maze[x][z] === 1) {
        let wall = new Cube(gl, wallTexture);
        wall.modelMatrix
          .setTranslate((x - n / 2) * CELL_SIZE, 0, (z - n / 2) * CELL_SIZE)
          .scale(CELL_SIZE, CELL_SIZE, CELL_SIZE);
        wallCubes.push(wall);
      }
    }
  }

  treasureCube = new Cube(gl, chestTexture);
  treasureCube.modelMatrix
    .setTranslate((n - 2 - n / 2) * CELL_SIZE, 0, (n - 1 - n / 2) * CELL_SIZE)
    .scale(CELL_SIZE * 0.5, CELL_SIZE * 0.5, CELL_SIZE * 0.5);

  g_sphere = new Sphere(gl, wallTexture, 40);
  g_lightMarker = new Cube(gl, wallTexture);
  skyCube = new Cube(gl, skyTexture);
  g_hatModel = new Model(gl, '../assets/benchy.obj');

  setupInput();
  setupUI();
  requestAnimationFrame(tick);
}

function setupUI() {
    document.getElementById('light-toggle').onclick = () => { g_pointLightOn = !g_pointLightOn; };
    document.getElementById('spotlight-toggle').onclick = () => { g_spotlightOn = !g_spotlightOn; };
    document.getElementById('normal-toggle').onclick = () => { g_normalsOn = !g_normalsOn; };
    document.getElementById('animation-toggle').onclick = () => { g_lightAnimationOn = !g_lightAnimationOn; }; 

    document.getElementById('light-x').oninput = (e) => {
        g_pointLightPos[0] = parseFloat(e.target.value);
        document.getElementById('light-x-label').innerText = e.target.value;
    };
    document.getElementById('light-y').oninput = (e) => {
        g_pointLightPos[1] = parseFloat(e.target.value);
        document.getElementById('light-y-label').innerText = e.target.value;
    };
    document.getElementById('light-z').oninput = (e) => {
        g_pointLightPos[2] = parseFloat(e.target.value);
        document.getElementById('light-z-label').innerText = e.target.value;
    };

    document.getElementById('light-r').oninput = (e) => { g_pointLightColor[0] = parseFloat(e.target.value); };
    document.getElementById('light-g').oninput = (e) => { g_pointLightColor[1] = parseFloat(e.target.value); };
    document.getElementById('light-b').oninput = (e) => { g_pointLightColor[2] = parseFloat(e.target.value); };
}

function setupInput(){
  document.onkeydown=e=>{
    const k=e.key.toLowerCase();
    if(k==='w') g_camera.forward();
    if(k==='s') g_camera.back();
    if(k==='a') g_camera.left();
    if(k==='d') g_camera.right();
    if(k==='q') g_camera.panLeft(5);
    if(k==='e') g_camera.panRight(5);
  };
  canvas.onclick=()=>canvas.requestPointerLock();
  document.onmousemove=e=>{
    if(document.pointerLockElement===canvas)
      g_camera.rotate(e.movementX,e.movementY);
  };
}

function render() {
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  viewMatrix.setLookAt(
    g_camera.eye.elements[0], g_camera.eye.elements[1], g_camera.eye.elements[2],
    g_camera.at.elements[0], g_camera.at.elements[1], g_camera.at.elements[2],
    0, 1, 0
  );
  const u_ViewMatrix = gl.getUniformLocation(gl.program, "u_ViewMatrix");
  const u_ProjMatrix = gl.getUniformLocation(gl.program, "u_ProjMatrix");
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);

  const u_CameraPos = gl.getUniformLocation(gl.program, "u_CameraPos");
  gl.uniform3fv(u_CameraPos, g_camera.eye.elements);
  const u_NormalsOn = gl.getUniformLocation(gl.program, "u_NormalsOn");
  gl.uniform1i(u_NormalsOn, g_normalsOn);

  const u_PointLightOn = gl.getUniformLocation(gl.program, "u_PointLightOn");
  gl.uniform1i(u_PointLightOn, g_pointLightOn);
  const u_PointLightPos = gl.getUniformLocation(gl.program, "u_PointLightPos");
  gl.uniform3fv(u_PointLightPos, g_pointLightPos);
  const u_PointLightColor = gl.getUniformLocation(gl.program, "u_PointLightColor");
  gl.uniform3fv(u_PointLightColor, g_pointLightColor);

  let spotDir = new Vector3(g_camera.at.elements);
  spotDir.sub(g_camera.eye).normalize();
  const u_SpotlightOn = gl.getUniformLocation(gl.program, "u_SpotlightOn");
  gl.uniform1i(u_SpotlightOn, g_spotlightOn);
  const u_SpotlightPos = gl.getUniformLocation(gl.program, "u_SpotlightPos");
  gl.uniform3fv(u_SpotlightPos, g_camera.eye.elements);
  const u_SpotlightDir = gl.getUniformLocation(gl.program, "u_SpotlightDir");
  gl.uniform3fv(u_SpotlightDir, spotDir.elements);
  const u_SpotlightCutoff = gl.getUniformLocation(gl.program, "u_SpotlightCutoff");
  gl.uniform1f(u_SpotlightCutoff, Math.cos((25 * Math.PI) / 180));

  const u_UseTexture = gl.getUniformLocation(gl.program, "u_UseTexture");
  gl.uniform1i(u_UseTexture, true);
  
  const u_BaseColor = gl.getUniformLocation(gl.program, "u_BaseColor");

  groundCube.draw(gl.program);
  for (const wall of wallCubes) {
    wall.draw(gl.program);
  }
  treasureCube.draw(gl.program);

  g_sphere.modelMatrix.setTranslate(3, 1, 3).scale(0.8, 0.8, 0.8);
  g_sphere.draw(gl.program);

  if (g_hatModel) {
    g_hatModel.modelMatrix.setTranslate(-3, 1, 3); // Position it in the world
    g_hatModel.draw(gl.program);
  }

  if (g_pointLightOn) {
    gl.uniform1i(u_UseTexture, false);
    gl.uniform4f(u_BaseColor, g_pointLightColor[0], g_pointLightColor[1], g_pointLightColor[2], 1.0);
    g_lightMarker.modelMatrix.setTranslate(g_pointLightPos[0], g_pointLightPos[1], g_pointLightPos[2]).scale(0.2, 0.2, 0.2);
    g_lightMarker.draw(gl.program);
  }

  gl.depthMask(false);
  gl.uniform1i(u_UseTexture, true);
  skyCube.modelMatrix.setTranslate(
    g_camera.eye.elements[0],
    g_camera.eye.elements[1],
    g_camera.eye.elements[2]
  ).scale(100, 100, 100);
  skyCube.draw(gl.program);
  gl.depthMask(true);
}

function tick(now) {
  if (lastTime > 0) {
    const elapsed = now - lastTime;
    document.getElementById('fps').innerText = `FPS: ${(1000 / elapsed).toFixed(1)}`;
  }
  lastTime = now;

  if (g_lightAnimationOn) {
    // Animate the light's position
    g_pointLightPos[0] = Math.cos(now / 1000) * 10;
    g_pointLightPos[2] = Math.sin(now / 1000) * 10;
    
    // Also update the UI sliders and labels to reflect the new position
    document.getElementById('light-x').value = g_pointLightPos[0];
    document.getElementById('light-z').value = g_pointLightPos[2];
    document.getElementById('light-x-label').innerText = g_pointLightPos[0].toFixed(1);
    document.getElementById('light-z-label').innerText = g_pointLightPos[2].toFixed(1);
  }

  render();
  requestAnimationFrame(tick);
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
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    if (isPowerOf2(img.width) && isPowerOf2(img.height)) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    onload();
  };
  img.src = url;
  return tex;
}

function generateMaze(rows, cols) {
  if (rows % 2 === 0) rows++;
  if (cols % 2 === 0) cols++;
  let m = Array.from({ length: rows }, () => Array(cols).fill(1));
  function carve(r, c) {
    m[r][c] = 0;
    [[-2, 0], [2, 0], [0, -2], [0, 2]]
      .sort(() => Math.random() - 0.5)
      .forEach(([dr, dc]) => {
        let nr = r + dr, nc = c + dc;
        if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 && m[nr][nc] === 1) {
          m[r + dr / 2][c + dc / 2] = 0;
          carve(nr, nc);
        }
      });
  }
  carve(1, 1);
  m[1][0] = 0;
  m[rows - 2][cols - 1] = 0;
  return m;
}

main();