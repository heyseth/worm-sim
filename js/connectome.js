/* C. Elegans Connectome ported to Javascript
/* Based on the python GoPiGo Connectome by Timothy Busbice, Gabriel Garrett, Geoffrey Churchill
/* Find it here: https://github.com/Connectome/GoPiGo
/* Pls do not remove this header - zrispo
 */

var BRAIN = {};

BRAIN.weights = weights;

BRAIN.dendriteAccumulate = function (preSynaptic) {
	for (var postSynaptic in BRAIN.weights[preSynaptic]) {
		if (BRAIN.postSynaptic[postSynaptic]) {
			BRAIN.postSynaptic[postSynaptic][BRAIN.nextState] +=
				BRAIN.weights[preSynaptic][postSynaptic];
		}
	}
};

BRAIN.thisState = 0;
BRAIN.nextState = 1;
BRAIN.fireThreshold = 30;
BRAIN.accumleft = 0;
BRAIN.accumright = 0;
BRAIN.accumdorsal = 0;
BRAIN.accumventral = 0;
BRAIN.muscles = ['MVU', 'MVL', 'MDL', 'MVR', 'MDR'];

BRAIN.muscleList = [
	'MDL07', 'MDL08', 'MDL09', 'MDL10', 'MDL11', 'MDL12', 'MDL13', 'MDL14', 'MDL15', 'MDL16', 'MDL17', 'MDL18', 'MDL19', 'MDL20', 'MDL21', 'MDL22', 'MDL23',
	'MVL07', 'MVL08', 'MVL09', 'MVL10', 'MVL11', 'MVL12', 'MVL13', 'MVL14', 'MVL15', 'MVL16', 'MVL17', 'MVL18', 'MVL19', 'MVL20', 'MVL21', 'MVL22', 'MVL23',
	'MDR07', 'MDR08', 'MDR09', 'MDR10', 'MDR11', 'MDR12', 'MDR13', 'MDR14', 'MDR15', 'MDR16', 'MDR17', 'MDR18', 'MDR19', 'MDR20', 'MDR21', 'MDR22', 'MDR23',
	'MVR07', 'MVR08', 'MVR09', 'MVR10', 'MVR11', 'MVR12', 'MVR13', 'MVR14', 'MVR15', 'MVR16', 'MVR17', 'MVR18', 'MVR19', 'MVR20', 'MVR21', 'MVR22', 'MVR23',
];

BRAIN.mLeft = [
	'MDL07', 'MDL08', 'MDL09', 'MDL10', 'MDL11', 'MDL12', 'MDL13', 'MDL14', 'MDL15', 'MDL16', 'MDL17', 'MDL18', 'MDL19', 'MDL20', 'MDL21', 'MDL22', 'MDL23',
	'MVL07', 'MVL08', 'MVL09', 'MVL10', 'MVL11', 'MVL12', 'MVL13', 'MVL14', 'MVL15', 'MVL16', 'MVL17', 'MVL18', 'MVL19', 'MVL20', 'MVL21', 'MVL22', 'MVL23',
];
BRAIN.mRight = [
	'MDR07', 'MDR08', 'MDR09', 'MDR10', 'MDR11', 'MDR12', 'MDR13', 'MDR14', 'MDR15', 'MDR16', 'MDR17', 'MDR18', 'MDR19', 'MDR20', 'MDR21', 'MDR22', 'MDR23',
	'MVR07', 'MVR08', 'MVR09', 'MVR10', 'MVR11', 'MVR12', 'MVR13', 'MVR14', 'MVR15', 'MVR16', 'MVR17', 'MVR18', 'MVR19', 'MVR20', 'MVR21', 'MVR22', 'MVR23',
];
BRAIN.mDorsal = [
	'MDL07', 'MDL08', 'MDL09', 'MDL10', 'MDL11', 'MDL12', 'MDL13', 'MDL14', 'MDL15', 'MDL16', 'MDL17', 'MDL18', 'MDL19', 'MDL20', 'MDL21', 'MDL22', 'MDL23',
	'MDR07', 'MDR08', 'MDR09', 'MDR10', 'MDR11', 'MDR12', 'MDR13', 'MDR14', 'MDR15', 'MDR16', 'MDR17', 'MDR18', 'MDR19', 'MDR20', 'MDR21', 'MDR22', 'MDR23',
];
BRAIN.mVentral = [
	'MVL07', 'MVL08', 'MVL09', 'MVL10', 'MVL11', 'MVL12', 'MVL13', 'MVL14', 'MVL15', 'MVL16', 'MVL17', 'MVL18', 'MVL19', 'MVL20', 'MVL21', 'MVL22', 'MVL23',
	'MVR07', 'MVR08', 'MVR09', 'MVR10', 'MVR11', 'MVR12', 'MVR13', 'MVR14', 'MVR15', 'MVR16', 'MVR17', 'MVR18', 'MVR19', 'MVR20', 'MVR21', 'MVR22', 'MVR23',
];

BRAIN.stimulateHungerNeurons = true;
BRAIN.stimulateNoseTouchNeurons = false;
BRAIN.stimulateFoodSenseNeurons = false;

BRAIN.segmentActivations = [];
for (var i = 0; i < 17; i++) {
	BRAIN.segmentActivations.push({ left: 0, right: 0, dorsal: 0, ventral: 0 });
}
BRAIN.wanderSeed = Math.random() * Math.PI * 2;

