// Define the class FIRST
class SimulatedSerialPort {
    constructor() {
        this.isOpen = false;
        this.simulationInterval = null;
        this.latestValue = null;
        this.basePressure = DEFAULT_BASE_PRESSURE; // Pa
        this.pressureRange = DEFAULT_PRESSURE_RANGE;  // Pa (Max pressure offset from base) - Default/Fallback
        this.noiseMagnitude = 50;   // Pa 

        // Device Type: '1-dome' or '3-dome'
        this.deviceType = '1-dome'; // Default to 1-dome
        this.pressureRanges = [this.pressureRange, this.pressureRange, this.pressureRange]; // ADDED: Array for per-dome ranges

        // State for 1-dome simulation (controlled by spacebar via sim-control event)
        this.isIncreasingForce1Dome = false;
        this.forceIncreaseStartTime1Dome = 0;
        this.currentSimulatedForce1Dome = 0;

        // State for 3-dome simulation (controlled by A, S, D keys directly)
        this.isIncreasingForce3Dome = [false, false, false]; // For A, S, D
        this.forceIncreaseStartTime3Dome = [0, 0, 0];
        this.currentSimulatedForces3Dome = [0, 0, 0]; // Normalized 0-1

        this.MAX_FORCE_TIME = 500; // ms to reach max force

        // Listen for control events from script.js (primarily for 1-dome spacebar)
        document.addEventListener('sim-control', this.handleSimControl.bind(this));

        // Direct key listeners for 3-dome mode
        this._boundKeyDown3Dome = this.handleKeyDown3Dome.bind(this);
        this._boundKeyUp3Dome = this.handleKeyUp3Dome.bind(this);
        // Listeners will be added/removed when deviceType changes
    }

    setDeviceType(type) {
        if (type === '1-dome' || type === '3-dome') {
            console.log(`Simulator: Setting device type to ${type}`);
            this.deviceType = type;
            // Ensure pressureRanges has appropriate length, re-initialize with default if needed
            if (type === '1-dome' && this.pressureRanges.length !== 1) {
                // this.pressureRanges = [this.pressureRanges[0] || this.pressureRange];
            } else if (type === '3-dome' && this.pressureRanges.length !== 3) {
                // this.pressureRanges = [
                //     this.pressureRanges[0] || this.pressureRange,
                //     this.pressureRanges[1] || this.pressureRange,
                //     this.pressureRanges[2] || this.pressureRange
                // ];
            } // Let setPressureRanges handle the main logic for updating these from InputManager

            if (this.isOpen) { // If already open, re-evaluate listeners
                this.updateKeyListeners();
            }
            // Reset simulation states when type changes
            this.isIncreasingForce1Dome = false;
            this.currentSimulatedForce1Dome = 0;
            this.isIncreasingForce3Dome = [false, false, false];
            this.currentSimulatedForces3Dome = [0, 0, 0];
        } else {
            console.warn(`Simulator: Invalid device type - ${type}`);
        }
    }

    updateKeyListeners() {
        if (this.deviceType === '3-dome' && this.isOpen) {
            document.addEventListener('keydown', this._boundKeyDown3Dome);
            document.addEventListener('keyup', this._boundKeyUp3Dome);
            console.log("Simulator: Added A,S,D key listeners for 3-dome mode.");
        } else {
            document.removeEventListener('keydown', this._boundKeyDown3Dome);
            document.removeEventListener('keyup', this._boundKeyUp3Dome);
            console.log("Simulator: Removed A,S,D key listeners.");
        }
    }

    handleKeyDown3Dome(e) {
        if (!this.isOpen || this.deviceType !== '3-dome') return;
        let keyIndex = -1;
        if (e.key.toLowerCase() === 'a') keyIndex = 0;
        else if (e.key.toLowerCase() === 's') keyIndex = 1;
        else if (e.key.toLowerCase() === 'd') keyIndex = 2;

        if (keyIndex !== -1) {
            e.preventDefault();
            if (!this.isIncreasingForce3Dome[keyIndex]) {
                this.isIncreasingForce3Dome[keyIndex] = true;
                this.forceIncreaseStartTime3Dome[keyIndex] = Date.now();
            }
        }
    }

