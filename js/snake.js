let tileSize = 20;
let fieldSize = 10;
let snakeContainer = document.getElementById("snake").querySelector('[id="content"]');
let field = document.createElement("canvas");
snakeContainer.append(field);
let canvasSize = tileSize * fieldSize;
const cnvsCtx = field.getContext("2d");
// let scoreDiv = document.getElementById('score');
//setup snake, array of "blocks"/"tiles" with x and y (the more blocks, the longer the snake)
let snake = [{ x: Math.floor(fieldSize / 2), y: Math.floor(fieldSize / 2) - 1 },
{ x: Math.floor(fieldSize / 2), y: Math.floor(fieldSize / 2) },
{ x: Math.floor(fieldSize / 2), y: Math.floor(fieldSize / 2) + 1 }];
let dirX = 0; // -1 = left 1 = right
let dirY = 1; // -1 = up 1 = down
let started = false;
let playing = false;
let score = 0;
let berries = [];
let bGameOver = false;
let newDirection = "";
let oldDirection = "down";

function addBerries(min, max) {
    //add at least min amount of berries, plus max
    for (var i = 0; (i < Math.floor(Math.random() * max) + min) && i < max; i++) {
        var posX = Math.floor(Math.random() * fieldSize);
        var posY = Math.floor(Math.random() * fieldSize);
        if (!snake.find(e => e.x == posX && e.y == posY)) {
            berries.push({ x: posX, y: posY });
        } else {
            addBerries(1, 1);
        }
    }
}

function setupSnake() {
    determineSize();
    addBerries(3, 4);//add at least 3 for first level
    document.addEventListener("keydown", handleKeyPress); // "live"
    snakeInterval = setInterval(gameLoop, 200); // live
    started = true;
    playing = true;
}

//do loop
function gameLoop() {
    //functions
    moveSnake();
    updateScore();
    //determine size of field
    determineSize();
    //draw
    cnvsCtx.clearRect(0, 0, fieldSize, fieldSize);
    drawBerries();
    drawSnake();
}

function updateScore() {

}

function determineSize() {
    var width = snakeContainer.getBoundingClientRect().width;
    var height = snakeContainer.getBoundingClientRect().height;
    var size = height > width ? width : height;
    tileSize = size / fieldSize;
    field.style.width = size + 'px';
    field.style.height = size + 'px';
    field.width = size;
    field.height = size;

}

function handleCollision() {
    //move Out of Screen
    var head = snake[snake.length - 1];
    if (head.x > fieldSize - 1 || head.y > fieldSize - 1 || head.x < 0 || head.y < 0) {
        gameOver();
        return;
    }

    //snake collision
    for (var i = snake.length - 2; i >= 0; i--) {
        let body = snake[i];
        if (head.x == body.x && head.y == body.y) {
            gameOver();
            return;
        }
    }

    //berry collision
    var berryToRemove = -1;
    for (var i = 0; i < berries.length; i++) {
        var berry = berries[i];
        if (head.x == berry.x && head.y == berry.y) {
            score++;
            berryToRemove = i;
            break;
        }
    }

    if (berryToRemove != -1) {
        berries.splice(berryToRemove, 1);
        return true;
    }

    if (berries.length == 0) {
        addBerries(1, 4);//add at least 1
    }
    return false;
}

function drawSnake() {
    cnvsCtx.fillStyle = "white";
    snake.forEach(e => cnvsCtx.fillRect(e.x * tileSize, e.y * tileSize, tileSize, tileSize));
    cnvsCtx.strokeStyle = "black";
    snake.forEach(e => cnvsCtx.strokeRect(e.x * tileSize + 1, e.y * tileSize + 1, tileSize - 2, tileSize - 2));
}

function drawBerries() {
    cnvsCtx.fillStyle = "red";
    berries.forEach(e => cnvsCtx.fillRect(e.x * tileSize, e.y * tileSize, tileSize, tileSize));
}

function gameOver() {
    clearInterval(snakeInterval);
    bGameOver = true;
}

function moveSnake() {
    //only determine now, so as not to switch direction and accidentally go into itself
    determineDirection();
    //add block to head, in direction
    //head = last element, add to head = push
    //tail = first element, remove tail = shift
    var oldHead = snake[snake.length - 1];
    var newHead = { x: oldHead.x, y: oldHead.y };
    newHead.x += dirX;
    newHead.y += dirY;
    snake.push(newHead);
    //remove tail, after adding head, if no berry eaten?:
    ateBerry = handleCollision();
    if (!ateBerry) {
        snake.shift();
    }
}

function moveByKeyPress(e) { //testing
    handleKeyPress(e);
    gameLoop();
}

function pauseSnake() {
    clearInterval(snakeInterval);
    playing = false;
}

function handleKeyPress(e) {
    if (!bGameOver | !started) {
        switch (e.key) {
            case " ":
                if (!started && !playing) {
                    setupSnake();
                } else if (!playing) {
                    snakeInterval = setInterval(gameLoop, 200); // live
                    playing = true;
                } else {
                    pauseSnake();
                }
                break;
            case "ArrowUp":
                newDirection = "up";
                break;
            case "ArrowDown":
                newDirection = "down";
                break;
            case "ArrowLeft":
                newDirection = "left";
                break;
            case "ArrowRight":
                newDirection = "right";
                break;
        }
    }
}

function determineDirection() {
    switch (newDirection) {
        //new = opposite of old, do nothing
        case "up":
            if (dirY != 1) { dirY = -1; dirX = 0; oldDirection = newDirection }
            break;
        case "down":
            if (dirY != -1) { dirY = 1; dirX = 0; oldDirection = newDirection }
            break;
        case "left":
            if (dirX != 1) { dirY = 0; dirX = -1; oldDirection = newDirection }
            break;
        case "right":
            if (dirX != -1) { dirY = 0; dirX = 1; oldDirection = newDirection }
            break;
    }
}

document.addEventListener("keydown", handleKeyPress);
let snakeInterval = null;