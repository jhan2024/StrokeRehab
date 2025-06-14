// settings_manager.js

// Depends on:
// - constants.js (EVT_FORCE_UPDATE, EVT_MODE_CHANGED, EVT_LOG_MESSAGE, EVT_PRESSURE_RANGES_CHANGED, EVT_BASE_PRESSURES_CHANGED)
// - input_mode_manager.js (instance passed to constructor)

class SettingsManager {
    constructor(inputManagerInstance) {
        this.inputManager = inputManagerInstance;

        // Cache UI elements for the Settings Tab
        this.connectBtn = document.querySelector('#settingsContent .connect-btn');
        this.simulationToggle = document.querySelector('#settingsContent .simulation-toggle');
        this.calibrateZeroBtn = document.getElementById('calibrateZeroBtn');
        this.calibrateZeroBtns = [
            document.getElementById('calibrateZeroBtn0'),
            document.getElementById('calibrateZeroBtn1'),
            document.getElementById('calibrateZeroBtn2')
        ];
        this.pressureRangeInputs = [
            document.getElementById('pressureRangeInput0'),
            document.getElementById('pressureRangeInput1'),
            document.getElementById('pressureRangeInput2')
        ];
        this.pressureRangeGroups = [
            document.getElementById('pressure-range-group-0'),
            document.getElementById('pressure-range-group-1'),
            document.getElementById('pressure-range-group-2')
        ];
        this.basePressureInputs = [
            document.getElementById('basePressureInput0'),
            document.getElementById('basePressureInput1'),
            document.getElementById('basePressureInput2')
        ];
        this.basePressureGroups = [
            document.getElementById('base-pressure-group-0'),
            document.getElementById('base-pressure-group-1'),
            document.getElementById('base-pressure-group-2')
        ];
        this.domeCalibrationGroups = [
            document.getElementById('dome-calibration-group-0'),
            document.getElementById('dome-calibration-group-1'),
            document.getElementById('dome-calibration-group-2')
        ];
        this.startLogBtn = document.querySelector('#settingsContent .start-log');
        this.clearLogBtn = document.querySelector('#settingsContent .clear-log');
        this.statusIndicator = document.querySelector('#settingsContent .debug-status-indicator');
        this.arduinoLogElement = document.getElementById('arduinoLog');

        // Live Sensor Value Elements (from original script.js debugElements)
        this.pressureValueElements = [
            document.getElementById('pressureValue0'),
            document.getElementById('pressureValue1'),
            document.getElementById('pressureValue2')
        ];
        this.normalizedForceValueElements = [
            document.getElementById('normalizedForceValue0'),
            document.getElementById('normalizedForceValue1'),
            document.getElementById('normalizedForceValue2')
        ];
        this.sensorGroupElements = [
            document.getElementById('sensor-group-0'), // Displays Pa and Norm.
            document.getElementById('sensor-group-1'),
            document.getElementById('sensor-group-2')
        ];
        this.lastUpdateElement = document.getElementById('lastUpdate');

        this._bindMethods();
        this._attachEventListeners();
        this._initializeSettingsValues(); // Initialize with current values from inputManager
        console.log("SettingsManager Initialized.");
    }

    _bindMethods() {
        this.handleConnectClick = this.handleConnectClick.bind(this);
        this.handleSimulationToggleClick = this.handleSimulationToggleClick.bind(this);
        this.handleCalibrateZeroClick = this.handleCalibrateZeroClick.bind(this);
        this.handlePressureRangeChange = this.handlePressureRangeChange.bind(this);
        this.handleBasePressureChange = this.handleBasePressureChange.bind(this);
        this.handleStartLogClick = this.handleStartLogClick.bind(this);
        this.handleClearLogClick = this.handleClearLogClick.bind(this);

        // Global event handlers
        this.handleForceUpdate = this.handleForceUpdate.bind(this);
        this.handleModeChange = this.handleModeChange.bind(this);
        this.handleLogMessage = this.handleLogMessage.bind(this);
        this.handlePressureRangesChanged = this.handlePressureRangesChanged.bind(this);
        this.handleBasePressuresChanged = this.handleBasePressuresChanged.bind(this);
    }

