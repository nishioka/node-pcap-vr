/*global THREE:false, TWEEN:false, io:false, ShaderLoader:false, Promise:false, HMDVRDevice:false, PositionSensorVRDevice:false*/

'use strict';

var container;

var camera, scene;
var vrEffect, renderer;
var vrControl, monoControl;
var modeVR = false;

var outColor = 0xdd380c;
var inColor = 0x154492;

var safeColor = new THREE.Color('lawngreen');
var warnColor = new THREE.Color('orange');
var dangerColor = new THREE.Color('red');

var origin = new THREE.Vector3(0, 0, 0);

var conenecters = new THREE.Object3D();

var helper, axis, grid;

var domains = [];

var shaders = new ShaderLoader('shaders');

var socket = io.connect('http://' + location.hostname + ':3000');

function constrain(v, min, max) {
    if (v < min) {
        v = min;
    } else if (v > max) {
        v = max;
    }

    return v;
}

function addAxisGrid() {
    // X軸:赤, Y軸:緑, Z軸:青
    axis = new THREE.AxisHelper(2000);
    scene.add(axis);

    // GridHelper
    grid = new THREE.GridHelper(2000, 100);
    scene.add(grid);

    helper = true;
}

function removeAxisGrid() {
    scene.remove(axis);
    scene.remove(grid);

    helper = false;
}