    handleKeyUp3Dome(e) {
        if (!this.isOpen || this.deviceType !== '3-dome') return;
        let keyIndex = -1;
        if (e.key.toLowerCase() === 'a') keyIndex = 0;
        else if (e.key.toLowerCase() === 's') keyIndex = 1;
        else if (e.key.toLowerCase() === 'd') keyIndex = 2;

        if (keyIndex !== -1 && this.isIncreasingForce3Dome[keyIndex]) {
            e.preventDefault();
            this.isIncreasingForce3Dome[keyIndex] = false;
            // Force will naturally decrease in simulation loop
        }
    }

    // ADDED: Method to set per-dome pressure ranges
    setPressureRanges(ranges) {
        if (Array.isArray(ranges)) {
            this.pressureRanges = ranges.map(r => (typeof r === 'number' && r > 0 ? r : this.pressureRange));
            // Ensure it has 3 elements for 3-dome mode, or 1 for 1-dome, padding with the default if necessary
            if (this.deviceType === '1-dome') {
                this.pressureRanges = [this.pressureRanges[0] || this.pressureRange];
            } else { // 3-dome
                while (this.pressureRanges.length < 3) {
                    this.pressureRanges.push(this.pressureRange); // Default fallback
                }
                this.pressureRanges = this.pressureRanges.slice(0, 3); // Ensure max 3 elements
            }
            console.log(`Simulator: Pressure ranges set to:`, this.pressureRanges);
        } else {
            console.warn("Simulator: Invalid pressure ranges provided.", ranges);
        }
    }

    async open(options) {
        console.log('Opening simulated serial port with options:', options);
        if (this.isOpen) {
            console.log("Simulator port already open.");
            return Promise.resolve();
        }
        this.isOpen = true;
        this.updateKeyListeners(); // Add/remove A,S,D listeners based on current deviceType
        this.startSimulation(); // Start the interval timer
        return Promise.resolve();
    }

