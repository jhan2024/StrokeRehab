// Rhythm Keys Game
// Basic structure for a 3-key rhythm game

// --- Game Variables ---
let rhythmKeysCanvas = null;
let rhythmKeysCtx = null;
let isRhythmKeysGameActive = false;
let rhythmKeysAnimationId = null;

const RHYTHM_KEYS_NUM_LANES = 3;
const RHYTHM_KEYS_LANE_WIDTH = 100; // Pixel width of each lane
const RHYTHM_KEYS_NOTE_HEIGHT = 30; // Pixel height of a note
const RHYTHM_KEYS_HIT_ZONE_Y = 600; // Y-coordinate of the hit zone
const RHYTHM_KEYS_NOTE_SPEED = 3; // Pixels per frame notes fall
const RHYTHM_KEYS_HIT_TARGET_RADIUS = 25; // Radius for hit zone target circles
const RHYTHM_KEYS_NOTE_CORNER_RADIUS = 8; // Was for rounded rects, now for note circle radius
const RHYTHM_KEYS_NOTE_RADIUS = 18; // Radius for the notes themselves
const RHYTHM_KEYS_NOTE_PULSE_SCALE = 0.05; // Max scale change for pulse
let rhythmKeysGlobalTime = 0; // For animations like pulsing

// --- Web Audio API Variables ---
let audioContext = null;
// const RHYTHM_KEYS_NOTE_FREQUENCIES = [261.63, 329.63, 392.00]; // C4, E4, G4 - Replaced by samples
// const RHYTHM_KEYS_NOTE_VOLUME = 0.3; 
// const RHYTHM_KEYS_NOTE_DURATION = 0.3; // seconds

// --- Audio Sample Variables ---
let backgroundMusic = null;
const noteHitSamples = []; // To store AudioBuffer objects for note hits
const noteHitSamplePaths = [
    './audio/note_lane0.ogg', // Placeholder for C4-like sound
    './audio/note_lane1.ogg', // Placeholder for E4-like sound
    './audio/note_lane2.ogg'  // Placeholder for G4-like sound
];
const BACKGROUND_MUSIC_PATH = './audio/rhythm_keys_bgm.ogg'; // Placeholder
const NOTE_HIT_VOLUME = 0.5;
const BACKGROUND_MUSIC_VOLUME = 0.2;

// --- Particle System Variables ---
let rhythmKeysParticles = [];
const RHYTHM_KEYS_PARTICLE_COUNT = 20; // Number of particles per hit
const RHYTHM_KEYS_PARTICLE_LIFESPAN = 60; // Frames
const RHYTHM_KEYS_PARTICLE_SPEED_MAX = 4;

// Colors (Inspired by JS-Hero color mapping for 3 inputs)
// Original JS-Hero: Green (A), Red (S), Yellow (D), Blue (F), Orange (G)
const RHYTHM_KEYS_LANE_COLORS_JS_HERO = [
    '#4CAF50', // Green-like (for Lane A)
    '#F44336', // Red-like (for Lane S)
    '#FFEB3B'  // Yellow-like (for Lane D)
];
const RHYTHM_KEYS_NOTE_COLORS_JS_HERO = [
    '#81C784', // Lighter Green
    '#E57373', // Lighter Red
    '#FFF176'  // Lighter Yellow
];
const RHYTHM_KEYS_HIT_TARGET_ACTIVE_COLOR = '#FFFFFF'; // White for active hit target

// Original colors, can be switched back if needed
// const RHYTHM_KEYS_LANE_COLORS = ['#ff6666', '#66ff66', '#6666ff']; 
// const RHYTHM_KEYS_NOTE_COLORS = ['#ffcccc', '#ccffcc', '#ccccff']; 

const RHYTHM_KEYS_LANE_COLORS = RHYTHM_KEYS_LANE_COLORS_JS_HERO;
const RHYTHM_KEYS_NOTE_COLORS = RHYTHM_KEYS_NOTE_COLORS_JS_HERO;

