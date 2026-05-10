/**
 * @file Main script file for the worm simulation.
 * @description This script contains functions and logic for controlling the behavior of a worm simulation.
 * The simulation includes a worm-like creature that moves towards a target, interacts with food, and updates its brain.
 * It also includes an inverse kinematics chain for drawing the worm's body.
 * The script uses the BRAIN object for brain simulation and manipulation.
 * The canvas element with id "canvas" is used for rendering the simulation.
 * The script also includes utility functions for drawing shapes and handling user input.
 * {@link ISimulateBrain} interface is used to simulate the brain of the worm.
 * {@link IKSegment} class is used to create segments for the inverse kinematics chain.
 * {@link IKChain} class is used to create a chain of segments for the inverse kinematics chain.
 * @see {@link BRAIN} object for brain simulation and manipulation.
 */
document.getElementById('clearButton').onclick = function () {
	food = [];
};

document.getElementById('centerButton').onclick = function () {
	var startX = window.innerWidth / 2;
	var startY = window.innerHeight / 2;
	for (var i = 0; i < chain.nodes.length; i++) {
		chain.nodes[i].x = startX - i * chain.segmentLength;
		chain.nodes[i].y = startY + (Math.random() - 0.5) * 4;
		chain.nodes[i].vx = 0;
		chain.nodes[i].vy = 0;
	}
};

var food = [];
var collisionTimer = 0;
var lastSmell = 0;

function toggleConnectome() {
	document.getElementById('nodeHolder').style.opacity =
		document.getElementById('connectomeCheckbox').checked ? '1' : '0';
}

BRAIN.setup();

// Create a box for each post-synaptic neuron
for (var ps in BRAIN.connectome) {
	var nameBox = document.createElement('span');
	//nameBox.innerHTML = ps;
	document.getElementById('nodeHolder').appendChild(nameBox);

	var newBox = document.createElement('span');
	newBox.cols = 3;
	newBox.rows = 1;
	newBox.id = ps;
	newBox.className = 'brainNode';
	document.getElementById('nodeHolder').appendChild(newBox);
}

var frameCount = 0;
/**
 * Updates the visual representation of the brain.
 */
function updateBrainVisuals() {
	for (var postSynaptic in BRAIN.connectome) {
		var psBox = document.getElementById(postSynaptic);
		var neuron = BRAIN.postSynaptic[postSynaptic][BRAIN.thisState];

		psBox.style.backgroundColor = '#55FF55';
		psBox.style.opacity = Math.min(1, neuron / 50);
	}
}

BRAIN.randExcite();

//http://jsfiddle.net/user/ARTsinn/fiddles/

/**
 * Represents a physics-based worm model with anisotropic friction and muscle bending.
 */
