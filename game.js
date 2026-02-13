const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const startScreen = document.getElementById("start-screen");
const endScreen = document.getElementById("end-screen");
const startButton = document.getElementById("start-button");
const yesButton = document.getElementById("yes-button");
const noButton = document.getElementById("no-button");
const finalScoreEl = document.getElementById("final-score");
const endMessage = document.getElementById("end-message");

// End-screen minimize (inside panel) and a global restore button
const endMinimizeBtn = document.getElementById("end-minimize-btn");
const restoreBtn = document.getElementById("restore-btn");
let paused = false;

const WORLD = {
  width: canvas.width,
  height: canvas.height,
  tile: 24,
};

const palette = {
  grass: "#94c89c",
  grassDark: "#7bbf9e",
  path: "#e4b88e",
  water: "#8ab7d4",
  wood: "#c98f6b",
  shadow: "rgba(74, 43, 43, 0.2)",
  heart: "#f07a8c",
  heartLight: "#ffd4dd",
  player: "#805a6f",
  shirt: "#f2b3c9",
};

let gameState = "start";
let timer = 75;
let score = 0;
let heartsCollected = 0;
const heartsNeeded = 12;

const keys = new Set();

const player = {
  x: WORLD.width / 2,
  y: WORLD.height / 2,
  size: 18,
  speed: 2.1,
  bob: 0,
  direction: "down",
  moving: false,
};

const hearts = [];
const particles = [];
const floatingHearts = [];

const playerSprite = new Image();
playerSprite.src = "assets/pixelarkadon.png";
playerSprite.onload = () => {
  playerSprite.loaded = true;
};

// Pixel art scale for the player sprite. Adjust this if the character is
// too large or too small on the canvas.
const playerSpriteScale = 0.09; // try 0.09 or 0.08 depending on desired size

// ambient/night particles removed for cozy daylight

function resetGame() {
  timer = 75;
  score = 0;
  heartsCollected = 0;
  player.x = WORLD.width / 2;
  player.y = WORLD.height / 2;
  hearts.length = 0;
  particles.length = 0;
  floatingHearts.length = 0;
  spawnHearts();
}

function spawnHearts() {
  for (let i = 0; i < heartsNeeded; i += 1) {
    hearts.push({
      x: 80 + Math.random() * (WORLD.width - 160),
      y: 90 + Math.random() * (WORLD.height - 160),
      pulse: Math.random() * Math.PI * 2,
      collected: false,
    });
  }
}

function handleInput() {
  let dx = 0;
  let dy = 0;
  if (keys.has("ArrowUp") || keys.has("w")) dy -= 1;
  if (keys.has("ArrowDown") || keys.has("s")) dy += 1;
  if (keys.has("ArrowLeft") || keys.has("a")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("d")) dx += 1;

  if (dx !== 0 && dy !== 0) {
    dx *= 0.7071;
    dy *= 0.7071;
  }

  player.moving = dx !== 0 || dy !== 0;
  if (player.moving) {
    if (Math.abs(dx) > Math.abs(dy)) {
      player.direction = dx > 0 ? "right" : "left";
    } else {
      player.direction = dy > 0 ? "down" : "up";
    }
  }

  player.x += dx * player.speed;
  player.y += dy * player.speed;
  player.x = Math.max(20, Math.min(WORLD.width - 20, player.x));
  player.y = Math.max(30, Math.min(WORLD.height - 30, player.y));
}

function updateHearts(delta) {
  hearts.forEach((heart) => {
    if (heart.collected) return;
    const dist = Math.hypot(player.x - heart.x, player.y - heart.y);
    if (dist < 18) {
      heart.collected = true;
      heartsCollected += 1;
      score += 10;
      spawnBurst(heart.x, heart.y);
    } else {
      heart.pulse += delta * 0.005;
    }
  });
}

function spawnBurst(x, y) {
  for (let i = 0; i < 16; i += 1) {
    const angle = (Math.PI * 2 * i) / 16;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * (1.2 + Math.random() * 1.6),
      vy: Math.sin(angle) * (1.2 + Math.random() * 1.6),
      life: 1,
      size: 3 + Math.random() * 3,
    });
  }
}

function spawnFloatingHeart() {
  floatingHearts.push({
    x: Math.random() * WORLD.width,
    y: WORLD.height + 20,
    vy: -0.5 - Math.random() * 0.8,
    drift: (Math.random() - 0.5) * 0.4,
    alpha: 0.6 + Math.random() * 0.4,
    size: 6 + Math.random() * 6,
  });
}

