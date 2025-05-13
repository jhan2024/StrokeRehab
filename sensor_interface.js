// --- Event Names (Copied from script.js for context, ensure they are consistently defined or imported) ---
// const EVT_STATUS_MESSAGE = 'statusmessage'; // MOVED to constants.js
// It's generally better if ArduinoConnection doesn't dispatch global document events itself, 
// but rather returns promises or uses callbacks/events on its own instance, 
// which InputModeManager would then handle and dispatch globally if needed.
// For now, we'll keep it as is to minimize initial changes.

class ArduinoConnection {
    constructor(dataHandlerCallback, statusHandlerCallback) {
        this.port = null;
        this.reader = null;
        this.isConnected = false;
        // this.isWebSerialSupported = 'serial' in navigator; // This should be checked by the calling module (InputModeManager)
                                                            // or passed in, to keep this class more focused.
                                                            // For now, keeping it to reduce initial refactoring.
        this.isWebSerialSupported = 'serial' in navigator || (window._realNavigatorSerial !== undefined && window._realNavigatorSerial !== null);

        this.dataHandler = dataHandlerCallback;
        this.statusHandler = statusHandlerCallback;

        if (typeof this.dataHandler !== 'function') {
            console.error("ArduinoConnection: dataHandlerCallback is not a function!");
            // Provide a no-op default to prevent errors if not passed
            this.dataHandler = () => console.warn("ArduinoConnection: Missing dataHandler called.");
        }
        if (typeof this.statusHandler !== 'function') {
            console.error("ArduinoConnection: statusHandlerCallback is not a function!");
            // Provide a no-op default
            this.statusHandler = (message, type) => console.warn(`ArduinoConnection: Missing statusHandler called with: ${type} - ${message}`);
        }
    }

    async connect(mode) {
        const useSimulator = mode === 'simulation';
        const serialSource = useSimulator ? null : window._realNavigatorSerial; 

        console.log(`ArduinoConnection.connect called with mode: ${mode}`);

        if (!useSimulator && !serialSource) {
             console.error('Arduino Mode Error: Real Web Serial API not available.');
             this.statusHandler('Real Web Serial API not supported or available.', 'error');
             return false;
        }
         if (useSimulator && !window.serialSimulatorInstance) {
              console.error('Simulation Mode Error: Simulator instance not found!');
              this.statusHandler('Simulator instance not found. Please reload.', 'error');
              return false;
         }

        try {
            if (useSimulator) {
                console.log("Connecting to SIMULATOR...");
                this.port = window.serialSimulatorInstance;
                if (!this.port.isOpen) {
                    console.log("Simulator port was closed, reopening...");
                     await this.port.open({ baudRate: 9600 });
                }
                console.log("Simulator port assigned and confirmed open.");
            } else {
                console.log("Requesting REAL serial port from user...");
                this.port = await serialSource.requestPort(); 
                console.log("Real port received:", this.port);
                await this.port.open({ baudRate: 9600 });
                console.log("Real port opened.");
            }

            this.isConnected = true;
            this.statusHandler(useSimulator ? 'Simulator connected successfully!' : 'Device connected successfully!', 'success');
            this.startReading(); 
            return true;

        } catch (error) {
            console.error('Connection error:', error);
             let message = `Failed to connect: ${error.message}`;
             if (error.name === 'NotFoundError' || error.name === 'NotAllowedError') {
                 message = 'Port selection cancelled or denied.';
             }
             this.statusHandler(message, 'error');
             this.isConnected = false;
             this.port = null; 
             return false;
        }
    }

