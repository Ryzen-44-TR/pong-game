const screenIds = ["loadingScreen", "menuScreen", "gameScreen", "gameOverScreen"];

const state = {
  screen: "loadingScreen",
  theme: "space",
  sound: true,
  lang: localStorage.getItem("lang") || "tr",
  difficulty: localStorage.getItem("difficulty") || "normal",
  target: Number(localStorage.getItem("targetScore") || 5),
  running: false,
  paused: false,
  playerScore: 0,
  enemyScore: 0,
  power: "",
  powerTimer: 0,
  particles: [],
  powerups: []
};

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const paddles = {
  player: { x: 164, y: 620, w: 92, h: 18, speed: 7 },
  enemy: { x: 164, y: 84, w: 92, h: 18 }
};

const ball = {
  x: 210,
  y: 380,
  r: 9,
  vx: 4.5,
  vy: 4.5
};

const keys = { ArrowLeft:false, ArrowRight:false };
let pointerX = canvas.width / 2;
let bossPhase = false;

function setScreen(id) {
  screenIds.forEach(name => document.getElementById(name).classList.remove("active"));
  document.getElementById(id).classList.add("active");
  state.screen = id;
}

function applyLanguage(lang) {
  state.lang = lang;
  localStorage.setItem("lang", lang);

  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });

  const labels = {
    tr: {
      start: "OYNA",
      theme: "TEMA",
      settings: "AYARLAR",
      pause: "DURAKLAT",
      resume: "DEVAM",
      gameover: "OYUN BİTTİ",
      retry: "YENİDEN OYNA",
      menu: "ANA MENÜ",
      loading: "YÜKLENİYOR..."
    },
    en: {
      start: "PLAY",
      theme: "THEME",
      settings: "SETTINGS",
      pause: "PAUSE",
      resume: "RESUME",
      gameover: "GAME OVER",
      retry: "PLAY AGAIN",
      menu: "MAIN MENU",
      loading: "LOADING..."
    }
  };

  const text = labels[lang];
  document.getElementById("startBtn").textContent = text.start;
  document.getElementById("themeBtn").textContent = text.theme;
  document.getElementById("settingsBtn").textContent = text.settings;
  document.getElementById("pauseBtn").textContent = state.running && !state.paused ? text.pause : text.resume;
  document.getElementById("retryBtn").textContent = text.retry;
  document.getElementById("menuBtn").textContent = text.menu;
  document.getElementById("loadingText").textContent = text.loading;
  document.querySelector(".over-title").textContent = text.gameover;
}

function playSound(type) {
  if (!state.sound) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const ctxAudio = new AudioCtx();
  const osc = ctxAudio.createOscillator();
  const gain = ctxAudio.createGain();

  osc.connect(gain);
  gain.connect(ctxAudio.destination);
  osc.type = "square";

  const sounds = {
    paddle: { freq: 250, dur: 0.06, vol: 0.05 },
    wall: { freq: 180, dur: 0.05, vol: 0.03 },
    score: { freq: 500, dur: 0.12, vol: 0.06 },
    start: { freq: 700, dur: 0.17, vol: 0.06 },
    ui: { freq: 360, dur: 0.08, vol: 0.04 },
    boss: { freq: 120, dur: 0.35, vol: 0.06 },
    win: { freq: 660, dur: 0.3, vol: 0.06 },
    lose: { freq: 140, dur: 0.5, vol: 0.07 }
  };

  const sound = sounds[type] || sounds.paddle;
  osc.frequency.value = sound.freq;
  gain.gain.value = sound.vol;
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, ctxAudio.currentTime + sound.dur);
  osc.stop(ctxAudio.currentTime + sound.dur);
  setTimeout(() => ctxAudio.close(), sound.dur * 1000 + 35);
}

function setTheme(theme) {
  state.theme = theme;
  document.body.dataset.theme = theme;
  document.querySelectorAll(".theme-card").forEach(card => card.classList.toggle("active", card.dataset.theme === theme));
  document.getElementById("themeLabel").textContent = theme.toUpperCase();
}

function toggleSettingsPanel() {
  document.getElementById("settingsPanel").classList.toggle("hidden");
  document.getElementById("themePanel").classList.toggle("hidden", true);
}

function toggleThemePanel() {
  document.getElementById("themePanel").classList.toggle("hidden");
  document.getElementById("settingsPanel").classList.toggle("hidden", true);
}

function showToast(text) {
  const toast = document.getElementById("storyToast");
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1600);
}