var PhysicsWorm = function (numNodes, segmentLength) {
	this.nodes = [];
	this.segmentLength = segmentLength;

	// Initialize nodes in a straight line with a tiny bit of noise
	var startX = window.innerWidth / 2;
	var startY = window.innerHeight / 2;
	for (var i = 0; i < numNodes; i++) {
		this.nodes.push({
			x: startX - i * segmentLength,
			y: startY + (Math.random() - 0.5) * 4,
			vx: 0,
			vy: 0,
		});
	}

	this.update = function (segmentActivations) {
		var dt = 0.15; // Smaller timestep for higher precision/stability
		var k_spring = 0.6; // Softer springs to avoid oscillation
		var k_bend = 0.25; 
		var k_stiffness = 0.1; 
		var k_repel = 1.0; 
		var k_fwd_friction = 0.01;
		var k_lat_friction = 0.4;

		var numSegments = this.nodes.length - 1;

		this.segmentBends = [];

		// 1. Apply bending forces from muscles + Angular Stiffness
		for (var i = 1; i < numSegments; i++) {
			var prevNode = this.nodes[i - 1];
			var currNode = this.nodes[i];
			var nextNode = this.nodes[i + 1];

			var activationIdx = Math.floor((i / numSegments) * segmentActivations.length);
			if (activationIdx >= segmentActivations.length) activationIdx = segmentActivations.length - 1;
			var activation = segmentActivations[activationIdx];

			// Muscle torque
			var targetBend = (activation.right - activation.left) * k_bend;

			// Current vectors
			var v1x = currNode.x - prevNode.x;
			var v1y = currNode.y - prevNode.y;
			var v2x = nextNode.x - currNode.x;
			var v2y = nextNode.y - currNode.y;
			
			var len1 = Math.hypot(v1x, v1y) || 1;
			var len2 = Math.hypot(v2x, v2y) || 1;

			// Normalize cross product to get sine of angle (prevents quadratic force growth)
			var currentBend = (v1x * v2y - v1y * v2x) / (len1 * len2);
			this.segmentBends[i] = currentBend;

			// Combined force: muscle torque - stiffness (restoring force)
			var force = targetBend - (currentBend * k_stiffness * 20); // Scaled back up after normalization

			var p1x = -v1y / len1; 
			var p1y = v1x / len1;
			var p2x = -v2y / len2; 
			var p2y = v2x / len2;

			prevNode.vx += p1x * force;
			prevNode.vy += p1y * force;
			currNode.vx -= (p1x + p2x) * force;
			currNode.vy -= (p1y + p2y) * force;
			nextNode.vx += p2x * force;
			nextNode.vy += p2y * force;
		}

		// 2. Self-Repulsion (Prevent overlap/bunching)
		for (var i = 0; i < this.nodes.length; i++) {
			for (var j = i + 2; j < this.nodes.length; j++) {
				var n1 = this.nodes[i];
				var n2 = this.nodes[j];
				var dx = n2.x - n1.x;
				var dy = n2.y - n1.y;
				var distSq = dx * dx + dy * dy;
				var minDist = 15;
				if (distSq < minDist * minDist) {
					var dist = Math.sqrt(distSq) || 1;
					var f = (minDist - dist) * k_repel;
					var fx = (dx / dist) * f;
					var fy = (dy / dist) * f;
					n1.vx -= fx;
					n1.vy -= fy;
					n2.vx += fx;
					n2.vy += fy;
				}
			}
		}

		// 3. Distance Constraints
		for (var i = 0; i < numSegments; i++) {
			var n1 = this.nodes[i];
			var n2 = this.nodes[i + 1];
			var dx = n2.x - n1.x;
			var dy = n2.y - n1.y;
			var dist = Math.hypot(dx, dy);
			if (dist > 0) {
				var diff = dist - this.segmentLength;
				var fx = (dx / dist) * diff * k_spring;
				var fy = (dy / dist) * diff * k_spring;
				n1.vx += fx;
				n1.vy += fy;
				n2.vx -= fx;
				n2.vy -= fy;
			}
		}

		// 4. Friction and Integration
		for (var i = 0; i < this.nodes.length; i++) {
			var node = this.nodes[i];
			var fwdX = 1, fwdY = 0;
			if (i < numSegments) {
				var n2 = this.nodes[i + 1];
				var dx = node.x - n2.x;
				var dy = node.y - n2.y;
				var d = Math.hypot(dx, dy) || 1;
				fwdX = dx / d;
				fwdY = dy / d;
			} else {
				var n0 = this.nodes[i - 1];
				var dx = n0.x - node.x;
				var dy = n0.y - node.y;
				var d = Math.hypot(dx, dy) || 1;
				fwdX = dx / d;
				fwdY = dy / d;
			}
			var latX = -fwdY;
			var latY = fwdX;

			var vFwd = node.vx * fwdX + node.vy * fwdY;
			var vLat = node.vx * latX + node.vy * latY;

			vFwd *= (1 - k_fwd_friction);
			vLat *= (1 - k_lat_friction);

			node.vx = vFwd * fwdX + vLat * latX;
			node.vy = vFwd * fwdY + vLat * latY;

			node.x += node.vx * dt;
			node.y += node.vy * dt;
		}
	};
};

/* Test */

/**
 * Draws a circle on the canvas.
 *
 * @param {CanvasRenderingContext2D} ctx - The rendering context of the canvas.
 * @param {number} x - The x-coordinate of the center of the circle.
 * @param {number} y - The y-coordinate of the center of the circle.
 * @param {number} r - The radius of the circle.
 * @param {string} [c] - The color of the circle. If not provided, a default color will be used.
 */
function circle(ctx, x, y, r, c) {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2, false);
	ctx.closePath();
	if (c) {
		ctx.fillStyle = c;
		ctx.fill();
	} else {
		ctx.strokeStyle = 'rgba(255,255,255,0.1)';
		ctx.stroke();
	}
}

/**
 * Draws a line on the canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {number} x1 - The x-coordinate of the starting point of the line.
 * @param {number} y1 - The y-coordinate of the starting point of the line.
 * @param {number} x2 - The x-coordinate of the ending point of the line.
 * @param {number} y2 - The y-coordinate of the ending point of the line.
 */
function line(ctx, x1, y1, x2, y2) {
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.strokeStyle = 'rgba(255,255,255,0.5)';
	ctx.stroke();
}

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

canvas.addEventListener('mousedown', addFood, false);

/**
 * Adds food to the game at the specified coordinates.
 * @param {MouseEvent} event - The mouse event object containing the coordinates of the click.
 */
