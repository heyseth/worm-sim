/* C. Elegans Connectome ported to Javascript
/* Based on the python GoPiGo Connectome by Timothy Busbice, Gabriel Garrett, Geoffrey Churchill
/* Find it here: https://github.com/Connectome/GoPiGo
/* Pls do not remove this header - zrispo
 */

var BRAIN = {};

BRAIN.weights = weights;

BRAIN.dendriteAccumulate = function (preSynaptic) {
	// Command interneurons inhibit each other rather than exciting, so their input from one another is left out
	var fromCommand = preSynaptic in BRAIN.commandInput;
	for (var postSynaptic in BRAIN.weights[preSynaptic]) {
		if (BRAIN.postSynaptic[postSynaptic]) {
			BRAIN.postSynaptic[postSynaptic][BRAIN.nextState] +=
				BRAIN.weights[preSynaptic][postSynaptic];
			if (!fromCommand && postSynaptic in BRAIN.commandInput) {
				BRAIN.commandInput[postSynaptic] += BRAIN.weights[preSynaptic][postSynaptic];
			}
		}
	}
};

/**
 * Injects current straight into a neuron, the way a sensory or proprioceptive stimulus would.
 */
BRAIN.stimulate = function (neuron, amount) {
	if (BRAIN.postSynaptic[neuron]) BRAIN.postSynaptic[neuron][BRAIN.nextState] += amount;
	if (neuron in BRAIN.commandInput) BRAIN.commandInput[neuron] += amount;
};

BRAIN.thisState = 0;
BRAIN.nextState = 1;
BRAIN.fireThreshold = 30;
BRAIN.NOISE = 4; // Random input to every neuron each tick, standing in for synaptic and channel noise
BRAIN.muscles = ['MVU', 'MVL', 'MDL', 'MVR', 'MDR'];

// Body wall muscles sit in four quadrants (dorsal/ventral, left/right) of 24 rows from head to tail.
// The worm crawls on its side, so only the dorsal/ventral split bends the body in the plane of the agar.
BRAIN.MUSCLE_ROWS = 24;
BRAIN.MUSCLE_DECAY = 0.8; // Muscle activation relaxes over a few hundred ms rather than following each spike
BRAIN.MUSCLE_GAIN = 8;
BRAIN.MUSCLE_COUPLING = 0.25; // Gap junctions between neighbouring muscle rows (Liu et al., 2006)

BRAIN.stimulateHungerNeurons = true;
BRAIN.stimulateNoseTouchNeurons = false;
BRAIN.stimulateTailTouchNeurons = false;
BRAIN.foodGradient = 0;

BRAIN.segmentActivations = [];
for (var i = 0; i < BRAIN.MUSCLE_ROWS; i++) {
	BRAIN.segmentActivations.push({ dorsal: 0, ventral: 0 });
}

/* ---------- Locomotion ----------
 * Nothing here injects a bending wave into the muscles. The undulation is produced by motor neurons:
 *  - Forward: the head motor neurons (SMD, RMD) alternate between dorsal and ventral. The head keeps
 *    this rhythm even when the body is paralysed (Fouad et al., 2018), and each half-swing ends early
 *    once the head has bent far enough. Each B-type motor neuron (DB, VB) is bistable: it switches on
 *    when the body just anterior to it bends toward its side and off when that bend reverses
 *    (Wen et al., 2012; Boyle, Berri & Cohen, 2012), so the wave travels from head to tail.
 *  - Backward: the same in reverse. The A-type motor neurons in the tail (DA, VA) set the rhythm
 *    (Gao et al., 2018) and the others follow the body just posterior to them.
 * The command interneurons decide which of the two circuits runs: AVB and PVC for forward, AVA,
 * AVD and AVE for backward.
 */

