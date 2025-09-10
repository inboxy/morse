class MorseApp {
    constructor() {
        this.morseCode = new MorseCode();
        this.lightDetector = new LightDetector();
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
    }
    
    initializeElements() {
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
            startReceiveBtn: document.getElementById('startReceiveBtn'),
            stopReceiveBtn: document.getElementById('stopReceiveBtn'),
            receiveStatus: document.getElementById('receiveStatus'),
            receivedMorse: document.getElementById('receivedMorse'),
            decodedMessage: document.getElementById('decodedMessage')
        };
    }
    
    setupEventListeners() {
        this.elements.transmitBtn.addEventListener('click', () => this.switchMode('transmit'));
        this.elements.receiveBtn.addEventListener('click', () => this.switchMode('receive'));
        
        this.elements.messageInput.addEventListener('input', () => this.updateMorsePreview());
        this.elements.transmitButton.addEventListener('click', () => this.startTransmission());
        
        this.elements.startReceiveBtn.addEventListener('click', () => this.startReceiving());
        this.elements.stopReceiveBtn.addEventListener('click', () => this.stopReceiving());
        
        this.updateCharCount();
        this.elements.messageInput.addEventListener('input', () => this.updateCharCount());
    }
    
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('./sw.js');
                console.log('Service Worker registered');
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }
    
    switchMode(mode) {
        this.currentMode = mode;
        
        this.elements.transmitBtn.classList.toggle('active', mode === 'transmit');
        this.elements.receiveBtn.classList.toggle('active', mode === 'receive');
        
        this.elements.transmitMode.classList.toggle('hidden', mode !== 'transmit');
        this.elements.receiveMode.classList.toggle('hidden', mode !== 'receive');
        
        if (mode === 'receive') {
            this.stopTransmission();
        } else {
            this.stopReceiving();
        }
    }
    
    updateCharCount() {
        const count = this.elements.messageInput.value.length;
        this.elements.charCount.textContent = count;
        this.elements.charCount.style.color = count > 90 ? '#dc3545' : '#6c757d';
    }
    
    updateMorsePreview() {
        const message = this.elements.messageInput.value;
        const morse = this.morseCode.textToMorse(message);
        this.elements.morseOutput.textContent = morse;
    }
    
    async getFlashlight() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            
            const track = stream.getVideoTracks()[0];
            const capabilities = track.getCapabilities();
            
            if (!capabilities.torch) {
                throw new Error('Flashlight not supported on this device');
            }
            
            return { stream, track };
        } catch (error) {
            throw new Error('Could not access camera flashlight: ' + error.message);
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
            const { stream, track } = await this.getFlashlight();
            this.stream = stream;
            this.track = track;
            
            this.isTransmitting = true;
            this.elements.transmitButton.textContent = 'Stop Transmission';
            this.elements.transmissionStatus.classList.remove('hidden');
            
            const morse = this.morseCode.textToMorse(message);
            const pattern = this.morseCode.getTimingPattern(morse);
            
            await this.executeFlashPattern(pattern);
            
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            this.stopTransmission();
        }
    }
    
    async executeFlashPattern(pattern) {
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
    }
    
    stopTransmission() {
        this.isTransmitting = false;
        this.elements.transmitButton.textContent = 'Start Transmission';
        this.elements.transmissionStatus.classList.add('hidden');
        
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
    
    async startReceiving() {
        if (this.isReceiving) return;
        
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' }
            });
            
            this.elements.cameraVideo.srcObject = this.stream;
            this.isReceiving = true;
            
            this.elements.startReceiveBtn.classList.add('hidden');
            this.elements.stopReceiveBtn.classList.remove('hidden');
            this.elements.receiveStatus.classList.remove('hidden');
            
            this.canvas = this.elements.detectionCanvas;
            this.ctx = this.canvas.getContext('2d');
            
            this.lightDetector.reset();
            this.elements.receivedMorse.textContent = '';
            this.elements.decodedMessage.textContent = '';
            
            this.detectLight();
            
        } catch (error) {
            alert('Could not access camera: ' + error.message);
            this.stopReceiving();
        }
    }
    
    detectLight() {
        if (!this.isReceiving) return;
        
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
        
        this.animationFrame = requestAnimationFrame(() => this.detectLight());
    }
    
    stopReceiving() {
        this.isReceiving = false;
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        this.elements.startReceiveBtn.classList.remove('hidden');
        this.elements.stopReceiveBtn.classList.add('hidden');
        this.elements.receiveStatus.classList.add('hidden');
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.elements.cameraVideo.srcObject = null;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MorseApp();
});