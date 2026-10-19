/**
 * @file Main script file for the worm simulation.
 * @description Wires the simulated connectome (BRAIN) to a physics-based worm body, renders the
 * worm, its food and its tracks on the canvas with id "canvas", and draws live connectome activity
 * on the canvas with id "brainCanvas".
 * {@link PhysicsWorm} models the body as a chain of nodes with anisotropic friction.
 * @see {@link BRAIN} object for brain simulation and manipulation.
 */

/* ---------- Theme ---------- */

var theme = {};
var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Reads canvas colors from the CSS custom properties so the canvas follows the device theme.
 */
function readTheme() {
	var cs = getComputedStyle(document.documentElement);
	function v(name) {
		return cs.getPropertyValue('--' + name).trim();
	}
	theme.ink = v('ink-rgb');
	theme.accent = v('accent-rgb');
	theme.food = v('food-rgb');
	theme.wormFill = v('worm-fill');
	theme.wormStroke = v('worm-stroke');
	theme.wormDetail = v('worm-detail');
	theme.trailAlpha = parseFloat(v('trail-alpha')) || 0.05;
	theme.neuronIdle = v('neuron-idle');
}

/**
 * Builds an rgba() string from an "r, g, b" triplet.
 */
function rgba(triplet, a) {
	return 'rgba(' + triplet + ',' + a + ')';
}

readTheme();
if (darkQuery.addEventListener) {
	darkQuery.addEventListener('change', readTheme);
} else if (darkQuery.addListener) {
	darkQuery.addListener(readTheme);
}

/* ---------- View ---------- */

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

// World units are screen pixels divided by `scale`, so the worm shrinks a little on small screens.
var VIEW = { w: window.innerWidth, h: window.innerHeight, scale: 1, dpr: 1 };

function resize() {
	var w = window.innerWidth;
	var h = window.innerHeight;
	VIEW.dpr = Math.min(window.devicePixelRatio || 1, 2);
	VIEW.scale = Math.max(0.72, Math.min(1.25, Math.min(w, h) / 700));
	VIEW.w = w / VIEW.scale;
	VIEW.h = h / VIEW.scale;
	canvas.width = Math.round(w * VIEW.dpr);
	canvas.height = Math.round(h * VIEW.dpr);
	resizeBrainCanvas();
}

/* ---------- Simulation state ---------- */

var food = [];
var ripples = [];
var trail = [];
var TRAIL_MAX = 700;
var TRAIL_SPACING = 4;
var collisionTimer = 0;
var tailTouchTimer = 0;
var lastSmell = 0;
var smellTrend = 0;
var eaten = 0;
var frameCount = 0;
var FOOD_RADIUS = 10;
var MOUTH_FOOD_HITBOX_RADIUS = FOOD_RADIUS + 2;

BRAIN.setup();

/* ---------- Controls ---------- */

var simulationSpeed = 1;
var clearButton = document.getElementById('clearButton');
var brainButton = document.getElementById('brainButton');
var brainPanel = document.getElementById('brainPanel');
var hint = document.getElementById('hint');

clearButton.onclick = function () {
	food = [];
	syncFoodUI();
};

document.getElementById('centerButton').onclick = function () {
	var startX = VIEW.w / 2 - (chain.nodes.length * chain.segmentLength) / 2;
	var startY = VIEW.h / 2;
	for (var i = 0; i < chain.nodes.length; i++) {
		chain.nodes[i].x = startX + i * chain.segmentLength;
		chain.nodes[i].y = startY + (Math.random() - 0.5) * 4;
		chain.nodes[i].vx = 0;
		chain.nodes[i].vy = 0;
	}
	trail = [];
};

brainButton.onclick = function () {
	var show = brainButton.getAttribute('aria-pressed') !== 'true';
	brainButton.setAttribute('aria-pressed', show ? 'true' : 'false');
	brainButton.title = show ? 'Hide connectome' : 'Show connectome';
	brainPanel.classList.toggle('is-hidden', !show);
};
brainButton.title = 'Hide connectome';

