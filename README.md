# Hand Rehabilitation Device Interface

A web-based interface designed for a soft robotics-based hand rehabilitation device for stroke patients.

## Overview

This application provides a user interface for controlling and interacting with a hand rehabilitation device. It allows users to connect to the device (either a real Arduino or a built-in simulator), visualize force input, perform gamified exercises, and measure performance metrics.

## Features

The interface is divided into two main panels:

### 1. Hardware Control Panel (Side Panel)

This panel provides direct control and visualization of the connected device:

-   **Device Status**: Shows the current connection mode (`Simulated` / `Connected` / `Disconnected`) and allows connecting/disconnecting in Arduino mode via the `Connect`/`Disconnect` button.
-   **Touch Visualization**: An interactive 3D-like ellipsoid represents the device. Clicking on it creates temporary visual feedback points.
-   **Force Levels**: A vertical bar dynamically visualizes the currently applied normalized force (ranging from 0 to 1).
-   **Settings**: Contains placeholder sliders for `Sensitivity` and `Force Threshold` (currently not implemented).
-   **Toggle Panel**: A button (`Hide Panel`/`Show Panel`) to collapse or expand the side panel.

### 2. Main Panel (Tabbed Interface)

This panel contains the core application functionalities accessible via tabs:

-   **Gamified Exercises Tab**:
    -   Displays available games as cards.
    -   **Flappy Bird**:
        -   Integrated game controllable via force input.
        -   Based on nebez/floppybird, adapted for rehabilitation.
        -   Force exceeding a threshold (`GAME_FORCE_THRESHOLD`) triggers a jump.
        -   Features single pipe obstacles and refined collision detection.
        -   Launches in an overlay with a close button.
    -   Placeholders for future games (Mini Golf, Piano Keys, Subway Surf).
    -   **Space Shooter**:
        -   Vertical control using force input.
        -   Launched via button, requires spacebar to start gameplay.

-   **Measurement Tab**:
    -   Allows recording and analyzing force data over time.
    -   **Controls**: `Start/Stop Measurement` button to toggle recording; `Save Results` button (currently logs data to the browser console).
    -   **Real-time Metrics**: Displays Maximum Force, Average Force, and Session Duration.
    -   **Data Visualization**: Uses Chart.js to display a live line graph of normalized force versus time during a measurement session.

-   **Debug Tab**:
    -   Provides tools for developers and for managing the input source.
    -   **Mode Switching**: A toggle button (`Use Simulation` / `Using Simulation`) to switch between `simulation` and `arduino` modes.
    -   **Connection Control**: `Connect to Arduino`/`Disconnect` button (enabled only in Arduino mode) for manual port selection and connection via the Web Serial API.
    -   **Status Indicator**: Shows `Simulated`, `Connected`, or `Disconnected` based on the current mode and connection state.
    -   **Live Data**: Displays the latest raw pressure value (e.g., Pascals) and the calculated normalized force (0-1).
    -   **Calibration**: `Calibrate Zero Pressure` button sets the current reading as the baseline; Input field to set the `Pressure Range` used for normalization.
    -   **Data Log**: Displays timestamped messages (e.g., simulator pressure updates, status messages). Includes `Start/Stop Logging` and `Clear Log` controls.

## Technical Architecture

-   **Stack**: Vanilla HTML, CSS, and JavaScript. No external frameworks used for the core UI structure. Chart.js is used for the measurement graph.
-   **Input Sources**:
    -   **Arduino Mode**: Uses the **Web Serial API** (`navigator.serial` or `window._realNavigatorSerial`) for direct communication with a connected Arduino device sending pressure data over serial. Requires Chrome or Edge.
    -   **Simulation Mode**: Uses a built-in JavaScript **Simulator** (`window.serialSimulatorInstance`) that mimics the `SerialPort` interface. This allows development and testing without hardware. Force is simulated by pressing and holding the **Spacebar**.
-   **Core Components**:
    -   `InputModeManager` (`script.js`): Manages the current input mode (`simulation` or `arduino`), handles switching between modes, initializes connections, manages spacebar listeners for the simulator, and dispatches core events. Holds calibration (`basePressure`, `pressureRange`) and game threshold values.
    -   `ArduinoConnection` (`script.js`): Handles the low-level communication logic for both the real Web Serial API and the simulated port. Opens/closes ports, reads incoming data, normalizes it, and triggers force updates via the `InputModeManager`.
    -   `SimulatedSerialPort` (`serial-simulator.js`): A class mimicking the Web Serial `SerialPort` interface. Generates simulated pressure data based on internal state (controlled by `sim-control` events triggered by spacebar presses via `InputModeManager`).
-   **Event-Driven Communication**: The application relies heavily on Custom Events dispatched on the `document` for decoupling components:
    -   `forceupdate`: Dispatched by `InputModeManager` whenever new (normalized) force and raw pressure data is available. UI components (visualizations, measurement, debug display, game) listen for this.
    -   `modechanged`: Dispatched by `InputModeManager` when the mode (`simulation`/`arduino`) or connection status changes. UI elements (buttons, status indicators) listen for this to update their state.
    -   `sim-control`: Dispatched by `InputModeManager` (from spacebar events) to control the `SimulatedSerialPort` (start/stop force increase).
    -   `statusmessage`: Dispatched by various components (e.g., `ArduinoConnection`) to show user feedback messages (e.g., connection success/failure).
    -   `logmessage`: Dispatched by the simulator (or potentially other sources) to add entries to the Debug tab log.
