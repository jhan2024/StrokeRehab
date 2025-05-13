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
        this.basePressures = [100000]; 
        this.pressureRanges = [5000];  
        
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
            this.basePressures = [this.basePressures[0] || 100000];
            this.pressureRanges = [this.pressureRanges[0] || 5000];
        } else { // 3-dome
            this.currentForces = [(this.currentForces[0] || 0), (this.currentForces[1] || 0), (this.currentForces[2] || 0)];
            this.latestRawPressures = [(this.latestRawPressures[0] || NaN), (this.latestRawPressures[1] || NaN), (this.latestRawPressures[2] || NaN)];
            const defaultBase = 100000;
            const defaultRange = 5000;
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

    // updateCalibrationUI() method is removed as UI updates will be handled by an event listener in script.js

    async switchMode(mode) {
         console.log(`Attempting to switch mode to: ${mode}`);
         if (mode === 'arduino' && !window._realNavigatorSerial) { 
            document.dispatchEvent(new CustomEvent(EVT_STATUS_MESSAGE, { detail: { message: 'Cannot switch to Arduino mode: Real Web Serial API not available.', type: 'error' }})); 
            return;
         }
         
        if (mode === this.currentMode) return;

        console.log(`Cleaning up previous mode: ${this.currentMode}`);
         if (this.arduino.isConnected) {
             await this.arduino.disconnect();
         }

        if (this.currentMode === 'simulation') {
             this.cleanupSpacebarListeners();
        } else { 
            this.cleanupSpacebarListeners(); 
        }

        this.currentMode = mode;
        console.log(`Set currentMode to: ${this.currentMode}`);

        if (this.currentMode === 'simulation') {
            console.log("Setting up simulation mode: Auto-connecting...");
            if (window.serialSimulatorInstance) {
                window.serialSimulatorInstance.setDeviceType(this.currentDeviceType);
            }
            const connected = await this.arduino.connect(this.currentMode); 
            if (connected) {
                if (this.currentDeviceType === '1-dome') { 
                    this.setupSpacebarListeners();
                } else {
                    this.cleanupSpacebarListeners(); 
                }
            } else {
                 console.error("Failed to auto-connect to simulator during switch!");
            }
        } else { 
             console.log("Switched to Arduino mode. Ready for user connection.");
        }

        document.dispatchEvent(new CustomEvent(EVT_MODE_CHANGED, { 
            detail: { mode: this.currentMode, deviceType: this.currentDeviceType, isConnected: this.arduino.isConnected }
        }));
    }
    
    // Central handler - now dispatches forceupdate event with arrays
    // This method is now effectively the dataHandler for ArduinoConnection
    handleForceUpdate(normalizedForces, rawPressures) {
        this.currentForces = normalizedForces; 
        this.latestRawPressures = rawPressures; 
        
        document.dispatchEvent(new CustomEvent(EVT_FORCE_UPDATE, { 
            detail: { forces: normalizedForces, rawPressures: rawPressures, deviceType: this.currentDeviceType }
        }));
    }

    setupSpacebarListeners() {
        if (this.currentMode !== 'simulation' || this.currentDeviceType !== '1-dome') {
            this.cleanupSpacebarListeners(); 
            return;
        }
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
         if (this.spacebarPressed) {
             this.spacebarPressed = false;
             this.spacebarHoldStartTime = 0;
         }
        console.log("Spacebar listeners REMOVED or confirmed not applicable.");
    }

    handleKeyDown(e) {
        if (!this._boundKeyDown) return; 
        if (e.code === 'Space') {
            e.preventDefault();
            if (this.currentMode === 'simulation' && this.currentDeviceType === '1-dome') {
                if (!this.spacebarPressed) {
                    this.spacebarPressed = true;
                    this.spacebarHoldStartTime = Date.now();
                    document.dispatchEvent(new CustomEvent(EVT_SIM_CONTROL, { detail: { action: 'start' } }));
                }
                return; 
            }

            // Game actions are handled by game_control.js now, which listens to EVT_FORCE_UPDATE
            // Or, if spacebar is still a direct game control (not via sensor), that's in game_control.js keydown listeners
        }
    }

    handleKeyUp(e) {
         if (!this._boundKeyUp) return; 
         if (e.code === 'Space' && this.spacebarPressed) {
             if (this.currentMode === 'simulation' && this.currentDeviceType === '1-dome') {
                this.spacebarPressed = false;
                const holdDuration = Date.now() - this.spacebarHoldStartTime;
                document.dispatchEvent(new CustomEvent(EVT_SIM_CONTROL, { detail: { action: 'stop', duration: holdDuration } }));
                 this.spacebarHoldStartTime = 0;
                e.preventDefault();
             }
        }
    }

    updateModeUI() { // Should be deprecated further - EVT_MODE_CHANGED listener is primary
        console.warn("InputModeManager.updateModeUI() called directly. Should rely on EVT_MODE_CHANGED listener.");
        const eventDetail = { 
            mode: this.currentMode, 
            deviceType: this.currentDeviceType, 
            isConnected: this.arduino.isConnected 
        };
        document.dispatchEvent(new CustomEvent(EVT_MODE_CHANGED, { detail: eventDetail }));
    }
} 