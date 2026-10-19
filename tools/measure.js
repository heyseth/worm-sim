/**
 * Runs the simulation headlessly and prints locomotion measurements as JSON, for tuning the model
 * against real worms without a browser.
 *
 *   node tools/measure.js [seconds] [scenario]
 *
 * Scenarios: open (no walls), dish (the 1400x1000 window), food (a pellet at FOODX, 500),
 * touch (a nose touch after 5 s).
 * Environment: SET="BRAIN.NOISE=2" runs JavaScript after loading; FOODX sets the food position;
 * TRACE=n prints the brain and body state every n ticks; ROOT points at another copy of the app.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.env.ROOT || path.join(__dirname, '..');
const seconds = +(process.argv[2] || 60);
const scenario = process.argv[3] || 'open';
const TICK_MS = 1000 / 60;

// A stand-in for the DOM: every property is another stand-in, every call returns one.
function stub() {
	const f = function () { return p; };
	const p = new Proxy(f, {
		get(t, k) {
			if (k === Symbol.toPrimitive) return () => '';
			if (k === 'clientWidth') return 200;
			if (k === 'matches') return false;
			return p;
		},
		set() { return true; },
	});
	return p;
}

let simMs = 0;
const S = stub();
const ctx = {
	console, Math, JSON, parseInt, parseFloat, isNaN, Object, Array, String, Number,
	document: S,
	getComputedStyle: () => ({ getPropertyValue: () => '' }),
	requestAnimationFrame() {},
	performance: { now: () => simMs },
	Date: { now: () => simMs },
	window: new Proxy({}, {
		get(t, k) {
			if (k === 'innerWidth') return 1400;
			if (k === 'innerHeight') return 1000;
			if (k === 'devicePixelRatio') return 1;
			if (k === 'matchMedia') return () => ({ matches: false, addEventListener() {} });
			return S;
		},
	}),
};
vm.createContext(ctx);
for (const f of ['js/constants.js', 'js/connectome.js', 'js/main.js']) {
	vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
}
const run = (code) => vm.runInContext(code, ctx);
run('VIEW.w = 1400; VIEW.h = 1000; VIEW.scale = 1;');
if (process.env.SET) run(process.env.SET);
const foodX = +(process.env.FOODX || 1150);
if (scenario === 'open') {
	run('VIEW.w = VIEW.h = 40000; chain.nodes.forEach(function (n) { n.x += 19300; n.y += 19500; });');
}
if (scenario === 'food') run(`food.push({ x: ${foodX}, y: 500, born: 0, phase: 0 });`);

const B = run('BRAIN');
const chain = run('chain');
const N = chain.nodes.length;
const L = chain.segmentLength * (N - 1);
const trace = +process.env.TRACE || 0;

const along = { F: 0, R: 0, O: 0 };
const ticks = { F: 0, R: 0, O: 0 };
const centroids = [];
const reorient = { plain: [], omega: [] };
let reversals = 0, touches = 0, headFlips = 0, turn = 0;
let wasReversing = false, wasTouched = false, lastPhase = B.headRhythm.phase, lastState = 'F';
let prevHeading = null, episode = null, minFood = Infinity, eatenAt = null;
let window5 = { along: 0, forward: 0, n: 0 }, stalls = 0, windows = 0;
const reversalTicks = [];
let currentReversal = 0, touchLatency = null, touchReversal = null;

const angle = (d) => { while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const bendChar = (v) => v > 0.1 ? 'V' : v > 0.03 ? 'v' : v < -0.1 ? 'D' : v < -0.03 ? 'd' : '.';

for (let t = 0; t < seconds * 60; t++) {
	simMs += TICK_MS;
	if (scenario === 'touch' && t === 300) run('collisionTimer = 120');
	run('update()');

	const n = chain.nodes;
	const c = { x: 0, y: 0 };
	for (const q of n) { c.x += q.x / N; c.y += q.y / N; }
	const state = B.reversing ? 'R' : B.turning > 0 ? 'O' : 'F';
	if (centroids.length) {
		const prev = centroids[centroids.length - 1];
		const hx = n[0].x - n[N - 1].x, hy = n[0].y - n[N - 1].y, hl = Math.hypot(hx, hy) || 1;
		along[state] += ((c.x - prev.x) * hx + (c.y - prev.y) * hy) / hl;
		ticks[state]++;
	}
	centroids.push(c);

	// Stalls: 5 s windows of forward crawling that cover under 0.4 body lengths
	window5.n++;
	if (state === 'F') window5.forward++;
	if (window5.n === 300) {
		const total = along.F + along.R + along.O;
		if (t > 600 && window5.forward === 300) {
			windows++;
			if ((total - window5.along) / L / 5 < 0.08) stalls++;
		}
		window5 = { along: total, forward: 0, n: 0 };
	}

	// Change in direction of travel across each reversal: 3 s before it against 2-5 s after
	if (state === 'R' && lastState === 'F' && t > 180) episode = { start: t, omega: false };
	if (episode && state === 'O') episode.omega = true;
	if (episode && state === 'F' && lastState !== 'F') episode.end = t;
	if (episode && episode.end && t - episode.end === 300) {
		const a0 = centroids[episode.start - 180], a = centroids[episode.start];
		const b0 = centroids[episode.end + 120], b = c;
		const d = angle(Math.atan2(b.y - b0.y, b.x - b0.x) - Math.atan2(a.y - a0.y, a.x - a0.x));
		reorient[episode.omega ? 'omega' : 'plain'].push(Math.abs(d) * 180 / Math.PI);
		episode = null;
	}
	lastState = state;

	if (B.reversing && !wasReversing) reversals++;
	if (B.reversing) currentReversal++;
	if (!B.reversing && wasReversing) { reversalTicks.push(currentReversal); currentReversal = 0; }
	if (scenario === 'touch' && t >= 300) {
		if (B.reversing && touchLatency === null) touchLatency = +((t - 300) / 60).toFixed(2);
		if (!B.reversing && wasReversing && touchLatency !== null && touchReversal === null) touchReversal = +(reversalTicks[reversalTicks.length - 1] / 60).toFixed(2);
	}
	wasReversing = B.reversing;
	if (B.headRhythm.phase !== lastPhase) headFlips++;
	lastPhase = B.headRhythm.phase;
	if (B.stimulateNoseTouchNeurons && !wasTouched) touches++;
	wasTouched = B.stimulateNoseTouchNeurons;
	if (t % 30 === 0) {
		const heading = Math.atan2(n[0].y - n[N - 1].y, n[0].x - n[N - 1].x);
		if (prevHeading !== null) turn += angle(heading - prevHeading);
		prevHeading = heading;
	}
	if (scenario === 'food') {
		minFood = Math.min(minFood, Math.hypot(n[0].x - foodX, n[0].y - 500));
		if (eatenAt === null && run('eaten') > 0) eatenAt = +(t / 60).toFixed(1);
	}
	if (trace && t % trace === 0) {
		const motor = B.motorNeurons.filter((m) => m.circuit === 'forward').sort((a, b) => a.front - b.front)
			.map((m) => m.on ? (m.side < 0 ? 'D' : 'V') : '.').join('');
		const muscles = B.segmentActivations.map((a) => {
			const x = (a.ventral - a.dorsal) / (a.ventral + a.dorsal + 0.6);
			return x > 0.3 ? 'V' : x > 0.1 ? 'v' : x < -0.3 ? 'D' : x < -0.1 ? 'd' : '.';
		}).join('');
		console.log((t / 60).toFixed(1).padStart(6), state, B.reverseDrive.toFixed(1).padStart(6),
			'h' + (B.headRhythm.phase > 0 ? 'V' : 'D'), motor, chain.segmentBends.slice(1).map(bendChar).join(''), muscles);
	}
}

const mean = (xs) => xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
const speed = (k) => ticks[k] ? +(along[k] / L / ticks[k] * 60).toFixed(3) : null;
const total = ticks.F + ticks.R + ticks.O;
const out = {
	speed: +((along.F + along.R + along.O) / L / seconds).toFixed(3),
	fwdSpeed: speed('F'),
	revSpeed: speed('R'),
	revPerMin: +(reversals / seconds * 60).toFixed(1),
	revFrac: +(ticks.R / total).toFixed(2),
	revSeconds: reversalTicks.length ? +(reversalTicks.reduce((a, b) => a + b, 0) / reversalTicks.length / 60).toFixed(2) : null,
	touches,
	headHz: +(headFlips / 2 / seconds).toFixed(2),
	reorientDeg: mean(reorient.plain),
	omegaReorientDeg: mean(reorient.omega),
	stallFrac: windows ? +(stalls / windows).toFixed(2) : null,
	turnsPerMin: +(turn / (2 * Math.PI) / seconds * 60).toFixed(2),
};
if (scenario === 'food') Object.assign(out, { minFood: Math.round(minFood), eatenAt });
if (scenario === 'touch') Object.assign(out, { touchLatency, touchReversal });
console.log(JSON.stringify(out));
