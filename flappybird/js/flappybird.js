/*
   Modified Flappy Bird for Hand Rehabilitation
   Original code by Nebez Briefkani
   https://github.com/nebez/floppybird/
   
   Modifications:
   - Reduced responsiveness for stroke patients
   - Connected to force sensor via spacebar
   - Slowed down game pace
   - Made pipes wider apart
   - Added configurable settings for therapists
*/

// Debug mode (turns on collision boxes)
var debugmode = true;

// Game states
var states = Object.freeze({
   SplashScreen: 0,
   GameScreen: 1,
   ScoreScreen: 2,
   SettingsScreen: 3
});

var currentstate;

// Game settings with defaults adjusted for stroke patients
var gameSettings = {
   // Physics settings
   gravity: 0.15,           // Reduced from 0.25
   jump: -3.6,              // Reduced from -4.6
   
   // Game difficulty settings
   pipeHeight: 160,         // Increased from 90/200 (This now represents the *gap* if two pipes were present)
   pipeInterval: 2100,      // Increased from 1400
   gameSpeed: 40,           // Frames per second (reduced from 60)
   controlMode: 'jump',     // 'jump' or 'gravity'
   forceInfluenceFactor: -0.3, // How much normalized force counters gravity (negative value)
   
   // Force settings
   minForceEffect: 0.5,     // Minimum jump multiplier at 0% force (Only used in 'jump' mode with older force logic)
   maxForceEffect: 1.5,     // Maximum jump multiplier at 100% force
   
   // Preset difficulty levels
   difficultyPresets: {
      veryEasy: { gravity: 0.1, jump: -3.0, pipeHeight: 200, pipeInterval: 2500, gameSpeed: 30 },
      easy: { gravity: 0.15, jump: -3.6, pipeHeight: 160, pipeInterval: 2100, gameSpeed: 40 },
      medium: { gravity: 0.2, jump: -4.0, pipeHeight: 130, pipeInterval: 1700, gameSpeed: 50 },
      hard: { gravity: 0.25, jump: -4.6, pipeHeight: 90, pipeInterval: 1400, gameSpeed: 60 }
   }
};

// Game control mode setting (will be updated from gameSettings)
var controlMode = gameSettings.controlMode; 

// Current game variables
var gravity = gameSettings.gravity;
var velocity = 0;
var position = 180;
var rotation = 0;
var jump = gameSettings.jump;
var flyArea = null;

var score = 0;

// Pipe settings
var pipeheight = gameSettings.pipeHeight;
var pipewidth = 52;

var replayclickable = false;

// Game loops
var loopGameloop;

// --- Track the single active pipe obstacle ---
var currentObstaclePipe = null;
// --- NEW: Track the pipe just passed ---
var passedPipe = null; 

// Initialize the game once document is ready
$(document).ready(function() {
   // Set up the game when the flappy bird play button is clicked
   $("#playFlappyBird").click(function() {
      $("#flappyBirdGame").show();
      
      // Check if settings panel exists, create if not
      if ($("#gameSettingsPanel").length === 0) {
         createSettingsPanel();
      }
      
      // Show settings first
      showSettings();
   });
   
   // Close button
   $("#closeFlappyBird").click(function() {
      $("#flappyBirdGame").hide();
      
      // Clean up game loops
      clearInterval(loopGameloop);
      
      // Clear any pending pipe generation timeout
      clearTimeout(pipeGenerationTimeout); 
      pipeGenerationTimeout = null;
      
      // Reset game elements
      $(".pipe").remove();
      $("#splash").transition({ opacity: 1 }, 10);
      $("#player").css({ y: 0, x: 0 });
   });
});