function syncFoodUI() {
	clearButton.disabled = food.length === 0;
	document.getElementById('eatenText').textContent = eaten ? eaten + ' eaten' : '';
}

canvas.addEventListener('pointerdown', function (event) {
	if (event.button > 0) return;
	food.push({
		x: event.clientX / VIEW.scale,
		y: event.clientY / VIEW.scale,
		born: performance.now(),
		phase: Math.random() * Math.PI * 2,
	});
	hint.classList.add('is-hidden');
	syncFoodUI();
});

/* ---------- Status ---------- */

var statusEl = document.getElementById('status');
var statusText = document.getElementById('statusText');
var STATUS_LABELS = {
	forage: 'Foraging',
	approach: 'Following scent',
	search: 'Searching for scent',
	touch: 'Nose touch',
	reverse: 'Reversing',
	turn: 'Omega turn',
};
var pendingState = 'forage';
var pendingFrames = 0;

/**
 * Describes what the worm is sensing, debounced so the label doesn't flicker with every undulation.
 */
function updateStatus() {
	var state = 'forage';
	if (collisionTimer > 0) state = 'touch';
	else if (BRAIN.reversing) state = 'reverse';
	else if (BRAIN.turning > 0) state = 'turn';
	else if (food.length > 0) state = smellTrend > 0.0004 ? 'approach' : 'search';

	if (state !== pendingState) {
		pendingState = state;
		pendingFrames = 0;
	} else if (++pendingFrames === 20 && statusEl.dataset.state !== state) {
		statusEl.dataset.state = state;
		statusText.textContent = STATUS_LABELS[state];
	}
}

/* ---------- Physics ---------- */

//http://jsfiddle.net/user/ARTsinn/fiddles/

