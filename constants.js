// Shared Event Names

const EVT_FORCE_UPDATE = 'forceupdate';
const EVT_MODE_CHANGED = 'modechanged';
const EVT_SIM_CONTROL = 'sim-control'; // For simulator-specific commands
const EVT_STATUS_MESSAGE = 'statusmessage'; // For user-facing status popups
const EVT_LOG_MESSAGE = 'logmessage'; // For adding messages to the debug log
const EVT_PRESSURE_RANGES_CHANGED = 'pressurerangeschanged'; // For InputModeManager to notify UI of pressure range updates

const DEFAULT_BASE_PRESSURE = 101300; // Pa
const DEFAULT_PRESSURE_RANGE = 5000; // Pa

// Potentially add other constants here as the project grows,
// for example, game state events if needed beyond simple flags. 