// Create settings panel
function createSettingsPanel() {
   // Create the settings panel
   var settingsPanel = $('<div id="gameSettingsPanel" class="game-settings-panel"></div>');
   
   // --- Control Mode Selection ---
   var controlModeDiv = $('<div class="settings-section"><h3>Control Mode</h3></div>');
   var controlRadioGroup = $('<div class="control-mode-group"></div>');
   
   controlRadioGroup.append(`
      <label>
         <input type="radio" name="controlMode" value="jump" ${gameSettings.controlMode === 'jump' ? 'checked' : ''}>
         Jump Threshold (Tap/Force Spike)
      </label>
   `);
   controlRadioGroup.append(`
      <label>
         <input type="radio" name="controlMode" value="gravity" ${gameSettings.controlMode === 'gravity' ? 'checked' : ''}>
         Force Control (Sustained Force Lifts)
      </label>
   `);
   
   controlModeDiv.append(controlRadioGroup);
   settingsPanel.append(controlModeDiv);
   
   // Create header
   settingsPanel.append('<h2>Game Settings</h2>');
   settingsPanel.append('<p class="settings-description">Adjust difficulty</p>');
   
   // Create difficulty presets
   var presetDiv = $('<div class="settings-section"><h3>Difficulty Presets</h3></div>');
   var presetButtons = $('<div class="preset-buttons"></div>');
   
   // Add preset buttons
   $.each(gameSettings.difficultyPresets, function(key, preset) {
      var buttonName = key.charAt(0).toUpperCase() + key.slice(1);
      var button = $('<button class="preset-btn" data-preset="' + key + '">' + buttonName + '</button>');
      presetButtons.append(button);
   });
   
   presetDiv.append(presetButtons);
   settingsPanel.append(presetDiv);
   
   // Create custom settings sliders
   var customSettings = $('<div class="settings-section"><h3>Custom Settings</h3></div>');
   
   // Gravity slider
   customSettings.append(createSlider('gravity', 'Gravity', gameSettings.gravity, 0.05, 0.3, 0.01));
   
   // Jump power slider
   customSettings.append(createSlider('jump', 'Jump Power', Math.abs(gameSettings.jump), 2.0, 5.0, 0.1, true));
   
   // Pipe height slider
   customSettings.append(createSlider('pipeHeight', 'Pipe Gap Size', gameSettings.pipeHeight, 80, 220, 10));
   
   // Pipe interval slider
   customSettings.append(createSlider('pipeInterval', 'Pipe Interval', gameSettings.pipeInterval, 1000, 3000, 100));
   
   // Game speed slider
   customSettings.append(createSlider('gameSpeed', 'Game Speed', gameSettings.gameSpeed, 20, 60, 5));
   
   settingsPanel.append(customSettings);
   
   // Start game button
   settingsPanel.append('<button id="startGameBtn" class="start-game-btn">Start Game</button>');
   
   // Add the settings panel to the game container
   $("#flappyBirdGame").append(settingsPanel);
   
   // Set up event handlers for preset buttons
   $(".preset-btn").click(function() {
      var presetKey = $(this).data('preset');
      var preset = gameSettings.difficultyPresets[presetKey];
      
      // Update sliders with preset values
      $("#gravity-slider").val(preset.gravity);
      $("#gravity-value").text(preset.gravity.toFixed(2));
      
      $("#jump-slider").val(Math.abs(preset.jump));
      $("#jump-value").text(Math.abs(preset.jump).toFixed(1));
      
      $("#pipeHeight-slider").val(preset.pipeHeight);
      $("#pipeHeight-value").text(preset.pipeHeight);
      
      $("#pipeInterval-slider").val(preset.pipeInterval);
      $("#pipeInterval-value").text(preset.pipeInterval + 'ms');
      
      $("#gameSpeed-slider").val(preset.gameSpeed);
      $("#gameSpeed-value").text(preset.gameSpeed + ' FPS');
      
      // Highlight active preset
      $(".preset-btn").removeClass('active');
      $(this).addClass('active');
   });
   
   // Start game button handler
   $("#startGameBtn").click(function() {
      // Save settings from sliders
      gameSettings.gravity = parseFloat($("#gravity-slider").val());
      gameSettings.jump = -parseFloat($("#jump-slider").val()); // Negative for upward movement
      gameSettings.pipeHeight = parseInt($("#pipeHeight-slider").val());
      gameSettings.pipeInterval = parseInt($("#pipeInterval-slider").val());
      gameSettings.gameSpeed = parseInt($("#gameSpeed-slider").val());
      gameSettings.controlMode = $('input[name="controlMode"]:checked').val(); // Read selected control mode
      
      // Update game variables with new settings
      gravity = gameSettings.gravity;
      jump = gameSettings.jump;
      pipeheight = gameSettings.pipeHeight;
      controlMode = gameSettings.controlMode; // Update global control mode variable
      
      // Hide settings panel and initialize game
      $("#gameSettingsPanel").hide();
      initializeGame();
   });
}