const RHYTHM_KEYS_HIT_ZONE_COLOR = '#ffffff'; // White hit zone (base line)
const RHYTHM_KEYS_TEXT_COLOR = '#ffffff';

// Score and Song
let rhythmKeysScore = 0;
let rhythmKeysCurrentSong = null;
let rhythmKeysSongTitleElement = null;
let rhythmKeysScoreElement = null;

// Notes currently on screen
let rhythmKeysActiveNotes = [];

// To store the state of key presses for visual feedback on hit targets
let rhythmKeysLaneActive = [false, false, false]; // For A, S, D keys

// Simple song data: { time: (ms from start), lane: (0, 1, or 2) }
// Time is when the BOTTOM of the note should reach the HIT_ZONE_Y
const RHYTHM_KEYS_SAMPLE_SONG = {
    title: "Demo Song",
    bpm: 120, // Beats per minute (for future use, or to calculate timings)
    notes: [
        { time: 2000, lane: 0 }, // Note in lane 0 at 2s
        { time: 2500, lane: 1 }, // Note in lane 1 at 2.5s
        { time: 3000, lane: 2 }, // Note in lane 2 at 3s
        { time: 3500, lane: 0 },
        { time: 3500, lane: 2 }, // Chord
        { time: 4000, lane: 1 },
        { time: 4500, lane: 0 },
        { time: 4800, lane: 1 },
        { time: 5100, lane: 2 },
        { time: 6000, lane: 1 },
    ]
};
let rhythmKeysSongStartTime = 0;
let rhythmKeysNextNoteIndex = 0;


// --- Game Functions ---

function initRhythmKeys() {
    console.log("Rhythm Keys: Initializing (not much to do yet)...");
    rhythmKeysCanvas = document.getElementById('rhythmKeysCanvas');
    rhythmKeysSongTitleElement = document.getElementById('rhythmKeysSongTitle');
    rhythmKeysScoreElement = document.getElementById('rhythmKeysScore');

    if (rhythmKeysCanvas) {
        rhythmKeysCtx = rhythmKeysCanvas.getContext('2d');
    } else {
        console.error("Rhythm Keys: Canvas element not found!");
        return;
    }
    // Load audio assets
    loadBackgroundMusic();
    loadNoteHitSamples();
    // Event listeners will be added in startRhythmKeysGame and removed in stop
}

function startRhythmKeysGame() {
    if (!rhythmKeysCanvas || !rhythmKeysCtx) {
        console.error("Rhythm Keys: Cannot start, canvas not initialized.");
        if (!rhythmKeysCanvas) initRhythmKeys(); // Try to init if not done
        if (!rhythmKeysCanvas || !rhythmKeysCtx) return;
    }

    console.log("Rhythm Keys: Starting game...");
    isRhythmKeysGameActive = true;
    rhythmKeysScore = 0;

    // Initialize AudioContext if it hasn't been already (best on user gesture)
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log("AudioContext initialized.");
        } catch (e) {
            console.error("Web Audio API is not supported in this browser", e);
            // Fallback or disable audio features
        }
    }

    if (backgroundMusic && backgroundMusic.readyState >= 2) { // HAVE_CURRENT_DATA or more
        backgroundMusic.currentTime = 0;
        backgroundMusic.loop = true;
        backgroundMusic.volume = BACKGROUND_MUSIC_VOLUME;
        backgroundMusic.play().catch(e => console.error("Error playing background music:", e));
    } else if (backgroundMusic) {
        // If not ready, try playing once loaded (event listener in loadBackgroundMusic)
        console.log("Background music not ready, will play when loaded.");
    }

    rhythmKeysActiveNotes = [];
    rhythmKeysNextNoteIndex = 0;
    rhythmKeysCurrentSong = RHYTHM_KEYS_SAMPLE_SONG; // Load the sample song
    rhythmKeysSongStartTime = Date.now();

    if (rhythmKeysSongTitleElement) rhythmKeysSongTitleElement.textContent = rhythmKeysCurrentSong.title;
    if (rhythmKeysScoreElement) rhythmKeysScoreElement.textContent = rhythmKeysScore;

    // Add keyboard listeners
    document.addEventListener('keydown', handleRhythmKeysInput);
    document.addEventListener('keyup', handleRhythmKeysKeyRelease);

    // Start the game loop
    if (rhythmKeysAnimationId) cancelAnimationFrame(rhythmKeysAnimationId);
    gameLoopRhythmKeys();
}

