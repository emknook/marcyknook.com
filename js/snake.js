//px => make into variable defined by size of window
var tileHeight = 20;
var tileWidth = 20;
var fieldSize = 30; //x & y (0 - 19)

var fieldWidth = tileWidth * fieldSize;
var fieldHeight = tileHeight * fieldSize;
var snakeContainer = document.getElementById("snake");
var field = document.createElement("canvas");

field.style.width = fieldWidth + 'px';
field.style.height = fieldHeight + 'px';
field.width = fieldWidth;
field.height = fieldHeight;
const cnvsCtx = field.getContext("2d");
snakeContainer.querySelector('[id="content"]').append(field);
// var scoreDiv = document.getElementById('score');
//setup snake, array of "blocks"/"tiles" with x and y (the more blocks, the longer the snake)
var snake = [{ x: Math.floor(fieldSize / 2), y: Math.floor(fieldSize / 2) },
{ x: Math.floor(fieldSize / 2), y: Math.floor(fieldSize / 2) + 1 },
{ x: Math.floor(fieldSize / 2), y: Math.floor(fieldSize / 2) + 2 }];
var dirX = 0; // -1 = left 1 = right
var dirY = 1; // -1 = up 1 = down

var score = 0;

//setup first level contents
var berries = [];
addBerries(3, 4);//add at least 3 for first level
function addBerries(min, max) {
    //add at least min amount of berries, plus max
    for (var i = 0; (i < Math.floor(Math.random() * max) + min) && i < max; i++) {
        var posX = Math.floor(Math.random() * fieldSize);
        var posY = Math.floor(Math.random() * fieldSize);
        if (!snake.find(e => e.x == posX && e.y == posY)) {
            berries.push({ x: posX, y: posY });
        }
    }
}

//do loop
function gameLoop() {
    //function
    moveSnake();
    //determine size of field
    determineSize();
    //draw
    cnvsCtx.clearRect(0, 0, fieldWidth, fieldHeight);
    drawBerries();
    drawSnake();
}

function determineSize() {
    fieldHeight = snakeContainer.style.height;
    fieldWidth = snakeContainer.style.width;
    var width = fieldWidth.split("px")[0];
    var height = fieldHeight.split("px")[0];
    tileWidth = width / fieldSize;
    tileHeight = height / fieldSize;
    field.style.width = width + 'px';
    field.style.height = height - 24 + 'px';
    field.width = width;
    field.height = height;

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
            // scoreDiv.innerText = "Score: " + score;
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
    snake.forEach(e => cnvsCtx.fillRect(e.x * tileWidth, e.y * tileHeight, tileWidth, tileHeight));
    cnvsCtx.strokeStyle = "black";
    snake.forEach(e => cnvsCtx.strokeRect(e.x * tileWidth + 1, e.y * tileHeight + 1, tileWidth - 2, tileHeight - 2));
}

function drawBerries() {
    cnvsCtx.fillStyle = "red";
    berries.forEach(e => cnvsCtx.fillRect(e.x * tileWidth, e.y * tileHeight, tileWidth, tileHeight));
}

function gameOver() {
    clearInterval(snakeInterval);
}

function moveSnake() {
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
    changeDirection(e);
    gameLoop();
}

var direction = 'down';

function changeDirection(e) {
    switch (e.key) {
        case "ArrowUp":
            dirY = -1;
            dirX = 0;
            break;
        case "ArrowDown":
            dirY = 1;
            dirX = 0;
            break;
        case "ArrowLeft":
            dirY = 0;
            dirX = -1;
            break;
        case "ArrowRight":
            dirY = 0;
            dirX = 1;
            break;
    }
}

// document.addEventListener("keydown", moveByKeyPress); // testing
document.addEventListener("keydown", changeDirection); // "live"
var snakeInterval = setInterval(gameLoop, 200); // live