// Helper function to create sliders
function createSlider(settingName, displayName, defaultValue, min, max, step, isNegative = false) {
   var container = $('<div class="setting-item"></div>');
   
   var label = $('<label for="' + settingName + '-slider">' + displayName + ': </label>');
   var valueDisplay = $('<span id="' + settingName + '-value">' + 
      (isNegative ? Math.abs(defaultValue).toFixed(1) : 
         (typeof defaultValue === 'number' && defaultValue % 1 !== 0 ? 
            defaultValue.toFixed(2) : defaultValue + (settingName === 'gameSpeed' ? ' FPS' : 
                                       settingName === 'pipeInterval' ? 'ms' : ''))) + 
      '</span>');
   
   container.append(label).append(valueDisplay);
   
   var slider = $('<input type="range" id="' + settingName + '-slider" ' +
                  'min="' + min + '" max="' + max + '" step="' + step + '" ' +
                  'value="' + (isNegative ? Math.abs(defaultValue) : defaultValue) + '">');
   
   // Update value display when slider changes
   slider.on('input', function() {
      var value = parseFloat($(this).val());
      if (settingName === 'gameSpeed') {
         $("#" + settingName + "-value").text(value + ' FPS');
      } else if (settingName === 'pipeInterval') {
         $("#" + settingName + "-value").text(value + 'ms');
      } else if (value % 1 !== 0) {
         // Show decimals for non-integer values
         $("#" + settingName + "-value").text(value.toFixed(step < 1 ? 2 : 1));
      } else {
         $("#" + settingName + "-value").text(value);
      }
   });
   
   container.append(slider);
   return container;
}

// Show settings panel
function showSettings() {
   currentstate = states.SettingsScreen;
   $("#gameSettingsPanel").show();
   
   // Reset settings to defaults
   $("#gravity-slider").val(gameSettings.gravity);
   $("#jump-slider").val(Math.abs(gameSettings.jump));
   $("#pipeHeight-slider").val(gameSettings.pipeHeight);
   $("#pipeInterval-slider").val(gameSettings.pipeInterval);
   $("#gameSpeed-slider").val(gameSettings.gameSpeed);
   
   // Remove preset highlight
   $(".preset-btn").removeClass('active');
   
   // Highlight the easy preset by default
   $('[data-preset="easy"]').addClass('active');
}

function initializeGame() {
   // Set the fly area height
   flyArea = $("#flyarea").height();
   
   // Start with the splash screen
   showSplash();
   
   // Set up input handlers
   setInputHandlers();
}

function setInputHandlers() {
   // Keyboard controls
   $(document).keydown(function(e) {
      // Use spacebar - linked to force sensor OR direct control in jump mode
      if(e.keyCode == 32) {
         if(currentstate == states.ScoreScreen) {
            // On score screen, spacebar restarts the game
            $("#replay").click();
         }
         // Start game or jump ONLY if in jump mode
         else if (controlMode === 'jump') {
             if(currentstate == states.SplashScreen) {
                 // On splash screen, spacebar starts the game
                 startGame();
             }
             else if(currentstate == states.GameScreen) {
                 // In game, spacebar makes the bird jump
                 playerJump(); 
             }
         } 
         // In gravity mode, spacebar might be needed to start from splash/score, but doesn't control flight
         else if (currentstate == states.SplashScreen && controlMode === 'gravity') {
              startGame();
         }
         
         // Prevent default spacebar scroll
         e.preventDefault(); 
      }
   });
   
   // Mouse/touch controls
   $("#gamescreen").click(function(e) {
      e.preventDefault();
      // Start game or jump ONLY if in jump mode
      if (controlMode === 'jump') {
          if(currentstate == states.GameScreen) {
              playerJump();
          }
          else if(currentstate == states.SplashScreen) {
              startGame();
          }
      } 
      // In gravity mode, click might be needed to start from splash
      else if (currentstate == states.SplashScreen && controlMode === 'gravity') {
           startGame();
      }
   });
   
   // Replay button click
   $("#replay").click(function() {
      if(!replayclickable)
         return;
      else {
         replayclickable = false;
         showSplash();
      }
   });
}

