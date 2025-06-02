// Rhythm Keys Game
// Basic structure for a 3-key rhythm game

// --- Game Variables ---
let rhythmKeysCanvas = null;
let rhythmKeysCtx = null;
let isRhythmKeysGameActive = false;
let rhythmKeysAnimationId = null;
let rhythmKeysForceTrace = [];

// --- ADDED: Encouraging Notifications System ---
let rhythmKeysNotifications = [];
let rhythmKeysComboCount = 0;
let rhythmKeysLastHitTime = 0;
const RHYTHM_KEYS_COMBO_TIMEOUT = 2000; // Reset combo after 2 seconds of no hits

const RHYTHM_KEYS_ENCOURAGING_MESSAGES = [
    "Great Hit!", "Strong Press!", "Good Job!", "Keep Going!"
];

const RHYTHM_KEYS_COMBO_MESSAGES = [
    "Combo x2!", "Combo x3!", "Keep Going!", "Good Rhythm!", "Well Done!"
];

const RHYTHM_KEYS_NUM_LANES = 3;
const RHYTHM_KEYS_LANE_WIDTH = 100; // Pixel width of each lane
const RHYTHM_KEYS_NOTE_HEIGHT = 30; // Pixel height of a note (NOW USED FOR HIT WINDOW TOLERANCE)
const RHYTHM_KEYS_HIT_ZONE_Y = 600; // Y-coordinate of the hit zone
const RHYTHM_KEYS_NOTE_SPEED = 3; // Pixels per frame notes fall

// --- MODIFIED: Renamed and added new constants for target scaling ---
const RHYTHM_KEYS_TARGET_BASE_RADIUS = 15;   // Base radius for hit zone target circles
const RHYTHM_KEYS_TARGET_MIN_SCALE_ON_FORCE = 0.7; // Scale factor at 0 force (1.0 means base size, 0.7 means 30% smaller)
const RHYTHM_KEYS_TARGET_MAX_SCALE_ON_FORCE = 2.0; // Scale factor at max force (1.0 means base size, 2.5 means 2.0x larger)

const RHYTHM_KEYS_NOTE_CORNER_RADIUS = 8;
const RHYTHM_KEYS_NOTE_RADIUS = 18; // Base radius for the notes themselves (for sizeFactor = 1.0)
const RHYTHM_KEYS_NOTE_PULSE_SCALE = 0.05; // Max scale change for pulse
let rhythmKeysGlobalTime = 0;

const RHYTHM_KEYS_NOTE_MIN_SIZE_FACTOR = 0.7;
const RHYTHM_KEYS_NOTE_MAX_SIZE_FACTOR = 1.3;

// ... (Web Audio, Audio Sample, Particle System variables remain the same) ...
let audioContext = null;
let backgroundMusic = null;
const noteHitSamples = [];
const noteHitSamplePaths = [
    'rhythmkeys/assets/audio/note_lane0.wav',
    'rhythmkeys/assets/audio/note_lane1.wav',
    'rhythmkeys/assets/audio/note_lane2.wav'
];
const BACKGROUND_MUSIC_PATH = 'rhythmkeys/assets/audio/rhythm_keys_bgm.ogg';
const NOTE_HIT_VOLUME = 0.2; // Adjusted based on previous feedback if piano was too loud
const BACKGROUND_MUSIC_VOLUME = 0.2;

let rhythmKeysParticles = [];
const RHYTHM_KEYS_PARTICLE_COUNT = 20;
const RHYTHM_KEYS_PARTICLE_LIFESPAN = 60;
const RHYTHM_KEYS_PARTICLE_SPEED_MAX = 4;


const RHYTHM_KEYS_LANE_COLORS_JS_HERO = ['#4CAF50', '#F44336', '#FFEB3B'];
const RHYTHM_KEYS_NOTE_COLORS_JS_HERO = ['#81C784', '#E57373', '#FFF176'];
const RHYTHM_KEYS_HIT_TARGET_ACTIVE_COLOR = '#FFFFFF';

const RHYTHM_KEYS_LANE_COLORS = RHYTHM_KEYS_LANE_COLORS_JS_HERO;
const RHYTHM_KEYS_NOTE_COLORS = RHYTHM_KEYS_NOTE_COLORS_JS_HERO;
const RHYTHM_KEYS_HIT_ZONE_COLOR = '#ffffff';
const RHYTHM_KEYS_TEXT_COLOR = '#ffffff';

let rhythmKeysScore = { hits: 0, spawned: 0 };
let rhythmKeysCurrentSong = null;
let rhythmKeysSongTitleElement = null;
let rhythmKeysScoreElement = null;
let rhythmKeysActiveNotes = [];
let rhythmKeysLaneActive = [false, false, false];
let currentRhythmKeyForces = [0, 0, 0];