function updateParticles(delta) {
  particles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.97;
    p.vy *= 0.97;
    p.life -= delta * 0.0012;
  });
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    if (particles[i].life <= 0) particles.splice(i, 1);
  }

  floatingHearts.forEach((h) => {
    h.x += h.drift;
    h.y += h.vy;
    h.alpha -= delta * 0.0002;
  });
  for (let i = floatingHearts.length - 1; i >= 0; i -= 1) {
    if (floatingHearts[i].alpha <= 0) floatingHearts.splice(i, 1);
  }
}

// updateAmbient removed (daylight; no ambient sparkles)

function update(delta) {
  if (paused) return;
  if (gameState !== "play") return;
  timer -= delta / 1000;
  handleInput();
  updateHearts(delta);
  updateParticles(delta);
  // ambient update removed for daylight

  if (Math.random() < 0.02) spawnFloatingHeart();

  if (timer <= 0 || heartsCollected >= heartsNeeded) {
    endGame();
  }
}

let bgCanvas = null;

function generateBackground() {
  const c = document.createElement("canvas");
  c.width = WORLD.width;
  c.height = WORLD.height;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;

  const TILE = 12; // chunky cozy pixel size

  // =========================
  // SKY (flat daylight color)
  // =========================
  g.fillStyle = "#bfe9ff";
  g.fillRect(0, 0, c.width, 200);

  // Pixel clouds
  g.fillStyle = "#ffffff";
  for (let i = 0; i < 6; i++) {
    const cx = 80 + i * 140;
    const cy = 60 + (i % 2) * 20;
    g.fillRect(cx, cy, TILE * 2, TILE);
    g.fillRect(cx + TILE, cy - TILE, TILE * 2, TILE);
    g.fillRect(cx + TILE * 2, cy, TILE * 2, TILE);
  }

  // =========================
  // GRASS BASE
  // =========================
  g.fillStyle = "#94c89c";
  g.fillRect(0, 200, c.width, c.height - 200);

  g.fillStyle = "#7bbf9e";
  for (let x = 0; x < c.width; x += TILE * 2) {
    if (Math.random() > 0.5) {
      g.fillRect(x, 220 + Math.random() * 200, TILE, TILE);
    }
  }

  // =========================
  // MAIN HORIZONTAL ROAD
  // =========================
  g.fillStyle = "#d6b48f";
  g.fillRect(0, 260, c.width, TILE * 3);

  g.fillStyle = "#f3e3c3";
  for (let x = 0; x < c.width; x += TILE * 4) {
    g.fillRect(x + TILE, 272, TILE * 2, TILE / 2);
  }

  // =========================
  // VERTICAL CONNECTING ROADS
  // =========================
  g.fillStyle = "#d6b48f";
  g.fillRect(160, 200, TILE * 3, 120);
  g.fillRect(380, 200, TILE * 3, 120);
  g.fillRect(600, 200, TILE * 3, 120);
  g.fillRect(820, 200, TILE * 3, 120);

  // =========================
  // STREET LAMPS
  // =========================
  function drawLamp(x, y) {
    g.fillStyle = "#5c3a21";
    g.fillRect(x, y - 40, 6, 40);

    g.fillStyle = "#ffd76b";
    g.fillRect(x - 6, y - 50, 18, 12);

    g.fillStyle = "#fff3b0";
    g.fillRect(x - 2, y - 46, 6, 6);
  }

  // extra lamps spaced along the road for a cozier feel
  const lampXs = [60, 140, 220, 300, 380, 460, 540, 620, 700, 780, 860, 940];
  lampXs.forEach((lx) => {
    // keep lamps within canvas width
    if (lx > 0 && lx < c.width - 8) drawLamp(lx, 260);
  });

  // flower pot helper (small chunky pixels)
  function drawFlowerPot(x, y) {
    // pot base
    g.fillStyle = "#8b4f30";
    g.fillRect(x - 6, y - 6, 12, 8);
    g.fillRect(x - 8, y + 2, 16, 4);

    // soil
    g.fillStyle = "#5a3f2a";
    g.fillRect(x - 4, y - 4, 8, 2);

    // flowers (three small chunky pixels)
    const colors = ["#ff6b8a", "#ffd76b", "#ffb3d1"];
    colors.forEach((col, i) => {
      g.fillStyle = col;
      g.fillRect(x - 4 + i * 4, y - 10, 4, 4);
    });
  }

  // =========================
  // LOAD STORE IMAGES
  // =========================
  const stores = [
    { src: "assets/store_1.png", x: 60, y: 120 },
    { src: "assets/store_2.png", x: 280, y: 120 },
    { src: "assets/store_3.png", x: 500, y: 120 },
    { src: "assets/store_4.png", x: 720, y: 120 }
  ];

  stores.forEach((store) => {
    const img = new Image();
    img.src = store.src;
    img.onload = () => {
      g.imageSmoothingEnabled = false;
      g.drawImage(img, store.x, store.y, 150, 150);
    };
  });

  // place flower pots near each store and along the walkway
  stores.forEach((s) => {
    drawFlowerPot(s.x - 18, s.y + 140);
    drawFlowerPot(s.x + 150 + 6, s.y + 140);
  });

  // additional pots along the main road
  for (let px = 100; px < c.width; px += 160) {
    drawFlowerPot(px, 250);
  }

  // =========================
  // GARDEN (expanded, lower area)
  // =========================
  const gardenX = 20;
  const gardenY = c.height - 160;
  const gardenW = c.width - 40; // wider garden across bottom
  const gardenH = 140;

  // garden ground (darker grass patch)
  g.fillStyle = "#66bf79";
  g.fillRect(gardenX, gardenY, gardenW, gardenH);

  // wider stone path into the garden (chunky stepping stones)
  g.fillStyle = "#d8bfa6";
  const pathX = gardenX + Math.floor(gardenW / 2) - TILE;
  g.fillRect(pathX, gardenY + 8, TILE * 2, gardenH - 16);
  for (let sy = gardenY + 12; sy < gardenY + gardenH - 20; sy += TILE * 1.8) {
    g.fillRect(pathX + 2, sy, TILE * 2 - 4, TILE - 2);
  }

  // garden beds (four larger beds)
  const bedCount = 4;
  const bedGap = 18;
  const bedW = Math.floor((gardenW - (bedGap * (bedCount + 1))) / bedCount);
  const bedH = 56;
  for (let b = 0; b < bedCount; b++) {
    const bx = gardenX + bedGap + b * (bedW + bedGap);
    const by = gardenY + 22;
    // soil bed
    g.fillStyle = "#4f2f1f";
    g.fillRect(bx, by, bedW, bedH);

    // rows of larger, vibrant plants (pixel blocks)
    const plantCols = Math.floor(bedW / (TILE / 1.2));
    const plantSize = Math.max(4, Math.round(TILE * 0.6));
    const flowerColors = ["#ff4d6d", "#ffd76b", "#7cff9e", "#ff8bd1"];
    for (let col = 0; col < plantCols; col++) {
      const pxOff = bx + 6 + col * (plantSize + 2);
      // three rows of plants for fullness
      for (let row = 0; row < 3; row++) {
        const pyOff = by + 6 + row * (plantSize + 6);
        const colIdx = (col + row) % flowerColors.length;
        g.fillStyle = flowerColors[colIdx];
        g.fillRect(pxOff, pyOff, plantSize, plantSize);
        // tiny darker center for contrast
        g.fillStyle = "#8b3a4a";
        g.fillRect(pxOff + Math.max(1, Math.floor(plantSize/3)), pyOff + Math.max(1, Math.floor(plantSize/3)), Math.max(1, Math.floor(plantSize/3)), Math.max(1, Math.floor(plantSize/3)));
      }
    }
  }

  // simple wooden fence around garden (posts + rails), slightly larger posts
  g.fillStyle = "#8b5a3c";
  for (let fx = gardenX - 8; fx <= gardenX + gardenW + 8; fx += 24) {
    g.fillRect(fx, gardenY - 8, 8, gardenH + 16);
  }
  // top rail
  g.fillRect(gardenX - 8, gardenY - 10, gardenW + 16, 8);
  // bottom rail
  g.fillRect(gardenX - 8, gardenY + gardenH + 4, gardenW + 16, 8);


  return c;
}

