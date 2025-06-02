# Game Adaptation for Hand Rehabilitation

## Overview

We've adapted several open-source games to work with our rehabilitation device. The main challenge was taking games designed for fast keyboard/mouse input and making them work with pressure sensors and rehabilitation needs.

## Why We Adapted Existing Games

Instead of building games from scratch, we grabbed open-source ones and modified them because:
- Faster development (why reinvent the wheel?)
- Proven game mechanics that people already enjoy
- Less bugs since the core game logic was already tested
- Easy to find developers familiar with the codebase

## General Adaptation Strategy

### Input Mapping
We had to figure out how to map pressure input to game controls. We tried different approaches:

- **Thresholding**: When pressure exceeds X, trigger an action (like jumping)
- **Direct mapping**: Pressure level directly controls something (like ship position)  
- **Mixed approach**: Some actions use thresholds, others use direct mapping
- **Dynamic thresholds**: Threshold changes based on game state or player performance

### Difficulty Adjustments
Most games are way too hard for rehabilitation patients, so we:
- Slowed down game speed
- Made obstacles easier to avoid
- Reduced punishment for mistakes
- Added more forgiving timing windows

## Adapted Games

### Flappy Bird
**Source**: https://github.com/nebez/floppybird/

**Original**: Tap to make bird jump, avoid pipes
**Adapted**: 
- Reduced from 2 pipes to 1 pipe (less cramped)
- Slower bird movement 
- Lower gravity (easier to control)
- Threshold-based control: pressure above X makes bird flap
- Good for practicing grasp/release patterns

**Controls**:
- 1-Dome: Spacebar (simulation) or pressure sensor
- 3-Dome: Uses first sensor only

### Space Shooter  
**Original**: Move ship around, shoot enemies
**Adapted**:
- Limited to vertical movement only (simpler)
- Ship position maps directly to pressure level (analog control)
- Requires more precise pressure control than Flappy Bird
- Good for advanced patients who need finer motor control

**Controls**:
- Pressure level = ship vertical position
- Higher pressure = ship moves up
- Lower pressure = ship moves down

### Pool Game
**Source**: https://github.com/a-j-z/pool

**Original**: Mouse controls for aiming and power
**Adapted**:
- Uses 3-dome configuration
- First 2 sensors control left/right aiming (threshold-based)
- Third sensor controls shot power (pressure level)
- Good for practicing different finger combinations

**Controls**:
- Sensor 1 (A key): Aim left
- Sensor 2 (D key): Aim right  
- Sensor 3 (S key): Shot power (hold and release)

### Rhythm Hero (Rhythm Keys)
**Source**: https://jhedev96.github.io/JS-Hero/

**Original**: Press keys in time with falling notes
**Adapted**:
- 3 lanes for 3-dome device
- Dynamic thresholds (notes appear bigger/smaller randomly)
- Background music and sound effects
- Scoring based on hit ratio
- Good for coordination and timing

**Controls**:
- 3-Dome: A/S/D keys map to lanes 1/2/3
- 1-Dome: Single sensor controls middle lane only

## Implementation Details

### Game Loading
Games are loaded as separate scripts when you click their cards. Each game manages its own:
- Canvas rendering
- Game state
- Audio (if any)
- UI elements

### Force Input Processing
The `game_control.js` module acts as middleware:
1. Listens for `EVT_FORCE_UPDATE` events
2. Routes force data to the active game
3. Each game has its own input processing function
4. Games handle device type differences (1-dome vs 3-dome)

### Device Type Handling
For 1-dome devices playing 3-dome games:
- Pool Game: Only uses first sensor for basic up/down aiming
- Rhythm Hero: Single sensor controls middle lane only
- Space Shooter: Works normally (already uses one input)

## Control Strategies We Tried

### 1. Simple Thresholding
```javascript
if (pressure > threshold) {
    triggerAction();
}
```
**Pros**: Easy to understand and implement
**Cons**: Very binary, not much nuance

### 2. Direct Mapping
```javascript
shipY = (pressure / maxPressure) * screenHeight;
```
**Pros**: Analog control, more precise
**Cons**: Requires steady hands, harder for some patients

### 3. Dynamic Thresholds  
```javascript
threshold = baseThreshold + randomVariation;
```
**Pros**: Keeps players engaged, adapts difficulty
**Cons**: Can be confusing if not implemented well

## Audio Integration

We added sounds to make games more engaging:
- Background music for Rhythm Hero
- Sound effects for successful actions
- Audio feedback helps with timing and engagement

**Sources**: 
- https://opengameart.org/content/winning-the-race
- https://mixkit.co/free-sound-effects/

## Future Game Ideas

**Mini Golf**: Pressure controls power, good for sustained pressure exercises
**Subway Surf**: runner with force-based controls
