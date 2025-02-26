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
	target.x = window.innerWidth / 2;
	target.y = window.innerHeight / 2;
};

var facingDir = 0;
var targetDir = 0;
var speed = 0;
var targetSpeed = 0;
var speedChangeInterval = 0;
var food = [];

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

/**
 * Updates the brain of the worm.
 * This function updates the brain's state, updates the visual representation of the post-synaptic connections,
 * calculates the new direction and speed of the worm based on the accumulated left and right inputs.
 */
function updateBrain() {
	BRAIN.update();
	for (var postSynaptic in BRAIN.connectome) {
		var psBox = document.getElementById(postSynaptic);
		var neuron = BRAIN.postSynaptic[postSynaptic][BRAIN.thisState];

		psBox.style.backgroundColor = '#55FF55';
		psBox.style.opacity = Math.min(1, neuron / 50);
	}
	let scalingFactor = 20;
	let newDir = (BRAIN.accumleft - BRAIN.accumright) / scalingFactor;
	targetDir = facingDir + newDir * Math.PI;
	//targetDir = facingDir + calculateFinalDirection(BRAIN.accumleft/200, BRAIN.accumright/200);
	targetSpeed =
		(Math.abs(BRAIN.accumleft) + Math.abs(BRAIN.accumright)) /
		(scalingFactor * 5);
	speedChangeInterval = (targetSpeed - speed) / (scalingFactor * 1.5);
}

BRAIN.randExcite();
setInterval(updateBrain, 500);

function calculateFinalDirection(leftPercentage, rightPercentage) {
	const maxTurnAngle = Math.PI / 2; // 90 degrees in radians
	const leftTurnAngle = leftPercentage * maxTurnAngle;
	const rightTurnAngle = rightPercentage * maxTurnAngle;

	const finalDirection = rightTurnAngle - leftTurnAngle;

	return finalDirection;
}

//http://jsfiddle.net/user/ARTsinn/fiddles/

/**
 * Represents an Inverse Kinematics (IK) segment.
 * @constructor
 * @param {number} size - The size of the segment.
 * @param {Object} head - The position of the segment's head.
 * @param {number} head.x - The x-coordinate of the head.
 * @param {number} head.y - The y-coordinate of the head.
 * @param {Object} tail - The position of the segment's tail.
 * @param {number} tail.x - The x-coordinate of the tail.
 * @param {number} tail.y - The y-coordinate of the tail.
 */
var IKSegment = function (size, head, tail) {
	this.size = size;
	this.head = head || {
		x: 0.0,
		y: 0.0,
	};
	this.tail = tail || {
		x: this.head.x + size,
		y: this.head.y + size,
	};

	this.update = function () {
		// Position derivitives
		var dx = this.head.x - this.tail.x;
		var dy = this.head.y - this.tail.y;

		// Distance between head and tail
		var dist = Math.sqrt(dx * dx + dy * dy);
		// Force of the spring (Hook's Law)
		var force = 0.5 - (this.size / dist) * 0.5;
		var strength = 0.998; // No springiness

		// Dampening
		force *= 0.99;

		// Force vectors
		var fx = force * dx;
		var fy = force * dy;

		// Update head and tail positions
		this.tail.x += fx * strength * 2.0;
		this.tail.y += fy * strength * 2.0;
		this.head.x -= fx * (1.0 - strength) * 2.0;
		this.head.y -= fy * (1.0 - strength) * 2.0;
	};
};

/**
 * Represents an inverse kinematics chain. It is a collection of IK segments.
 * @constructor
 * @param {number} size - The number of links in the chain.
 * @param {number} interval - The interval between each link.
 */
var IKChain = function (size, interval) {
	this.links = new Array(size);

	this.update = function (target) {
		var link = this.links[0];

		link.head.x = target.x;
		link.head.y = target.y;

		for (var i = 0, n = this.links.length; i < n; ++i) {
			this.links[i].update();
		}
	};

	var point = {
		x: 0,
		y: 0,
	};

	for (var i = 0, n = this.links.length; i < n; ++i) {
		var link = (this.links[i] = new IKSegment(interval, point));
		link.head.x = Math.random() * 500;
		link.head.y = Math.random() * 500;
		link.tail.x = Math.random() * 500;
		link.tail.y = Math.random() * 500;
		point = link.tail;
	}
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

var target = {
	x: window.innerWidth / 2,
	y: window.innerHeight / 2,
};

var chain = new IKChain(200, 1);

function update() {
	speed += speedChangeInterval;

	var facingMinusTarget = facingDir - targetDir;
	var angleDiff = facingMinusTarget;

	// Calculate the smallest angle difference between the facing direction and the target direction
	if (Math.abs(facingMinusTarget) > 180) {
		if (facingDir > targetDir) {
			angleDiff = -1 * (360 - facingDir + targetDir);
		} else {
			angleDiff = 360 - targetDir + facingDir;
		}
	}

	// Rotate the worm towards the target direction
	if (angleDiff > 0) {
		facingDir -= 0.1;
	} else if (angleDiff < 0) {
		facingDir += 0.1;
	}

	// Resolve the x and y components of the speed vector and update the worm's position
	target.x += Math.cos(facingDir) * speed;
	target.y -= Math.sin(facingDir) * speed;

	// Prevent x from going off the screen
	if (target.x < 0) {
		target.x = 0;
		BRAIN.stimulateNoseTouchNeurons = true;
	} else if (target.x > window.innerWidth) {
		target.x = window.innerWidth;
		BRAIN.stimulateNoseTouchNeurons = true;
	}

	// Prevent y from going off the screen
	if (target.y < 0) {
		target.y = 0;
		BRAIN.stimulateNoseTouchNeurons = true;
	} else if (target.y > window.innerHeight) {
		target.y = window.innerHeight;
		BRAIN.stimulateNoseTouchNeurons = true;
	}

	// Check if the worm is near food
	for (var i = 0; i < food.length; i++) {
		if (
			Math.hypot(
				Math.round(target.x) - food[i].x,
				Math.round(target.y) - food[i].y,
			) <= 50
		) {
			// simulate food sense if food nearby
			BRAIN.stimulateFoodSenseNeurons = true;

			if (
				Math.hypot(
					Math.round(target.x) - food[i].x,
					Math.round(target.y) - food[i].y,
				) <= 20
			) {
				// eat food if close enough
				food.splice(i, 1);
			}
		}
	}

	// Reset neuron stimulation after 2 seconds
	setTimeout(function () {
		BRAIN.stimulateHungerNeurons = true;
		BRAIN.stimulateNoseTouchNeurons = false;
		BRAIN.stimulateFoodSenseNeurons = false;
	}, 2000);

	// Update IK chain
	chain.update(target);
}

/**
 * Draws the worm simulation on the canvas.
 */
function draw() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	drawFood();

	circle(ctx, target.x, target.y, 5, 'rgba(255,255,255,0.1)');

	var link = chain.links[0];
	var p1 = link.head,
		p2 = link.tail;

	ctx.beginPath();
	ctx.moveTo(p1.x, p1.y);
	ctx.strokeStyle = 'white';
	ctx.lineWidth = 20;
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';

	for (var i = 0, n = chain.links.length; i < n; ++i) {
		link = chain.links[i];
		p1 = link.head;
		p2 = link.tail;
		ctx.lineTo(p1.x, p1.y);
		ctx.lineTo(p2.x, p2.y);
	}

	ctx.stroke();
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
