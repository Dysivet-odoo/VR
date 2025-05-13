'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let stereoCam;
let video;
let videoTexture = -1;
let bgProgram;
let cameraSurface;
let canvas;

// Матриця обертання, яка буде обчислена на основі даних сенсорів
let rotationMatrix = new Float32Array(16);

let params3d = {
    eyeSeparation: 0.7,
    fov: 45 * Math.PI / 180,
    nearClip: 8,
    convergence: 20
};
 
function animate() { 
    draw(); 
    requestAnimationFrame(animate);  
}

// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() { 
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Налаштування для 3D-анагліфу з negative parallax
    gl.enable(gl.DEPTH_TEST);
    
    if (video && video.videoWidth > 0) {
        bgProgram.Use();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, videoTexture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, video);
        gl.uniform1i(bgProgram.uTexture, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, cameraSurface.iVertexBuffer);
        gl.enableVertexAttribArray(bgProgram.iPosition);
        gl.vertexAttribPointer(bgProgram.iPosition, 2, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(bgProgram.itexCoord);
        gl.vertexAttribPointer(bgProgram.itexCoord, 2, gl.FLOAT, false, 16, 8);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cameraSurface.iIndexBuffer);
        gl.drawElements(gl.TRIANGLES, cameraSurface.count, gl.UNSIGNED_SHORT, 0);
    }
    
    // Визначаємо матрицю погляду в залежності від джерела керування
    let modelView;
    modelView = rotationMatrix;
    
    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);

    // Кольори так само, як у проекті Vlad/MSVR
    const colPoly = [0.5, 0.5, 0.5, 1]; // сірий колір для полігонів
    const colEdge = [1, 1, 1, 1]; // білий колір для ребер

    shProgram.Use();

    // Ліве око
    const leftProj = stereoCam.calcLeftFrustum();
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, leftProj);
    const eyeL = m4.multiply(m4.translation(params3d.eyeSeparation / 2, 0, 0), modelView);
    const mL = m4.multiply(translateToPointZero, m4.multiply(rotateToPointZero, eyeL));
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, mL);

    gl.bindBuffer(gl.ARRAY_BUFFER, surface.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, surface.iIndexBuffer);

    // Вмикаємо полігонний зсув для negative parallax (полігони перед каркасом)
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1, 0);
    
    // Застосовуємо кольорову маску для лівого ока (зелений та синій канали)
    gl.colorMask(false, true, true, false);
    
    // Малюємо заповнені полігони
    gl.uniform4fv(shProgram.iColor, colPoly);
    surface.Draw();
    
    // Малюємо каркас
    gl.uniform4fv(shProgram.iColor, colEdge);
    surface.DrawWireframe();

    // Очищуємо тільки буфер глибини перед малюванням для правого ока
    gl.clear(gl.DEPTH_BUFFER_BIT);
    
    // Праве око
    const rightProj = stereoCam.calcRightFrustum();
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, rightProj);
    const eyeR = m4.multiply(m4.translation(-params3d.eyeSeparation / 2, 0, 0), modelView);
    const mR = m4.multiply(translateToPointZero, m4.multiply(rotateToPointZero, eyeR));
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, mR);

    // Застосовуємо кольорову маску для правого ока (червоний канал)
    gl.colorMask(true, false, false, true);
    
    // Малюємо заповнені полігони
    gl.uniform4fv(shProgram.iColor, colPoly);
    surface.Draw();
    
    // Малюємо каркас
    gl.uniform4fv(shProgram.iColor, colEdge);
    surface.DrawWireframe();

    // Відключаємо полігонний зсув та повертаємо нормальну кольорову маску
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.colorMask(true, true, true, true);
}



/* Initialize the WebGL context. Called from init() */
function initGL(count_u, count_v) {
    let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex              = gl.getAttribLocation(prog, "vertex");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iProjectionMatrix          = gl.getUniformLocation(prog, "ProjectionMatrix");
    shProgram.iColor                     = gl.getUniformLocation(prog, "color");

    let backgroundprog = createProgram( gl, bgVertexSrc, bgFragmentSrc );
    bgProgram = new ShaderProgram("Background", backgroundprog);
    bgProgram.Use();
    bgProgram.iPosition                  = gl.getAttribLocation(backgroundprog, "position");
    bgProgram.itexCoord                  = gl.getAttribLocation(backgroundprog, "texCoord");
    bgProgram.uTexture                   = gl.getUniformLocation(backgroundprog, "uTexture");

    surface = new Model('Surface', count_u, count_v);
    surface.BufferData();

    cameraSurface = new Model("QuadVideo", 0, 0);
    const verticies = new Float32Array([-1, -1, 0, 1, 1, -1, 1, 1, -1, 1, 0, 0, 1, 1, 1, 0]);
    const indexes = new Uint16Array([0, 1, 2, 1, 3, 2]);
    gl.bindBuffer(gl.ARRAY_BUFFER, cameraSurface.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verticies, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cameraSurface.iIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexes, gl.STATIC_DRAW);
    cameraSurface.count = indexes.length;

    stereoCam = new StereoCamera(
        params3d.eyeSeparation,
        params3d.convergence,
        canvas.width / canvas.height,
        params3d.fov,
        params3d.nearClip,
        100.0 // far clipping distance
    );

    spaceball = new TrackballRotator(canvas, draw, 0);
    initCam();


    gl.enable(gl.DEPTH_TEST);
}

function initCam() {
    video = document.createElement('video');
    video.autoplay = true;
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;
            const track = stream.getVideoTracks()[0];
            const settings = track.getSettings();
            videoTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, videoTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, settings.width, settings.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        })
        .catch(err => console.error("Webcam error:", err));
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
     }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        let count_u = 22;
        let count_v = 22;
        initGL(count_u, count_v);  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    // Додати обробники подій для повзунків 3D параметрів
    document.getElementById('eyeSeparation').addEventListener('input', e => {
        params3d.eyeSeparation = +e.target.value;
        stereoCam.eyeSeparation = +e.target.value;
        document.getElementById('eyeSeparationValue').innerText = e.target.value;
    });
    
    document.getElementById('fov').addEventListener('input', e => {
        params3d.fov = e.target.value * Math.PI / 180;
        stereoCam.FOV = params3d.fov;
        document.getElementById('fovValue').innerText = e.target.value;
    });
    
    document.getElementById('nearClip').addEventListener('input', e => {
        params3d.nearClip = +e.target.value;
        stereoCam.nearClippingDistance = +e.target.value;
        document.getElementById('nearClipValue').innerText = e.target.value;
    });
    
    document.getElementById('convergence').addEventListener('input', e => {
        params3d.convergence = +e.target.value;
        stereoCam.convergence = +e.target.value;
        document.getElementById('convergenceValue').innerText = e.target.value;
    });
    
    // Додати обробник події resize та викликати його один раз
    window.addEventListener('resize', onResize);
    onResize();
    
    // Підключаємось до WebSocket для отримання даних сенсорів
    connectToWebSocket();

    //draw();
    animate();
}

function onResize() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (stereoCam) stereoCam.mAspectRatio = canvas.width / canvas.height;
}
