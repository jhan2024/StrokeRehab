document.addEventListener('DOMContentLoaded', function() {
    


    // Tab Switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Function to switch tabs
    function switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const tabElementId = tabId === 'debug' ? 'debugContent' : tabId;
        const selectedTab = document.getElementById(tabElementId);
        const selectedBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        
        if (selectedTab && selectedBtn) {
            selectedTab.classList.add('active');
            selectedBtn.classList.add('active');
            if (tabId === 'debug') {
                initializeDebugTab(); // Re-initialize event listeners if needed
            }
        }
    }
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // Side Panel Toggle
    const togglePanelBtn = document.querySelector('.toggle-panel-btn');
    const sidePanel = document.querySelector('.side-panel');
    const mainPanel = document.querySelector('.main-panel');
    
    togglePanelBtn.addEventListener('click', () => {
        sidePanel.classList.toggle('hidden');
        if (sidePanel.classList.contains('hidden')) {
            sidePanel.style.marginLeft = '-280px';
            mainPanel.style.width = '100%';
            mainPanel.style.marginLeft = '0';
            togglePanelBtn.textContent = 'Show Panel';
        } else {
            sidePanel.style.marginLeft = '0';
            mainPanel.style.width = 'calc(100% - 280px)';
             mainPanel.style.marginLeft = '0'; // Ensure main panel doesn't shift unexpectedly
            togglePanelBtn.textContent = 'Hide Panel';
        }
    });
    
    // --- Event Names --- (Define constants for event names)
    const EVT_FORCE_UPDATE = 'forceupdate';
    const EVT_MODE_CHANGED = 'modechanged';
    const EVT_SIM_CONTROL = 'sim-control';
    const EVT_STATUS_MESSAGE = 'statusmessage';
    const EVT_LOG_MESSAGE = 'logmessage';
    
    // --- Arduino Communication Class (Minor change: dispatch status) ---
    class ArduinoConnection {
        constructor() {
            this.port = null;
            this.reader = null;
            this.isConnected = false;
            this.isWebSerialSupported = 'serial' in navigator;
        }

        async connect() {
            // Determine which serial source to use based on the Input Manager's state
            const useSimulator = window.inputManager && window.inputManager.currentMode === 'simulation';
            const serialSource = useSimulator ? null : window._realNavigatorSerial; // Use null for simulator path, real API otherwise
            
            console.log(`ArduinoConnection.connect called. Mode: ${inputManager.currentMode}, UseSimulator: ${useSimulator}`);

            if (!useSimulator && !serialSource) {
                 console.error('Arduino Mode Error: Real Web Serial API not available.');
                 document.dispatchEvent(new CustomEvent(EVT_STATUS_MESSAGE, { detail: { message: 'Real Web Serial API not supported or available.', type: 'error' } }));
                 return false;
            }
             if (useSimulator && !window.serialSimulatorInstance) {
                  console.error('Simulation Mode Error: Simulator instance not found!');
                  document.dispatchEvent(new CustomEvent(EVT_STATUS_MESSAGE, { detail: { message: 'Simulator instance not found. Please reload.', type: 'error' } }));
                  return false;
             }

            try {
                if (useSimulator) {
                    console.log("Connecting to SIMULATOR...");
                    this.port = window.serialSimulatorInstance; // Assign the simulator instance
                    if (!this.port.isOpen) {
                        console.log("Simulator port was closed, reopening...");
                         await this.port.open({ baudRate: 9600 }); // Open the simulator port
                    }
                    console.log("Simulator port assigned and confirmed open.");
                } else {
                    // Using REAL Web Serial API
                    console.log("Requesting REAL serial port from user...");
                    // Use the stored real API object to request port
                    this.port = await serialSource.requestPort(); 
                    console.log("Real port received:", this.port);
                    await this.port.open({ baudRate: 9600 });
                    console.log("Real port opened.");
                }

                // Common connection logic 
                this.isConnected = true;
                document.dispatchEvent(new CustomEvent(EVT_STATUS_MESSAGE, { 
                    detail: { 
                        message: useSimulator ? 'Simulator connected successfully!' : 'Device connected successfully!', 
                        type: 'success' 
                    } 
                }));
                this.updateDebugUIState(true);
                this.startReading(); 
                return true;

            } catch (error) {
                console.error('Connection error:', error);
                 let message = `Failed to connect: ${error.message}`;
                 if (error.name === 'NotFoundError' || error.name === 'NotAllowedError') {
                     message = 'Port selection cancelled or denied.';
                 }
                  document.dispatchEvent(new CustomEvent(EVT_STATUS_MESSAGE, { 
                     detail: { message: message, type: 'error' } 
                  }));
                 this.isConnected = false;
                 this.port = null; 
                 this.updateDebugUIState(false);
                 return false;
            }
        }

        async disconnect() {
            console.log("Disconnecting...");
            const wasConnected = this.isConnected;
            this.isConnected = false; // Set disconnected state early
            
            if (this.reader) {
                try {
                    await this.reader.cancel('Disconnecting'); 
                    console.log("Reader cancelled.");
                } catch(e) { console.error("Error cancelling reader:", e);}
                 this.reader = null;
            }

            // this.port could be the simulator instance or a real port object
            if (this.port) {
                 try {
                    // close() should work for both real ports and our simulator instance
                    await this.port.close(); 
                    console.log("Port closed.");
                } catch (e) { console.error("Error closing port:", e); }
                this.port = null;
            }

             if (wasConnected) { // Only show message if we were actually connected
                 document.dispatchEvent(new CustomEvent(EVT_STATUS_MESSAGE, { 
                    detail: { message: 'Device/Simulator disconnected.', type: 'error' } 
                 }));
             }
            this.updateDebugUIState(false);
        }

        updateDebugUIState(connected) {
             const debugStatusIndicator = document.querySelector('#debugContent .debug-status-indicator');
             const connectBtn = document.querySelector('#debugContent .connect-btn');
             if (!debugStatusIndicator || !connectBtn) return; 

             if(connected) {
                 debugStatusIndicator.textContent = 'Connected';
                 debugStatusIndicator.classList.remove('disconnected');
                 debugStatusIndicator.classList.add('connected');
                 connectBtn.textContent = 'Disconnect';
             } else {
                  debugStatusIndicator.textContent = 'Disconnected';
                 debugStatusIndicator.classList.remove('connected');
                 debugStatusIndicator.classList.add('disconnected');
                 connectBtn.textContent = 'Connect to Arduino';
             }
        }

        async startReading() {
            console.log("Starting read loop...");
            // Ensure we are connected before proceeding
            if (!this.isConnected || !this.port || !this.port.readable) {
                 console.log("Cannot start reading: not connected or port not readable.");
                 return;
            }
            
            // Keep reading until disconnect is called or an error occurs
            while (this.isConnected) {
                // Get reader within the loop in case of reconnection/re-establishment needs
                 if (!this.reader) {
                     try {
                         this.reader = this.port.readable.getReader();
                         console.log("Reader obtained.");
                     } catch (readerError) {
                         console.error("Error getting reader:", readerError);
                         await this.disconnect();
                         break; // Exit outer loop on reader error
                     }
                 }

                let rawValue = NaN; 
                try {
                    // console.log("Attempting to read...");
                    const { value, done } = await this.reader.read();
                    
                    if (done) {
                        console.log("Reader reported done=true. Stream likely closed.");
                        this.reader.releaseLock(); // Release lock as per spec
                        this.reader = null;
                         // Assume disconnection if stream ends unexpectedly
                         if (this.isConnected) {
                            console.log("Stream ended unexpectedly, disconnecting...");
                             await this.disconnect();
                         }
                        break; // Exit outer loop
                    }
                    
                    // Process the received data
                    const rawValueString = new TextDecoder().decode(value).trim(); 
                    // console.log("Raw value string:", rawValueString);
                    rawValue = parseFloat(rawValueString); 
                    let normalizedForce = 0;

                    // Example: If data is just `rawValue`
                    if (!isNaN(rawValue)) {
                        
                        if (rawValue < 100000) {
                            // console.log("Raw value is less than 100000: ", rawValue);
                            rawValue = 100000;
                        }

                        // pressure
                        const basePressure = 100000; //101300; 
                        const pressureRange = 20000;  
                        normalizedForce = (rawValue - basePressure) / pressureRange;
                        normalizedForce = Math.max(0, Math.min(1, normalizedForce)); 
                    
                         // Directly call the InputModeManager's handler
                         if (window.inputManager) {
                             window.inputManager.handleForceUpdate(normalizedForce, rawValue);
                         } else {
                              console.error("InputManager instance not found!");
                         }
                    } else {
                         console.warn("Received non-numeric data:", rawValueString);
                         // Optionally pass NaN or skip update
                         // if (this.onForceUpdate) this.onForceUpdate(0, NaN);
                    }

                } catch (error) {
                    console.error('Read error:', error);
                    if (this.reader) {
                         this.reader.releaseLock();
                         this.reader = null;
                    }
                    // Disconnect on error
                    await this.disconnect();
                    break; // Exit outer loop
                } 
                // No finally block needed here as lock release/disconnect handled in catch/done
            }
            console.log("Exited read loop.");
        }
    }

    // --- Input Mode Manager Class (Major changes: Events, no callbacks) ---
    class InputModeManager {
        constructor() {
            this.arduino = new ArduinoConnection();
            this.currentMode = window._realNavigatorSerial ? 'arduino' : 'simulation';
            console.log(`InputModeManager initial mode: ${this.currentMode}`);
            
            this.currentForce = 0; 
            this.spacebarPressed = false;
            this.spacebarHoldStartTime = 0;
            this._boundKeyDown = null; 
            this._boundKeyUp = null;   
            this.GAME_FORCE_THRESHOLD = 0.1; 

             // Add browser compatibility warning if needed (only if real serial is attempted)
             if (!this.arduino.isWebSerialSupported) {
                 const warningMsg = document.createElement('div');
                 warningMsg.className = 'browser-warning';
                 warningMsg.innerHTML = '<strong>Note:</strong> Real Arduino connection requires Chrome or Edge. Simulator available.';
                 const firstControlSection = document.querySelector('.side-panel .control-section');
                 if (firstControlSection) {
                     firstControlSection.parentNode.insertBefore(warningMsg, firstControlSection);
                 } else {
                     document.querySelector('.side-panel').prepend(warningMsg); // Fallback
                 }
             }
             
             // Set initial state after a short delay
             setTimeout(() => {
                 if (this.currentMode === 'simulation') {
                     this.setupSpacebarListeners();
                     this.arduino.connect(); // Auto-connect (connect handles setting callbacks implicitly now)
                 } else {
                     this.cleanupSpacebarListeners();
                 }
                 // Dispatch initial mode state
                 document.dispatchEvent(new CustomEvent(EVT_MODE_CHANGED, { detail: { mode: this.currentMode, isConnected: this.arduino.isConnected } }));
             }, 150); // Slightly longer delay for init
        }

        async switchMode(mode) {
             console.log(`Attempting to switch mode to: ${mode}`);
             // Prevent switching to Arduino if real API doesn't exist
             if (mode === 'arduino' && !window._realNavigatorSerial) { 
                this.arduino.showStatusMessage('Cannot switch to Arduino mode: Real Web Serial API not available.', 'error');
                this.updateModeUI(); // Revert UI
                return;
             }
             
            if (mode === this.currentMode) return;

            // --- Cleanup Current Mode --- 
            console.log(`Cleaning up previous mode: ${this.currentMode}`);
            // Disconnect regardless of previous mode (safer)
             if (this.arduino.isConnected) {
                 await this.arduino.disconnect();
             }
             // Manage listeners based on the mode we are *leaving*
            if (this.currentMode === 'simulation') {
                 this.cleanupSpacebarListeners();
                 // Close the simulator port instance when leaving simulation mode
                 if (window.serialSimulatorInstance && window.serialSimulatorInstance.isOpen) {
                     await window.serialSimulatorInstance.close();
                     console.log("Closed simulator port instance.");
                 }
            } else { // Leaving Arduino mode
                this.cleanupSpacebarListeners(); // Ensure listeners off
            }

            // --- Set and Setup New Mode --- 
            this.currentMode = mode;
            console.log(`Set currentMode to: ${this.currentMode}`);

            if (this.currentMode === 'simulation') {
                // Auto-connect to simulator when switching to sim mode
                console.log("Setting up simulation mode: Auto-connecting...");
                const connected = await this.arduino.connect(); // connect() knows to use simulator
                if (connected) {
                    this.setupSpacebarListeners(); // Enable spacebar control
                } else {
                     console.error("Failed to auto-connect to simulator during switch!");
                }
            } else { // 'arduino' mode
                // Don't auto-connect. Set callback, ready for user action.
                 console.log("Switched to Arduino mode. Ready for user connection.");
            }

            this.updateModeUI(); // Update UI to reflect the final state
            
            // Dispatch mode change event AFTER attempting connection/setup
            document.dispatchEvent(new CustomEvent(EVT_MODE_CHANGED, { detail: { mode: this.currentMode, isConnected: this.arduino.isConnected } }));
        }
        
        // Central handler - now dispatches forceupdate event
        handleForceUpdate(normalizedForce, rawPressure) {
            this.currentForce = normalizedForce; 
            // console.log(`InputManager: Handling force update. Force: ${normalizedForce.toFixed(3)}, Raw: ${rawPressure}`); // Log 1
            
            // Dispatch event with both values
            // console.log(`InputManager: Dispatching ${EVT_FORCE_UPDATE}`); // Log 2
            document.dispatchEvent(new CustomEvent(EVT_FORCE_UPDATE, { 
                detail: { force: normalizedForce, rawPressure: rawPressure }
            }));
        }

        setupSpacebarListeners() {
            this.cleanupSpacebarListeners(); // Ensure no duplicates
            this._boundKeyDown = this.handleKeyDown.bind(this);
            this._boundKeyUp = this.handleKeyUp.bind(this);
            document.addEventListener('keydown', this._boundKeyDown);
            document.addEventListener('keyup', this._boundKeyUp);
            console.log("Spacebar listeners ADDED for simulator control");
        }

        cleanupSpacebarListeners() {
            if (this._boundKeyDown) {
                document.removeEventListener('keydown', this._boundKeyDown);
                this._boundKeyDown = null;
            }
            if (this._boundKeyUp) {
                document.removeEventListener('keyup', this._boundKeyUp);
                this._boundKeyUp = null;
            }
            // Ensure simulator state is reset if listeners removed while key was down
             if (this.spacebarPressed) {
                 this.spacebarPressed = false;
                 if (window.serialSimulatorInstance && typeof window.serialSimulatorInstance.stopForceIncrease === 'function') {
                     window.serialSimulatorInstance.stopForceIncrease(0); // Reset simulator immediately
                 }
                 this.spacebarHoldStartTime = 0;
             }
            console.log("Spacebar listeners REMOVED");
        }

        // Spacebar handlers - now dispatch sim-control events OR handle game starts/jumps
        handleKeyDown(e) {
            if (!this._boundKeyDown) return; 
            if (e.code === 'Space') {
                e.preventDefault(); // Prevent default scroll

                // 1. Handle Simulator Control (If in Sim mode)
                if (this.currentMode === 'simulation') {
                    if (!this.spacebarPressed) {
                        this.spacebarPressed = true;
                        this.spacebarHoldStartTime = Date.now();
                        document.dispatchEvent(new CustomEvent(EVT_SIM_CONTROL, { detail: { action: 'start' } }));
                    }
                    return; // Don't process game actions if controlling simulator
                }

                // 2. Handle Game Actions (If a game is active)
                if (isGameControlActive) { // Flappy Bird Active
                    // Check if flappy jump function exists and call it
                    if (typeof window.flappyGameJump === 'function') {
                        window.flappyGameJump();
                    } else {
                        console.warn("window.flappyGameJump function not found!");
                    }
                } else if (isSpaceShooterActive) { // Space Shooter Active
                    // Spacebar doesn't start Space Shooter; it's started via button press
                    // and restarted via its own game over listener.
                    // if (typeof startGame === 'function' && typeof window.isSpaceShooterRunning === 'function' && !window.isSpaceShooterRunning()) {
                         console.log("Spacebar pressed: Starting Space Shooter.");
                    // } else if (typeof startGame !== 'function') {
                    //     console.warn("startGame function not found for Space Shooter!");
                    // } else if (typeof window.isSpaceShooterRunning !== 'function'){
                    //     console.warn("isSpaceShooterRunning function not found!");
                    // }
                }
            }
        }

        handleKeyUp(e) {
             if (!this._boundKeyUp) return; 
             if (e.code === 'Space' && this.spacebarPressed) {
                 if (this.currentMode === 'simulation' || (this.currentMode === 'arduino' && window.serialSimulatorInstance?.isOpen)) {
                    this.spacebarPressed = false;
                    const holdDuration = Date.now() - this.spacebarHoldStartTime;
                    // Dispatch event to control simulator
                    document.dispatchEvent(new CustomEvent(EVT_SIM_CONTROL, { detail: { action: 'stop', duration: holdDuration } }));
                     this.spacebarHoldStartTime = 0;
                    e.preventDefault();
                 }
            }
        }

        updateModeUI() {
            // Update Debug Tab UI elements based on this.currentMode
            console.log(`Updating UI for mode: ${this.currentMode}`);
             const simToggle = document.querySelector('#debugContent .simulation-toggle');
             const connectBtn = document.querySelector('#debugContent .connect-btn');
             const statusIndicator = document.querySelector('#debugContent .debug-status-indicator');

             if (this.currentMode === 'simulation') {
                 if (simToggle) {
                     simToggle.classList.add('active');
                     simToggle.textContent = 'Using Simulation';
                 }
                 // Disable connect button in sim mode as connection is automatic
                 if (connectBtn) connectBtn.disabled = true; 
                 if (statusIndicator) { // Show simulator as 'connected' conceptually
                      statusIndicator.textContent = 'Simulated'; 
                      statusIndicator.classList.remove('disconnected');
                      statusIndicator.classList.add('connected'); // Use connected style for sim
                 }
             } else { // 'arduino' mode
                 if (simToggle) {
                     simToggle.classList.remove('active');
                     simToggle.textContent = 'Use Simulation';
                 }
                  // Enable connect button in Arduino mode
                  if (connectBtn) connectBtn.disabled = false; 
                 // Status indicator reflects actual connection state (updated by connect/disconnect)
                 if (statusIndicator) {
                     const connected = this.arduino.isConnected;
                     statusIndicator.textContent = connected ? 'Connected' : 'Disconnected';
                     statusIndicator.classList.toggle('connected', connected);
                     statusIndicator.classList.toggle('disconnected', !connected);
                 }
             }
             // Update Side Panel status indicator
             const sidePanelStatus = document.querySelector('.side-panel .status-indicator');
             if(sidePanelStatus) {
                 const connected = this.arduino.isConnected;
                 const simMode = this.currentMode === 'simulation';
                 sidePanelStatus.textContent = simMode ? 'Simulated' : (connected ? 'Connected' : 'Disconnected');
                 sidePanelStatus.classList.toggle('connected', simMode || connected);
                 sidePanelStatus.classList.toggle('disconnected', !simMode && !connected);
             }
        }
    }

    // --- Initialize Input Manager ---
    const inputManager = new InputModeManager();
    window.inputManager = inputManager; // Keep global ref if needed by ArduinoConnection

    // ---> ADDED: Global variable for game access <---
    window.latestNormalizedForce = 0; 

    // --- UI Element References (Cached) ---
    const sidePanelConnectBtn = document.getElementById('side-panel-connect-btn'); // Assuming this ID for the blue button
    const sidePanelStatusIndicator = document.querySelector('.side-panel .status-indicator');
    const statusMessageContainer = document.body; // Or a dedicated container
    const debugPressureValue = document.getElementById('pressureValue');
    const debugRawValue = document.getElementById('rawValue');
    const debugLastUpdate = document.getElementById('lastUpdate');
    const arduinoLogElement = document.getElementById('arduinoLog');
    const measureBtn = document.querySelector('.measure-btn');
    const saveBtn = document.querySelector('.save-btn');
    const measurementDisplay = document.querySelector('.measurement-display');
    const forceChartCanvas = document.getElementById('forceChart');
    const touchCanvas = document.getElementById('touchCanvas');
    const playFlappyBtn = document.getElementById('playFlappyBird');
    const closeGameBtn = document.getElementById('closeFlappyBird');
    const gameContainer = document.getElementById('flappyBirdGame');
    let debugElements = {}; // Cache debug tab elements

    // --- Event Listeners ---

    // Status Message Display
    document.addEventListener(EVT_STATUS_MESSAGE, (event) => {
        const { message, type } = event.detail;
        const msgElement = document.createElement('div');
        msgElement.className = `status-message ${type}`;
        msgElement.textContent = message;
        statusMessageContainer.appendChild(msgElement);
        setTimeout(() => msgElement.remove(), 3000);
    });

    // Debug Tab Updater
    document.addEventListener(EVT_FORCE_UPDATE, (event) => {
        const { force, rawPressure } = event.detail;
        
        // ---> ADDED: Update global force variable <---
        window.latestNormalizedForce = force; 

        // Update Debug Tab display
        if (debugPressureValue) debugPressureValue.textContent = typeof rawPressure === 'number' && !isNaN(rawPressure) ? rawPressure.toFixed(2) : 'N/A'; 
        if (debugRawValue) debugRawValue.textContent = typeof force === 'number' ? force.toFixed(3) : 'N/A'; 
        if (debugLastUpdate) debugLastUpdate.textContent = new Date().toLocaleTimeString();
        
        // Update Side Panel Visualization
        window.updateForceBar(force);
        window.drawEllipsoid(force);
        
        // Handle Measurement Recording
        if (isMeasuring) { 
            recordMeasurement(force); 
        }
        
        // Handle Flappy Bird Control
        if (isGameControlActive && force >= inputManager.GAME_FORCE_THRESHOLD) {
            // Check if the game's jump function exists and call it
            if (typeof window.flappyGameJump === 'function') {
                 console.log(`Flappy Bird Jump Triggered by force: ${force.toFixed(3)}`); // Log jump trigger
                window.flappyGameJump();
            } else {
                // console.warn("window.flappyGameJump function not found!");
            }
        }
    });

    // Debug Tab Controls Updater (Mode Changes)
    document.addEventListener(EVT_MODE_CHANGED, (event) => {
        const { mode, isConnected } = event.detail; // Use event detail consistently
        console.log(`UI Listener: Mode changed to ${mode}, Connected: ${isConnected}`);
        
        // Query elements if not cached
        if (!debugElements.connectBtn) { 
            debugElements.connectBtn = document.querySelector('#debugContent .connect-btn');
            debugElements.simulationToggle = document.querySelector('#debugContent .simulation-toggle');
            debugElements.startLogBtn = document.querySelector('#debugContent .start-log');
            debugElements.clearLogBtn = document.querySelector('#debugContent .clear-log');
            debugElements.debugStatusIndicator = document.querySelector('#debugContent .debug-status-indicator'); // Cache this too
         }
        
        const simToggle = debugElements.simulationToggle;
        const connectBtn = debugElements.connectBtn;
        const statusIndicator = debugElements.debugStatusIndicator; 
        
        // Update Debug Tab elements based on event detail
        if (mode === 'simulation') {
             if (simToggle) { simToggle.classList.add('active'); simToggle.textContent = 'Using Simulation'; }
             if (connectBtn) connectBtn.disabled = true; 
             if (statusIndicator) { statusIndicator.textContent = 'Simulated'; statusIndicator.className = 'debug-status-indicator connected'; }
        } else { // Arduino mode
             if (simToggle) { simToggle.classList.remove('active'); simToggle.textContent = 'Use Simulation'; }
             if (connectBtn) connectBtn.disabled = false; 
             if (statusIndicator) {
                 // Use isConnected from event detail
                 statusIndicator.textContent = isConnected ? 'Connected' : 'Disconnected';
                 statusIndicator.className = `debug-status-indicator ${isConnected ? 'connected' : 'disconnected'}`;
             }
        }
        
        // Update Side Panel Status (already using event detail correctly)
        if (sidePanelStatusIndicator) {
             const simMode = mode === 'simulation';
             sidePanelStatusIndicator.textContent = simMode ? 'Simulated' : (isConnected ? 'Connected' : 'Disconnected');
             sidePanelStatusIndicator.classList.toggle('connected', simMode || isConnected);
             sidePanelStatusIndicator.classList.toggle('disconnected', !simMode && !isConnected);
        }
        
        // Update Side Panel Connect Button State
        if (sidePanelConnectBtn) {
            if (mode === 'simulation') {
                sidePanelConnectBtn.textContent = 'Simulated';
                sidePanelConnectBtn.disabled = true;
                sidePanelConnectBtn.classList.remove('connect', 'disconnect'); // Remove action classes
                sidePanelConnectBtn.classList.add('simulated'); // Optional: Add styling for simulated state
            } else { // Arduino Mode
                sidePanelConnectBtn.disabled = false;
                sidePanelConnectBtn.classList.remove('simulated');
                if (isConnected) {
                    sidePanelConnectBtn.textContent = 'Disconnect';
                    sidePanelConnectBtn.classList.remove('connect');
                    sidePanelConnectBtn.classList.add('disconnect'); // Optional: Class for styling disconnect state
                } else {
                    sidePanelConnectBtn.textContent = 'Connect';
                    sidePanelConnectBtn.classList.remove('disconnect');
                    sidePanelConnectBtn.classList.add('connect'); // Optional: Class for styling connect state
                }
            }
        }
    });
    
    // Debug Log Updater
    document.addEventListener(EVT_LOG_MESSAGE, (event) => {
        if (!arduinoLogElement) return;
        const { timestamp, message } = event.detail;
        let currentLog = arduinoLogElement.textContent;
        currentLog += `[${timestamp}] ${message}\n`;
        const maxLogLines = 100;
        const lines = currentLog.split('\n');
        if (lines.length > maxLogLines + 1) { 
            arduinoLogElement.textContent = lines.slice(-(maxLogLines + 1)).join('\n');
        } else {
            arduinoLogElement.textContent = currentLog;
        }
        arduinoLogElement.scrollTop = arduinoLogElement.scrollHeight;
    });

    // Measurement Tab Logic (Event Listener)
    let measurementData = [];
    let isMeasuring = false;
    let measurementStartTime = 0;
    let maxForce = 0;
    let forceSum = 0;
    let dataCount = 0;
    let measurementInterval = null; // To update duration display
    let chartInstance = null; // For Chart.js

    // Function called by InputModeManager when force updates during measurement
    function recordMeasurement(force) {
        if (!isMeasuring || typeof force !== 'number' || isNaN(force)) return;
        const timestamp = Date.now() - measurementStartTime;
        measurementData.push({ x: timestamp, y: force });
        maxForce = Math.max(maxForce, force);
        forceSum += force;
        dataCount++;
        
        // Update chart (throttled or batched updates might be better for performance)
        if (chartInstance) {
            const timeLabel = (timestamp / 1000).toFixed(1);
            // Add data point
            chartInstance.data.labels.push(timeLabel + 's');
            chartInstance.data.datasets[0].data.push(force);
            
            // Limit chart history length for performance
             const MAX_CHART_POINTS = 200;
            while (chartInstance.data.labels.length > MAX_CHART_POINTS) {
                chartInstance.data.labels.shift();
                chartInstance.data.datasets[0].data.shift();
            }
            chartInstance.update('none'); // Update without animation
        }
        // Update metrics display immediately (or throttle this too?)
        // updateMeasurementDisplayMetrics(); // Call the specific metrics update
        // console.log(`recordMeasurement: Recorded force: ${force.toFixed(3)}`); // Log 5
    }
    
    // Update only the numeric metrics
     function updateMeasurementDisplayMetrics() {
         const avgForce = dataCount > 0 ? forceSum / dataCount : 0;
         const maxForceEl = measurementDisplay?.querySelector('.metric:nth-child(1) .metric-value');
         const avgForceEl = measurementDisplay?.querySelector('.metric:nth-child(2) .metric-value');
         
         if(maxForceEl) maxForceEl.textContent = `${(maxForce * 10).toFixed(1)} N`; // Example scale 0-1 -> 0-10N
         if(avgForceEl) avgForceEl.textContent = `${(avgForce * 10).toFixed(1)} N`;
     }

    // Update only the duration metric
    function updateMeasurementDuration() {
        if (!isMeasuring && measurementData.length === 0) return; // Don't update if stopped & no data
         const duration = isMeasuring ? Date.now() - measurementStartTime : (measurementData.length > 0 ? measurementData[measurementData.length - 1].x : 0);
         const durationEl = measurementDisplay?.querySelector('.metric:nth-child(3) .metric-value');
         if(durationEl) durationEl.textContent = formatDuration(duration);
    }

    function formatDuration(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function initializeChart() {
        if (!forceChartCanvas) return;
        if (chartInstance) chartInstance.destroy(); 
        const ctx = forceChartCanvas.getContext('2d');
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [], 
                datasets: [{
                    label: 'Normalized Force (0-1)',
                    data: [], 
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 1,
                    pointRadius: 0, // Hide points for cleaner line
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 1.0, 
                        title: { display: true, text: 'Normalized Force' }
                    },
                    x: {
                         type: 'category', // Use category for time labels
                         title: { display: true, text: 'Time (s)' }
                    }
                },
                animation: false, 
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }

    // Measurement Button Listeners
    if (measureBtn) {
        measureBtn.addEventListener('click', () => {
            if (!isMeasuring) {
                // Start Measurement
                isMeasuring = true;
                measureBtn.textContent = 'Stop Measurement';
                measureBtn.classList.add('recording');
                saveBtn.disabled = true;
                // Reset data and metrics
                measurementData = [];
                maxForce = 0;
                forceSum = 0;
                dataCount = 0;
                measurementStartTime = Date.now();
                
                initializeChart(); // Reset chart
                updateMeasurementDisplayMetrics(); // Reset metrics display
                updateMeasurementDuration(); // Reset duration display
                
                // Start intervals for updating display
                if (measurementInterval) clearInterval(measurementInterval);
                measurementInterval = setInterval(() => {
                    // Update duration and metrics separately
                    updateMeasurementDuration();
                    updateMeasurementDisplayMetrics(); 
                }, 200); // Update display fairly often

            } else {
                // Stop Measurement
                isMeasuring = false;
                measureBtn.textContent = 'Start Measurement';
                measureBtn.classList.remove('recording');
                saveBtn.disabled = measurementData.length === 0; // Enable save only if data exists
                
                clearInterval(measurementInterval);
                measurementInterval = null;
                // Final update of display
                updateMeasurementDisplayMetrics(); 
                updateMeasurementDuration(); 
                 // Keep chart data visible after stop
            }
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            if (measurementData.length === 0) {
                alert("No measurement data to save.");
                return;
            }
            // Basic save: Log data to console
            const finalDuration = measurementData.length > 0 ? measurementData[measurementData.length - 1].x : 0;
            const finalAvg = dataCount > 0 ? forceSum / dataCount : 0;
            console.log("--- Measurement Results ---");
            console.log(`Duration: ${formatDuration(finalDuration)}`);
            console.log(`Max Force (0-1): ${maxForce.toFixed(3)}`);
            console.log(`Average Force (0-1): ${finalAvg.toFixed(3)}`);
            console.log("Raw Data Points:", measurementData);
            console.log("---------------------------");
            alert("Measurement data saved (logged to console).");
            // Future: Convert measurementData to CSV and trigger download
            saveBtn.disabled = true; // Disable after saving once
        });
    }

    // --- Side Panel Visualization ---
    let touchCtx = null;
    let activePoint = null; 

    // Define functions globally FIRST as stubs, potentially overwritten later
    window.updateForceBar = (force) => { console.warn("updateForceBar stub called - canvas missing?"); };
    window.drawEllipsoid = (force) => { console.warn("drawEllipsoid stub called - canvas missing?"); };

    // Only define actual drawing functions and listeners if canvas exists
    if (touchCanvas) {
        touchCtx = touchCanvas.getContext('2d');
        
        // Define ACTUAL drawing function, overwriting stub
        window.drawEllipsoid = function(currentForce = 0) { 
            if (!touchCtx) return;
             const forceToDraw = typeof currentForce === 'number' && !isNaN(currentForce) ? currentForce : 0;
            
            touchCtx.clearRect(0, 0, touchCanvas.width, touchCanvas.height);
            const centerX = touchCanvas.width / 2;
            const centerY = touchCanvas.height / 2;
            const radiusX = touchCanvas.width / 2 - 30;
            const radiusY = touchCanvas.height / 2 - 40;
            const gradient = touchCtx.createRadialGradient(
                centerX - radiusX * 0.3, centerY - radiusY * 0.3, radiusX * 0.1,
                centerX, centerY, radiusX
            );
            gradient.addColorStop(0, '#4a6279');
            gradient.addColorStop(0.7, '#34495e');
            gradient.addColorStop(1, '#2c3e50');
            touchCtx.beginPath();
            touchCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
            touchCtx.fillStyle = gradient;
            touchCtx.fill();
            touchCtx.beginPath();
            touchCtx.ellipse(centerX - radiusX * 0.2, centerY - radiusY * 0.2, radiusX * 0.7, radiusY * 0.5, Math.PI / 4, 0, Math.PI * 2);
            touchCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            touchCtx.fill();
            touchCtx.beginPath();
            touchCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
            touchCtx.strokeStyle = '#4a6279';
            touchCtx.lineWidth = 2;
            touchCtx.stroke();
            if (activePoint) {
                drawTouchPoint(activePoint.x, activePoint.y, forceToDraw); 
            }
            // console.log("Actual drawEllipsoid executed"); // Optional debug
        }
        
        // Define ACTUAL force bar update function, overwriting stub
        window.updateForceBar = function(currentForce = 0) { 
            const forceBar = document.querySelector('.force-level');
            if (forceBar) {
                 const forceToDraw = typeof currentForce === 'number' && !isNaN(currentForce) ? currentForce : 0;
                // console.log(`updateForceBar: Setting height to ${forceToDraw * 100}%`); // Log 8
                forceBar.style.height = `${forceToDraw * 100}%`;
            }
             // console.log("Actual updateForceBar executed"); // Optional debug
        }

        // Define drawTouchPoint locally
        function drawTouchPoint(x, y, pressure) {
            if (!touchCtx) return;
            const radius = Math.max(5, pressure * 15);
            const glowGradient = touchCtx.createRadialGradient(x, y, radius * 0.5, x, y, radius * 2);
            glowGradient.addColorStop(0, 'rgba(52, 152, 219, 0.8)');
            glowGradient.addColorStop(1, 'rgba(52, 152, 219, 0)');
            touchCtx.fillStyle = glowGradient;
            touchCtx.beginPath();
            touchCtx.arc(x, y, radius * 2, 0, Math.PI * 2);
            touchCtx.fill();
            touchCtx.fillStyle = 'rgba(52, 152, 219, 0.7)';
            touchCtx.beginPath();
            touchCtx.arc(x, y, radius, 0, Math.PI * 2);
            touchCtx.fill();
            touchCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            touchCtx.beginPath();
            touchCtx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.4, 0, Math.PI * 2);
            touchCtx.fill();
        }
        
        // Define isPointInEllipse locally
        function isPointInEllipse(x, y, ellipseX, ellipseY, radiusX, radiusY) {
            return (Math.pow(x - ellipseX, 2) / Math.pow(radiusX, 2) + 
                   Math.pow(y - ellipseY, 2) / Math.pow(radiusY, 2)) <= 1;
        }
                
        // Add canvas-specific listeners
        touchCanvas.addEventListener('click', function(e) {
            const rect = touchCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = touchCanvas.width / 2;
            const centerY = touchCanvas.height / 2;
            const radiusX = touchCanvas.width / 2 - 30;
            const radiusY = touchCanvas.height / 2 - 40;
            if (isPointInEllipse(x, y, centerX, centerY, radiusX, radiusY)) {
                activePoint = { x: x, y: y };
                window.drawEllipsoid(inputManager.currentForce); 
                setTimeout(() => {
                    activePoint = null;
                    window.drawEllipsoid(inputManager.currentForce);
                }, 1000);
            }
        });
        touchCanvas.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            activePoint = null;
            window.drawEllipsoid(inputManager.currentForce);
        });
        
        // Initial draw using the now-defined functions
        window.drawEllipsoid(0);
        window.updateForceBar(0);

    } else {
         console.warn("Touch canvas element (#touchCanvas) not found. Side panel drawing disabled.");
    }

    // --- Flappy Bird Game Integration (Event Listener Based) ---
    let isGameControlActive = false; // Flag to enable/disable game control

    // Play Button Setup
    if (playFlappyBtn && gameContainer) {
        playFlappyBtn.addEventListener('click', function() {
            gameContainer.style.display = 'flex'; 
            isGameControlActive = true; // Enable force control for the game
            console.log("Flappy Bird control ACTIVATED");
             // if(typeof window.resetGame === 'function') window.resetGame();
        });
    }

    // Close Button Setup
    if (closeGameBtn && gameContainer) {
        closeGameBtn.addEventListener('click', function() {
            gameContainer.style.display = 'none'; 
            isGameControlActive = false; // Disable force control
            console.log("Flappy Bird control DEACTIVATED");
            // Clear any pending key release timeout - NOT NEEDED ANYMORE
            // if (gameSpacebarTimeout) {
            //     clearTimeout(gameSpacebarTimeout);
            //     gameSpacebarTimeout = null;
            //      const releaseEvent = new KeyboardEvent('keyup', { key: ' ', code: 'Space', keyCode: 32, which: 32, bubbles: true });
            //      document.dispatchEvent(releaseEvent); // Ensure key is released
            // }
             // if(typeof window.stopGame === 'function') window.stopGame();
        });
    }
    
    // --- Space Shooter Game Integration ---
    let isSpaceShooterActive = false;
    
    // Get Space Shooter elements
    const playSpaceShooterBtn = document.getElementById('playSpaceShooter');
    const closeSpaceShooterBtn = document.getElementById('closeSpaceShooter');
    const spaceShooterContainer = document.getElementById('spaceShooterGame');
    
    // Play Button Setup
    if (playSpaceShooterBtn && spaceShooterContainer) {
        playSpaceShooterBtn.addEventListener('click', function() {
            spaceShooterContainer.style.display = 'flex';
            isSpaceShooterActive = true;
            console.log("Space Shooter control ACTIVATED");
            
            // Start the game
            if (typeof window.startSpaceShooter === 'function') {
                window.startSpaceShooter();
            } else {
                console.warn("Space Shooter game not loaded!");
            }
        });
    }
    
    // Close Button Setup
    if (closeSpaceShooterBtn && spaceShooterContainer) {
        closeSpaceShooterBtn.addEventListener('click', function() {
            spaceShooterContainer.style.display = 'none';
            isSpaceShooterActive = false;
            console.log("Space Shooter control DEACTIVATED");
            
            // Stop the Space Shooter game loop
            if (typeof stopGame === 'function') { 
                stopGame();
            } else {
                console.warn("stopGame function not found in spaceshooter.js");
            }
        });
    }

    // --- Debug Tab Setup ---
    function initializeDebugTab() {
        console.log("Initializing Debug Tab listeners...");
         // Only query if not already done
         if (!debugElements.connectBtn) {
             debugElements.connectBtn = document.querySelector('#debugContent .connect-btn');
             debugElements.simulationToggle = document.querySelector('#debugContent .simulation-toggle');
             debugElements.startLogBtn = document.querySelector('#debugContent .start-log');
             debugElements.clearLogBtn = document.querySelector('#debugContent .clear-log');
         }
         
         // --- Attach Listeners using cloneNode trick --- 
         const attachListener = (element, event, handler) => {
             if (!element) return null;
             const newElement = element.cloneNode(true);
             element.parentNode.replaceChild(newElement, element);
             newElement.addEventListener(event, handler);
             return newElement; // Return the new element with the listener
         };

        // Re-attach listeners to new clones
         debugElements.connectBtn = attachListener(debugElements.connectBtn, 'click', async () => {
             // Connect/disconnect ONLY works in Arduino mode
             if (inputManager.currentMode === 'arduino') {
                 if (!inputManager.arduino.isConnected) {
                      console.log("Debug Connect Btn: Attempting connect...");
                     await inputManager.arduino.connect(); 
                 } else {
                     console.log("Debug Connect Btn: Attempting disconnect...");
                     await inputManager.arduino.disconnect();
                 }
             }
         });

        debugElements.simulationToggle = attachListener(debugElements.simulationToggle, 'click', async () => {
             const isCurrentlySimulation = debugElements.simulationToggle.classList.contains('active');
             const targetMode = isCurrentlySimulation ? 'arduino' : 'simulation';
             await inputManager.switchMode(targetMode); // switchMode dispatches EVT_MODE_CHANGED
         });

         debugElements.startLogBtn = attachListener(debugElements.startLogBtn, 'click', () => {
             const isLogging = debugElements.startLogBtn.classList.toggle('active');
             debugElements.startLogBtn.textContent = isLogging ? 'Stop Logging' : 'Start Logging';
             // Simulator reads this class directly
             console.log(`Logging ${isLogging ? 'started' : 'stopped'}`);
         });

         debugElements.clearLogBtn = attachListener(debugElements.clearLogBtn, 'click', () => {
             const arduinoLog = document.getElementById('arduinoLog');
             if (arduinoLog) {
                 const now = new Date().toLocaleTimeString();
                 arduinoLog.textContent = `[${now}] Log cleared\n`;
                 console.log("Log cleared.");
             }
         });
         
         // Trigger initial UI update based on current state
          document.dispatchEvent(new CustomEvent(EVT_MODE_CHANGED, { detail: { mode: inputManager.currentMode, isConnected: inputManager.arduino.isConnected } }));
    }
    
    // --- Initial Setup --- 
    // Load Chart.js
    if (typeof Chart === 'undefined') {
        const chartScript = document.createElement('script');
        chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        chartScript.onload = () => { 
             console.log("Chart.js loaded."); 
             if (forceChartCanvas) initializeChart(); // Initialize chart after loading
        };
         chartScript.onerror = () => { 
             console.error("Failed to load Chart.js"); 
             window.Chart = class Chart { constructor(){} update(){} destroy(){} }; // Dummy Chart
             if (forceChartCanvas) initializeChart(); // Still call init
         };
        document.head.appendChild(chartScript);
    } else {
         if (forceChartCanvas) initializeChart();
    }
    
    // Initialize Debug tab if it's the default active tab
     const initialActiveTab = document.querySelector('.tab-btn.active');
     if (initialActiveTab && initialActiveTab.getAttribute('data-tab') === 'debug') {
         initializeDebugTab();
     }
    
    // Side Panel Connect Button Listener
    if (sidePanelConnectBtn) {
        sidePanelConnectBtn.addEventListener('click', async () => {
            // Button only active in Arduino mode
            if (inputManager.currentMode === 'arduino') {
                if (inputManager.arduino.isConnected) {
                    console.log("Side Panel Button: Attempting disconnect...");
                    await inputManager.arduino.disconnect();
                } else {
                    console.log("Side Panel Button: Attempting connect...");
                    await inputManager.arduino.connect(); // This triggers the port selection
                }
                // UI update will happen via the EVT_MODE_CHANGED event dispatched by connect/disconnect
            } else {
                console.log("Side Panel Button: Inactive in Simulation mode.");
            }
        });
    } else {
        console.warn("Side panel connect button (#side-panel-connect-btn) not found.");
    }
    
    console.log("DOM fully loaded and script executed.");

}); // End DOMContentLoaded 