function drawBackground() {
  if (!bgCanvas) bgCanvas = generateBackground();
  ctx.drawImage(bgCanvas, 0, 0);
}

// drawAmbient removed (no floating sparkles during daylight)

function drawHearts() {
  hearts.forEach((heart) => {
    if (heart.collected) return;
    const pulse = Math.sin(heart.pulse) * 2;
    drawHeart(heart.x, heart.y + pulse, 20);
  });
}

function drawPlayer() {
  player.bob += player.moving ? 0.16 : 0.08;
  const bob = Math.sin(player.bob) * (player.moving ? 3 : 1.5);
  const sway = player.moving ? Math.sin(player.bob * 0.5) * 2 : 0;

  ctx.fillStyle = palette.shadow;
  ctx.fillRect(player.x - 12, player.y + 18, 24, 6);

  if (playerSprite.loaded) {
    const scale = playerSpriteScale;
    const spriteWidth = playerSprite.width * scale;
    const spriteHeight = playerSprite.height * scale;
    const drawX = player.x - spriteWidth / 2 + sway;
    const drawY = player.y - spriteHeight + 28 + bob;

    ctx.imageSmoothingEnabled = false;
    ctx.save();
    if (player.direction === "left") {
      ctx.translate(drawX + spriteWidth, drawY);
      ctx.scale(-1, 1);
      ctx.drawImage(playerSprite, 0, 0, spriteWidth, spriteHeight);
    } else {
      ctx.drawImage(playerSprite, drawX, drawY, spriteWidth, spriteHeight);
    }
    ctx.restore();

    if (player.direction === "up") {
      ctx.fillStyle = "rgba(90, 60, 70, 0.35)";
      ctx.fillRect(player.x - 10, player.y + 8 + bob, 20, 3);
    }
  } else {
    ctx.fillStyle = palette.player;
    ctx.fillRect(player.x - 6, player.y - 14 + bob, 12, 12);

    ctx.fillStyle = palette.shirt;
    ctx.fillRect(player.x - 7, player.y - 2 + bob, 14, 14);

    ctx.fillStyle = "#f8d2d2";
    ctx.fillRect(player.x - 3, player.y - 10 + bob, 2, 2);
    ctx.fillRect(player.x + 1, player.y - 10 + bob, 2, 2);
  }
}

