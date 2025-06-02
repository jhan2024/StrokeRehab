# Simulation Mode Documentation

## Overview

The app has a built-in simulation mode that lets you test everything without needing the actual hardware connected. Pretty handy for development and testing stuff without having to deal with Arduino connections all the time.

## How Simulation Works

### Device Types
The simulator supports both device configurations:
- **1-Dome**: Single force input controlled by Spacebar
- **3-Dome**: Three force inputs controlled by A, S, D keys

### Simulation vs Arduino Mode
When you're in simulation mode, the app uses a `SimulatedSerialPort` class that mimics the real serial connection. It's basically a fake Arduino that responds to keyboard inputs instead of actual pressure sensors.

### Controls
- **1-Dome Simulation**: Hold down Spacebar to generate force input
- **3-Dome Simulation**: 
  - A key = Sensor 1 (left)
  - S key = Sensor 2 (middle) 
  - D key = Sensor 3 (right)

## Data Format

The simulator outputs data in the same format the real hardware would:

### 1-Dome Output
```json
{"normalizedForces": [0.8], "rawPressures": [150.5]}
```

### 3-Dome Output  
```json
{"timestamp": 1234567890, "pressure": [120.3, 95.7, 200.1]}
```

## Using Simulation Mode

1. Open the app (starts in simulation by default)
2. Go to Settings tab
3. Select your device type (1-Dome or 3-Dome)
4. Make sure it says "Using Simulation"
5. Test inputs with keyboard:
   - Spacebar for 1-dome
   - A/S/D for 3-dome
6. Watch the force bars update in real-time

## Calibration in Simulation

The simulator respects calibration settings just like real hardware:
- Base pressures (zero point)
- Pressure ranges (max values)
- You can set these in the Settings tab

## Game Testing

All games work the same in simulation mode:
- Flappy Bird responds to Spacebar (1-dome) or A key (3-dome)
- Rhythm Keys uses A/S/D in 3-dome mode
- Space Shooter uses first input (Spacebar or A)
- Pool Game uses A/D for aiming, S for power

## Switching Modes

To switch between simulation and Arduino:
1. Go to Settings tab
2. Click the toggle button ("Use Simulation" / "Using Simulation")
3. For Arduino mode, you'll need Chrome/Edge browser
4. Connect your device using "Connect to Arduino" button

## Technical Details

The simulation is handled by:
- `SimulatedSerialPort` class in `serial-simulator.js`
- Listens for keyboard events and `sim-control` events
- Generates realistic pressure data based on key states
- Integrates with the same event system as real hardware

## Troubleshooting

**Keys not working?**
- Make sure the browser window has focus
- Check you're in simulation mode (Settings tab)
- Verify correct device type is selected

**Force bars not updating?**
- Check browser console for errors
- Verify you're pressing the right keys (Spacebar for 1-dome, A/S/D for 3-dome)

**Games not responding?**
- Make sure a game is actually loaded/started
- Check that simulation mode is active
- Some games might need the right device type selected

The simulation mode is pretty solid for development and testing. It saves you from having to plug in hardware every time you want to test changes.
