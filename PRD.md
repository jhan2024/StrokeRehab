# Product Requirement Document: Hand Rehabilitation Device User Interface

## 1. Overview

The user interface will serve as the digital component of a soft robotics-based hand rehabilitation device designed for stroke patients with decreased hand-arm dexterity. The system will feature dual interfaces - one for patients and one for therapists - to facilitate engaging rehabilitation exercises and track progress.

## 2. Target Users

- **Primary Users:** Stroke patients undergoing hand rehabilitation
- **Secondary Users:** Physiotherapists and rehabilitation specialists 

## 3. Core Functionality Requirements

### 3.1 Patient Interface

- **Gamified Exercises**
  - Implement simple, intuitive game controls that respond to varying pressure levels
  - Provide clear visual feedback of detected touch points on the membrane
  - Include customizable difficulty settings to accommodate different rehabilitation stages
  - Design visually appealing graphics that maintain engagement without overwhelming patients
  - Support games like Flappy Bird (1D input), Golf/Snooker (directional + force input), Subway Surf (directional control with jumps), or Piano Keys (multiple touch points)

- **Real-time Feedback**
  - Display visual representation of applied force with a force bar that accurately reflects current pressure
  - Reset force visualization when pressure is released to provide clear tactile-visual correlation
  - Provide immediate visual/audio feedback on successful completion of exercises
  - Show progress indicators during exercise sessions
  - Visualize touch points as temporary indicators that appear only when pressure is applied

- **Accessibility Features**
  - Implement high-contrast display options for users with visual impairments
  - Support customizable control sensitivity to accommodate different strength levels
  - Include clear, simple instructions with minimal text
  - Allow for one-handed navigation of the interface
  - Option to hide/show the hardware control panel as needed

### 3.2 Therapist Interface

- **Patient Management**
  - Ability to create and manage patient profiles
  - Interface to customize rehabilitation programs for individual patients
  - Option to set specific exercise parameters (sensitivity, duration, difficulty)

- **Progress Monitoring**
  - Dashboard showing patient's exercise history and progress
  - Data visualization of force measurements and touch points
  - Ability to compare current performance with historical data
  - Support for exporting data for further analysis
  - Real-time force measurement visualization with time-series graph

- **Assessment Tools**
  - Record and playback of patient sessions
  - Metrics for evaluation (force consistency, touch accuracy, session duration)
  - Progress reports generation
  - Direct measurement functionality separate from games for clinical assessment

## 4. Technical Requirements

### 4.1 Device Integration

- **Hardware Communication**
  - Primary communication method: Web Serial API for direct Arduino connection
  - Secondary method: Simulation mode for development and testing
  - Support for seamless switching between hardware and simulation modes
  - Browser compatibility for Chrome, Edge, and Opera (v89+)
  - Fallback to simulation mode for unsupported browsers

- **Force Data Processing**
  - Real-time processing of pressure data
  - Normalization of raw sensor values (air pressure, unit: Pa, typical: 10kPa) to usable range (0-1)
  - Configurable force thresholds for game control activation
  - Low-latency response from input to visual feedback

- **Sensor Integration**
  - Support for analog force sensors via Arduino platform
  - Future expansion capability for multi-touch detection
  - Support for detecting multiple touch points simultaneously (if technically feasible)
  - 3D visualization of the ellipsoidal device to accurately represent hardware

- **Arduino Communication Protocol**
  - Serial communication at 9600 baud rate
  - Simple text-based protocol with one value per line
  - Error detection and recovery mechanisms
  - Auto-reconnection capabilities
  - Port selection interface for multiple devices

### 4.2 Data Management

- Secure storage of patient data
- Efficient retrieval of historical performance data
- Backup and export functionality
- Session recording with time-stamped pressure data

### 4.3 System Requirements

- Desktop-first application compatible with standard desktop/laptop computers
- Chrome or Edge browser for full functionality
- Dual-panel interface with responsive layout
- Potential for future mobile device compatibility
- Low resource requirements to ensure smooth operation

## 5. User Experience Requirements

- **Interface Design**
  - Clean, intuitive layout with minimal cognitive load
  - Two-panel design with hardware control panel and main functionality panel
  - Consistent visual language throughout the application
  - Appropriate color schemes for therapeutic context
  - Clear information hierarchy
  - 3D visualization of the device with realistic representation

- **Interaction Design**
  - Simple navigation requiring minimal input
  - Clear action buttons and feedback mechanisms
  - Tab-based navigation between exercises and measurement functionality
  - Session timers and progress indicators
  - Celebratory feedback for achievements
  - Visual representation of touch points that correspond with actual device interaction

## 6. Implementation Priorities

1. **Phase 1 (MVP)**
   - Single touch point detection interface
   - Basic game implementation (e.g., Flappy Bird variant)
   - Simple therapist dashboard for data viewing
   - Hardware control panel with device visualization
   - Basic measurement functionality
   - Arduino integration with simulation fallback

2. **Phase 2**
   - Multiple touch point detection (if technically feasible)
   - Additional game options (Golf, Subway Surf, Piano Keys)
   - Enhanced data visualization and progress tracking
   - Improved 3D visualization of device
   - Multi-browser support strategy

3. **Phase 3**
   - Advanced customization options for therapists
   - Integration with electronic health records (potential)
   - Additional accessibility features
   - Comprehensive therapist interface with patient management

## 7. Success Metrics

- Patients report minimal discomfort during 10-minute rehabilitation sessions
- System can accurately detect touch locations with acceptable margin of error
- Game response is proportional to applied force with minimal latency
- Force visualization resets appropriately when pressure is released
- Therapists can effectively track patient progress through the interface
- Patient engagement metrics show consistent usage over time
- Touch point visualization accurately represents the physical interaction with the device
- Arduino communication maintains stable connection for full rehabilitation sessions 