function showSplash() {
   currentstate = states.SplashScreen;
   
   // Reset game variables
   velocity = 0;
   position = 180;
   rotation = 0;
   score = 0;
   currentObstaclePipe = null; // Reset active pipe
   passedPipe = null; // Reset passed pipe
   
   // Update the player in preparation for the next game
   $("#player").css({ y: 0, x: 0 });
   updatePlayer($("#player"), 0); // Pass initial zero force for gravity mode reset
   
   // Clear out all the pipes if there are any
   $(".pipe").remove();
   
   // Make everything animated again
   $(".animated").css('animation-play-state', 'running');
   $(".animated").css('-webkit-animation-play-state', 'running');
   
   // Fade in the splash
   $("#splash").transition({ opacity: 1 }, 2000, 'ease');
}

function startGame() {
   currentstate = states.GameScreen;
   
   // Fade out the splash
   $("#splash").stop();
   $("#splash").transition({ opacity: 0 }, 500, 'ease');
   
   // Update the big score
   setBigScore();
   
   // Debug mode?
   if(debugmode) {
      // Show the bounding boxes
      $(".boundingbox").show();
   }

   // Start up our loops
   var updaterate = 1000.0 / gameSettings.gameSpeed; // Use the configurable game speed
   loopGameloop = setInterval(gameloop, updaterate);
   // Don't start pipe loop interval, schedule the first pipe instead
   currentObstaclePipe = null; // Ensure it's null before creating
   updatePipes(); 
   
   // Jump from the start only in jump mode
   if (controlMode === 'jump') {
       playerJump();
   }
   // In gravity mode, the bird starts falling based on initial force/gravity
}

function screenClick() {
   // Only allow screen click jump in 'jump' mode
   if(currentstate == states.GameScreen && controlMode === 'jump') {
       playerJump();
   }
}

window.flappyGameJump = function() {
   // External trigger function - only active in 'jump' mode
   if (controlMode === 'jump') {
       if(currentstate == states.GameScreen) {
           playerJump();
       } else if (currentstate == states.SplashScreen) {
           startGame();
       }
   } else {
       // If in gravity mode and splash screen, start the game (force might trigger this)
       if (currentstate == states.SplashScreen) {
            startGame();
       }
   }
};
function playerJump() {
   // Only allow jump logic in 'jump' mode
   if (controlMode !== 'jump') return;
   
   velocity = jump;
   
   // No need for additional jump animation as bird is already animated with infinite animation
   $("#player").stop();
   // Animation is handled by CSS now via the .bird class
}

function setBigScore(erase) {
   var elemscore = $("#bigscore");
   elemscore.empty();
   
   if(erase)
      return;
   
   var digits = score.toString().split('');
   for(var i = 0; i < digits.length; i++)
      elemscore.append("<div class='bignum'>" + digits[i] + "</div>");
}

