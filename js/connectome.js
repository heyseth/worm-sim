/* C. Elegans Connectome ported to Javascript
/* Based on the python GoPiGo Connectome by Timothy Busbice, Gabriel Garrett, Geoffrey Churchill
/* Find it here: https://github.com/Connectome/GoPiGo
/* Pls do not remove this header - zrispo
 */

// The wiring itself now comes from Cook et al. (2019) with synapse signs from Fenyves et al. (2020);
// see js/constants.js and tools/build_connectome.py.

var BRAIN = {};

BRAIN.weights = weights;
BRAIN.gapJunctions = gapJunctions;

/* ---------- Neurons ----------
 * Most C. elegans neurons do not fire action potentials. Each neuron here has a graded potential
 * that relaxes toward its input, and an output between 0 and 1 (a sigmoid of the potential) that
 * sets how strongly it drives its synapses:
 *  - chemical synapses pass output times weight, negative where the synapse inhibits;
 *  - gap junctions pass current in proportion to the difference in potential;
 *  - each neuron slowly adapts to its own activity, so nothing stays active forever;
 *  - every neuron gets a little random input, standing in for synaptic and channel noise.
 */

BRAIN.RELAX = 0.1; // Fraction of the way the potential moves toward its input each tick (time constant ~0.17 s)
BRAIN.THRESHOLD = 1; // Potential at which output is one half
BRAIN.SLOPE = 0.25; // Steepness of the output curve
BRAIN.SYNAPSE_GAIN = 0.18; // Input per unit of synapse weight from a fully active neuron
BRAIN.GAP_GAIN = 0.1; // Gap junction current per unit weight per unit of potential difference
BRAIN.MAX_GAP_COUPLING = 2; // Cap on a neuron's total gap junction coupling, which keeps it stable
BRAIN.ADAPTATION = 2; // How strongly a neuron's own recent activity holds it back
BRAIN.ADAPTATION_TICKS = 120; // ...averaged over about 2 s
BRAIN.NOISE = 1.4; // Standard deviation of the random input

BRAIN.SENSORY_DRIVE = 3; // Input to a sensory neuron that is being stimulated
BRAIN.HUNGER_DRIVE = 1.2; // Input to the hunger neurons RIM and RIC
BRAIN.FORWARD_DRIVE = 0.8; // Steady input to AVB, which makes forward the default

// Body wall muscles sit in four quadrants (dorsal/ventral, left/right) of 24 rows from head to tail.
// The worm crawls on its side, so only the dorsal/ventral split bends the body in the plane of the agar.
BRAIN.MUSCLE_ROWS = 24;
BRAIN.MUSCLE_DECAY = 0.8; // Muscle activation relaxes over a few hundred ms
BRAIN.MUSCLE_GAIN = 7;
BRAIN.MUSCLE_COUPLING = 0.25; // Gap junctions between neighbouring muscle rows (Liu et al., 2006)

BRAIN.stimulateHungerNeurons = true;
BRAIN.stimulateNoseTouchNeurons = false;
BRAIN.stimulateTailTouchNeurons = false;
BRAIN.foodGradient = 0;

BRAIN.NOSE_TOUCH_NEURONS = ['FLPR', 'FLPL', 'ASHL', 'ASHR', 'IL1VL', 'IL1VR', 'OLQDL', 'OLQDR', 'OLQVR', 'OLQVL'];
BRAIN.TAIL_TOUCH_NEURONS = ['PLML', 'PLMR', 'PVDL', 'PVDR'];
BRAIN.HUNGER_NEURONS = ['RIML', 'RIMR', 'RICL', 'RICR'];

BRAIN.segmentActivations = [];
for (var i = 0; i < BRAIN.MUSCLE_ROWS; i++) {
	BRAIN.segmentActivations.push({ dorsal: 0, ventral: 0 });
}

/* ---------- Choosing a direction ----------
 * AVA and AVD drive backward locomotion and AVB and PVC forward. The two groups are active at
 * different times (Kato et al., 2015), and circuit models represent this as mutual inhibition
 * (e.g. Roberts et al., 2016), but the connectome data does not contain it: Fenyves et al. predict
 * AVB inhibits AVA, while AVA to AVB and most other links between the groups come out ambiguous or
 * excitatory. So, as a stated assumption, every neuron in each group inhibits every neuron in the
 * other with weight COMMAND_INHIBITION. This is the only synapse in the model not taken from data.
 *
 * Which group wins is read straight off the network: the worm reverses while AVA is more active than
 * AVB. Reversals begin when noise or a stimulus tips the balance and end as AVA adapts.
 */