function spawnPower() {
  const types = ["speed", "slow", "double"];
  const type = types[Math.floor(Math.random() * types.length)];
  state.powerups = [{
    x: 80 + Math.random() * 260,
    y: 200 + Math.random() * 300,
    r: 12,
    type
  }];

  const pill = document.getElementById("powerPill");
  const labels = {
    speed: state.lang === "tr" ? "HIZ" : "SPEED",
    slow: state.lang === "tr" ? "YAVAŞ" : "SLOW",
    double: state.lang === "tr" ? "ÇİFT TOP" : "DOUBLE"
  };
  pill.textContent = labels[type];
  pill.classList.add("visible");
}

function applyPower(type) {
  if (type === "speed") {
    ball.vx *= 1.2;
    ball.vy *= 1.2;
  }
  if (type === "slow") {
    ball.vx *= 0.82;
    ball.vy *= 0.82;
  }
  if (type === "double") {
    // extra phantom ball: simple arcade variant
    state.power = "double";
    state.powerTimer = 180;
  }

  state.power = type;
  state.powerTimer = 180;
  playSound("ui");
}

function updatePower() {
  if (!state.powerups.length) return;
  const p = state.powerups[0];
  const dx = ball.x - p.x;
  const dy = ball.y - p.y;
  const dist = Math.hypot(dx, dy);

  if (dist < ball.r + p.r) {
    applyPower(p.type);
    state.powerups = [];
    document.getElementById("powerPill").classList.remove("visible");
  }

  if (state.powerTimer > 0) {
    state.powerTimer -= 1;
  } else if (state.power) {
    state.power = "";
  }
}

function resetBall() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  const diffBoost = { easy: 0.9, normal: 1.2, hard: 1.6, insane: 2.1 }[state.difficulty] || 1.2;
  const dirX = Math.random() > 0.5 ? 1 : -1;
  const dirY = Math.random() > 0.5 ? 1 : -1;
  ball.vx = dirX * (4.2 * diffBoost);
  ball.vy = dirY * (4.2 * diffBoost);
}

function startGame() {
  state.running = true;
  state.paused = false;
  state.playerScore = 0;
  state.enemyScore = 0;
  paddles.player.x = (canvas.width - paddles.player.w) / 2;
  paddles.enemy.x = (canvas.width - paddles.enemy.w) / 2;
  state.power = "";
  state.powerTimer = 0;
  state.powerups = [];
  document.getElementById("playerScore").textContent = "0";
  document.getElementById("enemyScore").textContent = "0";
  document.getElementById("pauseBtn").textContent = state.lang === "tr" ? "DURAKLAT" : "PAUSE";
  resetBall();
  setScreen("gameScreen");
  showToast(getThemeStory(state.theme));
  playSound("start");
  spawnPower();
}

function getThemeStory(theme) {
  const story = {
    space: { tr: "UZAY SAVAŞLARI BAŞLADI", en: "SPACE WARS BEGIN" },
    forest: { tr: "ORMAN TAPINAĞI UYANDI", en: "THE FOREST TEMPLE AWAKENS" },
    cyber: { tr: "NEON ŞEHİR HAZIR", en: "NEON CITY READY" },
    egypt: { tr: "PİRAMİTLER KALKTI", en: "PYRAMIDS RISE" },
    ocean: { tr: "DERİN DENİZ AÇILIYOR", en: "DEEP SEA OPENING" }
  };
  return story[theme][state.lang] || story[theme].tr;
}

function endGame(playerWon) {
  state.running = false;
  document.getElementById("finalPlayerScore").textContent = String(state.playerScore);
  document.getElementById("finalEnemyScore").textContent = String(state.enemyScore);
  const winnerText = document.getElementById("winnerText");
  winnerText.textContent = playerWon
    ? (state.lang === "tr" ? "OYUNCU KAZANDI!" : "PLAYER WINS!")
    : (state.lang === "tr" ? "RAKİP KAZANDI!" : "ENEMY WINS!");
  playSound(playerWon ? "win" : "lose");
  setScreen("gameOverScreen");
}

function updatePaddles() {
  const aiIntensity = { easy:0.08, normal:0.14, hard:0.2, insane:0.28 }[state.difficulty] || 0.14;

  if (keys.ArrowLeft) paddles.player.x -= paddles.player.speed;
  if (keys.ArrowRight) paddles.player.x += paddles.player.speed;
  if (pointerX) {
    const target = pointerX - paddles.player.w / 2;
    paddles.player.x += (target - paddles.player.x) * 0.25;
  }
  paddles.player.x = Math.max(0, Math.min(canvas.width - paddles.player.w, paddles.player.x));

  const targetEnemy = ball.x - paddles.enemy.w / 2;
  paddles.enemy.x += (targetEnemy - paddles.enemy.x) * aiIntensity;
  paddles.enemy.x = Math.max(0, Math.min(canvas.width - paddles.enemy.w, paddles.enemy.x));
}