var PhysicsWorm = function (numNodes, segmentLength) {
	this.nodes = [];
	this.segmentLength = segmentLength;

	// Initialize nodes in a random orientation to break global bias
	var startX = VIEW.w / 2;
	var startY = VIEW.h / 2;
	var startAngle = Math.random() * Math.PI * 2;
	for (var i = 0; i < numNodes; i++) {
		this.nodes.push({
			x: startX + Math.cos(startAngle) * i * segmentLength,
			y: startY + Math.sin(startAngle) * i * segmentLength,
			vx: 0,
			vy: 0,
		});
	}

	/**
	 * Advances the body one physics step. At the worm's size inertia is negligible, so the body is
	 * overdamped: each node moves at a velocity set by the force on it and by resistive drag that is
	 * much higher sideways than lengthwise, as for a worm crawling in an agar groove.
	 */
	this.update = function (segmentActivations) {
		var SUBSTEPS = 8;
		var dt = 0.75;
		var k_bend = 100; // Bending stiffness of body and muscles, per radian
		var BEND_MAX = 0.4; // Joint angle (radians) the muscles reach at full one-sided contraction
		var k_repel = 1.2;
		var DRAG_RATIO = 30; // Sideways to lengthwise drag; roughly 10-40 for crawling on agar
		var LENGTH_ITERATIONS = 3;

		var nodes = this.nodes;
		var numSegments = nodes.length - 1;
		this.segmentBends = [];

		// Target joint angles from the muscles, which run the full length of the body
		var targets = [];
		for (var i = 1; i < numSegments; i++) {
			var activationIdx = Math.min(segmentActivations.length - 1, Math.floor((i / numSegments) * segmentActivations.length));
			var activation = segmentActivations[activationIdx];
			var dorsal = activation.dorsal || 0;
			var ventral = activation.ventral || 0;
			// Steering is not added here: the worm turns only by bending its head more to one side
			targets[i] = BEND_MAX * (ventral - dorsal) / (ventral + dorsal + 0.6);
		}

		// Self-repulsion so the body cannot pass through itself. It changes slowly, so it is worked
		// out once per step rather than every substep.
		for (var i = 0; i < nodes.length; i++) {
			nodes[i].px = nodes[i].x;
			nodes[i].py = nodes[i].y;
			nodes[i].rx = 0;
			nodes[i].ry = 0;
		}
		for (var i = 0; i < nodes.length; i++) {
			for (var j = i + 2; j < nodes.length; j++) {
				var n1 = nodes[i];
				var n2 = nodes[j];
				var dx = n2.x - n1.x;
				var dy = n2.y - n1.y;
				var distSq = dx * dx + dy * dy;
				var minDist = 12;
				if (distSq < minDist * minDist) {
					var dist = Math.sqrt(distSq) || 1;
					var f = (minDist - dist) * k_repel;
					var fx = (dx / dist) * f;
					var fy = (dy / dist) * f;
					n1.rx -= fx;
					n1.ry -= fy;
					n2.rx += fx;
					n2.ry += fy;
				}
			}
		}

		for (var step = 0; step < SUBSTEPS; step++) {
			for (var i = 0; i < nodes.length; i++) {
				var node = nodes[i];
				node.fx = node.rx;
				node.fy = node.ry;
				// Unit tangent along the body at this node, used for drag
				var a = nodes[Math.max(0, i - 1)];
				var b = nodes[Math.min(numSegments, i + 1)];
				var tl = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)) || 1;
				node.tx = (a.x - b.x) / tl;
				node.ty = (a.y - b.y) / tl;
			}

			// 1. Bending: muscles set each joint's target angle and body stiffness pulls toward it
			for (var i = 1; i < numSegments; i++) {
				var prevNode = nodes[i - 1];
				var currNode = nodes[i];
				var nextNode = nodes[i + 1];
				var v1x = currNode.x - prevNode.x;
				var v1y = currNode.y - prevNode.y;
				var v2x = nextNode.x - currNode.x;
				var v2y = nextNode.y - currNode.y;
				var len1 = Math.sqrt(v1x * v1x + v1y * v1y) || 1;
				var len2 = Math.sqrt(v2x * v2x + v2y * v2y) || 1;
				var cross = v1x * v2y - v1y * v2x;

				// Sine of the joint angle, positive toward the ventral side
				this.segmentBends[i] = cross / (len1 * len2);

				var angle = Math.atan2(cross, v1x * v2x + v1y * v2y);
				var torque = k_bend * (targets[i] - angle);

				// Apply the torque as a force couple on the two segments
				var f1x = (-v1y / len1) * torque / len1;
				var f1y = (v1x / len1) * torque / len1;
				var f2x = (-v2y / len2) * torque / len2;
				var f2y = (v2x / len2) * torque / len2;
				prevNode.fx += f1x;
				prevNode.fy += f1y;
				nextNode.fx += f2x;
				nextNode.fy += f2y;
				currNode.fx -= f1x + f2x;
				currNode.fy -= f1y + f2y;
			}

			// 2. Resistive drag. This is the only thing that turns the bending wave into motion, so a
			// wave travelling head to tail moves the worm forward and tail to head moves it backward.
			for (var i = 0; i < nodes.length; i++) {
				var node = nodes[i];
				var fAlong = node.fx * node.tx + node.fy * node.ty;
				var fAcross = (node.fy * node.tx - node.fx * node.ty) / DRAG_RATIO;
				node.x += (fAlong * node.tx - fAcross * node.ty) * dt;
				node.y += (fAlong * node.ty + fAcross * node.tx) * dt;
			}

			// 3. Segment length. Each node gives way in proportion to how easily it moves in that
			// direction, so holding the body together does not bypass the drag.
			for (var iter = 0; iter < LENGTH_ITERATIONS; iter++) {
				for (var i = 0; i < numSegments; i++) {
					var n1 = nodes[i];
					var n2 = nodes[i + 1];
					var dx = n2.x - n1.x;
					var dy = n2.y - n1.y;
					var dist = Math.sqrt(dx * dx + dy * dy);
					if (!dist) continue;
					dx /= dist;
					dy /= dist;
					// Displacement of each node per unit push along (dx, dy), given its drag
					var a1 = dx * n1.tx + dy * n1.ty;
					var b1 = (dy * n1.tx - dx * n1.ty) / DRAG_RATIO;
					var m1x = a1 * n1.tx - b1 * n1.ty;
					var m1y = a1 * n1.ty + b1 * n1.tx;
					var a2 = dx * n2.tx + dy * n2.ty;
					var b2 = (dy * n2.tx - dx * n2.ty) / DRAG_RATIO;
					var m2x = a2 * n2.tx - b2 * n2.ty;
					var m2y = a2 * n2.ty + b2 * n2.tx;
					var lambda = (dist - this.segmentLength) / (m1x * dx + m1y * dy + m2x * dx + m2y * dy);
					n1.x += m1x * lambda;
					n1.y += m1y * lambda;
					n2.x -= m2x * lambda;
					n2.y -= m2y * lambda;
				}
			}
		}

		for (var i = 0; i < nodes.length; i++) {
			nodes[i].vx = nodes[i].x - nodes[i].px;
			nodes[i].vy = nodes[i].y - nodes[i].py;
		}
	};
};