BRAIN.FORWARD_COMMAND = ['AVBL', 'AVBR', 'PVCL', 'PVCR'];
BRAIN.BACKWARD_COMMAND = ['AVAL', 'AVAR', 'AVDL', 'AVDR'];
BRAIN.COMMAND_INHIBITION = 15;
BRAIN.REVERSE_MARGIN = 0.2; // How far AVA must lead AVB to start a reversal, and trail it to end one

/* ---------- Locomotion ----------
 * Nothing here injects a bending wave into the muscles. The undulation is produced by motor neurons:
 *  - Forward: the head motor neurons (SMD, RMD) alternate between dorsal and ventral. The head keeps
 *    this rhythm even when the body is paralysed (Fouad et al., 2018), and each half-swing ends early
 *    once the head has bent far enough. Each B-type motor neuron (DB, VB) is bistable: it switches on
 *    when the body just anterior to it bends toward its side and off when that bend reverses
 *    (Wen et al., 2012; Boyle, Berri & Cohen, 2012), so the wave travels from head to tail.
 *  - Backward: the same in reverse. The A-type motor neurons in the tail (DA, VA) set the rhythm
 *    (Gao et al., 2018) and the others follow the body just posterior to them.
 * Only the circuit matching the current direction gets this drive.
 */

BRAIN.HEAD_END = 0.12; // Body fraction treated as the head when sensing head bend
BRAIN.NECK_END = 0.2; // B-type motor neurons sensing in front of this body fraction sense the head's bend
BRAIN.TAIL_START = 0.8; // A-type motor neurons sensing beyond this body fraction follow the tail rhythm
BRAIN.PROPRIO_OFFSET = 0.06; // How far beyond its own muscles (body fraction) a motor neuron senses bending
BRAIN.PROPRIO_THRESHOLD = 0.03; // Bend that switches a B- or A-type motor neuron on or off
BRAIN.SWITCH_BEND = 0.1; // Head (or tail) bend that ends a half-swing early
BRAIN.HALF_SWING_TICKS = 60; // Longest half-swing of the head (or tail) rhythm, so about 0.5 Hz
BRAIN.MIN_HALF_SWING_TICKS = 45; // Shortest half-swing, however far the head has bent
BRAIN.MOTOR_DRIVE = 3; // Input to a motor neuron that is switched on (and minus this when off)
BRAIN.MAX_ON_TICKS = 70; // A B- or A-type motor neuron adapts and switches off after being on this long
BRAIN.REFRACTORY_TICKS = 60; // ...and then cannot switch back on for this long
BRAIN.OMEGA_AFTER = 90; // Reversals longer than this many ticks end in an omega turn
BRAIN.OMEGA_TICKS = 60; // Length of the omega turn's deep ventral head swing
BRAIN.OMEGA_DRIVE = 3; // Input to RIV and SMDV during it

BRAIN.reversing = false;
BRAIN.reversalTicks = 0;
BRAIN.turning = 0; // Ticks left in an omega turn
BRAIN.headRhythm = { phase: 1, ticks: 0 }; // phase +1 ventral, -1 dorsal
BRAIN.tailRhythm = { phase: 1, ticks: 0 };
BRAIN.reverseDrive = 0; // AVA output minus AVB output

/**
 * Which locomotion circuit a motor neuron belongs to and which side it bends, or null.
 * Side is -1 for dorsal and +1 for ventral, matching the sign of body bends.
 */
BRAIN.motorRole = function (name) {
	if (/^DB\d+$/.test(name)) return { circuit: 'forward', side: -1 };
	if (/^VB\d+$/.test(name)) return { circuit: 'forward', side: 1 };
	if (/^DA\d+$/.test(name)) return { circuit: 'backward', side: -1 };
	if (/^VA\d+$/.test(name)) return { circuit: 'backward', side: 1 };
	if (/^(SMDD|RMDD)[LR]$/.test(name)) return { circuit: 'head', side: -1 };
	if (/^(SMDV|RMDV)[LR]$/.test(name)) return { circuit: 'head', side: 1 };
	return null;
};