function stopRhythmKeysGame() {
    console.log("Rhythm Keys: Stopping game...");
    isRhythmKeysGameActive = false;
    if (rhythmKeysAnimationId) {
        cancelAnimationFrame(rhythmKeysAnimationId);
        rhythmKeysAnimationId = null;
    }
    // Stop background music
    if (backgroundMusic) {
        backgroundMusic.pause();
    }
    // Remove keyboard listeners
    document.removeEventListener('keydown', handleRhythmKeysInput);
    document.removeEventListener('keyup', handleRhythmKeysKeyRelease);

    // Clear canvas (optional, or show a "Game Over" message)
    if (rhythmKeysCtx && rhythmKeysCanvas) {
        rhythmKeysCtx.clearRect(0, 0, rhythmKeysCanvas.width, rhythmKeysCanvas.height);
        rhythmKeysCtx.fillStyle = RHYTHM_KEYS_TEXT_COLOR;
        rhythmKeysCtx.font = "30px Arial";
        rhythmKeysCtx.textAlign = "center";
        rhythmKeysCtx.fillText("Game Over", rhythmKeysCanvas.width / 2, rhythmKeysCanvas.height / 2);
        rhythmKeysCtx.fillText("Score: " + rhythmKeysScore, rhythmKeysCanvas.width / 2, rhythmKeysCanvas.height / 2 + 40);
    }
}

function gameLoopRhythmKeys() {
    if (!isRhythmKeysGameActive) return;

    updateRhythmKeysLogic();
    drawRhythmKeysGame();

    rhythmKeysGlobalTime += 1; // Increment global time for animations
    rhythmKeysAnimationId = requestAnimationFrame(gameLoopRhythmKeys);
}

function updateRhythmKeysLogic() {
    const currentTime = Date.now() - rhythmKeysSongStartTime;

    // 1. Spawn new notes
    if (rhythmKeysCurrentSong && rhythmKeysNextNoteIndex < rhythmKeysCurrentSong.notes.length) {
        const nextNote = rhythmKeysCurrentSong.notes[rhythmKeysNextNoteIndex];
        // Spawn a note when its time to appear at the top such that it reaches hit zone at its 'time'
        // Note's travel time = RHYTHM_KEYS_HIT_ZONE_Y / RHYTHM_KEYS_NOTE_SPEED (frames)
        // To convert frames to ms: (frames / FPS) * 1000. Assume 60 FPS for now.
        // Effective spawn time = note.time - ( (RHYTHM_KEYS_HIT_ZONE_Y / RHYTHM_KEYS_NOTE_SPEED) / 60 * 1000 )
        const travelDurationMs = (RHYTHM_KEYS_HIT_ZONE_Y / RHYTHM_KEYS_NOTE_SPEED / 60) * 1000;

        if (currentTime >= (nextNote.time - travelDurationMs)) {
            rhythmKeysActiveNotes.push({
                lane: nextNote.lane,
                y: 0, // Start at the top
                spawnTime: currentTime, // Record when it actually spawned based on currentTime
                missed: false,
                alpha: 1.0
            });
            rhythmKeysNextNoteIndex++;
        }
    }

    // 2. Move existing notes
    for (let i = rhythmKeysActiveNotes.length - 1; i >= 0; i--) {
        let note = rhythmKeysActiveNotes[i];
        note.y += RHYTHM_KEYS_NOTE_SPEED;

        // 3. Remove notes that have gone past the hit zone (missed)
        if (note.y > RHYTHM_KEYS_HIT_ZONE_Y + RHYTHM_KEYS_NOTE_HEIGHT * 2) { // Allow some leeway
            if (!note.missed) { // Only mark as missed once
                note.missed = true;
                note.alpha = 1.0; // Start fade out for missed note
                // console.log("Rhythm Keys: Note missed in lane " + note.lane);
            }
        }
        // If note is marked as missed, reduce its alpha. Remove when fully transparent.
        if (note.missed) {
            note.alpha -= 0.05; // Fade speed for missed notes
            if (note.alpha <= 0) {
                rhythmKeysActiveNotes.splice(i, 1);
            }
        }
    }
    updateParticles(); // Update particle states
}