    async close() {
        console.log('Closing simulated serial port');
        if (!this.isOpen) {
             console.log("Simulator port already closed.");
             return Promise.resolve();
        }
        this.isOpen = false;
        this.updateKeyListeners(); // Remove A,S,D listeners
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null; 
        }
        this.latestValue = null; 
        // Reset states on close
        this.isIncreasingForce1Dome = false;
        this.currentSimulatedForce1Dome = 0;
        this.isIncreasingForce3Dome = [false, false, false];
        this.currentSimulatedForces3Dome = [0, 0, 0];
        return Promise.resolve();
    }

    // Event handler for simulator control (primarily for 1-dome spacebar)
    handleSimControl(event) {
        if (this.deviceType !== '1-dome') return; // Only apply to 1-dome mode

        const { action } = event.detail;
        // console.log(`Simulator (1-dome) received control event:`, event.detail);
        if (action === 'start') {
             if (!this.isIncreasingForce1Dome) {
                this.isIncreasingForce1Dome = true;
                this.forceIncreaseStartTime1Dome = Date.now();
            }
        } else if (action === 'stop') {
            this.isIncreasingForce1Dome = false;
        }
    }

    startSimulation() {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
        }
        this.simulationInterval = setInterval(() => {
             if (!this.isOpen) { 
                  clearInterval(this.simulationInterval);
                  this.simulationInterval = null;
                  return;
             }

            // Initialize outputObject differently based on deviceType
            let outputObject;

            if (this.deviceType === '1-dome') {
                outputObject = { normalizedForces: [], rawPressures: [] };
                // Update 1-dome force based on spacebar state (isIncreasingForce1Dome flag)
                if (this.isIncreasingForce1Dome) {
                    const holdDuration = Date.now() - this.forceIncreaseStartTime1Dome;
                    this.currentSimulatedForce1Dome = Math.min(holdDuration / this.MAX_FORCE_TIME, 1);
                } else {
                    if (this.currentSimulatedForce1Dome > 0) {
                        this.currentSimulatedForce1Dome = Math.max(0, this.currentSimulatedForce1Dome - 0.07);
                    }
                }
                const currentPressureRange = this.pressureRanges[0] || this.pressureRange;
                const pressureOffset = this.currentSimulatedForce1Dome * currentPressureRange;
                const noise = (Math.random() - 0.5) * this.noiseMagnitude;
                const rawPressure = Math.max(this.basePressure, this.basePressure + pressureOffset + noise);
                
                outputObject.normalizedForces.push(this.currentSimulatedForce1Dome);
                outputObject.rawPressures.push(parseFloat(rawPressure.toFixed(2)));

            } else { // 3-dome
                outputObject = { timestamp: Date.now(), pressure: [] }; // New format for 3-dome
                // We still need to calculate currentSimulatedForces3Dome for internal logic if any part depends on it, 
                // but it won't be part of the primary output object for this format.

                for (let i = 0; i < 3; i++) {
                    if (this.isIncreasingForce3Dome[i]) {
                        const holdDuration = Date.now() - this.forceIncreaseStartTime3Dome[i];
                        this.currentSimulatedForces3Dome[i] = Math.min(holdDuration / this.MAX_FORCE_TIME, 1);
                    } else {
                        if (this.currentSimulatedForces3Dome[i] > 0) {
                            this.currentSimulatedForces3Dome[i] = Math.max(0, this.currentSimulatedForces3Dome[i] - 0.07);
                        }
                    }
                    const currentPressureRange = this.pressureRanges[i] || this.pressureRange;
                    // Use currentSimulatedForces3Dome[i] to calculate the pressureOffset for rawPressure
                    const pressureOffset = this.currentSimulatedForces3Dome[i] * currentPressureRange;
                    const noise = (Math.random() - 0.5) * this.noiseMagnitude;
                    const rawPressure = Math.max(this.basePressure, this.basePressure + pressureOffset + noise);
                    
                    // outputObject.normalizedForces.push(this.currentSimulatedForces3Dome[i]); // REMOVED for new format
                    outputObject.pressure.push(parseFloat(rawPressure.toFixed(2))); // ADDED for new format
                }
            }

            const dataString = JSON.stringify(outputObject) + '\n';
            this.latestValue = new TextEncoder().encode(dataString);
            
            const startLogBtn = document.querySelector('#settingsContent .start-log.active'); 
            if (startLogBtn) { 
                const logDetail = {
                    timestamp: new Date().toLocaleTimeString(),
                    message: `Simulated Data: ${JSON.stringify(outputObject)}`
                };
                document.dispatchEvent(new CustomEvent('logmessage', { detail: logDetail }));
            }
        }, 20); 
    }

    // Simulated readable stream
    get readable() {
        const self = this; 
        return {
            getReader: () => ({
                read: async () => {
                    // Wait until a value is available OR port closed
                    while (self.latestValue === null && self.isOpen) {
                        await new Promise(resolve => setTimeout(resolve, 20)); 
                    }
                    // If port closed while waiting, return done
                    if (!self.isOpen) {
                        return Promise.resolve({ value: undefined, done: true });
                    }
                    const valueToReturn = self.latestValue;
                    // Clear latest value after reading to ensure reader waits for next value
                    self.latestValue = null; 
                    return Promise.resolve({ value: valueToReturn, done: false });
                },
                releaseLock: () => {},
                cancel: async () => {
                    console.log('Simulated reader cancelled');
                    // Don't close the port on cancel, just stop reading
                    return Promise.resolve();
                }
            })
        };
    }
     // Writable stream getter (placeholder, not used)
     get writable() {
         return null; // Or implement a dummy writable stream if needed later
     }
}

// --- NOW create instances and check real API ---

// Store the real navigator.serial if it exists, otherwise null
window._realNavigatorSerial = navigator.serial || null;

// Always create the simulator port instance and store it globally
window.serialSimulatorInstance = new SimulatedSerialPort();
console.log("Created global serialSimulatorInstance.");
if(window._realNavigatorSerial) {
    console.log("Real Web Serial API detected and stored in window._realNavigatorSerial.");
} else {
    console.log("Real Web Serial API not detected.");
}

// --- REMOVED SimulatedSerial class --- 
// --- REMOVED navigator.serial replacement logic --- 
// --- REMOVED switchTo... helper functions --- 