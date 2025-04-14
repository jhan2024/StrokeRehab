# Hand Rehabilitation Device Interface

A web-based interface designed for a soft robotics-based hand rehabilitation device for stroke patients.

## Overview

This application provides the user interface for the rehabilitation device. It features:
- A **Hardware Control Panel** (side panel) for device connection, status, visualization, and settings.
- A **Main Panel** with tabs for: 
    - **Gamified Exercises**: Engaging games controlled by the device.
    - **Measurement**: Recording and visualizing force data over time.
    - **Debug**: Controlling connection mode and viewing raw/processed data.

## Features

### Hardware Control Panel
- **Device Status**: Shows connection status (Simulated/Connected/Disconnected).
- **Touch Visualization**: Interactive ellipsoid representing the device (clicks show temporary points).
- **Force Levels**: Vertical bar visualizing normalized force (0-1).
- **Settings**: Placeholders for Sensitivity and Force Threshold sliders.
- **Toggle Panel**: Button to hide/show the side panel.

### Gamified Exercises
- **Game Selection**: Cards for available games.
- **Flappy Bird**: Integrated and controllable via device force input (when force > threshold).
- **Placeholders**: Cards for future games (Mini Golf, Piano Keys).

### Measurement
- **Start/Stop Measurement**: Controls data recording.
- **Save Results**: Logs session data (Max/Avg Force, Duration, Raw Data) to the console.
- **Real-time Metrics**: Displays Max Force, Average Force, and Session Duration.
- **Data Visualization**: Live Chart.js line graph showing normalized force vs. time.

### Debug
- **Mode Switching**: Toggle between "Simulation" and "Arduino" modes.
- **Connection Control**: "Connect/Disconnect" button for Arduino mode (uses browser port selection).
- **Live Data**: Displays latest raw pressure value and normalized force value (0-1).
- **Data Log**: Shows timestamped simulator pressure/force data or status messages (Start/Stop/Clear controls).

## Architecture & Technical Details

- **Stack**: HTML, CSS, Vanilla JavaScript.
- **Communication**: 
    - Uses Web Serial API (`window._realNavigatorSerial`) for real Arduino connection (Chrome/Edge recommended).
    - Includes a built-in JavaScript simulator (`window.serialSimulatorInstance`) mimicking `SerialPort` for testing/fallback.
    - Mode switching managed by `InputModeManager` class.
    - Connection logic handled by `ArduinoConnection` class.
- **Event-Driven**: Internal communication uses Custom Events (`forceupdate`, `modechanged`, `sim-control`, etc.) dispatched on `document`.
- **Simulation Control**: In Simulation mode, spacebar press/hold dispatches `sim-control` events to the simulator.
- **Force Processing**: Raw pressure values (from Arduino or simulator) are normalized to a 0-1 range.
- **Visualization**: Uses HTML Canvas for ellipsoid and CSS for force bar. Chart.js for measurement graph.

## Getting Started

1.  Clone the repository.
2.  Open `index.html` in a web browser (Chrome or Edge recommended for full functionality).
3.  **Simulation Mode (Default)**:
    *   The interface starts in Simulation mode.
    *   Press and hold the **Spacebar** to simulate increasing force.
    *   Observe the force bar, debug values, measurement chart (if started), and Flappy Bird (if played) respond.
4.  **Arduino Mode**:
    *   Connect your Arduino device running the expected sketch (see below).
    *   Go to the **Debug** tab.
    *   Click **Use Simulation** (button text changes to "Using Simulation" indicating switch *request*).
    *   Click **Connect to Arduino**.
    *   Select the correct serial port in the browser dialog.
    *   Apply pressure to your sensor; UI elements should respond.
    *   Click **Disconnect** to close the connection.
    *   Click **Using Simulation** (button text changes to "Use Simulation") to switch back to Simulation mode.

## Arduino Sketch (Example)

```cpp
const int forcePin = A0;  // Analog pin for force sensor (Adjust if needed)

void setup() {
  Serial.begin(9600); 
}

void loop() {
  // Read sensor value (e.g., pressure in Pascals, or raw 0-1023)
  // float pressureValue = readPressureSensor(); // Replace with your sensor reading
  int rawValue = analogRead(forcePin); // Example using analogRead
  float pressureValue = map(rawValue, 0, 1023, 101300, 102300); // Example mapping to pressure

  // Send the value followed by a newline
  Serial.println(pressureValue);
  
  // Delay slightly - adjust based on sensor and desired update rate
  delay(20); // Send data roughly 50 times per second
}
```
**Note**: The interface `script.js` currently assumes the Arduino sends pressure values (around 101300 Pa base). Adjust the Arduino code or the normalization constants in `script.js` if your sensor outputs different values (e.g., raw 0-1023).

## Troubleshooting

- **No Connection (Arduino Mode)**: Ensure Chrome/Edge is used, device is plugged in, correct port selected, drivers installed.
- **UI Not Responding**: Check the browser console (F12) for errors. Ensure correct mode is selected.
- **Incorrect Force Values**: Verify the Arduino sketch sends data in the expected format (pressure value per line) and matches the normalization constants in `script.js` (`basePressure`, `pressureRange`).

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