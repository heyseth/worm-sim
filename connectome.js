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

	BRAIN.postSynaptic['ADAL'] = [0, 0];
	BRAIN.postSynaptic['ADAR'] = [0, 0];
	BRAIN.postSynaptic['ADEL'] = [0, 0];
	BRAIN.postSynaptic['ADER'] = [0, 0];
	BRAIN.postSynaptic['ADFL'] = [0, 0];
	BRAIN.postSynaptic['ADFR'] = [0, 0];
	BRAIN.postSynaptic['ADLL'] = [0, 0];
	BRAIN.postSynaptic['ADLR'] = [0, 0];
	BRAIN.postSynaptic['AFDL'] = [0, 0];
	BRAIN.postSynaptic['AFDR'] = [0, 0];
	BRAIN.postSynaptic['AIAL'] = [0, 0];
	BRAIN.postSynaptic['AIAR'] = [0, 0];
	BRAIN.postSynaptic['AIBL'] = [0, 0];
	BRAIN.postSynaptic['AIBR'] = [0, 0];
	BRAIN.postSynaptic['AIML'] = [0, 0];
	BRAIN.postSynaptic['AIMR'] = [0, 0];
	BRAIN.postSynaptic['AINL'] = [0, 0];
	BRAIN.postSynaptic['AINR'] = [0, 0];
	BRAIN.postSynaptic['AIYL'] = [0, 0];
	BRAIN.postSynaptic['AIYR'] = [0, 0];
	BRAIN.postSynaptic['AIZL'] = [0, 0];
	BRAIN.postSynaptic['AIZR'] = [0, 0];
	BRAIN.postSynaptic['ALA'] = [0, 0];
	BRAIN.postSynaptic['ALML'] = [0, 0];
	BRAIN.postSynaptic['ALMR'] = [0, 0];
	BRAIN.postSynaptic['ALNL'] = [0, 0];
	BRAIN.postSynaptic['ALNR'] = [0, 0];
	BRAIN.postSynaptic['AQR'] = [0, 0];
	BRAIN.postSynaptic['AS1'] = [0, 0];
	BRAIN.postSynaptic['AS10'] = [0, 0];
	BRAIN.postSynaptic['AS11'] = [0, 0];
	BRAIN.postSynaptic['AS2'] = [0, 0];
	BRAIN.postSynaptic['AS3'] = [0, 0];
	BRAIN.postSynaptic['AS4'] = [0, 0];
	BRAIN.postSynaptic['AS5'] = [0, 0];
	BRAIN.postSynaptic['AS6'] = [0, 0];
	BRAIN.postSynaptic['AS7'] = [0, 0];
	BRAIN.postSynaptic['AS8'] = [0, 0];
	BRAIN.postSynaptic['AS9'] = [0, 0];
	BRAIN.postSynaptic['ASEL'] = [0, 0];
	BRAIN.postSynaptic['ASER'] = [0, 0];
	BRAIN.postSynaptic['ASGL'] = [0, 0];
	BRAIN.postSynaptic['ASGR'] = [0, 0];
	BRAIN.postSynaptic['ASHL'] = [0, 0];
	BRAIN.postSynaptic['ASHR'] = [0, 0];
	BRAIN.postSynaptic['ASIL'] = [0, 0];
	BRAIN.postSynaptic['ASIR'] = [0, 0];
	BRAIN.postSynaptic['ASJL'] = [0, 0];
	BRAIN.postSynaptic['ASJR'] = [0, 0];
	BRAIN.postSynaptic['ASKL'] = [0, 0];
	BRAIN.postSynaptic['ASKR'] = [0, 0];
	BRAIN.postSynaptic['AUAL'] = [0, 0];
	BRAIN.postSynaptic['AUAR'] = [0, 0];
	BRAIN.postSynaptic['AVAL'] = [0, 0];
	BRAIN.postSynaptic['AVAR'] = [0, 0];
	BRAIN.postSynaptic['AVBL'] = [0, 0];
	BRAIN.postSynaptic['AVBR'] = [0, 0];
	BRAIN.postSynaptic['AVDL'] = [0, 0];
	BRAIN.postSynaptic['AVDR'] = [0, 0];
	BRAIN.postSynaptic['AVEL'] = [0, 0];
	BRAIN.postSynaptic['AVER'] = [0, 0];
	BRAIN.postSynaptic['AVFL'] = [0, 0];
	BRAIN.postSynaptic['AVFR'] = [0, 0];
	BRAIN.postSynaptic['AVG'] = [0, 0];
	BRAIN.postSynaptic['AVHL'] = [0, 0];
	BRAIN.postSynaptic['AVHR'] = [0, 0];
	BRAIN.postSynaptic['AVJL'] = [0, 0];
	BRAIN.postSynaptic['AVJR'] = [0, 0];
	BRAIN.postSynaptic['AVKL'] = [0, 0];
	BRAIN.postSynaptic['AVKR'] = [0, 0];
	BRAIN.postSynaptic['AVL'] = [0, 0];
	BRAIN.postSynaptic['AVM'] = [0, 0];
	BRAIN.postSynaptic['AWAL'] = [0, 0];
	BRAIN.postSynaptic['AWAR'] = [0, 0];
	BRAIN.postSynaptic['AWBL'] = [0, 0];
	BRAIN.postSynaptic['AWBR'] = [0, 0];
	BRAIN.postSynaptic['AWCL'] = [0, 0];
	BRAIN.postSynaptic['AWCR'] = [0, 0];
	BRAIN.postSynaptic['BAGL'] = [0, 0];
	BRAIN.postSynaptic['BAGR'] = [0, 0];
	BRAIN.postSynaptic['BDUL'] = [0, 0];
	BRAIN.postSynaptic['BDUR'] = [0, 0];
	BRAIN.postSynaptic['CEPDL'] = [0, 0];
	BRAIN.postSynaptic['CEPDR'] = [0, 0];
	BRAIN.postSynaptic['CEPVL'] = [0, 0];
	BRAIN.postSynaptic['CEPVR'] = [0, 0];
	BRAIN.postSynaptic['DA1'] = [0, 0];
	BRAIN.postSynaptic['DA2'] = [0, 0];
	BRAIN.postSynaptic['DA3'] = [0, 0];
	BRAIN.postSynaptic['DA4'] = [0, 0];
	BRAIN.postSynaptic['DA5'] = [0, 0];
	BRAIN.postSynaptic['DA6'] = [0, 0];
	BRAIN.postSynaptic['DA7'] = [0, 0];
	BRAIN.postSynaptic['DA8'] = [0, 0];
	BRAIN.postSynaptic['DA9'] = [0, 0];
	BRAIN.postSynaptic['DB1'] = [0, 0];
	BRAIN.postSynaptic['DB2'] = [0, 0];
	BRAIN.postSynaptic['DB3'] = [0, 0];
	BRAIN.postSynaptic['DB4'] = [0, 0];
	BRAIN.postSynaptic['DB5'] = [0, 0];
	BRAIN.postSynaptic['DB6'] = [0, 0];
	BRAIN.postSynaptic['DB7'] = [0, 0];
	BRAIN.postSynaptic['DD1'] = [0, 0];
	BRAIN.postSynaptic['DD2'] = [0, 0];
	BRAIN.postSynaptic['DD3'] = [0, 0];
	BRAIN.postSynaptic['DD4'] = [0, 0];
	BRAIN.postSynaptic['DD5'] = [0, 0];
	BRAIN.postSynaptic['DD6'] = [0, 0];
	BRAIN.postSynaptic['DVA'] = [0, 0];
	BRAIN.postSynaptic['DVB'] = [0, 0];
	BRAIN.postSynaptic['DVC'] = [0, 0];
	BRAIN.postSynaptic['FLPL'] = [0, 0];
	BRAIN.postSynaptic['FLPR'] = [0, 0];
	BRAIN.postSynaptic['HSNL'] = [0, 0];
	BRAIN.postSynaptic['HSNR'] = [0, 0];
	BRAIN.postSynaptic['I1L'] = [0, 0];
	BRAIN.postSynaptic['I1R'] = [0, 0];
	BRAIN.postSynaptic['I2L'] = [0, 0];
	BRAIN.postSynaptic['I2R'] = [0, 0];
	BRAIN.postSynaptic['I3'] = [0, 0];
	BRAIN.postSynaptic['I4'] = [0, 0];
	BRAIN.postSynaptic['I5'] = [0, 0];
	BRAIN.postSynaptic['I6'] = [0, 0];
	BRAIN.postSynaptic['IL1DL'] = [0, 0];
	BRAIN.postSynaptic['IL1DR'] = [0, 0];
	BRAIN.postSynaptic['IL1L'] = [0, 0];
	BRAIN.postSynaptic['IL1R'] = [0, 0];
	BRAIN.postSynaptic['IL1VL'] = [0, 0];
	BRAIN.postSynaptic['IL1VR'] = [0, 0];
	BRAIN.postSynaptic['IL2L'] = [0, 0];
	BRAIN.postSynaptic['IL2R'] = [0, 0];
	BRAIN.postSynaptic['IL2DL'] = [0, 0];
	BRAIN.postSynaptic['IL2DR'] = [0, 0];
	BRAIN.postSynaptic['IL2VL'] = [0, 0];
	BRAIN.postSynaptic['IL2VR'] = [0, 0];
	BRAIN.postSynaptic['LUAL'] = [0, 0];
	BRAIN.postSynaptic['LUAR'] = [0, 0];
	BRAIN.postSynaptic['M1'] = [0, 0];
	BRAIN.postSynaptic['M2L'] = [0, 0];
	BRAIN.postSynaptic['M2R'] = [0, 0];
	BRAIN.postSynaptic['M3L'] = [0, 0];
	BRAIN.postSynaptic['M3R'] = [0, 0];
	BRAIN.postSynaptic['M4'] = [0, 0];
	BRAIN.postSynaptic['M5'] = [0, 0];
	BRAIN.postSynaptic['MANAL'] = [0, 0];
	BRAIN.postSynaptic['MCL'] = [0, 0];
	BRAIN.postSynaptic['MCR'] = [0, 0];
	BRAIN.postSynaptic['MDL01'] = [0, 0];
	BRAIN.postSynaptic['MDL02'] = [0, 0];
	BRAIN.postSynaptic['MDL03'] = [0, 0];
	BRAIN.postSynaptic['MDL04'] = [0, 0];
	BRAIN.postSynaptic['MDL05'] = [0, 0];
	BRAIN.postSynaptic['MDL06'] = [0, 0];
	BRAIN.postSynaptic['MDL07'] = [0, 0];
	BRAIN.postSynaptic['MDL08'] = [0, 0];
	BRAIN.postSynaptic['MDL09'] = [0, 0];
	BRAIN.postSynaptic['MDL10'] = [0, 0];
	BRAIN.postSynaptic['MDL11'] = [0, 0];
	BRAIN.postSynaptic['MDL12'] = [0, 0];
	BRAIN.postSynaptic['MDL13'] = [0, 0];
	BRAIN.postSynaptic['MDL14'] = [0, 0];
	BRAIN.postSynaptic['MDL15'] = [0, 0];
	BRAIN.postSynaptic['MDL16'] = [0, 0];
	BRAIN.postSynaptic['MDL17'] = [0, 0];
	BRAIN.postSynaptic['MDL18'] = [0, 0];
	BRAIN.postSynaptic['MDL19'] = [0, 0];
	BRAIN.postSynaptic['MDL20'] = [0, 0];
	BRAIN.postSynaptic['MDL21'] = [0, 0];
	BRAIN.postSynaptic['MDL22'] = [0, 0];
	BRAIN.postSynaptic['MDL23'] = [0, 0];
	BRAIN.postSynaptic['MDL24'] = [0, 0];
	BRAIN.postSynaptic['MDR01'] = [0, 0];
	BRAIN.postSynaptic['MDR02'] = [0, 0];
	BRAIN.postSynaptic['MDR03'] = [0, 0];
	BRAIN.postSynaptic['MDR04'] = [0, 0];
	BRAIN.postSynaptic['MDR05'] = [0, 0];
	BRAIN.postSynaptic['MDR06'] = [0, 0];
	BRAIN.postSynaptic['MDR07'] = [0, 0];
	BRAIN.postSynaptic['MDR08'] = [0, 0];
	BRAIN.postSynaptic['MDR09'] = [0, 0];
	BRAIN.postSynaptic['MDR10'] = [0, 0];
	BRAIN.postSynaptic['MDR11'] = [0, 0];
	BRAIN.postSynaptic['MDR12'] = [0, 0];
	BRAIN.postSynaptic['MDR13'] = [0, 0];
	BRAIN.postSynaptic['MDR14'] = [0, 0];
	BRAIN.postSynaptic['MDR15'] = [0, 0];
	BRAIN.postSynaptic['MDR16'] = [0, 0];
	BRAIN.postSynaptic['MDR17'] = [0, 0];
	BRAIN.postSynaptic['MDR18'] = [0, 0];
	BRAIN.postSynaptic['MDR19'] = [0, 0];
	BRAIN.postSynaptic['MDR20'] = [0, 0];
	BRAIN.postSynaptic['MDR21'] = [0, 0];
	BRAIN.postSynaptic['MDR22'] = [0, 0];
	BRAIN.postSynaptic['MDR23'] = [0, 0];
	BRAIN.postSynaptic['MDR24'] = [0, 0];
	BRAIN.postSynaptic['MI'] = [0, 0];
	BRAIN.postSynaptic['MVL01'] = [0, 0];
	BRAIN.postSynaptic['MVL02'] = [0, 0];
	BRAIN.postSynaptic['MVL03'] = [0, 0];
	BRAIN.postSynaptic['MVL04'] = [0, 0];
	BRAIN.postSynaptic['MVL05'] = [0, 0];
	BRAIN.postSynaptic['MVL06'] = [0, 0];
	BRAIN.postSynaptic['MVL07'] = [0, 0];
	BRAIN.postSynaptic['MVL08'] = [0, 0];
	BRAIN.postSynaptic['MVL09'] = [0, 0];
	BRAIN.postSynaptic['MVL10'] = [0, 0];
	BRAIN.postSynaptic['MVL11'] = [0, 0];
	BRAIN.postSynaptic['MVL12'] = [0, 0];
	BRAIN.postSynaptic['MVL13'] = [0, 0];
	BRAIN.postSynaptic['MVL14'] = [0, 0];
	BRAIN.postSynaptic['MVL15'] = [0, 0];
	BRAIN.postSynaptic['MVL16'] = [0, 0];
	BRAIN.postSynaptic['MVL17'] = [0, 0];
	BRAIN.postSynaptic['MVL18'] = [0, 0];
	BRAIN.postSynaptic['MVL19'] = [0, 0];
	BRAIN.postSynaptic['MVL20'] = [0, 0];
	BRAIN.postSynaptic['MVL21'] = [0, 0];
	BRAIN.postSynaptic['MVL22'] = [0, 0];
	BRAIN.postSynaptic['MVL23'] = [0, 0];
	BRAIN.postSynaptic['MVR01'] = [0, 0];
	BRAIN.postSynaptic['MVR02'] = [0, 0];
	BRAIN.postSynaptic['MVR03'] = [0, 0];
	BRAIN.postSynaptic['MVR04'] = [0, 0];
	BRAIN.postSynaptic['MVR05'] = [0, 0];
	BRAIN.postSynaptic['MVR06'] = [0, 0];
	BRAIN.postSynaptic['MVR07'] = [0, 0];
	BRAIN.postSynaptic['MVR08'] = [0, 0];
	BRAIN.postSynaptic['MVR09'] = [0, 0];
	BRAIN.postSynaptic['MVR10'] = [0, 0];
	BRAIN.postSynaptic['MVR11'] = [0, 0];
	BRAIN.postSynaptic['MVR12'] = [0, 0];
	BRAIN.postSynaptic['MVR13'] = [0, 0];
	BRAIN.postSynaptic['MVR14'] = [0, 0];
	BRAIN.postSynaptic['MVR15'] = [0, 0];
	BRAIN.postSynaptic['MVR16'] = [0, 0];
	BRAIN.postSynaptic['MVR17'] = [0, 0];
	BRAIN.postSynaptic['MVR18'] = [0, 0];
	BRAIN.postSynaptic['MVR19'] = [0, 0];
	BRAIN.postSynaptic['MVR20'] = [0, 0];
	BRAIN.postSynaptic['MVR21'] = [0, 0];
	BRAIN.postSynaptic['MVR22'] = [0, 0];
	BRAIN.postSynaptic['MVR23'] = [0, 0];
	BRAIN.postSynaptic['MVR24'] = [0, 0];
	BRAIN.postSynaptic['MVULVA'] = [0, 0];
	BRAIN.postSynaptic['NSML'] = [0, 0];
	BRAIN.postSynaptic['NSMR'] = [0, 0];
	BRAIN.postSynaptic['OLLL'] = [0, 0];
	BRAIN.postSynaptic['OLLR'] = [0, 0];
	BRAIN.postSynaptic['OLQDL'] = [0, 0];
	BRAIN.postSynaptic['OLQDR'] = [0, 0];
	BRAIN.postSynaptic['OLQVL'] = [0, 0];
	BRAIN.postSynaptic['OLQVR'] = [0, 0];
	BRAIN.postSynaptic['PDA'] = [0, 0];
	BRAIN.postSynaptic['PDB'] = [0, 0];
	BRAIN.postSynaptic['PDEL'] = [0, 0];
	BRAIN.postSynaptic['PDER'] = [0, 0];
	BRAIN.postSynaptic['PHAL'] = [0, 0];
	BRAIN.postSynaptic['PHAR'] = [0, 0];
	BRAIN.postSynaptic['PHBL'] = [0, 0];
	BRAIN.postSynaptic['PHBR'] = [0, 0];
	BRAIN.postSynaptic['PHCL'] = [0, 0];
	BRAIN.postSynaptic['PHCR'] = [0, 0];
	BRAIN.postSynaptic['PLML'] = [0, 0];
	BRAIN.postSynaptic['PLMR'] = [0, 0];
	BRAIN.postSynaptic['PLNL'] = [0, 0];
	BRAIN.postSynaptic['PLNR'] = [0, 0];
	BRAIN.postSynaptic['PQR'] = [0, 0];
	BRAIN.postSynaptic['PVCL'] = [0, 0];
	BRAIN.postSynaptic['PVCR'] = [0, 0];
	BRAIN.postSynaptic['PVDL'] = [0, 0];
	BRAIN.postSynaptic['PVDR'] = [0, 0];
	BRAIN.postSynaptic['PVM'] = [0, 0];
	BRAIN.postSynaptic['PVNL'] = [0, 0];
	BRAIN.postSynaptic['PVNR'] = [0, 0];
	BRAIN.postSynaptic['PVPL'] = [0, 0];
	BRAIN.postSynaptic['PVPR'] = [0, 0];
	BRAIN.postSynaptic['PVQL'] = [0, 0];
	BRAIN.postSynaptic['PVQR'] = [0, 0];
	BRAIN.postSynaptic['PVR'] = [0, 0];
	BRAIN.postSynaptic['PVT'] = [0, 0];
	BRAIN.postSynaptic['PVWL'] = [0, 0];
	BRAIN.postSynaptic['PVWR'] = [0, 0];
	BRAIN.postSynaptic['RIAL'] = [0, 0];
	BRAIN.postSynaptic['RIAR'] = [0, 0];
	BRAIN.postSynaptic['RIBL'] = [0, 0];
	BRAIN.postSynaptic['RIBR'] = [0, 0];
	BRAIN.postSynaptic['RICL'] = [0, 0];
	BRAIN.postSynaptic['RICR'] = [0, 0];
	BRAIN.postSynaptic['RID'] = [0, 0];
	BRAIN.postSynaptic['RIFL'] = [0, 0];
	BRAIN.postSynaptic['RIFR'] = [0, 0];
	BRAIN.postSynaptic['RIGL'] = [0, 0];
	BRAIN.postSynaptic['RIGR'] = [0, 0];
	BRAIN.postSynaptic['RIH'] = [0, 0];
	BRAIN.postSynaptic['RIML'] = [0, 0];
	BRAIN.postSynaptic['RIMR'] = [0, 0];
	BRAIN.postSynaptic['RIPL'] = [0, 0];
	BRAIN.postSynaptic['RIPR'] = [0, 0];
	BRAIN.postSynaptic['RIR'] = [0, 0];
	BRAIN.postSynaptic['RIS'] = [0, 0];
	BRAIN.postSynaptic['RIVL'] = [0, 0];
	BRAIN.postSynaptic['RIVR'] = [0, 0];
	BRAIN.postSynaptic['RMDDL'] = [0, 0];
	BRAIN.postSynaptic['RMDDR'] = [0, 0];
	BRAIN.postSynaptic['RMDL'] = [0, 0];
	BRAIN.postSynaptic['RMDR'] = [0, 0];
	BRAIN.postSynaptic['RMDVL'] = [0, 0];
	BRAIN.postSynaptic['RMDVR'] = [0, 0];
	BRAIN.postSynaptic['RMED'] = [0, 0];
	BRAIN.postSynaptic['RMEL'] = [0, 0];
	BRAIN.postSynaptic['RMER'] = [0, 0];
	BRAIN.postSynaptic['RMEV'] = [0, 0];
	BRAIN.postSynaptic['RMFL'] = [0, 0];
	BRAIN.postSynaptic['RMFR'] = [0, 0];
	BRAIN.postSynaptic['RMGL'] = [0, 0];
	BRAIN.postSynaptic['RMGR'] = [0, 0];
	BRAIN.postSynaptic['RMHL'] = [0, 0];
	BRAIN.postSynaptic['RMHR'] = [0, 0];
	BRAIN.postSynaptic['SAADL'] = [0, 0];
	BRAIN.postSynaptic['SAADR'] = [0, 0];
	BRAIN.postSynaptic['SAAVL'] = [0, 0];
	BRAIN.postSynaptic['SAAVR'] = [0, 0];
	BRAIN.postSynaptic['SABD'] = [0, 0];
	BRAIN.postSynaptic['SABVL'] = [0, 0];
	BRAIN.postSynaptic['SABVR'] = [0, 0];
	BRAIN.postSynaptic['SDQL'] = [0, 0];
	BRAIN.postSynaptic['SDQR'] = [0, 0];
	BRAIN.postSynaptic['SIADL'] = [0, 0];
	BRAIN.postSynaptic['SIADR'] = [0, 0];
	BRAIN.postSynaptic['SIAVL'] = [0, 0];
	BRAIN.postSynaptic['SIAVR'] = [0, 0];
	BRAIN.postSynaptic['SIBDL'] = [0, 0];
	BRAIN.postSynaptic['SIBDR'] = [0, 0];
	BRAIN.postSynaptic['SIBVL'] = [0, 0];
	BRAIN.postSynaptic['SIBVR'] = [0, 0];
	BRAIN.postSynaptic['SMBDL'] = [0, 0];
	BRAIN.postSynaptic['SMBDR'] = [0, 0];
	BRAIN.postSynaptic['SMBVL'] = [0, 0];
	BRAIN.postSynaptic['SMBVR'] = [0, 0];
	BRAIN.postSynaptic['SMDDL'] = [0, 0];
	BRAIN.postSynaptic['SMDDR'] = [0, 0];
	BRAIN.postSynaptic['SMDVL'] = [0, 0];
	BRAIN.postSynaptic['SMDVR'] = [0, 0];
	BRAIN.postSynaptic['URADL'] = [0, 0];
	BRAIN.postSynaptic['URADR'] = [0, 0];
	BRAIN.postSynaptic['URAVL'] = [0, 0];
	BRAIN.postSynaptic['URAVR'] = [0, 0];
	BRAIN.postSynaptic['URBL'] = [0, 0];
	BRAIN.postSynaptic['URBR'] = [0, 0];
	BRAIN.postSynaptic['URXL'] = [0, 0];
	BRAIN.postSynaptic['URXR'] = [0, 0];
	BRAIN.postSynaptic['URYDL'] = [0, 0];
	BRAIN.postSynaptic['URYDR'] = [0, 0];
	BRAIN.postSynaptic['URYVL'] = [0, 0];
	BRAIN.postSynaptic['URYVR'] = [0, 0];
	BRAIN.postSynaptic['VA1'] = [0, 0];
	BRAIN.postSynaptic['VA10'] = [0, 0];
	BRAIN.postSynaptic['VA11'] = [0, 0];
	BRAIN.postSynaptic['VA12'] = [0, 0];
	BRAIN.postSynaptic['VA2'] = [0, 0];
	BRAIN.postSynaptic['VA3'] = [0, 0];
	BRAIN.postSynaptic['VA4'] = [0, 0];
	BRAIN.postSynaptic['VA5'] = [0, 0];
	BRAIN.postSynaptic['VA6'] = [0, 0];
	BRAIN.postSynaptic['VA7'] = [0, 0];
	BRAIN.postSynaptic['VA8'] = [0, 0];
	BRAIN.postSynaptic['VA9'] = [0, 0];
	BRAIN.postSynaptic['VB1'] = [0, 0];
	BRAIN.postSynaptic['VB10'] = [0, 0];
	BRAIN.postSynaptic['VB11'] = [0, 0];
	BRAIN.postSynaptic['VB2'] = [0, 0];
	BRAIN.postSynaptic['VB3'] = [0, 0];
	BRAIN.postSynaptic['VB4'] = [0, 0];
	BRAIN.postSynaptic['VB5'] = [0, 0];
	BRAIN.postSynaptic['VB6'] = [0, 0];
	BRAIN.postSynaptic['VB7'] = [0, 0];
	BRAIN.postSynaptic['VB8'] = [0, 0];
	BRAIN.postSynaptic['VB9'] = [0, 0];
	BRAIN.postSynaptic['VC1'] = [0, 0];
	BRAIN.postSynaptic['VC2'] = [0, 0];
	BRAIN.postSynaptic['VC3'] = [0, 0];
	BRAIN.postSynaptic['VC4'] = [0, 0];
	BRAIN.postSynaptic['VC5'] = [0, 0];
	BRAIN.postSynaptic['VC6'] = [0, 0];
	BRAIN.postSynaptic['VD1'] = [0, 0];
	BRAIN.postSynaptic['VD10'] = [0, 0];
	BRAIN.postSynaptic['VD11'] = [0, 0];
	BRAIN.postSynaptic['VD12'] = [0, 0];
	BRAIN.postSynaptic['VD13'] = [0, 0];
	BRAIN.postSynaptic['VD2'] = [0, 0];
	BRAIN.postSynaptic['VD3'] = [0, 0];
	BRAIN.postSynaptic['VD4'] = [0, 0];
	BRAIN.postSynaptic['VD5'] = [0, 0];
	BRAIN.postSynaptic['VD6'] = [0, 0];
	BRAIN.postSynaptic['VD7'] = [0, 0];
	BRAIN.postSynaptic['VD8'] = [0, 0];
	BRAIN.postSynaptic['VD9'] = [0, 0];
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