function animate() {
    TWEEN.update();

    if (modeVR) {
        // Update VR headset position and apply to camera.
        vrControl.update(5);
        // Render the scene through the VREffect.
        vrEffect.render(scene, camera);
    } else {
        monoControl.update();
        renderer.render(scene, camera);
    }

    // keep looping
    requestAnimationFrame(animate);

    //THREE.SceneUtils.traverseHierarchy(conenecters,
    scene.traverse(function (mesh) {
        if (mesh.update !== undefined) {
            mesh.update();
        }
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    if (modeVR) {
        vrEffect.setSize(window.innerWidth, window.innerHeight);
    } else {
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

function changeMode(mode) {
    console.log('changing mode: ' + mode);
    switch (mode) {
    case 'mono':
        modeVR = false;
        //renderer.setSize(window.innerWidth, window.innerHeight);
        break;
    case 'vr':
        modeVR = true;
        //vrEffect.setSize(window.innerWidth, window.innerHeight);
        break;
    }
}

function handleFullScreenChange() {
    if (document.mozFullScreenElement === null) {
        changeMode('mono');
    }
}

//logs camera pos when h is pressed
function rotest() {
    console.log(camera.rotation.x, camera.rotation.y, camera.rotation.z);
}

function onkey(event) {
    event.preventDefault();

    if (event.keyCode === 90) { // z
        vrControl.zeroSensor();
    } else if (event.keyCode === 70 || event.keyCode === 13) { //f or enter
        vrEffect.setFullScreen(true); //fullscreen
    } else if (event.keyCode === 72) { //h
        rotest();
        if (helper) {
            removeAxisGrid();
        } else {
            addAxisGrid();
        }
    }
}

function createGate(color) {
    /*
    var cylinderTexture = new THREE.ImageUtils.loadTexture('image/Band.png');
    cylinderTexture.repeat.set(5, 1);
    cylinderTexture.offset.x = Math.random();
    */
    var gate = new THREE.Object3D();

    var cylinderMaterial = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        color: color
            //map: cylinderTexture,
            //transparent: true,
            //opacity: 0.5
    });

    var sphere = new THREE.Object3D();
    var objects = 40;
    for (var i = -objects / 2; i < objects / 2; i++) {
        var dy = i / objects * 2;
        var theta = Math.acos(dy);
        var radius = 800 * Math.sin(theta);
        var hight = 40 * Math.random();

        // sphereRing
        var cylinderGeometry = new THREE.CylinderGeometry(radius, radius, hight, 64, 2, true);
        var cylinderMesh = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
        cylinderMesh.position.set(0, 800 * dy, 0);
        sphere.add(cylinderMesh);
    }
    gate.add(sphere);

    var interGateGeometry = new THREE.PlaneBufferGeometry(600, 600, 100, 100);
    var interGateMaterial = new THREE.ShaderMaterial({
        uniforms: {
            texture: {
                type: 't',
                value: new THREE.ImageUtils.loadTexture('img/InterGate.png')
            },
            uSphereRadius2: {
                type: 'f',
                value: 500
            },
            cutZ: {
                type: 'f',
                value: 430
            }
        },
        vertexShader: shaders.vs.gate,
        fragmentShader: shaders.fs.gate,
        //wireframe: true
        side: THREE.DoubleSide,
        transparent: true
    });
    var interGateMesh = new THREE.Mesh(interGateGeometry, interGateMaterial);

    var plate = new THREE.Object3D();

    interGateMesh.position.z += 450;
    plate.add(interGateMesh);

    var newMesh = interGateMesh.clone();
    newMesh.position.z += 20;
    plate.add(newMesh);

    newMesh = interGateMesh.clone();
    newMesh.position.z += 40;
    plate.add(newMesh);

    var gateGeometry = new THREE.PlaneBufferGeometry(1000, 1000, 100, 100);
    var gateMaterial = new THREE.ShaderMaterial({
        uniforms: {
            texture: {
                type: 't',
                value: new THREE.ImageUtils.loadTexture('img/Gate.png')
            },
            uSphereRadius2: {
                type: 'f',
                value: 800
            },
            cutZ: {
                type: 'f',
                value: 630
            }
        },
        vertexShader: shaders.vs.gate,
        fragmentShader: shaders.fs.gate,
        //wireframe: true
        side: THREE.DoubleSide,
        transparent: true
    });
    var gateMesh = new THREE.Mesh(gateGeometry, gateMaterial);
    gateMesh.position.z += 20;
    plate.add(gateMesh);

    var newObj = plate.clone();
    newObj.rotation.y = Math.PI;
    plate.add(newObj);

    var ObjX = plate.clone();
    var ObjY = plate.clone();
    ObjX.rotation.y = Math.PI / 2;
    ObjY.rotation.x = Math.PI / 2;

    plate.add(ObjX);
    plate.add(ObjY);

    gate.add(plate);

    return gate;
}

/**
 * https://github.com/dataarts/armsglobe
 * @param   {Vecter3} src    coordinates of localhost gate object
 * @param   {Vecter3} dst    coordinates of remote host gate object
 * @param   {Object} packet  packet data
 * @returns {Object3D}       line object
 */
function createLine(src, dst, packet) {
    var lineGeometry = new THREE.Geometry();

    var vSub = src.clone().sub(dst);
    var direction = [{
        axis: 'x',
        value: Math.abs(vSub.x)
    }, {
        axis: 'y',
        value: Math.abs(vSub.y)
    }, {
        axis: 'z',
        value: Math.abs(vSub.z)
    }];
    var sorted = [].slice.call(direction).sort(function (a, b) {
        return a.value < b.value;
    });

    //頂点座標を追加していく
    var corner = src.clone();
    lineGeometry.vertices.push(corner.clone());

    for (var index = 0; index < 3; index++) {
        //console.log('axis', sorted[index].axis, dst[sorted[index].axis]);
        corner[sorted[index].axis] = dst[sorted[index].axis];
        lineGeometry.vertices.push(corner.clone());
    }

    var lineColor = packet.info.srcaddr === hostAddress ? new THREE.Color(outColor) : new THREE.Color(inColor);

    // grab the colors from the vertices
    var lineColors = [];
    for (s in lineGeometry.vertices) {
        //var v = lineGeometry.vertices[s];
        lineColors.push(lineColor);
    }
    lineGeometry.colors = lineColors;

    var particlesGeo = new THREE.Geometry();
    var particleColor = lineColor.clone();
    var points = lineGeometry.vertices;
    var particleCount = Math.floor(80 / lineGeometry.vertices.length) + 1;
    particleCount = constrain(particleCount, 1, 100);
    var particleSize = 20;

    var particleColors = [];
    for (var s = 0; s < particleCount; s++) {
        // var rIndex = Math.floor( Math.random() * points.length );
        // var rIndex = Math.min(s,points.length-1);

        var desiredIndex = s / particleCount * points.length;
        var rIndex = constrain(Math.floor(desiredIndex), 0, points.length - 1);

        var point = points[rIndex];
        var particle = point.clone();
        particle.moveIndex = rIndex;
        particle.nextIndex = rIndex + 1;
        if (particle.nextIndex >= points.length) {
            particle.nextIndex = 0;
        }
        particle.lerpN = 0;
        particle.path = points;
        particlesGeo.vertices.push(particle);
        particle.size = particleSize;
        particleColors.push(particleColor);
    }

    // make a final mesh out of this composite
    var connectMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        vertexColors: true,
        linewidth: 1
    });
    var connectOutline = new THREE.Line(lineGeometry, connectMaterial);
    connectOutline.renderOrder = false;

    var attributes = {
        size: {
            type: 'f',
            value: []
        },
        customColor: {
            type: 'c',
            value: []
        }
    };
    particlesGeo.attributes = attributes;

    var lineParticleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            amplitude: {
                type: 'f',
                value: 1.0
            },
            color: {
                type: 'c',
                value: new THREE.Color(0xffffff)
            },
            texture: {
                type: 't',
                value: new THREE.ImageUtils.loadTexture('img/particleA.png')
            }
        },
        vertexShader: shaders.vs.line,
        fragmentShader: shaders.fs.line,

        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false,
        transparent: true
        // sizeAttenuation: true,
    });

    particlesGeo.colors = particleColors;
    var pSystem = new THREE.Points(particlesGeo, lineParticleMaterial);
    pSystem.dynamic = true;
    connectOutline.add(pSystem);

    var vertices = pSystem.geometry.vertices;
    var valuesSize = attributes.size.value;
    var valuesColor = attributes.customColor.value;

    for (var v = 0; v < vertices.length; v++) {
        valuesSize[v] = pSystem.geometry.vertices[v].size;
        valuesColor[v] = particleColors[v];
    }

    pSystem.update = function () {
        for (var i in this.geometry.vertices) {
            var particle = this.geometry.vertices[i];
            var path = particle.path;

            particle.lerpN += 0.05;
            if (particle.lerpN > 1) {
                particle.lerpN = 0;
                particle.moveIndex = particle.nextIndex;
                particle.nextIndex++;
                if (particle.nextIndex >= path.length) {
                    particle.moveIndex = 0;
                    particle.nextIndex = 1;
                }
            }

            var currentPoint = path[particle.moveIndex];
            var nextPoint = path[particle.nextIndex];


            particle.copy(currentPoint);
            particle.lerp(nextPoint, particle.lerpN);
        }
        this.geometry.verticesNeedUpdate = true;
    };

    return connectOutline;
}