BRAIN.isMuscle = function (name) {
	return /^M[DV][LR]\d\d$/.test(name);
};

BRAIN.setup = function () {
	// Every neuron in the wiring, indexed
	var names = {};
	for (var pre in BRAIN.weights) {
		names[pre] = true;
		for (var post in BRAIN.weights[pre]) {
			if (!BRAIN.isMuscle(post)) names[post] = true;
		}
	}
	for (var a in BRAIN.gapJunctions) names[a] = true;
	BRAIN.neurons = Object.keys(names).sort();
	BRAIN.index = {};
	BRAIN.neurons.forEach(function (name, i) {
		BRAIN.index[name] = i;
	});
	var n = BRAIN.neurons.length;
	BRAIN.potential = new Float64Array(n);
	BRAIN.output = new Float64Array(n);
	BRAIN.adaptation = new Float64Array(n);
	BRAIN.input = new Float64Array(n); // External input for the coming tick
	for (var i = 0; i < n; i++) {
		BRAIN.potential[i] = Math.random() * 0.5;
		BRAIN.output[i] = BRAIN.sigmoid(BRAIN.potential[i]);
	}

	// Chemical synapses between neurons, plus the assumed inhibition between the command groups
	var synapses = {};
	for (var pre in BRAIN.weights) {
		for (var post in BRAIN.weights[pre]) {
			if (!BRAIN.isMuscle(post)) synapses[pre + '>' + post] = BRAIN.weights[pre][post];
		}
	}
	BRAIN.BACKWARD_COMMAND.forEach(function (back) {
		BRAIN.FORWARD_COMMAND.forEach(function (fwd) {
			synapses[back + '>' + fwd] = -BRAIN.COMMAND_INHIBITION;
			synapses[fwd + '>' + back] = -BRAIN.COMMAND_INHIBITION;
		});
	});
	var keys = Object.keys(synapses);
	BRAIN.synapsePre = new Int32Array(keys.length);
	BRAIN.synapsePost = new Int32Array(keys.length);
	BRAIN.synapseWeight = new Float64Array(keys.length);
	keys.forEach(function (key, k) {
		var ends = key.split('>');
		BRAIN.synapsePre[k] = BRAIN.index[ends[0]];
		BRAIN.synapsePost[k] = BRAIN.index[ends[1]];
		BRAIN.synapseWeight[k] = BRAIN.SYNAPSE_GAIN * synapses[key];
	});

	// Gap junctions, each once. A few neurons (ALA, PVD, PVC, AVA) have so many that their
	// coupling is scaled down to MAX_GAP_COUPLING.
	var scale = {};
	for (var a in BRAIN.gapJunctions) {
		var total = 0;
		for (var b in BRAIN.gapJunctions[a]) total += BRAIN.gapJunctions[a][b];
		scale[a] = Math.min(1, BRAIN.MAX_GAP_COUPLING / (BRAIN.GAP_GAIN * total));
	}
	var gapA = [];
	var gapB = [];
	var gapCoupling = [];
	for (var a in BRAIN.gapJunctions) {
		for (var b in BRAIN.gapJunctions[a]) {
			if (a < b) {
				gapA.push(BRAIN.index[a]);
				gapB.push(BRAIN.index[b]);
				gapCoupling.push(BRAIN.GAP_GAIN * BRAIN.gapJunctions[a][b] * Math.min(scale[a], scale[b]));
			}
		}
	}
	BRAIN.gapA = Int32Array.from(gapA);
	BRAIN.gapB = Int32Array.from(gapB);
	BRAIN.gapCoupling = Float64Array.from(gapCoupling);

	// Body wall muscles: their row, side, and the synapses onto them relative to their total
	// excitatory innervation, so lightly innervated head muscles still pull
	BRAIN.muscleRows = {};
	for (var pre in BRAIN.weights) {
		for (var post in BRAIN.weights[pre]) {
			var m = /^M([DV])[LR](\d\d)$/.exec(post);
			if (!m) continue;
			if (!BRAIN.muscleRows[post]) {
				BRAIN.muscleRows[post] = { row: parseInt(m[2], 10) - 1, dorsal: m[1] === 'D', innervation: 0 };
			}
			if (BRAIN.weights[pre][post] > 0) BRAIN.muscleRows[post].innervation += BRAIN.weights[pre][post];
		}
	}
	// Each neuromuscular junction targets one slot: row * 2, plus 1 for ventral
	var nmjPre = [];
	var nmjSlot = [];
	var nmjWeight = [];
	for (var pre in BRAIN.weights) {
		for (var post in BRAIN.weights[pre]) {
			var muscle = BRAIN.muscleRows[post];
			if (!muscle || !muscle.innervation) continue;
			nmjPre.push(BRAIN.index[pre]);
			nmjSlot.push(muscle.row * 2 + (muscle.dorsal ? 0 : 1));
			nmjWeight.push(BRAIN.weights[pre][post] / muscle.innervation);
		}
	}
	BRAIN.nmjPre = Int32Array.from(nmjPre);
	BRAIN.nmjSlot = Int32Array.from(nmjSlot);
	BRAIN.nmjWeight = Float64Array.from(nmjWeight);
	BRAIN.muscleInput = new Float64Array(BRAIN.MUSCLE_ROWS * 2);

	// Locomotion motor neurons and the stretch of body their muscles cover
	BRAIN.motorNeurons = [];
	for (var pre in BRAIN.weights) {
		var role = BRAIN.motorRole(pre);
		if (!role) continue;
		var first = Infinity;
		var last = -Infinity;
		for (var post in BRAIN.weights[pre]) {
			if (BRAIN.muscleRows[post] && BRAIN.weights[pre][post] > 0) {
				first = Math.min(first, BRAIN.muscleRows[post].row);
				last = Math.max(last, BRAIN.muscleRows[post].row);
			}
		}
		if (first === Infinity) continue;
		BRAIN.motorNeurons.push({
			name: pre,
			circuit: role.circuit,
			side: role.side,
			front: first / BRAIN.MUSCLE_ROWS,
			back: (last + 1) / BRAIN.MUSCLE_ROWS,
			on: false,
			onTicks: 0,
			rest: 0,
		});
	}
};