var chain;

/**
 * Advances the brain and body by one simulation tick.
 */
function update() {
	// Keep the whole body inside the dish. The nose touching the edge stimulates the nose touch
	// neurons, and the tail touching it (when backing up) stimulates the posterior touch neurons.
	var last = chain.nodes.length - 1;
	for (var i = 0; i <= last; i++) {
		var node = chain.nodes[i];
		var x = Math.max(0, Math.min(VIEW.w, node.x));
		var y = Math.max(0, Math.min(VIEW.h, node.y));
		if (x === node.x && y === node.y) continue;
		node.x = x;
		node.y = y;
		if (i === 0) collisionTimer = 120;
		else if (i >= last - 2) tailTouchTimer = 60;
	}
	var headX = chain.nodes[0].x;
	var headY = chain.nodes[0].y;

	// Calculate continuous smell gradient (Chemotaxis)
	var currentSmell = 0;
	for (var i = 0; i < food.length; i++) {
		var dist = Math.hypot(headX - food[i].x, headY - food[i].y);
		currentSmell += 200 / (dist + 1); // Linear smell for better distance gradient
	}

	BRAIN.foodGradient = currentSmell - lastSmell;
	lastSmell = currentSmell;
	smellTrend += (BRAIN.foodGradient - smellTrend) * 0.05;

	if (collisionTimer > 0) {
		BRAIN.stimulateNoseTouchNeurons = true;
		collisionTimer--;
	} else {
		BRAIN.stimulateNoseTouchNeurons = false;
	}
	BRAIN.stimulateTailTouchNeurons = tailTouchTimer > 0;
	if (tailTouchTimer > 0) tailTouchTimer--;

	BRAIN.stimulateHungerNeurons = true;

	BRAIN.update(chain.segmentBends);
	frameCount++;

	for (var step = 0; step < 4; step++) {
		chain.update(BRAIN.segmentActivations);

		// Precise food consumption check
		var hX = chain.nodes[0].x;
		var hY = chain.nodes[0].y;
		for (var i = 0; i < food.length; i++) {
			var d = Math.hypot(hX - food[i].x, hY - food[i].y);
			if (d < MOUTH_FOOD_HITBOX_RADIUS) {
				ripples.push({ x: food[i].x, y: food[i].y, born: performance.now() });
				food.splice(i, 1);
				i--;
				eaten++;
				syncFoodUI();
			}
		}
	}

	recordTrail();
}

/* ---------- Rendering ---------- */

/**
 * Remembers where the middle of the body has been, so the worm leaves tracks in the agar.
 */
function recordTrail() {
	var node = chain.nodes[Math.floor(chain.nodes.length * 0.45)];
	var last = trail[trail.length - 1];
	if (!last || Math.hypot(node.x - last.x, node.y - last.y) >= TRAIL_SPACING) {
		trail.push({ x: node.x, y: node.y });
		if (trail.length > TRAIL_MAX) trail.shift();
	}
}

