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
                    .map(symbol => {
                        if (!symbol) return '';
                        
                        // Use fuzzy matching for better accuracy
                        const match = this.findBestMatch(symbol, 0.6);
                        return match.char || '?';
                    })
                    .join('')
            )
            .join(' ');
    }
    
    // Improved decoding with confidence tracking
    morseToTextWithConfidence(morse) {
        const words = morse.split(' / ');
        const results = [];
        
        for (const word of words) {
            const letters = word.split(' ');
            const wordResult = {
                text: '',
                confidence: 0,
                letterDetails: []
            };
            
            let totalConfidence = 0;
            for (const symbol of letters) {
                if (!symbol) continue;
                
                const match = this.findBestMatch(symbol, 0.5);
                wordResult.text += match.char || '?';
                wordResult.letterDetails.push({
                    pattern: symbol,
                    char: match.char || '?',
                    confidence: match.confidence,
                    alternatives: match.matches
                });
                totalConfidence += match.confidence;
            }
            
            wordResult.confidence = letters.length > 0 ? totalConfidence / letters.length : 0;
            results.push(wordResult);
        }
        
        return {
            text: results.map(r => r.text).join(' '),
            words: results,
            overallConfidence: results.length > 0 ? 
                results.reduce((sum, r) => sum + r.confidence, 0) / results.length : 0
        };
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
    
    // Calculate similarity between two morse patterns
    calculatePatternSimilarity(pattern1, pattern2) {
        if (pattern1 === pattern2) return 1.0;
        
        const len1 = pattern1.length;
        const len2 = pattern2.length;
        const maxLen = Math.max(len1, len2);
        
        if (maxLen === 0) return 1.0;
        
        // Levenshtein distance for morse patterns
        const matrix = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0));
        
        for (let i = 0; i <= len1; i++) matrix[i][0] = i;
        for (let j = 0; j <= len2; j++) matrix[0][j] = j;
        
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = pattern1[i - 1] === pattern2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,     // deletion
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j - 1] + cost // substitution
                );
            }
        }
        
        const distance = matrix[len1][len2];
        return 1.0 - (distance / maxLen);
    }
    
    // Find best matching character with confidence score
    findBestMatch(morsePattern, minConfidence = 0.7) {
        if (!morsePattern || morsePattern.length === 0) {
            return { char: '', confidence: 0, matches: [] };
        }
        
        // Direct match first
        if (this.reverseMap[morsePattern]) {
            return {
                char: this.reverseMap[morsePattern],
                confidence: 1.0,
                matches: [{
                    char: this.reverseMap[morsePattern],
                    pattern: morsePattern,
                    confidence: 1.0,
                    type: 'exact'
                }]
            };
        }
        
        // Fuzzy matching
        const candidates = [];
        for (const [pattern, char] of Object.entries(this.reverseMap)) {
            const similarity = this.calculatePatternSimilarity(morsePattern, pattern);
            if (similarity >= minConfidence) {
                candidates.push({
                    char,
                    pattern,
                    confidence: similarity,
                    type: 'fuzzy'
                });
            }
        }
        
        // Sort by confidence
        candidates.sort((a, b) => b.confidence - a.confidence);
        
        return {
            char: candidates.length > 0 ? candidates[0].char : '',
            confidence: candidates.length > 0 ? candidates[0].confidence : 0,
            matches: candidates.slice(0, 3) // Top 3 matches
        };
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
        
        // Timing analysis and confidence scoring
        this.dotDurations = [];
        this.dashDurations = [];
        this.maxTimingSamples = 20;
        this.timingConfidence = 0;
        
        // Adaptive timing tolerance
        this.timingTolerance = 0.3; // 30% tolerance initially
        this.adaptiveDotThreshold = null;
        
        // Sequence stabilization to prevent rapid changes
        this.stableSequence = '';
        this.sequenceConfirmCount = 0;
        this.requiredConfirmCount = 2; // Require 2 consistent readings
        
        // Dynamic timing based on Morse code speed
        this.morseCode = morseCodeInstance;
        this.updateTimingThresholds();
    }
    
    updateTimingThresholds() {
        if (this.morseCode) {
            const unit = this.morseCode.unit;
            // Timing thresholds for signal detection
            this.minSignalDuration = Math.max(unit * 0.4, 40); // Increased from 0.3 to be more conservative
            
            // Critical fix: dot threshold should be between dot (1 unit) and dash (3 units)
            // Set it at 1.8 units to be more conservative about dots
            this.dotThreshold = unit * 1.8; // 1.8 units - closer to dot duration
            
            // More conservative gap detection thresholds to reduce false boundaries
            this.letterGapThreshold = unit * 3.5; // Increased from 2.5 to 3.5 units
            this.wordGapThreshold = unit * 6.5; // Increased from 5 to 6.5 units  
            this.maxGapDuration = unit * 12; // Increased from 10 to 12 units
            
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
                
                // Only process signals that meet minimum duration
                if (timeSinceLastTransition >= this.minSignalDuration) {
                    // Adaptive timing analysis
                    const confidence = this.analyzeSignalConfidence(timeSinceLastTransition);
                    const isActualDot = this.classifySignal(timeSinceLastTransition);
                    const symbol = isActualDot ? '.' : '-';
                    
                    // Learn from this signal to improve future detection
                    this.learnFromSignal(timeSinceLastTransition, isActualDot);
                    
                    console.log('  DECISION:', isActualDot ? 'DOT (.)' : 'DASH (-)');
                    console.log('  Confidence:', (confidence * 100).toFixed(1) + '%');
                    console.log('  Reason: duration', timeSinceLastTransition, isActualDot ? '<' : '≥', this.getEffectiveThreshold());
                    
                    this.currentSequence += symbol;
                    console.log('  ✓ Current sequence:', this.currentSequence);
                    
                    // Try to decode current letter if we have symbols
                    const lastWord = this.currentSequence.split(' / ').pop();
                    const letters = lastWord.split(' ');
                    const currentLetter = letters[letters.length - 1];
                    if (currentLetter && this.morseCode) {
                        const matchResult = this.morseCode.findBestMatch(currentLetter);
                        if (matchResult.char && matchResult.confidence >= 0.7) {
                            const matchType = matchResult.confidence === 1.0 ? '✅ EXACT' : '🔍 FUZZY';
                            console.log(`  ${matchType} match:`, currentLetter, '→', matchResult.char, 
                                       `(${(matchResult.confidence * 100).toFixed(1)}%)`);
                            
                            if (matchResult.matches.length > 1) {
                                console.log('     Alternatives:', 
                                    matchResult.matches.slice(1).map(m => 
                                        `${m.pattern}→${m.char} (${(m.confidence * 100).toFixed(1)}%)`
                                    ).join(', ')
                                );
                            }
                        } else {
                            console.log('  ❌ No confident match for:', currentLetter);
                            if (matchResult.matches.length > 0) {
                                console.log('     Low confidence matches:', 
                                    matchResult.matches.map(m => 
                                        `${m.pattern}→${m.char} (${(m.confidence * 100).toFixed(1)}%)`
                                    ).join(', ')
                                );
                            }
                        }
                    }
                } else {
                    console.log('  ⚠️ Signal too short (<', this.minSignalDuration, 'ms), ignoring');
                }
            }
            
            this.lastState = isSignalOn;
            this.lastTransition = currentTime;
        }
        
        // Stabilize sequence output to prevent rapid changes
        const currentTrimmed = this.currentSequence.trim();
        let outputSequence = currentTrimmed;
        
        if (currentTrimmed === this.stableSequence) {
            this.sequenceConfirmCount++;
        } else {
            this.stableSequence = currentTrimmed;
            this.sequenceConfirmCount = 1;
        }
        
        // Only output stable sequences that have been confirmed multiple times
        if (this.sequenceConfirmCount < this.requiredConfirmCount && this.stableSequence.length > 0) {
            // Keep previous stable sequence until new one is confirmed
            outputSequence = this.lastStableOutput || '';
        } else if (this.sequenceConfirmCount >= this.requiredConfirmCount) {
            this.lastStableOutput = currentTrimmed;
            outputSequence = currentTrimmed;
        }
        
        return {
            brightness: brightness,
            threshold: this.brightnessThreshold,
            isSignalDetected: isSignalOn,
            sequence: outputSequence,
            debug: debugData,
            timingConfidence: this.timingConfidence
        };
    }
    
    classifySignal(duration) {
        const threshold = this.getEffectiveThreshold();
        return duration < threshold;
    }
    
    getEffectiveThreshold() {
        return this.adaptiveDotThreshold || this.dotThreshold;
    }
    
    analyzeSignalConfidence(duration) {
        const expectedDot = this.morseCode ? this.morseCode.dotDuration : 120;
        const expectedDash = this.morseCode ? this.morseCode.dashDuration : 360;
        
        // Calculate how close this duration is to expected values
        const dotDistance = Math.abs(duration - expectedDot) / expectedDot;
        const dashDistance = Math.abs(duration - expectedDash) / expectedDash;
        
        const minDistance = Math.min(dotDistance, dashDistance);
        return Math.max(0, 1 - minDistance);
    }
    
    learnFromSignal(duration, isDot) {
        // Add to appropriate timing history
        if (isDot) {
            this.dotDurations.push(duration);
            if (this.dotDurations.length > this.maxTimingSamples) {
                this.dotDurations.shift();
            }
        } else {
            this.dashDurations.push(duration);
            if (this.dashDurations.length > this.maxTimingSamples) {
                this.dashDurations.shift();
            }
        }
        
        // Update adaptive threshold if we have enough samples
        if (this.dotDurations.length >= 5 && this.dashDurations.length >= 5) {
            this.updateAdaptiveThreshold();
        }
    }
    
    updateAdaptiveThreshold() {
        const avgDot = this.dotDurations.reduce((a, b) => a + b, 0) / this.dotDurations.length;
        const avgDash = this.dashDurations.reduce((a, b) => a + b, 0) / this.dashDurations.length;
        
        // Set threshold at midpoint between average dot and dash durations
        this.adaptiveDotThreshold = (avgDot + avgDash) / 2;
        
        // Calculate timing confidence based on separation
        const separation = Math.abs(avgDash - avgDot);
        const expectedSeparation = this.morseCode ? (this.morseCode.dashDuration - this.morseCode.dotDuration) : 240;
        this.timingConfidence = Math.min(1.0, separation / expectedSeparation);
        
        console.log('📊 Adaptive timing update:', {
            avgDot: avgDot.toFixed(1) + 'ms',
            avgDash: avgDash.toFixed(1) + 'ms',
            newThreshold: this.adaptiveDotThreshold.toFixed(1) + 'ms',
            confidence: (this.timingConfidence * 100).toFixed(1) + '%'
        });
    }
    
    // Error correction and validation methods
    validateAndCorrectSequence(sequence) {
        console.log('🔍 Validating sequence:', sequence);
        
        // First clean up the sequence
        const cleanedSequence = this.cleanupSequence(sequence);
        console.log('🧹 Cleaned sequence:', cleanedSequence);
        
        const words = cleanedSequence.split(' / ');
        const correctedWords = words.map(word => this.correctWord(word.trim())).filter(w => w);
        const result = correctedWords.join(' / ');
        
        console.log('✅ Corrected sequence:', result);
        return result;
    }
    
    cleanupSequence(sequence) {
        if (!sequence) return '';
        
        // Remove excessive spaces and normalize gaps
        let cleaned = sequence
            .replace(/\s+/g, ' ')  // Multiple spaces to single space
            .replace(/\s+\/\s+/g, ' / ')  // Normalize word separators
            .replace(/\/+/g, ' / ')  // Multiple slashes to single
            .trim();
        
        // Remove empty patterns and invalid characters
        const words = cleaned.split(' / ');
        const validWords = words.map(word => {
            const letters = word.split(' ').filter(letter => {
                // Only keep valid morse patterns (dots and dashes)
                return letter && /^[.\-]+$/.test(letter) && letter.length <= 6;  // Max 6 symbols per letter
            });
            return letters.join(' ');
        }).filter(word => word.length > 0);
        
        return validWords.join(' / ');
    }
    
    correctWord(word) {
        if (!word) return '';
        
        const letters = word.split(' ').filter(l => l);
        const correctedLetters = [];
        
        for (let i = 0; i < letters.length; i++) {
            const letter = letters[i];
            const match = this.morseCode.findBestMatch(letter, 0.4);
            
            if (match.char && match.confidence >= 0.6) {
                correctedLetters.push({
                    original: letter,
                    corrected: match.matches[0].pattern,
                    char: match.char,
                    confidence: match.confidence
                });
            } else {
                // Try context-based correction
                const contextMatch = this.tryContextCorrection(letter, letters, i);
                if (contextMatch) {
                    correctedLetters.push(contextMatch);
                } else {
                    console.log('❌ Could not correct pattern:', letter);
                    // Include as-is for debugging
                    correctedLetters.push({
                        original: letter,
                        corrected: letter,
                        char: '?',
                        confidence: 0
                    });
                }
            }
        }
        
        return correctedLetters.map(l => l.corrected).join(' ');
    }
    
    tryContextCorrection(pattern, allLetters, position) {
        // Try to correct based on context and common patterns
        console.log('🔧 Attempting context correction for:', pattern);
        
        // Common corrections for timing issues
        const corrections = {
            // Common timing errors - more comprehensive
            '.--.': '.--.',    // P correction (missing final dot)
            '....-': '....',   // H correction (extra dash)
            '.-.-.': '.-.',    // R correction (extra dot-dash)
            '--.-.': '--.',    // G correction (extra dot-dash)
            '-----': '----.',  // 9 correction (missing final dot)
            '.....-': '.....',  // 5 correction (extra dash)
            
            // Letter boundary issues that cause ABCDEFGHIJK → MBCDEFGHIPTTET TI
            '..': '.-',       // A misheard as I
            '--': '-',        // M misheard as T  
            '.-..-.': '.-..',  // L misheard as L with extra pattern
            '.----.': '.---', // J misheard with extra dot
            
            // Common single character misinterpretations
            '': '.',           // Missing signal
            '.--.-.': '.--.',  // P with extra dash-dot
            '..-.-.': '..-.',  // F with extra dash-dot
            '-----.': '----.',  // 9 with extra dash
        };
        
        if (corrections[pattern]) {
            const correctedPattern = corrections[pattern];
            const match = this.morseCode.findBestMatch(correctedPattern);
            if (match.char) {
                console.log('✅ Context correction:', pattern, '→', correctedPattern, '→', match.char);
                return {
                    original: pattern,
                    corrected: correctedPattern,
                    char: match.char,
                    confidence: 0.8
                };
            }
        }
        
        // Try adding/removing single symbols
        const variations = [
            pattern + '.',      // Add dot
            pattern + '-',      // Add dash
            pattern.slice(0, -1), // Remove last symbol
            '.' + pattern,      // Prepend dot
            '-' + pattern       // Prepend dash
        ];
        
        for (const variation of variations) {
            const match = this.morseCode.findBestMatch(variation, 0.7);
            if (match.char && match.confidence >= 0.7) {
                console.log('✅ Variation correction:', pattern, '→', variation, '→', match.char);
                return {
                    original: pattern,
                    corrected: variation,
                    char: match.char,
                    confidence: match.confidence * 0.9 // Reduce confidence for variations
                };
            }
        }
        
        return null;
    }
    
    analyzeSequenceQuality(sequence) {
        const words = sequence.split(' / ');
        let totalLetters = 0;
        let recognizedLetters = 0;
        let totalConfidence = 0;
        
        for (const word of words) {
            const letters = word.split(' ').filter(l => l);
            for (const letter of letters) {
                totalLetters++;
                const match = this.morseCode.findBestMatch(letter, 0.4);
                if (match.char && match.confidence >= 0.6) {
                    recognizedLetters++;
                    totalConfidence += match.confidence;
                }
            }
        }
        
        const recognitionRate = totalLetters > 0 ? recognizedLetters / totalLetters : 0;
        const avgConfidence = recognizedLetters > 0 ? totalConfidence / recognizedLetters : 0;
        
        return {
            totalLetters,
            recognizedLetters,
            recognitionRate,
            avgConfidence,
            quality: Math.min(recognitionRate, avgConfidence)
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
        
        // Reset adaptive timing data
        this.dotDurations = [];
        this.dashDurations = [];
        this.timingConfidence = 0;
        this.adaptiveDotThreshold = null;
        
        // Reset sequence stabilization
        this.stableSequence = '';
        this.sequenceConfirmCount = 0;
        this.lastStableOutput = '';
        
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