function addFood(event) {
	var x = event.x;
	var y = event.y;

	x -= canvas.offsetLeft;
	y -= canvas.offsetTop;

	food.push({ x: x, y: y });
}

/**
 * Draws the food on the canvas.
 */
function drawFood() {
	for (var i = 0; i < food.length; i++) {
		circle(ctx, food[i].x, food[i].y, 10, 'rgb(251,192,45)');
	}
}

var chain = new PhysicsWorm(35, 6); // More segments, shorter length for smoother look

function update() {
	var headX = chain.nodes[0].x;
	var headY = chain.nodes[0].y;

	// Prevent x from going off the screen
	if (headX < 0) {
		chain.nodes[0].x = 0;
		collisionTimer = 120;
	} else if (headX > window.innerWidth) {
		chain.nodes[0].x = window.innerWidth;
		collisionTimer = 120;
	}

	// Prevent y from going off the screen
	if (headY < 0) {
		chain.nodes[0].y = 0;
		collisionTimer = 120;
	} else if (headY > window.innerHeight) {
		chain.nodes[0].y = window.innerHeight;
		collisionTimer = 120;
	}

	// Calculate continuous smell gradient (Chemotaxis)
	var currentSmell = 0;
	for (var i = 0; i < food.length; i++) {
		var dist = Math.hypot(
			headX - food[i].x,
			headY - food[i].y,
		);
		
		if (dist <= 20) {
			// Eat food if close enough
			food.splice(i, 1);
			i--;
			continue;
		}
		
		currentSmell += 100 / (dist * dist + 1); // Avoid division by zero
	}

	BRAIN.foodGradient = currentSmell - lastSmell;
	lastSmell = currentSmell;

	if (collisionTimer > 0) {
		BRAIN.stimulateNoseTouchNeurons = true;
		collisionTimer--;
	} else {
		BRAIN.stimulateNoseTouchNeurons = false;
	}
	
	BRAIN.stimulateHungerNeurons = true;

	// Update Brain (Neural Loop) at 60fps
	BRAIN.update();

	// Update Brain Visuals every 10 frames to save performance
	if (frameCount % 10 === 0) {
		updateBrainVisuals();
	}
	frameCount++;

	// Update PhysicsWorm
	for (var step = 0; step < 4; step++) {
		chain.update(BRAIN.segmentActivations);
	}
}

/**
 * Draws the worm simulation with micrograph realism.
 */
function draw() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	drawFood();

	var numNodes = chain.nodes.length;
	
	// Pass 1: Translucent Body Flesh
	for (var i = numNodes - 2; i >= 0; i--) {
		var p1 = chain.nodes[i];
		var p2 = chain.nodes[i + 1];

		var progress = i / numNodes;
		// Micrograph taper: Rounded head, fat middle, extremely sharp needle tail
		var thickness = 28 * Math.pow(Math.sin(Math.PI * Math.pow(progress, 0.7)), 0.5);
		if (progress > 0.9) thickness *= (1 - (progress - 0.9) * 10); // Sharper tail
		if (thickness < 1) thickness = 1;

		ctx.beginPath();
		ctx.moveTo(p1.x, p1.y);
		ctx.lineTo(p2.x, p2.y);
		ctx.lineWidth = thickness;
		// Micrograph grey-tan translucent palette
		ctx.strokeStyle = 'rgba(235, 235, 230, 0.2)';
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
		ctx.stroke();
		
		// Pass 2: Inner "Organ" Detail
		if (i % 2 === 0 && progress > 0.2 && progress < 0.8) {
			ctx.beginPath();
			ctx.arc(p1.x, p1.y, thickness * 0.3, 0, Math.PI * 2);
			ctx.fillStyle = 'rgba(180, 180, 170, 0.15)';
			ctx.fill();
		}
	}

	// Pass 3: Edge highlight/outline for definition
	ctx.globalCompositeOperation = 'source-over';
	for (var i = numNodes - 2; i >= 0; i--) {
		var p1 = chain.nodes[i];
		var p2 = chain.nodes[i + 1];
		var progress = i / numNodes;
		var thickness = 28 * Math.pow(Math.sin(Math.PI * Math.pow(progress, 0.7)), 0.5);
		if (progress > 0.9) thickness *= (1 - (progress - 0.9) * 10);
		
		ctx.beginPath();
		ctx.moveTo(p1.x, p1.y);
		ctx.lineTo(p2.x, p2.y);
		ctx.lineWidth = thickness;
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; // Very subtle shell highlight
		ctx.stroke();
	}
}

(function resize() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	window.onresize = resize;
})();

setInterval(function () {
	update();
	draw();
}, 1e3 / 60);