function drawTrail() {
	if (trail.length < 2) return;
	var FADE = 175;
	var CHUNK = 25;
	ctx.lineWidth = BODY_WIDTH * 0.9;
	ctx.lineJoin = 'round';
	ctx.lineCap = 'butt';

	// Only the oldest stretch fades out; the rest is one stroke so there are no seams
	var fadeEnd = Math.max(0, FADE - (TRAIL_MAX - trail.length));
	for (var c = 0; c * CHUNK < fadeEnd; c++) {
		var from = c * CHUNK;
		var to = Math.min(fadeEnd, from + CHUNK);
		strokeTrail(from, to, theme.trailAlpha * (from + (TRAIL_MAX - trail.length) + CHUNK) / (FADE + CHUNK));
	}
	strokeTrail(fadeEnd, trail.length - 1, theme.trailAlpha);
}

function strokeTrail(from, to, alpha) {
	if (to <= from) return;
	ctx.strokeStyle = rgba(theme.ink, alpha);
	ctx.beginPath();
	ctx.moveTo(trail[from].x, trail[from].y);
	for (var i = from + 1; i <= to; i++) ctx.lineTo(trail[i].x, trail[i].y);
	ctx.stroke();
}

function easeOutBack(t) {
	var s = 1.7;
	t -= 1;
	return t * t * ((s + 1) * t + s) + 1;
}

function drawFood(now) {
	for (var i = 0; i < food.length; i++) {
		var f = food[i];
		var grow = easeOutBack(Math.min(1, (now - f.born) / 450));
		var pulse = reducedMotion ? 1 : 1 + 0.08 * Math.sin(now / 520 + f.phase);

		// Scent halo
		var haloR = FOOD_RADIUS * 5 * pulse * Math.max(0, grow);
		if (haloR > 0) {
			var g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, haloR);
			g.addColorStop(0, rgba(theme.food, 0.2));
			g.addColorStop(0.35, rgba(theme.food, 0.07));
			g.addColorStop(1, rgba(theme.food, 0));
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc(f.x, f.y, haloR, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.beginPath();
		ctx.arc(f.x, f.y, Math.max(0, FOOD_RADIUS * grow), 0, Math.PI * 2);
		ctx.strokeStyle = rgba(theme.food, 0.45);
		ctx.lineWidth = 1;
		ctx.stroke();

		ctx.beginPath();
		ctx.arc(f.x, f.y, Math.max(0, FOOD_RADIUS * 0.55 * grow), 0, Math.PI * 2);
		ctx.fillStyle = rgba(theme.food, 1);
		ctx.fill();
	}

	// Ripples where food was eaten
	for (var i = ripples.length - 1; i >= 0; i--) {
		var t = (now - ripples[i].born) / 700;
		if (t >= 1) {
			ripples.splice(i, 1);
			continue;
		}
		var ease = 1 - Math.pow(1 - t, 3);
		ctx.beginPath();
		ctx.arc(ripples[i].x, ripples[i].y, FOOD_RADIUS + ease * 34, 0, Math.PI * 2);
		ctx.strokeStyle = rgba(theme.food, 0.55 * (1 - t));
		ctx.lineWidth = 1.5;
		ctx.stroke();
	}
}

var BODY_WIDTH = 17;

/**
 * Body width along the worm: rounded head, even body, long tapering tail.
 */
function bodyWidth(p) {
	if (p < 0.16) return BODY_WIDTH * (0.6 + 0.4 * Math.sin((p / 0.16) * Math.PI / 2));
	if (p > 0.6) return BODY_WIDTH * Math.pow(1 - (p - 0.6) / 0.4, 1.25);
	return BODY_WIDTH;
}

/**
 * Traces a smooth closed path through points using midpoint quadratic curves.
 */
function smoothClosedPath(points) {
	var n = points.length;
	ctx.beginPath();
	ctx.moveTo((points[n - 1].x + points[0].x) / 2, (points[n - 1].y + points[0].y) / 2);
	for (var i = 0; i < n; i++) {
		var p = points[i];
		var q = points[(i + 1) % n];
		ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
	}
	ctx.closePath();
}

/**
 * Point and unit direction (toward the head) at a fractional node index.
 */
function bodyFrame(t) {
	var nodes = chain.nodes;
	var i = Math.max(0, Math.min(nodes.length - 2, Math.floor(t)));
	var f = t - i;
	var a = nodes[i];
	var b = nodes[i + 1];
	var dx = a.x - b.x;
	var dy = a.y - b.y;
	var d = Math.hypot(dx, dy) || 1;
	return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, fx: dx / d, fy: dy / d };
}

