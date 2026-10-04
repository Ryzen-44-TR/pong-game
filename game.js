const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const leftScoreEl = document.getElementById("left-score");
const rightScoreEl = document.getElementById("right-score");
const ballSpeedEl = document.getElementById("ball-speed");
const fpsEl = document.getElementById("game-fps");
const finalStatsEl = document.getElementById("finalStats");

const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const pauseScreen = document.getElementById("pauseScreen");
const gameOverScreen = document.getElementById("gameOverScreen");

const difficultySelect = document.getElementById("difficultySelect");
const soundToggle = document.getElementById("soundToggle");

const paddleWidth = 14;
const paddleHeight = 120;
const paddleOffset = 20;
const aiResponse = {
  easy: 0.08,
  normal: 0.12,
  hard: 0.18
};

let gameState = "menu";
let lastTime = 0;
let frameCount = 0;
let fps = 0;

const left = {
  x: paddleOffset,
  y: canvas.height / 2 - paddleHeight / 2,
  width: paddleWidth,
  height: paddleHeight,
  score: 0,
  targetY: 0,
  speed: 8
};

const right = {
  x: canvas.width - paddleOffset - paddleWidth,
  y: canvas.height / 2 - paddleHeight / 2,
  width: paddleWidth,
  height: paddleHeight,
  score: 0,
  speed: 5
};

const ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 9,
  vx: 5,
  vy: 4
};

const keys = {
  ArrowUp: false,
  ArrowDown: false
};

let mouseY = left.y + left.height / 2;
let touchActive = false;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setScreen(screen) {
  startScreen.classList.remove("screen-active");
  gameScreen.classList.remove("screen-active");
  pauseScreen.classList.remove("screen-active");
  gameOverScreen.classList.remove("screen-active");

  if (screen) {
    screen.classList.add("screen-active");
  }
}

function playSound(type) {
  if (!soundToggle.checked || !window.pongAudio) return;
  window.pongAudio.play(type);
}

function updateScoreboard() {
  leftScoreEl.textContent = left.score;
  rightScoreEl.textContent = right.score;
}

function getDifficulty() {
  return difficultySelect.value;
}

function resetBall(direction = 1) {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  const speedBoost = 1 + (Math.max(left.score, right.score) * 0.04);

  const baseSpeed = 5 * speedBoost;
  ball.vx = direction * baseSpeed;
  ball.vy = (Math.random() * 4 - 2) * speedBoost;
}

function startGame() {
  left.score = 0;
  right.score = 0;
  left.y = canvas.height / 2 - left.height / 2;
  right.y = canvas.height / 2 - right.height / 2;
  updateScoreboard();
  resetBall(1);
  gameState = "playing";
  setScreen(gameScreen);
  playSound("start");
}

function pauseGame() {
  if (gameState !== "playing") return;
  gameState = "paused";
  setScreen(pauseScreen);
}

function resumeGame() {
  if (gameState !== "paused") return;
  gameState = "playing";
  setScreen(gameScreen);
}

function goToMenu() {
  gameState = "menu";
  setScreen(startScreen);
}

function endGame() {
  gameState = "over";
  const winner = left.score > right.score ? "Player Wins!" : left.score < right.score ? "Computer Wins!" : "It's a Draw!";
  finalStatsEl.innerHTML = `
    <strong>Final Score:</strong> ${left.score} - ${right.score}<br>
    <strong>Result:</strong> ${winner}
  `;
  setScreen(gameOverScreen);
  playSound("gameover");
}

function updateLeftPaddle() {
  if (keys.ArrowUp) {
    left.y -= left.speed;
  } else if (keys.ArrowDown) {
    left.y += left.speed;
  } else {
    left.targetY = clamp(mouseY, 0, canvas.height - left.height);
    left.y += (left.targetY - left.y) * 0.28;
  }

  left.y = clamp(left.y, 0, canvas.height - left.height);
}

function updateRightPaddle() {
  const reaction = aiResponse[getDifficulty()];
  const targetY = ball.y - right.height / 2;

  right.y += (targetY - right.y) * reaction;
  right.y = clamp(right.y, 0, canvas.height - right.height);
}

function handleWallCollision() {
  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.vy *= -1;
    playSound("wall");
  }

  if (ball.y + ball.radius >= canvas.height) {
    ball.y = canvas.height - ball.radius;
    ball.vy *= -1;
    playSound("wall");
  }
}