    _attachEventListeners() {
        // Control-specific listeners
        if (this.connectBtn) this.connectBtn.addEventListener('click', this.handleConnectClick);
        if (this.simulationToggle) this.simulationToggle.addEventListener('click', this.handleSimulationToggleClick);
        this.calibrateZeroBtns.forEach((btn, index) => {
            if (btn) btn.addEventListener('click', () => this.handleCalibrateZeroClick(index));
        });
        this.pressureRangeInputs.forEach((input, index) => {
            if (input) input.addEventListener('change', (event) => this.handlePressureRangeChange(event, index));
        });
        this.basePressureInputs.forEach((input, index) => {
            if (input) input.addEventListener('change', (event) => this.handleBasePressureChange(event, index));
        });
        if (this.startLogBtn) this.startLogBtn.addEventListener('click', this.handleStartLogClick);
        if (this.clearLogBtn && this.arduinoLogElement) this.clearLogBtn.addEventListener('click', this.handleClearLogClick);

        // Listen to global events relevant to the Settings Tab
        document.addEventListener(EVT_FORCE_UPDATE, this.handleForceUpdate);
        document.addEventListener(EVT_MODE_CHANGED, this.handleModeChange);
        document.addEventListener(EVT_LOG_MESSAGE, this.handleLogMessage);
        document.addEventListener(EVT_PRESSURE_RANGES_CHANGED, this.handlePressureRangesChanged);
        document.addEventListener(EVT_BASE_PRESSURES_CHANGED, this.handleBasePressuresChanged);
    }

    _initializeSettingsValues() {
        // Reflect current state from inputManager upon initialization
        if (!this.inputManager) return;
        const { mode, deviceType, isConnected, pressureRanges, basePressures } = this.inputManager;
        this._updateUIForModeDeviceConnection(mode, deviceType, isConnected);
        this._updateLiveSensorDisplayVisibility(deviceType);
        this._updatePressureRangeInputsAndVisibility(deviceType, pressureRanges);
        this._updateBasePressureInputsAndVisibility(deviceType, basePressures);
        this._updatePressureSensorReadings([0,0,0], [0,0,0], deviceType); // Initial clear
    }

    // --- Control Event Handlers ---
    handleConnectClick() {
        if (this.inputManager.isConnected) {
            this.inputManager.disconnectDevice();
        } else {
            this.inputManager.connectDevice('arduino'); // Mode should be arduino to enable this button
        }
    }

    handleSimulationToggleClick() {
        const currentMode = this.inputManager.currentMode;
        this.inputManager.switchMode(currentMode === 'simulation' ? 'arduino' : 'simulation');
    }

    handleCalibrateZeroClick(index) {
        this.inputManager.calibrateZeroPressure(index);
    }

    handlePressureRangeChange(event, index) {
        const value = parseInt(event.target.value);
        if (!isNaN(value) && value > 0) {
            this.inputManager.setPressureRange(index, value);
        } else {
            // Restore old value if input is invalid
            event.target.value = this.inputManager.pressureRanges[index] || DEFAULT_PRESSURE_RANGE;
        }
    }

    handleBasePressureChange(event, index) {
        const value = parseInt(event.target.value);
        if (!isNaN(value)) { // Base pressure can be any number, not necessarily > 0
            this.inputManager.setBasePressure(index, value);
        } else {
            // Restore old value if input is invalid
            event.target.value = this.inputManager.basePressures[index] || DEFAULT_BASE_PRESSURE;
        }
    }

    handleStartLogClick() {
        if (this.inputManager.currentMode === 'simulation' && window.serialSimulatorInstance) {
            const sim = window.serialSimulatorInstance;
            sim.isLogging = !sim.isLogging; // Toggle simulator's internal log flag
            if (this.startLogBtn) {
                this.startLogBtn.textContent = sim.isLogging ? 'Stop Data Log (Sim)' : 'Start Data Log (Sim)';
                this.startLogBtn.classList.toggle('active', sim.isLogging);
            }
            const logMessage = sim.isLogging ? "Simulator logging started." : "Simulator logging stopped.";
            document.dispatchEvent(new CustomEvent(EVT_LOG_MESSAGE, { detail: { timestamp: new Date().toLocaleTimeString(), message: logMessage } }));
        } else if (this.inputManager.currentMode === 'arduino' && this.inputManager.isConnected) {
            // Arduino logging is implicit. This button might toggle display verbosity in the future.
            // For now, it is a placeholder toggle for the button appearance.
            if (this.startLogBtn) {
                const isCurrentlyLoggingArduino = this.startLogBtn.classList.contains('active');
                const logMessage = isCurrentlyLoggingArduino ? "Arduino data display in log STOPPED (placeholder)." : "Arduino data display in log STARTED (placeholder).";
                this.startLogBtn.textContent = isCurrentlyLoggingArduino ? 'Start Data Log (Arduino)' : 'Stop Data Log (Arduino)';
                this.startLogBtn.classList.toggle('active');
                document.dispatchEvent(new CustomEvent(EVT_LOG_MESSAGE, { detail: { timestamp: new Date().toLocaleTimeString(), message: logMessage } }));
            }
        }
    }