BRAIN.sigmoid = function (potential) {
	return 1 / (1 + Math.exp(-(potential - BRAIN.THRESHOLD) / BRAIN.SLOPE));
};

/**
 * Adds input to a neuron for the coming tick, the way a sensory or proprioceptive stimulus would.
 */
BRAIN.stimulate = function (neuron, amount) {
	var i = BRAIN.index[neuron];
	if (i !== undefined) BRAIN.input[i] += amount;
};

/**
 * A neuron's output, from 0 (silent) to 1 (fully active).
 */
BRAIN.activity = function (neuron) {
	var i = BRAIN.index[neuron];
	return i === undefined ? 0 : BRAIN.output[i];
};

BRAIN.meanActivity = function (neurons) {
	var sum = 0;
	for (var i = 0; i < neurons.length; i++) sum += BRAIN.activity(neurons[i]);
	return sum / neurons.length;
};

/**
 * Advances the brain one tick (1/60 s).
 * @param {number[]} [bends] Body bend at each joint from head to tail, positive toward the ventral side.
 */
BRAIN.update = function (bends) {
	var stimulateAll = function (neurons, amount) {
		neurons.forEach(function (n) {
			BRAIN.stimulate(n, amount);
		});
	};
	if (BRAIN.stimulateHungerNeurons) stimulateAll(BRAIN.HUNGER_NEURONS, BRAIN.HUNGER_DRIVE);
	if (BRAIN.stimulateNoseTouchNeurons) stimulateAll(BRAIN.NOSE_TOUCH_NEURONS, BRAIN.SENSORY_DRIVE);
	// Posterior touch: PLM and PVD excite PVC and AVB, which speed the worm forward
	if (BRAIN.stimulateTailTouchNeurons) stimulateAll(BRAIN.TAIL_TOUCH_NEURONS, BRAIN.SENSORY_DRIVE);
	if (BRAIN.foodGradient > 0.0001) BRAIN.stimulate('ASEL', BRAIN.SENSORY_DRIVE);
	else if (BRAIN.foodGradient < -0.0001) BRAIN.stimulate('ASER', BRAIN.SENSORY_DRIVE);
	stimulateAll(['AVBL', 'AVBR'], BRAIN.FORWARD_DRIVE);

	if (bends && bends.length > 2) BRAIN.proprioception(bends);
	BRAIN.step();
	BRAIN.updateCommand();
	BRAIN.motorcontrol();
};

/**
 * Moves every neuron's potential toward its input for one tick.
 */