const RHYTHM_KEYS_SAMPLE_SONG = { /* ... (song data remains the same) ... */
    title: "Demo Song (Sized Keys & Targets)",
    bpm: 120,
    notes: [
        { time: 2000, lane: 1 }, { time: 3000, lane: 0 }, { time: 4000, lane: 2 }, { time: 5000, lane: 1 },
        { time: 6000, lane: 0 }, { time: 6800, lane: 2 }, { time: 7600, lane: 1 }, { time: 8400, lane: 0 }, { time: 9200, lane: 2 },
        { time: 10200, lane: 0 }, { time: 10200, lane: 1 }, { time: 11500, lane: 1 }, { time: 11500, lane: 2 },
        { time: 12500, lane: 0 }, { time: 13300, lane: 2 }, { time: 14100, lane: 1 },
        { time: 15200, lane: 0 }, { time: 15200, lane: 2 }, { time: 16300, lane: 1 },
        { time: 17300, lane: 0 }, { time: 18100, lane: 2 }, { time: 18900, lane: 0 },
        { time: 20000, lane: 1 }, { time: 20800, lane: 0 }, { time: 20800, lane: 2 }, { time: 21800, lane: 1 },
        { time: 22800, lane: 0 }, { time: 23600, lane: 2 }, { time: 24400, lane: 1 }, { time: 25300, lane: 2 },
        { time: 27000, lane: 0 }, { time: 27800, lane: 1 }, { time: 28600, lane: 2 },
        { time: 29500, lane: 1 }, { time: 30200, lane: 0 }, { time: 30900, lane: 2 },
        { time: 31700, lane: 1 }, { time: 31700, lane: 0 }, { time: 32500, lane: 1 }
    ]
};
let rhythmKeysSongStartTime = 0;
let rhythmKeysNextNoteIndex = 0;

// --- Game Functions ---

function initRhythmKeys() {
    // ... (remains the same)
    console.log("Rhythm Keys: Initializing...");
    rhythmKeysCanvas = document.getElementById('rhythmKeysCanvas');
    rhythmKeysSongTitleElement = document.getElementById('rhythmKeysSongTitle');
    rhythmKeysScoreElement = document.getElementById('rhythmKeysScore');

    if (rhythmKeysCanvas) {
        rhythmKeysCtx = rhythmKeysCanvas.getContext('2d');
    } else {
        console.error("Rhythm Keys: Canvas element not found!");
        return;
    }
    loadBackgroundMusic();
    loadNoteHitSamples();
}

function startRhythmKeysGame() {
    // ... (remains the same)
    rhythmKeysForceTrace = [];
    window.rhythmKeysForceTrace = rhythmKeysForceTrace;
    if (!rhythmKeysCanvas || !rhythmKeysCtx) {
        console.error("Rhythm Keys: Cannot start, canvas not initialized.");
        if (!rhythmKeysCanvas) initRhythmKeys();
        if (!rhythmKeysCanvas || !rhythmKeysCtx) return;
    }

    console.log("Rhythm Keys: Starting game...");
    isRhythmKeysGameActive = true;
    rhythmKeysScore = { hits: 0, spawned: 0 };

    // --- ADDED: Reset notification system ---
    rhythmKeysNotifications = [];
    rhythmKeysComboCount = 0;
    rhythmKeysLastHitTime = 0;

    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log("AudioContext initialized.");
        } catch (e) {
            console.error("Web Audio API is not supported in this browser", e);
        }
    }

    if (backgroundMusic && backgroundMusic.readyState >= 2) {
        backgroundMusic.currentTime = 0;
        backgroundMusic.loop = true;
        backgroundMusic.volume = BACKGROUND_MUSIC_VOLUME;
        backgroundMusic.play().catch(e => console.error("Error playing background music:", e));
    } else if (backgroundMusic) {
        console.log("Background music not ready, will play when loaded.");
    }

    rhythmKeysActiveNotes = [];
    rhythmKeysNextNoteIndex = 0;
    rhythmKeysCurrentSong = RHYTHM_KEYS_SAMPLE_SONG;
    window.rhythmKeysCurrentSong = rhythmKeysCurrentSong;
    rhythmKeysSongStartTime = Date.now();

    if (rhythmKeysSongTitleElement) rhythmKeysSongTitleElement.textContent = rhythmKeysCurrentSong.title;
    if (rhythmKeysScoreElement) rhythmKeysScoreElement.textContent = `Hits: ${rhythmKeysScore.hits} / Spawned: ${rhythmKeysScore.spawned}`;

    if (rhythmKeysAnimationId) cancelAnimationFrame(rhythmKeysAnimationId);
    gameLoopRhythmKeys();
}