BRAIN.HEAD_END = 0.12; // Body fraction treated as the head when sensing head bend
BRAIN.NECK_END = 0.2; // B-type motor neurons sensing in front of this body fraction sense the head's bend
BRAIN.TAIL_START = 0.8; // A-type motor neurons sensing beyond this body fraction follow the tail rhythm
BRAIN.PROPRIO_OFFSET = 0.06; // How far beyond its own muscles (body fraction) a motor neuron senses bending
BRAIN.PROPRIO_THRESHOLD = 0.03; // Bend that switches a B- or A-type motor neuron on or off
BRAIN.SWITCH_BEND = 0.1; // Head (or tail) bend that ends a half-swing early
BRAIN.HALF_SWING_TICKS = 60; // Longest half-swing of the head (or tail) rhythm, so about 0.5 Hz
BRAIN.MIN_HALF_SWING_TICKS = 45; // Shortest half-swing, however far the head has bent
BRAIN.MOTOR_DRIVE = 40; // Stimulus per tick to a motor neuron that is switched on
BRAIN.MAX_ON_TICKS = 70; // A B- or A-type motor neuron adapts and switches off after being on this long
BRAIN.REFRACTORY_TICKS = 60; // ...and then cannot switch back on for this long

BRAIN.FORWARD_COMMAND = ['AVBL', 'AVBR', 'PVCL', 'PVCR'];
BRAIN.BACKWARD_COMMAND = ['AVAL', 'AVAR', 'AVDL', 'AVDR', 'AVEL', 'AVER'];
BRAIN.FORWARD_MOTOR = /^(DB|VB)\d+$/;
BRAIN.BACKWARD_MOTOR = /^(DA|VA|AS)\d+$/;
BRAIN.INPUT_DECAY = 0.97; // Command neuron input is averaged over roughly half a second
// Reversals start at random, at a rate that climbs steeply with the backward command input
// (after Roberts et al., 2016): about SPONTANEOUS_REVERSALS a minute at rest, near-certain on a nose touch.
BRAIN.SPONTANEOUS_REVERSALS = 1.5; // Per minute, at the resting command input REVERSE_REST
BRAIN.REVERSE_REST = 2;
BRAIN.REVERSE_SCALE = 1.5; // Increase in input that multiplies the reversal rate by e
BRAIN.REVERSE_OFF = 9; // A reversal ends once the input falls below this...
BRAIN.MIN_REVERSAL_TICKS = [45, 150]; // ...and it has lasted a random 0.75 to 2.5 s
BRAIN.OMEGA_AFTER = 90; // Reversals longer than this many ticks end in an omega turn
BRAIN.OMEGA_TICKS = 60; // Length of the omega turn's deep ventral head swing
BRAIN.OMEGA_DRIVE = 40; // Stimulus per tick to RIV and SMDV during it

BRAIN.reversing = false;
BRAIN.reversalTicks = 0;
BRAIN.reversalLength = 0;
BRAIN.turning = 0; // Ticks left in an omega turn
BRAIN.headRhythm = { phase: 1, ticks: 0 }; // phase +1 ventral, -1 dorsal
BRAIN.tailRhythm = { phase: 1, ticks: 0 };
BRAIN.commandInput = {}; // Synaptic input to each command neuron this tick
BRAIN.commandLevel = {}; // The same, averaged over time
BRAIN.reverseDrive = 0;
BRAIN.FORWARD_COMMAND.concat(BRAIN.BACKWARD_COMMAND).forEach(function (n) {
	BRAIN.commandInput[n] = 0;
	BRAIN.commandLevel[n] = 0;
});

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

BRAIN.setup = function () {
	BRAIN.postSynaptic = {};
	BRAIN.connectome = {};

	// Dynamically initialize all neurons found in weights
	for (var pre in BRAIN.weights) {
		if (!BRAIN.postSynaptic[pre]) BRAIN.postSynaptic[pre] = [0, 0];
		for (var post in BRAIN.weights[pre]) {
			if (!BRAIN.postSynaptic[post]) BRAIN.postSynaptic[post] = [0, 0];
		}

		// Capture pre in a closure using an IIFE
		(function(neuronName) {
			BRAIN.connectome[neuronName] = function () {
				BRAIN.dendriteAccumulate(neuronName);
			};
		})(pre);
	}

	// Body wall muscles, keyed by name, with their row, side and total excitatory innervation
	BRAIN.muscleRows = {};
	for (var name in BRAIN.postSynaptic) {
		var m = /^M([DV])[LR](\d\d)$/.exec(name);
		if (m) BRAIN.muscleRows[name] = { row: parseInt(m[2], 10) - 1, dorsal: m[1] === 'D', innervation: 0 };
	}
	for (var pre in BRAIN.weights) {
		for (var post in BRAIN.weights[pre]) {
			if (BRAIN.muscleRows[post] && BRAIN.weights[pre][post] > 0) {
				BRAIN.muscleRows[post].innervation += BRAIN.weights[pre][post];
			}
		}
	}

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

	BRAIN.neurons = Object.keys(BRAIN.postSynaptic).filter(function (name) {
		return !BRAIN.muscleRows[name] && name !== 'MVULVA';
	});

	// Neurons silenced by the command interneurons that are not in control
	BRAIN.forwardOnly = BRAIN.FORWARD_COMMAND.slice();
	BRAIN.backwardOnly = BRAIN.BACKWARD_COMMAND.slice();
	for (var name in BRAIN.postSynaptic) {
		if (BRAIN.FORWARD_MOTOR.test(name)) BRAIN.forwardOnly.push(name);
		if (BRAIN.BACKWARD_MOTOR.test(name)) BRAIN.backwardOnly.push(name);
	}
};

