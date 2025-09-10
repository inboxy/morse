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
        
        // Standard international Morse code timing
        this.setSpeed(10); // Default 10 WPM (Words Per Minute)
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
    
    setSpeed(wpm) {
        // Calculate timing unit based on Words Per Minute
        // Standard: PARIS = 50 units, so 1 WPM = 50 units per minute
        // 1 unit = 60000ms / (50 * WPM) = 1200 / WPM milliseconds
        this.unit = Math.round(1200 / wpm);
        
        // International Morse code timing ratios
        this.dotDuration = this.unit; // 1 unit
        this.dashDuration = this.unit * 3; // 3 units
        this.symbolGap = this.unit; // 1 unit between dots/dashes in same letter
        this.letterGap = this.unit * 3; // 3 units between letters
        this.wordGap = this.unit * 7; // 7 units between words
        
        console.log(`Morse code speed set to ${wpm} WPM (${this.unit}ms per unit)`);
    }
    
    getSpeed() {
        return Math.round(1200 / this.unit);
    }
    
    validateMessage(text) {
        const validChars = Object.keys(this.morseMap).join('') + ' ';
        return text.toUpperCase().split('').every(char => validChars.includes(char));
    }
}

class LightDetector {
    constructor(morseCodeInstance = null) {
        this.isDetecting = false;
        this.brightnessThreshold = 0.5;
        this.detectionHistory = [];
        this.maxHistoryLength = 30; // Increased for better calibration
        this.lastState = false;
        this.currentSequence = '';
        this.lastTransition = Date.now();
        
        // Improved calibration tracking
        this.baselineBrightness = 0;
        this.maxBrightness = 0;
        this.calibrationSamples = 0;
        this.isCalibrated = false;
        
        // Signal filtering
        this.signalHistory = [];
        this.maxSignalHistory = 5;
        
        // Dynamic timing based on Morse code speed
        this.morseCode = morseCodeInstance;
        this.updateTimingThresholds();
    }
    
    updateTimingThresholds() {
        if (this.morseCode) {
            const unit = this.morseCode.unit;
            // Timing thresholds for signal detection
            this.minSignalDuration = Math.max(unit * 0.3, 30); // 30% of unit, min 30ms
            
            // Critical fix: dot threshold should be between dot (1 unit) and dash (3 units)
            // Set it at 2 units to properly distinguish
            this.dotThreshold = unit * 2; // 2 units - between dot (1u) and dash (3u)
            
            // Gap detection thresholds
            this.letterGapThreshold = unit * 2.5; // 2.5 units - between symbol gap (1u) and letter gap (3u)
            this.wordGapThreshold = unit * 5; // 5 units - between letter gap (3u) and word gap (7u)
            this.maxGapDuration = unit * 10; // 10 units max before reset
            
            console.log(`Light detector timing updated for ${this.morseCode.getSpeed()} WPM:`, {
                unit: unit + 'ms',
                dotDuration: this.morseCode.dotDuration + 'ms',
                dashDuration: this.morseCode.dashDuration + 'ms',
                dotThreshold: this.dotThreshold + 'ms',
                minSignal: this.minSignalDuration + 'ms',
                letterGap: this.letterGapThreshold + 'ms',
                wordGap: this.wordGapThreshold + 'ms'
            });
        } else {
            // Fallback for legacy timing
            this.minSignalDuration = 50;
            this.dotThreshold = 300; // Increased from 350 to be more forgiving
            this.letterGapThreshold = 400;
            this.wordGapThreshold = 800;
            this.maxGapDuration = 2000;
        }
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
        
        // Track brightness range for better calibration
        this.calibrationSamples++;
        if (brightness < this.baselineBrightness || this.baselineBrightness === 0) {
            this.baselineBrightness = brightness;
        }
        if (brightness > this.maxBrightness) {
            this.maxBrightness = brightness;
        }
    }
    
    getAverageBrightness() {
        if (this.detectionHistory.length === 0) return 0;
        return this.detectionHistory.reduce((sum, val) => sum + val, 0) / this.detectionHistory.length;
    }
    
    getMedianBrightness() {
        if (this.detectionHistory.length === 0) return 0;
        const sorted = [...this.detectionHistory].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }
    
    calibrateThreshold() {
        if (this.detectionHistory.length >= 10) {
            // Use adaptive threshold based on brightness range
            const range = this.maxBrightness - this.baselineBrightness;
            const median = this.getMedianBrightness();
            
            if (range > 0.1) {
                // Good brightness range - use percentage of range
                this.brightnessThreshold = this.baselineBrightness + (range * 0.4);
                this.isCalibrated = true;
            } else {
                // Low range - use median + offset
                this.brightnessThreshold = median + 0.15;
            }
            
            // Clamp threshold to reasonable bounds
            this.brightnessThreshold = Math.max(0.1, Math.min(0.9, this.brightnessThreshold));
            
            if (this.calibrationSamples % 100 === 0) {
                console.log('Threshold calibration:', {
                    baseline: this.baselineBrightness.toFixed(3),
                    max: this.maxBrightness.toFixed(3),
                    range: range.toFixed(3),
                    threshold: this.brightnessThreshold.toFixed(3),
                    median: median.toFixed(3)
                });
            }
        }
    }
    