function gameloop() {
   var player = $("#player");
   
   // --- Update Velocity based on Control Mode ---
   if (controlMode === 'gravity') {
        // Use the global force value (updated by script.js)
        const currentForce = window.latestNormalizedForce || 0; 
        // Force counters gravity. Higher force means less downward acceleration (or even upward if forceInfluenceFactor is strong enough)
        velocity += gravity + (currentForce * gameSettings.forceInfluenceFactor); 
        // Optional: Add a cap to upward velocity from force?
        // velocity = Math.max(velocity, some_max_upward_velocity); 
   } else { // 'jump' mode (original logic)
        velocity += gravity;
   }
   
   // --- Update Position ---
   position += velocity;
   
   // Update the player position
   updatePlayer(player, controlMode === 'gravity' ? (window.latestNormalizedForce || 0) : velocity); // Pass force or velocity for rotation logic
   
   // --- Simplified and More Reliable Bounding Box --- 
   // Directly use the axis-aligned bounding box provided by the browser for the rotated element.
   var playerElement = $("#player");
   var birdOffset = playerElement.offset(); 
   var birdWidth = playerElement.width();   // Note: .width() might not account for rotation transforms perfectly
   var birdHeight = playerElement.height(); // Note: .height() might not account for rotation transforms perfectly
   // GetBoundingClientRect *does* account for transform, let's use its dimensions but with the offset top/left
   var birdRect = playerElement[0].getBoundingClientRect(); // Get dimensions considering transform
   var boxLeft = birdOffset.left;
   var boxTop = birdOffset.top;
   // Using birdRect.width/height is better as it reflects the transformed size
   var boxRight = birdOffset.left + birdRect.width; 
   var boxBottom = birdOffset.top + birdRect.height;
   
   // Update our debug bounding box
   if(debugmode) {
      var boundingbox = $("#playerbox");
      boundingbox.css('left', boxLeft + "px");
      boundingbox.css('top', boxTop + "px");
      boundingbox.css('width', birdRect.width + "px"); // Use actual width from getBoundingClientRect
      boundingbox.css('height', birdRect.height + "px"); // Use actual height from getBoundingClientRect
   }
   
   // Check for ceiling collision
   var flyAreaTopOffset = $("#flyarea").offset().top;
   // --- DEBUG LOGGING for Ceiling ---
   if (debugmode) {
       console.log(`Ceiling Check: BirdTop=${boxTop.toFixed(0)}, FlyAreaTop=${flyAreaTopOffset.toFixed(0)}`);
   }
   // --- END DEBUG LOGGING ---
   if(boxTop <= flyAreaTopOffset) { 
       playerDead();
       return;
   }
   
   // Check for floor collision
   // Compare document-relative bottom to the land's document-relative top
   var flyAreaBottomOffset = flyAreaTopOffset + $("#flyarea").height();
   var landTopOffset = $("#land").offset().top;
   // --- DEBUG LOGGING for Floor ---
   if (debugmode) {
       console.log(`Floor Check: BirdBottom=${boxBottom.toFixed(0)}, LandTop=${landTopOffset.toFixed(0)}, FlyAreaBottom=${flyAreaBottomOffset.toFixed(0)}`);
   }
   // --- END DEBUG LOGGING ---
   if(boxBottom >= landTopOffset || boxBottom >= flyAreaBottomOffset ) { 
       position = 0;
       playerDead();
       return;
   }
   
   // Check for pipe collision
   var hitpipe = false;
   var currentPipes = $(".pipe"); // Get current pipes on screen
   
   // --- REVISED PIPE LOGIC: Check only the active obstacle --- 
   if (currentObstaclePipe) { 
      var pipe = currentObstaclePipe; // Reference the active pipe
      var pipeOffset = pipe.offset(); // Use offset for COLLISION calculation (document relative)
      var pipeRect = pipe[0].getBoundingClientRect(); // Use getBoundingClientRect for OFF-SCREEN check (viewport relative)
      
      // Check if pipe is off-screen using viewport-relative position
      if (pipeRect && pipeRect.left <= -pipewidth) { 
          pipe.remove(); // Remove from DOM
          // ---> DEBUG LOGGING <--- 
          if(debugmode) console.log(`Pipe ${pipe.attr('data-pipe-id')} removed (off-screen at rect.left=${pipeRect.left.toFixed(0)}).`);
          // ---> END DEBUG LOGGING <---
          // If this was the active pipe, clear it, but don't schedule next here
          if (pipe === currentObstaclePipe) {
              currentObstaclePipe = null;
          }
          // Skip collision/score checks for this frame as pipe is gone
      } else if (pipeOffset) { // Only proceed if pipe exists and has offset for collision calculations
          // ---> DEBUG LOGGING: Periodically log pipe position <--- 
          if (debugmode && Math.random() < 0.05) { // Log ~5% of frames 
              console.log(`Pipe ${pipe.attr('data-pipe-id')} on-screen at rect.left=${pipeRect.left.toFixed(0)} (offset.left=${pipeOffset ? pipeOffset.left.toFixed(0) : 'N/A'})`);
          }
          // ---> END DEBUG LOGGING <---

          // Get pipe ID for logging
          const pipeId = pipe.attr('data-pipe-id') || 'unknown';
          
          // Determine if it's an upper or lower pipe based on class
          var isUpper = pipe.hasClass("pipe_single_upper");
          var isLower = pipe.hasClass("pipe_single_lower");
          
          var pipeElem = isUpper ? pipe.children(".pipe_upper") : pipe.children(".pipe_lower");
          
          if (!pipeElem.length) {
              // Should not happen if pipe exists, but safety check
              console.warn(`Pipe ${pipeId} has no inner element!`);
          } else {
              // Calculate pipe collision boundaries
              var pipeleft = pipeOffset.left; // Use the pipe's actual left offset
              var piperight = pipeleft + pipewidth; // pipewidth is a fixed value (52)

              // Adjust collision boundaries
              const pipeEndCapHeight = 0; // Reverted end cap adjustment based on testing
              var pipetop = isUpper ? pipeOffset.top + pipeElem.height() + pipeEndCapHeight : -Infinity; // Bottom edge of upper pipe body
              var pipebottom = isLower ? pipeOffset.top : flyArea + flyAreaTopOffset; // Top edge of lower pipe

              // --- DEBUG LOGGING --- 
              if (debugmode) { // Only log if debug mode is on
                   console.log(`Pipe ${pipeId} (${isUpper ? 'Upper' : 'Lower'}): L=${pipeleft.toFixed(0)}, R=${piperight.toFixed(0)}, T=${pipetop.toFixed(0)}, B=${pipebottom.toFixed(0)} | Bird: L=${boxLeft.toFixed(0)}, R=${boxRight.toFixed(0)}, T=${boxTop.toFixed(0)}, B=${boxBottom.toFixed(0)}`);
              }
              // --- END DEBUG LOGGING ---

              // --- Collision Check --- 
              var horizontalOverlap = boxRight > pipeleft && boxLeft < piperight; 
              
              if (horizontalOverlap) {
                  if (isUpper && boxTop < pipetop) { // Collision with upper pipe
                      hitpipe = true;
                  }
                  if (isLower && boxBottom > pipebottom) { // Collision with lower pipe 
                      hitpipe = true;
                  }
              }

              // --- Score Check --- (Only if not already scored)
              if (currentObstaclePipe === pipe && !pipe.hasClass("scored") && boxLeft > piperight) { // Check if it's the active pipe
                  pipe.addClass("scored");
                  score++;
                  setBigScore();
                  
                  // ---> Schedule the next pipe AFTER scoring <--- 
                  passedPipe = currentObstaclePipe; // Mark current pipe as passed
                  currentObstaclePipe = null; // Clear the current obstacle reference
                  if(debugmode) console.log(`Pipe ${pipeId} scored! Scheduling next pipe.`);
                  // Use setTimeout to delay the next pipe creation
                  clearTimeout(pipeGenerationTimeout); // Clear previous timeout just in case
                  pipeGenerationTimeout = setTimeout(updatePipes, gameSettings.pipeInterval); 
                  // ---> END Pipe Scheduling <---
              }
          }
      }
   }
   
   // *** Check the hitpipe flag set by the logic above ***
   if(hitpipe) {
      playerDead(); // If hitpipe was set true inside the loop, die here.
      
      // Stop the loops
      clearInterval(loopGameloop);
      loopGameloop = null;
      
      // Stop the animation
      $(".animated").css('animation-play-state', 'paused');
      $(".animated").css('-webkit-animation-play-state', 'paused');
      
      // Drop the bird to the floor
      var playerbottom = $("#player").position().top + $("#player").width(); // Use width because the bird is rotated 90 deg
      var floor = flyArea;
      var movey = Math.max(0, floor - playerbottom);
      $("#player").transition({ y: movey + 'px', rotate: 90 }, 1000, 'easeInOutCubic');
      
      // Show the scoreboard
      currentstate = states.ScoreScreen;
      
      // Update and display high score if needed
      let highscore = parseInt(localStorage.getItem("highscore") || "0");
      if (score > highscore) {
         highscore = score; // Update local var for display
         localStorage.setItem("highscore", highscore);
      }
      
      // Update the scoreboard
      updateScoreboard(highscore); // Pass highscore
      
      // Make the replay button clickable
      replayclickable = true;
      
      // --- ADD DEBUG LOGGING for loop end ---
      if (debugmode) {
          console.log("--- Gameloop finished frame ---");
      }
      // --- END DEBUG LOGGING ---
   }
}