function stopRhythmKeysGame() {
    // ... (remains the same)
    console.log("Rhythm Keys: Stopping game...");
    isRhythmKeysGameActive = false;
    if (rhythmKeysAnimationId) {
        cancelAnimationFrame(rhythmKeysAnimationId);
        rhythmKeysAnimationId = null;
    }
    if (backgroundMusic) {
        backgroundMusic.pause();
    }
    if (rhythmKeysCtx && rhythmKeysCanvas) {
        rhythmKeysCtx.clearRect(0, 0, rhythmKeysCanvas.width, rhythmKeysCanvas.height);
        rhythmKeysCtx.fillStyle = RHYTHM_KEYS_TEXT_COLOR;
        rhythmKeysCtx.font = "30px Arial";
        rhythmKeysCtx.textAlign = "center";
        rhythmKeysCtx.fillText("Game Over", rhythmKeysCanvas.width / 2, rhythmKeysCanvas.height / 2);
        rhythmKeysCtx.fillText(`Score: ${rhythmKeysScore.hits} / ${rhythmKeysScore.spawned}`, rhythmKeysCanvas.width / 2, rhythmKeysCanvas.height / 2 + 40);
    }
}

function gameLoopRhythmKeys() {
    // ... (remains the same)
    if (!isRhythmKeysGameActive) return;
    updateRhythmKeysLogic();
    drawRhythmKeysGame();
    rhythmKeysGlobalTime += 1;
    rhythmKeysAnimationId = requestAnimationFrame(gameLoopRhythmKeys);
}

function updateRhythmKeysLogic() {
    // ... (remains the same, including note spawning and movement)
    const currentTime = Date.now() - rhythmKeysSongStartTime;

    // 1. Spawn new notes
    if (rhythmKeysCurrentSong && rhythmKeysNextNoteIndex < rhythmKeysCurrentSong.notes.length) {
        const nextNoteData = rhythmKeysCurrentSong.notes[rhythmKeysNextNoteIndex];
        const travelDurationMs = (RHYTHM_KEYS_HIT_ZONE_Y / RHYTHM_KEYS_NOTE_SPEED / 60) * 1000;

        if (currentTime >= (nextNoteData.time - travelDurationMs)) {
            const timeUntilHit = nextNoteData.time - currentTime;
            const startY = RHYTHM_KEYS_HIT_ZONE_Y - RHYTHM_KEYS_NOTE_SPEED * (timeUntilHit / (1000 / 60));
            const sizeFactor = RHYTHM_KEYS_NOTE_MIN_SIZE_FACTOR + Math.random() * (RHYTHM_KEYS_NOTE_MAX_SIZE_FACTOR - RHYTHM_KEYS_NOTE_MIN_SIZE_FACTOR);

            rhythmKeysActiveNotes.push({
                lane: nextNoteData.lane, y: startY, spawnTime: currentTime,
                missed: false, alpha: 1.0, sizeFactor: sizeFactor
            });
            rhythmKeysScore.spawned++;
            if (rhythmKeysScoreElement) rhythmKeysScoreElement.textContent = `Hits: ${rhythmKeysScore.hits} / Spawned: ${rhythmKeysScore.spawned}`;
            rhythmKeysNextNoteIndex++;
        }
    }

    const HIT_WINDOW_RADIUS_FOR_MISS_CHECK = RHYTHM_KEYS_NOTE_HEIGHT / 2;
    for (let i = rhythmKeysActiveNotes.length - 1; i >= 0; i--) {
        let note = rhythmKeysActiveNotes[i];
        note.y += RHYTHM_KEYS_NOTE_SPEED;
        if (note.y > RHYTHM_KEYS_HIT_ZONE_Y + HIT_WINDOW_RADIUS_FOR_MISS_CHECK + (RHYTHM_KEYS_NOTE_HEIGHT * 1.5) ) {
            if (!note.missed) {
                note.missed = true;
                note.alpha = 1.0;
            }
        }
        if (note.missed) {
            note.alpha -= 0.05;
            if (note.alpha <= 0) {
                rhythmKeysActiveNotes.splice(i, 1);
            }
        }
    }
    updateParticles();
    
    // --- ADDED: Update notifications ---
    updateNotifications();
}

