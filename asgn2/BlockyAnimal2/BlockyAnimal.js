var VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'uniform mat4 u_ModelMatrix;\n' +
    'uniform mat4 u_GlobalRotateMatrix;\n' +
    'uniform mat4 u_ProjMatrix;\n' +
    'void main() {\n' +
    '  gl_Position = u_ProjMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;\n' +
    '}\n';

var FSHADER_SOURCE =
    'precision mediump float;\n' +
    'uniform vec4 u_FragColor;\n' +
    'void main() {\n' +
    '  gl_FragColor = u_FragColor;\n' +
    '}\n';

// Poke/Explosion Animation State
let g_pokeAnimationActive = false;
let g_pokeAnimationStartTime = 0;
let g_explosionOffset = 0;
const POKE_ANIMATION_DURATION = 1.5;

// Global WebGL variables
let canvas, gl;
let a_Position, u_FragColor, u_ModelMatrix, u_GlobalRotateMatrix, u_ProjMatrix;

// Crab Animation/Pose Variables
let g_frontLeftLegAngle = -70, g_frontRightLegAngle = 70;
let g_frontLeftLegAngle2 = 90, g_frontRightLegAngle2 = -90;
let g_pincerAngle = 0; // For 3rd joint control
let g_bodyBob = 0;     // For natural walk bobbing
let g_clawSway = 0;    // For natural walk claw sway
let g_walkAnimation = false;

// Camera and Interaction Variables
let g_cameraAngleX = 0;
let g_cameraAngleY = 0;
let g_yRotationSliderAngle = 0; // Separate angle from Y rotation slider
let g_mouseDown = false, g_lastMouseX = null, g_lastMouseY = null;

// Performance/Timing Variables
let g_lastFrameTime = performance.now(), g_fps = 0;
let g_startTime = performance.now()/1000;


function setupWebGL() {
    canvas = document.getElementById('webgl');
    gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) { console.error('WebGL not supported'); return; }
    gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL() {
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.error('Failed to initialize shaders');
        return;
    }
    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
    u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');

    const proj = new Matrix4()
        .setPerspective(40, canvas.width / canvas.height, 1, 100)
        .multiply(new Matrix4().setLookAt(3, 3, 7, 0, 0, 0, 0, 1, 0));
    gl.uniformMatrix4fv(u_ProjMatrix, false, proj.elements);

    const identityM = new Matrix4();
    gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}

function addActionsForHtmlUI() {
    document.getElementById('animationWalkOffButton').onclick = () => { g_walkAnimation = false; };
    document.getElementById('animationWalkOnButton').onclick = () => { g_walkAnimation = true; };

    document.getElementById('walkSlide').addEventListener('input', evt => {
        const v = parseFloat(evt.target.value);
        g_frontLeftLegAngle = -v;
        g_frontRightLegAngle = v;
        if (!g_walkAnimation) renderScene();
    });
    document.getElementById('walk2Slide').addEventListener('input', evt => {
        const v = parseFloat(evt.target.value);
        g_frontLeftLegAngle2 = v;
        g_frontRightLegAngle2 = -v;
        if (!g_walkAnimation) renderScene();
    });

    document.getElementById('pincerSlide').addEventListener('input', evt => {
        g_pincerAngle = parseFloat(evt.target.value);
        renderScene();
    });

     document.getElementById('yRotateSlide').addEventListener('input', evt => {
        g_yRotationSliderAngle = parseFloat(evt.target.value);
        renderScene();
    });

    document.getElementById('angleSlide').addEventListener('input', evt => {
        g_cameraAngleX = parseFloat(evt.target.value);
         renderScene();
    });

    document.getElementById('resetButton').onclick = () => {
        g_pokeAnimationActive = false;
        g_explosionOffset = 0;
        g_walkAnimation = false;

        g_frontLeftLegAngle = -70; g_frontRightLegAngle = 70;
        g_frontLeftLegAngle2 = 90; g_frontRightLegAngle2 = -90;
        g_pincerAngle = 0;
        document.getElementById('walkSlide').value = 70;
        document.getElementById('walk2Slide').value = 90;
        document.getElementById('pincerSlide').value = 0;

        g_cameraAngleX = 0; g_cameraAngleY = 0;
        g_yRotationSliderAngle = 0;
        document.getElementById('angleSlide').value = 0;
        document.getElementById('yRotateSlide').value = 0;

        console.log("Scene Reset");
        renderScene();
    };
}