BRAIN.randExcite = function () {
	var keys = Object.keys(BRAIN.connectome);
	for (var i = 0; i < 40; i++) {
		BRAIN.dendriteAccumulate(keys[Math.floor(Math.random() * keys.length)]);
	}
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
};

BRAIN.update = function () {
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
	
	if (BRAIN.foodGradient > 0.0001) {
		for(var i=0; i<5; i++) BRAIN.dendriteAccumulate('ASEL'); 
	} else if (BRAIN.foodGradient < -0.0001) {
		for(var i=0; i<5; i++) BRAIN.dendriteAccumulate('ASER');
	}

	if (typeof chain !== 'undefined' && chain.segmentBends) {
		for (var i = 1; i < chain.segmentBends.length - 2; i++) {
			var bend = chain.segmentBends[i];
			var ratio = 17 / chain.segmentBends.length;
			var muscleNum = Math.floor((i + 3) * ratio) + 7;
			
			if (muscleNum <= 23) {
				var numStr = muscleNum < 10 ? '0' + muscleNum : '' + muscleNum;
				if (bend < -0.16) {
					BRAIN.dendriteAccumulate('MDL' + numStr);
					BRAIN.dendriteAccumulate('MDR' + numStr);
				} else if (bend > 0.16) {
					BRAIN.dendriteAccumulate('MVL' + numStr);
					BRAIN.dendriteAccumulate('MVR' + numStr);
				}
			}
		}
	}
	
	var time = Date.now() / 360;
	for (var seg = 7; seg <= 23; seg++) {
		var phase = time - (seg - 7) * 0.52;
		var cpgStr = Math.max(1, Math.round(5 - (seg - 7) * 0.16));
		var numStr = seg < 10 ? '0' + seg : '' + seg;
		if (Math.sin(phase) > 0) {
			for(var i=0; i<cpgStr; i++) {
				BRAIN.dendriteAccumulate('MDL' + numStr);
				BRAIN.dendriteAccumulate('MDR' + numStr);
			}
		} else {
			for(var i=0; i<cpgStr; i++) {
				BRAIN.dendriteAccumulate('MVL' + numStr);
				BRAIN.dendriteAccumulate('MVR' + numStr);
			}
		}
	}

	var wander = Math.sin(Date.now() / 2100 + BRAIN.wanderSeed) +
		0.45 * Math.sin(Date.now() / 870 + BRAIN.wanderSeed * 1.7);
	var wanderStr = Math.round(Math.abs(wander) * 3);
	for (var seg = 7; seg <= 10; seg++) {
		var numStr = seg < 10 ? '0' + seg : '' + seg;
		for (var i = 0; i < wanderStr; i++) {
			if (wander > 0) {
				BRAIN.dendriteAccumulate('MDL' + numStr);
				BRAIN.dendriteAccumulate('MVL' + numStr);
			} else {
				BRAIN.dendriteAccumulate('MDR' + numStr);
				BRAIN.dendriteAccumulate('MVR' + numStr);
			}
		}
	}

	BRAIN.runconnectome();
};

BRAIN.runconnectome = function () {
	for (var ps in BRAIN.postSynaptic) {
		if (BRAIN.muscles.indexOf(ps.substring(0, 3)) == -1 && BRAIN.postSynaptic[ps][BRAIN.thisState] > BRAIN.fireThreshold) {
			BRAIN.fireNeuron(ps);
		}
	}
	BRAIN.motorcontrol();
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

BRAIN.motorcontrol = function () {
	BRAIN.accumleft = 0;
	BRAIN.accumright = 0;
	BRAIN.accumdorsal = 0;
	BRAIN.accumventral = 0;
	for (var i = 0; i < 17; i++) BRAIN.segmentActivations[i] = { left: 0, right: 0, dorsal: 0, ventral: 0 };
	for (var m = 0; m < BRAIN.muscleList.length; m++) {
		var muscleName = BRAIN.muscleList[m];
		var segmentNum = parseInt(muscleName.substring(3), 10);
		if (isNaN(segmentNum)) continue;
		var segmentIdx = segmentNum - 7;
		if (segmentIdx < 0 || segmentIdx > 16) continue;
		var val = BRAIN.postSynaptic[muscleName][BRAIN.nextState];
		if (BRAIN.mLeft.indexOf(muscleName) != -1) {
			BRAIN.accumleft += val;
			BRAIN.segmentActivations[segmentIdx].left += val;
			BRAIN.postSynaptic[muscleName][BRAIN.nextState] = 0;
		} else if (BRAIN.mRight.indexOf(muscleName) != -1) {
			BRAIN.accumright += val;
			BRAIN.segmentActivations[segmentIdx].right += val;
			BRAIN.postSynaptic[muscleName][BRAIN.nextState] = 0;
		}
		if (BRAIN.mDorsal.indexOf(muscleName) != -1) {
			BRAIN.accumdorsal += val;
			BRAIN.segmentActivations[segmentIdx].dorsal += val;
		} else if (BRAIN.mVentral.indexOf(muscleName) != -1) {
			BRAIN.accumventral += val;
			BRAIN.segmentActivations[segmentIdx].ventral += val;
		}
	}
};
