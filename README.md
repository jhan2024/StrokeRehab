# Hand Rehabilitation Device Interface

A desktop interface designed for a soft robotics-based hand rehabilitation device for stroke patients.

## Overview

This mockup provides a visual representation of the interface for the hand rehabilitation device. It consists of two main panels:

1. **Hardware Control Panel** (left side) - For connecting to the device, visualizing touch points, and adjusting hardware settings.
2. **Main Panel** (right side) - Switches between gamified exercises, measurement functionalities, and a debug view.

## Features

### Hardware Control Panel

- **Device Status**: Connect/disconnect from the rehabilitation device
- **Touch Visualization**: Real-time visualization of touch points on the membrane
- **Force Levels**: Visual representation of the force applied
- **Settings**: Adjust sensitivity and force threshold settings
- **Toggle Panel**: Ability to hide/show the side panel

### Gamified Exercises

- Selection of different rehabilitation games:
  - **Flappy Bird**: Control using pressure inputs (1D control)
  - **Mini Golf**: Directional and force control (2D control)
  - **Piano Keys**: Multiple touch points exercise

### Measurement

- **Start/Stop Measurement**: Begin/end a measurement session
- **Save Results**: Save measurement data
- **Real-time Metrics**: Display of current force measurements
- **Data Visualization**: Graph showing force measurements over time

## Getting Started

1. Open `index.html` in your web browser to view the interface
2. The interface is interactive:
   - Try clicking on the tabs to switch between exercises and measurement
   - Click the hide/show button at the bottom of the side panel
   - Interact with the touch visualization canvas with your mouse
   - Click the connect/disconnect button
   - Try the start/stop measurement button

## Next Steps for Development

1. **Integrate with hardware**: Connect to actual rehabilitation device
2. **Implement games**: Develop the actual games based on the mockups
3. **Data storage**: Implement saving and loading of patient data
4. **Therapist view**: Add additional interface for therapists
5. **User profile management**: Add user authentication and profiles

## Technical Details

This mockup is built with basic HTML, CSS, and JavaScript. For the production version, consider:

- Electron for desktop application
- React/Vue for more complex UI elements
- D3.js for more advanced data visualization
- Node.js for backend functionality

# Arduino Communication Implementation

## Overview
This document summarizes the integration of Arduino with the hand rehabilitation interface for force signal transmission.

## Implementation Details

### Communication Method
- Primary method: **Web Serial API** for direct Arduino communication
- Fallback method: **Simulation Mode** using spacebar for development/testing
- Seamless switching between both modes

### Architecture

#### Arduino Side
```cpp
const int forcePin = A0;  // Analog pin for force sensor

void setup() {
  Serial.begin(9600);
}

void loop() {
  // Read force sensor
  int forceValue = analogRead(forcePin);
  
  // Send the raw value (0-1023)
  Serial.println(forceValue);
  
  // Small delay to prevent flooding the serial port
  delay(10);
}
```

#### Interface Side
- `ArduinoConnection` class handles Serial API communication
- `InputModeManager` manages switching between Arduino and simulation modes
- Browser compatibility detection for Web Serial API
- Automatic fallback to simulation mode if Serial API is unavailable

### Force Signal Flow
1. Arduino reads analog sensor value
2. Serial connection transmits values to the interface (float number, air pressure, unit: Pascal)
3. Interface normalizes values (0-1 range)
4. Normalized force updates:
   - Force visualization in the UI
   - Game controls (when threshold exceeded)
   - Measurement recordings (when active)

### Game Control Integration
- Force signals trigger game controls (e.g., Flappy Bird jumps)
- Configurable threshold (default 0.3 or 30% of max force)
- Works identically in both Arduino and simulation modes

### Browser Compatibility
- Web Serial API supported in: Chrome, Edge, Opera (v89+)
- Not supported in: Safari, Firefox, iOS browsers
- Automatic detection and user notification of compatibility
- Simulation mode always available regardless of browser

## Usage Instructions

### For Hardware Testing
1. Use Chrome or Edge browser
2. Connect Arduino with force sensor to USB
3. Click "Switch to Arduino" button
4. Select the correct serial port when prompted
5. Force values will update in real-time

### For Development/Demo
1. Use any browser
2. Start in simulation mode (default)
3. Hold spacebar to increase force
4. Release spacebar to reset force
5. All features work identically to Arduino mode

### Game Control
1. Apply force (via sensor or spacebar)
2. When force exceeds threshold, game action triggers
3. For Flappy Bird: force spikes cause bird to jump
4. Adjust sensitivity via threshold slider if needed

## Troubleshooting
- If "Web Serial API not supported" message appears, use Chrome/Edge
- If connection fails, check Arduino is properly connected
- If port doesn't appear, check Arduino drivers are installed
- Use simulation mode for testing when hardware unavailable 