// https://github.com/stemkoski/stemkoski.github.com/blob/master/Three.js/Sprite-Text-Labels.html
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function makeTextSprite(message, parameters) {
    if (parameters === undefined) parameters = {};

    var fontface = parameters.hasOwnProperty('fontface') ?
        parameters['fontface'] : 'Arial';

    var fontsize = parameters.hasOwnProperty('fontsize') ?
        parameters['fontsize'] : 72;

    var borderThickness = parameters.hasOwnProperty('borderThickness') ?
        parameters['borderThickness'] : 4;

    var borderColor = parameters.hasOwnProperty('borderColor') ?
        parameters['borderColor'] : {
            r: 0,
            g: 0,
            b: 0,
            a: 1.0
        };

    var backgroundColor = parameters.hasOwnProperty('backgroundColor') ?
        parameters['backgroundColor'] : {
            r: 255,
            g: 255,
            b: 255,
            a: 1.0
        };

    //var spriteAlignment = THREE.SpriteAlignment.topLeft;

    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    context.font = 'Bold ' + fontsize + 'px ' + fontface;

    // get size data (height depends only on font size)
    var metrics = context.measureText(message);
    var textWidth = metrics.width;

    // background color
    context.fillStyle = 'rgba(' + backgroundColor.r + ',' + backgroundColor.g + ',' + backgroundColor.b + ',' + backgroundColor.a + ')';
    // border color
    context.strokeStyle = 'rgba(' + borderColor.r + ',' + borderColor.g + ',' + borderColor.b + ',' + borderColor.a + ')';

    context.lineWidth = borderThickness;
    roundRect(context, borderThickness / 2, borderThickness / 2, textWidth + borderThickness, fontsize * 1.4 + borderThickness, 6);
    // 1.4 is extra height factor for text below baseline: g,j,p,q.

    // text color
    context.fillStyle = 'rgba(0, 0, 0, 1.0)';

    context.fillText(message, borderThickness, fontsize + borderThickness);

    // canvas contents will be used for a texture
    var texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    var spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        //useScreenCoordinates: false,
        //alignment: spriteAlignment
    });
    var sprite = new THREE.Sprite(spriteMaterial);

    sprite.scale.set(100, 50, 1.0);
    return sprite;
}