function drawParticles() {
  particles.forEach((p) => {
    ctx.fillStyle = `rgba(240, 122, 140, ${p.life})`;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });

  floatingHearts.forEach((h) => {
    ctx.globalAlpha = h.alpha;
    drawHeart(h.x, h.y, h.size);
    ctx.globalAlpha = 1;
  });
}

function drawUI() {
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.fillRect(20, 20, 160, 50);
  ctx.fillStyle = "#6c4a3d";
  ctx.font = "16px Courier New";
  ctx.fillText(`Score: ${score}`, 30, 44);
  ctx.fillText(`Time: ${Math.max(0, Math.ceil(timer))}`, 30, 62);

  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.fillRect(WORLD.width - 170, 20, 140, 50);
  ctx.fillStyle = "#6c4a3d";
  ctx.fillText(`Hearts: ${heartsCollected}/${heartsNeeded}`, WORLD.width - 160, 50);
}

function drawHeart(x, y, size) {
  // Chunky pixel-heart built from a small pattern grid
  const s = Math.max(2, Math.round(size / 4)); // pixel block size
  const pattern = [
    [0,1,1,0,1,1,0],
    [1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1],
    [0,1,1,1,1,1,0],
    [0,0,1,1,1,0,0],
    [0,0,0,1,0,0,0],
  ];

  const w = pattern[0].length * s;
  const h = pattern.length * s;
  const startX = Math.round(x - w / 2);
  const startY = Math.round(y - h / 2);

  // main heart color
  ctx.fillStyle = palette.heart;
  for (let ry = 0; ry < pattern.length; ry++) {
    for (let rx = 0; rx < pattern[ry].length; rx++) {
      if (pattern[ry][rx]) {
        ctx.fillRect(startX + rx * s, startY + ry * s, s, s);
      }
    }
  }

  // small highlight on upper-left of heart
  ctx.fillStyle = palette.heartLight;
  // highlight coordinates chosen to look pixel-art natural
  const hl = [ [1,1], [2,1], [1,2] ];
  hl.forEach(([hx, hy]) => {
    ctx.fillRect(startX + hx * s, startY + hy * s, s, s);
  });
}