function drawRhythmKeysGame() {
    if (!rhythmKeysCtx || !rhythmKeysCanvas) return;
    drawDynamicBackground();

    const totalLanesWidth = RHYTHM_KEYS_NUM_LANES * RHYTHM_KEYS_LANE_WIDTH;
    const startX = (rhythmKeysCanvas.width - totalLanesWidth) / 2;

    // Draw Fretboard Illusion (unchanged)
    rhythmKeysCtx.strokeStyle = '#555555';
    rhythmKeysCtx.lineWidth = 2;
    const numFrets = 10;
    for (let i = 0; i <= numFrets; i++) {
        const y = RHYTHM_KEYS_HIT_ZONE_Y - (RHYTHM_KEYS_HIT_ZONE_Y * (Math.pow(i / numFrets, 2))) * 0.8;
        if (y < 0) break;
        rhythmKeysCtx.beginPath();
        rhythmKeysCtx.moveTo(startX, y);
        rhythmKeysCtx.lineTo(startX + totalLanesWidth, y);
        rhythmKeysCtx.stroke();
    }
    rhythmKeysCtx.lineWidth = 4;
    for (let i = 0; i < RHYTHM_KEYS_NUM_LANES; i++) {
        const laneCenterX = startX + i * RHYTHM_KEYS_LANE_WIDTH + RHYTHM_KEYS_LANE_WIDTH / 2;
        rhythmKeysCtx.strokeStyle = RHYTHM_KEYS_LANE_COLORS[i];
        rhythmKeysCtx.globalAlpha = 0.6;
        rhythmKeysCtx.beginPath();
        rhythmKeysCtx.moveTo(laneCenterX, 0);
        rhythmKeysCtx.lineTo(laneCenterX, rhythmKeysCanvas.height);
        rhythmKeysCtx.stroke();
        rhythmKeysCtx.globalAlpha = 1.0;
    }

    // --- MODIFIED: Draw Hit Zone Targets with Force Scaling ---
    const keyLabels = ['A', 'S', 'D'];
    for (let i = 0; i < RHYTHM_KEYS_NUM_LANES; i++) {
        const laneCenterX = startX + i * RHYTHM_KEYS_LANE_WIDTH + RHYTHM_KEYS_LANE_WIDTH / 2;
        
        let targetFillStyle = RHYTHM_KEYS_LANE_COLORS[i];
        let targetAlpha = 0.7;
        let currentTargetRadius;

        const forceValue = currentRhythmKeyForces[i] || 0; // Normalized 0-1

        // Interpolate scale based on force:
        // When force is 0, scale is MIN_SCALE. When force is 1, scale is MAX_SCALE.
        const forceScale = RHYTHM_KEYS_TARGET_MIN_SCALE_ON_FORCE +
                           (forceValue * (RHYTHM_KEYS_TARGET_MAX_SCALE_ON_FORCE - RHYTHM_KEYS_TARGET_MIN_SCALE_ON_FORCE));
        
        currentTargetRadius = RHYTHM_KEYS_TARGET_BASE_RADIUS * forceScale;

        if (rhythmKeysLaneActive[i]) { // Lane is active (force met threshold)
            targetFillStyle = RHYTHM_KEYS_HIT_TARGET_ACTIVE_COLOR; 
            targetAlpha = 1.0;
            
            // Continuous pulse while key is held (applied on top of force scaling)
            const pulse = Math.sin(rhythmKeysGlobalTime * 0.25) * 2; // Subtle continuous pulse
            currentTargetRadius += pulse;
        }
        // Ensure radius doesn't become too small or negative from pulse
        currentTargetRadius = Math.max(currentTargetRadius, RHYTHM_KEYS_TARGET_BASE_RADIUS * 0.5);


        rhythmKeysCtx.beginPath();
        rhythmKeysCtx.globalAlpha = targetAlpha;
        rhythmKeysCtx.fillStyle = targetFillStyle;
        rhythmKeysCtx.arc(laneCenterX, RHYTHM_KEYS_HIT_ZONE_Y, currentTargetRadius, 0, Math.PI * 2);
        rhythmKeysCtx.fill();
        
        rhythmKeysCtx.strokeStyle = '#FFFFFF'; 
        rhythmKeysCtx.lineWidth = 2;
        rhythmKeysCtx.stroke();
        rhythmKeysCtx.globalAlpha = 1.0;

        // Draw key labels on targets
        // Adjust text color based on active state, similar to before
        rhythmKeysCtx.fillStyle = rhythmKeysLaneActive[i] ? '#333333' : '#FFFFFF';
        rhythmKeysCtx.font = 'bold 18px Arial'; // Consider scaling text if targets get very large
        rhythmKeysCtx.textAlign = 'center';
        rhythmKeysCtx.textBaseline = 'middle';
        rhythmKeysCtx.fillText(keyLabels[i], laneCenterX, RHYTHM_KEYS_HIT_ZONE_Y);
    }

    // --- REMOVED/COMMENTED OUT: Force Visualization Bars ---
    /*
    const forceBarMaxHeight = 40;
    const forceBarWidth = 20;
    const forceBarYOffset = RHYTHM_KEYS_TARGET_BASE_RADIUS + 15; // Adjusted to use new constant
    for (let i = 0; i < RHYTHM_KEYS_NUM_LANES; i++) {
        const laneCenterX = startX + i * RHYTHM_KEYS_LANE_WIDTH + RHYTHM_KEYS_LANE_WIDTH / 2;
        const forceValue = currentRhythmKeyForces[i] || 0;
        const barHeight = forceValue * forceBarMaxHeight;
        const barX = laneCenterX - forceBarWidth / 2;
        const barY = RHYTHM_KEYS_HIT_ZONE_Y + forceBarYOffset;

        rhythmKeysCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        rhythmKeysCtx.fillRect(barX, barY, forceBarWidth, forceBarMaxHeight);
        rhythmKeysCtx.fillStyle = RHYTHM_KEYS_LANE_COLORS[i];
        rhythmKeysCtx.fillRect(barX, barY + (forceBarMaxHeight - barHeight), forceBarWidth, barHeight);
        rhythmKeysCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        rhythmKeysCtx.lineWidth = 1;
        rhythmKeysCtx.strokeRect(barX, barY, forceBarWidth, forceBarMaxHeight);
    }
    */

    // Draw Active Notes (Gems) (unchanged)
    for (const note of rhythmKeysActiveNotes) {
        const laneCenterX = startX + note.lane * RHYTHM_KEYS_LANE_WIDTH + RHYTHM_KEYS_LANE_WIDTH / 2;
        const pulseFactor = 1 + Math.sin(rhythmKeysGlobalTime * 0.1 + note.y * 0.05) * RHYTHM_KEYS_NOTE_PULSE_SCALE;
        const currentNoteDisplayRadius = RHYTHM_KEYS_NOTE_RADIUS * note.sizeFactor * pulseFactor;

        rhythmKeysCtx.beginPath();
        rhythmKeysCtx.arc(laneCenterX, note.y, currentNoteDisplayRadius, 0, Math.PI * 2);
        const gradient = rhythmKeysCtx.createRadialGradient(
            laneCenterX - currentNoteDisplayRadius * 0.3, note.y - currentNoteDisplayRadius * 0.3,
            currentNoteDisplayRadius * 0.1, laneCenterX, note.y, currentNoteDisplayRadius
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.7, RHYTHM_KEYS_NOTE_COLORS[note.lane]);
        gradient.addColorStop(1, RHYTHM_KEYS_LANE_COLORS[note.lane]);
        rhythmKeysCtx.fillStyle = gradient;
        if (note.missed) rhythmKeysCtx.globalAlpha = note.alpha;
        rhythmKeysCtx.fill();
        rhythmKeysCtx.globalAlpha = 1.0;
        rhythmKeysCtx.strokeStyle = RHYTHM_KEYS_LANE_COLORS[note.lane]; 
        rhythmKeysCtx.lineWidth = 2;
        rhythmKeysCtx.stroke();
    }

    drawParticles();
    
    // --- ADDED: Draw encouraging notifications on top ---
    drawNotifications();
}