BRAIN.randExcite = function () {
	var keys = Object.keys(BRAIN.connectome);
	for (var i = 0; i < 40; i++) {
		BRAIN.dendriteAccumulate(keys[Math.floor(Math.random() * keys.length)]);
	}
};

/**
 * Advances the brain one tick (1/60 s).
 * @param {number[]} [bends] Body bend at each joint from head to tail, positive toward the ventral side.
 */
BRAIN.update = function (bends) {
	if (BRAIN.stimulateHungerNeurons) {
		BRAIN.dendriteAccumulate('RIML');
		BRAIN.dendriteAccumulate('RIMR');
		BRAIN.dendriteAccumulate('RICL');
		BRAIN.dendriteAccumulate('RICR');
	}
	if (BRAIN.stimulateNoseTouchNeurons) {
		['FLPR','FLPL','ASHL','ASHR','IL1VL','IL1VR','OLQDL','OLQDR','OLQVR','OLQVL'].forEach(function(n) {
			BRAIN.dendriteAccumulate(n);
		});
	}
	if (BRAIN.stimulateTailTouchNeurons) {
		// Posterior gentle touch: PLM excites PVC and AVB, which speed the worm forward
		['PLML', 'PLMR', 'PVDL', 'PVDR'].forEach(function (n) {
			BRAIN.dendriteAccumulate(n);
		});
	}

	if (BRAIN.foodGradient > 0.0001) {
		for(var i=0; i<5; i++) BRAIN.dendriteAccumulate('ASEL');
	} else if (BRAIN.foodGradient < -0.0001) {
		for(var i=0; i<5; i++) BRAIN.dendriteAccumulate('ASER');
	}

	if (BRAIN.NOISE) {
		for (var i = 0; i < BRAIN.neurons.length; i++) {
			// Roughly Gaussian, with standard deviation NOISE
			var r = Math.random() + Math.random() + Math.random() - 1.5;
			BRAIN.stimulate(BRAIN.neurons[i], r * 2 * BRAIN.NOISE);
		}
	}

	BRAIN.updateCommand();
	if (bends && bends.length > 2) BRAIN.proprioception(bends);

	BRAIN.runconnectome();
};

/**
 * Chooses forward or backward locomotion from the activity of the command interneurons.
 */
