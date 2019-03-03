/*
 * The JavaScript Balls in 3D
 * Powered by Three.js
 */

var BOX_WIDTH = 2200,
	BOX_HEIGHT = 1800,
	BOX_DEPTH = 1600,
	OUTLINE_WIDTH = 4,
	FOV = 45,
	NEAR = 0.1,
	FAR = 1E4,
	NUM_BALLS = 100,
	UP = new THREE.Vector3(0, 1, 0),
	DOWN = new THREE.Vector3(0, -1, 0),
	LEFT = new THREE.Vector3(-1, 0, 0),
	RIGHT = new THREE.Vector3(1, 0, 0),
	TO = new THREE.Vector3(0, 0, -1),
	FROM = new THREE.Vector3(0, 0, 1);

var scene,
	camera,
	controls,
	renderer,
	light,
	rotateMatrix = new THREE.Matrix4(),
	clock,
	balls = [];

//var focusLost = false;

/**
 * @param {object} parameters
 * {
 *   color: Number, -- hex RGB
 *   radius: Number,
 *   position: THREE.Vector3,
 *   velocity: THREE.Vector3,
 *   density: Number,
 *   scene: THREE.Scene
 * }
 */
function Ball3D(parameters) {
	if (!parameters) {
		parameters = {};
	}

	this.color = parameters.color || randomInRange(0x000000, 0xFFFFFF);
	this.radius = parameters.radius || randomInRange(10, 100);

	// Changes in this should reflect on mesh position
	this.position = parameters.position || new THREE.Vector3(
		randomInRange(this.radius, BOX_WIDTH - this.radius),
		randomInRange(this.radius, BOX_HEIGHT - this.radius),
		randomInRange(this.radius, BOX_DEPTH - this.radius));

	var v = [BOX_WIDTH, BOX_HEIGHT, BOX_DEPTH].sort(function(a, b) {
		return a - b;
	})[0] / 4;

	this.velocity = parameters.velocity || new THREE.Vector3(
		randomInRange(-v, v),
		randomInRange(-v, v),
		randomInRange(-v, v));

	var density = parameters.density || 10;
	this.mass = density * Math.PI * Math.pow(this.radius, 2);

	var geometry = new THREE.SphereGeometry(this.radius, 32, 16);

	this.mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({
		color: this.color,
		ambient: this.color
	}));

	this.outline = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
		color: 0x000000,
		side: THREE.BackSide
	}));

	this.mesh.position = this.position;
	this.outline.position = this.position;
	this.outline.scale.multiplyScalar(1 + OUTLINE_WIDTH / this.radius);

	var scene = parameters.scene;
	if (scene instanceof THREE.Scene) {
		scene.add(this.mesh);
		scene.add(this.outline);
	}

	// This ball's movement on each step
	var dr = new THREE.Vector3();

	// Delta is in seconds
	this.update = function(delta) {
		this.position.add(dr.copy(this.velocity).multiplyScalar(delta));
	};
}

function updateBalls(balls, delta) {
	for (var i = 0, l = balls.length; i < l; i++) {
		balls[i].update(delta);
	}
}

function resolveCollisions(balls) {
	var n = new THREE.Vector3();

	for (var i = 0, l = balls.length; i < l; i++) {
		var ball = balls[i];

		for (var j = 0; j < l; j++) {
			var other = balls[j];

			if (ball !== other) {
				var p1 = ball.position;
				var p2 = other.position;
				var proximity = p1.distanceTo(p2) - (ball.radius + other.radius);

				if (proximity < 0) {
					n.copy(p1).sub(p2).normalize();

					var v1 = ball.velocity;
					var v2 = other.velocity;
					var dv = v1.dot(n) - v2.dot(n);
					var m1 = ball.mass;
					var m2 = other.mass;
					var m = m1 + m2;

					if (dv < 0) {
						var c = 2 * dv / m;
						v1.add(n.multiplyScalar(-m2 * c));
						v2.add(n.setLength(m1 * c));
					}

					proximity = -proximity + 1;
					var s1 = m2 / m * proximity;
					var s2 = m1 / m * proximity;
					p1.add(n.setLength(s1));
					p2.add(n.setLength(-s2));
				}
			}
		}
	}
}

