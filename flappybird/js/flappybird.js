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
var debugmode = false;

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
   pipeHeight: 160,         // Increased from 90/200
   pipeInterval: 2100,      // Increased from 1400
   gameSpeed: 40,           // Frames per second (reduced from 60)
   
   // Force settings
   minForceEffect: 0.5,     // Minimum jump multiplier at 0% force
   maxForceEffect: 1.5,     // Maximum jump multiplier at 100% force
   
   // Preset difficulty levels
   difficultyPresets: {
      veryEasy: { gravity: 0.1, jump: -3.0, pipeHeight: 200, pipeInterval: 2500, gameSpeed: 30 },
      easy: { gravity: 0.15, jump: -3.6, pipeHeight: 160, pipeInterval: 2100, gameSpeed: 40 },
      medium: { gravity: 0.2, jump: -4.0, pipeHeight: 130, pipeInterval: 1700, gameSpeed: 50 },
      hard: { gravity: 0.25, jump: -4.6, pipeHeight: 90, pipeInterval: 1400, gameSpeed: 60 }
   }
};

// Current game variables
var gravity = gameSettings.gravity;
var velocity = 0;
var position = 180;
var rotation = 0;
var jump = gameSettings.jump;
var flyArea = null;

var score = 0;
var highscore = 0;

// Pipe settings
var pipeheight = gameSettings.pipeHeight;
var pipewidth = 52;
var pipes = new Array();

var replayclickable = false;

// Game loops
var loopGameloop;
var loopPipeloop;

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
      clearInterval(loopPipeloop);
      
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
      
      // Update game variables with new settings
      gravity = gameSettings.gravity;
      jump = gameSettings.jump;
      pipeheight = gameSettings.pipeHeight;
      
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
   
   // Get the highscore from localStorage
   var savedscore = localStorage.getItem("highscore");
   if(savedscore) {
      highscore = parseInt(savedscore);
   }
   
   // Start with the splash screen
   showSplash();
   
   // Set up input handlers
   setInputHandlers();
}