// Modified updatePlayer to accept value for rotation (velocity or force)
function updatePlayer(player, valueForRotation) { 
   // Adjust rotation and limit the player to within the fly area
   // In 'jump' mode, rotate based on velocity. In 'gravity', rotate based on force (more force = flatter bird)
   if (controlMode === 'gravity') {
        // Rotate based on force - less rotation with more upward force
        rotation = Math.max(-20, Math.min(90, 90 * (1 - (valueForRotation * 1.5)) - (velocity * 0.5) )); // Combine force and velocity influence? Tune this.
   } else { // 'jump' mode
       rotation = Math.min((valueForRotation / 10) * 90, 90);
   }
   
   // Apply rotation and position to the player
   $(player).css({ rotate: rotation, top: position });
}

function playerDead() {
   // ---> ADD DEBUG LOGGING <----
   if(debugmode) {
       console.log(`PlayerDead called! Current state: ${currentstate}`); // Simplified log
       console.trace(); // Show call stack
   }
   // ---> END DEBUG LOGGING <-----
   
   // Stop the loops
   clearInterval(loopGameloop);
   loopGameloop = null;
   
   // Stop the animation
   $(".animated").css('animation-play-state', 'paused');
   $(".animated").css('-webkit-animation-play-state', 'paused');
   
   // Drop the bird to the floor
   var playerbottom = $("#player").position().top + $("#player").width(); // Use width because the bird is rotated 90 deg
   var floor = flyArea;
   var movey = Math.max(0, floor - playerbottom);
   $("#player").transition({ y: movey + 'px', rotate: 90 }, 1000, 'easeInOutCubic');
   
   // Show the scoreboard
   currentstate = states.ScoreScreen;
   
   // Update and display high score if needed
   let highscore = parseInt(localStorage.getItem("highscore") || "0");
   if (score > highscore) {
      highscore = score; // Update local var for display
      localStorage.setItem("highscore", highscore);
   }
   
   // Update the scoreboard
   updateScoreboard(highscore); // Pass highscore
   
   // Make the replay button clickable
   replayclickable = true;
   
   // --- ADD DEBUG LOGGING for loop end ---
   if (debugmode) {
       console.log("--- Gameloop finished frame ---");
   }
   // --- END DEBUG LOGGING ---
}