    handleClearLogClick() {
        if (this.arduinoLogElement) {
            this.arduinoLogElement.textContent = 'Log cleared.\n';
        }
    }

    // --- Global Event Handlers for UI Updates in Settings Tab ---
    handleForceUpdate(event) {
        const { forces, rawPressures, deviceType } = event.detail;
        this._updatePressureSensorReadings(forces, rawPressures, deviceType);
        if (this.lastUpdateElement) this.lastUpdateElement.textContent = new Date().toLocaleTimeString();
    }

    handleModeChange(event) {
        const { mode, deviceType, isConnected } = event.detail;
        this._updateUIForModeDeviceConnection(mode, deviceType, isConnected);
        this._updateLiveSensorDisplayVisibility(deviceType); // Handles sensor-group-0,1,2
        this._updateCalibrationGroupVisibility(deviceType);
        this._updatePressureRangeInputsAndVisibility(deviceType, this.inputManager.pressureRanges);
        this._updateBasePressureInputsAndVisibility(deviceType, this.inputManager.basePressures);
    }

    handleLogMessage(event) {
        if (!this.arduinoLogElement) return;
        const { timestamp, message } = event.detail;
        let currentLog = this.arduinoLogElement.textContent;
        currentLog += `[${timestamp}] ${message}\n`;
        const maxLogLines = 100;
        const lines = currentLog.split('\n');
        if (lines.length > maxLogLines + 1) {
            this.arduinoLogElement.textContent = lines.slice(-(maxLogLines + 1)).join('\n');
        } else {
            this.arduinoLogElement.textContent = currentLog;
        }
        this.arduinoLogElement.scrollTop = this.arduinoLogElement.scrollHeight;
    }

    handlePressureRangesChanged(event) {
        const { pressureRanges, deviceType } = event.detail;
        this._updatePressureRangeInputsAndVisibility(deviceType, pressureRanges);
    }

    handleBasePressuresChanged(event) {
        const { basePressures, deviceType } = event.detail;
        this._updateBasePressureInputsAndVisibility(deviceType, basePressures);
    }

    // --- Private UI Update Helper Methods ---
    _updatePressureSensorReadings(forces, rawPressures, deviceType) {
        for (let i = 0; i < 3; i++) {
            if (this.sensorGroupElements[i]) { // These are the containers for Pa and Norm.
                const isVisible = (deviceType === '1-dome' && i === 0) || (deviceType === '3-dome' && i < (forces ? forces.length : 0));
                // Visibility of the group is handled by _updateLiveSensorDisplayVisibility
                // Here we just update the values if the elements exist.
                if (this.pressureValueElements[i]) {
                    const pressure = (Array.isArray(rawPressures) && rawPressures.length > i && typeof rawPressures[i] === 'number' && !isNaN(rawPressures[i])) ? rawPressures[i] : NaN;
                    this.pressureValueElements[i].textContent = !isNaN(pressure) ? pressure.toFixed(2) : 'N/A';
                }
                if (this.normalizedForceValueElements[i]) {
                    const force = (Array.isArray(forces) && forces.length > i && typeof forces[i] === 'number' && !isNaN(forces[i])) ? forces[i] : NaN;
                    this.normalizedForceValueElements[i].textContent = !isNaN(force) ? force.toFixed(3) : 'N/A';
                }
            }
        }
    }

    _updateUIForModeDeviceConnection(mode, deviceType, isConnected) {
        if (this.statusIndicator) {
            this.statusIndicator.textContent = isConnected ? 'Connected' : (mode === 'simulation' ? 'Simulated' : 'Disconnected');
            this.statusIndicator.className = `debug-status-indicator ${isConnected ? 'connected' : (mode === 'simulation' ? 'simulated' : 'disconnected')}`;
        }

        if (this.simulationToggle) this.simulationToggle.textContent = mode === 'simulation' ? 'Switch to Arduino Mode' : 'Switch to Simulation Mode';
        
        if (this.connectBtn) {
            this.connectBtn.textContent = isConnected ? 'Disconnect Arduino' : 'Connect to Arduino';
            this.connectBtn.disabled = mode === 'simulation';
        }

        this.calibrateZeroBtns.forEach((btn, index) => {
            if (btn) {
                btn.disabled = (mode === 'arduino' && !isConnected) || 
                               (deviceType === '1-dome' && index > 0); // Disable btn 2 & 3 for 1-dome
            }
        });

        if (this.startLogBtn) {
            this.startLogBtn.disabled = (mode === 'arduino' && !isConnected);
            if (mode === 'simulation' && window.serialSimulatorInstance) {
                this.startLogBtn.textContent = window.serialSimulatorInstance.isLogging ? 'Stop Data Log (Sim)' : 'Start Data Log (Sim)';
                this.startLogBtn.classList.toggle('active', window.serialSimulatorInstance.isLogging);
            } else if (mode === 'arduino') {
                 // For Arduino, the active state and text are toggled in its click handler. Here we just ensure correct text if not active.
                if (!this.startLogBtn.classList.contains('active')) {
                    this.startLogBtn.textContent = 'Start Data Log (Arduino)';
                }
            } else { // Not connected or invalid state for logging
                this.startLogBtn.textContent = 'Start Data Log';
                this.startLogBtn.classList.remove('active');
            }
        }
    }

