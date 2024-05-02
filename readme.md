# worm-sim

The tiny worm C. elegans is one of the simplest multicellular organisms, and one of the only organisms in the world to have its connectome (neuron map) completed.

Despite being so simple, C. elegans exhibits several complex behaviors. They will attempt to move towards food when they sense it, and move around obstacles when they make contact. After viewing a [video](https://www.youtube.com/watch?v=YWQnzylhgHc) of a connectome being used to simulate a worm brain and control a GoPiGo robot, I wanted to see if something similar could be done in the browser.

In this demo, hunger neurons are continuously stimulated. If the worm nears food, food sensing neurons are stimulated. If the worm reaches the edge of the window, nose touch sensory neurons are stimulated.

## Usage
Head on over to [heyseth.github.io/worm-sim/](https://heyseth.github.io/worm-sim/) and watch the worm wriggle around. Click to place down food. The green dots at the top are a visual representation of the connectome, with each dot representing a neuron (increased opacity = increased activity). There are buttons to hide the connectome, reset the worm's position, and to clear placed down food.

To reiterate, the worm you see on your screen is being controlled entirely by a simulated virtual worm brain. Very cool if you ask me!

## License

This project is licensed under the MIT License - see the license.md file for details.

## Acknowledgments
Huge thanks to:
* Timothy Busbice, Gabriel Garrett, Geoffrey Churchill, and all other contributors to the [GoPiGo Connectome](https://github.com/Connectome/GoPiGo).
* [Zach Rispoli](https://github.com/zrispo), for porting the connectome to JavaScript.
* [ARTsinn](http://jsfiddle.net/user/ARTsinn/fiddles/), for their awesome canvas worm demo, which served as inspiration for this project.
