# Hardware Interface Documentation

## Overview

The rehabilitation device connects to the web interface through an Arduino that reads pressure sensors and sends data via serial communication. The system supports two main configurations: 1-Dome (single sensor) and 3-Dome (three sensors).

## Hardware Requirements

### Arduino Setup
- **Board**: Arduino Uno, Nano, or compatible
- **Baud Rate**: 9600 (fixed in the web interface, maybe changed in the future)
- **Connection**: USB cable to computer or Bluetooth

### Pressure Sensors
- **Type**: Analog pressure sensors
- **Calibration**: Each sensor needs individual calibration

### Browser Requirements
- **Chrome** or **Edge** (Web Serial API support)
- **HTTPS** required for production deployment
- **Permissions**: User must grant serial port access



## Communication Protocol

### Data Formats

#### 1-Dome Arduino Output
Currently sends single float values per line:
```
150.5
142.8
155.2
```

**TODO**: Change to JSON format for consistency:
```json
{"timestamp": 1234567890, "pressure": [150.5]}
```

#### 3-Dome Arduino Output
Sends JSON strings per line:
```json
{"timestamp": 1234567890, "pressure": [120.3, 95.7, 200.1]}
```

Where:
- `timestamp`: Arduino timestamp
- `pressure`: Array of raw pressure values in Pascals (or sensor units)

### Message Timing
- Don't send faster than the web interface can process
- Include timestamp to help with synchronization

## Arduino Code Example(**Not real code, just for reference**)

### Basic 1-Dome Setup
```cpp
void setup() {
  Serial.begin(9600);
}

void loop() {
  float pressure = analogRead(A0); // Convert to pressure units
  Serial.println(pressure);
  delay(20); // ~50Hz update rate
}
```

### 3-Dome Setup
```cpp
void setup() {
  Serial.begin(9600);
}

void loop() {
  float p1 = analogRead(A0);
  float p2 = analogRead(A1);
  float p3 = analogRead(A2);
  
  unsigned long timestamp = millis();
  
  Serial.print("{\"timestamp\":");
  Serial.print(timestamp);
  Serial.print(",\"pressure\":[");
  Serial.print(p1); Serial.print(",");
  Serial.print(p2); Serial.print(",");
  Serial.print(p3);
  Serial.println("]}");
  
  delay(20);
}
```


## Calibration

### Zero Point Calibration
Set baseline pressure when no force is applied:
1. Make sure no pressure on sensors
2. Click "Calibrate Zero Pressure" in Settings
3. Records current readings as baseline
4. All future readings subtract this baseline

### Range Calibration  
1. Enter this value in "Pressure Range" field
2. Forces will be normalized: `(current - baseline) / range`

**TODO**: can be changed to min-max calibration

### Per-Sensor Calibration
Each sensor can have different:
- Base pressure (zero point)
- Pressure range
- This accounts for sensor variations and mounting differences

## Troubleshooting


**Problem**: Can't see Arduino port in browser
**Solutions**:
- Check USB cable/Bluetooth connection
- Verify Arduino drivers installed
- Make sure no other software (Arduino IDE, etc.) is using the port
- Try different USB port
- Restart browser


**Problem**: Weird pressure readings
**Solutions**:
- Re-run zero calibration
- Check sensor wiring (loose connections)
- Verify sensor power supply
- Look for temperature effects on sensors
- Check for electrical noise

**Problem**: No force response in games
**Solutions**:
- Verify device type selected (1-dome vs 3-dome)
- Check that you're in Arduino mode (not simulation)
- Look at "Live Sensor Readings" in Settings tab
- Re-calibrate pressure ranges

**Problem**: Pressure values jumping around
**Solutions**:
- Add filtering in Arduino code
- Check for loose sensor connections


**Problem**: Web Serial API not working
**Solutions**:
- Use Chrome or Edge browser
- Check browser version
- Clear browser cache and permissions

## Hardware Debugging(Using Arduino Serial Monitor)

1. Disconnect from web interface
2. Open Arduino IDE Serial Monitor
3. Set baud rate to 9600(same as in the web interface)
4. Watch raw data output
5. Verify format and timing