-   **Force Processing**:
    1.  Raw pressure value received (from Arduino or Simulator).
    2.  `ArduinoConnection` normalizes the value using `basePressure` and `pressureRange` (obtained from `InputModeManager`): `normalizedForce = (rawValue - basePressure) / pressureRange`.
    3.  The normalized force is clamped between 0 and 1.
    4.  `InputModeManager` dispatches the `forceupdate` event with both `force` (normalized) and `rawPressure`.
-   **Visualization**:
    -   Ellipsoid and touch points: Drawn using the HTML Canvas API (`#touchCanvas`).
    -   Force Bar: Standard HTML `div` element whose height is updated via CSS.
    -   Measurement Graph: Chart.js library renders onto a Canvas (`#forceChart`).

## Setup and Usage

1.  **Prerequisites**:
    *   A modern web browser. **Google Chrome** or **Microsoft Edge** is required for connecting to a real Arduino device via the Web Serial API.
    *   If using Arduino mode, ensure the Arduino device is programmed to send pressure readings (as floating-point numbers, one per line) over the serial connection at 9600 baud.
2.  **Clone the Repository**: `git clone <repository-url>`
3.  **Open the Interface**: Navigate to the project directory and open the `index.html` file in your web browser.

### Using Simulation Mode (Default)

-   The application typically starts in Simulation mode (especially if Web Serial API is unavailable or no device is connected).
-   The side panel status will show "Simulated". The Debug tab status will also show "Simulated".
-   **Press and hold the Spacebar** on your keyboard. This simulates increasing pressure.
-   Observe the **Force Bar** and **Touch Visualization** in the side panel, the **Live Data** in the Debug tab, and the **Measurement Chart** (if recording) react to the simulated force.
-   Release the Spacebar to simulate decreasing pressure.
-   Games like Flappy Bird can be controlled using the Spacebar in this mode (force threshold still applies).

### Using Arduino Mode

1.  **Connect Hardware**: Connect your programmed Arduino device to your computer via USB.
2.  **Use Chrome/Edge**: Ensure you are using a compatible browser.
3.  **Switch to Arduino Mode**:
    *   Go to the **Debug** tab.
    *   If the toggle button says "Using Simulation", click it. It should change to "Use Simulation", indicating the application is now ready for Arduino connection.
4.  **Connect to Device**:
    *   Click the **Connect to Arduino** button (in the Debug tab) or the **Connect** button (in the Side Panel).
    *   A browser dialog will appear asking you to select the serial port corresponding to your Arduino. Choose the correct port and click "Connect".
5.  **Interact**:
    *   If the connection is successful, the status indicators (Side Panel and Debug Tab) will change to "Connected".
    *   Apply pressure to your sensor connected to the Arduino.
    *   Observe the UI elements (Force Bar, Visualization, Live Data, Measurement, Games) respond to the real sensor input.
6.  **Disconnect**: Click the **Disconnect** button (either in the Side Panel or Debug Tab) to close the serial connection. The status will change to "Disconnected".
7.  **Switch Back to Simulation**: Go to the Debug tab and click the **Use Simulation** button. The application will disconnect from the Arduino (if connected) and switch back to using the internal simulator, enabling spacebar control again.

## Troubleshooting

-   **Cannot Connect (Arduino Mode)**:
    *   Ensure you are using Chrome or Edge. Check browser console (F12) for "Web Serial API not supported" messages.
    *   Verify the Arduino is plugged in and recognized by your operating system.
    *   Make sure you selected the correct serial port in the browser dialog.
    *   Check if Arduino drivers are installed correctly.
    *   Ensure no other software (like the Arduino IDE's Serial Monitor) is connected to the same port.
-   **UI Not Responding / No Force Updates**:
    *   Check the browser console (F12) for JavaScript errors.
    *   Verify the correct mode (Simulation/Arduino) is active in the Debug tab.
    *   If in Arduino mode, confirm the device is connected and sending data. Check the Debug tab's Live Data.
    *   If in Simulation mode, ensure you are pressing the Spacebar.
-   **Incorrect Force Values**:
    *   Check the `basePressure` and `pressureRange` settings in the Debug tab. Use the `Calibrate Zero Pressure` button with no force applied. Adjust the range if needed.
    *   Verify the Arduino sketch is sending pressure values in the expected format (floating-point number per line).

## Development

### Next Steps

1.  **Hardware Control**: Refine connection and data handling with the rehabilitation device.
2.  **Multi-contact support**: Implement support for multiple input sources (e.g., multiple fingers on the device).
3.  **Game Development**: Adapt the placeholder games (Mini Golf, Piano Keys, etc.).
4.  **Data Storage and management**: game sessions and patient data for training, analysis, and reporting.
5.  **AI Therapist**: Integrate AI therapy algorithms for personalized rehabilitation.
6.  **Dashboard**: Design and implement an interface for therapists to manage patients and view progress.
7.  **Calibration**: Implement calibration for the device.
8.  **UI/UX Refinement**: Improve the user experience based on testing and feedback.

### Potential Production Stack

For a more robust production application, consider technologies such as:

-   **Desktop/iPad Application**: Electron (to package the web app as a standalone desktop application).
-   **Mobile Application**: React Native (to package the web app as a standalone mobile application).
-   **LLM Integration**: OpenAI API for advanced AI functionality.