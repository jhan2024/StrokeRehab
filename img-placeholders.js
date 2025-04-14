// This script generates placeholder images for our game cards
document.addEventListener('DOMContentLoaded', function() {
    // Function to create a placeholder image with a specified design
    function createPlaceholder(element, gameName) {
        // Skip if the image already has a valid src that's not a placeholder
        if (element.src && !element.src.startsWith('data:')) {
            return;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = element.width || 220;
        canvas.height = element.height || 120;
        const ctx = canvas.getContext('2d');
        
        // Background
        let bgColor = '#3498db';
        let iconColor = '#fff';
        
        // Different color based on game type
        if (gameName.toLowerCase().includes('flappy')) {
            bgColor = '#2ecc71';
        } else if (gameName.toLowerCase().includes('golf')) {
            bgColor = '#e74c3c';
        } else if (gameName.toLowerCase().includes('piano')) {
            bgColor = '#9b59b6';
        } else if (gameName.toLowerCase().includes('subway')) {
            bgColor = '#f39c12';
        }
        
        // Fill background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw game icon
        ctx.fillStyle = iconColor;
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let icon = '🎮';
        if (gameName.toLowerCase().includes('flappy')) {
            icon = '🐦';
        } else if (gameName.toLowerCase().includes('golf')) {
            icon = '🏌️';
        } else if (gameName.toLowerCase().includes('piano')) {
            icon = '🎹';
        } else if (gameName.toLowerCase().includes('subway')) {
            icon = '🏃';
        }
        
        try {
            ctx.fillText(icon, canvas.width / 2, canvas.height / 2 - 10);
            
            // Draw game name
            ctx.font = 'bold 14px Arial';
            ctx.fillText(gameName, canvas.width / 2, canvas.height / 2 + 30);
            
            // Set as the image source
            element.src = canvas.toDataURL();
        } catch (e) {
            console.error('Error creating placeholder:', e);
            // Fallback to a simple colored block
            element.style.backgroundColor = bgColor;
            element.style.display = 'block';
        }
    }
    
    // Apply to all game cards that need placeholders
    document.querySelectorAll('.game-card img').forEach(img => {
        // Check if image failed to load or has no source
        if (!img.complete || img.naturalWidth === 0 || !img.src) {
            const gameName = img.closest('.game-card').querySelector('h3').textContent;
            createPlaceholder(img, gameName);
        }
    });
    
    // Also handle images that fail to load
    document.querySelectorAll('.game-card img').forEach(img => {
        img.addEventListener('error', function() {
            const gameName = this.closest('.game-card').querySelector('h3').textContent;
            createPlaceholder(this, gameName);
        });
    });
}); 