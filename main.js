document.getElementById("clearButton").onclick = function() {
    food = [];
}

document.getElementById("centerButton").onclick = function() {
    target.x = window.innerWidth / 2;
    target.y = window.innerHeight / 2;
}

var facingDir = 0;
var targetDir = 0;
var speed = 0;
var targetSpeed = 0;
var speedChangeInterval = 0;
var food = [];

function toggleConnectome() {
    document.getElementById("nodeHolder").style.opacity = document.getElementById("connectomeCheckbox").checked ? "1" : "0";
}

BRAIN.setup();
for (var ps in BRAIN.connectome) {
    var nameBox = document.createElement('span');
    //nameBox.innerHTML = ps;
    document.getElementById("nodeHolder").appendChild(nameBox);

    var newBox = document.createElement('span');
    newBox.cols = 3;
    newBox.rows = 1;
    newBox.id = ps;
    newBox.className = "brainNode";
    document.getElementById("nodeHolder").appendChild(newBox);
}

function updateBrain() {
    BRAIN.update();
    for (var ps in BRAIN.connectome) {
        var psBox = document.getElementById(ps);
        var neuron = BRAIN.postSynaptic[ps][BRAIN.thisState];

        psBox.style.backgroundColor = "#55FF55";
        psBox.style.opacity = Math.min(1, neuron / 50);
    }
    let scalingFactor = 20;
    let newDir = ((BRAIN.accumleft - BRAIN.accumright) / scalingFactor);
    targetDir = facingDir + (newDir * Math.PI);
    //targetDir = facingDir + calculateFinalDirection(BRAIN.accumleft/200, BRAIN.accumright/200);
    targetSpeed = (Math.abs(BRAIN.accumleft) + Math.abs(BRAIN.accumright)) / (scalingFactor*5);
    speedChangeInterval = (targetSpeed - speed) / (scalingFactor*1.5);
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

/* IK Segment */

var IKSegment = function(size, head, tail) {

    this.size = size;
    this.head = head || {
        x: 0.0,
        y: 0.0
    };
    this.tail = tail || {
        x: this.head.x + size,
        y: this.head.y + size
    };

    this.update = function() {

        // Position derivitives
        var dx = this.head.x - this.tail.x;
        var dy = this.head.y - this.tail.y;

        var dist = Math.sqrt(dx * dx + dy * dy);
        var force = 0.5 - this.size / dist * 0.5;
        var strength = 0.998; // No springiness

        force *= 0.99;

        var fx = force * dx;
        var fy = force * dy;

        this.tail.x += fx * strength * 2.0;
        this.tail.y += fy * strength * 2.0;
        this.head.x -= fx * (1.0 - strength) * 2.0;
        this.head.y -= fy * (1.0 - strength) * 2.0;
    };
};

/* IK Chain */

var IKChain = function(size, interval) {

    this.links = new Array(size);

    this.update = function(target) {

        var link = this.links[0];

        link.head.x = target.x;
        link.head.y = target.y;

        for (var i = 0, n = this.links.length; i < n; ++i) {
            this.links[i].update();
        }
    };

    var point = {
        x: 0,
        y: 0
    };

    for (var i = 0, n = this.links.length; i < n; ++i) {
        var link = this.links[i] = new IKSegment(interval, point);
        link.head.x = Math.random() * 500;
        link.head.y = Math.random() * 500;
        link.tail.x = Math.random() * 500;
        link.tail.y = Math.random() * 500;
        point = link.tail;
    }
};

/* Test */

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

function line(ctx, x1, y1, x2, y2) {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.stroke();
}

var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

canvas.addEventListener("mousedown", addFood, false);

function addFood(event) {
    var x = event.x;
    var y = event.y;

    x -= canvas.offsetLeft;
    y -= canvas.offsetTop;

    food.push({ "x": x, "y": y });
}

function drawFood() {
    for (var i = 0; i < food.length; i++) {
        circle(ctx, food[i].x, food[i].y, 10, 'rgb(251,192,45)');
    }
}

var target = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
};

var chain = new IKChain(200, 1);

function update() {

    speed += speedChangeInterval;

    var facingMinusTarget = facingDir - targetDir;
    var angleDiff = facingMinusTarget;

    if (Math.abs(facingMinusTarget) > 180) {
        if (facingDir > targetDir) {
            angleDiff = -1 * ((360 - facingDir) + targetDir);
        } else {
            angleDiff = (360 - targetDir) + facingDir;
        }
    }

    if (angleDiff > 0) {
        facingDir -= 0.1;
    } else if (angleDiff < 0) {
        facingDir += 0.1;
    }

    target.x += (Math.cos(facingDir) * speed);
    target.y -= (Math.sin(facingDir) * speed);

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

    for (var i = 0; i < food.length; i++) {
        if (Math.hypot(Math.round(target.x) - food[i].x, Math.round(target.y) - food[i].y) <= 50) {
            // simulate food sense if food nearby
            BRAIN.stimulateFoodSenseNeurons = true;

            if (Math.hypot(Math.round(target.x) - food[i].x, Math.round(target.y) - food[i].y) <= 20) {
                // eat food if close enough
                food.splice(i, 1);
            }
        }
    }

    setTimeout(function() {
        BRAIN.stimulateHungerNeurons = true;
        BRAIN.stimulateNoseTouchNeurons = false;
        BRAIN.stimulateFoodSenseNeurons = false;
    }, 2000);

    // Update IK chain
    chain.update(target);
}

function draw() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawFood();

    circle(ctx, target.x, target.y, 5, 'rgba(255,255,255,0.1)');

    var link = chain.links[0];
    var p1 = link.head,
        p2 = link.tail;

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 20;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

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
}());


setInterval(function() {
    update();
    draw();
}, 1e3 / 60);