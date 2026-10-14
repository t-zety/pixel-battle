const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;

let player, enemies, bullets, score, running;
let keys = {};
let lastTime = 0;
let spawnTimer = 0;

function resetGame() {
  player = {
    x: 50, y: 190,
    w: 20, h: 30,
    vx: 0, vy: 0,
    hp: 100, face: 1,
    grounded: true,
    attack: 0,
    shoot: 0,
    invincible: 0
  };

  enemies = [];
  bullets = [];
  score = 0;
  spawnTimer = 0;

  for (let i = 0; i < 3; i++) {
    spawnEnemy(250 + i * 100);
  }

  updateHUD();
}

function startGame() {
  resetGame();
  running = true;
  document.getElementById("startScreen").style.display = "none";
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function spawnEnemy(x = W + 30) {
  enemies.push({
    x, y: 202, w: 20, h: 18,
    hp: 2, alive: true
  });
}

function updateHUD() {
  document.getElementById("hp").textContent =
    Math.max(0, player.hp);

  document.getElementById("score").textContent = score;
}

function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function drawBackground() {
  ctx.fillStyle = "#22203f";
  ctx.fillRect(0, 0, W, H);

  // Pixel stars
  for (let i = 0; i < 30; i++) {
    rect((i * 71) % W, (i * 37) % 150, 2, 2, "#65f5e3");
  }

  // Moon
  rect(390, 30, 28, 28, "#ffd166");
  rect(400, 24, 28, 28, "#22203f");

  // Mountains
  for (let i = 0; i < 7; i++) {
    const x = i * 85;
    ctx.fillStyle = "#393052";
    ctx.beginPath();
    ctx.moveTo(x, 220);
    ctx.lineTo(x + 40, 130);
    ctx.lineTo(x + 85, 220);
    ctx.fill();
  }

  // Ground
  rect(0, 220, W, 50, "#343047");
  rect(0, 220, W, 4, "#65f5e3");

  for (let x = 0; x < W; x += 24) {
    rect(x, 235, 4, 3, "#5b526e");
  }
}

function drawPlayer() {
  const p = player;
  const x = p.x;
  const y = p.y;

  // Boots
  rect(x + 2, y + 25, 7, 5, "#ffd166");
  rect(x + 12, y + 25, 7, 5, "#ffd166");

  // Body
  rect(x + 3, y + 12, 14, 14, "#65f5e3");

  // Head and hair
  rect(x + 4, y + 2, 13, 12, "#f2b38f");
  rect(x + 3, y, 15, 5, "#a04478");

  // Eye changes direction
  rect(x + (p.face === 1 ? 13 : 5), y + 7, 3, 3, "#17152b");

  // Scarf
  rect(x - p.face * 6 + 7, y + 14, 7, 3, "#ff6f91");

  // Sword swing
  if (p.attack > 0) {
    const sx = p.face === 1 ? x + 19 : x - 12;
    rect(sx, y + 10, 13, 4, "#fff3d6");
    rect(sx + 4, y + 6, 4, 12, "#ffd166");
  }

  // Hit flash
  if (p.invincible > 0 && Math.floor(p.invincible * 20) % 2) {
    rect(x, y, p.w, p.h, "#ffffff");
  }
}

function drawEnemy(e) {
  if (!e.alive) return;

  rect(e.x + 2, e.y + 5, 16, 13, "#8be06d");
  rect(e.x, e.y + 10, 20, 8, "#4aa879");
  rect(e.x + 4, e.y + 7, 3, 3, "#17152b");
  rect(e.x + 13, e.y + 7, 3, 3, "#17152b");

  if (e.hp < 2) {
    rect(e.x, e.y - 5, 20, 3, "#ff6f91");
  }
}

function hit(a, b) {
  return a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y;
}

function update(dt) {
  const p = player;

  p.vx = 0;

  if (keys.left) {
    p.vx = -130;
    p.face = -1;
  }

  if (keys.right) {
    p.vx = 130;
    p.face = 1;
  }

  p.x += p.vx * dt;
  p.x = Math.max(0, Math.min(W - p.w, p.x));

  if (keys.jump && p.grounded) {
    p.vy = -250;
    p.grounded = false;
  }
  keys.jump = false;

  p.vy += 650 * dt;
  p.y += p.vy * dt;

  if (p.y + p.h >= 220) {
    p.y = 220 - p.h;
    p.vy = 0;
    p.grounded = true;
  }

  p.attack = Math.max(0, p.attack - dt);
  p.shoot = Math.max(0, p.shoot - dt);
  p.invincible = Math.max(0, p.invincible - dt);

  if (keys.fight && p.attack <= 0) {
    p.attack = 0.2;

    const sword = {
      x: p.face === 1 ? p.x + p.w : p.x - 16,
      y: p.y + 5,
      w: 16, h: 24
    };

    enemies.forEach(e => {
      if (e.alive && hit(sword, e)) {
        e.hp--;
        if (e.hp <= 0) {
          e.alive = false;
          score += 100;
        }
      }
    });
  }

  if (keys.shoot && p.shoot <= 0) {
    bullets.push({
      x: p.x + (p.face === 1 ? p.w : -5),
      y: p.y + 14,
      vx: p.face * 300,
      life: 1.5
    });
    p.shoot = 0.3;
  }

  bullets.forEach(b => {
    b.x += b.vx * dt;
    b.life -= dt;

    enemies.forEach(e => {
      if (e.alive && hit(
        { x: b.x, y: b.y, w: 8, h: 4 }, e
      )) {
        e.hp--;
        b.life = 0;
        if (e.hp <= 0) {
          e.alive = false;
          score += 100;
        }
      }
    });
  });

  bullets = bullets.filter(b => b.life > 0 &&
    b.x > -20 && b.x < W + 20);

  enemies.forEach(e => {
    if (!e.alive) return;

    if (Math.abs(p.x - e.x) < 180) {
      e.x += Math.sign(p.x - e.x) * 35 * dt;
    }

    if (hit(p, e) && p.invincible <= 0) {
      p.hp -= 10;
      p.invincible = 0.8;
      p.vy = -100;
    }
  });

  spawnTimer -= dt;
  if (spawnTimer <= 0 && enemies.filter(e => e.alive).length < 4) {
    spawnEnemy(W + 10);
    spawnTimer = 2;
  }

  enemies = enemies.filter(e => e.alive || e.x > -30);
  updateHUD();

  if (p.hp <= 0) {
    running = false;
    document.getElementById("startScreen").style.display = "block";
    document.querySelector("#startScreen h2").textContent = "GAME OVER";
  }
}

function draw() {
  drawBackground();
  bullets.forEach(b => rect(b.x, b.y, 8, 4, "#ffd166"));
  enemies.forEach(drawEnemy);
  drawPlayer();
}

function loop(now) {
  if (!running) return;

  const dt = Math.min((now - lastTime) / 1000, 0.03);
  lastTime = now;

  update(dt);
  draw();

  if (running) requestAnimationFrame(loop);
}

function bindHold(id, key) {
  const button = document.getElementById(id);

  button.addEventListener("pointerdown", e => {
    e.preventDefault();
    keys[key] = true;
    button.setPointerCapture(e.pointerId);
  });

  const release = e => {
    e.preventDefault();
    keys[key] = false;
  };

  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
}

bindHold("left", "left");
bindHold("right", "right");
bindHold("fight", "fight");
bindHold("shoot", "shoot");

document.getElementById("jump").addEventListener("pointerdown", e => {
  e.preventDefault();
  keys.jump = true;
});

window.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft" || e.key === "a") keys.left = true;
  if (e.key === "ArrowRight" || e.key === "d") keys.right = true;
  if (e.key === "ArrowUp" || e.key === " ") keys.jump = true;
  if (e.key === "z") keys.fight = true;
  if (e.key === "x") keys.shoot = true;
});

window.addEventListener("keyup", e => {
  if (e.key === "ArrowLeft" || e.key === "a") keys.left = false;
  if (e.key === "ArrowRight" || e.key === "d") keys.right = false;
  if (e.key === "z") keys.fight = false;
  if (e.key === "x") keys.shoot = false;
});

resetGame();
draw();