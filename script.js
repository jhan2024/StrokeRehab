document.addEventListener('DOMContentLoaded', function() {
    


    // Tab Switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Function to switch tabs
    function switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none'; // Hide all tab content
        });
        document.querySelectorAll('.tab-btn').forEach(button => {
            button.classList.remove('active'); // Deactivate all tab buttons
        });

        // Determine the correct content ID, special handling for 'settings'
        const tabElementId = tabId === 'settings' ? 'settingsContent' : tabId;

        const contentToShow = document.getElementById(tabElementId);
        if (contentToShow) {
            contentToShow.style.display = 'block'; // Show the selected tab content
        } else {
            console.warn(`Tab content not found for ID: ${tabElementId}`);
        }
        
        const buttonToActivate = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        if (buttonToActivate) {
            buttonToActivate.classList.add('active'); // Activate the selected tab button
        }

        // Special handling for games tab
        if (tabId === 'exercises') {
            console.log("Switched to Exercises Tab");
            // Add any logic needed when exercises tab is activated
        }
        console.log(`Switched to tab: ${tabId}`);
    }

    // Attach listeners to tab buttons
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            switchTab(button.getAttribute('data-tab'));
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
    
    // --- Initialize Input Manager --- (Instantiation remains here)
    const inputManager = new InputModeManager();
    window.inputManager = inputManager; // Keep global ref if needed

    // ---> Global variable for game access (now an array) <---
    window.latestNormalizedForces = [0]; 

    // --- UI Element References (Cached for script.js specific needs) ---
    const sidePanelConnectBtn = document.getElementById('side-panel-connect-btn');
    const sidePanelStatusIndicator = document.querySelector('.side-panel .status-indicator');
    const statusMessageContainer = document.body; // Or a dedicated container
    
    // Force Bar UI elements (Side Panel - these are specific to script.js control)
    const forceLevelsContainer = document.getElementById('force-levels-container');
    const forceBarWrappers = [
        document.getElementById('force-bar-wrapper-0'),
        document.getElementById('force-bar-wrapper-1'),
        document.getElementById('force-bar-wrapper-2')
    ];
    const forceLevels = forceBarWrappers.map(fw => fw ? fw.querySelector('.force-level') : null);
    const forceLabels = forceBarWrappers.map(fw => fw ? fw.querySelector('.force-label') : null);
    
    // Instantiate MeasurementManager after InputModeManager
    const measurementManager = new MeasurementManager(inputManager);
    window.measurementManager = measurementManager; // Optional: make it global for debugging

    // Instantiate SettingsManager after InputModeManager
    const settingsManager = new SettingsManager(inputManager);
    window.settingsManager = settingsManager; // Optional: make it global for debugging

    // --- Event Listeners (Only those NOT handled by specific managers) ---

    // Status Message Display (Global, not tied to a specific manager's UI elements)
    document.addEventListener(EVT_STATUS_MESSAGE, (event) => {
        const { message, type } = event.detail;
        const msgElement = document.createElement('div');
        msgElement.className = `status-message ${type}`;
        msgElement.textContent = message;
        statusMessageContainer.appendChild(msgElement);
        setTimeout(() => msgElement.remove(), 3000);
    });

    // EVT_FORCE_UPDATE: script.js handles side panel force bars.
    // SettingsManager handles live sensor readings in Settings Tab.
    // MeasurementManager handles data recording if active.
    document.addEventListener(EVT_FORCE_UPDATE, (event) => {
        const { forces, rawPressures, deviceType } = event.detail; 
        
        window.latestNormalizedForces = forces; // Update global forces array for any game/component that might still use it directly
        
        // Update Side Panel Visualization (remains in script.js as it's not part of Settings or Measurement Tab)
        updateSidePanelVisuals(forces, deviceType, window.inputManager ? window.inputManager.currentMode : 'arduino');
    });

    // EVT_MODE_CHANGED: script.js handles side panel UI updates.
    // SettingsManager handles Settings Tab UI updates.
    // MeasurementManager might handle chart re-initialization if device type changes.
    document.addEventListener(EVT_MODE_CHANGED, (event) => {
        const { mode, deviceType, isConnected } = event.detail;
        console.log(`UI Listener (script.js for Side Panel): Mode changed to ${mode}, Device: ${deviceType}, Connected: ${isConnected}`);
        
        // Update Side Panel visuals based on device type change (remains in script.js)
        updateSidePanelVisuals(window.latestNormalizedForces || (deviceType === '1-dome' ? [0] : [0,0,0]), deviceType, mode);

        // Update Side Panel Status Indicator and Connect Button (remains in script.js)
        if (sidePanelStatusIndicator) { 
            sidePanelStatusIndicator.textContent = mode === 'simulation' ? 'Simulated' : (isConnected ? 'Connected' : 'Disconnected');
            sidePanelStatusIndicator.className = `status-indicator ${mode === 'simulation' ? 'simulation' : (isConnected ? 'connected' : 'disconnected')}`;
        }
        if (sidePanelConnectBtn) { 
            sidePanelConnectBtn.textContent = isConnected ? 'Disconnect' : (mode === 'simulation' ? 'Simulating' : 'Connect');
            // Disable connect button if in sim mode AND not already somehow connected (edge case)
            // More simply: hide if sim active, show if arduino active
            sidePanelConnectBtn.style.display = mode === 'simulation' ? 'none' : 'block'; 
            // The disabled state for sidePanelConnectBtn might need refinement if it should allow disconnect from a simulated connection shown in side panel
            // For now, if it's visible (arduino mode), its enabled state will depend on isConnected.
            // If it's hidden (sim mode), disabled state doesn't matter as much.
            sidePanelConnectBtn.disabled = (mode === 'arduino' && isConnected) ? false : (mode === 'arduino' && !isConnected ? false : true);
            if (mode === 'arduino') {
                 sidePanelConnectBtn.disabled = false; // Always enable for user to click connect/disconnect
            } else {
                sidePanelConnectBtn.disabled = true; // Disable and hide in sim mode
            }
            // Listener for the side panel connect button (distinct from settings tab connect button)
            sidePanelConnectBtn.addEventListener('click', () => {
                console.log('[Side Panel Button] Clicked.');
                console.log(`[Side Panel Button] состояние InputManager: mode='${window.inputManager?.currentMode}', isConnected=${window.inputManager?.isConnected}`);
                if (window.inputManager && window.inputManager.currentMode === 'arduino') {
                    if (window.inputManager.isConnected) {
                        console.log('[Side Panel Button] Попытка отключить Arduino...');
                        window.inputManager.disconnectDevice();
                    } else {
                        console.log('[Side Panel Button] Попытка подключить Arduino...');
                        window.inputManager.connectDevice('arduino');
                    }
                } else {
                    console.warn(`[Side Panel Button] Кнопка нажата, но не в режиме Arduino или inputManager недоступен. Режим: ${window.inputManager?.currentMode}`);
                }
            });
        }
        
        console.log("Global UI (Side Panel) Updated for mode/device/connection change.");
    });
    
    // --- Side Panel Visualization ---

    function updateSidePanelVisuals(forces, deviceType, currentInputMode) {
        if (!Array.isArray(forces)) return;

        for (let i = 0; i < forceBarWrappers.length; i++) {
            const wrapper = forceBarWrappers[i];
            const level = forceLevels[i];
            const label = forceLabels[i];

            if (!wrapper || !level || !label) continue;

            if (deviceType === '1-dome') {
                if (i === 0) {
                    wrapper.style.display = ''; // Show first bar
                    const forceToDraw = typeof forces[0] === 'number' && !isNaN(forces[0]) ? forces[0] : 0;
                    level.style.height = `${forceToDraw * 100}%`;
                    label.textContent = 'Force'; // Base label
                    if (currentInputMode === 'simulation') {
                        label.innerHTML = 'Force <span class="spacebar-hint">(SPACEBAR)</span>';
                    }
                } else {
                    wrapper.style.display = 'none'; // Hide other bars
                }
            } else { // 3-dome
                if (i < forces.length) {
                    wrapper.style.display = ''; // Show bars for available forces
                    const forceToDraw = typeof forces[i] === 'number' && !isNaN(forces[i]) ? forces[i] : 0;
                    level.style.height = `${forceToDraw * 100}%`;
                    label.textContent = `Force ${i + 1}`;
                    // Add A, S, D hints for 3-dome simulation mode
                    if (currentInputMode === 'simulation') {
                        const keys = ['A', 'S', 'D'];
                        if (keys[i]) {
                            label.innerHTML = `Force ${i + 1} <span class="key-hint">(${keys[i]})</span>`;
                        }
                    }
                } else { // If forces array is shorter than expected for 3-dome (e.g. only 1 or 2 forces sent)
                    wrapper.style.display = 'none';
                }
            }
        }
    }

    // Initial call to set up side panel correctly based on default inputManager state
    if (window.inputManager) {
        updateSidePanelVisuals(
            window.latestNormalizedForces, 
            window.inputManager.currentDeviceType,
            window.inputManager.currentMode
        );
        // Also update side panel connect button state
        const { mode, deviceType, isConnected } = window.inputManager;
        if (sidePanelStatusIndicator) { 
            sidePanelStatusIndicator.textContent = mode === 'simulation' ? 'Simulated' : (isConnected ? 'Connected' : 'Disconnected');
            sidePanelStatusIndicator.className = `status-indicator ${mode === 'simulation' ? 'simulation' : (isConnected ? 'connected' : 'disconnected')}`;
        }
        if (sidePanelConnectBtn) { 
            sidePanelConnectBtn.textContent = isConnected ? 'Disconnect' : (mode === 'simulation' ? 'Simulating' : 'Connect');
            sidePanelConnectBtn.style.display = mode === 'simulation' ? 'none' : 'block'; 
            if (mode === 'arduino') {
                 sidePanelConnectBtn.disabled = false; 
            } else {
                sidePanelConnectBtn.disabled = true; 
            }
             // Listener for the side panel connect button (distinct from settings tab connect button)
            sidePanelConnectBtn.addEventListener('click', () => {
                console.log('[Side Panel Button] Clicked.');
                console.log(`[Side Panel Button] состояние InputManager: mode='${window.inputManager?.currentMode}', isConnected=${window.inputManager?.isConnected}`);
                if (window.inputManager && window.inputManager.currentMode === 'arduino') {
                    if (window.inputManager.isConnected) {
                        console.log('[Side Panel Button] Попытка отключить Arduino...');
                        window.inputManager.disconnectDevice();
                    } else {
                        console.log('[Side Panel Button] Попытка подключить Arduino...');
                        window.inputManager.connectDevice('arduino');
                    }
                } else {
                    console.warn(`[Side Panel Button] Кнопка нажата, но не в режиме Arduino или inputManager недоступен. Режим: ${window.inputManager?.currentMode}`);
                }
            });
        }
    }

});