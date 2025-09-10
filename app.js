// Debug DOM state immediately
console.log('=== SCRIPT LOADING DEBUG ===');
console.log('Document ready state:', document.readyState);
console.log('receiveBtn exists at script load:', !!document.getElementById('receiveBtn'));
console.log('transmitBtn exists at script load:', !!document.getElementById('transmitBtn'));

class MorseApp {
    constructor() {
        this.morseCode = new MorseCode();
        this.lightDetector = new LightDetector(this.morseCode);
        this.currentMode = 'transmit';
        this.isTransmitting = false;
        this.isReceiving = false;
        this.stream = null;
        this.track = null;
        this.canvas = null;
        this.ctx = null;
        this.animationFrame = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.registerServiceWorker();
        
        console.log('MorseApp initialized');
        console.log(`Default speed: ${this.morseCode.getSpeed()} WPM`);
        
        // Check browser capabilities immediately
        this.checkBrowserCapabilities();
    }
    
    initializeElements() {
        console.log('=== INITIALIZING ELEMENTS ===');
        this.elements = {
            transmitBtn: document.getElementById('transmitBtn'),
            receiveBtn: document.getElementById('receiveBtn'),
            transmitMode: document.getElementById('transmitMode'),
            receiveMode: document.getElementById('receiveMode'),
            messageInput: document.getElementById('messageInput'),
            charCount: document.getElementById('charCount'),
            morseOutput: document.getElementById('morseOutput'),
            transmitButton: document.getElementById('startTransmitBtn'),
            transmissionStatus: document.getElementById('transmissionStatus'),
            cameraVideo: document.getElementById('cameraVideo'),
            detectionCanvas: document.getElementById('detectionCanvas'),
            stopReceiveBtn: document.getElementById('stopReceiveBtn'),
            receiveStatus: document.getElementById('receiveStatus'),
            receivedMorse: document.getElementById('receivedMorse'),
            decodedMessage: document.getElementById('decodedMessage')
        };
        
        // Check if critical elements exist
        console.log('receiveBtn found:', !!this.elements.receiveBtn);
        console.log('receiveMode found:', !!this.elements.receiveMode);
        console.log('cameraVideo found:', !!this.elements.cameraVideo);
        console.log('receiveStatus found:', !!this.elements.receiveStatus);
        
        if (!this.elements.receiveBtn) {
            console.error('CRITICAL: receiveBtn not found!');
        }
    }
    
