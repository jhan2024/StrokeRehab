class InputModeManager {
    constructor() {
        // MODIFIED: Instantiate ArduinoConnection with callbacks
        this.arduino = new ArduinoConnection(
            // dataHandlerCallback: directly use a bound version of handleForceUpdate
            (normalizedForces, rawPressures) => {
                this.currentForces = normalizedForces; 
                this.latestRawPressures = rawPressures; 
                document.dispatchEvent(new CustomEvent(EVT_FORCE_UPDATE, { 
                    detail: { forces: normalizedForces, rawPressures: rawPressures, deviceType: this.currentDeviceType }
                }));
            },
            // statusHandlerCallback: dispatch EVT_STATUS_MESSAGE globally
            (message, type) => {
                document.dispatchEvent(new CustomEvent(EVT_STATUS_MESSAGE, { detail: { message, type } }));
            }
        );
        this.currentMode = window._realNavigatorSerial ? 'arduino' : 'simulation';
        this.currentDeviceType = '1-dome'; // '1-dome' or '3-dome' - Initialized from UI later
        console.log(`InputModeManager initial mode: ${this.currentMode}, device type: ${this.currentDeviceType}`);
        
        this.currentForces = [0]; // Array to store force values (0-1)
        this.latestRawPressures = [NaN]; // Array for raw pressure readings
        
        // Calibration: single value for 1-dome, array for 3-dome
        this.basePressures = [DEFAULT_BASE_PRESSURE, DEFAULT_BASE_PRESSURE, DEFAULT_BASE_PRESSURE]; 
        this.pressureRanges = [DEFAULT_PRESSURE_RANGE, DEFAULT_PRESSURE_RANGE, DEFAULT_PRESSURE_RANGE];  
        
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
             this.initializeDeviceTypeSelector(); // Initialize and read device type from UI

             if (this.currentMode === 'simulation') {
                window.serialSimulatorInstance.setDeviceType(this.currentDeviceType);
                if (this.currentDeviceType === '1-dome') {
                    this.setupSpacebarListeners(); // Only for 1-dome simulation
                }
                this.arduino.connect(this.currentMode); // MODIFIED: pass currentMode
         } else {
                 this.cleanupSpacebarListeners();
             }
             document.dispatchEvent(new CustomEvent(EVT_MODE_CHANGED, { detail: { mode: this.currentMode, deviceType: this.currentDeviceType, isConnected: this.arduino.isConnected } }));
         }, 150); 
    }

    initializeDeviceTypeSelector() {
        const deviceTypeRadios = document.querySelectorAll('input[name="deviceType"]');
        let initialDeviceType = '1-dome';
        deviceTypeRadios.forEach(radio => {
            if (radio.checked) {
                initialDeviceType = radio.value;
            }
            radio.addEventListener('change', (event) => {
                this.setDeviceType(event.target.value);
            });
        });
        this.currentDeviceType = initialDeviceType;
        console.log(`InputModeManager: Initial device type from UI: ${this.currentDeviceType}`);
        // Inform simulator about the initial type if it's already instantiated
        if (window.serialSimulatorInstance) {
            window.serialSimulatorInstance.setDeviceType(this.currentDeviceType);
            // window.serialSimulatorInstance.setPressureRanges(this.pressureRanges); // This will be handled via event
        }
        this.resetCalibrationArrays(); // Adjust calibration arrays based on type, this will dispatch EVT_PRESSURE_RANGES_CHANGED
    }

    setDeviceType(type) {
        if (type === this.currentDeviceType) return;
        console.log(`InputModeManager: Setting device type to ${type}`);
        this.currentDeviceType = type;

        this.resetCalibrationArrays(); // This updates this.pressureRanges and dispatches EVT_PRESSURE_RANGES_CHANGED

        if (window.serialSimulatorInstance) {
            window.serialSimulatorInstance.setDeviceType(this.currentDeviceType);
            // Simulator will also get pressure ranges when its setPressureRanges is called by script.js listener or directly
        }

        // Manage spacebar listeners based on new device type for simulation mode
        if (this.currentMode === 'simulation') {
            if (this.currentDeviceType === '1-dome') {
                this.setupSpacebarListeners();
                     } else {
                this.cleanupSpacebarListeners(); // No spacebar for 3-dome sim (uses A,S,D)
            }
        }
        // Dispatch event to notify UI or other components of device type change
        document.dispatchEvent(new CustomEvent(EVT_MODE_CHANGED, { 
            detail: { mode: this.currentMode, deviceType: this.currentDeviceType, isConnected: this.arduino.isConnected }
        }));
    }

    resetCalibrationArrays() {
        if (this.currentDeviceType === '1-dome') {
            this.currentForces = [this.currentForces[0] || 0];
            this.latestRawPressures = [this.latestRawPressures[0] || NaN];
            this.basePressures = [this.basePressures[0] || DEFAULT_BASE_PRESSURE];
            this.pressureRanges = [this.pressureRanges[0] || DEFAULT_PRESSURE_RANGE];
        } else { // 3-dome
            this.currentForces = [(this.currentForces[0] || 0), (this.currentForces[1] || 0), (this.currentForces[2] || 0)];
            this.latestRawPressures = [(this.latestRawPressures[0] || NaN), (this.latestRawPressures[1] || NaN), (this.latestRawPressures[2] || NaN)];
            const defaultBase = DEFAULT_BASE_PRESSURE;
            const defaultRange = DEFAULT_PRESSURE_RANGE;
            this.basePressures = [
                this.basePressures[0] || defaultBase,
                (this.basePressures.length > 1 ? this.basePressures[1] : defaultBase) || defaultBase,
                (this.basePressures.length > 2 ? this.basePressures[2] : defaultBase) || defaultBase
            ];
            this.pressureRanges = [
                this.pressureRanges[0] || defaultRange,
                (this.pressureRanges.length > 1 ? this.pressureRanges[1] : defaultRange) || defaultRange,
                (this.pressureRanges.length > 2 ? this.pressureRanges[2] : defaultRange) || defaultRange
            ];
        }
        // Dispatch event to notify UI of pressure range changes
        document.dispatchEvent(new CustomEvent(EVT_PRESSURE_RANGES_CHANGED, {
            detail: { pressureRanges: this.pressureRanges, deviceType: this.currentDeviceType }
        }));
    }

    // ADDED/ENSURED: Getter for isConnected
    get isConnected() {
        return this.arduino ? this.arduino.isConnected : false;
    }

    // ADDED/ENSURED: Method to connect the device
    async connectDevice(modeToConnect) {
        const targetMode = modeToConnect || this.currentMode; 
        console.log(`InputModeManager: connectDevice called for mode: ${targetMode}`);
        if (targetMode === 'arduino' && !window._realNavigatorSerial) {
            document.dispatchEvent(new CustomEvent(EVT_STATUS_MESSAGE, { detail: { message: 'Cannot connect: Real Web Serial API not available.', type: 'error' }}));
            return false;
        }
        if (this.arduino.isConnected) {
            console.log("InputModeManager: Already connected or connection attempt in progress.");
            document.dispatchEvent(new CustomEvent(EVT_STATUS_MESSAGE, { detail: { message: 'Device is already connected.', type: 'info' }}));
            return true;
        }

        const success = await this.arduino.connect(targetMode);
        if (success) {
            console.log(`InputModeManager: Connection successful to ${targetMode}.`);
            // Adjust listeners based on the mode we actually connected to
            if (targetMode === 'simulation') {
                if (this.currentDeviceType === '1-dome') {
                    this.setupSpacebarListeners();
                } else { // 3-dome simulation
                    this.cleanupSpacebarListeners(); 
                }
            } else { // arduino mode
                 this.cleanupSpacebarListeners(); // No spacebar simulation listeners in arduino mode
            }
        } else {
            console.error(`InputModeManager: Connection failed to ${targetMode}.`);
            // ArduinoConnection's statusHandler should have dispatched an error message.
        }
        // Always dispatch mode changed to update UI with the latest connection status
        document.dispatchEvent(new CustomEvent(EVT_MODE_CHANGED, { 
            detail: { mode: this.currentMode, deviceType: this.currentDeviceType, isConnected: this.arduino.isConnected }
        }));
        return success;
    }

    // ADDED/ENSURED: Method to disconnect the device
    async disconnectDevice() {
        console.log("InputModeManager: disconnectDevice called.");
        if (!this.arduino.isConnected) {
            console.log("InputModeManager: Already disconnected.");
            document.dispatchEvent(new CustomEvent(EVT_STATUS_MESSAGE, { detail: { message: 'Device is already disconnected.', type: 'info' }}));
            return;
        }
        await this.arduino.disconnect();
        // Always clean up simulation-specific listeners on disconnect
        this.cleanupSpacebarListeners();
        
        console.log("InputModeManager: Disconnection process completed.");
        // Notify UI about potential connection state change
        document.dispatchEvent(new CustomEvent(EVT_MODE_CHANGED, { 
            detail: { mode: this.currentMode, deviceType: this.currentDeviceType, isConnected: this.arduino.isConnected }
        }));
    }
    
    // RESTORED: switchMode method
    async switchMode(mode) {
         console.log(`Attempting to switch mode to: ${mode}`);
         if (mode === 'arduino' && !window._realNavigatorSerial) { 
            document.dispatchEvent(new CustomEvent(EVT_STATUS_MESSAGE, { detail: { message: 'Cannot switch to Arduino mode: Real Web Serial API not available.', type: 'error' }})); 
            return;
         }
         
        if (mode === this.currentMode) return;

        console.log(`Cleaning up previous mode: ${this.currentMode}`);
        if (this.arduino.isConnected) { // If connected, disconnect first
             await this.disconnectDevice(); // Use the class method
        } else { // If not connected, still ensure listeners for the old mode are cleaned up
            if (this.currentMode === 'simulation') {
                this.cleanupSpacebarListeners();
            }
        }

        this.currentMode = mode;
        console.log(`Set currentMode to: ${this.currentMode}`);

        if (this.currentMode === 'simulation') {
            console.log("Setting up simulation mode: Auto-connecting simulator...");
            if (window.serialSimulatorInstance) {
                window.serialSimulatorInstance.setDeviceType(this.currentDeviceType);
                // Pressure ranges for simulator are handled via EVT_PRESSURE_RANGES_CHANGED listener in serial-simulator.js
                // or directly by settings_manager.js if it updates the simulator instance.
            }
            // Attempt to connect the simulator via the ArduinoConnection class
            const connected = await this.connectDevice('simulation'); // Explicitly connect to simulation
            if (!connected) {
                 console.error("Failed to auto-connect to simulator during switch!");
            }
            // connectDevice will handle spacebar listeners if connection is successful
        } else { // Switched to Arduino mode
             console.log("Switched to Arduino mode. Ready for user connection attempt via UI.");
             this.cleanupSpacebarListeners(); // Ensure no simulation listeners are active
        }

        // Dispatch mode changed, connectDevice/disconnectDevice will also do this,
        // but good to ensure it happens after mode string is updated.
        document.dispatchEvent(new CustomEvent(EVT_MODE_CHANGED, { 
            detail: { mode: this.currentMode, deviceType: this.currentDeviceType, isConnected: this.arduino.isConnected }
        }));
    }
    
    // RESTORED: Central handler (dataHandler for ArduinoConnection)
    handleForceUpdate(normalizedForces, rawPressures) {
        this.currentForces = normalizedForces; 
        this.latestRawPressures = rawPressures; 
        
        document.dispatchEvent(new CustomEvent(EVT_FORCE_UPDATE, { 
            detail: { forces: normalizedForces, rawPressures: rawPressures, deviceType: this.currentDeviceType }
        }));
    }

    // RESTORED: Simulation Spacebar Listeners
    setupSpacebarListeners() {
        if (this.currentMode !== 'simulation' || this.currentDeviceType !== '1-dome') {
            this.cleanupSpacebarListeners(); 
            return;
        }
        if (this._boundKeyDown) { // Already set up
            console.log("Spacebar listeners already active for 1-dome simulation.");
            return;
        }
        this._boundKeyDown = this.handleKeyDown.bind(this);
        this._boundKeyUp = this.handleKeyUp.bind(this);
        document.addEventListener('keydown', this._boundKeyDown);
        document.addEventListener('keyup', this._boundKeyUp);
        console.log("Spacebar listeners ADDED for 1-dome simulator control");
    }

    cleanupSpacebarListeners() {
        if (this._boundKeyDown) {
            document.removeEventListener('keydown', this._boundKeyDown);
            this._boundKeyDown = null;
            console.log("Spacebar keydown listener REMOVED.");
        }
        if (this._boundKeyUp) {
            document.removeEventListener('keyup', this._boundKeyUp);
            this._boundKeyUp = null;
            console.log("Spacebar keyup listener REMOVED.");
        }
         if (this.spacebarPressed) { // Reset spacebar state
             this.spacebarPressed = false;
             this.spacebarHoldStartTime = 0;
             // Dispatch a stop event to simulator if spacebar was pressed and listeners are cleaned up
             document.dispatchEvent(new CustomEvent(EVT_SIM_CONTROL, { detail: { action: 'stop', duration: 0 } }));
         }
    }

    // RESTORED: Key event handlers for simulation
    handleKeyDown(e) {
        if (!this._boundKeyDown || this.currentMode !== 'simulation' || this.currentDeviceType !== '1-dome') return; 
        
        if (e.code === 'Space') {
            e.preventDefault();
            if (!this.spacebarPressed) {
                this.spacebarPressed = true;
                this.spacebarHoldStartTime = Date.now();
                document.dispatchEvent(new CustomEvent(EVT_SIM_CONTROL, { detail: { action: 'start' } }));
            }
        }
    }

    handleKeyUp(e) {
         if (!this._boundKeyUp || this.currentMode !== 'simulation' || this.currentDeviceType !== '1-dome') return; 
         
         if (e.code === 'Space' && this.spacebarPressed) {
            e.preventDefault();
            this.spacebarPressed = false;
            const holdDuration = Date.now() - this.spacebarHoldStartTime;
            document.dispatchEvent(new CustomEvent(EVT_SIM_CONTROL, { detail: { action: 'stop', duration: holdDuration } }));
            this.spacebarHoldStartTime = 0;
        }
    }

    // RESTORED: updateModeUI (though it's noted as ideally deprecated)
    updateModeUI() { 
        console.warn("InputModeManager.updateModeUI() called directly. Should rely on EVT_MODE_CHANGED listener.");
        const eventDetail = { 
            mode: this.currentMode, 
            deviceType: this.currentDeviceType, 
            isConnected: this.arduino.isConnected 
        };
        document.dispatchEvent(new CustomEvent(EVT_MODE_CHANGED, { detail: eventDetail }));
    }
} 