function drawRhythmKeysGame() {
    if (!rhythmKeysCtx || !rhythmKeysCanvas) return;

    // Clear canvas (now drawing a dynamic background)
    // rhythmKeysCtx.fillStyle = '#000000'; 
    // rhythmKeysCtx.fillRect(0, 0, rhythmKeysCanvas.width, rhythmKeysCanvas.height);
    drawDynamicBackground();

    const totalLanesWidth = RHYTHM_KEYS_NUM_LANES * RHYTHM_KEYS_LANE_WIDTH;
    const startX = (rhythmKeysCanvas.width - totalLanesWidth) / 2;

    // 1. Draw Fretboard Illusion (Strings and Frets)
    rhythmKeysCtx.strokeStyle = '#555555'; // Dark grey for frets and string base
    rhythmKeysCtx.lineWidth = 2;

    // Draw horizontal fret lines (more spaced at bottom, closer at top for perspective)
    const numFrets = 10;
    for (let i = 0; i <= numFrets; i++) {
        const y = RHYTHM_KEYS_HIT_ZONE_Y - (RHYTHM_KEYS_HIT_ZONE_Y * (Math.pow(i / numFrets, 2))) * 0.8; // Exponential spacing for perspective
        if (y < 0) break;
        rhythmKeysCtx.beginPath();
        rhythmKeysCtx.moveTo(startX, y);
        rhythmKeysCtx.lineTo(startX + totalLanesWidth, y);
        rhythmKeysCtx.stroke();
    }
    
    // Draw Lane "Strings"
    rhythmKeysCtx.lineWidth = 4; // Thicker lines for strings
    for (let i = 0; i < RHYTHM_KEYS_NUM_LANES; i++) {
        const laneCenterX = startX + i * RHYTHM_KEYS_LANE_WIDTH + RHYTHM_KEYS_LANE_WIDTH / 2;
        rhythmKeysCtx.strokeStyle = RHYTHM_KEYS_LANE_COLORS[i]; // Color the string itself
        rhythmKeysCtx.globalAlpha = 0.6;
        rhythmKeysCtx.beginPath();
        rhythmKeysCtx.moveTo(laneCenterX, 0);
        rhythmKeysCtx.lineTo(laneCenterX, rhythmKeysCanvas.height);
        rhythmKeysCtx.stroke();
        rhythmKeysCtx.globalAlpha = 1.0;
    }

    // Draw Lane Separators (thin, subtle, if needed on top of string drawing)
    // rhythmKeysCtx.strokeStyle = '#333333'; 
    // rhythmKeysCtx.lineWidth = 1;
    // for (let i = 0; i <= RHYTHM_KEYS_NUM_LANES; i++) {
    //     const x = startX + i * RHYTHM_KEYS_LANE_WIDTH;
    //     rhythmKeysCtx.beginPath();
    //     rhythmKeysCtx.moveTo(x, 0);
    //     rhythmKeysCtx.lineTo(x, rhythmKeysCanvas.height);
    //     rhythmKeysCtx.stroke();
    // }

    // 2. Draw Hit Zone Targets (JS-Hero style)
    const keyLabels = ['A', 'S', 'D'];
    for (let i = 0; i < RHYTHM_KEYS_NUM_LANES; i++) {
        const laneCenterX = startX + i * RHYTHM_KEYS_LANE_WIDTH + RHYTHM_KEYS_LANE_WIDTH / 2;
        rhythmKeysCtx.beginPath();
        
        let targetRadius = RHYTHM_KEYS_HIT_TARGET_RADIUS;
        let targetAlpha = 0.7;
        let targetFillStyle = RHYTHM_KEYS_LANE_COLORS[i];

        if (rhythmKeysLaneActive[i]) {
            // Immediate pop effect on key down (this relies on the key being active this frame)
            // For a more controlled "pop" on initial press, state would be needed (e.g., rhythmKeysLaneJustPressed[i])
            targetRadius = RHYTHM_KEYS_HIT_TARGET_RADIUS * 1.15; // Slightly larger when key is down
            targetFillStyle = RHYTHM_KEYS_HIT_TARGET_ACTIVE_COLOR; 
            targetAlpha = 1.0;
            
            // Continuous pulse while key is held (after initial pop)
            const pulse = Math.sin(rhythmKeysGlobalTime * 0.25) * 2; // Subtle continuous pulse
            targetRadius += pulse;
        } else {
            targetFillStyle = RHYTHM_KEYS_LANE_COLORS[i]; 
            targetAlpha = 0.7; 
        }
        rhythmKeysCtx.globalAlpha = targetAlpha;
        rhythmKeysCtx.fillStyle = targetFillStyle;
        rhythmKeysCtx.arc(laneCenterX, RHYTHM_KEYS_HIT_ZONE_Y, targetRadius, 0, Math.PI * 2);
        rhythmKeysCtx.fill();
        
        rhythmKeysCtx.strokeStyle = '#FFFFFF'; // White border for targets
        rhythmKeysCtx.lineWidth = 2;
        rhythmKeysCtx.stroke();
        rhythmKeysCtx.globalAlpha = 1.0;

        // Draw key labels on targets
        rhythmKeysCtx.fillStyle = rhythmKeysLaneActive[i] ? '#333333' : '#FFFFFF'; // Dark text on active, white on inactive
        rhythmKeysCtx.font = 'bold 18px Arial';
        rhythmKeysCtx.textAlign = 'center';
        rhythmKeysCtx.textBaseline = 'middle';
        rhythmKeysCtx.fillText(keyLabels[i], laneCenterX, RHYTHM_KEYS_HIT_ZONE_Y);
    }

    // 3. Draw Active Notes (Circles as "Gems")
    for (const note of rhythmKeysActiveNotes) {
        const laneCenterX = startX + note.lane * RHYTHM_KEYS_LANE_WIDTH + RHYTHM_KEYS_LANE_WIDTH / 2;
        
        // Pulse effect for notes
        const pulseFactor = 1 + Math.sin(rhythmKeysGlobalTime * 0.1 + note.y * 0.05) * RHYTHM_KEYS_NOTE_PULSE_SCALE;
        const currentNoteRadius = RHYTHM_KEYS_NOTE_RADIUS * pulseFactor;

        rhythmKeysCtx.beginPath();
        rhythmKeysCtx.arc(laneCenterX, note.y, currentNoteRadius, 0, Math.PI * 2);

        // Create a radial gradient for a gem/glossy effect
        const gradient = rhythmKeysCtx.createRadialGradient(
            laneCenterX - currentNoteRadius * 0.3, // Light source offset to top-left
            note.y - currentNoteRadius * 0.3,
            currentNoteRadius * 0.1, // Inner circle radius (highlight)
            laneCenterX, 
            note.y, 
            currentNoteRadius // Outer circle radius
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)'); // Bright highlight
        gradient.addColorStop(0.7, RHYTHM_KEYS_NOTE_COLORS[note.lane]);
        gradient.addColorStop(1, RHYTHM_KEYS_LANE_COLORS[note.lane]); // Darker edge from lane color

        rhythmKeysCtx.fillStyle = gradient;
        
        if (note.missed) {
            rhythmKeysCtx.globalAlpha = note.alpha; // Apply fade for missed notes
        }

        rhythmKeysCtx.fill();
        rhythmKeysCtx.globalAlpha = 1.0; // Reset alpha for other elements

        rhythmKeysCtx.strokeStyle = RHYTHM_KEYS_LANE_COLORS[note.lane]; 
        rhythmKeysCtx.lineWidth = 2; // Reduced border width for gem look
        rhythmKeysCtx.stroke();
    }

    drawParticles(); // Draw active particles

    // 4. Draw Score (already handled by HTML, but could draw on canvas too)
    // rhythmKeysCtx.fillStyle = RHYTHM_KEYS_TEXT_COLOR;
    // rhythmKeysCtx.font = "24px Arial";
    // rhythmKeysCtx.textAlign = "left";
    // rhythmKeysCtx.fillText("Score: " + rhythmKeysScore, 20, 30);
}