function handlePaddleCollision() {
  const leftMinX = left.x;
  const leftMaxX = left.x + left.width;
  const rightMinX = right.x;
  const rightMaxX = right.x + right.width;

  if (
    ball.x - ball.radius <= leftMaxX &&
    ball.x + ball.radius >= leftMinX &&
    ball.y >= left.y &&
    ball.y <= left.y + left.height &&
    ball.vx < 0
  ) {
    const relativeIntersect = (ball.y - (left.y + left.height / 2)) / (left.height / 2);
    ball.x = leftMaxX + ball.radius;
    ball.vx = Math.abs(ball.vx) * 1.04;
    ball.vy = relativeIntersect * 7;
    playSound("paddle");
  }

  if (
    ball.x + ball.radius >= rightMinX &&
    ball.x - ball.radius <= rightMaxX &&
    ball.y >= right.y &&
    ball.y <= right.y + right.height &&
    ball.vx > 0
  ) {
    const relativeIntersect = (ball.y - (right.y + right.height / 2)) / (right.height / 2);
    ball.x = rightMinX - ball.radius;
    ball.vx = -Math.abs(ball.vx) * 1.04;
    ball.vy = relativeIntersect * 7;
    playSound("paddle");
  }
}

function updateBall() {
  ball.x += ball.vx;
  ball.y += ball.vy;

  handleWallCollision();
  handlePaddleCollision();

  if (ball.x - ball.radius <= 0) {
    right.score += 1;
    updateScoreboard();
    playSound("score");
    resetBall(1);

    if (right.score >= 5) {
      endGame();
    }
  }

  if (ball.x + ball.radius >= canvas.width) {
    left.score += 1;
    updateScoreboard();
    playSound("score");
    resetBall(-1);

    if (left.score >= 5) {
      endGame();
    }
  }

  ballSpeedEl.textContent = `Speed: ${Math.round(Math.abs(ball.vx) * 10) / 10}`;
}

function drawNet() {
  const netWidth = 6;
  const gap = 18;
  const x = canvas.width / 2 - netWidth / 2;

  for (let y = 0; y < canvas.height; y += gap * 2) {
    ctx.fillStyle = "#edf2ff";
    ctx.fillRect(x, y, netWidth, gap);
  }
}

function drawPaddles() {
  ctx.fillStyle = "#edf2ff";
  ctx.fillRect(left.x, left.y, left.width, left.height);
  ctx.fillRect(right.x, right.y, right.width, right.height);
}

function drawBall() {
  ctx.beginPath();
  ctx.fillStyle = "#ffca5e";
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawNet();
  drawPaddles();
  drawBall();
}

function updateFPS(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const delta = timestamp - lastTime;
  lastTime = timestamp;

  frameCount++;
  if (frameCount >= 12) {
    fps = 1000 / delta;
    frameCount = 0;
  }

  fpsEl.textContent = `FPS: ${Math.round(fps || 60)}`;
}

function gameLoop(timestamp) {
  updateFPS(timestamp);

  if (gameState === "playing") {
    updateLeftPaddle();
    updateRightPaddle();
    updateBall();
  }

  draw();
  requestAnimationFrame(gameLoop);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    event.preventDefault();
  }

  if (event.key in keys) {
    keys[event.key] = true;
  }

  if (event.key === " " && gameState === "playing") {
    pauseGame();
  }
});

document.addEventListener("keyup", (event) => {
  if (event.key in keys) {
    keys[event.key] = false;
  }
});

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  const cursorY = event.clientY - rect.top;
  mouseY = cursorY - left.height / 2;
});

canvas.addEventListener("touchstart", (event) => {
  touchActive = true;
  const touch = event.touches[0];
  const rect = canvas.getBoundingClientRect();
  const touchY = touch.clientY - rect.top;
  mouseY = touchY - left.height / 2;
});

canvas.addEventListener("touchmove", (event) => {
  if (!touchActive) return;
  const touch = event.touches[0];
  const rect = canvas.getBoundingClientRect();
  const touchY = touch.clientY - rect.top;
  mouseY = touchY - left.height / 2;
});

canvas.addEventListener("touchend", () => {
  touchActive = false;
});

window.addEventListener("pointerdown", () => {
  if (gameState === "menu") {
    setScreen(gameScreen);
  }
});

window.pongAudio = {
  play(type) {
    const isEnabled = document.getElementById("soundToggle")?.checked ?? true;
    if (!isEnabled) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const audioContext = new AudioCtx();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "square";
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const presets = {
      paddle: { frequency: 220, duration: 0.06, volume: 0.04 },
      wall: { frequency: 180, duration: 0.04, volume: 0.03 },
      score: { frequency: 440, duration: 0.1, volume: 0.05 },
      start: { frequency: 660, duration: 0.15, volume: 0.05 },
      gameover: { frequency: 120, duration: 0.3, volume: 0.06 }
    };

    const selected = presets[type] || presets.paddle;
    oscillator.frequency.value = selected.frequency;
    gainNode.gain.value = selected.volume;
    oscillator.start();

    const stopAt = audioContext.currentTime + selected.duration;
    gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    oscillator.stop(stopAt);

    setTimeout(() => audioContext.close(), selected.duration * 1000 + 100);
  }
};

updateScoreboard();
setScreen(startScreen);
requestAnimationFrame(gameLoop);
