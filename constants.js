// Shared Event Names

const EVT_FORCE_UPDATE = 'forceupdate';
const EVT_MODE_CHANGED = 'modechanged';
const EVT_SIM_CONTROL = 'sim-control'; // For simulator-specific commands
const EVT_STATUS_MESSAGE = 'statusmessage'; // For general status updates (e.g., connection success/failure)
const EVT_LOG_MESSAGE = 'logmessage'; // For messages to be displayed in the debug log
const EVT_PRESSURE_RANGES_CHANGED = 'pressurerangeschanged'; // When pressure ranges are updated
const EVT_BASE_PRESSURES_CHANGED = 'basepressureschanged'; // When base pressures are updated

const DEFAULT_BASE_PRESSURE = 101300; // Pa
const DEFAULT_PRESSURE_RANGE = 5000; // Pa

// Potentially add other constants here as the project grows,
// for example, game state events if needed beyond simple flags. 

// Game Specific Events (if any, can be added here or in their respective modules) 