function handleRhythmKeysInput(event) {
    if (!isRhythmKeysGameActive) return;

    let targetLane = -1;
    switch (event.key.toLowerCase()) {
        case 'a': targetLane = 0; break;
        case 's': targetLane = 1; break;
        case 'd': targetLane = 2; break;
        default: return; // Not a game key
    }
    event.preventDefault(); // Prevent default browser action for these keys

    // Set the lane as active for visual feedback (key is pressed)
    if (targetLane !== -1) {
        rhythmKeysLaneActive[targetLane] = true;
        // Potentially trigger a softer version of showHitEffect here for just the key press
        // For now, the hit target drawing will reflect this state.
    }

    // Check for a hit
    // Iterate backwards because we might splice
    for (let i = rhythmKeysActiveNotes.length - 1; i >= 0; i--) {
        const note = rhythmKeysActiveNotes[i];
        if (note.lane === targetLane) {
            // Check if note is within the hit zone tolerance
            const noteBottom = note.y + RHYTHM_KEYS_NOTE_HEIGHT;
            const hitZoneTop = RHYTHM_KEYS_HIT_ZONE_Y - RHYTHM_KEYS_NOTE_HEIGHT; // More generous top tolerance
            const hitZoneBottom = RHYTHM_KEYS_HIT_ZONE_Y + RHYTHM_KEYS_NOTE_HEIGHT / 2; // Bottom tolerance

            if (noteBottom >= hitZoneTop && note.y <= hitZoneBottom) {
                console.log("Rhythm Keys: Hit in lane " + targetLane + "!");
                rhythmKeysScore += 10;
                if (rhythmKeysScoreElement) rhythmKeysScoreElement.textContent = rhythmKeysScore;
                rhythmKeysActiveNotes.splice(i, 1); // Remove hit note

                playNoteSound(targetLane);
                showHitEffect(targetLane);
                // Potentially add combo logic here
                return; // Process only one note per key press per lane
            }
        }
    }
    // console.log("Rhythm Keys: Missed or no note in lane " + targetLane);
}

