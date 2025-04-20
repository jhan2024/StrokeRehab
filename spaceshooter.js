/*
   Space Shooter Game for Hand Rehabilitation
   Designed for rehabilitation devices with force input sensors
   
   Features:
   - Vertical ship control using force input
   - Automatic shooting
   - Enemy waves with increasing difficulty
   - Health and score tracking
   - Adjustable sensitivity
*/

// Game configuration
const gameConfig = {
    // Game mechanics
    gameSpeed: 60,               // frames per second
    shipSpeed: 5,                // base movement speed multiplier
    bulletSpeed: 8,              // bullet movement speed
    enemySpeed: 2,               // base enemy movement speed
    enemySpawnRate: 1500,        // time between enemy spawns in ms
    enemySpawnRateReduction: 5,  // ms reduction per score increase
    minEnemySpawnRate: 500,      // minimum time between enemy spawns
    fireRate: 300,               // time between shots in ms
    
    // Force control
    forceSensitivity: 5,         // multiplier for force input
    forceThreshold: 0.05,        // minimum force to register movement
    invertControl: false,        // if true, higher force = move down
    
    // Game difficulty
    difficultyIncrease: 0.1,     // speed increase per 10 score points
    
    // Visual settings
    shipSize: 40,                // ship width/height
    bulletSize: 5,               // bullet radius
    enemySize: 30,               // enemy width/height
    explosionDuration: 500,      // explosion animation duration in ms
    
    // UI settings
    healthBarMax: 100,           // maximum health
    scorePerKill: 10,            // score awarded per enemy destroyed
};

// Game state variables
let canvas, ctx;
let gameState = {
    isRunning: false,
    isPaused: false,
    score: 0,
    health: gameConfig.healthBarMax,
    lastFrameTime: 0,
    lastFireTime: 0,
    lastEnemySpawnTime: 0,
    currentEnemySpawnRate: gameConfig.enemySpawnRate,
    entities: {
        ship: null,
        bullets: [],
        enemies: [],
        explosions: []
    },
    keys: {
        space: false
    }
};

// Game initialization
function initGame() {
    canvas = document.getElementById('spaceShooterCanvas');
    ctx = canvas.getContext('2d');
    
    // Create player ship
    gameState.entities.ship = {
        x: 100,
        y: canvas.height / 2,
        width: gameConfig.shipSize,
        height: gameConfig.shipSize,
        color: '#3498db'
    };
    
    // Clear any existing entities
    gameState.entities.bullets = [];
    gameState.entities.enemies = [];
    gameState.entities.explosions = [];
    
    // Reset game state
    gameState.score = 0;
    gameState.health = gameConfig.healthBarMax;
    gameState.lastFrameTime = 0;
    gameState.lastFireTime = 0;
    gameState.lastEnemySpawnTime = 0;
    gameState.currentEnemySpawnRate = gameConfig.enemySpawnRate;
    
    // Reset UI
    updateScoreDisplay();
    updateHealthBar();
    
    // Set up input listeners
    setupInputListeners();
    
    // Start game on space bar
    document.getElementById('controls-help').style.display = 'block';
}

// Set up keyboard and force input listeners
function setupInputListeners() {
    // Keyboard controls (mainly for starting game)
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            gameState.keys.space = true;
            if (!gameState.isRunning) {
                startGame();
            }
        }
    });
    
    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            gameState.keys.space = false;
        }
    });
}

// Start the game loop
function startGame() {
    if (gameState.isRunning) return;
    
    gameState.isRunning = true;
    document.getElementById('controls-help').style.display = 'none';
    
    // Start the game loop
    requestAnimationFrame(gameLoop);
}

// Main game loop
function gameLoop(timestamp) {
    if (!gameState.isRunning) return;
    
    // Calculate delta time for frame rate independent movement
    const deltaTime = timestamp - (gameState.lastFrameTime || timestamp);
    gameState.lastFrameTime = timestamp;
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update game entities
    updateShip(deltaTime);
    updateBullets(deltaTime);
    updateEnemies(deltaTime);
    updateExplosions(deltaTime);
    
    // Check for collisions
    checkCollisions();
    
    // Auto-fire bullets
    if (timestamp - gameState.lastFireTime > gameConfig.fireRate) {
        fireBullet();
        gameState.lastFireTime = timestamp;
    }
    
    // Spawn enemies
    if (timestamp - gameState.lastEnemySpawnTime > gameState.currentEnemySpawnRate) {
        spawnEnemy();
        gameState.lastEnemySpawnTime = timestamp;
    }
    
    // Render everything
    renderGame();
    
    // Continue the game loop
    requestAnimationFrame(gameLoop);
}

