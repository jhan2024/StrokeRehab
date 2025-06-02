# Software Design & Architecture

## Overview

The app uses an event-driven architecture built with vanilla HTML, CSS, and JavaScript. We chose this approach to keep things simple and avoid framework overhead while still maintaing good separation of concerns.

## Architecture Principles  

### Event-Driven Design
Everything communicates through custom events fired on the `document` object. This keeps components decoupled and makes it easy to add new features without breaking existing code.

### Modular Components
Each major piece of functionality is split into its own module:
- Input handling
- Game control
- Measurement tracking  
- Settings management
- Individual games

### Consistent Interfaces
All components follow the same patterns for initialization, event handling, and cleanup.

## Core Components

### InputModeManager (`input_mode_manager.js`)
This is the heart of the system. It manages:
- Current mode (simulation vs arduino)
- Device type (1-dome vs 3-dome)  
- Calibration settings (base pressures, ranges)
- Raw data processing and normalization

**Key responsibilities**:
- Switch between simulation and Arduino modes
- Handle device type changes 
- Store calibration values for each sensor
- Normalize raw pressure data to 0-1 range
- Dispatch `EVT_FORCE_UPDATE` events with clean data

### ArduinoConnection (`sensor_interface.js`)
Handles low-level communication with both real hardware and simulation:
- Web Serial API integration for real Arduino
- Simulated port interface for testing
- Data parsing and validation
- Error handling and reconnection

**Data formats it handles**:
```javascript
// 1-Dome Arduino: single float per line(TODO: change to JSON)
"150.5"

// 3-Dome Arduino: JSON per line  
{"timestamp": 1234567890, "pressure": [120.3, 95.7, 200.1]}

// 1-Dome Simulator: JSON with normalized data
{"normalizedForces": [0.8], "rawPressures": [150.5]}
```

### SimulatedSerialPort (`serial-simulator.js`)
A fake serial port that behaves like the real thing but responds to keyboard input:
- Mimics Web Serial API interface
- Generates realistic pressure data
- Supports both 1-dome and 3-dome simulation
- Respects calibration settings

### Game Control (`game_control.js`)
Acts as a router between force input and active games:
- Listens for `EVT_FORCE_UPDATE` events
- Determines which game is currently active
- Routes force data to the right game's input handler
- Handles device type differences

### Individual Games
Each game is a separate module with its own:
- Initialization function
- Input processing function  
- Game loop and rendering
- Cleanup when switching games

Games expose a consistent API:
```javascript
// Each game implements these functions
initializeGame()
processForceInput(forces, deviceType)  
cleanupGame()
```

### Settings Manager (`settings_manager.js`)
Manages the Settings tab UI and user preferences:
- Device type selection (1-dome/3-dome)
- Mode switching (simulation/arduino)
- Calibration controls
- Connection management
- Data logging

### Measurement Manager (`measurement_manager.js`)  
Handles the Measurement tab functionality:
- Start/stop recording sessions
- Real-time metrics calculation (max, average, duration)
- Chart.js integration for live graphs
- Data export (currently logs to console)

## Event System

We use custom events for inter-component communication:

### EVT_FORCE_UPDATE
**Purpose**: Broadcast normalized force data to all interested components
**Data**: 
```javascript
{
  forces: [0.2, 0.8, 0.1],        // Normalized 0-1 values
  rawPressures: [120, 180, 95],   // Raw sensor readings  
  deviceType: '3-dome'            // Current device configuration
}
```
**Fired by**: InputModeManager
**Consumed by**: Games, MeasurementManager, force bar visualization

### EVT_MODE_CHANGED
**Purpose**: Notify components when mode or device type changes
**Data**:
```javascript
{
  mode: 'simulation',             // 'simulation' or 'arduino'
  deviceType: '1-dome',          // '1-dome' or '3-dome'  
  isConnected: false             // Connection status
}
```

### EVT_STATUS_MESSAGE
**Purpose**: Show user feedback messages
**Data**: `{ message: "Connected to device", type: "success" }`

### EVT_LOG_MESSAGE  
**Purpose**: Add entries to the debug log
**Data**: `{ message: "Sensor reading: 150.2", timestamp: Date.now() }`

## Data Flow

Here's how data moves through the system:

1. **Input Source**: 
   - Arduino sends pressure data via serial
   - OR Simulator generates data from keyboard input

2. **ArduinoConnection**: 
   - Receives raw data
   - Parses and validates format
   - Applies data validation (checks for suspicious readings)

3. **InputModeManager**:
   - Gets processed data from ArduinoConnection  
   - Applies calibration (base pressure, range normalization)
   - Dispatches `EVT_FORCE_UPDATE` with clean 0-1 values

4. **Consumers**:
   - Games receive force data and update accordingly
   - Measurement tab records values and updates charts
   - Force bars update their visual representation


## Technology Choices

### Why Vanilla JavaScript?
- **No framework overhead**: Faster loading and execution
- **Better browser compatibility**: Works everywhere  
- **Easier debugging**: No framework magic to understand
- **Simpler deployment**: Just static files
- **Learning curve**: Most developers know vanilla JS



## File Structure

```
/
├── index.html                 # Main application entry
├── script.js                 # Core UI and initialization  
├── constants.js              # Shared event names and constants
├── input_mode_manager.js     # Central state and data management
├── sensor_interface.js       # Arduino communication layer
├── serial-simulator.js       # Simulation mode implementation
├── game_control.js          # Game input routing
├── measurement_manager.js    # Data recording and analysis
├── settings_manager.js       # Settings UI management
├── styles.css               #  styles
├── flappybird/       # Flappy Bird adaptation
├── poolgame/       # Pool game adaptation
├── rhythmkeys/       # Rhythm game
├── spaceshooter/       # Space Shooter game
```


## Event Handling
```javascript
// Standard pattern for listening to events
document.addEventListener('EVT_FORCE_UPDATE', (event) => {
    const { forces, deviceType } = event.detail;
    processInput(forces, deviceType);
});
```



## Performance Considerations

### Memory Management
- Clean up event listeners when switching modes
- Clear intervals and timeouts properly
- Avoid memory leaks in game loops

### Browser Compatibility
- Web Serial API requires Chrome/Edge for Arduino mode
- Simulation mode works in all modern browsers
- Graceful degradation for unsupported features


## Known Issues & Limitations

### Web Serial API
- Only works in Chrome/Edge
- Requires HTTPS for production deployment
- User must grant permission

### Audio Latency
- Browser audio can have delays
- Affects rhythm games timing
- Considering Web Audio API for better performance

### Persistence
- Need to add local storage for user preferences

### Error Recovery
- Connection drops aren't always handled gracefully
- Need better reconnection logic

## Future Improvements

### Architecture
- Implement component lifecycle management
- Better error boundaries and recovery


### Features
- Data processing and management
- User profiles and progress tracking
- Advanced analytics and reporting