function setInputHandlers() {
   // Keyboard controls
   $(document).keydown(function(e) {
      // Use spacebar - linked to force sensor in the mockup
      if(e.keyCode == 32) {
         if(currentstate == states.ScoreScreen) {
            // On score screen, spacebar restarts the game
            $("#replay").click();
         }
         else if(currentstate == states.SplashScreen) {
            // On splash screen, spacebar starts the game
            startGame();
         }
         else if(currentstate == states.GameScreen) {
            // In game, spacebar makes the bird jump
            // screenClick();
         }
      }
   });
   
   // Mouse/touch controls
   $("#gamescreen").click(function(e) {
      e.preventDefault();
      if(currentstate == states.GameScreen) {
         screenClick();
      }
      else if(currentstate == states.SplashScreen) {
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
   
   // Update the player in preparation for the next game
   $("#player").css({ y: 0, x: 0 });
   updatePlayer($("#player"));
   
   // Clear out all the pipes if there are any
   $(".pipe").remove();
   pipes = new Array();
   
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
   loopPipeloop = setInterval(updatePipes, gameSettings.pipeInterval); // Use the configurable pipe interval
   
   // Jump from the start!
   playerJump();
}

function screenClick() {
   if(currentstate == states.GameScreen) {
      playerJump();
   }
}

window.flappyGameJump = function() {
   // Only jump if in the game screen state
   if(currentstate == states.GameScreen) {
      playerJump();
   } else if (currentstate == states.SplashScreen) {
      // If on splash screen, start the game
      startGame();
   }
};
function playerJump() {
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
   
   // Update the player speed/position
   velocity += gravity;
   position += velocity;
   
   // Update the player position
   updatePlayer(player);
   
   // Create the bounding box for collision detection
   var box = document.getElementById('player').getBoundingClientRect();
   var origwidth = 34.0;
   var origheight = 24.0;
   
   var boxwidth = origwidth - (Math.sin(Math.abs(rotation) / 90) * 8);
   var boxheight = (origheight + box.height) / 2;
   var boxleft = ((box.width - boxwidth) / 2) + box.left;
   var boxtop = ((box.height - boxheight) / 2) + box.top;
   var boxright = boxleft + boxwidth;
   var boxbottom = boxtop + boxheight;
   
   // Update our debug bounding box
   if(debugmode) {
      var boundingbox = $("#playerbox");
      boundingbox.css('left', boxleft + "px");
      boundingbox.css('top', boxtop + "px");
      boundingbox.css('width', boxwidth + "px");
      boundingbox.css('height', boxheight + "px");
   }
   
   // Check for ceiling collision
   if(box.top <= 0) {
      playerDead();
      return;
   }
   
   // Check for floor collision
   if(boxbottom >= $("#land").offset().top) {
      position = 0;
      playerDead();
      return;
   }
   
   // Check for pipe collision
   var hitpipe = false;
   $.each(pipes, function(i, pipe) {
      var pipeupper = pipe.children(".pipe_upper");
      var pipelower = pipe.children(".pipe_lower");
      
      var pipetop = pipeupper.offset().top + pipeupper.height();
      var pipeleft = pipeupper.offset().left - 2; // Adjusted for better hit detection
      var piperight = pipeleft + pipewidth;
      var pipebottom = pipelower.offset().top;
      
      // Update the pipe box (debug visual)
      if(debugmode) {
         var boundingbox = $("#pipebox");
         boundingbox.css('left', pipeleft + "px");
         boundingbox.css('top', pipetop + "px");
         boundingbox.css('width', pipewidth + "px");
         boundingbox.css('height', pipebottom - pipetop + "px");
      }
      
      // Check for collision
      if(boxright > pipeleft && boxleft < piperight && boxbottom > pipetop && boxtop < pipebottom) {
         hitpipe = true;
         return false;
      }
   });
   
   if(hitpipe) {
      playerDead();
      return;
   }
   
   // Check for score
   for(var i = 0; i < pipes.length; i++) {
      var pipe = pipes[i];
      var piperight = pipe.offset().left + pipewidth;
      
      if(pipe.hasClass("scored"))
         continue;
      
      if(boxleft > piperight) {
         pipe.addClass("scored");
         score++;
         setBigScore();
      }
   }
}

function updatePlayer(player) {
   // Adjust rotation and limit the player to within the fly area
   rotation = Math.min((velocity / 10) * 90, 90);
   
   // Apply rotation to the player
   $(player).css({ rotate: rotation, top: position });
}

function playerDead() {
   // Stop the loops
   clearInterval(loopGameloop);
   clearInterval(loopPipeloop);
   loopGameloop = null;
   loopPipeloop = null;
   
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
   if(score > highscore) {
      highscore = score;
      localStorage.setItem("highscore", highscore);
   }
   
   // Update the scoreboard
   updateScoreboard();
   
   // Make the replay button clickable
   replayclickable = true;
}

function updatePipes() {
   // Pipe loop
   $(".pipe").filter(function() { return $(this).position().left <= -100; }).remove();
   
   // Add a new pipe
   var padding = 80;
   var constraint = flyArea - pipeheight - (padding * 2);
   var topheight = Math.floor((Math.random() * constraint) + padding);
   var bottomheight = (flyArea - pipeheight) - topheight;
   
   // Create pipe HTML
   var newpipe = $(document.createElement("div"));
   newpipe.addClass("pipe").addClass("animated");
   
   var pipe_upper = $(document.createElement("div"));
   pipe_upper.addClass("pipe_upper");
   pipe_upper.css("height", topheight);
   
   var pipe_lower = $(document.createElement("div"));
   pipe_lower.addClass("pipe_lower");
   pipe_lower.css("height", bottomheight);
   
   // Add the pipes to the document
   newpipe.append(pipe_upper);
   newpipe.append(pipe_lower);
   $("#flyarea").append(newpipe);
   
   // Keep track of pipe
   pipes.push(newpipe);
}

function updateScoreboard() {
   // Update the score display
   $("#currentscore").text(score);
   $("#highscore").text(highscore);
   
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

// // Connect flappy bird controls to our existing force bar
// $(document).ready(function() {
//    // When the spacebar is pressed, we'll use the existing force level
//    // from our force bar to determine jump height
   
//    $(document).keydown(function(e) {
//       if(e.keyCode == 32) { // Spacebar
//          // Only apply custom force when in game
//          if(currentstate == states.GameScreen) {
//             // Get current force from our force bar
//             var forceLevel = parseFloat($(".force-level").css("height")) / 100;
            
//             // Adjust jump strength based on force level (max at 100%)
//             // Scale between minForceEffect and maxForceEffect of normal jump power
//             velocity = jump * (gameSettings.minForceEffect + 
//                               (gameSettings.maxForceEffect - gameSettings.minForceEffect) * forceLevel);
//          }
//       }
//    });
// }); 