var tileSize = 20; //px
var fieldSize = 40; //x & y (0 - 39)
var fieldWidth = tileSize * fieldSize;
var fieldHeight = tileSize * fieldSize;
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
let dirX = 0; // -1 = left 1 = right
let dirY = 1; // -1 = up 1 = down

let score = 0;

//setup first level contents
var berries = [];
addBerries(3, 4);//add at least 3 for first level
function addBerries(min, max) {
    //add at least min amount of berries, plus max - 1
    for (var i = 0; i < Math.floor(Math.random() * max) + min; i++) {
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

    //draw
    cnvsCtx.clearRect(0, 0, fieldWidth, fieldHeight);
    drawBerries();
    drawSnake();
}

function handleCollision() {
    var berryToRemove = -1;
    for (var i = 0; i < berries.length; i++) {
        var berry = berries[i];
        if (snake[snake.length - 1].x == berry.x && snake[snake.length - 1].y == berry.y) {
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
    snake.forEach(e => cnvsCtx.fillRect(e.x * tileSize, e.y * tileSize, tileSize, tileSize));
    cnvsCtx.strokeStyle = "black";
    snake.forEach(e => cnvsCtx.strokeRect(e.x * tileSize + 1, e.y * tileSize + 1, tileSize - 2, tileSize - 2));
}

function drawBerries() {
    cnvsCtx.fillStyle = "red";
    berries.forEach(e => cnvsCtx.fillRect(e.x * tileSize, e.y * tileSize, tileSize, tileSize));
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
    console.log("x:" + snake[snake.length - 1].x + "y:" + snake[snake.length - 1].y);
}

function moveByKeyPress(e) { //testing
    changeDirection(e);
    gameLoop();
}

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
setInterval(gameLoop, 300); // live