BRAIN.updateCommand = function () {
	var back = 0;
	var fwd = 0;
	for (var n in BRAIN.commandInput) {
		BRAIN.commandLevel[n] = BRAIN.commandLevel[n] * BRAIN.INPUT_DECAY + BRAIN.commandInput[n] * (1 - BRAIN.INPUT_DECAY);
		BRAIN.commandInput[n] = 0;
	}
	BRAIN.BACKWARD_COMMAND.forEach(function (n) { back += BRAIN.commandLevel[n]; });
	BRAIN.FORWARD_COMMAND.forEach(function (n) { fwd += BRAIN.commandLevel[n]; });
	BRAIN.reverseDrive = back / BRAIN.BACKWARD_COMMAND.length - fwd / BRAIN.FORWARD_COMMAND.length;

	if (BRAIN.reversing) {
		BRAIN.reversalTicks++;
		if (BRAIN.reversalTicks >= BRAIN.reversalLength && BRAIN.reverseDrive < BRAIN.REVERSE_OFF) {
			BRAIN.reversing = false;
			// Long reversals are usually followed by an omega turn (Gray et al., 2005)
			if (BRAIN.reversalTicks > BRAIN.OMEGA_AFTER) {
				BRAIN.turning = BRAIN.OMEGA_TICKS;
				BRAIN.headRhythm.phase = 1;
				BRAIN.headRhythm.ticks = 0;
			}
		}
	} else {
		var perTick = BRAIN.SPONTANEOUS_REVERSALS / 3600 *
			Math.exp((BRAIN.reverseDrive - BRAIN.REVERSE_REST) / BRAIN.REVERSE_SCALE);
		if (Math.random() < perTick) {
			var range = BRAIN.MIN_REVERSAL_TICKS;
			BRAIN.reversing = true;
			BRAIN.reversalTicks = 0;
			BRAIN.reversalLength = range[0] + Math.random() * (range[1] - range[0]);
			BRAIN.turning = 0;
		}
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

BRAIN.runconnectome = function () {
	for (var ps in BRAIN.postSynaptic) {
		if (BRAIN.muscles.indexOf(ps.substring(0, 3)) == -1 && BRAIN.postSynaptic[ps][BRAIN.thisState] > BRAIN.fireThreshold) {
			BRAIN.fireNeuron(ps);
		}
	}
	BRAIN.motorcontrol();
	// Whichever command group is in control keeps the other group and its motor neurons quiet
	var silenced = BRAIN.reversing ? BRAIN.forwardOnly : BRAIN.backwardOnly;
	for (var i = 0; i < silenced.length; i++) {
		BRAIN.postSynaptic[silenced[i]][BRAIN.nextState] = 0;
	}
	for (var ps in BRAIN.postSynaptic) {
		BRAIN.postSynaptic[ps][BRAIN.thisState] = BRAIN.postSynaptic[ps][BRAIN.nextState];
	}
	var temp = BRAIN.thisState;
	BRAIN.thisState = BRAIN.nextState;
	BRAIN.nextState = temp;
	for (var ps in BRAIN.postSynaptic) BRAIN.postSynaptic[ps][BRAIN.nextState] *= 0.85;
};

BRAIN.fireNeuron = function (fneuron) {
	if (fneuron !== 'MVULVA') {
		BRAIN.dendriteAccumulate(fneuron);
		BRAIN.postSynaptic[fneuron][BRAIN.nextState] = 0;
	}
};

/**
 * Turns this tick's muscle input into smoothed dorsal and ventral activation for each muscle row.
 */
BRAIN.motorcontrol = function () {
	var input = [];
	for (var r = 0; r < BRAIN.MUSCLE_ROWS; r++) input.push({ dorsal: 0, ventral: 0 });
	for (var name in BRAIN.muscleRows) {
		var muscle = BRAIN.muscleRows[name];
		// Relative to how heavily the muscle is innervated, so lightly innervated head muscles still pull
		var val = muscle.innervation ? BRAIN.postSynaptic[name][BRAIN.nextState] / muscle.innervation : 0;
		if (muscle.dorsal) input[muscle.row].dorsal += val;
		else input[muscle.row].ventral += val;
		BRAIN.postSynaptic[name][BRAIN.nextState] = 0;
	}
	// Neighbouring muscles share some of their excitation
	var c = BRAIN.MUSCLE_COUPLING;
	var coupled = input.map(function (row, r) {
		var prev = input[Math.max(0, r - 1)];
		var next = input[Math.min(BRAIN.MUSCLE_ROWS - 1, r + 1)];
		return {
			dorsal: row.dorsal * (1 - c) + (prev.dorsal + next.dorsal) * c / 2,
			ventral: row.ventral * (1 - c) + (prev.ventral + next.ventral) * c / 2,
		};
	});
	input = coupled;
	for (var r = 0; r < BRAIN.MUSCLE_ROWS; r++) {
		var act = BRAIN.segmentActivations[r];
		// Inhibitory input (from DD and VD) can relax a muscle but never push it
		var gain = BRAIN.MUSCLE_GAIN * (1 - BRAIN.MUSCLE_DECAY);
		act.dorsal = Math.max(0, act.dorsal * BRAIN.MUSCLE_DECAY + input[r].dorsal * gain);
		act.ventral = Math.max(0, act.ventral * BRAIN.MUSCLE_DECAY + input[r].ventral * gain);
	}
};
