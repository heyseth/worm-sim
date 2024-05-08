/* C. Elegans Connectome ported to Javascript
/* Based on the python GoPiGo Connectome by Timothy Busbice, Gabriel Garrett, Geoffrey Churchill
/* Find it here: https://github.com/Connectome/GoPiGo
/* Pls do not remove this header - zrispo
 */

var BRAIN = {};

// Import the weights from the weights.js file so it works in the browser
BRAIN.weights = weights;

// A method that accepts the preSynaptic neuron and updates the postSynaptic neurons with the weighted values
BRAIN.dendriteAccumulate = function (preSynaptic) {
	// Loop through the postSynaptic neurons
	for (var postSynaptic in BRAIN.weights[preSynaptic]) {
		// Update the postSynaptic neurons with the weighted values
		BRAIN.postSynaptic[postSynaptic][BRAIN.nextState] +=
			BRAIN.weights[preSynaptic][postSynaptic];
	}
};

/* Note: The way these work is sort of confusing
 * After every update, the value in nextState is copied into thisState,
 * and thisState and nextState are swapped (so after the first update, thisState = 1, and nextState = 0) */
BRAIN.thisState = 0;
BRAIN.nextState = 1;

/* Maximum accumulated value that must be exceeded before the Neurite will fire */
BRAIN.fireThreshold = 30;

/* Accumulators are used to decide the value to send to the Left and Right motors of the GoPiGo robot */
/* Since this is the javascript version, you can use these to control whatever you want! */
BRAIN.accumleft = 0;
BRAIN.accumright = 0;

/* Used to remove from Axon firing since muscles cannot fire. */
BRAIN.muscles = ['MVU', 'MVL', 'MDL', 'MVR', 'MDR'];

BRAIN.muscleList = [
	'MDL07',
	'MDL08',
	'MDL09',
	'MDL10',
	'MDL11',
	'MDL12',
	'MDL13',
	'MDL14',
	'MDL15',
	'MDL16',
	'MDL17',
	'MDL18',
	'MDL19',
	'MDL20',
	'MDL21',
	'MDL22',
	'MDL23',
	'MVL07',
	'MVL08',
	'MVL09',
	'MVL10',
	'MVL11',
	'MVL12',
	'MVL13',
	'MVL14',
	'MVL15',
	'MVL16',
	'MVL17',
	'MVL18',
	'MVL19',
	'MVL20',
	'MVL21',
	'MVL22',
	'MVL23',
	'MDR07',
	'MDR08',
	'MDR09',
	'MDR10',
	'MDR11',
	'MDR12',
	'MDR13',
	'MDR14',
	'MDR15',
	'MDR16',
	'MDR17',
	'MDR18',
	'MDR19',
	'MDR20',
	'MDL21',
	'MDR22',
	'MDR23',
	'MVR07',
	'MVR08',
	'MVR09',
	'MVR10',
	'MVR11',
	'MVR12',
	'MVR13',
	'MVR14',
	'MVR15',
	'MVR16',
	'MVR17',
	'MVR18',
	'MVR19',
	'MVR20',
	'MVL21',
	'MVR22',
	'MVR23',
];

BRAIN.mLeft = [
	'MDL07',
	'MDL08',
	'MDL09',
	'MDL10',
	'MDL11',
	'MDL12',
	'MDL13',
	'MDL14',
	'MDL15',
	'MDL16',
	'MDL17',
	'MDL18',
	'MDL19',
	'MDL20',
	'MDL21',
	'MDL22',
	'MDL23',
	'MVL07',
	'MVL08',
	'MVL09',
	'MVL10',
	'MVL11',
	'MVL12',
	'MVL13',
	'MVL14',
	'MVL15',
	'MVL16',
	'MVL17',
	'MVL18',
	'MVL19',
	'MVL20',
	'MVL21',
	'MVL22',
	'MVL23',
];
BRAIN.mRight = [
	'MDR07',
	'MDR08',
	'MDR09',
	'MDR10',
	'MDR11',
	'MDR12',
	'MDR13',
	'MDR14',
	'MDR15',
	'MDR16',
	'MDR17',
	'MDR18',
	'MDR19',
	'MDR20',
	'MDL21',
	'MDR22',
	'MDR23',
	'MVR07',
	'MVR08',
	'MVR09',
	'MVR10',
	'MVR11',
	'MVR12',
	'MVR13',
	'MVR14',
	'MVR15',
	'MVR16',
	'MVR17',
	'MVR18',
	'MVR19',
	'MVR20',
	'MVL21',
	'MVR22',
	'MVR23',
];
/* Used to accumulate muscle weighted values in body muscles 07-23 = worm locomotion */
BRAIN.musDleft = [
	'MDL07',
	'MDL08',
	'MDL09',
	'MDL10',
	'MDL11',
	'MDL12',
	'MDL13',
	'MDL14',
	'MDL15',
	'MDL16',
	'MDL17',
	'MDL18',
	'MDL19',
	'MDL20',
	'MDL21',
	'MDL22',
	'MDL23',
];
BRAIN.musVleft = [
	'MVL07',
	'MVL08',
	'MVL09',
	'MVL10',
	'MVL11',
	'MVL12',
	'MVL13',
	'MVL14',
	'MVL15',
	'MVL16',
	'MVL17',
	'MVL18',
	'MVL19',
	'MVL20',
	'MVL21',
	'MVL22',
	'MVL23',
];
BRAIN.musDright = [
	'MDR07',
	'MDR08',
	'MDR09',
	'MDR10',
	'MDR11',
	'MDR12',
	'MDR13',
	'MDR14',
	'MDR15',
	'MDR16',
	'MDR17',
	'MDR18',
	'MDR19',
	'MDR20',
	'MDL21',
	'MDR22',
	'MDR23',
];
BRAIN.musVright = [
	'MVR07',
	'MVR08',
	'MVR09',
	'MVR10',
	'MVR11',
	'MVR12',
	'MVR13',
	'MVR14',
	'MVR15',
	'MVR16',
	'MVR17',
	'MVR18',
	'MVR19',
	'MVR20',
	'MVL21',
	'MVR22',
	'MVR23',
];

