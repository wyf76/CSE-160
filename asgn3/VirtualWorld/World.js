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
uniform float     u_UseTexture;
uniform vec4      u_BaseColor;
varying vec2      v_TexCoord;
void main() {
  vec4 texColor = texture2D(u_Sampler, v_TexCoord);
  gl_FragColor = mix(u_BaseColor, texColor, u_UseTexture);
}`;
let gl, canvas;
let a_Position, a_TexCoord;
let u_ModelMatrix, u_ViewMatrix, u_ProjMatrix, u_Sampler;
let projMatrix=new Matrix4(), viewMatrix=new Matrix4();
let g_camera;
let wallTexture, groundTexture, skyTexture, chestTexture;

// Maze generator with entrance/exit
function generateMaze(rows, cols) {
  if (rows % 2 === 0) rows++;
  if (cols % 2 === 0) cols++;
  let m=Array.from({length:rows},()=>Array(cols).fill(1));
  function carve(r,c) {
    m[r][c]=0;
    [[-2,0],[2,0],[0,-2],[0,2]]
      .sort(()=>Math.random()-0.5)
      .forEach(([dr,dc])=>{
        let nr=r+dr, nc=c+dc;
        if (nr>0&&nr<rows-1&&nc>0&&nc<cols-1&&m[nr][nc]===1) {
          m[r+dr/2][c+dc/2]=0;
          carve(nr,nc);
        }
      });
  }
  carve(1,1);
  m[1][0]=0;             // entrance
  m[rows-2][cols-1]=0;   // exit
  return m;
}

const CELL_SIZE=0.5;
let maze;
let treasureCube;
let foundTreasure = false;              
let animatingTreasure = false;
let treasureAnimStart = 0;
const TREASURE_RISE    = 3.0;    // how many world‑units it flies up
const TREASURE_SPINS   = 720;    // total degrees spun
const TREASURE_DURATION = 2000; // ms

function main(){
  canvas=document.getElementById('webgl');
  gl=canvas.getContext('webgl');
  initShaders(gl,VSHADER_SOURCE,FSHADER_SOURCE);

  // locations
  a_Position=gl.getAttribLocation(gl.program,'a_Position');
  a_TexCoord=gl.getAttribLocation(gl.program,'a_TexCoord');
  u_ModelMatrix=gl.getUniformLocation(gl.program,'u_ModelMatrix');
  u_ViewMatrix=gl.getUniformLocation(gl.program,'u_ViewMatrix');
  u_ProjMatrix=gl.getUniformLocation(gl.program,'u_ProjMatrix');
  u_Sampler=gl.getUniformLocation(gl.program,'u_Sampler');
  u_UseTexture = gl.getUniformLocation(gl.program, 'u_UseTexture');
  u_BaseColor  = gl.getUniformLocation(gl.program, 'u_BaseColor');

  gl.enable(gl.DEPTH_TEST);
  projMatrix.setPerspective(60,canvas.width/canvas.height,0.1,1000);

  // load textures
  let loaded=0;
  function check(){ if(++loaded===4) start(); }
  wallTexture=loadTexture('../assets/wall.jpg',check);
  groundTexture=loadTexture('../assets/ground.jpg',check);
  skyTexture=loadTexture('../assets/sky.jpg',check);
  chestTexture = loadTexture('../assets/treasure.jpg', check);

}

function isPowerOf2(value) {
  return (value & (value - 1)) === 0;
}


function loadTexture(url,onload){
  const tex=gl.createTexture();
  const img=new Image();
  img.onload=()=>{
    gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
    if(isPowerOf2(img.width)&&isPowerOf2(img.height)){
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
    } else {
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    }
    onload();
  };
  img.src=url; return tex;
}

function start(){
  maze=generateMaze(25,25);
  g_camera=new Camera();
  setupInput();

  // treasure at exit
  const n=maze.length;
  treasureCube=new Cube(gl,chestTexture);
  treasureCube.baseMatrix=new Matrix4()
    .setTranslate((n-2-n/2)*CELL_SIZE, CELL_SIZE*1.5, (n-1-n/2)*CELL_SIZE)
    .scale(CELL_SIZE, CELL_SIZE, CELL_SIZE);

  requestAnimationFrame(tick);
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
    if(k==='z') toggleBlock(1);
    if(k==='c') toggleBlock(-1);
  };
  canvas.onclick=()=>canvas.requestPointerLock();
  document.onmousemove=e=>{
    if(document.pointerLockElement===canvas)
      g_camera.rotate(e.movementX,e.movementY);
  };
}

function toggleBlock(delta){
  const n=maze.length;
  // forward vector
  const ry=g_camera.yaw*Math.PI/180, rp=g_camera.pitch*Math.PI/180;
  const fx=Math.cos(rp)*Math.cos(ry), fz=Math.cos(rp)*Math.sin(ry);
  const tx=g_camera.eye.elements[0]+fx*CELL_SIZE;
  const tz=g_camera.eye.elements[2]+fz*CELL_SIZE;
  const ix=Math.floor(tx/CELL_SIZE + n/2);
  const iz=Math.floor(tz/CELL_SIZE + n/2);
  if(ix>=0&&ix<n&&iz>=0&&iz<n) maze[ix][iz]=delta>0?1:0;
}

function checkTreasure() {
  if (foundTreasure) return;

  // world‐space center of the chest:
  const e = treasureCube.baseMatrix.elements;
  const tx = e[12], tz = e[14];

  // your camera xz:
  const cx = g_camera.eye.elements[0],
        cz = g_camera.eye.elements[2];

  const dx = cx - tx,
        dz = cz - tz,
        dist = Math.sqrt(dx*dx + dz*dz);

  console.log(
    `🚩 Chest @ (${tx.toFixed(2)},${tz.toFixed(2)}) | ` +
    `Cam @ (${cx.toFixed(2)},${cz.toFixed(2)}) | ` +
    `dist=${dist.toFixed(2)}`
  );

  // try bumping threshold to 1.0 or 1.5 cells:
  const HIT_RADIUS = CELL_SIZE * 1.5;
  if (dist < HIT_RADIUS) {
    foundTreasure = true;
    onTreasureFound();
  }
}

function onTreasureFound() {
  console.log("🎉 You found the treasure!");
  animatingTreasure = true;
  treasureAnimStart = Date.now();

}

let lastTime=0;
function tick(now){
  if(lastTime) document.getElementById('fps').innerText=
    `FPS: ${(1000/(now-lastTime)).toFixed(1)}`;
  lastTime=now;
  render();
  requestAnimationFrame(tick);
}

function render(){
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const n=maze.length;
  gl.uniform1f(u_UseTexture, 1.0);

  // update camera
  viewMatrix.setLookAt(
    g_camera.eye.elements[0],g_camera.eye.elements[1],g_camera.eye.elements[2],
    g_camera.at.elements[0], g_camera.at.elements[1], g_camera.at.elements[2],
    0,1,0
  );
  gl.uniformMatrix4fv(u_ViewMatrix,false,viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjMatrix,false,projMatrix.elements);

  checkTreasure();

  // ground
  gl.bindTexture(gl.TEXTURE_2D,groundTexture);
  let ground=new Cube(gl,groundTexture);
  ground.modelMatrix.setTranslate(0,-0.01,0)
    .scale(n*CELL_SIZE,0.02,n*CELL_SIZE);
  ground.draw(a_Position,a_TexCoord,u_ModelMatrix,u_ViewMatrix,u_ProjMatrix,u_Sampler,viewMatrix,projMatrix);

  // walls
  gl.bindTexture(gl.TEXTURE_2D,wallTexture);
  for(let x=0;x<n;x++) for(let z=0;z<n;z++) if(maze[x][z]===1){
    let w=new Cube(gl,wallTexture);
    w.modelMatrix.setTranslate((x-n/2)*CELL_SIZE,CELL_SIZE/2,(z-n/2)*CELL_SIZE)
      .scale(CELL_SIZE,CELL_SIZE,CELL_SIZE);
    w.draw(a_Position,a_TexCoord,u_ModelMatrix,u_ViewMatrix,u_ProjMatrix,u_Sampler,viewMatrix,projMatrix);
  }


  // 1) build a fresh transform from the baseMatrix
  const now = Date.now();
  let tm = new Matrix4();
  tm.elements = treasureCube.baseMatrix.elements.slice();

  if (animatingTreasure) {
    // compute 0→1 progress
    const elapsed = now - treasureAnimStart;
    let p = Math.min(elapsed / TREASURE_DURATION, 1);
    // ease‑out curve: p*(2−p)
    const ease = p * (2 - p);

    // 2) pop up in Y, spin around Y, and grow
    tm
      .translate(0, ease * TREASURE_RISE, 0)
      .rotate(ease * TREASURE_SPINS,  0, 1, 0)
      .scale(1 + 2*p, 1 + 2*p, 1 + 2*p);

    // stop after the duration
    if (p >= 1) animatingTreasure = false;
  } else {
    // idle bob + slow spin
    const t = now / 500;
    tm
      .translate(0, Math.sin(t) * CELL_SIZE * 0.5, 0)
      .rotate(t * 30, 0, 1, 0);
  }

  treasureCube.modelMatrix = tm;

  // 3) draw your treasure (you can bind a distinct 'chest' texture here too)
  gl.bindTexture(gl.TEXTURE_2D, chestTexture);
  treasureCube.draw(
    a_Position, a_TexCoord,
    u_ModelMatrix, u_ViewMatrix, u_ProjMatrix, u_Sampler,
    viewMatrix, projMatrix
  );

  // skybox
  gl.depthMask(false);
  gl.uniform1f(u_UseTexture, 0.0);
  gl.uniform4f(u_BaseColor, 0.5, 0.7, 1.0, 1.0);
  let sky = new Cube(gl, groundTexture);
  sky.modelMatrix.setTranslate(
    g_camera.eye.elements[0],
    g_camera.eye.elements[1],
    g_camera.eye.elements[2]
  ).scale(50,50,50);
  sky.draw(
    a_Position, a_TexCoord,
    u_ModelMatrix, u_ViewMatrix, u_ProjMatrix, u_Sampler,
    viewMatrix, projMatrix
  );

  gl.depthMask(true);
}
