// measurement_manager.js

// Depends on:
// - constants.js (for EVT_FORCE_UPDATE, EVT_MODE_CHANGED)
// - Chart.js library (loaded globally)
// - input_mode_manager.js (instance passed to constructor)

const CHART_COLORS_MEASUREMENT = ['#3498db', '#e74c3c', '#2ecc71'];

class MeasurementManager {
    constructor(inputManagerInstance) {
        this.inputManager = inputManagerInstance;

        this.measureBtn = document.querySelector('.measure-btn');
        this.saveBtn = document.querySelector('.save-btn');
        this.measurementDisplay = document.querySelector('.measurement-display');
        this.forceChartCanvas = document.getElementById('forceChart');

        this.measurementData = []; // For 1-dome: [{x,y},...]. For 3-dome: [[{x,y1},...], [{x,y2},...], [{x,y3},...]]
        this.isMeasuring = false;
        this.measurementStartTime = 0;
        // For summary display, these will refer to the first sensor in 3-dome mode
        this.maxForceDisplay = 0;
        this.forceSumDisplay = 0;
        this.dataCountDisplay = 0; // Count for the first sensor for avg calculation

        this.measurementInterval = null; // To update duration display
        this.chartInstance = null; // For Chart.js

        this._bindMethods();
        this._attachEventListeners();
        this._initializeUI();
    }

    _bindMethods() {
        this.handleMeasureClick = this.handleMeasureClick.bind(this);
        this.handleSaveClick = this.handleSaveClick.bind(this);
        this.handleForceUpdate = this.handleForceUpdate.bind(this);
        this.handleModeChange = this.handleModeChange.bind(this);
    }