BRAIN.step = function () {
	// Locals throughout: this runs every tick, and BRAIN has too many properties for fast lookup
	var V = BRAIN.potential;
	var R = BRAIN.output;
	var I = BRAIN.input;
	var A = BRAIN.adaptation;
	var pre = BRAIN.synapsePre;
	var post = BRAIN.synapsePost;
	var weight = BRAIN.synapseWeight;
	for (var k = 0; k < pre.length; k++) {
		I[post[k]] += weight[k] * R[pre[k]];
	}
	var gapA = BRAIN.gapA;
	var gapB = BRAIN.gapB;
	var coupling = BRAIN.gapCoupling;
	for (var k = 0; k < gapA.length; k++) {
		var a = gapA[k];
		var b = gapB[k];
		var current = coupling[k] * (V[b] - V[a]);
		I[a] += current;
		I[b] -= current;
	}
	var relax = BRAIN.RELAX;
	var noiseScale = 2 * BRAIN.NOISE;
	var adaptation = BRAIN.ADAPTATION;
	var adaptRate = 1 / BRAIN.ADAPTATION_TICKS;
	var threshold = BRAIN.THRESHOLD;
	var slope = BRAIN.SLOPE;
	for (var i = 0; i < V.length; i++) {
		// Roughly Gaussian, with standard deviation NOISE
		var noise = (Math.random() + Math.random() + Math.random() - 1.5) * noiseScale;
		V[i] += relax * (I[i] - V[i] - adaptation * A[i] + noise);
		R[i] = 1 / (1 + Math.exp(-(V[i] - threshold) / slope));
		A[i] += (R[i] - A[i]) * adaptRate;
		I[i] = 0;
	}
};

/**
 * Reads the direction of travel off the command interneurons.
 */
BRAIN.updateCommand = function () {
	BRAIN.reverseDrive = BRAIN.meanActivity(['AVAL', 'AVAR']) - BRAIN.meanActivity(['AVBL', 'AVBR']);
	if (BRAIN.reversing) {
		BRAIN.reversalTicks++;
		if (BRAIN.reverseDrive < -BRAIN.REVERSE_MARGIN) {
			BRAIN.reversing = false;
			// Long reversals are usually followed by an omega turn (Gray et al., 2005)
			if (BRAIN.reversalTicks > BRAIN.OMEGA_AFTER) {
				BRAIN.turning = BRAIN.OMEGA_TICKS;
				BRAIN.headRhythm.phase = 1;
				BRAIN.headRhythm.ticks = 0;
			}
		}
	} else if (BRAIN.reverseDrive > BRAIN.REVERSE_MARGIN) {
		BRAIN.reversing = true;
		BRAIN.reversalTicks = 0;
		BRAIN.turning = 0;
	}
};

/**
 * Mean bend over a stretch of the body, given as body fractions.
 */
BRAIN.bendBetween = function (bends, from, to) {
	var n = bends.length;
	var sum = 0;
	var count = 0;
	for (var i = 1; i < n; i++) {
		var frac = i / n;
		if (frac >= from && frac <= to && bends[i] !== undefined) {
			sum += bends[i];
			count++;
		}
	}
	return count ? sum / count : 0;
};

/**
 * Bend near a body fraction, averaged over a small stretch like a stretch receptor would be.
 */
BRAIN.bendAt = function (bends, frac) {
	return BRAIN.bendBetween(bends, frac - 0.03, frac + 0.03);
};

/**
 * Advances a head or tail rhythm, which flips sides after a half-swing or once it has bent far enough.
 */
BRAIN.advanceRhythm = function (rhythm, bend) {
	rhythm.ticks++;
	var bentEnough = rhythm.phase * bend > BRAIN.SWITCH_BEND && rhythm.ticks >= BRAIN.MIN_HALF_SWING_TICKS;
	if (bentEnough || rhythm.ticks >= BRAIN.HALF_SWING_TICKS) {
		rhythm.phase = -rhythm.phase;
		rhythm.ticks = 0;
	}
};

/**
 * Drives the motor neurons of whichever circuit is active from the rhythm and from body posture.
 */