    filterSignal(isSignalOn) {
        // Add to signal history for filtering
        this.signalHistory.push(isSignalOn);
        if (this.signalHistory.length > this.maxSignalHistory) {
            this.signalHistory.shift();
        }
        
        // Use majority vote to filter noise
        if (this.signalHistory.length >= 3) {
            const trueCount = this.signalHistory.filter(s => s).length;
            return trueCount > this.signalHistory.length / 2;
        }
        
        return isSignalOn;
    }
    
    detectSignal(brightness) {
        this.updateHistory(brightness);
        this.calibrateThreshold();
        
        const rawSignal = brightness > this.brightnessThreshold;
        const isSignalOn = this.filterSignal(rawSignal);
        const currentTime = Date.now();
        const timeSinceLastTransition = currentTime - this.lastTransition;
        
        // Debug logging for signal detection (reduced frequency)
        const debugData = {
            brightness: brightness.toFixed(3),
            threshold: this.brightnessThreshold.toFixed(3),
            rawSignal,
            filtered: isSignalOn,
            lastState: this.lastState,
            timeSince: timeSinceLastTransition
        };
        
        if (isSignalOn !== this.lastState && timeSinceLastTransition > this.minSignalDuration) {
            console.log('=== SIGNAL TRANSITION ===', debugData);
            
            if (this.lastState === false && isSignalOn === true) {
                // Signal started - check for gaps before this signal
                console.log('Signal ON - gap duration:', timeSinceLastTransition, 'ms');
                
                if (timeSinceLastTransition > this.wordGapThreshold) {
                    console.log('Adding WORD GAP (/) - threshold:', this.wordGapThreshold);
                    this.currentSequence += ' / ';
                } else if (timeSinceLastTransition > this.letterGapThreshold) {
                    console.log('Adding LETTER GAP ( ) - threshold:', this.letterGapThreshold);
                    this.currentSequence += ' ';
                }
                
            } else if (this.lastState === true && isSignalOn === false) {
                // Signal ended - determine dot or dash based on signal duration
                const expectedDot = this.morseCode ? this.morseCode.dotDuration : 120;
                const expectedDash = this.morseCode ? this.morseCode.dashDuration : 360;
                
                console.log('🔴 Signal OFF - analyzing duration:');
                console.log('  Measured duration:', timeSinceLastTransition, 'ms');
                console.log('  Expected dot duration:', expectedDot, 'ms');
                console.log('  Expected dash duration:', expectedDash, 'ms');
                console.log('  Dot threshold (cutoff):', this.dotThreshold, 'ms');
                
                const isActualDot = timeSinceLastTransition < this.dotThreshold;
                const symbol = isActualDot ? '.' : '-';
                
                console.log('  DECISION:', isActualDot ? 'DOT (.)' : 'DASH (-)');
                console.log('  Reason: duration', timeSinceLastTransition, isActualDot ? '<' : '≥', this.dotThreshold);
                
                this.currentSequence += symbol;
                console.log('  ✓ Current sequence:', this.currentSequence);
                
                // Try to decode current letter if we have symbols
                const lastWord = this.currentSequence.split(' / ').pop();
                const letters = lastWord.split(' ');
                const currentLetter = letters[letters.length - 1];
                if (currentLetter && this.morseCode) {
                    const decoded = this.morseCode.reverseMap[currentLetter];
                    if (decoded) {
                        console.log('  ✅ Letter decoded:', currentLetter, '→', decoded);
                    } else {
                        console.log('  ❌ Unknown pattern:', currentLetter);
                        // Show closest matches
                        const allPatterns = Object.entries(this.morseCode.reverseMap);
                        const similar = allPatterns.filter(([pattern]) => 
                            pattern.length === currentLetter.length
                        );
                        if (similar.length > 0) {
                            console.log('     Similar length patterns:', similar.map(([p, c]) => `${p}→${c}`).join(', '));
                        }
                    }
                }
            }
            
            this.lastState = isSignalOn;
            this.lastTransition = currentTime;
        }
        
        return {
            brightness: brightness,
            threshold: this.brightnessThreshold,
            isSignalDetected: isSignalOn,
            sequence: this.currentSequence.trim(),
            debug: debugData
        };
    }
    
    reset() {
        console.log('=== LIGHT DETECTOR RESET ===');
        this.currentSequence = '';
        this.detectionHistory = [];
        this.signalHistory = [];
        this.lastState = false;
        this.lastTransition = Date.now();
        
        // Reset calibration data
        this.baselineBrightness = 0;
        this.maxBrightness = 0;
        this.calibrationSamples = 0;
        this.isCalibrated = false;
        this.brightnessThreshold = 0.5; // Reset to default
        
        // Log current timing settings
        if (this.morseCode) {
            console.log('Timing thresholds for', this.morseCode.getSpeed(), 'WPM:');
            console.log('- Dot threshold:', this.dotThreshold, 'ms');
            console.log('- Letter gap:', this.letterGapThreshold, 'ms');
            console.log('- Word gap:', this.wordGapThreshold, 'ms');
            console.log('- Min signal:', this.minSignalDuration, 'ms');
        }
    }
}