function playNoteSound(laneIndex) {
    if (!audioContext || laneIndex < 0 || laneIndex >= noteHitSamples.length) {
        return;
    }

    const sourceBuffer = noteHitSamples[laneIndex];
    if (!sourceBuffer) {
        // console.warn(`Note sample for lane ${laneIndex} not loaded.`);
        // Fallback to oscillator if sample not loaded (optional)
        playOscillatorFallback(laneIndex);
        return;
    }

    const source = audioContext.createBufferSource();
    source.buffer = sourceBuffer;
    
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(NOTE_HIT_VOLUME, audioContext.currentTime);

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start(audioContext.currentTime);
    console.log("Rhythm Keys: Playing sample for lane " + laneIndex);
}

// Optional: Fallback oscillator sound if samples fail to load
function playOscillatorFallback(laneIndex) {
    if (!audioContext) return;
    const fallbackFrequencies = [261.63, 329.63, 392.00];
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.type = 'sine'; // Softer sound
    oscillator.frequency.setValueAtTime(fallbackFrequencies[laneIndex], audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.25);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.25);
    console.log("Rhythm Keys: Playing FALLBACK oscillator for lane " + laneIndex);
}

function showHitEffect(laneIndex) {
    // Placeholder for visual effect on hit
    console.log("Rhythm Keys: Placeholder - Show hit effect for lane " + laneIndex);
    // This effect is now primarily handled by rhythmKeysLaneActive state in drawRhythmKeysGame
    // We can add a more explosive/temporary particle effect here specifically for successful hits.

    if (rhythmKeysCtx) {
        const totalLanesWidth = RHYTHM_KEYS_NUM_LANES * RHYTHM_KEYS_LANE_WIDTH;
        const startX = (rhythmKeysCanvas.width - totalLanesWidth) / 2;
        const laneCenterX = startX + laneIndex * RHYTHM_KEYS_LANE_WIDTH + RHYTHM_KEYS_LANE_WIDTH / 2;

        // Example: Simple particle burst for successful hit - Placeholder for now
        // Will implement actual particles in a subsequent step.
        console.log("Rhythm Keys: Spawn particles for successful hit in lane " + laneIndex);

        // Spawn particles for successful hit
        createParticles(laneCenterX, RHYTHM_KEYS_HIT_ZONE_Y, RHYTHM_KEYS_LANE_COLORS[laneIndex]);

        // Enhanced Hit Flash for SUCCESSFUL hits (distinct from key-down feedback)
        rhythmKeysCtx.fillStyle = 'rgba(255, 255, 224, 0.85)'; // Light yellow, very bright flash
        rhythmKeysCtx.beginPath();
        const flashBaseRadius = RHYTHM_KEYS_HIT_TARGET_RADIUS * 1.5; // Larger base for hit flash
        // A quick, sharp pulse for the flash itself
        const flashVisualPulse = Math.sin(rhythmKeysGlobalTime * 0.5) * 8 + 5; // Fast, larger amplitude pulse
        rhythmKeysCtx.arc(laneCenterX, RHYTHM_KEYS_HIT_ZONE_Y, flashBaseRadius + flashVisualPulse, 0, Math.PI * 2); 
        rhythmKeysCtx.fill();

        // The successful hit flash is still frame-dependent. 
        // For a longer visible flash, manage its state over multiple frames.
    }
}

