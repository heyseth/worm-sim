# worm-sim

The tiny worm C. elegans is one of the simplest multicellular organisms, and one of the only organisms in the world to have its connectome (neuron map) completed.

Despite being so simple, C. elegans exhibits several complex behaviors. They will attempt to move towards food when they sense it, and move around obstacles when they make contact. After viewing a [video](https://www.youtube.com/watch?v=YWQnzylhgHc) of a connectome being used to simulate a worm brain and control a GoPiGo robot, I wanted to see if something similar could be done in the browser.

In this demo, hunger neurons are continuously stimulated. If the worm nears food, food sensing neurons are stimulated. If its nose reaches the edge of the window, nose touch sensory neurons are stimulated and it backs away; if its tail bumps the edge while backing up, tail touch neurons send it forward again.

## Usage
Head on over to [heyseth.github.io/worm-sim/](https://heyseth.github.io/worm-sim/) and watch the worm wriggle around. Click or tap anywhere to drop food; the worm follows the scent and leaves faint tracks in the agar as it goes.

The panel in the corner shows the connectome live. Each dot is a neuron, laid out on a spiral with the most connected neurons in the middle, and it flashes when that neuron fires. Hover over or tap a dot to see the neuron's name. The two rows of bars underneath show dorsal and ventral muscle activation from head to tail, so you can watch the bending wave travel down the body.

The toolbar at the bottom recenters the worm, clears food, hides the connectome panel and links to the source. The page follows your device's light or dark theme.

To reiterate, the worm you see on your screen is being controlled entirely by a simulated virtual worm brain. Very cool if you ask me!

## How Movement Works

The worm is modeled as a chain of linked body nodes. Each frame, the simulated connectome updates its neuron activity, and the output onto the body wall muscles becomes dorsal and ventral activation for each of the 24 muscle rows from head to tail. The worm crawls on its side, so dorsal and ventral are the two directions it can bend on the agar.

Nothing injects a bending wave into the muscles. The wave is made by motor neurons and proprioception (the body sensing its own posture):

* **Forward.** The head motor neurons (SMD and RMD) swing the head from side to side, about 0.6 times a second; real worms keep this head rhythm even when the rest of the body is paralysed. Each B-type motor neuron (DB, VB) senses how the body just in front of its muscles is bent and switches on to bend its own stretch the same way, so each bend travels from head to tail (Wen et al., 2012; Boyle, Berri & Cohen, 2012).
* **Backward.** The same in reverse: the A-type motor neurons in the tail (DA, VA) set the rhythm and the others follow the body just behind them, so the wave travels from tail to head.
* **Choosing a direction.** The command interneurons decide which circuit runs, AVB and PVC for forward and AVA, AVD and AVE for backward, and the group in control silences the other. Reversals start at random, about once or twice a minute, at a rate that climbs steeply with the input to the backward command neurons, so a nose touch makes one almost certain. Long reversals end in an omega turn, a deep ventral bend of the head (driven by RIV and SMDV) that sends the worm off in a new direction.

The body is overdamped, as it is for a real worm at this size: there is no momentum, and each node moves at a speed set by the forces on it and by drag that is 30 times higher sideways than lengthwise, as in a groove in agar. That difference in drag is the only thing that turns the bending wave into motion, so a head-to-tail wave carries the worm forward at about 0.2 body lengths a second and a tail-to-head wave carries it backward. Steering likewise comes only from the head bending further to one side than the other.

## License

This project is licensed under the MIT License - see the license.md file for details.

## Acknowledgments
Huge thanks to:
* Timothy Busbice, Gabriel Garrett, Geoffrey Churchill, and all other contributors to the [GoPiGo Connectome](https://github.com/Connectome/GoPiGo).
* [Zach Rispoli](https://github.com/zrispo), for porting the connectome to JavaScript.
* [ARTsinn](http://jsfiddle.net/user/ARTsinn/fiddles/), for their awesome canvas worm demo, which served as inspiration for this project.