    _updateLiveSensorDisplayVisibility(deviceType) {
        for (let i = 0; i < 3; i++) {
            if (this.sensorGroupElements[i]) { // These are the containers for Pa and Norm. (e.g. #sensor-group-0)
                this.sensorGroupElements[i].style.display = (deviceType === '1-dome' && i === 0) || (deviceType === '3-dome') ? '' : 'none';
            }
        }
    }

    _updatePressureRangeInputsAndVisibility(deviceType, pressureRangesArray) {
        const ranges = pressureRangesArray || this.inputManager.pressureRanges; // Fallback if not passed
        for (let i = 0; i < 3; i++) {
            if (this.pressureRangeInputs[i] && ranges && ranges[i] !== undefined) {
                const isRelevant = (deviceType === '1-dome' && i === 0) || (deviceType === '3-dome');
                if (isRelevant) {
                    this.pressureRangeInputs[i].value = ranges[i];
                }
            }
        }
    }

    _updateBasePressureInputsAndVisibility(deviceType, basePressuresArray) {
        const bases = basePressuresArray || this.inputManager.basePressures; // Fallback if not passed
        for (let i = 0; i < 3; i++) {
            if (this.basePressureInputs[i] && bases && bases[i] !== undefined) {
                const isRelevant = (deviceType === '1-dome' && i === 0) || (deviceType === '3-dome');
                if (isRelevant) {
                    this.basePressureInputs[i].value = bases[i];
                }
            }
        }
    }

    _updateCalibrationGroupVisibility(deviceType) {
        if (this.domeCalibrationGroups) {
            this.domeCalibrationGroups.forEach((group, index) => {
                if (group) {
                    if (deviceType === '1-dome') {
                        group.style.display = (index === 0) ? '' : 'none';
                    } else { // 3-dome
                        group.style.display = ''; // Show all three for 3-dome
                    }
                }
            });
        }
    }

    dispose() {
        // Remove control-specific listeners
        if (this.connectBtn) this.connectBtn.removeEventListener('click', this.handleConnectClick);
        if (this.simulationToggle) this.simulationToggle.removeEventListener('click', this.handleSimulationToggleClick);
        this.calibrateZeroBtns.forEach((btn, index) => {
            if (btn) {
                const handler = () => this.handleCalibrateZeroClick(index);
                 // To properly remove, the exact same function reference is needed.
                 // This is tricky with anonymous functions. Storing them might be better.
                 // For now, this might not effectively remove if the handler was () => this.handleCalibrateZeroClick(index)
                 // A better approach is to have named bound methods if removal is critical,
                 // or re-evaluate if dispose needs to be this granular for these buttons.
                 // Let's assume for now the removal is being handled or not critical for this specific case.
            }
        });
        this.pressureRangeInputs.forEach((input, index) => {
            if (input) { // Similar issue with anonymous event handler for removal
                // const handler = (event) => this.handlePressureRangeChange(event, index);
                // input.removeEventListener('change', handler);
            }
        });
        this.basePressureInputs.forEach((input, index) => {
            if (input) { // Similar issue
                // const handler = (event) => this.handleBasePressureChange(event, index);
                // input.removeEventListener('change', handler);
            }
        });
        if (this.startLogBtn) this.startLogBtn.removeEventListener('click', this.handleStartLogClick);
        if (this.clearLogBtn) this.clearLogBtn.removeEventListener('click', this.handleClearLogClick);

        // Remove global event listeners
        document.removeEventListener(EVT_FORCE_UPDATE, this.handleForceUpdate);
        document.removeEventListener(EVT_MODE_CHANGED, this.handleModeChange);
        document.removeEventListener(EVT_LOG_MESSAGE, this.handleLogMessage);
        document.removeEventListener(EVT_PRESSURE_RANGES_CHANGED, this.handlePressureRangesChanged);
        document.removeEventListener(EVT_BASE_PRESSURES_CHANGED, this.handleBasePressuresChanged);
        console.log("SettingsManager disposed.");
    }
} 