function updateBall() {
  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.x - ball.r <= 0 || ball.x + ball.r >= canvas.width) {
    ball.vx *= -1;
    ball.x = Math.max(ball.r, Math.min(canvas.width - ball.r, ball.x));
    playSound("wall");
    spawnParticles(ball.x, ball.y, "#43e5ff", 10);
  }

  // player paddle collision
  if (
    ball.y + ball.r >= paddles.player.y &&
    ball.y - ball.r <= paddles.player.y + paddles.player.h &&
    ball.x >= paddles.player.x &&
    ball.x <= paddles.player.x + paddles.player.w &&
    ball.vy > 0
  ) {
    const hit = (ball.x - (paddles.player.x + paddles.player.w / 2)) / (paddles.player.w / 2);
    ball.vy = -(Math.abs(ball.vy) + 0.15);
    ball.vx = hit * 9;
    ball.y = paddles.player.y - ball.r - 1;
    playSound("paddle");
    spawnParticles(ball.x, ball.y, "#ff4cc8", 14);
  }

  // enemy paddle collision
  if (
    ball.y - ball.r <= paddles.enemy.y + paddles.enemy.h &&
    ball.y + ball.r >= paddles.enemy.y &&
    ball.x >= paddles.enemy.x &&
    ball.x <= paddles.enemy.x + paddles.enemy.w &&
    ball.vy < 0
  ) {
    const hit = (ball.x - (paddles.enemy.x + paddles.enemy.w / 2)) / (paddles.enemy.w / 2);
    ball.vy = Math.abs(ball.vy) + 0.15;
    ball.vx = hit * 9;
    ball.y = paddles.enemy.y + paddles.enemy.h + ball.r + 1;
    playSound("paddle");
    spawnParticles(ball.x, ball.y, "#43e5ff", 14);
  }

  // scoring
  if (ball.y > canvas.height + 20) {
    state.enemyScore += 1;
    document.getElementById("enemyScore").textContent = state.enemyScore;
    playSound("score");
    if (state.enemyScore >= state.target) {
      endGame(false);
      return;
    }
    resetBall();
  }

  if (ball.y < -20) {
    state.playerScore += 1;
    document.getElementById("playerScore").textContent = state.playerScore;
    playSound("score");
    if (state.playerScore >= state.target) {
      endGame(true);
      return;
    }
    resetBall();
  }
}

function spawnParticles(x, y, color, count = 14) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * (Math.random() * 3 + 1.5),
      vy: Math.sin(angle) * (Math.random() * 3 + 1.5),
      life: 30,
      color
    });
  }
}

function updateParticles() {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

function drawBackground() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, "rgba(10,16,28,1)");
  g.addColorStop(1, "rgba(11,18,27,1)");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // subtle background theme glow
  const tex = {
    space: "rgba(67,229,255,0.18)",
    forest: "rgba(143,241,198,0.18)",
    cyber: "rgba(255,76,200,0.12)",
    egypt: "rgba(255,209,102,0.12)",
    ocean: "rgba(90,210,255,0.14)"
  };
  ctx.fillStyle = tex[state.theme] || "rgba(67,229,255,0.12)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // center line
  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  // table glow
  ctx.fillStyle = "rgba(255,255,255,0.02)";
  for (let i = 0; i < canvas.width; i += 35) {
    ctx.fillRect(i, 0, 1.5, canvas.height);
  }
}

function drawPaddles() {
  ctx.fillStyle = "rgba(67,229,255,1)";
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#43e5ff";
  ctx.fillRect(paddles.enemy.x, paddles.enemy.y, paddles.enemy.w, paddles.enemy.h);

  ctx.fillStyle = "rgba(255,76,200,1)";
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#ff4cc8";
  ctx.fillRect(paddles.player.x, paddles.player.y, paddles.player.w, paddles.player.h);
  ctx.shadowBlur = 0;
}

function drawBall() {
  ctx.beginPath();
  ctx.fillStyle = "rgba(255,209,102,1)";
  ctx.shadowBlur = 24;
  ctx.shadowColor = "#ffd166";
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 4, 4);
  }
}