function init() {
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1.0, 1000000);
    camera.position.z = 3000;

    scene = new THREE.Scene();

    // レンダーのセットアップ
    renderer = new THREE.WebGLRenderer({
        antialias: true
    });

    //renderer.autoClear = true;
    renderer.setClearColor(0x222222);
    //renderer.setSize(window.innerWidth, window.innerHeight);
    //renderer.domElement.style.position = 'absolute';

    // container that fullscreen will be called on.
    container = document.getElementById('vrContainer');
    container.appendChild(renderer.domElement);

    // VR stereo rendering
    vrEffect = new THREE.VREffect(renderer);
    vrEffect.setSize(window.innerWidth, window.innerHeight);

    // camera control for VR
    vrControl = new THREE.VRFlyControls(camera);

    // camera for not VR
    monoControl = new THREE.OrbitControls(camera, renderer.domElement);
    monoControl.rotateSpeed = 0.5;
    monoControl.minDistance = 500;
    monoControl.maxDistance = 6000;

    //var light = new THREE.DirectionalLight(0xffffff);
    //light.position.set(1, 1, 1).normalize();
    var light = new THREE.AmbientLight(0xffffff);
    scene.add(light);
    scene.add(conenecters);

    addAxisGrid();
    helper = true;

    var gate = createGate(safeColor);
    scene.add(gate);
    domains.push({
        hostname: ['localhost'],
        domain: 'localhost',
        object: gate
    });

    window.addEventListener('resize', onWindowResize, false);

    window.addEventListener('keydown', onkey, true);

    // enterVR button
    var enterVr = document.getElementById('enterVR');
    // when VR is not detected
    var getVr = document.getElementById('getVR');
    VRClient.getVR.then(function () {
        // vr detected
        getVr.classList.add('display-none');
    }, function () {
        // displays when VR is not detected
        enterVr.classList.add('display-none');
        getVr.classList.remove('display-none');
    });

    // VRボタンクリックでfull-screen VR mode
    enterVr.addEventListener('click', function () {
        changeMode('vr');
        vrEffect.setFullScreen(true);
    }, false);

    // 画面ダブルクリックでfull-screen VR mode
    window.addEventListener('dblclick', function () {
        changeMode('vr');
        vrEffect.setFullScreen(true);
    }, false);

    // full-screen VR modeからの復帰
    document.addEventListener('mozfullscreenchange', handleFullScreenChange);

    requestAnimationFrame(animate);
}

socket.on('packet', function (packet) {
    //console.log('packet', packet);
    var isNew = true;
    var temp = packet.hostname[0].split('.');
    //console.log('hostname', packet.hostname);
    var domain;
    if (temp[temp.length - 1] === 'com' || temp[temp.length - 1] === 'net' || temp[temp.length - 1] === 'org') {
        domain = temp[temp.length - 2] + '.' + temp[temp.length - 1];
    } else {
        domain = temp[temp.length - 3] + '.' + temp[temp.length - 2] + '.' + temp[temp.length - 1];
    }
    for (var i = 0, len = domains.length; i < len; i++) {
        if (domains[i].domain === domain) {
            isNew = false;
            domains[i].hostname.push(packet.hostname[0]);
            domains[i].hostname = domains[i].hostname.filter(function (x, i, self) {
                return self.indexOf(x) === i;
            });
            break;
        }
    }
    console.log('domains', domains);
    if (isNew) {
        var gate = createGate(warnColor);
        gate.position.set(
            Math.random() * 20000 - 10000,
            Math.random() * 20000 - 10000,
            Math.random() * 20000 - 10000
        );
        scene.add(gate);

        var spritey = makeTextSprite(
            domain, {
                fontsize: 96,
                borderColor: {
                    r: 255,
                    g: 0,
                    b: 0,
                    a: 1.0
                },
                backgroundColor: {
                    r: 255,
                    g: 100,
                    b: 100,
                    a: 0.8
                }
            }
        );
        spritey.position.set(gate.position.x + 1000, gate.position.y + 1000, gate.position.z + 1000);
        scene.add(spritey);

        var line = createLine(origin, gate.position, packet);
        conenecters.add(line);

        domains.push({
            hostname: [packet.hostname[0]],
            domain: domain,
            object: gate
        });
    }
    //console.log('domains', domains);
});

var rotate = new THREE.Vector3();
var rotateTemp = new THREE.Vector3();
var rotateDelta = new THREE.Vector3();
socket.on('sensor', function (sensor) {
    //console.log(sensor);

    if (monoControl.enabled === true) {

        if (monoControl.noRotate === true) { return; }

        if (typeof sensor.gyro !== 'undefined') {
            rotate.set(sensor.gyro.x, sensor.gyro.y, sensor.gyro.z);
            rotateDelta.subVectors( rotate, rotateTemp );

            monoControl.rotateUp(Math.PI / 180 * rotateDelta.x);
            monoControl.rotateLeft(Math.PI / 180 * rotateDelta.z);

            rotateTemp.set(sensor.gyro.x, sensor.gyro.y, sensor.gyro.z);
        }

/*
        if (monoControl.noZoom === true) { return; }

        if (dollyDelta.y > 0) {
            monoControl.dollyIn();
        } else if (dollyDelta.y < 0) {
            monoControl.dollyOut();
        }

        if (monoControl.noPan === true) { return; }

        monoControl.pan(panDelta.x, panDelta.y);
*/
    }
});

shaders.shaderSetLoaded = function () {
    init();
};

shaders.load('vs-gate', 'gate', 'vertex');
shaders.load('fs-gate', 'gate', 'fragment');

shaders.load('vs-line', 'line', 'vertex');
shaders.load('fs-line', 'line', 'fragment');