    _attachEventListeners() {
        if (this.measureBtn) {
            this.measureBtn.addEventListener('click', this.handleMeasureClick);
        }
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', this.handleSaveClick);
        }
        document.addEventListener(EVT_FORCE_UPDATE, this.handleForceUpdate);
        document.addEventListener(EVT_MODE_CHANGED, this.handleModeChange);
    }

    _initializeUI() {
        if (this.saveBtn) this.saveBtn.disabled = true;
        this.updateMeasurementDisplayMetrics();
        this.updateMeasurementDuration();
    }

    handleForceUpdate(event) {
        if (!this.isMeasuring) return;
        const { forces } = event.detail; // Expect arrays now
        this.recordMeasurement(forces);
    }
    
    handleModeChange() {
        // If chart exists when device type changes, re-initialize it to reflect new number of datasets
        if (this.chartInstance && this.inputManager && this.inputManager.currentDeviceType) {
            // If measurement is active, it might be better to stop it, or clear data,
            // but for now, just ensure the chart display adapts.
            console.log("MeasurementManager: Device type changed, re-initializing chart.");
            this.initializeChart();
        }
    }

    recordMeasurement(forcesArray) {
        if (!this.isMeasuring || !Array.isArray(forcesArray)) return;

        const timestamp = Date.now() - this.measurementStartTime;
        const deviceType = this.inputManager ? this.inputManager.currentDeviceType : '1-dome';

        if (deviceType === '1-dome') {
            const force = (typeof forcesArray[0] === 'number' && !isNaN(forcesArray[0])) ? forcesArray[0] : 0;
            if (!Array.isArray(this.measurementData[0])) this.measurementData = [[]]; // Ensure structure
            this.measurementData[0].push({ x: timestamp, y: force });

            this.maxForceDisplay = Math.max(this.maxForceDisplay, force);
            this.forceSumDisplay += force;
            this.dataCountDisplay++;

            if (this.chartInstance && this.chartInstance.data.datasets[0]) {
                const timeLabel = (timestamp / 1000).toFixed(1);
                this.chartInstance.data.labels.push(timeLabel + 's');
                this.chartInstance.data.datasets[0].data.push(force);
            }
        } else { // 3-dome
            if (this.measurementData.length !== 3 || !this.measurementData.every(Array.isArray)) {
                this.measurementData = [[], [], []];
            }

            const timeLabel = (timestamp / 1000).toFixed(1);
            let commonLabelAdded = false;

            for (let i = 0; i < forcesArray.length && i < 3; i++) {
                const force = (typeof forcesArray[i] === 'number' && !isNaN(forcesArray[i])) ? forcesArray[i] : 0;
                this.measurementData[i].push({ x: timestamp, y: force });

                if (i === 0) {
                    this.maxForceDisplay = Math.max(this.maxForceDisplay, force);
                    this.forceSumDisplay += force;
                    this.dataCountDisplay++;
                }

                if (this.chartInstance && this.chartInstance.data.datasets[i]) {
                    if (!commonLabelAdded && this.chartInstance.data.labels.length < this.chartInstance.data.datasets[i].data.length + 1) {
                        this.chartInstance.data.labels.push(timeLabel + 's');
                        commonLabelAdded = true;
                    }
                    this.chartInstance.data.datasets[i].data.push(force);
                }
            }
        }

        if (this.chartInstance) {
            const MAX_CHART_POINTS = 200;
            let labelShiftCount = 0;
            while (this.chartInstance.data.labels.length > MAX_CHART_POINTS) {
                this.chartInstance.data.labels.shift();
                labelShiftCount++;
            }
            if (labelShiftCount > 0) {
                this.chartInstance.data.datasets.forEach(dataset => {
                    dataset.data.splice(0, labelShiftCount);
                });
            }
            this.chartInstance.update('none');
        }
    }

    updateMeasurementDisplayMetrics() {
        const avgForce = this.dataCountDisplay > 0 ? this.forceSumDisplay / this.dataCountDisplay : 0;
        const maxForceEl = this.measurementDisplay?.querySelector('.metric:nth-child(1) .metric-value');
        const avgForceEl = this.measurementDisplay?.querySelector('.metric:nth-child(2) .metric-value');

        if (maxForceEl) maxForceEl.textContent = `${(this.maxForceDisplay * 10).toFixed(1)} N`;
        if (avgForceEl) avgForceEl.textContent = `${(avgForce * 10).toFixed(1)} N`;
    }

    updateMeasurementDuration() {
        if (!this.isMeasuring && this.measurementData.length === 0) return;
        let duration = 0;
        if (this.isMeasuring) {
            duration = Date.now() - this.measurementStartTime;
        } else {
            const firstSensorData = Array.isArray(this.measurementData[0]) ? this.measurementData[0] : (Array.isArray(this.measurementData) ? this.measurementData : []);
            if (firstSensorData.length > 0) {
                duration = firstSensorData[firstSensorData.length - 1].x;
            }
        }
        const durationEl = this.measurementDisplay?.querySelector('.metric:nth-child(3) .metric-value');
        if (durationEl) durationEl.textContent = this.formatDuration(duration);
    }

    formatDuration(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    initializeChart() {
        if (!this.forceChartCanvas) return;
        if (this.chartInstance) this.chartInstance.destroy();
        
        const ctx = this.forceChartCanvas.getContext('2d');
        const deviceType = this.inputManager ? this.inputManager.currentDeviceType : '1-dome';
        
        let datasets = [];
        if (deviceType === '1-dome') {
            datasets.push({
                label: 'Normalized Force (0-1)',
                data: [],
                borderColor: CHART_COLORS_MEASUREMENT[0],
                backgroundColor: CHART_COLORS_MEASUREMENT[0].replace(')', ', 0.1)').replace('rgb', 'rgba'),
                borderWidth: 1.5,
                pointRadius: 0,
                fill: true,
                tension: 0.1
            });
        } else { // 3-dome
            for (let i = 0; i < 3; i++) {
                datasets.push({
                    label: `Force ${i + 1} (0-1)`,
                    data: [],
                    borderColor: CHART_COLORS_MEASUREMENT[i % CHART_COLORS_MEASUREMENT.length],
                    backgroundColor: CHART_COLORS_MEASUREMENT[i % CHART_COLORS_MEASUREMENT.length].replace(')', ', 0.1)').replace('rgb', 'rgba'),
                    borderWidth: 1.5,
                    pointRadius: 0,
                    fill: i === 0,
                    tension: 0.1,
                    hidden: false
                });
            }
        }

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: datasets
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 1.0,
                        title: { display: true, text: 'Normalized Force' }
                    },
                    x: {
                        type: 'category',
                        title: { display: true, text: 'Time (s)' }
                    }
                },
                animation: false,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: deviceType === '3-dome',
                        position: 'top',
                    }
                }
            }
        });
         // After initializing, if there's existing data (e.g., from a previous session before device type change), re-populate.
        // This is a simple way; a more robust way might involve transforming existing data if # of sensors changes.
        if (this.measurementData.length > 0 && this.chartInstance) {
            const dataToReplot = deviceType === '1-dome' ? (this.measurementData[0] || []) : this.measurementData;
            
            this.chartInstance.data.labels = [];
            this.chartInstance.data.datasets.forEach((dataset, index) => {
                dataset.data = [];
                const sensorData = deviceType === '1-dome' ? dataToReplot : (dataToReplot[index] || []);
                sensorData.forEach(point => {
                    if (index === 0) { // Add labels only once
                         this.chartInstance.data.labels.push((point.x / 1000).toFixed(1) + 's');
                    }
                    dataset.data.push(point.y);
                });
            });
            this.chartInstance.update('none');
        }
    }

    handleMeasureClick() {
        if (!this.isMeasuring) {
            this.isMeasuring = true;
            if(this.measureBtn) {
                this.measureBtn.textContent = 'Stop Measurement';
                this.measureBtn.classList.add('recording');
            }
            if(this.saveBtn) this.saveBtn.disabled = true;

            const deviceType = this.inputManager ? this.inputManager.currentDeviceType : '1-dome';
            if (deviceType === '1-dome') {
                this.measurementData = [[]];
            } else {
                this.measurementData = [[], [], []];
            }
            this.maxForceDisplay = 0;
            this.forceSumDisplay = 0;
            this.dataCountDisplay = 0;
            this.measurementStartTime = Date.now();

            this.initializeChart();
            this.updateMeasurementDisplayMetrics();
            this.updateMeasurementDuration();

            if (this.measurementInterval) clearInterval(this.measurementInterval);
            this.measurementInterval = setInterval(() => {
                this.updateMeasurementDuration();
                this.updateMeasurementDisplayMetrics();
            }, 200);

        } else {
            this.isMeasuring = false;
            if(this.measureBtn) {
                this.measureBtn.textContent = 'Start Measurement';
                this.measureBtn.classList.remove('recording');
            }
            
            const hasData = this.measurementData.some(dataset => Array.isArray(dataset) && dataset.length > 0);
            if(this.saveBtn) this.saveBtn.disabled = !hasData;

            clearInterval(this.measurementInterval);
            this.measurementInterval = null;
            this.updateMeasurementDisplayMetrics();
            this.updateMeasurementDuration();
        }
    }

    handleSaveClick() {
        const deviceType = this.inputManager ? this.inputManager.currentDeviceType : '1-dome';
        let dataToSave;
        let hasData = false;

        if (deviceType === '1-dome') {
            dataToSave = this.measurementData[0] || [];
            hasData = dataToSave.length > 0;
        } else {
            dataToSave = this.measurementData;
            hasData = dataToSave.some(ds => Array.isArray(ds) && ds.length > 0);
        }

        if (!hasData) {
            alert("No measurement data to save.");
            return;
        }

        const finalDurationMs = this.isMeasuring ? (Date.now() - this.measurementStartTime) :
                              ((deviceType === '1-dome' && dataToSave.length > 0) ? dataToSave[dataToSave.length - 1].x :
                               (((deviceType === '3-dome' && dataToSave[0] && dataToSave[0].length > 0)) ? dataToSave[0][dataToSave[0].length - 1].x : 0)
                              );

        const finalAvgDisplay = this.dataCountDisplay > 0 ? this.forceSumDisplay / this.dataCountDisplay : 0;

        console.log("--- Measurement Results ---");
        console.log(`Device Type: ${deviceType}`);
        console.log(`Duration: ${this.formatDuration(finalDurationMs)}`);
        console.log(`Max Force (Sensor 1 / Overall for 1-dome): ${(this.maxForceDisplay * 10).toFixed(1)} N`);
        console.log(`Average Force (Sensor 1 / Overall for 1-dome): ${(finalAvgDisplay * 10).toFixed(1)} N`);
        console.log("Raw Data Points (Normalized 0-1):");
        if (deviceType === '1-dome') {
            console.log("Sensor 1:", dataToSave);
        } else {
            for (let i = 0; i < dataToSave.length; i++) {
                console.log(`Sensor ${i + 1}:`, dataToSave[i]);
            }
        }
        console.log("---------------------------");
        alert("Measurement data saved (logged to console).");
        if(this.saveBtn) this.saveBtn.disabled = true;
    }

    dispose() {
        if (this.measureBtn) this.measureBtn.removeEventListener('click', this.handleMeasureClick);
        if (this.saveBtn) this.saveBtn.removeEventListener('click', this.handleSaveClick);
        document.removeEventListener(EVT_FORCE_UPDATE, this.handleForceUpdate);
        document.removeEventListener(EVT_MODE_CHANGED, this.handleModeChange);
        if (this.measurementInterval) clearInterval(this.measurementInterval);
        if (this.chartInstance) this.chartInstance.destroy();
        console.log("MeasurementManager disposed.");
    }
} 