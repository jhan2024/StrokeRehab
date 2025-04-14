# Rehabilitation Device Project Summary

## Project Overview
This project aims to develop a medical rehabilitation device using soft robotics for stroke patients with decreased hand-arm dexterity. The system consists of a silicone membrane hardware component and a user interface software component to enable gamified rehabilitation exercises and progress tracking.

## Problem Statement
Stroke affects approximately 17 million people annually, with 75% experiencing long-term decreased hand-arm dexterity. Current rehabilitation is limited by therapist availability and existing robotic devices are complex. This project aims to create a simpler, more effective tool that:
1. Helps therapists measure rehabilitation progress
2. Enables patients to practice hand movements through gamified exercises

## Hardware Component (Planned)
- Silicone membrane/dome that can be pressurized
- Pressure sensors to measure force
- Capable of detecting touch points/areas (planned)

## Technical Implementation (Software - Current Status)

### Hardware-Software Integration
- **Communication Method**: Web Serial API (via `window._realNavigatorSerial`) or built-in JavaScript Simulator (`window.serialSimulatorInstance`).
- **Architecture**: Event-driven communication using Custom Events (`forceupdate`, `modechanged`, `sim-control`, etc.).
- **State Management**: `InputModeManager` class manages `arduino`/`simulation` mode.
- **Connection Handling**: `ArduinoConnection` class manages connection to real device or simulator.
- **Simulator Control**: Spacebar triggers `sim-control` events to manipulate simulator output.
- **Browser Compatibility**: Web Serial API primarily for Chrome/Edge; Simulator works cross-browser.

### Force Measurement System (Software)
- Accepts raw pressure data from source (real/simulated).
- Normalizes pressure to 0-1 range.
- Dispatches `forceupdate` event with normalized and raw values.
- Measurement tab records normalized force over time, calculates max/avg, displays chart (Chart.js).

### Communication Protocol (Assumed)
- Serial communication at 9600 baud rate.
- Assumes simple text-based protocol (one pressure value per line).

### Game Control Integration
- Flappy Bird game integrated.
- Listens for `forceupdate` event.
- Triggers jump when normalized force exceeds threshold.

## User Interface Requirements (Implemented Features)
- **Main UI**: Two-panel layout (Hardware Control, Main Content) with tabs (Exercises, Measurement, Debug).
- **Hardware Panel**: Device status, Force Bar, Ellipsoid visualization (clickable points).
- **Exercises Tab**: Flappy Bird game card and launch overlay.
- **Measurement Tab**: Start/Stop, Metrics display, Chart, Save (to console).
- **Debug Tab**: Mode switching, Connect/Disconnect (Arduino mode), Live values, Log display.

## Development Status & Next Steps

### Current Status (Based on Code)
- ✅ Core UI structure and styling.
- ✅ Event-driven communication implemented.
- ✅ Dual-mode system (Simulation/Arduino via explicit source selection).
- ✅ Simulator controlled by spacebar via events.
- ✅ Force normalization and dispatching.
- ✅ Debug Tab fully functional.
- ✅ Measurement Tab functional (charting, metrics, console save).
- ✅ Side Panel Visualization functional.
- ✅ Flappy Bird game integrated and controlled by force events.

### Next Steps
- Connect and test with physical Arduino hardware.
- Implement Settings slider functionality.
- Implement additional games.
- Develop Therapist Interface.
- Implement persistent data storage.

## Technical Challenges
- Hardware: Membrane fabrication, multi-touch detection.
- Software: Ensuring robust real-device connection/communication, implementing remaining features.

## Development Timeline

### Current Status (April 2024)
- ✅ Web interface mockup implementation
- ✅ Arduino integration with force sensing
- ✅ Flappy Bird game adaptation for rehabilitation
- ✅ Dual-mode system (hardware/simulation)
- ✅ Force measurement and visualization

### Next Steps
- Membrane fabrication and sensor integration
- Additional games implementation
- Therapist interface development
- User testing and iterative refinement
- Data collection and analysis features 