window.rhythmGameProcessInputs = function(forcesArray, threshold) {
    // ... (logic remains the same)
    if (isRhythmKeysGameActive) {
        const currentTime = Date.now() - rhythmKeysSongStartTime;
        if (Array.isArray(forcesArray)) {
            rhythmKeysForceTrace.push({
                time: currentTime,
                pressure: [...forcesArray]
            });
        }
    }

    if (!isRhythmKeysGameActive || !Array.isArray(forcesArray)) {
        for (let i = 0; i < RHYTHM_KEYS_NUM_LANES; i++) {
            rhythmKeysLaneActive[i] = false;
        }
        currentRhythmKeyForces = [0,0,0];
        return;
    }

    currentRhythmKeyForces = [
        forcesArray[0] || 0,
        forcesArray[1] || 0,
        forcesArray[2] || 0
    ];

    const HIT_WINDOW_RADIUS = RHYTHM_KEYS_NOTE_HEIGHT / 2; 

    for (let i = 0; i < RHYTHM_KEYS_NUM_LANES; i++) {
        const forceForLane = currentRhythmKeyForces[i];
        // Check if force meets the *base* threshold for activating the lane visually
        const laneIsVisuallyActive = forceForLane >= threshold; 
        rhythmKeysLaneActive[i] = laneIsVisuallyActive;

        if (laneIsVisuallyActive) { // Only attempt hits if lane visually active 
            for (let noteIdx = rhythmKeysActiveNotes.length - 1; noteIdx >= 0; noteIdx--) {
                const note = rhythmKeysActiveNotes[noteIdx];
                if (note.lane === i && !note.missed) {
                    if (Math.abs(note.y - RHYTHM_KEYS_HIT_ZONE_Y) <= HIT_WINDOW_RADIUS) {
                        const requiredForceForThisNote = threshold * note.sizeFactor;
                        if (forceForLane >= requiredForceForThisNote) {
                            // console.log(`Rhythm Keys: Hit in lane ${i} (size ${note.sizeFactor.toFixed(2)}, force ${forceForLane.toFixed(2)} >= ${requiredForceForThisNote.toFixed(2)})`);
                            rhythmKeysScore.hits++;
                            if (rhythmKeysScoreElement) rhythmKeysScoreElement.textContent = `Hits: ${rhythmKeysScore.hits} / Spawned: ${rhythmKeysScore.spawned}`;
                            
                            // --- ADDED: Create encouraging notification ---
                            createEncouragingNotification(0, 0, forceForLane); // Position parameters no longer used
                            
                            rhythmKeysActiveNotes.splice(noteIdx, 1);
                            // playNoteSound(i); Piano sound is not appropiate
                            showHitEffect(i);
                            break; 
                        }
                    }
                }
            }
        }
    }
};

