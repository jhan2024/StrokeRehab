// Game Control Logic
document.addEventListener('DOMContentLoaded', function() {
    // --- Global Game State Flags ---
    let isGameControlActive = false;     // Flappy Bird specifically
    let isSpaceShooterActive = false;
    let isPoolGameActive = false;
    let isRhythmKeysGameUIShown = false; // Tracks if the UI overlay for Rhythm Keys is shown

    // --- Input Thresholds (can be centralized or made game-specific objects later) ---
    const GAME_FORCE_THRESHOLD = 0.1; // General threshold for 1-input games like Flappy Bird
    const RHYTHM_GAME_FORCE_THRESHOLD = 0.3; // Potentially different for rhythm game hits

    // --- UI Element References (Cached locally within this module) ---
    // Flappy Bird
    const playFlappyBtn = document.getElementById('playFlappyBird');
    const closeGameBtn = document.getElementById('closeFlappyBird'); // Also known as closeFlappyBirdBtn
    const gameContainer = document.getElementById('flappyBirdGame'); // Also known as flappyBirdContainer

    // Space Shooter
    const playSpaceShooterBtn = document.getElementById('playSpaceShooter');
    const closeSpaceShooterBtn = document.getElementById('closeSpaceShooter');
    const spaceShooterContainer = document.getElementById('spaceShooterGame');

    // Pool Game
    const playPoolGameBtn = document.getElementById('playPoolGame');
    const closePoolGameBtn = document.getElementById('closePoolGame');
    const poolGameContainer = document.getElementById('poolGameContainer');

    // Rhythm Keys
    const playRhythmKeysBtn = document.getElementById('playRhythmKeys');
    const closeRhythmKeysBtn = document.getElementById('closeRhythmKeys');
    const rhythmKeysContainer = document.getElementById('rhythmKeysGame');

    // --- Event Names (ensure these are available, e.g., defined in script.js or a shared consts file) ---
    // Assuming EVT_FORCE_UPDATE is globally available from script.js for now.
    // // const EVT_FORCE_UPDATE = 'forceupdate'; // MOVED to constants.js

    // --- Game Control Event Listener ---
    document.addEventListener(EVT_FORCE_UPDATE, (event) => { // Now uses global EVT_FORCE_UPDATE
        const { forces, rawPressures, deviceType } = event.detail; // Forces is an array

        if (!Array.isArray(forces) || forces.length === 0) {
            // console.warn("Game Control: Received empty or invalid forces array.");
            return; // No force data to process
        }

        const firstForce = forces[0]; // For 1-input games

        // Flappy Bird Control
        if (isGameControlActive) {
            if (typeof window.flappyGameJump === 'function' && firstForce >= GAME_FORCE_THRESHOLD) {
                // This handles the jump action for 'jump' mode and can also start the game.
                window.flappyGameJump();
            }
            // Always send the raw force if the processing function exists.
            // Flappy Bird's 'gravity' mode will use this.
            if (typeof window.flappyBirdProcessForce === 'function') {
                window.flappyBirdProcessForce(firstForce);
            }
        }

        // Space Shooter Control
        if (isSpaceShooterActive && typeof window.spaceShooterProcessForce === 'function') {
            window.spaceShooterProcessForce(firstForce);
        } else if (isSpaceShooterActive) {
            // console.warn("window.spaceShooterProcessForce function not found!");
        }

        // Pool Game Control - REVISED
        if (isPoolGameActive && typeof window.poolGameProcessInputs === 'function') {
            if (deviceType === '3-dome') {
                if (forces.length >= 3) {
                    window.poolGameProcessInputs(forces.slice(0, 3));
                } else {
                    // Pad if not enough forces, though typically there should be 3 for 3-dome
                    const paddedForces = [forces[0] || 0, forces[1] || 0, forces[2] || 0];
                    window.poolGameProcessInputs(paddedForces);
                }
            } else if (deviceType === '1-dome') {
                // For 1-dome, map the single force to the strike input (index 2).
                // Aiming inputs (index 0 and 1) will be 0, meaning no force-based aim adjustment.
                const singleInputForces = [0, 0, firstForce];
                window.poolGameProcessInputs(singleInputForces);
            }
        } else if (isPoolGameActive) {
            // console.warn("window.poolGameProcessInputs function not found for Pool Game!");
        }

        // Rhythm Keys Control
        if (isRhythmKeysGameUIShown && typeof window.rhythmGameProcessInputs === 'function') {
            if (deviceType === '3-dome') {
                if (forces.length >= 3) {
                    window.rhythmGameProcessInputs(forces.slice(0, 3), RHYTHM_GAME_FORCE_THRESHOLD);
                } else {
                    // console.warn("Rhythm Keys (3-dome): Not enough force values received.", forces);
                    // Optionally, send an array of zeros or current values padded with zeros
                    const paddedForces = [forces[0] || 0, forces[1] || 0, forces[2] || 0];
                    window.rhythmGameProcessInputs(paddedForces, RHYTHM_GAME_FORCE_THRESHOLD);
                }
            } else if (deviceType === '1-dome') {
                // Use the single force for the middle lane (index 1)
                const singleInputForces = [0, firstForce, 0];
                window.rhythmGameProcessInputs(singleInputForces, RHYTHM_GAME_FORCE_THRESHOLD);
            }
        } else if (isRhythmKeysGameUIShown) {
            // console.warn("window.rhythmGameProcessInputs function not found for Rhythm Keys!");
        }
    });

    // --- Game Button Event Listeners ---

    // Flappy Bird
    if (playFlappyBtn && gameContainer) {
        playFlappyBtn.addEventListener('click', function() {
            gameContainer.style.display = 'flex'; 
            isGameControlActive = true; 
            console.log("Flappy Bird control ACTIVATED (game_control.js)");
            if(typeof window.showSplash === 'function') { // Assuming flappybird.js has showSplash to reset
                window.showSplash(); 
            } else if(typeof window.resetGame === 'function') {
                window.resetGame();
            }
        });
    }
    if (closeGameBtn && gameContainer) {
        closeGameBtn.addEventListener('click', function() {
            gameContainer.style.display = 'none'; 
            isGameControlActive = false; 
            console.log("Flappy Bird control DEACTIVATED (game_control.js)");
            if(typeof window.playerDead === 'function') { // Stop game logic if applicable
                // window.playerDead(); // This might show scoreboard, ensure it's intended
            }
            // Consider a more generic stop/cleanup for flappy bird if available
        });
    }

    // Space Shooter
    if (playSpaceShooterBtn && spaceShooterContainer) {
        playSpaceShooterBtn.addEventListener('click', function() {
            spaceShooterContainer.style.display = 'flex';
            isSpaceShooterActive = true;
            console.log("Space Shooter control ACTIVATED (game_control.js)");
            if (typeof window.startSpaceShooter === 'function') {
                window.startSpaceShooter();
            } else {
                console.warn("Space Shooter game start function not loaded!");
            }
        });
    }
    if (closeSpaceShooterBtn && spaceShooterContainer) {
        closeSpaceShooterBtn.addEventListener('click', function() {
            spaceShooterContainer.style.display = 'none';
            isSpaceShooterActive = false;
            console.log("Space Shooter control DEACTIVATED (game_control.js)");
            if (typeof window.stopGame === 'function') { // Assuming stopGame is from spaceshooter.js
                window.stopGame();
            } else {
                console.warn("stopGame function not found in spaceshooter.js");
            }
        });
    }

    // Pool Game
    if (playPoolGameBtn && poolGameContainer) {
        playPoolGameBtn.addEventListener('click', function() {
            poolGameContainer.style.display = 'flex';
            isPoolGameActive = true;
            console.log("Pool Game control ACTIVATED (game_control.js)");
            if (typeof window.startPoolGame === 'function') {
                window.startPoolGame();
            } else {
                console.warn("Pool Game start function not loaded!");
            }
        });
    }
    if (closePoolGameBtn && poolGameContainer) {
        closePoolGameBtn.addEventListener('click', function() {
            poolGameContainer.style.display = 'none';
            isPoolGameActive = false;
            console.log("Pool Game control DEACTIVATED (game_control.js)");
            if (typeof window.stopPoolGame === 'function') {
                window.stopPoolGame();
            }
        });
    }

    // Rhythm Keys
    if (playRhythmKeysBtn && rhythmKeysContainer) {
        playRhythmKeysBtn.addEventListener('click', function() {
            if (typeof window.initRhythmKeys === 'function' && !document.getElementById('rhythmKeysCanvas').getContext('2d')) { // Check if canvas context exists as a proxy for init
                window.initRhythmKeys(); 
            }
            if (typeof window.startRhythmKeysGame === 'function') {
                rhythmKeysContainer.style.display = 'flex';
                isRhythmKeysGameUIShown = true;
                window.rhythmKeysForceTrace = [];
                window.startRhythmKeysGame(); 
                console.log("Rhythm Keys game started (game_control.js)");
            } else {
                console.error("startRhythmKeysGame function not found!");
            }
        });
    }
    if (closeRhythmKeysBtn && rhythmKeysContainer) {
        closeRhythmKeysBtn.addEventListener('click', function() {
            if (typeof window.stopRhythmKeysGame === 'function') {
                window.stopRhythmKeysGame();
                rhythmKeysContainer.style.display = 'none';
                isRhythmKeysGameUIShown = false;
                console.log("Rhythm Keys game stopped (game_control.js)");
                const exportData = {
                    forceTrace: window.rhythmKeysForceTrace || [],
                    expectedNotes: (window.rhythmKeysCurrentSong?.notes || []).map(n => ({
                        time: n.time,
                        lane: n.lane
                    }))
                };
                // Store globally for use by the analysis page
                window.analysisGameData = exportData;
                console.log("Saved game data to analysisGameData for later use.");

                /* Rename and download file */
                // let fileName = prompt("Please enter the save file name (without json)", `rhythmkeys_trace_${Date.now()}`);
                // if (!fileName) {
                //     alert("no filename, save file cancelled");
                //     return;
                // }
                // if (!fileName.endsWith(".json")) {
                //     fileName += ".json";
                // }
                // window.analysisGameDataFileName = fileName;
                // const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                // const url = URL.createObjectURL(blob);
                // const link = document.createElement('a');
                // link.href = url;
                // link.download = fileName;
                // link.click();
                // URL.revokeObjectURL(url);
            } else {
                console.error("stopRhythmKeysGame function not found!");
            }
        });
    }

    console.log("game_control.js loaded and listeners attached.");
}); 