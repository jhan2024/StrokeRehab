// Placeholder script for missing assets
document.addEventListener('DOMContentLoaded', function() {
    // Create a simple canvas to generate basic placeholder images
    function createPlaceholderImage(color, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
        return canvas.toDataURL();
    }
    
    // Check if bird image exists, if not create a placeholder
    const birdImg = new Image();
    birdImg.onerror = function() {
        // Create a simple bird placeholder
        const birdPlaceholder = createPlaceholderImage('#FF6B6B', 64, 64);
        const style = document.createElement('style');
        style.textContent = `.bird { background-image: url("${birdPlaceholder}") !important; }`;
        document.head.appendChild(style);
    };
    birdImg.src = 'flappybird/assets/bird.png';
    
    // Check if pipe images exist
    const pipeImg = new Image();
    pipeImg.onerror = function() {
        // Create pipe placeholders
        const pipePlaceholder = createPlaceholderImage('#74C365', 52, 100);
        const pipeUpPlaceholder = createPlaceholderImage('#4D8C51', 52, 26);
        const pipeDownPlaceholder = createPlaceholderImage('#4D8C51', 52, 26);
        
        const style = document.createElement('style');
        style.textContent = `
            .pipe_upper, .pipe_lower { background-image: url("${pipePlaceholder}") !important; }
            .pipe_upper:after { background-image: url("${pipeDownPlaceholder}") !important; }
            .pipe_lower:after { background-image: url("${pipeUpPlaceholder}") !important; }
        `;
        document.head.appendChild(style);
    };
    pipeImg.src = 'flappybird/assets/pipe.png';
    
    // Check for land and ceiling
    const landImg = new Image();
    landImg.onerror = function() {
        const landPlaceholder = createPlaceholderImage('#DED895', 335, 100);
        const style = document.createElement('style');
        style.textContent = `#land { background-image: url("${landPlaceholder}") !important; }`;
        document.head.appendChild(style);
    };
    landImg.src = 'flappybird/assets/land.png';
    
    const ceilingImg = new Image();
    ceilingImg.onerror = function() {
        const ceilingPlaceholder = createPlaceholderImage('#583814', 63, 100);
        const style = document.createElement('style');
        style.textContent = `#ceiling { background-image: url("${ceilingPlaceholder}") !important; }`;
        document.head.appendChild(style);
    };
    ceilingImg.src = 'flappybird/assets/ceiling.png';
    
    // Splash screen
    const splashImg = new Image();
    splashImg.onerror = function() {
        const splashPlaceholder = createPlaceholderImage('#F5CB5C', 188, 170);
        const style = document.createElement('style');
        style.textContent = `#splash { background-image: url("${splashPlaceholder}") !important; }`;
        document.head.appendChild(style);
    };
    splashImg.src = 'flappybird/assets/splash.png';
    
    // Scoreboard
    const scoreboardImg = new Image();
    scoreboardImg.onerror = function() {
        const scoreboardPlaceholder = createPlaceholderImage('#F7F7F7', 236, 280);
        const style = document.createElement('style');
        style.textContent = `#scoreboard { background-image: url("${scoreboardPlaceholder}") !important; }`;
        document.head.appendChild(style);
    };
    scoreboardImg.src = 'flappybird/assets/scoreboard.png';
    
    // Replay button
    const replayImg = new Image();
    replayImg.onerror = function() {
        const replayPlaceholder = createPlaceholderImage('#F08700', 115, 70);
        // Just replace the img src
        const replayImgElements = document.querySelectorAll('#replay img');
        replayImgElements.forEach(function(img) {
            img.src = replayPlaceholder;
        });
    };
    replayImg.src = 'flappybird/assets/replay.png';
    
    // Medals
    const medalTypes = ['bronze', 'silver', 'gold', 'platinum'];
    const medalColors = ['#CD7F32', '#C0C0C0', '#FFD700', '#E5E4E2'];
    
    medalTypes.forEach(function(type, index) {
        const medalImg = new Image();
        medalImg.onerror = function() {
            const medalPlaceholder = createPlaceholderImage(medalColors[index], 44, 44);
            const style = document.createElement('style');
            style.textContent = `.medal_${type} { background-image: url("${medalPlaceholder}") !important; }`;
            document.head.appendChild(style);
        };
        medalImg.src = `flappybird/assets/medal_${type}.png`;
    });
}); 