    async disconnect() {
        console.log("Disconnecting...");
        const wasConnected = this.isConnected;
        this.isConnected = false; 
        
        if (this.reader) {
            try {
                if (this.reader.cancel && typeof this.reader.cancel === 'function') {
                    await this.reader.cancel('Disconnecting');
                    console.log("Reader cancelled.");
                } else {
                     console.log("Reader not cancellable or cancel function not available.");
                }
            } catch(e) { console.error("Error cancelling reader:", e);}
            try {
                if (this.reader.releaseLock && typeof this.reader.releaseLock === 'function') {
                    this.reader.releaseLock();
                    console.log("Reader lock released.");
                }
            } catch (e) { console.error("Error releasing reader lock:", e); }
            this.reader = null;
        }

        if (this.port) {
             try {
                if (this.port.close && typeof this.port.close === 'function') {
                    await this.port.close(); 
                    console.log("Port closed.");
                } else {
                    console.log("Port not closable or close function not available.");
                }
            } catch (e) { console.error("Error closing port:", e); }
            this.port = null;
        }

         if (wasConnected) {
             this.statusHandler('Device/Simulator disconnected.', 'error');
         }
    }

    async startReading() {
        console.log("Starting read loop...");
        if (!this.isConnected || !this.port || !this.port.readable) {
             console.log("Cannot start reading: not connected or port not readable.");
             return;
        }
        
        while (this.isConnected) {
             if (!this.reader) {
                 try {
                     this.reader = this.port.readable.getReader();
                     console.log("Reader obtained.");
                 } catch (readerError) {
                     console.error("Error getting reader:", readerError);
                     await this.disconnect();
                     break; 
                 }
             }

            try {
                const { value, done } = await this.reader.read();
                
                if (done) {
                    console.log("Reader reported done=true. Stream likely closed.");
                    if (this.reader && this.reader.releaseLock) {
                        this.reader.releaseLock();
                    }
                    this.reader = null;
                     if (this.isConnected) {
                        console.log("Stream ended unexpectedly, disconnecting...");
                         await this.disconnect();
                     }
                    break; 
                }
                
                const rawValueString = new TextDecoder().decode(value).trim();

                const lines = rawValueString.split('\n');
                for (const line of lines) {
                    if (line.trim() === '') continue;
                    try {
                        const data = JSON.parse(line);
                        if (data && Array.isArray(data.normalizedForces) && Array.isArray(data.rawPressures)) {
                            this.dataHandler(data.normalizedForces, data.rawPressures);
                        } else {
                            const singleRawValue = parseFloat(line);
                            if (!isNaN(singleRawValue) && window.inputManager && window.inputManager.currentDeviceType === '1-dome') {
                                console.warn("Received old single float format, processing as 1-dome.");
                                const basePressure = window.inputManager.basePressures[0] || 100000;
                                const pressureRange = window.inputManager.pressureRanges[0] || 5000;
                                let normalizedForce = (singleRawValue - basePressure) / pressureRange;
                                normalizedForce = Math.max(0, Math.min(1, normalizedForce));
                                this.dataHandler([normalizedForce], [singleRawValue]);
                            } else {
                                console.warn("Received malformed or non-JSON data, or unhandled single float for 3-dome:", line);
                            }
                        }
                    } catch (e) {
                        const singleRawValue = parseFloat(line);
                        if (!isNaN(singleRawValue) && window.inputManager && window.inputManager.currentDeviceType === '1-dome') {
                            console.warn("Received non-JSON, attempting to parse as old single float format for 1-dome:", line);
                            const basePressure = window.inputManager.basePressures[0] || 100000;
                            const pressureRange = window.inputManager.pressureRanges[0] || 5000;
                            let normalizedForce = (singleRawValue - basePressure) / pressureRange;
                            normalizedForce = Math.max(0, Math.min(1, normalizedForce));
                            this.dataHandler([normalizedForce], [singleRawValue]);
                        } else {
                             console.warn("Error parsing data (JSON or fallback float):", line, e);
                        }
                    }
                }

            } catch (error) {
                console.error('Read error:', error);
                if (this.reader && this.reader.releaseLock) {
                     this.reader.releaseLock();
                }
                this.reader = null;
                await this.disconnect();
                break; 
            } 
        }
        console.log("Exited read loop.");
    }
} 