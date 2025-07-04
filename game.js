const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ASSET_PATH = "assets/";

// Game objects
const player = { x: 180, y: 500, width: 40, height: 40, speed: 5, lives: 3 };
const bullets = [];
const enemyBullets = [];
const enemies = [];
const explosions = [];
let score = 0;
let gameOver = false;
let bgY = 0;
let canShoot = true;
const shootCooldownTime = 500; // milliseconds


// Load images
const images = {};
function loadImage(name, src) {
  return new Promise((res) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      images[name] = img;
      res();
    };
  });
}

// Load audio
const sounds = {};
function loadSound(name, src) {
  return new Promise((res) => {
    const audio = new Audio(src);
    audio.oncanplaythrough = () => {
      sounds[name] = audio;
      res();
    };
  });
}

// Load all assets
async function loadAssets() {
  await Promise.all([
    loadImage("player", ASSET_PATH + "playerShip1_blue.png"),
    loadImage("enemy", ASSET_PATH + "enemyBlack1.png"),
    loadImage("bulletPlayer", ASSET_PATH + "laserBlue01.png"),
    loadImage("bulletEnemy", ASSET_PATH + "laserRed01.png"),
    loadImage("explosion", ASSET_PATH + "explosion1.png"),
    loadSound("shoot", ASSET_PATH + "shoot.wav"),
    loadSound("enemyShoot", ASSET_PATH + "enemy_shoot.wav"),
    loadSound("explosionSound", ASSET_PATH + "explosion.wav"),
    loadSound("bgMusic", ASSET_PATH + "intense_music.mp3")
  ]);
  sounds.bgMusic.loop = true;
  sounds.bgMusic.volume = 0.4;
  sounds.bgMusic.play();
}

// Shoot functions
function shootPlayer() {
  if (!canShoot) return; // prevent shooting if cooling down

  bullets.push({ x: player.x + player.width / 2 - 5, y: player.y, width: 5, height: 20, speed: 7 });
  sounds.shoot.currentTime = 0;
  sounds.shoot.play();

  canShoot = false;
  setTimeout(() => {
    canShoot = true;
  }, shootCooldownTime);
}


function shootEnemy(enemy) {
  enemyBullets.push({ x: enemy.x + enemy.width / 2 - 5, y: enemy.y + enemy.height, width: 5, height: 20, speed: 5 });
  sounds.enemyShoot.currentTime = 0;
  sounds.enemyShoot.play();
}

// Spawn enemy
function spawnEnemy() {
  const size = 40;
  const x = Math.random() * (canvas.width - size);
  enemies.push({ x, y: 0, width: size, height: size, speed: 2, shootCooldown: 0 });
}

// Collision detection
function isColliding(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

// Update & render game
function update() {
  if (gameOver) return;

  // Scroll background
  bgY += 2;
  if (bgY >= canvas.height) bgY = 0;
  ctx.fillStyle = "#222";
  ctx.fillRect(0, bgY - canvas.height, canvas.width, canvas.height);
  ctx.fillRect(0, bgY, canvas.width, canvas.height);

  // Player movement
  if (keys["ArrowLeft"] && player.x > 0) player.x -= player.speed;
  if (keys["ArrowRight"] && player.x + player.width < canvas.width) player.x += player.speed;
  if (keys["ArrowUp"] && player.y > 0) player.y -= player.speed;
  if (keys["ArrowDown"] && player.y + player.height < canvas.height) player.y += player.speed;

  // Draw player
  ctx.drawImage(images.player, player.x, player.y, player.width, player.height);

  // Player bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].y -= bullets[i].speed;
    ctx.drawImage(images.bulletPlayer, bullets[i].x, bullets[i].y, bullets[i].width, bullets[i].height);

    // Remove off screen
    if (bullets[i].y + bullets[i].height < 0) bullets.splice(i, 1);
  }

  // Enemy movement & shooting
  for (let i = enemies.length - 1; i >= 0; i--) {
    enemies[i].y += enemies[i].speed;
    ctx.drawImage(images.enemy, enemies[i].x, enemies[i].y, enemies[i].width, enemies[i].height);

    // Enemy shooting cooldown
    enemies[i].shootCooldown--;
    if (enemies[i].shootCooldown <= 0) {
      if (Math.random() < 0.01) {
        shootEnemy(enemies[i]);
        enemies[i].shootCooldown = 60; // ~1 sec cooldown
      }
    }

    // Check collision with player
    if (isColliding(player, enemies[i])) {
      explosions.push({ x: player.x, y: player.y, time: 20 });
      player.lives--;
      enemies.splice(i, 1);
      sounds.explosionSound.currentTime = 0;
      sounds.explosionSound.play();
      if (player.lives <= 0) endGame();
      continue;
    }

    // Remove enemies off screen
    if (enemies[i].y > canvas.height) enemies.splice(i, 1);
  }

  // Enemy bullets
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    enemyBullets[i].y += enemyBullets[i].speed;
    ctx.drawImage(images.bulletEnemy, enemyBullets[i].x, enemyBullets[i].y, enemyBullets[i].width, enemyBullets[i].height);

    // Check collision with player
    if (isColliding(player, enemyBullets[i])) {
      explosions.push({ x: player.x, y: player.y, time: 20 });
      player.lives--;
      enemyBullets.splice(i, 1);
      sounds.explosionSound.currentTime = 0;
      sounds.explosionSound.play();
      if (player.lives <= 0) endGame();
      continue;
    }

    // Remove off screen
    if (enemyBullets[i].y > canvas.height) enemyBullets.splice(i, 1);
  }

  // Bullet hits enemy
  for (let i = bullets.length - 1; i >= 0; i--) {
    for (let j = enemies.length - 1; j >= 0; j--) {
      if (isColliding(bullets[i], enemies[j])) {
        explosions.push({ x: enemies[j].x, y: enemies[j].y, time: 20 });
        bullets.splice(i, 1);
        enemies.splice(j, 1);
        score++;
        sounds.explosionSound.currentTime = 0;
        sounds.explosionSound.play();
        break;
      }
    }
  }

  // Draw explosions
  for (let i = explosions.length - 1; i >= 0; i--) {
    const exp = explosions[i];
    ctx.drawImage(images.explosion, exp.x, exp.y, 40, 40);
    exp.time--;
    if (exp.time <= 0) explosions.splice(i, 1);
  }

  // Draw HUD: score and lives
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(`Score: ${score}`, 10, 30);
  ctx.fillText(`Lives: ${player.lives}`, 320, 30);

  drawLeaderboard();
  requestAnimationFrame(update);
}

function endGame() {
  gameOver = true;
  sounds.bgMusic.pause();

  saveScore(score);

  alert(`Game Over! Final Score: ${score}`);
  document.location.reload();
}


// Input handling
const keys = {};
document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  if (e.key === " ") shootPlayer();
});
document.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

// Spawn enemies every 1.5 seconds
setInterval(spawnEnemy, 1500);

// Load assets and start game
loadAssets().then(() => {
  update();
});


async function saveScore(name, score) {
  await fetch("/api/leaderboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, score })
  });
}



async function drawLeaderboard() {
  const res = await fetch("/api/leaderboard");
  const leaderboard = await res.json();

  ctx.fillStyle = "white";
  ctx.font = "16px Arial";
  ctx.fillText("Leaderboard:", 10, 60);

  leaderboard.forEach((entry, index) => {
    ctx.fillText(`${index + 1}. ${entry.name}: ${entry.score}`, 10, 80 + index * 20);
  });
}