function drawPower() {
  if (!state.powerups.length) return;
  const p = state.powerups[0];
  const colors = { speed: "#ffd166", slow: "#8ef1c6", double: "#43e5ff" };
  ctx.beginPath();
  ctx.fillStyle = colors[p.type];
  ctx.shadowBlur = 18;
  ctx.shadowColor = colors[p.type];
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#09131e";
  ctx.font = "bold 10px Segoe UI";
  ctx.fillText(p.type === "speed" ? "S" : p.type === "slow" ? "L" : "2", p.x - 3, p.y + 3);
}

function loop() {
  if (state.running && !state.paused) {
    updatePaddles();
    updateBall();
    updateParticles();
    updatePower();
  }

  drawBackground();
  drawPaddles();
  drawBall();
  drawParticles();
  drawPower();

  requestAnimationFrame(loop);
}

function handleBindings() {
  document.getElementById("startBtn").addEventListener("click", startGame);
  document.getElementById("themeBtn").addEventListener("click", () => {
    document.getElementById("themePanel").classList.toggle("hidden");
    document.getElementById("settingsPanel").classList.add("hidden");
  });
  document.getElementById("settingsBtn").addEventListener("click", () => {
    document.getElementById("settingsPanel").classList.toggle("hidden");
    document.getElementById("themePanel").classList.add("hidden");
  });
  document.getElementById("retryBtn").addEventListener("click", startGame);
  document.getElementById("menuBtn").addEventListener("click", () => {
    setScreen("menuScreen");
    state.running = false;
    state.paused = false;
  });

  document.getElementById("pauseBtn").addEventListener("click", () => {
    if (!state.running) return;
    state.paused = !state.paused;
    document.getElementById("pauseBtn").textContent = state.paused ? (state.lang === "tr" ? "DEVAM" : "RESUME") : (state.lang === "tr" ? "DURAKLAT" : "PAUSE");
  });

  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => applyLanguage(btn.dataset.lang));
  });

  document.querySelectorAll(".theme-card").forEach(card => {
    card.addEventListener("click", () => {
      setTheme(card.dataset.theme);
      showToast(card.dataset.theme.toUpperCase());
    });
  });

  document.getElementById("soundToggle").addEventListener("change", (e) => {
    state.sound = e.target.checked;
    localStorage.setItem("soundEnabled", String(state.sound));
  });

  document.getElementById("difficultySelect").addEventListener("change", (e) => {
    state.difficulty = e.target.value;
    localStorage.setItem("difficulty", state.difficulty);
  });

  document.getElementById("targetSelect").addEventListener("change", (e) => {
    state.target = Number(e.target.value);
    localStorage.setItem("targetScore", String(state.target));
  });

  document.getElementById("leftBtn").addEventListener("pointerdown", () => {
    keys.ArrowLeft = true;
  });
  document.getElementById("leftBtn").addEventListener("pointerup", () => { keys.ArrowLeft = false; });
  document.getElementById("leftBtn").addEventListener("pointerleave", () => { keys.ArrowLeft = false; });

  document.getElementById("rightBtn").addEventListener("pointerdown", () => {
    keys.ArrowRight = true;
  });
  document.getElementById("rightBtn").addEventListener("pointerup", () => { keys.ArrowRight = false; });
  document.getElementById("rightBtn").addEventListener("pointerleave", () => { keys.ArrowRight = false; });

  window.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") keys.ArrowLeft = true;
    if (e.key === "ArrowRight") keys.ArrowRight = true;
    if (e.key === " " && state.running) {
      state.paused = !state.paused;
      document.getElementById("pauseBtn").textContent = state.paused ? (state.lang === "tr" ? "DEVAM" : "RESUME") : (state.lang === "tr" ? "DURAKLAT" : "PAUSE");
    }
  });
  window.addEventListener("keyup", e => {
    if (e.key === "ArrowLeft") keys.ArrowLeft = false;
    if (e.key === "ArrowRight") keys.ArrowRight = false;
  });

  canvas.addEventListener("pointermove", e => {
    const rect = canvas.getBoundingClientRect();
    pointerX = ((e.clientX - rect.left) / rect.width) * canvas.width;
  });
}

function init() {
  setScreen("loadingScreen");
  document.getElementById("soundToggle").checked = true;
  document.getElementById("difficultySelect").value = state.difficulty;
  document.getElementById("targetSelect").value = String(state.target);
  state.sound = localStorage.getItem("soundEnabled") !== "false";
  document.getElementById("soundToggle").checked = state.sound;

  applyLanguage(state.lang);
  setTheme(state.theme);
  handleBindings();

  setTimeout(() => {
    setScreen("menuScreen");
  }, 1600);
}

init();
requestAnimationFrame(loop);
