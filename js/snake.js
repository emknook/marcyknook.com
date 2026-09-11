const fieldSize = 10;
const gameSpeed = 200;

const correctionWindow = 80;
const maxQueueLength = 3;
const minSwipeDistance = 24;

const snakeContainer = document
    .getElementById("snake")
    .querySelector('[id="content"]');

const canvasElement = document.createElement("canvas");
const canvas = canvasElement.getContext("2d");

snakeContainer.append(canvasElement);

let tileSize = 20;

let snake = [
    {
        x: Math.floor(fieldSize / 2),
        y: Math.floor(fieldSize / 2) - 1
    },
    {
        x: Math.floor(fieldSize / 2),
        y: Math.floor(fieldSize / 2)
    },
    {
        x: Math.floor(fieldSize / 2),
        y: Math.floor(fieldSize / 2) + 1
    }
];

const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
};

let currentDirection = "down";
let directionQueue = [];
let lastDirectionInputTime = 0;

let gameState = "ready";
let snakeInterval = null;

let score = 0;
let berries = [];


/*
 * SETUP
 */

function setupSnake() {
    clearInterval(snakeInterval);

    snake = [
        {
            x: Math.floor(fieldSize / 2),
            y: Math.floor(fieldSize / 2) - 1
        },
        {
            x: Math.floor(fieldSize / 2),
            y: Math.floor(fieldSize / 2)
        },
        {
            x: Math.floor(fieldSize / 2),
            y: Math.floor(fieldSize / 2) + 1
        }
    ];

    currentDirection = "down";
    directionQueue = [];
    lastDirectionInputTime = 0;

    score = 0;
    berries = [];
    addBerries(3, 4);

    gameState = "playing";
    snakeInterval = setInterval(gameLoop, gameSpeed);

    drawGame();
}

function gameLoop() {
    moveSnake();

    if (gameState !== "gameover") {
        drawGame();
    }
}


/*
 * SIZING
 */

function determineSize() {
    const { width, height } = snakeContainer.getBoundingClientRect();
    const size = Math.min(width, height);

    tileSize = size / fieldSize;

    canvasElement.style.width = `${size}px`;
    canvasElement.style.height = `${size}px`;

    canvasElement.width = size;
    canvasElement.height = size;

    drawGame();
}

const resizeObserver = new ResizeObserver(determineSize);
resizeObserver.observe(snakeContainer);


/*
 * BERRIES
 */

function addBerries(min, max) {
    const requestedAmount =
        Math.floor(Math.random() * (max - min + 1)) + min;

    const availableTiles = [];

    for (let y = 0; y < fieldSize; y++) {
        for (let x = 0; x < fieldSize; x++) {
            const occupiedBySnake = snake.some(
                segment => segment.x === x && segment.y === y
            );

            const occupiedByBerry = berries.some(
                berry => berry.x === x && berry.y === y
            );

            if (!occupiedBySnake && !occupiedByBerry) {
                availableTiles.push({ x, y });
            }
        }
    }

    const amount = Math.min(requestedAmount, availableTiles.length);

    for (let i = 0; i < amount; i++) {
        const randomIndex = Math.floor(
            Math.random() * availableTiles.length
        );

        const berry = availableTiles.splice(randomIndex, 1)[0];

        berries.push(berry);
    }
}


/*
 * MOVEMENT
 */

function moveSnake() {
    determineDirection();

    const oldHead = snake[snake.length - 1];
    const movement = directions[currentDirection];

    const newHead = {
        x: oldHead.x + movement.x,
        y: oldHead.y + movement.y
    };

    const berryIndex = berries.findIndex(
        berry =>
            berry.x === newHead.x &&
            berry.y === newHead.y
    );

    const ateBerry = berryIndex !== -1;

    if (
        isOutsideField(newHead) ||
        wouldHitSnake(newHead, ateBerry)
    ) {
        gameOver();
        return;
    }

    snake.push(newHead);

    if (ateBerry) {
        berries.splice(berryIndex, 1);
        score++;

        if (berries.length === 0) {
            addBerries(2, 5);
        }
    } else {
        snake.shift();
    }
}

function isOutsideField(position) {
    return (
        position.x < 0 ||
        position.y < 0 ||
        position.x >= fieldSize ||
        position.y >= fieldSize
    );
}

function wouldHitSnake(newHead, isGrowing) {
    /*
     * If the snake is not eating, its tail moves away during
     * this tick. That means moving into the current tail tile
     * is legal.
     */
    const bodyToCheck = isGrowing
        ? snake
        : snake.slice(1);

    return bodyToCheck.some(
        segment =>
            segment.x === newHead.x &&
            segment.y === newHead.y
    );
}


/*
 * DIRECTION QUEUE
 */

function queueDirection(direction) {
    const now = performance.now();

    const shouldReplace =
        directionQueue.length > 0 &&
        now - lastDirectionInputTime < correctionWindow;

    if (shouldReplace) {
        replaceLastDirection(direction);
    } else {
        addDirection(direction);
    }

    lastDirectionInputTime = now;
}