function drawWorm() {
	var nodes = chain.nodes;
	var n = nodes.length;
	var left = [];
	var right = [];

	for (var i = 0; i < n; i++) {
		var a = nodes[Math.max(0, i - 1)];
		var b = nodes[Math.min(n - 1, i + 1)];
		var tx = a.x - b.x;
		var ty = a.y - b.y;
		var tl = Math.hypot(tx, ty) || 1;
		var nx = -ty / tl;
		var ny = tx / tl;
		var r = bodyWidth(i / (n - 1)) / 2;
		left.push({ x: nodes[i].x + nx * r, y: nodes[i].y + ny * r });
		right.push({ x: nodes[i].x - nx * r, y: nodes[i].y - ny * r });
	}

	// Outline: rounded head cap, down the right side, tail tip, back up the left side
	var outline = [];
	var head = bodyFrame(0);
	var headAngle = Math.atan2(head.fy, head.fx);
	var headR = bodyWidth(0) / 2;
	for (var k = 0; k <= 8; k++) {
		var ang = headAngle + Math.PI / 2 - (k / 8) * Math.PI;
		outline.push({ x: nodes[0].x + Math.cos(ang) * headR, y: nodes[0].y + Math.sin(ang) * headR });
	}
	for (var i = 1; i < n; i++) outline.push(right[i]);
	var tail = bodyFrame(n - 1.001);
	outline.push({ x: nodes[n - 1].x - tail.fx * 3, y: nodes[n - 1].y - tail.fy * 3 });
	for (var i = n - 1; i >= 1; i--) outline.push(left[i]);

	// Head glow while following a scent
	var scent = Math.max(0, Math.min(1, smellTrend / 0.004));
	if (scent > 0.02) {
		var glowR = BODY_WIDTH * 2.6;
		var g = ctx.createRadialGradient(nodes[0].x, nodes[0].y, 0, nodes[0].x, nodes[0].y, glowR);
		g.addColorStop(0, rgba(theme.accent, 0.2 * scent));
		g.addColorStop(1, rgba(theme.accent, 0));
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(nodes[0].x, nodes[0].y, glowR, 0, Math.PI * 2);
		ctx.fill();
	}

	smoothClosedPath(outline);
	ctx.fillStyle = theme.wormFill;
	ctx.fill();

	// Gut
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.beginPath();
	var gutStart = Math.round(n * 0.2);
	var gutEnd = Math.round(n * 0.82);
	ctx.moveTo(nodes[gutStart].x, nodes[gutStart].y);
	for (var i = gutStart + 1; i <= gutEnd; i++) {
		var mx = (nodes[i - 1].x + nodes[i].x) / 2;
		var my = (nodes[i - 1].y + nodes[i].y) / 2;
		ctx.quadraticCurveTo(nodes[i - 1].x, nodes[i - 1].y, mx, my);
	}
	ctx.strokeStyle = theme.wormDetail;
	ctx.lineWidth = BODY_WIDTH * 0.28;
	ctx.stroke();

	// Pharynx: a fine tube with two muscular bulbs
	ctx.beginPath();
	ctx.moveTo(nodes[0].x + head.fx * headR * 0.7, nodes[0].y + head.fy * headR * 0.7);
	for (var i = 1; i <= gutStart; i++) ctx.lineTo(nodes[i].x, nodes[i].y);
	ctx.lineWidth = 1.2;
	ctx.stroke();

	ctx.fillStyle = theme.wormDetail;
	[[1.6, 0.17], [gutStart - 1.2, 0.22]].forEach(function (bulb) {
		var p = bodyFrame(bulb[0]);
		ctx.beginPath();
		ctx.ellipse(p.x, p.y, BODY_WIDTH * bulb[1] * 1.3, BODY_WIDTH * bulb[1], Math.atan2(p.fy, p.fx), 0, Math.PI * 2);
		ctx.fill();
	});

	smoothClosedPath(outline);
	ctx.strokeStyle = theme.wormStroke;
	ctx.lineWidth = 1.2;
	ctx.stroke();
}