// Add a key release handler to deactivate the lane highlight
function handleRhythmKeysKeyRelease(event) {
    if (!isRhythmKeysGameActive) return;
    let targetLane = -1;
    switch (event.key.toLowerCase()) {
        case 'a': targetLane = 0; break;
        case 's': targetLane = 1; break;
        case 'd': targetLane = 2; break;
        default: return;
    }
    if (targetLane !== -1) {
        rhythmKeysLaneActive[targetLane] = false;
    }
}

// Helper function to draw rounded rectangles (add if not already present)
function drawRoundedRect(ctx, x, y, width, height, radius) {
    if (typeof radius === 'undefined') {
        radius = 5;
    }
    if (typeof radius === 'number') {
        radius = {tl: radius, tr: radius, br: radius, bl: radius};
    } else {
        var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
        for (var side in defaultRadius) {
            radius[side] = radius[side] || defaultRadius[side];
        }
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.arcTo(x + width, y, x + width, y + radius.tr, radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.arcTo(x + width, y + height, x + width - radius.br, y + height, radius.br);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius.bl, radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.arcTo(x, y, x + radius.tl, y, radius.tl);
    ctx.closePath();
    // Fill and stroke will be done by the caller
}

// --- New Function for Dynamic Background ---
function drawDynamicBackground() {
    if (!rhythmKeysCtx || !rhythmKeysCanvas) return;

    // Simple gradient background for now
    const bgGradient = rhythmKeysCtx.createLinearGradient(0, 0, 0, rhythmKeysCanvas.height);
    bgGradient.addColorStop(0, '#1c1c2e'); // Dark blue/purple top
    bgGradient.addColorStop(1, '#3a3a52'); // Lighter slate blue bottom
    rhythmKeysCtx.fillStyle = bgGradient;
    rhythmKeysCtx.fillRect(0, 0, rhythmKeysCanvas.width, rhythmKeysCanvas.height);

    // Optional: Add subtle stars or patterns here later
    // Example: Draw a few static stars for now
    rhythmKeysCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 30; i++) { // Draw 30 stars
        const x = Math.random() * rhythmKeysCanvas.width;
        const y = Math.random() * rhythmKeysCanvas.height * 0.7; // Only in the upper 70%
        const r = Math.random() * 1.5;
        rhythmKeysCtx.beginPath();
        rhythmKeysCtx.arc(x, y, r, 0, Math.PI * 2);
        rhythmKeysCtx.fill();
    }
}

// --- Particle System Functions ---
function createParticles(x, y, color) {
    for (let i = 0; i < RHYTHM_KEYS_PARTICLE_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * RHYTHM_KEYS_PARTICLE_SPEED_MAX;
        rhythmKeysParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 3 + 2, // Particle size between 2 and 5
            color: color,
            life: RHYTHM_KEYS_PARTICLE_LIFESPAN,
            alpha: 1.0
        });
    }
}