// Counter for unique pipe IDs
var pipeIdCounter = 0;

// Timeout ID for pipe generation after scoring
var pipeGenerationTimeout = null;

function updatePipes() {
   // Recalculate flyArea height each time to ensure accuracy
   var currentFlyAreaHeight = $("#flyarea").height();
   // Basic validation for fly area height
   if (!currentFlyAreaHeight || currentFlyAreaHeight <= 0) currentFlyAreaHeight = 510; // Fallback
   
   // --- Remove the PREVIOUSLY passed pipe --- 
   if (passedPipe) {
       if(debugmode) console.log(`Removing passed pipe ${passedPipe.attr('data-pipe-id')}`);
       passedPipe.remove();
       passedPipe = null;
   }
   // --- End Previous Pipe Removal ---
   
   // If there's already an active pipe, don't create another one (safety check)
   if (currentObstaclePipe) {
       console.warn("updatePipes called but currentObstaclePipe already exists!");
       return; 
   }
   
   // Add a new pipe
   var padding = 80;
   var usableHeight = currentFlyAreaHeight - (padding * 2); // Use current height
   
   // Calculate pipe length: Min 10%, Max 1/3 (~33.3%) of usable height
   var minLength = usableHeight * 0.1;
   var maxLength = usableHeight / 3;
   var lengthRange = maxLength - minLength;
   var pipeLength = Math.floor(Math.random() * lengthRange) + minLength; 
   
   // Decide: Upper or Lower pipe?
   var isUpperPipe = Math.random() > 0.5; // Random type generation
   
   // --- DEBUG LOGGING ---
   if (debugmode) {
       console.log(`Updating pipe: flyArea=${currentFlyAreaHeight}, usable=${usableHeight.toFixed(0)}, length=${pipeLength.toFixed(0)}, isUpper=${isUpperPipe}`);
   }
   // --- END DEBUG LOGGING ---
   
   // Create pipe HTML
   var newpipe = $(document.createElement("div"));
   newpipe.addClass("pipe").addClass("animated"); 
   
   // Add a unique ID for debugging
   pipeIdCounter++;
   newpipe.attr('data-pipe-id', pipeIdCounter); 
   
   if (isUpperPipe) {
       newpipe.addClass("pipe_single_upper");
       var topPosition = Math.floor(Math.random() * padding); // Random start within top padding
       newpipe.css("top", topPosition + "px"); 
       var pipe_upper = $(document.createElement("div"));
       pipe_upper.addClass("pipe_upper");
       pipe_upper.css("height", pipeLength + "px");
       newpipe.append(pipe_upper);
   } else { // Lower pipe
       newpipe.addClass("pipe_single_lower");
       var bottomPosition = currentFlyAreaHeight - padding - pipeLength - Math.floor(Math.random() * padding); // Use current height
       newpipe.css("top", bottomPosition + "px"); // Apply calculated top position
       var pipe_lower = $(document.createElement("div"));
       pipe_lower.addClass("pipe_lower");
       pipe_lower.css("height", pipeLength + "px");
       newpipe.append(pipe_lower);
   }
   
   // Set the new pipe as the current obstacle
   currentObstaclePipe = newpipe;
   
   // Append AFTER setting as current obstacle
   $("#flyarea").append(newpipe); 
   
   // --- Reliable Cleanup: Move this AFTER potential new pipe creation ---
   $(".pipe").each(function() {
       var pipeElem = $(this);
       // Skip the current obstacle and the (now removed) passed pipe
       if ( (currentObstaclePipe && pipeElem[0] === currentObstaclePipe[0]) ||
            (passedPipe && pipeElem[0] === passedPipe[0]) ) { // passedPipe should be null here, but check anyway
           return true; // continue .each
       }
       var pipeRect = pipeElem[0].getBoundingClientRect();
       // Use a more generous threshold to ensure they are definitely gone
       if (pipeRect && pipeRect.right < 0) { // Check if the right edge is off-screen
           if(debugmode) console.log(`Cleaning up old pipe ${pipeElem.attr('data-pipe-id')} (rect.right=${pipeRect.right})`);
           pipeElem.remove();
       }
   });
   // --- End Cleanup --- 
}

