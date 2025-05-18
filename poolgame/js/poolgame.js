(function() {
    /*
       Pool Game for Hand Rehabilitation
       Adapted from https://github.com/a-j-z/pool 
       
       A simple 8-ball pool game adapted for rehabilitation devices with force input sensors.
       
       Features:
       - Mouse/touch control for aiming direction
       - Force input sensor for shot power
       - Basic physics for ball collisions
       - Pocket detection
       - Shot counting
    */
    
    // Global game variables
    let poolCanvas, poolCtx;
    let gameState = {
        running: false,
        shots: 0,
        balls: [],
        holes: [],
        canShoot: true,
        aimDirection: { x: 1, y: 0 }, // Initial aim to the right
        shotPower: 0, // This will now be set by shootBall, less directly used
        maxShotPower: 20,
        aimAngle: 0, // ADDED aimAngle, radians, 0 = right
        cueBall: null,
        gameOver: false,
        remainingBalls: 0,
        currentForces: [0, 0, 0], // Stores [aimLeft, aimRight, currentStrikePotential]
        isChargingShot: false,    // ADDED: True if 3rd input is held for power
        shotChargePower: 0        // ADDED: Accumulated power for the shot
    };
    
    // Constants
    const FRICTION = 0.98;
    const BALL_RADIUS = 15;
    const MIN_SHOOT_POWER = 2; // Minimum force to register a shot
    const TABLE_COLOR = "rgb(25, 120, 60)";
    const CUE_COLOR = "rgb(255, 255, 255)";
    const AIM_ADJUST_THRESHOLD = 0.1; // Minimum force to register for aim adjustment
    const AIM_ADJUST_SPEED = 0.03; // Radians per update, scaled by force
    const CHARGE_THRESHOLD = 0.1; // ADDED: Min force on 3rd input to start/maintain charge
    
    // Initialize the game
    function initPoolGame() {
        console.log("Pool Game: Initializing...");
        poolCanvas = document.getElementById('poolCanvas');
        if (!poolCanvas) {
            console.error("Pool Canvas element not found!");
            return; 
        }
        poolCtx = poolCanvas.getContext('2d');
        console.log("Pool Game: Canvas Context:", poolCtx);
        
        resetGame();
        setupEventListeners();
        
        // Start the game loop
        if (!gameState.running) {
            console.log("Pool Game: Starting game loop...");
            gameState.running = true;
            requestAnimationFrame(gameLoop);
        } else {
            console.log("Pool Game: Game loop already running?");
        }
    }
    
    // Reset the game state
    function resetGame() {
        gameState.shots = 0;
        gameState.balls = [];
        gameState.holes = [];
        gameState.canShoot = true;
        gameState.gameOver = false;
        gameState.aimAngle = 0; // Reset aim angle (pointing right)
        gameState.aimDirection.x = Math.cos(gameState.aimAngle);
        gameState.aimDirection.y = Math.sin(gameState.aimAngle);

        if (!poolCanvas) return; // Ensure canvas exists
        
        // Create holes
        gameState.holes = [
            { x: 30, y: 30, radius: 20 },
            { x: poolCanvas.width - 30, y: 30, radius: 20 },
            { x: 30, y: poolCanvas.height - 30, radius: 20 },
            { x: poolCanvas.width - 30, y: poolCanvas.height - 30, radius: 20 },
            { x: poolCanvas.width / 2, y: 30, radius: 20 },
            { x: poolCanvas.width / 2, y: poolCanvas.height - 30, radius: 20 }
        ];
        
        // Create cue ball
        gameState.cueBall = {
            x: 200,
            y: poolCanvas.height / 2,
            velX: 0,
            velY: 0,
            radius: BALL_RADIUS,
            color: CUE_COLOR,
            isCue: true
        };
        gameState.balls.push(gameState.cueBall);
        
        // Create colored balls in a triangle formation
        const colors = [
            "rgb(255,225,30)", // Yellow
            "rgb(50,100,255)", // Blue
            "rgb(255,30,30)",  // Red
            "rgb(50,50,50)",   // Black
            "rgb(150,50,255)", // Purple
            "rgb(75,200,35)",  // Green
            "rgb(180,0,75)",   // Maroon
            "rgb(255,165,0)",  // Orange (NEW)
            "rgb(255,192,203)",// Pink (NEW)
            "rgb(0,255,255)"   // Cyan (NEW)
        ];
        let ballCount = 0;
        const startX = 600;
        const startY = poolCanvas.height / 2;
        const rowCount = 4;
        
        for (let row = 0; row < rowCount; row++) {
            for (let col = 0; col <= row; col++) {
                if (ballCount < colors.length) {
                    const x = startX + row * BALL_RADIUS * 2;
                    const y = startY - (row * BALL_RADIUS) + (col * BALL_RADIUS * 2);
                    
                    gameState.balls.push({
                        x,
                        y,
                        velX: 0,
                        velY: 0,
                        radius: BALL_RADIUS,
                        color: colors[ballCount],
                        isCue: false
                    });
                    
                    ballCount++;
                }
            }
        }
        
        gameState.remainingBalls = gameState.balls.length - 1; // Excluding cue ball
        
        // Update the shots display
        updateShotsDisplay();
    }
    
    // Set up event listeners
    function setupEventListeners() {
        if (!poolCanvas) return; // Ensure canvas exists

        // Mouse move for aiming - REMOVED
        // poolCanvas.addEventListener('mousemove', (e) => {
        //     const rect = poolCanvas.getBoundingClientRect();
        //     gameState.mousePos.x = e.clientX - rect.left;
        //     gameState.mousePos.y = e.clientY - rect.top;
            
        //     if (gameState.canShoot && !gameState.gameOver && gameState.cueBall) {
        //         // Calculate aim direction from cue ball to mouse
        //         gameState.aimDirection.x = gameState.mousePos.x - gameState.cueBall.x;
        //         gameState.aimDirection.y = gameState.mousePos.y - gameState.cueBall.y;
                
        //         // Normalize the direction
        //         const length = Math.sqrt(
        //             gameState.aimDirection.x * gameState.aimDirection.x + 
        //             gameState.aimDirection.y * gameState.aimDirection.y
        //         );
                
        //         if (length > 0) {
        //             gameState.aimDirection.x /= length;
        //             gameState.aimDirection.y /= length;
        //         }
        //     }
        // });
        
        // Mouse click for shooting - REMOVED (shooting now handled by force release)
        // poolCanvas.addEventListener('click', () => {
        //     if (gameState.canShoot && !gameState.gameOver && areAllBallsStopped()) {
        //         let power = gameState.currentForces[2] || 0;
        //         const threshold = MIN_SHOOT_POWER / gameState.maxShotPower;
        //         if (power >= threshold) {
        //             shootBall(power);
        //         } else {
        //             console.log(`Pool Game: Shot power ${power.toFixed(2)} below threshold ${threshold.toFixed(2)}. Click to shoot with default if testing.`);
        //         }
        //     }
        // });
    }
    
    // Shoot the cue ball
    function shootBall(normalizedForce) {
        if (!gameState.canShoot || !gameState.cueBall) return;
        
        // Calculate shot power based on force input (normalized 0-1)
        gameState.shotPower = normalizedForce * gameState.maxShotPower;
        
        // Set velocity based on direction and power
        gameState.cueBall.velX = gameState.aimDirection.x * gameState.shotPower;
        gameState.cueBall.velY = gameState.aimDirection.y * gameState.shotPower;
        
        // Increment shot counter
        gameState.shots++;
        updateShotsDisplay();
        
        // Prevent shooting while balls are in motion
        gameState.canShoot = false;
    }
    
    // Update the shots display
    function updateShotsDisplay() {
        const shotsElement = document.getElementById('shots-count');
        if (shotsElement) {
            shotsElement.textContent = gameState.shots;
        }
    }
    
    // Check if all balls have stopped moving
    function areAllBallsStopped() {
        return gameState.balls.every(ball => 
            Math.abs(ball.velX) < 0.01 && Math.abs(ball.velY) < 0.01
        );
    }
    
    // Main game loop
    function gameLoop() {
        console.log("Pool Game: gameLoop tick");
        if (!gameState.running) {
            console.log("Pool Game: gameLoop stopping, gameState.running is false.");
            return;
        }
        
        // Update aim from forces if applicable
        if (gameState.canShoot && !gameState.gameOver && gameState.cueBall) {
            // Aiming logic now uses gameState.currentForces
            const forceLeft = gameState.currentForces[0] || 0;
            const forceRight = gameState.currentForces[1] || 0;

            if (forceLeft > AIM_ADJUST_THRESHOLD) {
                gameState.aimAngle -= forceLeft * AIM_ADJUST_SPEED;
            }
            if (forceRight > AIM_ADJUST_THRESHOLD) {
                gameState.aimAngle += forceRight * AIM_ADJUST_SPEED;
            }
            // Normalize angle (optional, but good practice)
            // gameState.aimAngle = (gameState.aimAngle + 2 * Math.PI) % (2 * Math.PI); 
            
            gameState.aimDirection.x = Math.cos(gameState.aimAngle);
            gameState.aimDirection.y = Math.sin(gameState.aimAngle);
        }
        
        // Clear canvas
        if (!poolCtx || !poolCanvas) {
            console.error("Pool Game: Context or Canvas lost in gameLoop!");
            gameState.running = false; // Stop the loop if context is lost
            return;
        }
        console.log("Pool Game: Clearing canvas...");
        poolCtx.fillStyle = TABLE_COLOR;
        poolCtx.fillRect(0, 0, poolCanvas.width, poolCanvas.height);
        
        // Update ball positions
        console.log("Pool Game: Updating balls...");
        updateBalls();
        
        // Draw holes
        console.log("Pool Game: Drawing holes...");
        drawHoles();
        
        // Draw balls
        console.log("Pool Game: Drawing balls...");
        drawBalls();
        
        // Draw aim line if can shoot
        if (gameState.canShoot && !gameState.gameOver && gameState.cueBall) {
            console.log("Pool Game: Drawing aim line...");
            drawAimLine();
        }
        
        // Allow shooting if all balls have stopped
        if (!gameState.canShoot && areAllBallsStopped()) {
            gameState.canShoot = true;
        }
        
        // Check for game over
        if (gameState.remainingBalls === 0 && !gameState.gameOver) {
            gameState.gameOver = true;
            showGameOverMessage();
        }
        
        // Continue the game loop
        console.log("Pool Game: Requesting next frame...");
        requestAnimationFrame(gameLoop);
    }
    
    // Update all ball positions and handle collisions
    function updateBalls() {
        if (!poolCanvas) return; // Ensure canvas exists for boundary checks

        // Move balls based on velocity
        for (let i = gameState.balls.length - 1; i >= 0; i--) { // Iterate backwards for safe removal
            const ball = gameState.balls[i];

            // Apply friction
            ball.velX *= FRICTION;
            ball.velY *= FRICTION;
            
            // Stop very slow movements
            if (Math.abs(ball.velX) < 0.01) ball.velX = 0;
            if (Math.abs(ball.velY) < 0.01) ball.velY = 0;
            
            // Update position
            ball.x += ball.velX;
            ball.y += ball.velY;
            
            // Boundary collision
            if (ball.x - ball.radius < 0) {
                ball.x = ball.radius;
                ball.velX *= -1;
            } else if (ball.x + ball.radius > poolCanvas.width) {
                ball.x = poolCanvas.width - ball.radius;
                ball.velX *= -1;
            }
            
            if (ball.y - ball.radius < 0) {
                ball.y = ball.radius;
                ball.velY *= -1;
            } else if (ball.y + ball.radius > poolCanvas.height) {
                ball.y = poolCanvas.height - ball.radius;
                ball.velY *= -1;
            }
            
            // Check hole collisions
            let ballPocketed = false;
            for (let j = 0; j < gameState.holes.length; j++) {
                const hole = gameState.holes[j];
                const dx = ball.x - hole.x;
                const dy = ball.y - hole.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < hole.radius) {
                    // Ball has fallen into a hole
                    ballPocketed = true;
                    if (ball.isCue) {
                        // If cue ball, reset its position
                        ball.x = 200;
                        ball.y = poolCanvas.height / 2;
                        ball.velX = 0;
                        ball.velY = 0;
                        // Penalty for pocketing the cue ball
                        gameState.shots++;
                        updateShotsDisplay();
                    } else {
                        // Remove other balls
                        gameState.balls.splice(i, 1);
                        gameState.remainingBalls--;
                        // Check if cue ball still exists after splice
                        gameState.cueBall = gameState.balls.find(b => b.isCue);
                    }
                    break; // Exit hole check loop for this ball
                }
            }
             if (ballPocketed && !ball.isCue) continue; // Skip collision checks if non-cue ball pocketed
        }
        
        // Ball-to-ball collisions
        for (let i = 0; i < gameState.balls.length; i++) {
            for (let j = i + 1; j < gameState.balls.length; j++) {
                const ball1 = gameState.balls[i];
                const ball2 = gameState.balls[j];
                
                const dx = ball2.x - ball1.x;
                const dy = ball2.y - ball1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Check for collision
                if (distance < ball1.radius + ball2.radius) {
                    // Calculate collision normal
                    const nx = dx / distance;
                    const ny = dy / distance;
                    
                    // Resolve overlap
                    const overlap = ball1.radius + ball2.radius - distance;
                    ball1.x -= overlap/2 * nx;
                    ball1.y -= overlap/2 * ny;
                    ball2.x += overlap/2 * nx;
                    ball2.y += overlap/2 * ny;
                    
                    // Calculate relative velocity
                    const dvx = ball2.velX - ball1.velX;
                    const dvy = ball2.velY - ball1.velY;
                    
                    // Calculate impulse (using mass = 1 for all balls)
                    const impulse = (dvx * nx + dvy * ny) * 1.0; // Elastic collision (coeff = 1)
                    
                    // Apply impulse
                    ball1.velX += impulse * nx;
                    ball1.velY += impulse * ny;
                    ball2.velX -= impulse * nx;
                    ball2.velY -= impulse * ny;
                }
            }
        }
    }
    
    // Draw all holes
    function drawHoles() {
        if (!poolCtx) return;
        poolCtx.fillStyle = "black";
        for (const hole of gameState.holes) {
            poolCtx.beginPath();
            poolCtx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
            poolCtx.fill();
        }
    }
    
    // Draw all balls
    function drawBalls() {
        if (!poolCtx) return;
        for (const ball of gameState.balls) {
            poolCtx.fillStyle = ball.color;
            poolCtx.beginPath();
            poolCtx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            poolCtx.fill();
            
            // Add a stroke
            poolCtx.strokeStyle = "black";
            poolCtx.lineWidth = 1;
            poolCtx.stroke();
        }
    }
    
    // Draw aim line from cue ball
    function drawAimLine() {
        if (!gameState.cueBall || !poolCtx) return;
        
        const lineLength = 100;
        const endX = gameState.cueBall.x + gameState.aimDirection.x * lineLength;
        const endY = gameState.cueBall.y + gameState.aimDirection.y * lineLength;
        
        let displayForce = 0;
        if (gameState.isChargingShot) {
            displayForce = gameState.shotChargePower;
        } else {
            displayForce = gameState.currentForces[2] || 0;
        }

        poolCtx.strokeStyle = "rgba(255, 0, 0, 0.7)";
        poolCtx.lineWidth = Math.max(1, displayForce * 10); 
        
        poolCtx.beginPath();
        poolCtx.moveTo(gameState.cueBall.x, gameState.cueBall.y);
        poolCtx.lineTo(endX, endY);
        poolCtx.stroke();
        
        // Display force level
        const forceText = Math.round(displayForce * 100) + "%";
        poolCtx.fillStyle = "white";
        poolCtx.font = "14px Arial";
        poolCtx.fillText(forceText, endX + 5, endY);
    }
    
    // Show game over message
    function showGameOverMessage() {
        if (!poolCtx || !poolCanvas) return;
        poolCtx.fillStyle = "rgba(0, 0, 0, 0.7)";
        poolCtx.fillRect(0, 0, poolCanvas.width, poolCanvas.height);
        
        poolCtx.fillStyle = "white";
        poolCtx.font = "40px Arial";
        poolCtx.textAlign = "center";
        poolCtx.fillText("Game Complete!", poolCanvas.width / 2, poolCanvas.height / 2 - 40);
        
        poolCtx.font = "24px Arial";
        poolCtx.fillText(`You finished in ${gameState.shots} shots`, poolCanvas.width / 2, poolCanvas.height / 2 + 10);
        
        poolCtx.font = "18px Arial";
        poolCtx.fillText("Click anywhere to play again", poolCanvas.width / 2, poolCanvas.height / 2 + 60);
        
        // Add event listener for restarting the game
        poolCanvas.addEventListener('click', restartGame, { once: true });
    }
    
    // Restart the game
    function restartGame(event) {
        // Prevent the click from also triggering a shot immediately
        event.stopPropagation(); 
        resetGame();
        gameState.gameOver = false;
    }
    
    // Stop the game
    function stopPoolGame() {
        gameState.running = false;
        // Potentially remove event listeners here if needed, though the IIFE scope helps
    }
    
    // These functions are exported to the global scope to be called from script.js
    window.startPoolGame = initPoolGame;
    window.stopPoolGame = stopPoolGame;

    // NEW: Function to process force inputs from game_control.js
    window.poolGameProcessInputs = function(forcesArray) {
        let processedForces = [0,0,0];
        if (Array.isArray(forcesArray) && forcesArray.length === 3) {
            processedForces = forcesArray;
        } else if (Array.isArray(forcesArray) && forcesArray.length > 0) { 
             processedForces[0] = forcesArray[0] || 0;
             processedForces[1] = forcesArray[1] || 0;
             processedForces[2] = forcesArray[2] || 0; 
        } else {
            // console.warn("Pool Game: Invalid forcesArray received in poolGameProcessInputs", forcesArray);
        }
        gameState.currentForces = processedForces; // Store for aiming and live display

        const strikeForce = gameState.currentForces[2];

        if (gameState.isChargingShot) {
            // Currently charging
            if (strikeForce < CHARGE_THRESHOLD) {
                // RELEASED: Force dropped below threshold
                if (gameState.canShoot && !gameState.gameOver && areAllBallsStopped() && gameState.shotChargePower > (MIN_SHOOT_POWER / gameState.maxShotPower) ) {
                    console.log(`Pool Game: Shot released with power: ${gameState.shotChargePower.toFixed(3)}`);
                    shootBall(gameState.shotChargePower); // Shoot with the stored charge power
                }
                gameState.isChargingShot = false;
                gameState.shotChargePower = 0; // Reset for next shot
            } else {
                // STILL CHARGING: Update peak power
                gameState.shotChargePower = Math.max(gameState.shotChargePower, strikeForce);
            }
        } else {
            // Not currently charging
            if (strikeForce >= CHARGE_THRESHOLD) {
                // STARTED CHARGING: Force went above threshold
                if (gameState.canShoot && !gameState.gameOver && areAllBallsStopped()) {
                     gameState.isChargingShot = true;
                     gameState.shotChargePower = strikeForce; // Initial charge
                     console.log(`Pool Game: Shot charging started. Initial power: ${strikeForce.toFixed(3)}`);
                }
            }
        }
    };

})(); // End of IIFE 