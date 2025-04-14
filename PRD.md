# Product Requirement Document: Hand Rehabilitation Device User Interface

## 1. Overview

The user interface will serve as the digital component of a soft robotics-based hand rehabilitation device designed for stroke patients with decreased hand-arm dexterity. The system facilitates engaging rehabilitation exercises and tracks progress.

## 2. Target Users

- **Primary Users:** Stroke patients undergoing hand rehabilitation
- **Secondary Users:** Physiotherapists and rehabilitation specialists 

## 3. Core Functionality Requirements

### 3.1 Patient Interface

- **Gamified Exercises**
  - Implement simple, intuitive game controls that respond to varying pressure levels (Currently Flappy Bird; placeholders for Golf, Piano, etc.).
  - Provide clear visual feedback of detected touch points on the membrane (via ellipsoid visualization).
  - Include customizable difficulty settings (Future Phase).
  - Design visually appealing graphics.
  - Support 1D force input games; potential for 2D/multi-touch in future.

- **Real-time Feedback**
  - Display visual representation of applied force with a force bar accurately reflecting current normalized pressure (0-1).
  - Reset force visualization when pressure is released (handled by simulator logic).
  - Show progress indicators during measurement sessions (Max/Avg Force, Duration).
  - Visualize touch points as temporary indicators on ellipsoid when clicked.

- **Measurement**
  - Real-time force vs. time chart using Chart.js.
  - Start/Stop recording of measurement sessions.
  - Display Max Force, Average Force, Duration.
  - Save results functionality (currently logs data to console).

- **Accessibility Features**
  - High-contrast display options (Considered in CSS, can be enhanced).
  - Support customizable control sensitivity (Future Phase - connect UI sliders).
  - Clear, simple instructions with minimal text.
  - One-handed navigation feasible.
  - Option to hide/show the hardware control panel.

### 3.2 Therapist Interface (Future Phase)

- Patient Management
- Progress Monitoring & Data Visualization
- Assessment Tools & Reporting

## 4. Technical Requirements

### 4.1 Device Integration & Communication

- **Hardware Communication**
  - Primary: Web Serial API for direct Arduino connection (if supported by browser and device connected).
  - Fallback/Development: Built-in JavaScript simulator mimicking `SerialPort` behavior.
  - No modification of `navigator.serial`; code uses `window._realNavigatorSerial` or `window.serialSimulatorInstance` based on selected mode.
  - Browser compatibility detection for Web Serial API.

- **Communication Architecture (Event-Driven)**
  - `InputModeManager` class manages state (`arduino`/`simulation`).
  - `ArduinoConnection` class handles connection (real/sim) and data reading/normalization.
  - UI Components communicate via Custom Events (`forceupdate`, `modechanged`, `statusmessage`, `logmessage`) dispatched/listened on `document`.
  - Simulator controlled via `sim-control` Custom Events.

- **Force Data Processing**
  - Input: Raw pressure values (e.g., Pascals) assumed from Arduino/simulator.
  - Normalization: Raw values converted to 0-1 range based on `basePressure` and `pressureRange`.
  - Output: `forceupdate` event dispatched with normalized `force` (0-1) and `rawPressure`.
  - Configurable force threshold (`GAME_FORCE_THRESHOLD` in `InputModeManager`) used by game listener.

- **Arduino Communication Protocol**
  - Serial communication at 9600 baud rate.
  - Assumes simple text-based protocol with one value per line (pressure reading).
  - Error handling for connection issues.
  - Port selection handled by browser's `requestPort()` dialog in Arduino mode.

### 4.2 Data Management (Current & Future)

- **Current**: Measurement data stored in memory during session, logged to console on save.
- **Future**: Secure storage, retrieval, backup, export, session recording.

### 4.3 System Requirements

- Desktop web application.
- Chrome or Edge browser recommended for full Web Serial API functionality.
- Event-driven architecture using vanilla JavaScript, HTML, CSS.

## 5. User Experience Requirements

- **Interface Design**
  - Clean, two-panel layout (Hardware Control, Main Content).
  - Tab-based navigation for Main Content (Exercises, Measurement, Debug).
  - Consistent visual language.
  - 3D-like ellipsoid visualization for the device.

- **Interaction Design**
  - Simple navigation.
  - Clear buttons and status indicators.
  - Real-time feedback on force application (force bar, debug values, measurement chart, game control).
  - Visual representation of touch points corresponds with mouse clicks on ellipsoid.

## 6. Implementation Status & Priorities (Based on current code)

1. **Implemented (MVP Level)**
   - Core UI Structure (HTML/CSS).
   - Tab Switching, Panel Toggle.
   - `InputModeManager` for mode switching (Simulation/Arduino).
   - `ArduinoConnection` for handling real/simulated connections.
   - JavaScript Simulator (`SimulatedSerialPort`) controlled by spacebar via events.
   - Event-Driven communication architecture.
   - Force Normalization.
   - Debug Tab (Status, Mode Toggle, Connect/Disconnect, Live Values, Log).
   - Basic Measurement Tab (Start/Stop, Chart, Metrics Display, Console Save).
   - Side Panel Visualization (Force Bar, Ellipsoid with click interaction).
   - Flappy Bird game integration responding to `forceupdate` events.

2. **Next Steps / Future Phases**
   - Connect and test thoroughly with physical Arduino device.
   - Implement Settings slider functionality.
   - Implement remaining game placeholders (Golf, Piano, etc.).
   - Develop Therapist Interface.
   - Implement robust data storage and retrieval.
   - Enhance accessibility features.
   - Multi-touch detection (if hardware supports).

## 7. Success Metrics

- (As before, but add...)
- Event-driven architecture successfully decouples UI components.
- Mode switching between Simulation and Arduino is reliable.
- Simulator accurately reflects spacebar input for testing.
- UI elements update correctly based on dispatched events.

- Patients report minimal discomfort during 10-minute rehabilitation sessions
- System can accurately detect touch locations with acceptable margin of error
- Game response is proportional to applied force with minimal latency
- Force visualization resets appropriately when pressure is released
- Therapists can effectively track patient progress through the interface
- Patient engagement metrics show consistent usage over time
- Touch point visualization accurately represents the physical interaction with the device
- Arduino communication maintains stable connection for full rehabilitation sessions 