function updateScoreboard(currentHighScore) { // Accept highscore
   // Update the score display
   $("#currentscore").text(score);
   $("#highscore").text(currentHighScore);
   
   // Determine the medal
   var medal;
   if(score >= 20) {
      medal = "platinum";
   } else if(score >= 15) {
      medal = "gold";
   } else if(score >= 10) {
      medal = "silver";
   } else if(score >= 5) {
      medal = "bronze";
   } else {
      medal = "none";
   }
   
   // Set the medal image
   if(medal != "none") {
      $("#medal").removeClass().addClass("medal_" + medal);
   }
   
   // Fade in the scoreboard
   $("#scoreboard").css({ y: '40px', opacity: 0 });
   $("#scoreboard").transition({ y: '0px', opacity: 1}, 600, 'ease', function() {
      // Fade in the medal after scoreboard
      if(medal != "none") {
         $("#medal").css({ scale: 2, opacity: 0 });
         $("#medal").transition({ scale: 1, opacity: 1}, 600, 'ease');
      }
      
      // Fade in the replay button
      $("#replay").css({ scale: 2, opacity: 0 });
      $("#replay").transition({ scale: 1, opacity: 1}, 600, 'ease');
   });
}

// Add some basic CSS for the new pipe classes (can be moved to CSS file)
$(document).ready(function() {
    $('<style>')
    .prop('type', 'text/css')
    .html(`
        .pipe_single_upper {
            top: 0; /* Aligns to the top of the flyarea */
            /* Background/Image applied to inner .pipe_upper */
        }
        .pipe_single_lower {
            /* Positioned via top property in JS */
             /* Background/Image applied to inner .pipe_lower */
        }
        /* Ensure inner pipe elements fill their container */
        .pipe_upper, .pipe_lower {
            width: 100%; 
        }
        
        /* Style for control mode radio buttons */
        .control-mode-group label {
            display: block;
            margin-bottom: 5px;
            cursor: pointer;
        }
        .control-mode-group input[type="radio"] {
            margin-right: 8px;
        }
    `)
    .appendTo('head');
    
    // --- ADD CSS OVERRIDE FOR LOWER PIPE POSITIONING --- 
    $('<style>')
    .prop('type', 'text/css')
    .html(`
        .pipe_lower {
            bottom: auto !important; /* Override the problematic bottom: 0 */
            top: 0 !important; /* Ensure it aligns to the top of its container */
        }
    `)
    .appendTo('head');
}); 