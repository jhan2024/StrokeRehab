// Define the class FIRST
class SimulatedSerialPort {
    constructor() {
        this.isOpen = false;
        this.simulationInterval = null;
        this.latestValue = null;
        this.basePressure = 101300; // Pa
        this.pressureRange = 1000;  // Pa (Max pressure offset from base)
        this.noiseMagnitude = 50;   // Pa 
        this.isIncreasingForce = false; // Flag controlled by events
        this.forceIncreaseStartTime = 0;
        this.currentSimulatedForce = 0; // Current force level (0-1)
        this.MAX_FORCE_TIME = 3000; // ms to reach max force

        // Listen for control events from script.js
        document.addEventListener('sim-control', this.handleSimControl.bind(this));
    }

    async open(options) {
        console.log('Opening simulated serial port with options:', options);
        if (this.isOpen) {
            console.log("Simulator port already open.");
            return Promise.resolve();
        }
        this.isOpen = true;
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
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null; 
        }
        this.latestValue = null; 
        this.isIncreasingForce = false; // Reset state on close
        this.currentSimulatedForce = 0;
        return Promise.resolve();
    }

    // Event handler for simulator control
    handleSimControl(event) {
        const { action, duration } = event.detail;
        // console.log(`Simulator received control event:`, event.detail);
        if (action === 'start') {
             if (!this.isIncreasingForce) {
                this.isIncreasingForce = true;
                this.forceIncreaseStartTime = Date.now();
            }
        } else if (action === 'stop') {
            this.isIncreasingForce = false;
            // Optional: use duration for immediate force setting? Currently ignored.
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
            // Update force based on spacebar state (isIncreasingForce flag)
            if (this.isIncreasingForce) {
                const holdDuration = Date.now() - this.forceIncreaseStartTime;
                this.currentSimulatedForce = Math.min(holdDuration / this.MAX_FORCE_TIME, 1);
            } else {
                if (this.currentSimulatedForce > 0) {
                    this.currentSimulatedForce = Math.max(0, this.currentSimulatedForce - 0.05); 
                }
            }
            const pressureOffset = this.currentSimulatedForce * this.pressureRange;
            const noise = (Math.random() - 0.5) * this.noiseMagnitude;
            const simulatedPressure = Math.max(this.basePressure, this.basePressure + pressureOffset + noise);
            const dataString = simulatedPressure.toFixed(2) + '\n';
            this.latestValue = new TextEncoder().encode(dataString);
            
            // Check if logging is enabled VIA the DOM element (as before)
            // TODO: Ideally, the simulator shouldn't interact with DOM. 
            // It could dispatch all data and let a listener decide whether to log.
            const startLogBtn = document.querySelector('#debugContent .start-log.active'); 
            if (startLogBtn) { 
                // Dispatch log data instead of writing to DOM
                const logDetail = {
                    timestamp: new Date().toLocaleTimeString(),
                    message: `Simulated Pressure: ${simulatedPressure.toFixed(2)} Pa (Force: ${this.currentSimulatedForce.toFixed(2)})`
                };
                document.dispatchEvent(new CustomEvent('logmessage', { detail: logDetail }));
            }
        }, 50); 
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