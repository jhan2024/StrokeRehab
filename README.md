# Hand Rehabilitation Device Interface

A web-based interface designed for a soft robotics-based hand rehabilitation device for stroke patients, supporting both single-input (1-Dome) and multi-input (3-Dome) configurations.

## Overview

This application provides a user interface for controlling and interacting with a hand rehabilitation device. It allows users to select the device type (1-Dome or 3-Dome), connect to the device (either a real Arduino or a built-in simulator), visualize force input(s), perform gamified exercises, and measure performance metrics.

## Features

The interface is divided into two main panels:

### 1. Hardware Control Panel (Side Panel)

This panel provides direct control and visualization of the connected device:

-   **Device Status**: Shows the current connection mode (`Simulated` / `Connected` / `Disconnected`) and allows connecting/disconnecting in Arduino mode via the `Connect`/`Disconnect` button.
-   **Force Visualization**: Dynamically displays 1 or 3 vertical force bars based on the selected device type. Labels include input hints (e.g., SPACEBAR for 1-Dome simulation, A/S/D for 3-Dome simulation).
-   **Settings**: Contains placeholder sliders for `Sensitivity` and `Force Threshold` (currently not implemented).
-   **Toggle Panel**: A button (`Hide Panel`/`Show Panel`) to collapse or expand the side panel.

### 2. Main Panel (Tabbed Interface)

This panel contains the core application functionalities accessible via tabs:

-   **Gamified Exercises Tab**:
    -   Displays available games as cards.
    -   **Flappy Bird**:
        -   Integrated game controllable via the first force input.
        -   Force exceeding a threshold triggers a jump.
    -   **Rhythm Keys**:
        -   If a '3-Dome' device is selected, uses the first three force inputs to control the game lanes.
        -   If a '1-Dome' device is selected, the single force input is mapped to the middle lane.
    -   Placeholders for future games (Mini Golf, Piano Keys, Subway Surf).
    -   **Space Shooter**:
        -   Vertical control using the first force input.

-   **Measurement Tab**:
    -   Allows recording and analyzing force data over time.
    -   **Controls**: `Start/Stop Measurement` button to toggle recording; `Save Results` button (currently logs data to the browser console).
    -   **Real-time Metrics**: Displays Maximum Force, Average Force, and Session Duration. For 3-Dome devices, these summary metrics are based on the first sensor's data.
    -   **Data Visualization**: Uses Chart.js to display a live line graph of normalized force(s) versus time. Shows 1 or 3 lines based on the selected device type.

-   **Settings Tab** (formerly Debug Tab):
    -   Provides tools for developers and for managing the input source and device configuration.
    -   **Device Type Selection**: Radio buttons to choose between "1-Dome" and "3-Dome" device types. This affects simulation, UI display, and data processing.
    -   **Mode Switching**: A toggle button (`Use Simulation` / `Using Simulation`) to switch between `simulation` and `arduino` modes.
    -   **Connection Control**: `Connect to Arduino`/`Disconnect` button (enabled only in Arduino mode) for manual port selection and connection via the Web Serial API.
    -   **Status Indicator**: Shows `Simulated`, `Connected`, or `Disconnected` based on the current mode and connection state.
    -   **Live Sensor Readings**: Displays the latest raw pressure values (e.g., Pascals) and calculated normalized forces (0-1) for up to 3 sensors. Sensor groups 2 and 3 are shown/hidden based on the selected device type.
    -   **Calibration Controls**:
        -   `Calibrate Zero Pressure` button sets the current reading(s) as the baseline.
        -   Input fields to set the `Pressure Range` for normalization for up to 3 sensors. Input fields for sensors 2 and 3 are shown/hidden based on selected device type.
    -   **Data Log**: Displays timestamped messages (e.g., simulator data, status messages). Includes `Start/Stop Logging` and `Clear Log` controls.

## Technical Architecture

-   **Stack**: Vanilla HTML, CSS, and JavaScript. Chart.js is used for the measurement graph.
-   **Input Sources**:
    -   **Arduino Mode**: Uses the **Web Serial API** (`navigator.serial` or `window._realNavigatorSerial`) for direct communication.
        -   For 1-Dome devices, expects a single floating-point pressure value per line.
        -   For 3-Dome devices, expects data as a JSON string per line: `{"normalizedForces": [f1, f2, f3], "rawPressures": [r1, r2, r3]}`.
    -   **Simulation Mode**: Uses a built-in JavaScript **Simulator** (`window.serialSimulatorInstance`) that mimics the `SerialPort` interface.
        -   Simulates 1-Dome devices (force controlled by **Spacebar**).
        -   Simulates 3-Dome devices (forces controlled by **A, S, D keys**).
        -   Outputs data in the same JSON format as a 3-Dome Arduino.
        -   Respects per-dome calibration values set in the Settings Tab.
-   **Core Components**:
    -   `InputModeManager` (`input_mode_manager.js`): Manages `currentMode` (`simulation`/`arduino`) and `currentDeviceType` ('1-dome'/'3-dome'). Handles mode/type switching, initializes connections (via `ArduinoConnection`), dispatches core events. Holds calibration values (`basePressures`, `pressureRanges`) and current forces/pressures as arrays.
    -   `ArduinoConnection` (`sensor_interface.js`): Handles low-level communication for both real Web Serial API and the simulated port. Uses callbacks for data and status updates. Parses incoming data (single float or JSON).
    -   `SimulatedSerialPort` (`serial-simulator.js`): Class mimicking Web Serial `SerialPort`. Generates simulated data for 1-dome or 3-dome devices, respecting calibration values and responding to key presses or `sim-control` events.
    -   `game_control.js`: Manages game button interactions and funnels force data from `EVT_FORCE_UPDATE` to active games, adapting for 1-dome or 3-dome input as needed.
    -   `constants.js`: Centralized file for shared JavaScript event names (e.g., `EVT_FORCE_UPDATE`).