function updateParticles() {
    for (let i = rhythmKeysParticles.length - 1; i >= 0; i--) {
        const p = rhythmKeysParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // Simple gravity
        p.life--;
        p.alpha = Math.max(0, p.life / RHYTHM_KEYS_PARTICLE_LIFESPAN); // Fade out based on life

        if (p.life <= 0) {
            rhythmKeysParticles.splice(i, 1);
        }
    }
}

function drawParticles() {
    if (!rhythmKeysCtx) return;
    for (const p of rhythmKeysParticles) {
        rhythmKeysCtx.globalAlpha = p.alpha;
        rhythmKeysCtx.fillStyle = p.color;
        rhythmKeysCtx.beginPath();
        rhythmKeysCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        rhythmKeysCtx.fill();
    }
    rhythmKeysCtx.globalAlpha = 1.0; // Reset global alpha
}

// --- Audio Loading Functions ---
function loadBackgroundMusic() {
    backgroundMusic = new Audio(BACKGROUND_MUSIC_PATH);
    backgroundMusic.loop = true;
    backgroundMusic.volume = BACKGROUND_MUSIC_VOLUME;
    backgroundMusic.addEventListener('canplaythrough', () => {
        console.log("Background music loaded and can play through.");
        // If game is already active, try playing it now
        if (isRhythmKeysGameActive && backgroundMusic.paused) {
            backgroundMusic.play().catch(e => console.error("Error playing background music post-load:", e));
        }
    });
    backgroundMusic.addEventListener('error', (e) => {
        console.error("Error loading background music:", e);
    });
    backgroundMusic.load(); // Start loading
}

function loadNoteHitSamples() {
    if (!audioContext) {
        // Try to initialize AudioContext if it wasn't (e.g. if initRhythmKeys is called before game start)
        // However, this might fail without user gesture. Best to ensure AC is up by game start.
        try {
            if (!(window.AudioContext || window.webkitAudioContext)) {
                console.warn("Web Audio API not supported, cannot load note samples.");
                return;
            }
            if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.error("AudioContext could not be initialized for loading samples.", e);
            return;
        }
    }

    noteHitSamplePaths.forEach((path, index) => {
        fetch(path)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} for ${path}`);
                }
                return response.arrayBuffer();
            })
            .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
                noteHitSamples[index] = audioBuffer;
                console.log(`Loaded note sample for lane ${index}: ${path}`);
            })
            .catch(error => {
                console.error(`Error loading note sample ${path}:`, error);
                noteHitSamples[index] = null; // Ensure it's null on error
            });
    });
}

// Expose functions to global scope if they need to be called from HTML/main script
window.startRhythmKeysGame = startRhythmKeysGame;
window.stopRhythmKeysGame = stopRhythmKeysGame;
window.initRhythmKeys = initRhythmKeys;

// Call init once the script is loaded, or ensure it's called before first game start
document.addEventListener('DOMContentLoaded', initRhythmKeys); 