function playNoteSound(laneIndex) {
    // ... (remains the same)
    if (!audioContext || laneIndex < 0 || laneIndex >= noteHitSamples.length) return;
    const sourceBuffer = noteHitSamples[laneIndex];
    if (!sourceBuffer) {
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
}

function playOscillatorFallback(laneIndex) {
    // ... (remains the same)
    if (!audioContext) return;
    const fallbackFrequencies = [261.63, 329.63, 392.00];
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(fallbackFrequencies[laneIndex], audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.25);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.25);
    console.log("Rhythm Keys: Playing FALLBACK oscillator for lane " + laneIndex);
}

function showHitEffect(laneIndex) {
    // ... (remains the same, flash effect adjusted slightly)
    if (rhythmKeysCtx) {
        const totalLanesWidth = RHYTHM_KEYS_NUM_LANES * RHYTHM_KEYS_LANE_WIDTH;
        const startX = (rhythmKeysCanvas.width - totalLanesWidth) / 2;
        const laneCenterX = startX + laneIndex * RHYTHM_KEYS_LANE_WIDTH + RHYTHM_KEYS_LANE_WIDTH / 2;
        createParticles(laneCenterX, RHYTHM_KEYS_HIT_ZONE_Y, RHYTHM_KEYS_LANE_COLORS[laneIndex]);

        rhythmKeysCtx.fillStyle = 'rgba(255, 255, 224, 0.75)';
        rhythmKeysCtx.beginPath();
        // Flash radius based on the TARGET_BASE_RADIUS for consistency
        rhythmKeysCtx.arc(laneCenterX, RHYTHM_KEYS_HIT_ZONE_Y, RHYTHM_KEYS_TARGET_BASE_RADIUS * 1.6, 0, Math.PI * 2);
        rhythmKeysCtx.fill();
    }
}