function replaceLastDirection(direction) {
    const previousDirection =
        directionQueue.length >= 2
            ? directionQueue[directionQueue.length - 2]
            : currentDirection;

    /*
     * Example:
     *
     * Currently moving down
     * Queue: [right]
     *
     * Player quickly presses down.
     *
     * That means they corrected themselves and don't
     * want to turn at all, so remove "right".
     */
    if (direction === previousDirection) {
        directionQueue.pop();
        return;
    }

    if (isOppositeDirection(direction, previousDirection)) {
        return;
    }

    directionQueue[directionQueue.length - 1] = direction;
}

function addDirection(direction) {
    const previousDirection =
        directionQueue.length > 0
            ? directionQueue[directionQueue.length - 1]
            : currentDirection;

    if (
        direction === previousDirection ||
        isOppositeDirection(direction, previousDirection)
    ) {
        return;
    }

    if (directionQueue.length < maxQueueLength) {
        directionQueue.push(direction);
        return;
    }

    /*
     * Don't remove the oldest command.
     *
     * Doing that could turn a valid sequence such as:
     *
     * down -> right -> up -> left
     *
     * into:
     *
     * down -> up -> left
     *
     * which would cause an illegal reversal.
     *
     * Instead, replace the newest queued command.
     */
    const directionBeforeLast =
        directionQueue[directionQueue.length - 2];

    if (direction === directionBeforeLast) {
        directionQueue.pop();
        return;
    }

    if (isOppositeDirection(direction, directionBeforeLast)) {
        return;
    }

    directionQueue[directionQueue.length - 1] = direction;
}

function determineDirection() {
    if (directionQueue.length === 0) {
        return;
    }

    currentDirection = directionQueue.shift();
}

function isOppositeDirection(a, b) {
    return (
        (a === "up" && b === "down") ||
        (a === "down" && b === "up") ||
        (a === "left" && b === "right") ||
        (a === "right" && b === "left")
    );
}


/*
 * INPUT
 */

function handleKeyPress(event) {
    const app = document.getElementById('snake');
    if (!app.classList.contains('show') ||
        !document.querySelector('.nav-item[data-target="snake"]').classList.contains('active') ||
        event.target.closest('input, select, textarea, button, [contenteditable="true"]')) return;
    const key = event.key.toLowerCase();

    const gameKeys = [
        " ",
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
        "w",
        "a",
        "s",
        "d"
    ];

    if (gameKeys.includes(key)) {
        event.preventDefault();
    }

    if (gameState === "ready") {
        if (key === " ") {
            setupSnake();
        }

        return;
    }

    if (gameState === "gameover") {
        if (key === " ") {
            setupSnake();
        }

        return;
    }

    if (key === " ") {
        if (gameState === "playing") {
            pauseSnake();
        } else if (gameState === "paused") {
            resumeSnake();
        }

        return;
    }

    switch (key) {
        case "arrowup":
        case "w":
            queueDirection("up");
            break;

        case "arrowdown":
        case "s":
            queueDirection("down");
            break;

        case "arrowleft":
        case "a":
            queueDirection("left");
            break;

        case "arrowright":
        case "d":
            queueDirection("right");
            break;
    }

    drawGame();
}

document.addEventListener("keydown", handleKeyPress);

let swipeStart = null;

function handlePointerDown(event) {
    if (event.pointerType === "mouse") {
        return;
    }

    swipeStart = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY
    };

    canvasElement.setPointerCapture(event.pointerId);
    event.preventDefault();
}

function handlePointerUp(event) {
    if (
        !swipeStart ||
        swipeStart.pointerId !== event.pointerId
    ) {
        return;
    }

    const deltaX = event.clientX - swipeStart.x;
    const deltaY = event.clientY - swipeStart.y;
    const distance = Math.hypot(deltaX, deltaY);

    swipeStart = null;

    if (
        gameState === "ready" ||
        gameState === "gameover"
    ) {
        if (distance < minSwipeDistance) {
            setupSnake();
        }

        return;
    }

    if (
        gameState !== "playing" ||
        distance < minSwipeDistance
    ) {
        return;
    }

    const direction =
        Math.abs(deltaX) > Math.abs(deltaY)
            ? deltaX > 0
                ? "right"
                : "left"
            : deltaY > 0
                ? "down"
                : "up";

    queueDirection(direction);
    drawGame();
    event.preventDefault();
}

function cancelSwipe(event) {
    if (
        swipeStart &&
        swipeStart.pointerId === event.pointerId
    ) {
        swipeStart = null;
    }
}

canvasElement.addEventListener("pointerdown", handlePointerDown);
canvasElement.addEventListener("pointerup", handlePointerUp);
canvasElement.addEventListener("pointercancel", cancelSwipe);


/*
 * PAUSE / GAME OVER
 */

function pauseSnake() {
    clearInterval(snakeInterval);
    snakeInterval = null;

    gameState = "paused";

    drawGame();
}