function draw(now) {
	var s = VIEW.dpr * VIEW.scale;
	ctx.setTransform(s, 0, 0, s, 0, 0);
	ctx.clearRect(0, 0, VIEW.w, VIEW.h);
	drawTrail();
	drawFood(now);
	drawWorm();
}

/* ---------- Connectome view ---------- */

var brainCanvas = document.getElementById('brainCanvas');
var bctx = brainCanvas.getContext('2d');
var brainLabel = document.getElementById('brainLabel');
var brainMeta = document.getElementById('brainMeta');
var neurons = [];
var hoveredNeuron = null;
var muscleMax = 1;
var BRAIN_STRIP = 30;
var brainSize = 0;

/**
 * Lays the neurons out on a sunflower spiral, most connected hubs in the middle.
 */
function buildBrainLayout() {
	var degree = {};
	for (var pre in BRAIN.weights) {
		for (var post in BRAIN.weights[pre]) {
			degree[pre] = (degree[pre] || 0) + 1;
			degree[post] = (degree[post] || 0) + 1;
		}
	}
	var names = BRAIN.neurons.slice();
	names.sort(function (a, b) {
		return (degree[b] || 0) - (degree[a] || 0);
	});
	var golden = Math.PI * (3 - Math.sqrt(5));
	neurons = names.map(function (name, k) {
		var r = Math.sqrt((k + 0.5) / names.length);
		return { name: name, ux: r * Math.cos(k * golden), uy: r * Math.sin(k * golden), level: 0 };
	});
	showNeuronCount();
}

function showNeuronCount() {
	brainMeta.innerHTML = neurons.length + '<span class="unit"> neurons</span>';
}

function resizeBrainCanvas() {
	var dpr = VIEW.dpr;
	brainSize = brainCanvas.clientWidth;
	brainCanvas.style.height = brainSize + BRAIN_STRIP + 'px';
	brainCanvas.width = Math.round(brainSize * dpr);
	brainCanvas.height = Math.round((brainSize + BRAIN_STRIP) * dpr);
}

function brainGeometry() {
	var R = brainSize / 2 - 2;
	return { cx: brainSize / 2, cy: brainSize / 2, R: R, dot: Math.max(1.1, R * 0.82 / Math.sqrt(neurons.length)) };
}