// Update player ship position based on force input
function updateShip(deltaTime) {
    // Get force input from global variable (set by the main app)
    const forceInput = window.latestNormalizedForce || 0;
    
    // Only move if force is above threshold
    if (forceInput > gameConfig.forceThreshold) {
        // Apply force to move the ship
        let moveAmount = forceInput * gameConfig.shipSpeed * gameConfig.forceSensitivity * (deltaTime / 16.67);
        
        // Invert control if configured
        if (gameConfig.invertControl) {
            moveAmount = -moveAmount;
        }
        
        // Update ship position
        gameState.entities.ship.y -= moveAmount;
        
        // Keep ship within canvas bounds
        const ship = gameState.entities.ship;
        ship.y = Math.max(ship.height / 2, Math.min(canvas.height - ship.height / 2, ship.y));
    }
}

// Update all bullets
function updateBullets(deltaTime) {
    for (let i = gameState.entities.bullets.length - 1; i >= 0; i--) {
        const bullet = gameState.entities.bullets[i];
        
        // Move bullet
        bullet.x += bullet.speed * (deltaTime / 16.67);
        
        // Remove bullets that are off-screen
        if (bullet.x > canvas.width + bullet.radius) {
            gameState.entities.bullets.splice(i, 1);
        }
    }
}

// Update all enemies
function updateEnemies(deltaTime) {
    for (let i = gameState.entities.enemies.length - 1; i >= 0; i--) {
        const enemy = gameState.entities.enemies[i];
        
        // Move enemy
        enemy.x -= enemy.speed * (deltaTime / 16.67);
        
        // Remove enemies that are off-screen
        if (enemy.x < -enemy.width) {
            // Player takes damage when an enemy passes
            gameState.health -= 10;
            updateHealthBar();
            
            // Check if player is dead
            if (gameState.health <= 0) {
                gameOver();
                return;
            }
            
            // Remove the enemy
            gameState.entities.enemies.splice(i, 1);
        }
    }
}

// Update explosions
function updateExplosions(deltaTime) {
    for (let i = gameState.entities.explosions.length - 1; i >= 0; i--) {
        const explosion = gameState.entities.explosions[i];
        
        // Update explosion lifetime
        explosion.lifetime -= deltaTime;
        
        // Remove expired explosions
        if (explosion.lifetime <= 0) {
            gameState.entities.explosions.splice(i, 1);
        }
    }
}

// Check for collisions between bullets and enemies
function checkCollisions() {
    for (let i = gameState.entities.bullets.length - 1; i >= 0; i--) {
        const bullet = gameState.entities.bullets[i];
        
        for (let j = gameState.entities.enemies.length - 1; j >= 0; j--) {
            const enemy = gameState.entities.enemies[j];
            
            // Simple collision detection
            if (bullet.x + bullet.radius > enemy.x - enemy.width / 2 &&
                bullet.x - bullet.radius < enemy.x + enemy.width / 2 &&
                bullet.y + bullet.radius > enemy.y - enemy.height / 2 &&
                bullet.y - bullet.radius < enemy.y + enemy.height / 2) {
                
                // Create explosion
                createExplosion(enemy.x, enemy.y);
                
                // Remove bullet and enemy
                gameState.entities.bullets.splice(i, 1);
                gameState.entities.enemies.splice(j, 1);
                
                // Increase score
                gameState.score += gameConfig.scorePerKill;
                updateScoreDisplay();
                
                // Increase difficulty every 10 kills
                if (gameState.score % 100 === 0) {
                    increaseDifficulty();
                }
                
                // Break the inner loop since bullet is gone
                break;
            }
        }
    }
    
    // Check for collisions between ship and enemies
    const ship = gameState.entities.ship;
    for (let i = gameState.entities.enemies.length - 1; i >= 0; i--) {
        const enemy = gameState.entities.enemies[i];
        
        // Simple collision detection
        if (ship.x + ship.width / 2 > enemy.x - enemy.width / 2 &&
            ship.x - ship.width / 2 < enemy.x + enemy.width / 2 &&
            ship.y + ship.height / 2 > enemy.y - enemy.height / 2 &&
            ship.y - ship.height / 2 < enemy.y + enemy.height / 2) {
            
            // Create explosion
            createExplosion(enemy.x, enemy.y);
            
            // Remove enemy
            gameState.entities.enemies.splice(i, 1);
            
            // Reduce health
            gameState.health -= 20;
            updateHealthBar();
            
            // Check if player is dead
            if (gameState.health <= 0) {
                createExplosion(ship.x, ship.y);
                gameOver();
                return;
            }
        }
    }
}