function draw(delta) {
  ctx.clearRect(0, 0, WORLD.width, WORLD.height);
  drawBackground();
  drawHearts();
  drawPlayer();
  drawParticles();
  drawUI();

  // ensure no shake transform (cozy, stable view)
  canvas.style.transform = "translate(0, 0)";
}

function endGame() {
  gameState = "end";
  finalScoreEl.textContent = score;
  endScreen.classList.add("visible");
  // Show minimize in panel when score screen appears
  if (endMinimizeBtn) endMinimizeBtn.classList.remove("hidden");
  if (restoreBtn) restoreBtn.classList.add("hidden");
} 

function startGame() {
  resetGame();
  gameState = "play";
  endScreen.classList.remove("visible");
}

let lastTime = 0;
function loop(timestamp) {
  const delta = timestamp - lastTime;
  lastTime = timestamp;
  update(delta);
  draw(delta);
  requestAnimationFrame(loop);
}

startButton.addEventListener("click", () => {
  startScreen.classList.remove("visible");
  startGame();
});

window.addEventListener("keydown", (event) => {
  keys.add(event.key);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key);
});

noButton.addEventListener("mouseenter", () => {
  const panel = endScreen.querySelector(".panel");
  const bounds = panel.getBoundingClientRect();
  const btnBounds = noButton.getBoundingClientRect();
  const maxX = bounds.width - btnBounds.width - 20;
  const maxY = bounds.height - btnBounds.height - 20;
  const randomX = 10 + Math.random() * maxX;
  const randomY = 10 + Math.random() * maxY;
  noButton.style.position = "absolute";
  noButton.style.left = `${randomX}px`;
  noButton.style.top = `${randomY}px`;
});

// End-panel Minimize handler
if (endMinimizeBtn) {
  endMinimizeBtn.addEventListener("click", () => {
    // Hide the score panel (minimized) and show restore button
    endScreen.classList.remove("visible");
    endMinimizeBtn.classList.add("hidden");
    if (restoreBtn) restoreBtn.classList.remove("hidden");
    paused = true;
  });
}

// Restore handler — restart the game from the beginning
if (restoreBtn) {
  restoreBtn.addEventListener("click", () => {
    // Hide end-screen and show start-screen so user can start anew
    if (endScreen) endScreen.classList.remove("visible");
    if (startScreen) startScreen.classList.add("visible");
    restoreBtn.classList.add("hidden");
    if (endMinimizeBtn) endMinimizeBtn.classList.add("hidden");
    paused = false;

    // Reset game state so user starts fresh
    resetGame();
    gameState = "start";
  });
}

let celebration = false;
let celebrationTimer = 0;

yesButton.addEventListener("click", () => {
  if (celebration) return;
  celebration = true;
  celebrationTimer = 0;
  endMessage.textContent = "Yay! 💖";
  for (let i = 0; i < 6; i += 1) {
    spawnBurst(
      WORLD.width / 2 + (Math.random() - 0.5) * 120,
      WORLD.height / 2 + (Math.random() - 0.5) * 120
    );
  }
  for (let i = 0; i < 50; i += 1) {
    spawnFloatingHeart();
  }

  // Auto-minimize the score panel and show the Restore button (game paused)
  if (endMinimizeBtn) endMinimizeBtn.classList.add("hidden");
  if (restoreBtn) restoreBtn.classList.remove("hidden");
  endScreen.classList.remove("visible");
  paused = true;
});

function updateCelebration(delta) {
  if (!celebration) return;
  celebrationTimer += delta;
  if (Math.random() < 0.12) spawnFloatingHeart();
  if (celebrationTimer > 6000) {
    celebration = false;
  }
}

function drawCelebration() {
  if (!celebration) return;
  floatingHearts.forEach((h) => {
    ctx.globalAlpha = Math.min(1, h.alpha + 0.4);
    drawHeart(h.x, h.y, h.size + 2);
    ctx.globalAlpha = 1;
  });
}

function updateEndScreen(delta) {
  if (paused) return;
  if (gameState !== "end") return;
  updateParticles(delta);
  updateCelebration(delta);
} 

function drawEndScreen() {
  if (gameState !== "end") return;
  drawParticles();
  drawCelebration();
}

const originalUpdate = update;
update = function updateWrapper(delta) {
  originalUpdate(delta);
  updateEndScreen(delta);
};

const originalDraw = draw;
draw = function drawWrapper(delta) {
  originalDraw(delta);
  drawEndScreen();
};

resetGame();
requestAnimationFrame(loop);