function handleMouseDown(evt) {
    if (evt.shiftKey) {
        // Start Poke Animation on Shift+Click
        if (!g_pokeAnimationActive) {
            g_pokeAnimationActive = true;
            g_pokeAnimationStartTime = performance.now() / 1000;
            g_explosionOffset = 0;
            g_walkAnimation = false;
            console.log("Poke animation started!");
        }
    } else {
        g_mouseDown = true;
        g_lastMouseX = evt.clientX;
        g_lastMouseY = evt.clientY;
    }
}

function handleMouseUp(evt) {
    g_mouseDown = false;
}

function handleMouseOut(evt) {
     g_mouseDown = false;
}

function handleMouseMove(evt) {
    if (!g_mouseDown) return;
    const dx = evt.clientX - g_lastMouseX;
    const dy = evt.clientY - g_lastMouseY;
    g_cameraAngleY += dx * 0.5;
    g_cameraAngleX += dy * 0.5;
    g_cameraAngleX = Math.max(-90, Math.min(90, g_cameraAngleX));
    g_lastMouseX = evt.clientX;
    g_lastMouseY = evt.clientY;
}

function updatePokeAnimation() {
    if (!g_pokeAnimationActive) return;

    const elapsedTime = performance.now() / 1000 - g_pokeAnimationStartTime;

    if (elapsedTime >= POKE_ANIMATION_DURATION) {
        g_pokeAnimationActive = false;
        g_explosionOffset = 0;
        console.log("Poke animation finished.");
        return;
    }

    g_explosionOffset = elapsedTime * elapsedTime * 4; // Explosion distance factor
}

function updateAnimationAngles() {
    if (g_pokeAnimationActive) return;
    if (!g_walkAnimation) {
        g_bodyBob = 0;
        g_clawSway = 0;
        return;
    }

    const speed = 10, swing = 10;
    const speed2 = 10, swing2 = 5;
    const t = performance.now() / 1000 - g_startTime;

    g_frontLeftLegAngle = -70 + swing * Math.sin(speed * t);
    g_frontRightLegAngle = 70 + swing * Math.sin(speed * t + Math.PI);
    g_frontLeftLegAngle2 = 90 + swing2 * Math.sin(speed2 * t);
    g_frontRightLegAngle2 = -90 + swing2 * Math.sin(speed2 * t + Math.PI);

    g_bodyBob = Math.sin(speed * t) * 0.03; // Natural walk bobbing
    g_clawSway = Math.cos(speed * t * 0.5) * 5; // Natural walk claw sway
}