/* Use these to stimulate nose and food sensing neurons */
BRAIN.stimulateHungerNeurons = true;
BRAIN.stimulateNoseTouchNeurons = false;
BRAIN.stimulateFoodSenseNeurons = false;

// we want each simualtion to be slightly different
BRAIN.randExcite = function () {
	for (var i = 0; i < 40; i++) {
		BRAIN.dendriteAccumulate(
			Object.keys(BRAIN.connectome)[
				Math.floor(Math.random() * Object.keys(BRAIN.connectome).length)
			],
		);
	}
};

BRAIN.setup = function () {
	/* The postSynaptic dictionary contains the accumulated weighted values as the
	 * connectome is executed */
	BRAIN.postSynaptic = {};

	/* This is the full C Elegans Connectome as expresed in the form of the connectome
	 *  neurite and the postSynaptic neurites. */
	BRAIN.connectome = {};

	// For each neuron in weights.json, add a function to the connectome that invokes dendriteAccumulate
	for (var preSynaptic in BRAIN.weights) {
		BRAIN.connectome[preSynaptic] = function () {
			BRAIN.dendriteAccumulate(preSynaptic);
		};
	}

	// Initialize the postSynaptic dictionary with 0 values
	for (var postSynapticNeuron in postSynapticNeurons) {
		BRAIN.postSynaptic[postSynapticNeuron] = [0, 0];
	}
};

BRAIN.update = function () {
	if (BRAIN.stimulateHungerNeurons) {
		BRAIN.dendriteAccumulate('RIML');
		BRAIN.dendriteAccumulate('RIMR');
		BRAIN.dendriteAccumulate('RICL');
		BRAIN.dendriteAccumulate('RICR');
		BRAIN.runconnectome();
	}
	if (BRAIN.stimulateNoseTouchNeurons) {
		BRAIN.dendriteAccumulate('FLPR');
		BRAIN.dendriteAccumulate('FLPL');
		BRAIN.dendriteAccumulate('ASHL');
		BRAIN.dendriteAccumulate('ASHR');
		BRAIN.dendriteAccumulate('IL1VL');
		BRAIN.dendriteAccumulate('IL1VR');
		BRAIN.dendriteAccumulate('OLQDL');
		BRAIN.dendriteAccumulate('OLQDR');
		BRAIN.dendriteAccumulate('OLQVR');
		BRAIN.dendriteAccumulate('OLQVL');
		BRAIN.runconnectome();
	}
	if (BRAIN.stimulateFoodSenseNeurons) {
		BRAIN.dendriteAccumulate('ADFL');
		BRAIN.dendriteAccumulate('ADFR');
		BRAIN.dendriteAccumulate('ASGR');
		BRAIN.dendriteAccumulate('ASGL');
		BRAIN.dendriteAccumulate('ASIL');
		BRAIN.dendriteAccumulate('ASIR');
		BRAIN.dendriteAccumulate('ASJR');
		BRAIN.dendriteAccumulate('ASJL');
		BRAIN.runconnectome();
	}

	//RIML RIMR RICL RICR hunger neurons
	//PVDL PVDR nociceptors
	//ASEL ASER gustatory neurons
};

BRAIN.runconnectome = function () {
	for (var ps in BRAIN.postSynaptic) {
		/* Muscles cannot fire, make sure they don't */
		if (
			BRAIN.muscles.indexOf(ps.substring(0, 3)) == -1 &&
			BRAIN.postSynaptic[ps][BRAIN.thisState] > BRAIN.fireThreshold
		) {
			BRAIN.fireNeuron(ps);
		}
	}

	BRAIN.motorcontrol();

	for (var ps in BRAIN.postSynaptic) {
		BRAIN.postSynaptic[ps][BRAIN.thisState] =
			BRAIN.postSynaptic[ps][BRAIN.nextState];
	}

	var temp = BRAIN.thisState;
	BRAIN.thisState = BRAIN.nextState;
	BRAIN.nextState = temp;
};

BRAIN.fireNeuron = function (fneuron) {
	/* The threshold has been exceeded and we fire the neurite */
	if (fneuron !== 'MVULVA') {
		BRAIN.dendriteAccumulate(fneuron);
		BRAIN.postSynaptic[fneuron][BRAIN.nextState] = 0;
	}
};

BRAIN.motorcontrol = function () {
	/* accumulate left and right muscles and the accumulated values are
       used to move the left and right motors of the robot */

	BRAIN.accumleft = 0;
	BRAIN.accumright = 0;

	for (var m = 0; m < BRAIN.muscleList.length; m++) {
		var muscleName = BRAIN.muscleList[m];

		if (BRAIN.mLeft.indexOf(muscleName) != -1) {
			BRAIN.accumleft += BRAIN.postSynaptic[muscleName][BRAIN.nextState];
			BRAIN.postSynaptic[muscleName][BRAIN.nextState] = 0;
		} else if (BRAIN.mRight.indexOf(muscleName) != -1) {
			BRAIN.accumright += BRAIN.postSynaptic[muscleName][BRAIN.nextState];
			BRAIN.postSynaptic[muscleName][BRAIN.nextState] = 0;
		}
	}
};
