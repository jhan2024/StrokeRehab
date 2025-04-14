# Hand Rehabilitation Device Interface - Development Summary

## Initial Interface Design
- Created a desktop application with two main panels:
  - **Side Panel**: For hardware control, visualization, and settings
  - **Main Panel**: For switching between gamified exercises and measurement functions

## Key Interface Components

### Hardware Control Panel
- **Device Status**: Shows connection status with connect/disconnect functionality
- **Touch Visualization**: 3D ellipsoid representing the device with interactive touch points
- **Force Measurement**: Visual bar showing pressure applied to the device
- **Settings**: Sensitivity and force threshold adjustments (Note: Sliders are present but not currently connected)
- **Panel Toggle**: Option to hide/show the control panel

### Gamified Exercises
- Multiple rehabilitation games including:
  - Flappy Bird (1D control)
  - (Placeholders for Mini Golf, Piano Keys, Subway Surf)
- Game cards with visual representations and play functionality

### Measurement Panel
- Real-time force measurement visualization using Chart.js
- Data collection with start/stop functionality
- Results saving capability (currently logs to console)
- Force vs. time graphical representation
- Display of Max Force, Average Force, and Duration

### Debug Panel
- Connection status indicator (Simulated/Connected/Disconnected)
- Buttons to connect/disconnect from Arduino (in Arduino mode)
- Button to switch between Simulation and Arduino modes
- Live display of raw pressure and normalized force values
- Input data log with Start/Stop/Clear functionality (logging driven by simulator)

## Interactive Features
- **Force Control**: 
    - **Simulation Mode**: Spacebar press/hold controls simulated pressure, which drives UI and game.
    - **Arduino Mode**: Real sensor data drives UI and game.
- **Touch Visualization**: Click to create temporary touch points on the device ellipsoid.
- **Real-time Feedback**: Visual indicators for force (bar, ellipsoid touch point size), debug values, and measurement chart.

## Implemented Games

### Flappy Bird
- **Implementation**: Integrated based on nebez/floppybird.
- **Adaptations**: Reduced gravity, jump power, speed; wider pipes, longer intervals.
- **Rehabilitation Focus**: Connected to force measurement via event listener (`forceupdate`). Jump triggered when normalized force exceeds threshold.
- **Interface**: Launches in overlay, close button returns to main view.

## Arduino Integration & Simulation

### Communication Architecture
- **Primary Method**: Web Serial API for direct browser-to-Arduino communication (via `window._realNavigatorSerial` if available).
- **Simulation**: Built-in simulator (`window.serialSimulatorInstance`) mimics the `SerialPort` interface.
- **No `navigator.serial` Modification**: Code uses either the real API or the simulator instance based on application state, avoiding direct modification of `navigator.serial`.
- **Event-Driven Data Flow**: Components communicate via Custom Events (`forceupdate`, `modechanged`, `sim-control`, `statusmessage`, `logmessage`) dispatched on `document`.
- **`InputModeManager`**: Manages the current mode (`simulation` or `arduino`), connects/disconnects the appropriate source (`ArduinoConnection`), and dispatches events.
- **`ArduinoConnection`**: Handles port connection (real or simulated), reading, data normalization, and calling `InputModeManager.handleForceUpdate`.
- **Simulator Control**: In simulation mode, spacebar events dispatch `sim-control` events, which the simulator instance listens for to adjust its generated pressure.

### Signal Processing
- **Input**: Accepts raw pressure values (e.g., Pascals) from Arduino or simulator.
- **Normalization**: Converts raw pressure to a 0-1 normalized force value based on defined `basePressure` and `pressureRange`.
- **Output**: Dispatches `forceupdate` event containing both `force` (0-1) and `rawPressure`.
- **Threshold**: `InputModeManager` holds `GAME_FORCE_THRESHOLD` used by game listeners.

### Force Data Flow (Event-Driven)
1. Arduino/Simulator provides pressure data.
2. `ArduinoConnection.startReading` reads and normalizes data.
3. `ArduinoConnection` calls `InputModeManager.handleForceUpdate`.
4. `InputModeManager` dispatches `forceupdate` event with `{ force, rawPressure }`.
5. UI listeners (Debug, Measurement, Visualization, Game) receive the event and update accordingly.

## Design Decisions
- **Event-Driven Architecture**: Decouples UI components, improving maintainability.
- **Simulator as Port Object**: Simulator mimics the `SerialPort` interface for consistent handling by `ArduinoConnection`.
- **Global Instances**: Minimal use (`window._realNavigatorSerial`, `window.serialSimulatorInstance`, `window.inputManager`) where necessary for cross-module access or state management.
- Clean interface, focus on rehabilitation, temporary touch points, force bar resets (via simulator logic).
- Dual-mode input system for development and deployment flexibility.

## Next Steps
1. Connect and test with actual Arduino hardware device.
2. Implement functionality for Settings sliders (Sensitivity, Threshold).
3. Implement remaining games.
4. Develop Therapist interface and data storage/analytics.
5. Refine UI/UX based on testing. 