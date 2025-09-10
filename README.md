# Morse Code Communicator

A Progressive Web App that enables wireless communication using Morse code transmission via camera flash and reception through light detection.

## Features

### TRANSMIT Mode
- Input messages up to 100 characters
- Real-time Morse code preview
- Camera flash transmission with proper dot/dash timing
- Visual feedback during transmission
- Input validation for supported characters

### RECEIVE Mode
- Camera-based light detection
- Automatic brightness threshold calibration
- Real-time Morse code capture and decoding
- Live display of received signals and decoded messages

### Progressive Web App
- Installable on mobile devices
- Offline functionality via service worker
- Responsive design optimized for phones
- Cross-platform compatibility

## Files

- **`index.html`** - Main HTML structure with TRANSMIT/RECEIVE interface
- **`app.js`** - Core application logic, camera controls, and mode switching
- **`morse.js`** - Morse code encoder/decoder and light detection utilities
- **`styles.css`** - Responsive styling and visual design
- **`manifest.json`** - PWA configuration for installation
- **`sw.js`** - Service worker for offline functionality

## Usage

1. Open the app in a web browser (preferably on mobile)
2. Grant camera permissions when prompted
3. Choose TRANSMIT or RECEIVE mode:

### To Send a Message (TRANSMIT)
1. Enter your message (letters, numbers, basic punctuation)
2. Review the Morse code preview
3. Tap "Start Transmission"
4. Point your camera flash toward the receiver

### To Receive a Message (RECEIVE)
1. Tap "Start Receiving" 
2. Point camera at the sender's flashing light
3. Watch as Morse code is detected and decoded
4. Read the decoded message on screen

## Technical Details

### Morse Code Support
- All letters A-Z
- Numbers 0-9
- Common punctuation: . , ? ' ! / ( ) & : ; = + - _ " $ @
- Proper timing: dots (200ms), dashes (600ms), spacing

### Light Detection
- Adaptive brightness threshold
- Real-time signal analysis
- Automatic calibration for different lighting conditions
- Noise filtering and signal validation

## Requirements

- Modern web browser with camera access
- Mobile device with camera flash (for transmission)
- HTTPS or localhost (required for camera API access)

## Installation

1. Visit the app URL in your mobile browser
2. Tap "Add to Home Screen" when prompted
3. The app will install as a native-like application

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox 
- Safari (iOS 11.3+)
- Requires camera API support