function resolveWalls(balls) {
	for (var i = 0, l = balls.length; i < l; i++) {
		var ball = balls[i];
		var x = ball.position.x;
		var y = ball.position.y;
		var z = ball.position.z;
		var v = ball.velocity;
		var r = ball.radius;

		if (x > BOX_WIDTH - r) {
			v.reflect(LEFT);
			ball.position.x = BOX_WIDTH - r;
		}

		if (x < r) {
			v.reflect(RIGHT);
			ball.position.x = r;
		}

		if (y > BOX_HEIGHT - r) {
			v.reflect(DOWN);
			ball.position.y = BOX_HEIGHT - r;
		}

		if (y < r) {
			v.reflect(UP);
			ball.position.y = r;
		}

		if (z > BOX_DEPTH - r) {
			v.reflect(TO);
			ball.position.z = BOX_DEPTH - r;
		}

		if (z < r) {
			v.reflect(FROM);
			ball.position.z = r;
		}
	}
}

function updateLight(delta) {
	rotateMatrix.makeRotationAxis(UP, delta * Math.PI / 6);
	light.position.applyMatrix4(rotateMatrix);
}

function update() {
	var delta = clock.getDelta();

	controls.update();

	updateLight(delta);
	updateBalls(balls, delta);

	resolveCollisions(balls);
	resolveWalls(balls);
}

function render() {
	renderer.render(scene, camera);
}

function mainLoop() {
	requestAnimationFrame(mainLoop);

//	if (focusLost) {
//		return;
//	}

	update();
	render();
}

function init() {
	clock = new THREE.Clock(true);
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, NEAR, FAR);
	renderer = new THREE.WebGLRenderer({antialias: true});
	controls = new THREE.OrbitControls(camera);

	document.body.appendChild(renderer.domElement);

	controls.minDistance = NEAR;
	controls.maxDistance = FAR / 2;
	controls.autoRotate = true;

	renderer.setSize(window.innerWidth, window.innerHeight);

	camera.position = new THREE.Vector3(FAR / 3, FAR / 3, FAR / 3);

	light = new THREE.DirectionalLight();
	light.position.copy(UP).add(RIGHT).add(FROM);

	scene.add(light);
	scene.add(new THREE.AmbientLight(0x404040));

	// The Box
	var box = new THREE.Mesh(new THREE.BoxGeometry(BOX_WIDTH, BOX_HEIGHT, BOX_DEPTH), new THREE.MeshNormalMaterial({
		transparent: true,
		opacity: 0.15,
		side: THREE.DoubleSide
	}));

	box.position.set(BOX_WIDTH / 2, BOX_HEIGHT / 2, BOX_DEPTH / 2);

	controls.center.copy(box.position);
	scene.add(box);

	// Sky sphere
	var sky = new THREE.Mesh(
		new THREE.SphereGeometry(FAR / 2, 8, 8),
		new THREE.MeshBasicMaterial({
			color: 200 << 16 | 215 << 8 | 255,
			side: THREE.BackSide
		}));

	sky.position.copy(box.position);

	scene.add(sky);

	for (var i = 0; i < NUM_BALLS; i++) {
		balls.push(new Ball3D({scene: scene}));
	}
}

window.onload = function() {
	init();
	mainLoop();
};

window.onresize = function() {
	renderer.setSize(window.innerWidth, window.innerHeight);

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
};

//window.onblur = function() {
//	focusLost = true;
//	clock.stop();
//};
//
//window.onfocus = function() {
//	focusLost = false;
//};

function randomInRange(min, max) {
	return Math.random() * (max - min) + min;
}
