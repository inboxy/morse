class MorseCode {
    constructor() {
        this.morseMap = {
            'A': '.-',    'B': '-...',  'C': '-.-.',  'D': '-..',   'E': '.',
            'F': '..-.',  'G': '--.',   'H': '....',  'I': '..',    'J': '.---',
            'K': '-.-',   'L': '.-..',  'M': '--',    'N': '-.',    'O': '---',
            'P': '.--.',  'Q': '--.-',  'R': '.-.',   'S': '...',   'T': '-',
            'U': '..-',   'V': '...-',  'W': '.--',   'X': '-..-',  'Y': '-.--',
            'Z': '--..',
            '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
            '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
            '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', 
            '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-',
            '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-',
            '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.',
            '$': '...-..-', '@': '.--.-.'
        };
        
        this.reverseMap = {};
        for (let [key, value] of Object.entries(this.morseMap)) {
            this.reverseMap[value] = key;
        }
        
        this.dotDuration = 200;
        this.dashDuration = 600;
        this.symbolGap = 200;
        this.letterGap = 600;
        this.wordGap = 1400;
    }
    
    textToMorse(text) {
        return text.toUpperCase()
            .split('')
            .map(char => {
                if (char === ' ') return '/';
                return this.morseMap[char] || '';
            })
            .filter(morse => morse !== '')
            .join(' ');
    }
    
    morseToText(morse) {
        return morse
            .split(' / ')
            .map(word => 
                word.split(' ')
                    .map(symbol => this.reverseMap[symbol] || '')
                    .join('')
            )
            .join(' ');
    }
    
    getTimingPattern(morseCode) {
        const pattern = [];
        const symbols = morseCode.split(' ');
        
        for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            
            if (symbol === '/') {
                pattern.push({ type: 'gap', duration: this.wordGap });
                continue;
            }
            
            for (let j = 0; j < symbol.length; j++) {
                const char = symbol[j];
                
                if (char === '.') {
                    pattern.push({ type: 'on', duration: this.dotDuration });
                } else if (char === '-') {
                    pattern.push({ type: 'on', duration: this.dashDuration });
                }
                
                if (j < symbol.length - 1) {
                    pattern.push({ type: 'gap', duration: this.symbolGap });
                }
            }
            
            if (i < symbols.length - 1) {
                pattern.push({ type: 'gap', duration: this.letterGap });
            }
        }
        
        return pattern;
    }
    
    validateMessage(text) {
        const validChars = Object.keys(this.morseMap).join('') + ' ';
        return text.toUpperCase().split('').every(char => validChars.includes(char));
    }
}

class LightDetector {
    constructor() {
        this.isDetecting = false;
        this.brightnessThreshold = 0.5;
        this.detectionHistory = [];
        this.maxHistoryLength = 10;
        this.lastState = false;
        this.currentSequence = '';
        this.lastTransition = Date.now();
        this.minSignalDuration = 50;
        this.maxGapDuration = 2000;
    }
    
    analyzeBrightness(imageData) {
        let totalBrightness = 0;
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = (r + g + b) / 3;
            totalBrightness += brightness;
        }
        
        return totalBrightness / (data.length / 4) / 255;
    }
    
    updateHistory(brightness) {
        this.detectionHistory.push(brightness);
        if (this.detectionHistory.length > this.maxHistoryLength) {
            this.detectionHistory.shift();
        }
    }
    
    getAverageBrightness() {
        if (this.detectionHistory.length === 0) return 0;
        return this.detectionHistory.reduce((sum, val) => sum + val, 0) / this.detectionHistory.length;
    }
    
    calibrateThreshold() {
        if (this.detectionHistory.length >= this.maxHistoryLength) {
            const avg = this.getAverageBrightness();
            this.brightnessThreshold = avg + 0.2;
        }
    }
    
    detectSignal(brightness) {
        this.updateHistory(brightness);
        this.calibrateThreshold();
        
        const isSignalOn = brightness > this.brightnessThreshold;
        const currentTime = Date.now();
        const timeSinceLastTransition = currentTime - this.lastTransition;
        
        if (isSignalOn !== this.lastState && timeSinceLastTransition > this.minSignalDuration) {
            if (this.lastState === false && isSignalOn === true) {
                // Signal started
                if (timeSinceLastTransition > this.maxGapDuration) {
                    // Long gap - word separator
                    this.currentSequence += ' / ';
                } else if (timeSinceLastTransition > 300) {
                    // Medium gap - letter separator
                    this.currentSequence += ' ';
                }
            } else if (this.lastState === true && isSignalOn === false) {
                // Signal ended
                if (timeSinceLastTransition < 350) {
                    this.currentSequence += '.';
                } else {
                    this.currentSequence += '-';
                }
            }
            
            this.lastState = isSignalOn;
            this.lastTransition = currentTime;
        }
        
        return {
            brightness: brightness,
            threshold: this.brightnessThreshold,
            isSignalDetected: isSignalOn,
            sequence: this.currentSequence.trim()
        };
    }
    
    reset() {
        this.currentSequence = '';
        this.detectionHistory = [];
        this.lastState = false;
        this.lastTransition = Date.now();
    }
}