-   **Event-Driven Communication**: The application uses Custom Events on the `document`:
    -   `EVT_FORCE_UPDATE`: Dispatched by `InputModeManager` with `detail: { forces: [f1, f2, f3], rawPressures: [r1, r2, r3], deviceType: '1-dome'/'3-dome' }`.
    -   `EVT_MODE_CHANGED`: Dispatched by `InputModeManager` with `detail: { mode, deviceType, isConnected }`.
    -   `EVT_SIM_CONTROL`: Dispatched by `InputModeManager` (from spacebar events in 1-dome sim) to `SimulatedSerialPort`.
    -   `EVT_STATUS_MESSAGE`: Dispatched for user feedback.
    -   `EVT_LOG_MESSAGE`: Dispatched to add entries to the Settings Tab log.
    -   `EVT_PRESSURE_RANGES_CHANGED`: Dispatched by `InputModeManager` when pressure range calibration values are updated.
-   **Force Processing**:
    1.  Raw pressure values received (from Arduino as float/JSON or Simulator as JSON).
    2.  `ArduinoConnection` parses data. For single float (old 1-dome), it normalizes directly. For JSON, it passes arrays.
    3.  `InputModeManager` receives processed data (arrays of normalized forces and raw pressures) from `ArduinoConnection`'s data handler.
    4.  `InputModeManager` dispatches `EVT_FORCE_UPDATE`.
-   **Visualization**:
    -   Force Bars: 1 or 3 HTML `div` elements whose heights are updated via CSS, managed by `script.js`.
    -   Measurement Graph: Chart.js library.

## Setup and Usage

1.  **Prerequisites**:
    *   A modern web browser. **Google Chrome** or **Microsoft Edge** is required for Arduino mode.
    *   If using Arduino mode:
        *   1-Dome device: Program to send pressure readings (float per line) at 9600 baud.
        *   3-Dome device: Program to send JSON strings (`{"normalizedForces": [f1,f2,f3], "rawPressures": [r1,r2,r3]}` per line) at 9600 baud.
2.  **Clone the Repository**: `git clone <repository-url>`
3.  **Open the Interface**: Open `index.html` in your browser.

### Using Simulation Mode (Default)

-   The app usually starts in Simulation mode. Status indicators show "Simulated".
-   Go to the **Settings Tab** to select "1-Dome" or "3-Dome" device type.
-   **1-Dome Simulation**: Press and hold **Spacebar** for force.
-   **3-Dome Simulation**: Press and hold **A, S, D keys** for forces on sensors 1, 2, and 3 respectively.
-   Observe the **Force Bar(s)**, **Live Sensor Readings** (Settings Tab), and **Measurement Chart** (if recording).
-   Games respond accordingly (e.g., Flappy Bird to Spacebar/first sensor, Rhythm Keys to A,S,D in 3-dome sim).

### Using Arduino Mode

1.  **Connect Hardware**: Connect your programmed Arduino device.
2.  **Use Chrome/Edge**.
3.  **Switch to Arduino Mode**:
    *   Go to the **Settings Tab**.
    *   Select the correct "Device Type" (1-Dome or 3-Dome) for your hardware.
    *   Click the mode toggle button if it says "Using Simulation".
4.  **Connect to Device**:
    *   Click **Connect to Arduino** (Settings Tab or Side Panel).
    *   Select the correct serial port.
5.  **Interact**:
    *   Status indicators should show "Connected".
    *   Apply pressure to your sensor(s). UI elements respond to real input.
6.  **Disconnect**: Click **Disconnect**.
7.  **Switch Back to Simulation**: In Settings Tab, click **Use Simulation**.

## Troubleshooting

-   **Cannot Connect (Arduino Mode)**:
    *   Verify browser, Arduino connection, port selection, drivers, and ensure no other software is using the port.
-   **UI Not Responding / No Force Updates**:
    *   Check browser console (F12). Verify mode and device type in **Settings Tab**.
    *   Arduino mode: Confirm device connection and data format (check Live Data in Settings Tab).
    *   Simulation mode: Ensure correct keys are used (Spacebar for 1-Dome, A/S/D for 3-Dome).
-   **Incorrect Force Values**:
    *   Check `basePressure` (using "Calibrate Zero Pressure") and `pressureRange` settings (for each active sensor) in the **Settings Tab**.
    *   Verify Arduino sketch data format and values.

## Development

### Next Steps

1.  **Hardware Control**: Refine connection and data handling with the rehabilitation device.
2.  **Multi-contact support**: (Largely implemented with 3-Dome structure, further refinements possible).
3.  **Game Development**: Adapt the placeholder games (Mini Golf, Piano Keys, etc.).
4.  **Data Storage and management**: game sessions and patient data for training, analysis, and reporting.
5.  **AI Therapist**: Integrate AI therapy algorithms for personalized rehabilitation.
6.  **Dashboard**: Design and implement an interface for therapists to manage patients and view progress.
7.  **Calibration**: Implement calibration for the device. (Initial per-sensor range calibration is present).
8.  **UI/UX Refinement**: Improve the user experience based on testing and feedback.

### Potential Production Stack

For a more robust production application, consider technologies such as:

-   **Desktop/iPad Application**: Electron (to package the web app as a standalone desktop application).
-   **Mobile Application**: React Native (to package the web app as a standalone mobile application).
-   **LLM Integration**: OpenAI API for advanced AI functionality.