BRAIN.proprioception = function (bends) {
	var forward = !BRAIN.reversing;

	if (forward) {
		var headBend = BRAIN.bendBetween(bends, 0, BRAIN.HEAD_END);
		if (BRAIN.turning > 0) {
			// Omega turn: one long, deep ventral head swing driven by RIV and SMDV (Gray et al., 2005)
			BRAIN.turning--;
			headBend = 0;
			BRAIN.headRhythm.ticks = 0;
			['RIVL', 'RIVR', 'SMDVL', 'SMDVR'].forEach(function (n) {
				BRAIN.stimulate(n, BRAIN.OMEGA_DRIVE);
			});
		}
		BRAIN.advanceRhythm(BRAIN.headRhythm, headBend);
	} else {
		BRAIN.advanceRhythm(BRAIN.tailRhythm, BRAIN.bendBetween(bends, BRAIN.TAIL_START, 1));
	}

	for (var i = 0; i < BRAIN.motorNeurons.length; i++) {
		var mn = BRAIN.motorNeurons[i];
		var rhythm = null;
		var sensePos;
		// B-type neurons sense the body just in front of their muscles, A-type just behind
		if (mn.circuit === 'head') {
			if (forward) rhythm = BRAIN.headRhythm;
			else sensePos = mn.back + BRAIN.PROPRIO_OFFSET;
		} else if (mn.circuit === 'forward') {
			if (!forward) continue;
			sensePos = mn.front - BRAIN.PROPRIO_OFFSET;
		} else {
			if (forward) continue;
			sensePos = mn.back + BRAIN.PROPRIO_OFFSET;
			if (sensePos > BRAIN.TAIL_START) rhythm = BRAIN.tailRhythm;
		}

		if (rhythm) {
			mn.on = mn.side === rhythm.phase;
		} else {
			// Bistable: stays in its state until the sensed bend clearly crosses to one side
			// and adapts if it stays on too long, so the body cannot lock into one curl
			var bend = mn.circuit === 'forward' && sensePos < BRAIN.NECK_END ?
				BRAIN.bendBetween(bends, 0, BRAIN.HEAD_END) : BRAIN.bendAt(bends, sensePos);
			var sensed = mn.side * bend;
			if (mn.on) {
				if (sensed < -BRAIN.PROPRIO_THRESHOLD) {
					mn.on = false;
				} else if (mn.onTicks > BRAIN.MAX_ON_TICKS) {
					mn.on = false;
					mn.rest = BRAIN.REFRACTORY_TICKS;
				}
			} else if (mn.rest > 0) {
				mn.rest--;
			} else if (sensed > BRAIN.PROPRIO_THRESHOLD) {
				mn.on = true;
			}
		}
		mn.onTicks = mn.on ? mn.onTicks + 1 : 0;
		// Drive the side that is switched on and hold back the other
		BRAIN.stimulate(mn.name, mn.on ? BRAIN.MOTOR_DRIVE : -BRAIN.MOTOR_DRIVE);
	}
};

/**
 * Turns motor neuron output into smoothed dorsal and ventral activation for each muscle row.
 */
BRAIN.motorcontrol = function () {
	var input = BRAIN.muscleInput; // [row * 2] dorsal, [row * 2 + 1] ventral
	var pre = BRAIN.nmjPre;
	var slot = BRAIN.nmjSlot;
	var weight = BRAIN.nmjWeight;
	var R = BRAIN.output;
	input.fill(0);
	for (var k = 0; k < pre.length; k++) {
		input[slot[k]] += weight[k] * R[pre[k]];
	}
	var rows = BRAIN.MUSCLE_ROWS;
	var c = BRAIN.MUSCLE_COUPLING;
	var decay = BRAIN.MUSCLE_DECAY;
	var gain = BRAIN.MUSCLE_GAIN * (1 - decay);
	for (var r = 0; r < rows; r++) {
		var prev = Math.max(0, r - 1) * 2;
		var next = Math.min(rows - 1, r + 1) * 2;
		// Neighbouring muscles share some of their excitation
		var dorsal = input[r * 2] * (1 - c) + (input[prev] + input[next]) * c / 2;
		var ventral = input[r * 2 + 1] * (1 - c) + (input[prev + 1] + input[next + 1]) * c / 2;
		var act = BRAIN.segmentActivations[r];
		// Inhibitory input (from DD and VD) can relax a muscle but never push it
		act.dorsal = Math.max(0, act.dorsal * decay + dorsal * gain);
		act.ventral = Math.max(0, act.ventral * decay + ventral * gain);
	}
};
