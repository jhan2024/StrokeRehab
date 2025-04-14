document.addEventListener('DOMContentLoaded', function() {
    // Tab Switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Function to switch tabs
    function switchTab(tabId) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Deactivate all buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab
        const tabElementId = tabId === 'debug' ? 'debugContent' : tabId;
        const selectedTab = document.getElementById(tabElementId);
        const selectedBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        
        if (selectedTab && selectedBtn) {
            selectedTab.classList.add('active');
            selectedBtn.classList.add('active');
            
            // Initialize debug tab if needed
            if (tabId === 'debug') {
                initializeDebugTab();
            }
        }
    }
    
    // Set up tab button click handlers
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
        if (sidePanel.classList.contains('hidden')) {
            // Show panel
            sidePanel.classList.remove('hidden');
            sidePanel.style.marginLeft = '0';
            mainPanel.style.marginLeft = '0';
            mainPanel.style.width = 'calc(100% - 280px)';
            togglePanelBtn.textContent = 'Hide Panel';
        } else {
            // Hide panel
            sidePanel.classList.add('hidden');
            sidePanel.style.marginLeft = '-280px';
            mainPanel.style.width = '100%';
            mainPanel.style.marginLeft = '0';
            togglePanelBtn.textContent = 'Show Panel';
        }
    });
    
    // Arduino Communication Class
    class ArduinoConnection {
        constructor() {
            this.port = null;
            this.reader = null;
            this.writer = null;
            this.isConnected = false;
            this.onForceUpdate = null;
            
            // Check if Web Serial API is supported
            this.isWebSerialSupported = 'serial' in navigator;
        }

        async connect() {
            // If Web Serial API is not supported, show error and return false
            if (!this.isWebSerialSupported) {
                console.error('Web Serial API is not supported in this browser');
                
                const errorMsg = document.createElement('div');
                errorMsg.className = 'status-message error';
                errorMsg.textContent = 'Web Serial API not supported in this browser. Try Chrome or Edge.';
                document.body.appendChild(errorMsg);
                setTimeout(() => errorMsg.remove(), 5000);
                
                return false;
            }
            
            try {
                // Request port access
                this.port = await navigator.serial.requestPort();
                await this.port.open({ baudRate: 9600 });
                
                this.isConnected = true;
                this.startReading();
                
                // Create status message
                const statusMsg = document.createElement('div');
                statusMsg.className = 'status-message success';
                statusMsg.textContent = 'Arduino connected successfully!';
                document.body.appendChild(statusMsg);
                setTimeout(() => statusMsg.remove(), 3000);
                
                return true;
            } catch (error) {
                console.error('Connection error:', error);
                
                // Create error message
                const errorMsg = document.createElement('div');
                errorMsg.className = 'status-message error';
                errorMsg.textContent = 'Failed to connect: ' + error.message;
                document.body.appendChild(errorMsg);
                setTimeout(() => errorMsg.remove(), 3000);
                
                return false;
            }
        }

        async disconnect() {
            if (this.reader) {
                await this.reader.cancel();
            }
            if (this.port) {
                await this.port.close();
            }
            this.isConnected = false;
        }

        async startReading() {
            while (this.port.readable && this.isConnected) {
                this.reader = this.port.readable.getReader();
                try {
                    while (true) {
                        const { value, done } = await this.reader.read();
                        if (done) break;
                        console.log('connected is ', this.isConnected);
                        console.log('value is ', value);
                        console.log('done is ', done);
                        
                        // Process the received force data
                        const forceValue = new TextDecoder().decode(value);
                        const normalizedForce = (parseFloat(forceValue) - 101300) / 101300; 
                        console.log('normalizedForce is ', normalizedForce);
                        
                        // Update force visualization
                        if (typeof currentForce !== 'undefined') {
                            currentForce = normalizedForce;
                            updateForceBar();
                            drawEllipsoid();
                        }
                        
                        // Update measurement if active
                        if (this.onForceUpdate) {
                            this.onForceUpdate(normalizedForce);
                        }
                    }
                } catch (error) {
                    console.error('Read error:', error);
                } finally {
                    this.reader.releaseLock();
                }
            }
        }

        setForceUpdateCallback(callback) {
            this.onForceUpdate = callback;
        }
    }

    // Add mode switch in the control section
    class InputModeManager {
        constructor() {
            this.arduino = new ArduinoConnection();
            
            // Start in simulation mode by default, or if Web Serial API is not supported
            this.currentMode = this.arduino.isWebSerialSupported ? 'simulation' : 'simulation';
            
            // Add browser compatibility warning if needed
            if (!this.arduino.isWebSerialSupported) {
                const warningMsg = document.createElement('div');
                warningMsg.className = 'browser-warning';
                warningMsg.innerHTML = '<strong>Note:</strong> Arduino connection requires Chrome or Edge browser. Using simulation mode only.';
                document.querySelector('.control-section').prepend(warningMsg);
            }

            this.onForceUpdate = null;
            this.currentForce = 0;
            this.spacebarPressed = false;
            this.spacebarHoldStartTime = 0;
            this.MAX_FORCE_TIME = 3000;
            this.forceUpdateInterval = null;
            this.gameControlCallback = null; // Add callback for game control
            this.GAME_FORCE_THRESHOLD = 0.3; // Threshold for game control activation
            
            // Add debug callbacks
            this.onDebugUpdate = null;
            this.isLoggingData = false;
        }

        async switchMode(mode) {
            // If trying to switch to Arduino mode but not supported, stay in simulation
            if (mode === 'arduino' && !this.arduino.isWebSerialSupported) {
                const errorMsg = document.createElement('div');
                errorMsg.className = 'status-message error';
                errorMsg.textContent = 'Arduino mode not available in this browser. Use Chrome or Edge.';
                document.body.appendChild(errorMsg);
                setTimeout(() => errorMsg.remove(), 3000);
                
                // Stay in simulation mode
                this.updateModeUI();
                return;
            }
            
            if (mode === this.currentMode) return;

            // Clean up current mode
            if (this.currentMode === 'arduino' && this.arduino.isConnected) {
                await this.arduino.disconnect();
            } else if (this.currentMode === 'simulation') {
                this.cleanupSpacebarListeners();
            }

            this.currentMode = mode;

            // Setup new mode
            if (mode === 'arduino') {
                const connected = await this.arduino.connect();
                if (connected) {
                    this.arduino.setForceUpdateCallback((force) => this.handleForceUpdate(force));
                } else {
                    // If connection fails, fall back to simulation
                    this.currentMode = 'simulation';
                    this.setupSpacebarListeners();
                }
            } else {
                this.setupSpacebarListeners();
            }

            // Update UI
            this.updateModeUI();
            
            // Update debug tab if it exists
            if (debugStatusIndicator) {
                if (this.currentMode === 'arduino' && this.arduino.isConnected) {
                    debugStatusIndicator.textContent = 'Connected';
                    debugStatusIndicator.classList.remove('disconnected');
                    debugStatusIndicator.classList.add('connected');
                    connectBtn.textContent = 'Disconnect';
                    connectBtn.classList.add('disconnect');
                } else {
                    debugStatusIndicator.textContent = 'Disconnected';
                    debugStatusIndicator.classList.remove('connected');
                    debugStatusIndicator.classList.add('disconnected');
                    connectBtn.textContent = 'Connect to Arduino';
                    connectBtn.classList.remove('disconnect');
                }
            }
        }

        handleForceUpdate(force) {
            this.currentForce = force;
            if (this.onForceUpdate) {
                this.onForceUpdate(force);
            }
            
            // Handle game control
            if (this.gameControlCallback) {
                // If force exceeds threshold, trigger game control
                if (force > this.GAME_FORCE_THRESHOLD) {
                    this.gameControlCallback(force);
                }
            }
            
            updateForceBar();
            drawEllipsoid();
            
            // Update debug values if debug tab is active
            if (this.onDebugUpdate && (this.isLoggingData || document.getElementById('debug').classList.contains('active'))) {
                const rawVal = Math.round(force * 1023);
                this.onDebugUpdate(force, rawVal);
            }
        }

        setupSpacebarListeners() {
            document.addEventListener('keydown', this.handleKeyDown.bind(this));
            document.addEventListener('keyup', this.handleKeyUp.bind(this));
        }

        cleanupSpacebarListeners() {
            document.removeEventListener('keydown', this.handleKeyDown.bind(this));
            document.removeEventListener('keyup', this.handleKeyUp.bind(this));
            if (this.forceUpdateInterval) {
                clearInterval(this.forceUpdateInterval);
            }
        }

        handleKeyDown(e) {
            if (e.code === 'Space' && !this.spacebarPressed && this.currentMode === 'simulation') {
                this.spacebarPressed = true;
                this.spacebarHoldStartTime = Date.now();
                
                this.forceUpdateInterval = setInterval(() => {
                    const holdTime = Date.now() - this.spacebarHoldStartTime;
                    this.currentForce = Math.min(1, holdTime / this.MAX_FORCE_TIME);
                    this.handleForceUpdate(this.currentForce);
                }, 50);
                
                const spacebarIndicator = document.createElement('div');
                spacebarIndicator.className = 'spacebar-indicator';
                spacebarIndicator.textContent = 'SPACEBAR PRESSED';
                document.body.appendChild(spacebarIndicator);
                
                e.preventDefault();
            }
        }

        handleKeyUp(e) {
            if (e.code === 'Space' && this.currentMode === 'simulation') {
                this.spacebarPressed = false;
                if (this.forceUpdateInterval) {
                    clearInterval(this.forceUpdateInterval);
                }
                
                this.currentForce = 0;
                this.handleForceUpdate(this.currentForce);
                
                const indicator = document.querySelector('.spacebar-indicator');
                if (indicator) {
                    indicator.remove();
                }
                
                e.preventDefault();
            }
        }

        updateModeUI() {
            const statusIndicator = document.querySelector('.status-indicator');
            const controlBtn = document.querySelector('.control-btn');
            const modeSwitch = document.querySelector('.mode-switch');
            
            if (this.currentMode === 'arduino') {
                modeSwitch.textContent = 'Switch to Simulation';
                if (this.arduino.isConnected) {
                    statusIndicator.textContent = 'Connected to Arduino';
                    statusIndicator.classList.add('connected');
                    statusIndicator.classList.remove('disconnected');
                    controlBtn.textContent = 'Disconnect';
                }
            } else {
                modeSwitch.textContent = 'Switch to Arduino';
                statusIndicator.textContent = 'Simulation Mode';
                statusIndicator.classList.remove('connected', 'disconnected');
                statusIndicator.classList.add('simulation');
                controlBtn.textContent = 'Connect';
            }
        }

        setForceUpdateCallback(callback) {
            this.onForceUpdate = callback;
            if (this.currentMode === 'arduino') {
                this.arduino.setForceUpdateCallback(callback);
            }
        }

        setGameControlCallback(callback) {
            this.gameControlCallback = callback;
        }

        setDebugUpdateCallback(callback) {
            this.onDebugUpdate = callback;
        }
        
        setLoggingState(isLogging) {
            this.isLoggingData = isLogging;
        }
    }

    // Initialize the input mode manager
    const inputManager = new InputModeManager();

    // Modify the existing control button handler
    const controlBtn = document.querySelector('.control-btn');
    const statusIndicator = document.querySelector('.status-indicator');

    // Create and add mode switch button
    const modeSwitch = document.createElement('button');
    modeSwitch.className = 'mode-switch';
    modeSwitch.textContent = 'Switch to Arduino';
    controlBtn.parentElement.insertBefore(modeSwitch, controlBtn.nextSibling);

    // Add event listener for mode switch
    modeSwitch.addEventListener('click', async () => {
        const newMode = inputManager.currentMode === 'arduino' ? 'simulation' : 'arduino';
        await inputManager.switchMode(newMode);
    });

    // Modify control button handler
    controlBtn.addEventListener('click', async () => {
        if (inputManager.currentMode === 'arduino') {
            if (inputManager.arduino.isConnected) {
                await inputManager.arduino.disconnect();
                statusIndicator.classList.remove('connected');
                statusIndicator.classList.add('disconnected');
                statusIndicator.textContent = 'Disconnected';
                controlBtn.textContent = 'Connect';
            } else {
                const connected = await inputManager.arduino.connect();
                if (connected) {
                    statusIndicator.classList.remove('disconnected');
                    statusIndicator.classList.add('connected');
                    statusIndicator.textContent = 'Connected';
                    controlBtn.textContent = 'Disconnect';
                }
            }
        }
    });

    // Modify the measurement functionality to use input manager
    const measureBtn = document.querySelector('.measure-btn');
    let isRecording = false;
    let measurementData = [];
    let startTime = null;

    if (measureBtn) {
        measureBtn.addEventListener('click', () => {
            if (!isRecording) {
                isRecording = true;
                measurementData = [];
                startTime = Date.now();
                measureBtn.textContent = 'Stop Measurement';
                measureBtn.classList.add('recording');
                
                inputManager.setForceUpdateCallback((force) => {
                    const timestamp = Date.now() - startTime;
                    measurementData.push({ timestamp, force });
                    updateMeasurementDisplay(force);
                });
            } else {
                isRecording = false;
                measureBtn.textContent = 'Start Measurement';
                measureBtn.classList.remove('recording');
                inputManager.setForceUpdateCallback(null);
                
                if (measurementData.length > 0) {
                    const forces = measurementData.map(d => d.force);
                    const maxForce = Math.max(...forces);
                    const avgForce = forces.reduce((a, b) => a + b, 0) / forces.length;
                    const duration = formatDuration(Date.now() - startTime);
                    
                    updateMeasurementMetrics(maxForce, avgForce, duration);
                    drawMeasurementChart();
                }
            }
        });
    }

    function updateMeasurementDisplay(force) {
        const maxForceElement = document.querySelector('.metric-value:nth-child(1)');
        const avgForceElement = document.querySelector('.metric-value:nth-child(2)');
        const durationElement = document.querySelector('.metric-value:nth-child(3)');
        
        if (maxForceElement && avgForceElement && durationElement) {
            const forces = measurementData.map(d => d.force);
            const maxForce = Math.max(...forces);
            const avgForce = forces.reduce((a, b) => a + b, 0) / forces.length;
            const duration = formatDuration(Date.now() - startTime);
            
            updateMeasurementMetrics(maxForce, avgForce, duration);
        }
    }

    function updateMeasurementMetrics(maxForce, avgForce, duration) {
        const maxForceElement = document.querySelector('.metric-value');
        const avgForceElement = document.querySelector('.metric-value:nth-child(2)');
        const durationElement = document.querySelector('.metric-value:nth-child(3)');
        
        if (maxForceElement) maxForceElement.textContent = `${(maxForce * 10).toFixed(1)} N`;
        if (avgForceElement) avgForceElement.textContent = `${(avgForce * 10).toFixed(1)} N`;
        if (durationElement) durationElement.textContent = duration;
    }

    function formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }

    function drawMeasurementChart() {
        const canvas = document.getElementById('forceChart');
        if (!canvas || !measurementData.length) return;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw chart axes
        ctx.beginPath();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.moveTo(50, 20);
        ctx.lineTo(50, canvas.height - 30);
        ctx.lineTo(canvas.width - 20, canvas.height - 30);
        ctx.stroke();
        
        // Plot data points
        const xScale = (canvas.width - 70) / measurementData[measurementData.length - 1].timestamp;
        const yScale = (canvas.height - 50) / 1;
        
        ctx.beginPath();
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        measurementData.forEach((point, i) => {
            const x = 50 + point.timestamp * xScale;
            const y = canvas.height - 30 - (point.force * yScale);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    }
    
    // Canvas drawing placeholder (for touch visualization)
    const touchCanvas = document.getElementById('touchCanvas');
    if (touchCanvas) {
        const ctx = touchCanvas.getContext('2d');
        
        // Track touch points
        const touchPoints = [];
        
        // Track force level and spacebar state
        let currentForce = 0.6;
        let spacebarPressed = false;
        let spacebarHoldStartTime = 0;
        const MAX_FORCE_TIME = 3000; // 3 seconds to reach max force
        let activePoint = null; // Track the current active touch point
        
        // Draw the 3D ellipsoid with touch points
        function drawEllipsoid() {
            ctx.clearRect(0, 0, touchCanvas.width, touchCanvas.height);
            
            const centerX = touchCanvas.width / 2;
            const centerY = touchCanvas.height / 2;
            const radiusX = touchCanvas.width / 2 - 30;
            const radiusY = touchCanvas.height / 2 - 40;
            
            // Create 3D effect with gradient
            const gradient = ctx.createRadialGradient(
                centerX - radiusX * 0.3, centerY - radiusY * 0.3, radiusX * 0.1,
                centerX, centerY, radiusX
            );
            gradient.addColorStop(0, '#4a6279');
            gradient.addColorStop(0.7, '#34495e');
            gradient.addColorStop(1, '#2c3e50');
            
            // Draw ellipsoid base
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Add highlight
            ctx.beginPath();
            ctx.ellipse(
                centerX - radiusX * 0.2, 
                centerY - radiusY * 0.2, 
                radiusX * 0.7, 
                radiusY * 0.5, 
                Math.PI / 4, 
                0, 
                Math.PI * 2
            );
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fill();
            
            // Draw border
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.strokeStyle = '#4a6279';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw active touch point if exists
            if (activePoint) {
                drawTouchPoint(activePoint.x, activePoint.y, activePoint.pressure);
            }
            
            // Update force bar
            updateForceBar();
        }
        
        // Draw individual touch point
        function drawTouchPoint(x, y, pressure) {
            const radius = Math.max(5, pressure * 15);
            
            // Glow effect
            ctx.beginPath();
            const glowGradient = ctx.createRadialGradient(
                x, y, radius * 0.5,
                x, y, radius * 2
            );
            glowGradient.addColorStop(0, 'rgba(52, 152, 219, 0.8)');
            glowGradient.addColorStop(1, 'rgba(52, 152, 219, 0)');
            
            ctx.fillStyle = glowGradient;
            ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Main touch point
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(52, 152, 219, 0.7)';
            ctx.fill();
            
            // Touch point highlight
            ctx.beginPath();
            ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fill();
        }
        
        // Check if a point is within an ellipse
        function isPointInEllipse(x, y, ellipseX, ellipseY, radiusX, radiusY) {
            return (Math.pow(x - ellipseX, 2) / Math.pow(radiusX, 2) + 
                   Math.pow(y - ellipseY, 2) / Math.pow(radiusY, 2)) <= 1;
        }
        
        // Update force based on spacebar hold time
        function updateForce() {
            if (spacebarPressed) {
                const currentTime = Date.now();
                const holdTime = currentTime - spacebarHoldStartTime;
                
                // Calculate force based on hold time (0 to 1)
                currentForce = Math.min(1, holdTime / MAX_FORCE_TIME);
                
                // Update visuals
                updateForceBar();
                drawEllipsoid();
            }
        }
        
        // Update the force bar visualization
        function updateForceBar() {
            const forceBar = document.querySelector('.force-level');
            if (forceBar) {
                forceBar.style.height = `${currentForce * 100}%`;
            }
        }
        
        // Add event listener for spacebar
        document.addEventListener('keydown', function(e) {
            if (e.code === 'Space' && !spacebarPressed) {
                spacebarPressed = true;
                spacebarHoldStartTime = Date.now();
                
                // Start updating force
                forceUpdateInterval = setInterval(updateForce, 50);
                
                // Update visual indication
                const spacebarIndicator = document.createElement('div');
                spacebarIndicator.className = 'spacebar-indicator';
                spacebarIndicator.textContent = 'SPACEBAR PRESSED';
                document.body.appendChild(spacebarIndicator);
                
                e.preventDefault();
            }
        });
        
        document.addEventListener('keyup', function(e) {
            if (e.code === 'Space') {
                spacebarPressed = false;
                clearInterval(forceUpdateInterval);
                
                // Reset force to zero
                currentForce = 0;
                updateForceBar();
                
                // Remove visual indication
                const indicator = document.querySelector('.spacebar-indicator');
                if (indicator) {
                    indicator.remove();
                }
                
                // Redraw to update canvas
                drawEllipsoid();
                
                e.preventDefault();
            }
        });
        
        // Canvas click to show temporary touch point
        touchCanvas.addEventListener('click', function(e) {
            const rect = touchCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = touchCanvas.width / 2;
            const centerY = touchCanvas.height / 2;
            const radiusX = touchCanvas.width / 2 - 30;
            const radiusY = touchCanvas.height / 2 - 40;
            
            // Check if click is within ellipse
            if (isPointInEllipse(x, y, centerX, centerY, radiusX, radiusY)) {
                // Set the active touch point with current force level
                activePoint = {
                    x: x,
                    y: y,
                    pressure: currentForce
                };
                
                // Redraw to show the touch point
                drawEllipsoid();
                
                // Optional: Hide the point after a short delay (1 second)
                setTimeout(() => {
                    activePoint = null;
                    drawEllipsoid();
                }, 1000);
            }
        });
        
        // Clear touch points on right click
        touchCanvas.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            activePoint = null;
            drawEllipsoid();
        });
        
        // Initial draw
        drawEllipsoid();
    }
    
    // Chart placeholder for measurement tab
    const forceChart = document.getElementById('forceChart');
    
    // Define drawChart in the global scope
    window.drawChart = function() {
        if (!forceChart) return;
        
        const ctx = forceChart.getContext('2d');
        const width = forceChart.width;
        const height = forceChart.height;
        
        ctx.clearRect(0, 0, width, height);
        
        // Draw axes
        ctx.beginPath();
        ctx.moveTo(50, 30);
        ctx.lineTo(50, height - 30);
        ctx.lineTo(width - 30, height - 30);
        ctx.strokeStyle = '#7f8c8d';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw axes labels
        ctx.fillStyle = '#7f8c8d';
        ctx.font = '12px Arial';
        ctx.fillText('Time (s)', width / 2, height - 10);
        
        // Rotate text for y-axis
        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Force (N)', 0, 0);
        ctx.restore();
        
        // Generate sample data
        const dataPoints = 20;
        const dataX = [];
        const dataY = [];
        
        for (let i = 0; i < dataPoints; i++) {
            dataX.push(i);
            dataY.push(Math.sin(i * 0.5) * 2 + Math.random() * 0.5 + 3); // Generate wavy data
        }
        
        // Draw data line
        ctx.beginPath();
        ctx.moveTo(50, height - 30 - (dataY[0] / 5 * (height - 60)));
        
        for (let i = 1; i < dataPoints; i++) {
            const x = 50 + (i / (dataPoints - 1)) * (width - 80);
            const y = height - 30 - (dataY[i] / 5 * (height - 60));
            ctx.lineTo(x, y);
        }
        
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Fill area under the line
        ctx.lineTo(50 + ((dataPoints - 1) / (dataPoints - 1)) * (width - 80), height - 30);
        ctx.lineTo(50, height - 30);
        ctx.fillStyle = 'rgba(52, 152, 219, 0.2)';
        ctx.fill();
    };
    
    // Initialize chart when document loads
    if (forceChart) {
        // Draw the chart initially
        window.drawChart();
        
        // Update chart when measurement button is clicked
        const measureBtn = document.querySelector('.measure-btn');
        if (measureBtn) {
            measureBtn.addEventListener('click', function() {
                if (this.textContent === 'Start Measurement') {
                    this.textContent = 'Stop Measurement';
                    this.style.backgroundColor = '#e74c3c';
                } else {
                    this.textContent = 'Start Measurement';
                    this.style.backgroundColor = '#3498db';
                    window.drawChart(); // Redraw chart with new random data
                    
                    // Update metrics
                    document.querySelectorAll('.metric-value')[0].textContent = (Math.random() * 3 + 5).toFixed(1) + ' N';
                    document.querySelectorAll('.metric-value')[1].textContent = (Math.random() * 2 + 3).toFixed(1) + ' N';
                }
            });
        }
    }

    // Modify Flappy Bird game integration
    const playFlappyBtn = document.getElementById('playFlappyBird');
    if (playFlappyBtn) {
        playFlappyBtn.addEventListener('click', function() {
            const gameContainer = document.getElementById('flappyBirdGame');
            if (gameContainer) {
                gameContainer.style.display = 'flex';
                
                // Set up force control for the game
                inputManager.setGameControlCallback((force) => {
                    // Trigger a "jump" event when force exceeds threshold
                    const jumpEvent = new KeyboardEvent('keydown', {
                        key: ' ',
                        code: 'Space',
                        keyCode: 32,
                        which: 32,
                        bubbles: true
                    });
                    document.dispatchEvent(jumpEvent);
                    
                    // Release after a short delay
                    setTimeout(() => {
                        const releaseEvent = new KeyboardEvent('keyup', {
                            key: ' ',
                            code: 'Space',
                            keyCode: 32,
                            which: 32,
                            bubbles: true
                        });
                        document.dispatchEvent(releaseEvent);
                    }, 100);
                });
            }
        });
    }

    // Handle game close and cleanup
    const closeGameBtn = document.getElementById('closeFlappyBird');
    if (closeGameBtn) {
        closeGameBtn.addEventListener('click', function() {
            const gameContainer = document.getElementById('flappyBirdGame');
            if (gameContainer) {
                gameContainer.style.display = 'none';
                // Remove game control callback when game is closed
                inputManager.setGameControlCallback(null);
            }
        });
    }

    // Add debug tab functionality
    const debugTab = document.getElementById('debug');
    const connectBtn = debugTab ? debugTab.querySelector('.connect-btn') : null;
    const debugStatusIndicator = debugTab ? debugTab.querySelector('.debug-status-indicator') : null;
    const startLogBtn = debugTab ? debugTab.querySelector('.start-log') : null;
    const clearLogBtn = debugTab ? debugTab.querySelector('.clear-log') : null;
    const arduinoLog = debugTab ? document.getElementById('arduinoLog') : null;
    const pressureValue = debugTab ? document.getElementById('pressureValue') : null;
    const rawValue = debugTab ? document.getElementById('rawValue') : null;
    const lastUpdate = debugTab ? document.getElementById('lastUpdate') : null;
    
    let isLogging = false;
    let loggedDataCount = 0;
    const MAX_LOG_ENTRIES = 100;
    
    // Function to initialize the debug tab
    function initializeDebugTab() {
        const debugTabContent = document.getElementById('debugContent');
        if (!debugTabContent) {
            return;
        }

        // Initialize Arduino log
        const arduinoLog = document.getElementById('arduinoLog');
        if (arduinoLog) {
            const now = new Date().toLocaleTimeString();
            if (arduinoLog.textContent === 'No data received yet...' || arduinoLog.textContent === '') {
                arduinoLog.textContent = 
                    `[${now}] Debug tab initialized\n` +
                    `[${now}] Web Serial API ${('serial' in navigator) ? 'is supported' : 'is NOT supported'} in this browser\n` +
                    `[${now}] Ready for connection to Arduino device\n`;
            }
        }

        // Initialize connection controls - Query from document using new parent ID
        const connectBtn = document.querySelector('#debugContent .connect-btn');
        const simulationToggle = document.querySelector('#debugContent .simulation-toggle');
        const statusIndicator = document.querySelector('#debugContent .debug-status-indicator');

        if (connectBtn && statusIndicator) {
            const newConnectBtn = connectBtn.cloneNode(true);
            connectBtn.parentNode.replaceChild(newConnectBtn, connectBtn);
            
            newConnectBtn.addEventListener('click', async () => {
                if (newConnectBtn.textContent === 'Connect to Arduino') {
                    try {
                        // Try to connect to Arduino
                        const now = new Date().toLocaleTimeString();
                        if ('serial' in navigator) {
                            // Request port and try to connect
                            const port = await navigator.serial.requestPort();
                            await port.open({ baudRate: 9600 });
                            
                            // Update UI to show connected state
                            statusIndicator.textContent = 'Connected';
                            statusIndicator.classList.remove('disconnected');
                            statusIndicator.classList.add('connected');
                            newConnectBtn.textContent = 'Disconnect';
                            
                            // Log success
                            if (arduinoLog) {
                                arduinoLog.textContent += `[${now}] Successfully connected to Arduino device\n`;
                            }
                        } else {
                            // Web Serial API not supported
                            if (arduinoLog) {
                                arduinoLog.textContent += `[${now}] Web Serial API not supported in this browser\n`;
                            }
                        }
                    } catch (error) {
                        // Log error
                        const now = new Date().toLocaleTimeString();
                        if (arduinoLog) {
                            arduinoLog.textContent += `[${now}] Error connecting to Arduino: ${error.message}\n`;
                        }
                    }
                } else {
                    // Disconnect logic
                    const now = new Date().toLocaleTimeString();
                    statusIndicator.textContent = 'Disconnected';
                    statusIndicator.classList.remove('connected');
                    statusIndicator.classList.add('disconnected');
                    newConnectBtn.textContent = 'Connect to Arduino';
                    if (arduinoLog) {
                        arduinoLog.textContent += `[${now}] Disconnected from Arduino device\n`;
                    }
                }
            });
        }

        if (simulationToggle) {
            const newSimToggle = simulationToggle.cloneNode(true);
            simulationToggle.parentNode.replaceChild(newSimToggle, simulationToggle);
            
            newSimToggle.addEventListener('click', () => {
                const now = new Date().toLocaleTimeString();
                const isSimulationActive = newSimToggle.classList.toggle('active');
                newSimToggle.textContent = isSimulationActive ? 'Using Simulation' : 'Use Simulation';
                
                if (arduinoLog) {
                    arduinoLog.textContent += `[${now}] ${isSimulationActive ? 'Enabled' : 'Disabled'} simulation mode\n`;
                }
                
                // Start simulation updates if active
                if (isSimulationActive) {
                    startSimulationUpdates();
                }
            });
        }

        // Initialize logging controls - Query from document using new parent ID
        const startLogBtn = document.querySelector('#debugContent .start-log');
        const clearLogBtn = document.querySelector('#debugContent .clear-log');

        if (startLogBtn) {
            const newStartLogBtn = startLogBtn.cloneNode(true);
            startLogBtn.parentNode.replaceChild(newStartLogBtn, startLogBtn);
            
            newStartLogBtn.addEventListener('click', () => {
                const isLogging = newStartLogBtn.classList.toggle('active');
                newStartLogBtn.textContent = isLogging ? 'Stop Logging' : 'Start Logging';
                const now = new Date().toLocaleTimeString();
                if (arduinoLog) {
                    arduinoLog.textContent += `[${now}] ${isLogging ? 'Started' : 'Stopped'} data logging\n`;
                }
            });
        }

        if (clearLogBtn) {
            const newClearLogBtn = clearLogBtn.cloneNode(true);
            clearLogBtn.parentNode.replaceChild(newClearLogBtn, clearLogBtn);
            
            newClearLogBtn.addEventListener('click', () => {
                if (arduinoLog) {
                    const now = new Date().toLocaleTimeString();
                    arduinoLog.textContent = `[${now}] Log cleared\n`;
                }
            });
        }

        // Start simulation updates for sensor values
        startSimulationUpdates();
    }

    // Function to start simulation updates
    function startSimulationUpdates() {
        const pressureValue = document.getElementById('pressureValue');
        const rawValue = document.getElementById('rawValue');
        const lastUpdate = document.getElementById('lastUpdate');
        
        // Create new simulation interval (clear old one if exists)
        if (window.simulationInterval) {
            clearInterval(window.simulationInterval);
        }
        
        window.simulationInterval = setInterval(() => {
            const simulationToggle = document.querySelector('.simulation-toggle');
            if (simulationToggle && simulationToggle.classList.contains('active')) {
                const now = new Date().toLocaleTimeString();
                if (pressureValue) pressureValue.textContent = (Math.random() * 10).toFixed(2);
                if (rawValue) rawValue.textContent = Math.floor(Math.random() * 1024);
                if (lastUpdate) lastUpdate.textContent = now;
            }
        }, 1000);
    }

    // Call initializeDebugTab on DOMContentLoaded to set up everything properly
    document.addEventListener('DOMContentLoaded', () => {
        // Get all tab buttons and content
        tabButtons = document.querySelectorAll('.tab-btn');
        tabContents = document.querySelectorAll('.tab-content');
        
        // Add click event to tab buttons
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                switchTab(tabId);
            });
        });

        // Initialize first tab or debug tab if specified in URL
        const hashTab = window.location.hash.slice(1);
        if (hashTab && document.getElementById(hashTab)) {
            switchTab(hashTab);
        } else {
            // Default to first tab
            const firstTab = tabButtons[0];
            if (firstTab) {
                switchTab(firstTab.getAttribute('data-tab'));
            }
        }
    });
}); 