function resumeSnake() {
    snakeInterval = setInterval(gameLoop, gameSpeed);
    gameState = "playing";

    drawGame();
}

function gameOver() {
    clearInterval(snakeInterval);
    snakeInterval = null;

    gameState = "gameover";

    const snakeSettings = getAppSettings("snake");

    if (
        !snakeSettings.highScore ||
        snakeSettings.highScore < score
    ) {
        snakeSettings.highScore = score;

        const scoreText = document.getElementById("snake-score");
        scoreText.innerText = `Highscore: ${score}`;
    }

    saveSettings();

    drawGame();
}


/*
 * DRAWING
 */

function drawGame() {
    canvas.clearRect(
        0,
        0,
        canvasElement.width,
        canvasElement.height
    );

    if (gameState === "ready") {
        drawMessage("Tap or press space to start!");
        return;
    }

    drawBerries();
    drawSnake();
    drawScore();
    drawDirection();

    if (gameState === "paused") {
        drawMessage("Paused");
    }

    if (gameState === "gameover") {
        drawMessage("Game over!", "Tap or press Space to play again");
    }
}

function drawSnake() {
    canvas.fillStyle = "lime";

    snake.forEach(segment => {
        canvas.fillRect(
            segment.x * tileSize,
            segment.y * tileSize,
            tileSize,
            tileSize
        );
    });

    canvas.strokeStyle = "black";

    snake.forEach(segment => {
        canvas.strokeRect(
            segment.x * tileSize + 1,
            segment.y * tileSize + 1,
            tileSize - 2,
            tileSize - 2
        );
    });

    drawSnakeEyes();
}

function drawSnakeEyes() {
    const head = snake[snake.length - 1];
    const direction = directions[currentDirection];

    const centerX = (head.x + 0.5) * tileSize;
    const centerY = (head.y + 0.5) * tileSize;

    const perpendicular = {
        x: -direction.y,
        y: direction.x
    };

    const forwardOffset = tileSize * 0.22;
    const sideOffset = tileSize * 0.2;
    const eyeRadius = tileSize * 0.13;
    const pupilRadius = tileSize * 0.055;
    const pupilOffset = tileSize * 0.04;

    [-1, 1].forEach(side => {
        const eyeX =
            centerX +
            direction.x * forwardOffset +
            perpendicular.x * sideOffset * side;

        const eyeY =
            centerY +
            direction.y * forwardOffset +
            perpendicular.y * sideOffset * side;

        canvas.fillStyle = "white";
        canvas.beginPath();
        canvas.arc(
            eyeX,
            eyeY,
            eyeRadius,
            0,
            Math.PI * 2
        );
        canvas.fill();

        canvas.fillStyle = "black";
        canvas.beginPath();
        canvas.arc(
            eyeX + direction.x * pupilOffset,
            eyeY + direction.y * pupilOffset,
            pupilRadius,
            0,
            Math.PI * 2
        );
        canvas.fill();
    });
}

function drawBerries() {
    berries.forEach(berry => {
        const centerX = (berry.x + 0.5) * tileSize;
        const centerY = (berry.y + 0.55) * tileSize;
        const radius = tileSize * 0.34;

        canvas.fillStyle = "red";
        canvas.beginPath();
        canvas.arc(
            centerX,
            centerY,
            radius,
            0,
            Math.PI * 2
        );
        canvas.fill();

        canvas.save();
        canvas.translate(
            centerX + tileSize * 0.12,
            centerY - tileSize * 0.34
        );
        canvas.rotate(-Math.PI / 4);

        canvas.fillStyle = "green";
        canvas.beginPath();
        canvas.ellipse(
            0,
            0,
            tileSize * 0.18,
            tileSize * 0.09,
            0,
            0,
            Math.PI * 2
        );
        canvas.fill();

        canvas.restore();
    });
}

function drawScore() {
    canvas.font = "20px Arial";
    canvas.fillStyle = "white";
    canvas.textBaseline = "top";

    canvas.fillText(`Score: ${score}`, 0, 0);
}

function drawDirection() {
    canvas.font = "20px Arial";
    canvas.fillStyle = "white";
    canvas.textBaseline = "top";

    const queue =
        directionQueue.length > 0
            ? directionQueue.join(", ")
            : "-";

    canvas.fillText(
        `Direction: ${currentDirection} [${queue}]`,
        0,
        30
    );
}

function drawMessage(message, hint = '') {
    canvas.font = "20px Arial";
    canvas.fillStyle = "white";
    canvas.textBaseline = "middle";
    canvas.textAlign = "center";

    canvas.fillText(
        message,
        canvasElement.width / 2,
        canvasElement.height / 2 - (hint ? 16 : 0),
        Math.max(1, canvasElement.width - 16)
    );

    if (hint) {
        canvas.font = "14px Arial";
        canvas.fillText(hint, canvasElement.width / 2, canvasElement.height / 2 + 14,
            Math.max(1, canvasElement.width - 16));
    }

    canvas.textAlign = "start";
}


/*
 * INITIAL DRAW
 */

determineSize();
