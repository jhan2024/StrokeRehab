// Simulated Serial Connection
class SimulatedSerialPort {
    constructor() {
        this.isOpen = false;
        this.onDataCallback = null;
        this.simulationInterval = null;
        this.noiseAmount = 0.1; // Amount of random noise to add
        this.baseValue = 0; // Base value for the sine wave
        this.time = 0; // Time counter for sine wave
    }

    // Simulate port opening
    async open(options) {
        console.log('Opening simulated serial port with options:', options);
        this.isOpen = true;
        this.startSimulation();
        return Promise.resolve();
    }

    // Simulate port closing
    async close() {
        console.log('Closing simulated serial port');
        this.isOpen = false;
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
        }
        return Promise.resolve();
    }

    // Start generating simulated data
    startSimulation() {
        this.simulationInterval = setInterval(() => {
            if (this.isOpen && this.readable && this.readable.onDataCallback) {
                // Generate a value between 0 and 1023 (Arduino analog range)
                // Using a sine wave with some noise for more realistic data
                this.time += 0.1;
                const sineValue = Math.sin(this.time) * 0.5 + 0.5; // Sine wave between 0 and 1
                const noise = (Math.random() - 0.5) * this.noiseAmount;
                const value = Math.floor((sineValue + noise) * 1023);
                
                // Ensure value stays within Arduino's analog range
                const clampedValue = Math.max(0, Math.min(1023, value));
                
                // Create a simulated data packet
                const data = new TextEncoder().encode(clampedValue.toString() + '\n');
                this.readable.onDataCallback({ value: data, done: false });
                
                // Update debug tab sensor values directly
                const pressureValue = document.getElementById('pressureValue');
                const rawValue = document.getElementById('rawValue');
                const lastUpdate = document.getElementById('lastUpdate');
                
                if (pressureValue) pressureValue.textContent = (clampedValue / 1023 * 10).toFixed(2);
                if (rawValue) rawValue.textContent = clampedValue;
                if (lastUpdate) lastUpdate.textContent = new Date().toLocaleTimeString();
                
                // Add to log if logging is enabled
                const startLogBtn = document.querySelector('.start-log');
                const arduinoLog = document.getElementById('arduinoLog');
                
                if (startLogBtn && startLogBtn.classList.contains('active') && arduinoLog) {
                    const timestamp = new Date().toLocaleTimeString();
                    arduinoLog.textContent += `[${timestamp}] Pressure: ${(clampedValue / 1023 * 10).toFixed(2)}, Raw: ${clampedValue}\n`;
                    
                    // Keep log size manageable
                    const maxLogLines = 100;
                    const lines = arduinoLog.textContent.split('\n');
                    if (lines.length > maxLogLines) {
                        arduinoLog.textContent = lines.slice(-maxLogLines).join('\n');
                    }
                    
                    // Auto-scroll to bottom
                    arduinoLog.scrollTop = arduinoLog.scrollHeight;
                }
            }
        }, 100); // Send data every 100ms
    }

    // Simulated readable stream
    get readable() {
        return {
            onDataCallback: this.onDataCallback,
            getReader: () => ({
                read: async () => {
                    // This will be replaced by the simulation interval
                    return Promise.resolve({ value: new Uint8Array([]), done: false });
                },
                releaseLock: () => {},
                cancel: async () => Promise.resolve()
            })
        };
    }
}

// Simulated Serial API
class SimulatedSerial {
    constructor() {
        this.port = new SimulatedSerialPort();
    }

    async requestPort() {
        console.log('Requesting simulated serial port');
        return this.port;
    }
}

// Replace the real Serial API with our simulated one if we're in simulation mode
if (!navigator.serial) {
    console.log('Web Serial API not available, using simulation');
    navigator.serial = new SimulatedSerial();
    
    // Initialize simulation port
    setTimeout(() => {
        const simPort = new SimulatedSerialPort();
        simPort.open({ baudRate: 9600 });
    }, 500);
} else {
    console.log('Web Serial API available, simulation available as fallback');
    // Store the real Serial API
    navigator._realSerial = navigator.serial;
    
    // Auto-initialize simulation for testing
    navigator.serial = new SimulatedSerial();
    setTimeout(() => {
        const simPort = new SimulatedSerialPort();
        simPort.open({ baudRate: 9600 });
        
        // Update UI to show simulation is active
        const simulationToggle = document.querySelector('.simulation-toggle');
        if (simulationToggle) {
            simulationToggle.classList.add('active');
            simulationToggle.textContent = 'Using Simulation';
        }
    }, 500);
    
    // Add method to switch between real and simulated
    navigator.switchToSimulatedSerial = () => {
        console.log('Switching to simulated serial');
        navigator.serial = new SimulatedSerial();
        
        // Update simulation toggle if it exists
        const simulationToggle = document.querySelector('.simulation-toggle');
        if (simulationToggle) {
            simulationToggle.classList.add('active');
            simulationToggle.textContent = 'Using Simulation';
        }
        
        // Auto-start simulation
        setTimeout(() => {
            const simPort = new SimulatedSerialPort();
            simPort.open({ baudRate: 9600 });
        }, 500);
    };
    
    navigator.switchToRealSerial = () => {
        console.log('Switching to real serial');
        navigator.serial = navigator._realSerial;
        
        // Update simulation toggle if it exists
        const simulationToggle = document.querySelector('.simulation-toggle');
        if (simulationToggle) {
            simulationToggle.classList.remove('active');
            simulationToggle.textContent = 'Use Simulation';
        }
    };
    
    // Auto-switch to simulation for testing
    setTimeout(() => {
        // Only auto-switch if simulation toggle is used
        const simulationToggle = document.querySelector('.simulation-toggle');
        if (simulationToggle && simulationToggle.classList.contains('active')) {
            navigator.switchToSimulatedSerial();
        }
    }, 1000);
} 