// ... (drawRoundedRect, drawDynamicBackground, createParticles, updateParticles, drawParticles, loadBackgroundMusic, loadNoteHitSamples remain the same) ...
function drawRoundedRect(ctx, x, y, width, height, radius) { 
    if (typeof radius === 'undefined') { radius = 5;}
    if (typeof radius === 'number') { radius = {tl: radius, tr: radius, br: radius, bl: radius};} 
    else { var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0}; for (var side in defaultRadius) { radius[side] = radius[side] || defaultRadius[side];}}
    ctx.beginPath(); ctx.moveTo(x + radius.tl, y); ctx.lineTo(x + width - radius.tr, y);
    ctx.arcTo(x + width, y, x + width, y + radius.tr, radius.tr); ctx.lineTo(x + width, y + height - radius.br);
    ctx.arcTo(x + width, y + height, x + width - radius.br, y + height, radius.br); ctx.lineTo(x + radius.bl, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius.bl, radius.bl); ctx.lineTo(x, y + radius.tl);
    ctx.arcTo(x, y, x + radius.tl, y, radius.tl); ctx.closePath();
}
function drawDynamicBackground() { 
    if (!rhythmKeysCtx || !rhythmKeysCanvas) return;
    const bgGradient = rhythmKeysCtx.createLinearGradient(0, 0, 0, rhythmKeysCanvas.height);
    bgGradient.addColorStop(0, '#1c1c2e'); bgGradient.addColorStop(1, '#3a3a52'); 
    rhythmKeysCtx.fillStyle = bgGradient; rhythmKeysCtx.fillRect(0, 0, rhythmKeysCanvas.width, rhythmKeysCanvas.height);
    rhythmKeysCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 30; i++) {
        const x = Math.random() * rhythmKeysCanvas.width; const y = Math.random() * rhythmKeysCanvas.height * 0.7; 
        const r = Math.random() * 1.5;
        rhythmKeysCtx.beginPath(); rhythmKeysCtx.arc(x, y, r, 0, Math.PI * 2); rhythmKeysCtx.fill();
    }
}
function createParticles(x, y, color) { 
    for (let i = 0; i < RHYTHM_KEYS_PARTICLE_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2; const speed = Math.random() * RHYTHM_KEYS_PARTICLE_SPEED_MAX;
        rhythmKeysParticles.push({ x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            size: Math.random() * 3 + 2, color: color, life: RHYTHM_KEYS_PARTICLE_LIFESPAN, alpha: 1.0
        });
    }
}
function updateParticles() { 
    for (let i = rhythmKeysParticles.length - 1; i >= 0; i--) {
        const p = rhythmKeysParticles[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.05; 
        p.life--; p.alpha = Math.max(0, p.life / RHYTHM_KEYS_PARTICLE_LIFESPAN);
        if (p.life <= 0) rhythmKeysParticles.splice(i, 1);
    }
}
function drawParticles() { 
    if (!rhythmKeysCtx) return;
    for (const p of rhythmKeysParticles) {
        rhythmKeysCtx.globalAlpha = p.alpha; rhythmKeysCtx.fillStyle = p.color;
        rhythmKeysCtx.beginPath(); rhythmKeysCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2); rhythmKeysCtx.fill();
    }
    rhythmKeysCtx.globalAlpha = 1.0;
}
function loadBackgroundMusic() { 
    backgroundMusic = new Audio(BACKGROUND_MUSIC_PATH); backgroundMusic.loop = true; backgroundMusic.volume = BACKGROUND_MUSIC_VOLUME;
    backgroundMusic.addEventListener('canplaythrough', () => {
        console.log("Background music loaded and can play through.");
        if (isRhythmKeysGameActive && backgroundMusic.paused) {
            backgroundMusic.play().catch(e => console.error("Error playing background music post-load:", e));
        }
    });
    backgroundMusic.addEventListener('error', (e) => console.error("Error loading background music:", e));
    backgroundMusic.load();
}
function loadNoteHitSamples() { 
    if (!audioContext) {
        try { if (!(window.AudioContext || window.webkitAudioContext)) { console.warn("Web Audio API not supported, cannot load note samples."); return; }
            if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) { console.error("AudioContext could not be initialized for loading samples.", e); return; }
    }
    if (!audioContext) { console.warn("AudioContext still not available after trying to init. Cannot load samples."); return; }
    noteHitSamplePaths.forEach((path, index) => {
        fetch(path).then(response => { if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${path}`); return response.arrayBuffer(); })
            .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
            .then(audioBuffer => { noteHitSamples[index] = audioBuffer; /*console.log(`Loaded note sample for lane ${index}: ${path}`);*/ })
            .catch(error => { console.error(`Error loading note sample ${path}:`, error); noteHitSamples[index] = null; });
    });
}

// --- ADDED: Notification Functions ---
function createEncouragingNotification(x, y, forceValue) {
    const currentTime = Date.now();
    
    // Update combo tracking
    if (currentTime - rhythmKeysLastHitTime < RHYTHM_KEYS_COMBO_TIMEOUT) {
        rhythmKeysComboCount++;
    } else {
        rhythmKeysComboCount = 1;
    }
    rhythmKeysLastHitTime = currentTime;
    
    // --- MODIFIED: Only show notifications for special conditions ---
    let shouldShowNotification = false;
    let message;
    let color = '#FFD700'; // Gold color
    let scale = 1.0;
    
    if (rhythmKeysComboCount >= 3) {
        // Show notification for combos of 3 or more
        shouldShowNotification = true;
        const comboIndex = Math.min(rhythmKeysComboCount - 3, RHYTHM_KEYS_COMBO_MESSAGES.length - 1);
        message = RHYTHM_KEYS_COMBO_MESSAGES[comboIndex];
        color = '#FF4500'; // Orange-red for combos
        scale = 1.05; // Slightly larger for combos
    } else if (forceValue && forceValue > 0.8) {
        // Show notification for strong presses
        shouldShowNotification = true;
        message = "Strong Press!";
        color = '#00FF00'; // Green for strong presses
        scale = 1.03;
    } else if (rhythmKeysScore.hits % 5 === 0 && rhythmKeysScore.hits > 0) {
        // Show encouraging message every 5th hit
        shouldShowNotification = true;
        message = RHYTHM_KEYS_ENCOURAGING_MESSAGES[Math.floor(Math.random() * RHYTHM_KEYS_ENCOURAGING_MESSAGES.length)];
        scale = 1.02;
    }
    
    // Only create notification if conditions are met
    if (!shouldShowNotification) return;
    
    // --- MODIFIED: Position at top center of canvas ---
    const notification = {
        x: rhythmKeysCanvas.width / 2, // Center horizontally
        y: 80, // Fixed position near top
        message: message,
        color: color,
        alpha: 1.0,
        scale: scale,
        velocity: 0, // No movement, just fade
        life: 90, // Shorter lifespan (1.5 seconds)
        maxLife: 90
    };
    
    rhythmKeysNotifications.push(notification);
}

function updateNotifications() {
    for (let i = rhythmKeysNotifications.length - 1; i >= 0; i--) {
        const notification = rhythmKeysNotifications[i];
        
        // --- MODIFIED: Smoother animation with easing ---
        notification.life--;
        
        // Smooth fade with easing
        const lifeRatio = notification.life / notification.maxLife;
        
        // Smooth fade out using cubic easing - stay visible longer, then smooth fade
        if (lifeRatio > 0.3) {
            notification.alpha = 1.0;
        } else {
            // Smooth fade in last 30% of life using sine easing
            const fadeProgress = lifeRatio / 0.3;
            notification.alpha = Math.sin(fadeProgress * Math.PI * 0.5); // Smooth sine fade
        }
        
        // --- MODIFIED: Much smoother scale animation with sine easing ---
        const animationProgress = 1 - lifeRatio; // 0 to 1 as animation progresses
        
        // Smooth scale animation: gentle grow-in, stable hover, gentle shrink
        let targetScale;
        if (animationProgress < 0.15) {
            // Quick grow-in phase (first 15% of animation) with bounce
            const growProgress = animationProgress / 0.15;
            const easedGrow = 1 - Math.pow(1 - growProgress, 3); // Cubic ease-out for smooth entry
            targetScale = 0.7 + (notification.scale - 0.7) * easedGrow;
        } else if (animationProgress < 0.8) {
            // Stable phase with very gentle breathing using sine wave
            const breathePhase = (animationProgress - 0.15) / 0.65;
            const breathe = Math.sin(breathePhase * Math.PI * 4) * 0.015; // Very gentle breathing
            targetScale = notification.scale + breathe;
        } else {
            // Gentle shrink phase with smooth easing
            const shrinkProgress = (animationProgress - 0.8) / 0.2;
            const easedShrink = Math.sin(shrinkProgress * Math.PI * 0.5); // Smooth sine shrink
            targetScale = notification.scale * (1 - easedShrink * 0.08);
        }
        
        // Smooth interpolation to target scale for fluid animation
        notification.scale += (targetScale - notification.scale) * 0.2;
        
        // Add subtle floating effect with slower, more graceful movement
        const floatCycle = animationProgress * Math.PI * 1.5; // Slower cycle
        const floatOffset = Math.sin(floatCycle) * 3; // Gentle vertical float
        notification.y = 80 + floatOffset;
        
        // Remove expired notifications
        if (notification.life <= 0) {
            rhythmKeysNotifications.splice(i, 1);
        }
    }
    
    // Reset combo if too much time has passed since last hit
    if (Date.now() - rhythmKeysLastHitTime > RHYTHM_KEYS_COMBO_TIMEOUT) {
        rhythmKeysComboCount = 0;
    }
}

function drawNotifications() {
    if (!rhythmKeysCtx) return;
    
    rhythmKeysCtx.save();
    rhythmKeysCtx.textAlign = 'center';
    rhythmKeysCtx.textBaseline = 'middle';
    rhythmKeysCtx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    rhythmKeysCtx.shadowBlur = 4;
    rhythmKeysCtx.shadowOffsetX = 0;
    rhythmKeysCtx.shadowOffsetY = 2;
    
    for (const notification of rhythmKeysNotifications) {
        rhythmKeysCtx.globalAlpha = notification.alpha;
        rhythmKeysCtx.fillStyle = notification.color;
        
        // --- MODIFIED: Smaller, more subtle font size ---
        const fontSize = Math.round(20 * notification.scale);
        rhythmKeysCtx.font = `bold ${fontSize}px Arial`;
        
        rhythmKeysCtx.fillText(notification.message, notification.x, notification.y);
    }
    
    rhythmKeysCtx.restore();
}

window.startRhythmKeysGame = startRhythmKeysGame;
window.stopRhythmKeysGame = stopRhythmKeysGame;
window.initRhythmKeys = initRhythmKeys;

document.addEventListener('DOMContentLoaded', initRhythmKeys);