    setupEventListeners() {
        console.log('=== SETTING UP EVENT LISTENERS ===');
        
        // Check each element before adding listeners
        if (this.elements.transmitBtn) {
            this.elements.transmitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchMode('transmit').catch(error => {
                    console.error('Error switching to transmit mode:', error);
                });
            });
            console.log('transmitBtn event listener added');
        } else {
            console.error('transmitBtn not found - cannot add event listener');
        }
        
        if (this.elements.receiveBtn) {
            this.elements.receiveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('=== RECEIVE BUTTON CLICKED ===');
                console.log('Event target:', e.target);
                console.log('Current mode before switch:', this.currentMode);
                console.log('Is receiving before switch:', this.isReceiving);
                
                this.switchMode('receive').catch(error => {
                    console.error('ERROR in switchMode:', error);
                    alert('Failed to switch to receive mode: ' + error.message);
                });
            });
            console.log('receiveBtn event listener added');
        } else {
            console.error('receiveBtn not found - cannot add event listener');
        }
        
        if (this.elements.messageInput) {
            this.elements.messageInput.addEventListener('input', () => this.updateMorsePreview());
            this.elements.messageInput.addEventListener('input', () => this.updateCharCount());
            console.log('messageInput event listeners added');
        }
        
        if (this.elements.transmitButton) {
            this.elements.transmitButton.addEventListener('click', () => this.startTransmission());
            console.log('transmitButton event listener added');
        }
        
        if (this.elements.stopReceiveBtn) {
            this.elements.stopReceiveBtn.addEventListener('click', () => this.stopReceiving());
            console.log('stopReceiveBtn event listener added');
        }
        
        this.updateCharCount();
        console.log('Event listeners setup complete');
    }
    
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./sw.js');
                console.log('Service Worker registered successfully', registration);
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }
    
    async switchMode(mode) {
        console.log(`Switching to ${mode} mode...`);
        this.currentMode = mode;
        
        this.elements.transmitBtn.classList.toggle('active', mode === 'transmit');
        this.elements.receiveBtn.classList.toggle('active', mode === 'receive');
        
        this.elements.transmitBtn.setAttribute('aria-selected', mode === 'transmit');
        this.elements.receiveBtn.setAttribute('aria-selected', mode === 'receive');
        
        this.elements.transmitMode.classList.toggle('hidden', mode !== 'transmit');
        this.elements.receiveMode.classList.toggle('hidden', mode !== 'receive');
        
        if (mode === 'receive') {
            this.stopTransmission();
            console.log('About to auto-start receiving...');
            await this.autoStartReceiving();
        } else {
            this.stopReceiving();
        }
        
        console.log(`Mode switch to ${mode} complete`);
    }
    
    updateCharCount() {
        const count = this.elements.messageInput.value.length;
        this.elements.charCount.textContent = count;
        this.elements.charCount.style.color = count > 90 ? '#dc3545' : '#a0a0a0';
    }
    
    updateMorsePreview() {
        const message = this.elements.messageInput.value;
        const morse = this.morseCode.textToMorse(message);
        this.elements.morseOutput.textContent = morse;
    }
    
    async getFlashlight() {
        try {
            // Check if we're in a secure context
            if (!window.isSecureContext) {
                throw new Error('Flashlight requires HTTPS or localhost');
            }

            // Check if getUserMedia is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API not available in this browser');
            }

            console.log('Requesting camera access...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            
            const track = stream.getVideoTracks()[0];
            console.log('Camera track obtained:', track.label);
            
            const capabilities = track.getCapabilities();
            console.log('Camera capabilities:', capabilities);
            
            if (!capabilities.torch) {
                // Try alternative approaches
                const settings = track.getSettings();
                console.log('Camera settings:', settings);
                
                throw new Error(`Flashlight not supported on this device. Camera: ${track.label || 'Unknown'}`);
            }
            
            console.log('Flashlight support confirmed');
            return { stream, track };
        } catch (error) {
            console.error('Flashlight access error:', error);
            
            // Provide more specific error messages
            if (error.name === 'NotAllowedError') {
                throw new Error('Camera permission denied. Please allow camera access and try again.');
            } else if (error.name === 'NotFoundError') {
                throw new Error('No camera found on this device.');
            } else if (error.name === 'NotSupportedError') {
                throw new Error('Camera not supported in this browser.');
            } else {
                throw new Error('Could not access camera flashlight: ' + error.message);
            }
        }
    }
    
    async setFlashlight(enabled) {
        if (this.track) {
            try {
                await this.track.applyConstraints({
                    advanced: [{ torch: enabled }]
                });
            } catch (error) {
                console.error('Failed to control flashlight:', error);
            }
        }
    }
    
    async startTransmission() {
        if (this.isTransmitting) {
            this.stopTransmission();
            return;
        }
        
        const message = this.elements.messageInput.value.trim();
        if (!message) {
            alert('Please enter a message to transmit');
            return;
        }
        
        if (!this.morseCode.validateMessage(message)) {
            alert('Message contains unsupported characters. Please use only letters, numbers, and basic punctuation.');
            return;
        }
        
        try {
            this.isTransmitting = true;
            this.elements.transmitButton.textContent = 'Stop Transmission';
            this.elements.transmissionStatus.classList.remove('hidden');
            
            // Show countdown before transmission starts
            await this.showCountdown();
            
            if (!this.isTransmitting) return; // User stopped during countdown
            
            const morse = this.morseCode.textToMorse(message);
            const pattern = this.morseCode.getTimingPattern(morse);
            
            // Try flashlight first, fallback to screen flash
            try {
                this.showDiagnosticInfo();
                const { stream, track } = await this.getFlashlight();
                this.stream = stream;
                this.track = track;
                
                console.log('Using flashlight for transmission');
                await this.executeFlashPattern(pattern);
            } catch (flashlightError) {
                console.warn('Flashlight not available, using screen flash:', flashlightError);
                this.updateTransmissionStatus('Transmitting via screen flash...');
                await this.executeScreenFlashPattern(pattern);
            }
            
        } catch (error) {
            console.error('Transmission error:', error);
            alert('Error: ' + error.message + '\n\nCheck browser console for more details.');
        } finally {
            this.stopTransmission();
        }
    }
    
    async showCountdown() {
        const statusText = this.elements.transmissionStatus.querySelector('span');
        
        for (let i = 3; i > 0; i--) {
            if (!this.isTransmitting) return; // User stopped transmission
            
            statusText.textContent = `Starting transmission in ${i}...`;
            await this.delay(1000);
        }
        
        statusText.textContent = 'Transmitting...';
    }
    
    updateTransmissionStatus(message) {
        const statusText = this.elements.transmissionStatus.querySelector('span');
        statusText.textContent = message;
    }
    
    async executeScreenFlashPattern(pattern) {
        try {
            console.log('Starting full-screen flash pattern');
            
            // Enable fullscreen flash mode
            document.body.classList.add('fullscreen-flash');
            
            // Hide all content during screen flash
            this.elements.transmitMode.style.opacity = '0';
            if (this.elements.receiveMode) {
                this.elements.receiveMode.style.opacity = '0';
            }
            
            for (const step of pattern) {
                if (!this.isTransmitting) break;
                
                if (step.type === 'on') {
                    // Maximum white flash - covers entire screen
                    document.body.style.backgroundColor = '#ffffff';
                    document.body.style.filter = 'brightness(2) contrast(1.5)';
                    console.log(`White flash for ${step.duration}ms`);
                    await this.delay(step.duration);
                } else {
                    // Maximum black between signals
                    document.body.style.backgroundColor = '#000000';
                    document.body.style.filter = 'brightness(0)';
                    console.log(`Black gap for ${step.duration}ms`);
                    await this.delay(step.duration);
                }
            }
            
            console.log('Flash pattern completed, restoring normal view');
            
        } catch (error) {
            console.error('Error executing screen flash pattern:', error);
            throw error;
        } finally {
            // Always restore normal state
            this.restoreNormalDisplay();
        }
    }
    
    restoreNormalDisplay() {
        // Remove fullscreen flash mode
        document.body.classList.remove('fullscreen-flash');
        
        // Reset all body styles
        document.body.style.backgroundColor = '';
        document.body.style.filter = '';
        
        // Restore content visibility
        this.elements.transmitMode.style.opacity = '';
        if (this.elements.receiveMode) {
            this.elements.receiveMode.style.opacity = '';
        }
        
        console.log('Normal display restored');
    }
    
    showDiagnosticInfo() {
        console.log('=== FLASHLIGHT DIAGNOSTIC ===');
        console.log('User Agent:', navigator.userAgent);
        console.log('Secure Context:', window.isSecureContext);
        console.log('Protocol:', window.location.protocol);
        console.log('Host:', window.location.host);
        console.log('MediaDevices available:', !!navigator.mediaDevices);
        console.log('getUserMedia available:', !!navigator.mediaDevices?.getUserMedia);
        
        // Check for known problematic browsers/versions
        const isChrome = /Chrome/.test(navigator.userAgent);
        const chromeVersion = isChrome ? parseInt(navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || '0') : 0;
        console.log('Chrome version:', chromeVersion);
        
        if (chromeVersion < 88) {
            console.warn('Chrome version may not support torch API (requires 88+)');
        }
    }
    
    async executeFlashPattern(pattern) {
        try {
            for (const step of pattern) {
                if (!this.isTransmitting) break;
                
                if (step.type === 'on') {
                    await this.setFlashlight(true);
                    await this.delay(step.duration);
                    await this.setFlashlight(false);
                } else {
                    await this.delay(step.duration);
                }
            }
        } catch (error) {
            console.error('Error executing flash pattern:', error);
            throw error;
        }
    }
    
    stopTransmission() {
        this.isTransmitting = false;
        this.elements.transmitButton.textContent = 'Start Transmission';
        this.elements.transmissionStatus.classList.add('hidden');
        
        // Reset screen flash completely
        this.restoreNormalDisplay();
        
        if (this.track) {
            this.setFlashlight(false);
            this.track.stop();
            this.track = null;
        }
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }
    
    async autoStartReceiving() {
        console.log('=== AUTO-START RECEIVING ===');
        console.log('Current mode:', this.currentMode);
        console.log('Is receiving:', this.isReceiving);
        
        try {
            console.log('Setting loading status...');
            this.showReceiveStatus('Initializing camera...', 'loading');
            
            console.log('Calling startReceiving...');
            await this.startReceiving();
            
            console.log('Auto-start receiving completed successfully');
        } catch (error) {
            console.error('Auto-start receiving failed:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            this.handleCameraError(error);
        }
    }
    
    handleCameraError(error) {
        let message = 'Camera initialization failed. ';
        
        if (error.name === 'NotAllowedError') {
            message += 'Please allow camera access and switch to receive mode again.';
        } else if (error.name === 'NotFoundError') {
            message += 'No camera found on this device.';
        } else if (error.name === 'NotSupportedError') {
            message += 'Camera not supported in this browser.';
        } else if (error.name === 'NotReadableError') {
            message += 'Camera is in use by another application.';
        } else {
            message += 'Switch to transmit mode and back to receive to try again.';
        }
        
        this.showReceiveStatus(message, 'error');
        
        // Hide stop button since receiving failed
        this.elements.stopReceiveBtn.classList.add('hidden');
    }

    async startReceiving() {
        console.log('=== START RECEIVING ===');
        console.log('Current isReceiving state:', this.isReceiving);
        
        if (this.isReceiving) {
            console.log('Already receiving, returning early');
            return;
        }
        
        try {
            console.log('Setting requesting camera status...');
            this.showReceiveStatus('Requesting camera access...', 'loading');
            
            console.log('Attempting to get user media...');
            
            // Try back camera first, fallback to front camera
            try {
                console.log('Trying back camera...');
                this.stream = await navigator.mediaDevices.getUserMedia({
                    video: { 
                        facingMode: { exact: 'environment' },
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });
                console.log('Using back camera for light detection');
            } catch (backCameraError) {
                console.warn('Back camera not available, falling back to front camera:', backCameraError);
                console.log('Trying front camera...');
                this.stream = await navigator.mediaDevices.getUserMedia({
                    video: { 
                        facingMode: 'user',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });
                console.log('Using front camera for light detection');
            }
            
            this.elements.cameraVideo.srcObject = this.stream;
            
            // Wait for camera to be ready
            await this.waitForCameraReady();
            
            this.isReceiving = true;
            
            this.elements.stopReceiveBtn.classList.remove('hidden');
            
            // Show which camera is being used
            const track = this.stream.getVideoTracks()[0];
            const settings = track.getSettings();
            const cameraType = settings.facingMode === 'environment' ? 'back' : 'front';
            this.showReceiveStatus(`Listening for signals (${cameraType} camera)...`, 'active');
            
            this.canvas = this.elements.detectionCanvas;
            this.ctx = this.canvas.getContext('2d');
            
            if (!this.ctx) {
                throw new Error('Could not get canvas context');
            }
            
            this.lightDetector.reset();
            this.elements.receivedMorse.textContent = '';
            this.elements.decodedMessage.textContent = '';
            
            this.detectLight();
            
        } catch (error) {
            console.error('Camera access error:', error);
            this.handleCameraError(error);
            this.stopReceiving();
        }
    }
    
    async waitForCameraReady() {
        return new Promise((resolve, reject) => {
            const video = this.elements.cameraVideo;
            
            const onLoadedMetadata = () => {
                video.removeEventListener('loadedmetadata', onLoadedMetadata);
                video.removeEventListener('error', onError);
                resolve();
            };
            
            const onError = (error) => {
                video.removeEventListener('loadedmetadata', onLoadedMetadata);
                video.removeEventListener('error', onError);
                reject(error);
            };
            
            video.addEventListener('loadedmetadata', onLoadedMetadata);
            video.addEventListener('error', onError);
            
            // Timeout after 10 seconds
            setTimeout(() => {
                video.removeEventListener('loadedmetadata', onLoadedMetadata);
                video.removeEventListener('error', onError);
                resolve(); // Resolve anyway to continue
            }, 10000);
        });
    }
    
    showReceiveStatus(message, type = 'active') {
        console.log(`Setting receive status: ${message} (${type})`);
        
        const statusElement = this.elements.receiveStatus;
        if (!statusElement) {
            console.error('receiveStatus element not found');
            return;
        }
        
        const statusText = statusElement.querySelector('span');
        const statusIndicator = statusElement.querySelector('.status-indicator');
        
        if (!statusText) {
            console.error('Status text span not found');
            return;
        }
        
        if (!statusIndicator) {
            console.error('Status indicator not found');
            return;
        }
        
        statusText.textContent = message;
        statusElement.classList.remove('hidden');
        
        // Update indicator style based on type
        statusIndicator.className = 'status-indicator';
        if (type === 'loading') {
            statusIndicator.classList.add('loading');
        } else if (type === 'error') {
            statusIndicator.classList.add('error');
        } else {
            statusIndicator.classList.add('active');
        }
        
        console.log('Receive status updated successfully');
    }
    
    detectLight() {
        if (!this.isReceiving) {
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }
            return;
        }
        
        const video = this.elements.cameraVideo;
        
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            this.canvas.width = video.videoWidth;
            this.canvas.height = video.videoHeight;
            
            this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
            
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const brightness = this.lightDetector.analyzeBrightness(imageData);
            
            const result = this.lightDetector.detectSignal(brightness);
            
            if (result.sequence !== this.elements.receivedMorse.textContent) {
                this.elements.receivedMorse.textContent = result.sequence;
                
                if (result.sequence.trim()) {
                    const decoded = this.morseCode.morseToText(result.sequence);
                    this.elements.decodedMessage.textContent = decoded;
                }
            }
        }
        
        if (this.isReceiving) {
            this.animationFrame = requestAnimationFrame(() => this.detectLight());
        }
    }
    
    stopReceiving() {
        this.isReceiving = false;
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        this.elements.stopReceiveBtn.classList.add('hidden');
        this.elements.receiveStatus.classList.add('hidden');
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.elements.cameraVideo.srcObject = null;
        
        // Reset status indicator
        const statusIndicator = this.elements.receiveStatus.querySelector('.status-indicator');
        if (statusIndicator) {
            statusIndicator.className = 'status-indicator';
        }
    }
    
    checkBrowserCapabilities() {
        console.log('=== BROWSER CAPABILITIES CHECK ===');
        console.log('navigator.mediaDevices:', !!navigator.mediaDevices);
        console.log('getUserMedia available:', !!navigator.mediaDevices?.getUserMedia);
        console.log('Secure context:', window.isSecureContext);
        console.log('Protocol:', window.location.protocol);
        console.log('Hostname:', window.location.hostname);
        
        if (!navigator.mediaDevices) {
            console.error('MediaDevices API not available');
            return false;
        }
        
        if (!navigator.mediaDevices.getUserMedia) {
            console.error('getUserMedia not available');
            return false;
        }
        
        if (!window.isSecureContext) {
            console.warn('Not in secure context - camera may not work');
            return false;
        }
        
        console.log('Browser capabilities check passed');
        return true;
    }
    
    setMorseSpeed(wpm) {
        this.morseCode.setSpeed(wpm);
        this.lightDetector.updateTimingThresholds();
        console.log(`Morse code speed changed to ${wpm} WPM`);
    }
    
    getMorseSpeed() {
        return this.morseCode.getSpeed();
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Wait for DOM to be ready
function initializeApp() {
    console.log('=== INITIALIZING APP ===');
    console.log('Document ready state:', document.readyState);
    
    // Final check before creating app
    const receiveBtn = document.getElementById('receiveBtn');
    const transmitBtn = document.getElementById('transmitBtn');
    
    console.log('Final element check:');
    console.log('receiveBtn:', !!receiveBtn);
    console.log('transmitBtn:', !!transmitBtn);
    
    if (!receiveBtn || !transmitBtn) {
        console.error('FATAL: Critical elements still missing, cannot initialize app');
        alert('App initialization failed - please refresh the page');
        return null;
    }
    
    const app = new MorseApp();
    
    // Add a test function for debugging
    window.testAutoStart = async () => {
        console.log('=== TESTING AUTO-START ===');
        try {
            await app.switchMode('receive');
            console.log('Auto-start test completed');
        } catch (error) {
            console.error('Auto-start test failed:', error);
        }
    };
    
    console.log('MorseApp instance created. Use window.testAutoStart() to test auto-start.');
    
    // Also add a simple mode switch test
    window.testModeSwitch = () => {
        console.log('=== TESTING MODE SWITCH ===');
        console.log('Current mode:', app.currentMode);
        app.switchMode('receive').then(() => {
            console.log('Mode switch completed, new mode:', app.currentMode);
        }).catch(error => {
            console.error('Mode switch failed:', error);
        });
    };
    
    // Speed control functions
    window.setSpeed = (wpm) => {
        app.setMorseSpeed(wpm);
        return `Speed set to ${wpm} WPM`;
    };
    
    window.getSpeed = () => {
        return `Current speed: ${app.getMorseSpeed()} WPM`;
    };
    
    // Preset speeds
    window.setSlowSpeed = () => window.setSpeed(5);     // 5 WPM - very slow
    window.setNormalSpeed = () => window.setSpeed(10);  // 10 WPM - default
    window.setFastSpeed = () => window.setSpeed(20);    // 20 WPM - fast
    window.setProSpeed = () => window.setSpeed(30);     // 30 WPM - professional
    
    console.log('Speed control functions available:');
    console.log('- setSpeed(wpm) - set custom speed');
    console.log('- getSpeed() - show current speed');
    console.log('- setSlowSpeed() - 5 WPM');
    console.log('- setNormalSpeed() - 10 WPM');
    console.log('- setFastSpeed() - 20 WPM');
    console.log('- setProSpeed() - 30 WPM');
    
    // Test character detection accuracy
    window.testCharacter = (char) => {
        const morse = app.morseCode.textToMorse(char);
        console.log(`Testing character "${char}" (${morse}):`);
        console.log('Expected timing pattern:');
        const pattern = app.morseCode.getTimingPattern(morse);
        pattern.forEach((step, i) => {
            console.log(`  ${i + 1}. ${step.type} for ${step.duration}ms`);
        });
        return `Test setup for "${char}" (${morse})`;
    };
    
    window.testCommonChars = () => {
        const common = ['E', 'T', 'A', 'O', 'I', 'N', 'S', 'H', 'R'];
        console.log('=== TESTING COMMON CHARACTERS ===');
        common.forEach(char => {
            const morse = app.morseCode.textToMorse(char);
            console.log(`${char}: ${morse}`);
        });
        return 'Common characters test logged';
    };
    
    window.analyzeWord = (word) => {
        console.log(`=== ANALYZING WORD: "${word}" ===`);
        const morse = app.morseCode.textToMorse(word);
        console.log(`Full Morse: ${morse}`);
        
        word.split('').forEach((char, i) => {
            const charMorse = app.morseCode.textToMorse(char);
            console.log(`${i + 1}. ${char} = ${charMorse}`);
            
            // Show timing for each dot/dash
            charMorse.split('').forEach((symbol, j) => {
                if (symbol === '.') {
                    console.log(`   Dot ${j + 1}: ${app.morseCode.dotDuration}ms`);
                } else if (symbol === '-') {
                    console.log(`   Dash ${j + 1}: ${app.morseCode.dashDuration}ms`);
                }
            });
        });
        
        return `Analysis complete for "${word}"`;
    };
    
    // Quick test for HELLO
    window.testHello = () => analyzeWord('HELLO');
    
    console.log('Character testing functions:');
    console.log('- testCharacter(char) - show timing for specific character');
    console.log('- testCommonChars() - show common characters');
    console.log('- analyzeWord(word) - detailed analysis of word timing');
    console.log('- testHello() - quick test for HELLO word');
    
    return app;
}

// Multiple ways to ensure DOM is ready
console.log('Script loaded, document.readyState:', document.readyState);

let appInitialized = false;

function safeInitializeApp() {
    if (appInitialized) {
        console.log('App already initialized, skipping...');
        return;
    }
    
    // Check if critical elements exist
    const receiveBtn = document.getElementById('receiveBtn');
    const transmitBtn = document.getElementById('transmitBtn');
    
    if (!receiveBtn || !transmitBtn) {
        console.error('Critical elements not found yet:', {
            receiveBtn: !!receiveBtn,
            transmitBtn: !!transmitBtn
        });
        
        // Try again in 100ms
        setTimeout(safeInitializeApp, 100);
        return;
    }
    
    console.log('All critical elements found, initializing app...');
    appInitialized = true;
    initializeApp();
}

if (document.readyState === 'loading') {
    console.log('DOM still loading, waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', safeInitializeApp);
} else {
    console.log('DOM already ready, initializing...');
    safeInitializeApp();
}