function renderScene() {
    const totalYRotation = g_cameraAngleY + g_yRotationSliderAngle + 45;
    const globalRotMatY = new Matrix4().rotate(totalYRotation, 0, 1, 0);
    const globalRotMatX = new Matrix4().rotate(g_cameraAngleX, 1, 0, 0);
    const globalRotMat = globalRotMatY.multiply(globalRotMatX);
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const crabRed = [0.8, 0.1, 0.1, 1.0];
    const crabLeg = [0.9, 0.3, 0.3, 1.0];
    const eyeWhite = [1.0, 1.0, 1.0, 1.0];

    const t = performance.now() / 1000;
    const bobbing = g_pokeAnimationActive ? 0 : g_bodyBob;
    const clawOpen = g_pokeAnimationActive ? 0 : Math.sin((t - g_startTime) * 5) * 15;

    // Define Explosion Directions
    const bodyExplodeDir = new Vector3([0, 0.2, -0.8]).normalize();
    const eyeLExplodeDir = new Vector3([-0.7, 0.7, 0]).normalize();
    const eyeRExplodeDir = new Vector3([0.7, 0.7, 0]).normalize();
    const legLExplodeDir = new Vector3([-0.8, -0.2, 0]).normalize();
    const legRExplodeDir = new Vector3([0.8, -0.2, 0]).normalize();
    const clawLExplodeDir = new Vector3([-0.5, 0, 0.8]).normalize();
    const clawRExplodeDir = new Vector3([0.5, 0, 0.8]).normalize();

    // Helper function to apply explosion translation
    const applyExplosion = (matrix, direction) => {
        if (g_pokeAnimationActive && direction) {
            matrix.translate(
                direction.elements[0] * g_explosionOffset,
                direction.elements[1] * g_explosionOffset,
                direction.elements[2] * g_explosionOffset
            );
        }
    };

    // --- Render Crab Parts ---

    // Body
    let body = new Cube();
    body.color = crabRed;
    body.matrix.translate(-0.4, -0.3 + bobbing, -0.05);
    applyExplosion(body.matrix, bodyExplodeDir);
    let bodyCoordinateMat = new Matrix4(body.matrix);
    body.matrix.scale(0.8, 0.12, 0.3);
    body.render();

    // Eyes
    let eyeL = new Cone(8);
    eyeL.color = eyeWhite;
    eyeL.matrix = new Matrix4(bodyCoordinateMat);
    eyeL.matrix.translate(0.2, 0.12, 0.15);
    applyExplosion(eyeL.matrix, eyeLExplodeDir);
    eyeL.matrix.scale(0.15, 0.15, 0.15); // Adjusted scale
    eyeL.render();

    let eyeR = new Cone(8);
    eyeR.color = eyeWhite;
    eyeR.matrix = new Matrix4(bodyCoordinateMat);
    eyeR.matrix.translate(0.55, 0.12, 0.15);
    applyExplosion(eyeR.matrix, eyeRExplodeDir);
    eyeR.matrix.scale(0.15, 0.15, 0.15); // Adjusted scale
    eyeR.render();

    // Legs
    let legOffset = [-0.1, 0.0, 0.1, 0.2];
    for (let i = 0; i < 4; i++) {
        let legRotationOffset = (i - 1.5) * 0.1 * (g_pokeAnimationActive ? 1 : 0);

        let currentLegL1Angle = g_pokeAnimationActive ? -70 : g_frontLeftLegAngle;
        let currentLegL2Angle = g_pokeAnimationActive ? 90 : g_frontLeftLegAngle2;
        let currentLegR1Angle = g_pokeAnimationActive ? 70 : g_frontRightLegAngle;
        let currentLegR2Angle = g_pokeAnimationActive ? -90 : g_frontRightLegAngle2;

        // Left Leg Segment 1
        let legL1 = new Cube();
        legL1.color = crabLeg;
        legL1.matrix = new Matrix4(bodyCoordinateMat);
        legL1.matrix.rotate(45 - i * 10 + currentLegL1Angle * 0.3, 0, 0, 1);
        legL1.matrix.translate(-0.3, legOffset[i], 0.15);
        let legL1ExplodeDir = new Vector3([legLExplodeDir.elements[0], legLExplodeDir.elements[1] + legRotationOffset, legLExplodeDir.elements[2]]).normalize();
        applyExplosion(legL1.matrix, legL1ExplodeDir);
        let legL1Coordinate = new Matrix4(legL1.matrix);
        legL1.matrix.scale(0.3, 0.08, 0.08);
        legL1.render();
        // Left Leg Segment 2
        let legL2 = new Cube();
        legL2.color = crabLeg;
        legL2.matrix = new Matrix4(legL1Coordinate);
        legL2.matrix.translate(-0.01, 0.05, 0);
        legL2.matrix.rotate(180 + currentLegL2Angle * 0.5, 0, 0, 1);
        legL2.matrix.scale(0.18, 0.06, 0.06);
        legL2.render();

        // Right Leg Segment 1
        let legR1 = new Cube();
        legR1.color = crabLeg;
        legR1.matrix = new Matrix4(bodyCoordinateMat);
        legR1.matrix.rotate(-45 + i * 10 + currentLegR1Angle * 0.3, 2, 0, 1); // Note: Original unusual axis (2,0,1) kept
        legR1.matrix.translate(0.8, legOffset[i], 0.15);
        let legR1ExplodeDir = new Vector3([legRExplodeDir.elements[0], legRExplodeDir.elements[1] + legRotationOffset, legRExplodeDir.elements[2]]).normalize();
        applyExplosion(legR1.matrix, legR1ExplodeDir);
        let legR1Coordinate = new Matrix4(legR1.matrix);
        legR1.matrix.scale(0.3, 0.08, 0.08);
        legR1.render();
        // Right Leg Segment 2
        let legR2 = new Cube();
        legR2.color = crabLeg;
        legR2.matrix = new Matrix4(legR1Coordinate);
        legR2.matrix.translate(0.25, 0.04, 0);
        legR2.matrix.rotate(0 + currentLegR2Angle * 0.5, 0, 0, 1);
        legR2.matrix.scale(0.18, 0.06, 0.06);
        legR2.render();
    }

    // Claws
    // Left Claw Arm
    let clawL = new Cube();
    clawL.color = crabLeg;
    clawL.matrix = new Matrix4(bodyCoordinateMat);
    clawL.matrix.translate(0.05, 0, 0.3);
    clawL.matrix.rotate(-30 + clawOpen, 1, 0, 0);
    clawL.matrix.rotate(-70, 0, 1, 0);
    clawL.matrix.rotate(g_pokeAnimationActive ? 0 : g_clawSway, 0, 1, 0); // Apply sway
    applyExplosion(clawL.matrix, clawLExplodeDir);
    let clawLCoordinate = new Matrix4(clawL.matrix);
    clawL.matrix.scale(0.25, 0.08, 0.08);
    clawL.render();

    // Left Claw Tip
    let clawTipL = new Cube();
    clawTipL.color = crabLeg;
    clawTipL.matrix = new Matrix4(clawLCoordinate);
    clawTipL.matrix.translate(0.25, 0, 0);
    clawTipL.matrix.rotate(20 + g_pincerAngle, 0, 0, 1); // Apply pincer angle
    clawTipL.matrix.scale(0.1, 0.1, 0.1);
    clawTipL.render();

    // Right Claw Arm
    let clawR = new Cube();
    clawR.color = crabLeg;
    clawR.matrix = new Matrix4(bodyCoordinateMat);
    clawR.matrix.translate(0.8, 0, 0.3);
    clawR.matrix.rotate(-30 - clawOpen, 1, 0, 0);
    clawR.matrix.rotate(-120, 0, 1, 0);
    clawR.matrix.rotate(g_pokeAnimationActive ? 0 : -g_clawSway, 0, 1, 0); // Apply sway
    applyExplosion(clawR.matrix, clawRExplodeDir);
    let clawRCoordinate = new Matrix4(clawR.matrix);
    clawR.matrix.scale(0.25, 0.08, 0.08);
    clawR.render();

    // Right Claw Tip
    let clawTipR = new Cube();
    clawTipR.color = crabLeg;
    clawTipR.matrix = new Matrix4(clawRCoordinate);
    clawTipR.matrix.translate(0.25, 0, 0);
    clawTipR.matrix.rotate(-20 - g_pincerAngle, 0, 0, 1); // Apply pincer angle
    clawTipR.matrix.scale(0.1, 0.1, 0.1);
    clawTipR.render();
}


function main() {
    setupWebGL();
    connectVariablesToGLSL();
    addActionsForHtmlUI();
    gl.clearColor(0, 0, 0, 0);

    canvas.onmousedown = handleMouseDown;
    canvas.onmouseup = handleMouseUp;
    canvas.onmousemove = handleMouseMove;
    canvas.onmouseout = handleMouseOut;

    requestAnimationFrame(function tick() {
        const now = performance.now();
        const delta = now - g_lastFrameTime;
        g_lastFrameTime = now;
        g_fps = Math.round(1000 / delta);
        document.getElementById('fpsCounter').innerText = `FPS: ${g_fps}`;

        updatePokeAnimation();
        updateAnimationAngles();

        renderScene();

        requestAnimationFrame(tick);
    });
}