function drawBrain() {
	if (brainPanel.classList.contains('is-hidden') || !brainSize) return;
	var dpr = VIEW.dpr;
	var geo = brainGeometry();
	bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	bctx.clearRect(0, 0, brainSize, brainSize + BRAIN_STRIP);

	// Idle neurons in one pass
	bctx.beginPath();
	for (var i = 0; i < neurons.length; i++) {
		var nr = neurons[i];
		var x = geo.cx + nr.ux * geo.R;
		var y = geo.cy + nr.uy * geo.R;
		bctx.moveTo(x + geo.dot, y);
		bctx.arc(x, y, geo.dot, 0, Math.PI * 2);
	}
	bctx.fillStyle = theme.neuronIdle;
	bctx.fill();

	// Active neurons glow in the accent color
	for (var i = 0; i < neurons.length; i++) {
		var nr = neurons[i];
		// Neurons glow with their activity
		nr.level = BRAIN.activity(nr.name);
		if (nr.level < 0.05) continue;
		var x = geo.cx + nr.ux * geo.R;
		var y = geo.cy + nr.uy * geo.R;
		bctx.beginPath();
		bctx.arc(x, y, geo.dot * (1 + 0.45 * nr.level), 0, Math.PI * 2);
		bctx.fillStyle = rgba(theme.accent, nr.level);
		bctx.fill();
	}

	if (hoveredNeuron) {
		bctx.beginPath();
		bctx.arc(geo.cx + hoveredNeuron.ux * geo.R, geo.cy + hoveredNeuron.uy * geo.R, geo.dot * 2.4, 0, Math.PI * 2);
		bctx.strokeStyle = rgba(theme.ink, 0.8);
		bctx.lineWidth = 1;
		bctx.stroke();
		brainMeta.textContent = Math.round(hoveredNeuron.level * 100) + '%';
	}

	// Muscle strip: dorsal (top) and ventral (bottom) activation from head to tail
	var acts = BRAIN.segmentActivations;
	var peak = 0;
	for (var i = 0; i < acts.length; i++) peak = Math.max(peak, acts[i].dorsal, acts[i].ventral);
	muscleMax = Math.max(muscleMax * 0.995, peak, 1);
	var gap = 2;
	var barW = (brainSize - gap * (acts.length - 1)) / acts.length;
	var barH = 5;
	var top = brainSize + 12;
	for (var i = 0; i < acts.length; i++) {
		var x = i * (barW + gap);
		bctx.fillStyle = rgba(theme.accent, 0.1 + 0.9 * Math.max(0, Math.min(1, acts[i].dorsal / muscleMax)));
		bctx.fillRect(x, top, barW, barH);
		bctx.fillStyle = rgba(theme.accent, 0.1 + 0.9 * Math.max(0, Math.min(1, acts[i].ventral / muscleMax)));
		bctx.fillRect(x, top + barH + 3, barW, barH);
	}
}

function pickNeuron(event) {
	var rect = brainCanvas.getBoundingClientRect();
	var geo = brainGeometry();
	var x = event.clientX - rect.left;
	var y = event.clientY - rect.top;
	var best = null;
	var bestD = geo.R * 2.2 / Math.sqrt(neurons.length);
	for (var i = 0; i < neurons.length; i++) {
		var d = Math.hypot(geo.cx + neurons[i].ux * geo.R - x, geo.cy + neurons[i].uy * geo.R - y);
		if (d < bestD) {
			bestD = d;
			best = neurons[i];
		}
	}
	setHoveredNeuron(best);
}

function setHoveredNeuron(neuron) {
	if (neuron === hoveredNeuron) return;
	hoveredNeuron = neuron;
	brainLabel.textContent = neuron ? neuron.name : 'Connectome';
	if (!neuron) showNeuronCount();
}

brainCanvas.addEventListener('pointermove', pickNeuron);
brainCanvas.addEventListener('pointerdown', pickNeuron);
brainCanvas.addEventListener('pointerleave', function (event) {
	if (event.pointerType === 'mouse') setHoveredNeuron(null);
});

/* ---------- Main loop ---------- */

buildBrainLayout();
resize();
window.addEventListener('resize', resize);
chain = new PhysicsWorm(35, 6);
syncFoodUI();

var STEP_MS = 1000 / 60;
var lastTime = performance.now();
var accumulator = 0;

function frame(now) {
	accumulator += Math.min(250, now - lastTime);
	lastTime = now;
	var steps = 0;
	while (accumulator >= STEP_MS && steps < 4) {
		for (var i = 0; i < simulationSpeed; i++) update();
		accumulator -= STEP_MS;
		steps++;
	}
	if (steps === 4) accumulator = 0;

	updateStatus();
	draw(now);
	drawBrain();
	requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