// Fire a bullet from the player's ship
function fireBullet() {
    const ship = gameState.entities.ship;
    
    gameState.entities.bullets.push({
        x: ship.x + ship.width / 2,
        y: ship.y,
        radius: gameConfig.bulletSize,
        speed: gameConfig.bulletSpeed,
        color: '#f39c12'
    });
}

// Spawn a new enemy
function spawnEnemy() {
    const yPosition = Math.random() * (canvas.height - gameConfig.enemySize);
    
    gameState.entities.enemies.push({
        x: canvas.width + gameConfig.enemySize,
        y: yPosition + gameConfig.enemySize / 2,
        width: gameConfig.enemySize,
        height: gameConfig.enemySize,
        speed: gameConfig.enemySpeed * (1 + Math.random() * 0.5), // Random speed variation
        color: '#e74c3c'
    });
    
    // Make enemies spawn faster as game progresses
    gameState.currentEnemySpawnRate = Math.max(
        gameConfig.minEnemySpawnRate,
        gameState.currentEnemySpawnRate - gameConfig.enemySpawnRateReduction
    );
}

// Create an explosion effect
function createExplosion(x, y) {
    gameState.entities.explosions.push({
        x: x,
        y: y,
        radius: gameConfig.enemySize,
        lifetime: gameConfig.explosionDuration,
        color: '#f39c12'
    });
}

// Increase difficulty
function increaseDifficulty() {
    gameConfig.enemySpeed += gameConfig.difficultyIncrease;
    gameConfig.bulletSpeed += gameConfig.difficultyIncrease;
}

// Game over
function gameOver() {
    gameState.isRunning = false;
    
    // Show game over message
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);
    
    ctx.font = '24px Arial';
    ctx.fillText(`Final Score: ${gameState.score}`, canvas.width / 2, canvas.height / 2);
    ctx.fillText('Press SPACE to Restart', canvas.width / 2, canvas.height / 2 + 50);
    
    // Show controls help
    document.getElementById('controls-help').style.display = 'block';
}

// Render the game
function renderGame() {
    // Draw background (stars)
    renderBackground();
    
    // Draw ship
    renderShip();
    
    // Draw bullets
    renderBullets();
    
    // Draw enemies
    renderEnemies();
    
    // Draw explosions
    renderExplosions();
}

// Render background with stars
function renderBackground() {
    // Draw a few random stars each frame for twinkling effect
    ctx.fillStyle = 'white';
    for (let i = 0; i < 5; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 2 + 1;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Render player ship
function renderShip() {
    const ship = gameState.entities.ship;
    
    // Draw ship body
    ctx.fillStyle = ship.color;
    ctx.beginPath();
    ctx.moveTo(ship.x + ship.width / 2, ship.y);
    ctx.lineTo(ship.x - ship.width / 2, ship.y - ship.height / 3);
    ctx.lineTo(ship.x - ship.width / 2, ship.y + ship.height / 3);
    ctx.closePath();
    ctx.fill();
    
    // Draw engine glow
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.moveTo(ship.x - ship.width / 2, ship.y);
    ctx.lineTo(ship.x - ship.width / 2 - 10, ship.y - ship.height / 6);
    ctx.lineTo(ship.x - ship.width / 2 - 10, ship.y + ship.height / 6);
    ctx.closePath();
    ctx.fill();
}

// Render bullets
function renderBullets() {
    ctx.fillStyle = '#f39c12';
    
    for (const bullet of gameState.entities.bullets) {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Render enemies
function renderEnemies() {
    for (const enemy of gameState.entities.enemies) {
        // Draw enemy body
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.moveTo(enemy.x - enemy.width / 2, enemy.y);
        ctx.lineTo(enemy.x + enemy.width / 2, enemy.y - enemy.height / 3);
        ctx.lineTo(enemy.x + enemy.width / 2, enemy.y + enemy.height / 3);
        ctx.closePath();
        ctx.fill();
    }
}

// Render explosions
function renderExplosions() {
    for (const explosion of gameState.entities.explosions) {
        const opacity = explosion.lifetime / gameConfig.explosionDuration;
        const radius = explosion.radius * (2 - opacity);
        
        // Draw explosion
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 165, 0, ${opacity})`;
        ctx.fill();
    }
}

// Update score display
function updateScoreDisplay() {
    document.getElementById('current-score').textContent = gameState.score;
}

// Update health bar
function updateHealthBar() {
    const healthPercent = (gameState.health / gameConfig.healthBarMax) * 100;
    document.querySelector('.health-fill').style.width = `${healthPercent}%`;
}

// Export function to start Space Shooter
window.startSpaceShooter = function() {
    initGame();
}; 