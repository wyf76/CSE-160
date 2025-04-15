// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform float u_PointSize;
  void main() {
    gl_Position = a_Position;
    gl_PointSize = u_PointSize;;
  }`

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`

// Global var for WebGL context
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;
let g_selectedAlpha = 1.0;


function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  gl = canvas.getContext('webgl', {preserveDrawingBuffer: true}); 
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
}

function connectVariablesToGLSL() {
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  // Get the storage location of u_Size
  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
  if (!u_Size) {
    console.log('Failed to get the storage location of u_Size');
    return;
  }
}

// Contants 
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

// Globals related to UI elements
let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
let g_selectedSize = 5;
let g_selectedShape = POINT;
let g_selectedSegments = 10;
let g_fireworksEnabled = false;


// Set up actions for the HTML UI elements
function addActionForHtmlUI(){
  // Button Events (Shape Type)
  document.getElementById('green').onclick = function() {g_selectedColor = [0.0, 1.0, 0.0, 1.0];};
  document.getElementById('red').onclick = function() {g_selectedColor = [1.0, 0.0, 0.0, 1.0];};
  document.getElementById('clearButton').onclick = function() {g_shapeList = []; renderAllShapes();};

  document.getElementById('pointButton').onclick = function() {g_selectedShape = POINT};
  document.getElementById('triangleButton').onclick = function() {g_selectedShape = TRIANGLE};
  document.getElementById('circleButton').onclick = function() {g_selectedShape = CIRCLE};

  // Color Slider Events
  document.getElementById('redSlide').addEventListener('mouseup', function() {g_selectedColor[0] = this.value/100;});
  document.getElementById('greenSlide').addEventListener('mouseup', function() {g_selectedColor[1] = this.value/100;});
  document.getElementById('blueSlide').addEventListener('mouseup', function() {g_selectedColor[2] = this.value/100;});

  // Size Slider Event
  document.getElementById('sizeSlide').addEventListener('mouseup', function() {g_selectedSize = this.value;})

  // Segment Slider Event
  document.getElementById('segmentSlide').addEventListener('mouseup', function() {g_selectedSegments = this.value;})

  // Draw My Art Event
  document.getElementById('showDrawingButton').onclick = function() {drawMyTriangleArt();};

  //alpha slider event
  document.getElementById('alphaSlider').addEventListener('input', function() {
    g_selectedAlpha = parseFloat(this.value);
    g_selectedColor[3] = g_selectedAlpha;
  });
  
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  addActionForHtmlUI();

  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = click;
  canvas.onmousemove = function(ev) {if(ev.buttons == 1) {click(ev)}};

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Enable blending for transparency
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

}

var g_shapeList = []; // The array for the shape objects

function click(ev) {
  // Extract the event click and convert to WebGL coordinates
  let [x, y] = convertCoordinatesEventToGL(ev); 
  
  // Create a new point object
  let point;
  if (g_selectedShape == POINT) 
    point = new Point(); 
  else if (g_selectedShape == TRIANGLE) 
    point = new Triangle(); 
  else if (g_selectedShape == CIRCLE)
    point = new Circle();

  point.position = [x, y];
  point.color = g_selectedColor.slice();
  point.size = g_selectedSize;
  point.segments = g_selectedSegments;
  g_shapeList.push(point);
  
  renderAllShapes();
}

function convertCoordinatesEventToGL(ev) {
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect(); 

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

  return ([x,y]);
}

function renderAllShapes() {
  // Check the time at the start of this function
  var startTime = performance.now();

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Draw each shape in the list
  var len = g_shapeList.length;
  for(var i = 0; i < len; i++) {
    g_shapeList[i].render();
  }

  // Check the time at the end of the function, and show on web page
  var duration = performance.now() - startTime;
  sendTextToHTML("numdot: " + len + " ms: " + Math.floor(duration) + " fps: " + Math.floor(10000/duration)/10, "numdot");
}

// Set text of a HTML element
function sendTextToHTML(text, htmlID){
  var htmlElm = document.getElementById(htmlID);
  if(!htmlElm){
    console.log("Failed to get " + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}

function drawMyTriangleArt() {
  g_shapeList = [];

  // Helper to add a triangle
  function addTriangle(x, y, color, size) {
    let tri = new Triangle();
    tri.position = [x, y];
    tri.color = color;
    tri.size = size;
    g_shapeList.push(tri);
  }

  // === SKY LAYERS (2 triangles for background) ===
  addTriangle(0.0, 0.9, [0.1, 0.3, 0.6, 1.0], 180);  // upper sky - dark blue
  addTriangle(0.0, 0.5, [0.9, 0.5, 0.1, 1.0], 180);  // horizon - orange

  // === SUN (6 triangles as sun rays) ===
  addTriangle(0.0, 0.5, [1.0, 0.8, 0.0, 1.0], 20);
  addTriangle(0.05, 0.55, [1.0, 0.75, 0.0, 1.0], 20);
  addTriangle(-0.05, 0.55, [1.0, 0.75, 0.0, 1.0], 20);
  addTriangle(0.05, 0.45, [1.0, 0.7, 0.0, 1.0], 20);
  addTriangle(-0.05, 0.45, [1.0, 0.7, 0.0, 1.0], 20);
  addTriangle(0.0, 0.4, [1.0, 0.8, 0.0, 1.0], 20);

  // === MOUNTAINS (6 triangles) ===
  // Left peak
  addTriangle(-0.6, -0.2, [0.3, 0.3, 0.3, 1.0], 100); // mountain
  addTriangle(-0.6, -0.2, [0.2, 0.2, 0.2, 1.0], 90);  // shadow

  // Center peak
  addTriangle(0.0, -0.2, [0.35, 0.35, 0.35, 1.0], 120);
  addTriangle(0.0, -0.2, [0.25, 0.25, 0.25, 1.0], 110);

  // Right peak
  addTriangle(0.6, -0.2, [0.4, 0.4, 0.4, 1.0], 100);
  addTriangle(0.6, -0.2, [0.3, 0.3, 0.3, 1.0], 90);

  // === HILLS (3 triangles) ===
  addTriangle(-0.4, -0.6, [0.0, 0.5, 0.0, 1.0], 70);  // left hill
  addTriangle(0.0, -0.65, [0.0, 0.6, 0.0, 1.0], 80);  // center hill
  addTriangle(0.4, -0.6, [0.0, 0.5, 0.0, 1.0], 70);  // right hill

  // === GROUND (3 triangles) ===
  addTriangle(-0.5, -0.9, [0.3, 0.2, 0.1, 1.0], 100); // left dirt
  addTriangle(0.5, -0.9, [0.3, 0.2, 0.1, 1.0], 100);  // right dirt
  addTriangle(0.0, -1.0, [0.2, 0.15, 0.05, 1.0], 120); // base triangle

  renderAllShapes();
}
