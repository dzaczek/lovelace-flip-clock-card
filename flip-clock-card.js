/**
 * Flip Clock Card for Home Assistant
 * Version: 25.0.3-beta
 * A retro-style flip clock card with 3D animations
 */
class FlipClockCard extends HTMLElement {
    constructor() {
        super();
        this.timer = null;
        this.observer = null;
        this.currentDigits = { h1: null, h2: null, m1: null, m2: null, s1: null, s2: null };
        this.debug = false; // Set to true for development debugging
        this.digitElementsCache = {}; // Cache for DOM elements to avoid repeated queries
        this.version = '25.0.3-beta';
    }

    /**
     * Sanitize CSS value to prevent injection attacks
     * @param {string} value - CSS value to sanitize
     * @returns {string} - Sanitized CSS value
     */
    sanitizeCSSValue(value) {
        if (typeof value !== 'string') return '';
        // Remove potentially dangerous characters and patterns
        return value
            .replace(/[<>'"`]/g, '') // Remove HTML/JS injection chars
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/expression\s*\(/gi, '') // Remove CSS expressions
            .replace(/url\s*\(\s*['"]?javascript:/gi, '') // Remove javascript URLs
            .trim();
    }

    /**
     * Validate and sanitize color value (hex, rgb, rgba, or named color)
     * @param {string} color - Color value to validate
     * @returns {string} - Validated color or empty string
     */
    validateColor(color) {
        if (typeof color !== 'string') return '';
        const sanitized = this.sanitizeCSSValue(color);
        // Match hex, rgb, rgba, hsl, hsla, or named colors
        const colorRegex = /^(#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)|[a-zA-Z]+)$/;
        return colorRegex.test(sanitized) ? sanitized : '';
    }

    /**
     * Validate and sanitize font-family value
     * @param {string} font - Font family to validate
     * @returns {string} - Validated font or empty string
     */
    validateFontFamily(font) {
        if (typeof font !== 'string') return '';
        const sanitized = this.sanitizeCSSValue(font);
        // Allow alphanumeric, spaces, hyphens, commas, quotes for font names
        const fontRegex = /^[a-zA-Z0-9\s\-,'"]+$/;
        return fontRegex.test(sanitized) ? sanitized : '';
    }

    /**
     * Validate number within range
     * @param {*} value - Value to validate
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @param {number} defaultValue - Default if invalid
     * @returns {number} - Validated number
     */
    validateNumber(value, min, max, defaultValue) {
        const num = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(num) || num < min || num > max) {
            return defaultValue;
        }
        return num;
    }

    /**
     * Validate theme name against whitelist
     * @param {string} theme - Theme name to validate
     * @returns {string} - Valid theme or 'classic' as default
     */
    validateTheme(theme) {
        const validThemes = [
            'classic', 'ios-light', 'ios-dark', 'neon', 'red-stealth',
            'synthwave', 'e-ink', 'terminal', 'wood', 'trek-orange',
            'trek-red', 'trek-blue', 'borg', 'aviator'
        ];
        return typeof theme === 'string' && validThemes.includes(theme) ? theme : 'classic';
    }

    /**
     * Sanitize custom style object
     * @param {object} customStyle - Custom style object to sanitize
     * @returns {object} - Sanitized custom style object
     */
    sanitizeCustomStyle(customStyle) {
        if (!customStyle || typeof customStyle !== 'object') return null;
        
        const sanitized = {};
        if (customStyle.bg !== undefined) {
            const bg = this.validateColor(customStyle.bg);
            if (bg) sanitized.bg = bg;
        }
        if (customStyle.text !== undefined) {
            const text = this.validateColor(customStyle.text);
            if (text) sanitized.text = text;
        }
        if (customStyle.font !== undefined) {
            const font = this.validateFontFamily(customStyle.font);
            if (font) sanitized.font = font;
        }
        if (customStyle.radius !== undefined) {
            const radius = this.validateNumber(customStyle.radius, 0, 1, 0.1);
            sanitized.radius = String(radius);
        }
        if (customStyle.shadow !== undefined) {
            sanitized.shadow = this.sanitizeCSSValue(customStyle.shadow);
        }
        if (customStyle.line !== undefined) {
            const line = this.validateColor(customStyle.line);
            if (line) sanitized.line = line;
        }
        if (customStyle.glow !== undefined) {
            sanitized.glow = this.sanitizeCSSValue(customStyle.glow);
        }
        
        return Object.keys(sanitized).length > 0 ? sanitized : null;
    }

    setConfig(config) {
        try {
            // Configuration parameters with validation
            this.config = config || {};
            
            // Validate and sanitize size (10-500px range)
            this.card_size = this.validateNumber(config?.size, 10, 500, 100);
            
            // Validate time_format (only '12' or '24')
            this.time_format = (config?.time_format === '12' || config?.time_format === '24') 
                ? config.time_format 
                : '24';
            
            // Validate show_seconds (boolean)
            this.show_seconds = config?.show_seconds === true || config?.show_seconds === 'true';
            
            // Validate and sanitize animation_speed (0.1-2.0 seconds range)
            this.anim_speed = this.validateNumber(config?.animation_speed, 0.1, 2.0, 0.6);
            
            // Validate theme against whitelist
            this.theme = this.validateTheme(config?.theme);
            
            // Sanitize custom_style
            this.custom_style = this.sanitizeCustomStyle(config?.custom_style);

            // Reset the element if reconfigured
            if (this.content) {
                this.content.remove();
                this.content = null;
                // Clear element cache on reconfiguration
                this.digitElementsCache = {};
                // Stop observer and timer if reconfiguring the card
                if (this.observer) this.observer.disconnect();
                if (this.timer) clearInterval(this.timer);
                this.timer = null;
            }
            
            this.render();
        } catch (error) {
            // Fallback to safe defaults on error
            this.card_size = 100;
            this.time_format = '24';
            this.show_seconds = false;
            this.anim_speed = 0.6;
            this.theme = 'classic';
            this.custom_style = null;
            if (this.debug) {
                console.error("FlipClockCard: Configuration error:", error);
            }
            this.render();
        }
    }

    render() {
        try {
            if (!this.content) {
                if (!this.shadowRoot) {
                    this.attachShadow({ mode: 'open' });
                }

            const halfSpeed = this.anim_speed / 2;

            // --- 1. PREDEFINED THEMES (STYLES) ---
            const themes = {
                'classic': {
                    bg: '#333',
                    text: '#eee',
                    font: "'Roboto Mono', monospace",
                    radius: '0.1',
                    shadow: '0 4px 10px rgba(0,0,0,0.5)',
                    line: 'rgba(0,0,0,0.4)',
                    glow: 'none'
                },
                'ios-light': {
                    bg: '#ffffff',
                    text: '#1c1c1e',
                    font: "-apple-system, sans-serif",
                    radius: '0.15',
                    shadow: '0 8px 20px rgba(0,0,0,0.15)',
                    line: 'rgba(0,0,0,0.1)',
                    glow: 'none'
                },
                'ios-dark': {
                    bg: '#1c1c1e',
                    text: '#ffffff',
                    font: "-apple-system, sans-serif",
                    radius: '0.15',
                    shadow: '0 8px 20px rgba(0,0,0,0.4)',
                    line: 'rgba(255,255,255,0.1)',
                    glow: 'none'
                },
                'neon': {
                    bg: '#000000',
                    text: '#39ff14',
                    font: "'Courier New', monospace",
                    radius: '0.05',
                    shadow: '0 0 15px rgba(57, 255, 20, 0.3)',
                    line: 'rgba(57, 255, 20, 0.2)',
                    glow: '0 0 10px rgba(57, 255, 20, 0.8)'
                },
                'red-stealth': {
                    bg: '#0f0f0f',
                    text: '#ff3b30',
                    font: "'Courier New', monospace",
                    radius: '0.05',
                    shadow: '0 0 10px rgba(255, 0, 0, 0.2)',
                    line: 'rgba(255, 0, 0, 0.15)',
                    glow: '0 0 5px rgba(255, 59, 48, 0.6)'
                },
                'synthwave': {
                    bg: '#240046',
                    text: '#ff00ff',
                    font: "sans-serif",
                    radius: '0.1',
                    shadow: '0 5px 15px rgba(255, 0, 255, 0.4)',
                    line: 'rgba(255, 0, 255, 0.3)',
                    glow: '0 0 8px rgba(255, 0, 255, 0.7)'
                },
                'e-ink': {
                    bg: '#f4f4f4',
                    text: '#111',
                    font: "'Times New Roman', serif",
                    radius: '0.02',
                    shadow: 'none',
                    line: 'rgba(0,0,0,0.8)',
                    glow: 'none'
                },
                'terminal': {
                    bg: '#000000',
                    text: '#33ff00',
                    font: "'Lucida Console', Monaco, monospace",
                    radius: '0',
                    shadow: 'none',
                    line: 'rgba(51, 255, 0, 0.3)',
                    glow: 'none'
                },
                'wood': {
                    bg: '#4e342e',
                    text: '#d7ccc8',
                    font: "serif",
                    radius: '0.12',
                    shadow: '0 4px 8px rgba(0,0,0,0.6)',
                    line: 'rgba(0,0,0,0.5)',
                    glow: 'none'
                },
                'trek-orange': {
                    bg: '#ff9900',
                    text: '#000000',
                    font: "'Antonio', 'Arial Narrow', sans-serif",
                    radius: '0.3',
                    shadow: 'none',
                    line: 'rgba(0,0,0,0.2)',
                    glow: 'none'
                },
                'trek-red': {
                    bg: '#cc2200',
                    text: '#000000',
                    font: "'Antonio', 'Arial Narrow', sans-serif",
                    radius: '0.3',
                    shadow: 'none',
                    line: 'rgba(0,0,0,0.2)',
                    glow: 'none'
                },
                'trek-blue': {
                    bg: '#99ccff',
                    text: '#000000',
                    font: "'Antonio', 'Arial Narrow', sans-serif",
                    radius: '0.3',
                    shadow: 'none',
                    line: 'rgba(0,0,0,0.2)',
                    glow: 'none'
                },
                'borg': {
                    bg: '#000000',
                    text: '#44ff44',
                    font: "'Consolas', 'Lucida Console', monospace",
                    radius: '0',
                    shadow: '0 0 5px #00aa00, inset 0 0 20px rgba(0,50,0, 0.9)', 
                    line: 'rgba(0, 255, 0, 0.3)',
                    glow: '0 0 8px rgba(50, 255, 50, 0.6)'
                },
                'aviator': {
                    bg: '#1e1e1e',
                    text: '#f0f0f0',
                    font: "'Oswald', sans-serif",
                    radius: '0.05',
                    shadow: '0 2px 4px rgba(0,0,0,0.6)', 
                    line: 'rgba(255, 255, 255, 0.1)',
                    glow: 'none'
                }
            };
            
            // --- 2. STYLE MERGING LOGIC ---
            let base = themes[this.theme] || themes['classic'];
            let t = this.custom_style ? { ...base, ...this.custom_style } : base;

            // Sanitize all CSS values before inserting into template
            const sanitizedCardSize = this.validateNumber(this.card_size, 10, 500, 100);
            const sanitizedHalfSpeed = this.validateNumber(halfSpeed, 0.05, 1.0, 0.3);
            const sanitizedBg = this.validateColor(t.bg) || base.bg;
            const sanitizedText = this.validateColor(t.text) || base.text;
            const sanitizedFont = this.validateFontFamily(t.font) || base.font;
            const sanitizedRadius = this.validateNumber(parseFloat(t.radius), 0, 1, 0.1);
            const sanitizedShadow = this.sanitizeCSSValue(t.shadow) || base.shadow;
            const sanitizedLine = this.validateColor(t.line) || base.line;
            const sanitizedGlow = this.sanitizeCSSValue(t.glow) || base.glow;

            const style = document.createElement('style');
            style.textContent = `
                @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap');
                
                :host {
                    display: block;
                    --card-size: ${sanitizedCardSize}px;
                    --flip-bg: ${sanitizedBg};
                    --flip-text: ${sanitizedText};
                    --flip-font: ${sanitizedFont};
                    --flip-radius: calc(var(--card-size) * ${sanitizedRadius});
                    --flip-shadow: ${sanitizedShadow};
                    --flip-line: ${sanitizedLine};
                    --flip-glow: ${sanitizedGlow};
                    --half-speed: ${sanitizedHalfSpeed}s; 
                }
                .clock-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                    background: transparent;
                    perspective: 1000px;
                }
                .digit-group {
                    display: flex;
                    gap: calc(var(--card-size) * 0.15);
                }
                .separator {
                    font-size: calc(var(--card-size) * 0.6);
                    color: var(--flip-text);
                    margin: 0 8px;
                    font-weight: bold;
                    padding-top: calc(var(--card-size) * 0.1);
                    font-family: var(--flip-font);
                    text-shadow: var(--flip-glow);
                    
                    /* Separator logic for Trek and Borg themes */
                    ${(this.theme.startsWith('trek') && !this.custom_style) ? `color: ${sanitizedBg}; opacity: 0.8;` : ''}
                    ${this.theme === 'borg' ? `text-shadow: 0 0 10px ${sanitizedText};` : ''}
                }

                .flip-unit {
                    position: relative;
                    width: calc(var(--card-size) * 0.7);
                    height: var(--card-size);
                    font-family: var(--flip-font);
                    font-weight: 700;
                    font-size: calc(var(--card-size) * 0.8);
                    border-radius: var(--flip-radius);
                    background: var(--flip-bg);
                    color: var(--flip-text);
                    box-shadow: var(--flip-shadow);
                    text-shadow: var(--flip-glow);
                    transform-style: preserve-3d;
                }

                .upper, .lower {
                    position: absolute;
                    left: 0;
                    width: 100%;
                    height: 50%;
                    overflow: hidden;
                    background: var(--flip-bg);
                    -webkit-backface-visibility: hidden;
                    backface-visibility: hidden;
                }

                /* BORG SPECIAL BORDER */
                ${this.theme === 'borg' ? `
                    .upper, .lower { border: 1px solid rgba(0, 255, 0, 0.3); }
                    .upper { border-bottom: none; }
                    .lower { border-top: none; }
                ` : ''}

                .upper {
                    top: 0;
                    border-radius: var(--flip-radius) var(--flip-radius) 0 0;
                    transform-origin: 50% 100%;
                    z-index: 1;
                }
                
                .lower {
                    bottom: 0;
                    border-radius: 0 0 var(--flip-radius) var(--flip-radius);
                    transform-origin: 50% 0%;
                    z-index: 1;
                }

                .upper span, .lower span {
                    display: flex;
                    justify-content: center;
                    width: 100%;
                    height: 200%;
                    line-height: var(--card-size);
                    align-items: center;
                }
                .upper span { transform: translateY(0); }
                .lower span { transform: translateY(-50%); }

                .upper::after {
                    content: "";
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    height: 1px;
                    background: var(--flip-line);
                }

                .upper-back, .lower-back { z-index: 1; }
                
                .upper.flip-card { 
                    z-index: 10; 
                    transform-origin: bottom;
                    will-change: transform;
                }
                .lower.flip-card { 
                    z-index: 10; 
                    transform-origin: top; 
                    transform: rotateX(90deg);
                    will-change: transform;
                }
                
                .flip-down-top {
                    animation: rotateTop var(--half-speed) linear forwards;
                    will-change: transform;
                }

                .flip-down-bottom {
                    animation: rotateBottom var(--half-speed) linear forwards; 
                    animation-delay: var(--half-speed);
                    will-change: transform;
                }

                @keyframes rotateTop {
                    0% { transform: rotateX(0deg); }
                    100% { transform: rotateX(-90deg); }
                }

                @keyframes rotateBottom {
                    0% { transform: rotateX(90deg); }
                    60% { transform: rotateX(0deg); }
                    80% { transform: rotateX(15deg); }
                    100% { transform: rotateX(0deg); }
                }
            `;
            
            // --- 3. HTML STRUCTURE ---
            const container = document.createElement('div');
            container.className = 'clock-container';
            
            const createDigitHtml = (id) => `
                <div class="flip-unit" id="${id}">
                    <div class="upper upper-back"><span>0</span></div>
                    <div class="lower lower-back"><span>0</span></div>
                    <div class="upper flip-card"><span>0</span></div>
                    <div class="lower flip-card"><span>0</span></div>
                </div>
            `;

            let html = `
                <div class="digit-group">
                    ${createDigitHtml('h1')}
                    ${createDigitHtml('h2')}
                </div>
                <div class="separator">:</div>
                <div class="digit-group">
                    ${createDigitHtml('m1')}
                    ${createDigitHtml('m2')}
                </div>
            `;

            if (this.show_seconds) {
                html += `
                    <div class="separator">:</div>
                    <div class="digit-group">
                        ${createDigitHtml('s1')}
                        ${createDigitHtml('s2')}
                    </div>
                `;
            }

            container.innerHTML = html;
            this.shadowRoot.innerHTML = ''; 
                this.shadowRoot.appendChild(style);
                this.shadowRoot.appendChild(container);
                this.content = container;
                
                // Cache DOM elements for performance
                this.cacheDigitElements();
            }
            if (this.debug) {
                console.log("🛠️ FlipClockCard: HTML RENDERED.");
            }
        } catch (error) {
            if (this.debug) {
                console.error("FlipClockCard: Render error:", error);
            }
        }
    }

    /**
     * Cache DOM elements for all digits to avoid repeated queries
     */
    cacheDigitElements() {
        if (!this.shadowRoot) return;
        
        const digitIds = ['h1', 'h2', 'm1', 'm2'];
        if (this.show_seconds) {
            digitIds.push('s1', 's2');
        }
        
        digitIds.forEach(id => {
            const el = this.shadowRoot.getElementById(id);
            if (el) {
                this.digitElementsCache[id] = {
                    element: el,
                    topBack: el.querySelector('.upper-back span'),
                    bottomBack: el.querySelector('.lower-back span'),
                    topFlip: el.querySelector('.upper.flip-card span'),
                    bottomFlip: el.querySelector('.lower.flip-card span'),
                    topFlipCard: el.querySelector('.upper.flip-card'),
                    bottomFlipCard: el.querySelector('.lower.flip-card')
                };
            }
        });
    }

    startClock() {
        if (this.timer) {
            if (this.debug) {
                console.log("⚠️ FlipClockCard: TIMER ALREADY RUNNING. Aborting start.");
            }
            return;
        }

        const update = () => {
            try {
                const now = new Date();
                let h = now.getHours();
                // 12-hour format logic
                if (this.time_format === '12') h = h % 12 || 12;
                
                const hStr = String(h).padStart(2, '0');
                const mStr = String(now.getMinutes()).padStart(2, '0');
                const sStr = String(now.getSeconds()).padStart(2, '0');
                
                this.updateDigit('h1', hStr[0]);
                this.updateDigit('h2', hStr[1]);
                this.updateDigit('m1', mStr[0]);
                this.updateDigit('m2', mStr[1]);

                if (this.show_seconds) {
                    this.updateDigit('s1', sStr[0]);
                    this.updateDigit('s2', sStr[1]);
                }
            } catch (error) {
                if (this.debug) {
                    console.error("FlipClockCard: Clock update error:", error);
                }
            }
        };
        
        try {
            update(); 
            this.timer = setInterval(update, 1000); 
            if (this.debug) {
                console.log("🟢 FlipClockCard: TIMER STARTED!");
            }
        } catch (error) {
            if (this.debug) {
                console.error("FlipClockCard: Error starting clock:", error);
            }
        }
    }

    stopClock() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            if (this.debug) {
                console.log("🔴 FlipClockCard: TIMER STOPPED!");
            }
        }
    }

    updateDigit(id, newValue) {
        if (this.currentDigits[id] !== newValue) {
            try {
                // Use cached elements if available, otherwise fallback to query
                let cached = this.digitElementsCache[id];
                
                if (!cached) {
                    // Fallback: query elements if cache is missing
                    if (!this.shadowRoot) return;
                    
                    const el = this.shadowRoot.getElementById(id);
                    if (!el) {
                        if (this.debug) {
                            console.warn(`FlipClockCard: Element with id '${id}' not found`);
                        }
                        return;
                    }
                    
                    cached = {
                        element: el,
                        topBack: el.querySelector('.upper-back span'),
                        bottomBack: el.querySelector('.lower-back span'),
                        topFlip: el.querySelector('.upper.flip-card span'),
                        bottomFlip: el.querySelector('.lower.flip-card span'),
                        topFlipCard: el.querySelector('.upper.flip-card'),
                        bottomFlipCard: el.querySelector('.lower.flip-card')
                    };
                    
                    // Cache for future use
                    this.digitElementsCache[id] = cached;
                }

                if (!cached.topBack || !cached.bottomBack || !cached.topFlip || !cached.bottomFlip) {
                    if (this.debug) {
                        console.warn(`FlipClockCard: Missing required elements for digit '${id}'`);
                    }
                    return;
                }

                const previousValue = this.currentDigits[id] === null ? newValue : this.currentDigits[id];
                this.currentDigits[id] = newValue;

                cached.topBack.textContent = newValue;
                cached.bottomBack.textContent = previousValue; 
                cached.topFlip.textContent = previousValue;
                cached.bottomFlip.textContent = newValue;

                if (!cached.topFlipCard || !cached.bottomFlipCard) {
                    if (this.debug) {
                        console.warn(`FlipClockCard: Missing flip card elements for digit '${id}'`);
                    }
                    return;
                }

                cached.topFlipCard.classList.remove('flip-down-top');
                cached.bottomFlipCard.classList.remove('flip-down-bottom');
                
                // Forces reflow (restarts CSS animation)
                void cached.element.offsetWidth;

                cached.topFlipCard.classList.add('flip-down-top');
                cached.bottomFlipCard.classList.add('flip-down-bottom');
            } catch (error) {
                if (this.debug) {
                    console.error(`FlipClockCard: Error updating digit '${id}':`, error);
                }
            }
        }
    }

    /**
     * NEW: Intersection Observer Callback
     * Called when element visibility changes.
     */
    handleIntersection(entries) {
        try {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Element is visible in the viewport (Returning to the card/dashboard)
                    this.startClock();
                } else {
                    // Element is not visible (Hidden, scrolled out, on another tab)
                    this.stopClock();
                }
            });
        } catch (error) {
            if (this.debug) {
                console.error("FlipClockCard: Intersection observer error:", error);
            }
        }
    }

    /**
     * OVERRIDE connectedCallback: Initializes the Observer
     * This runs when the card is added to the DOM tree (or re-added).
     */
    connectedCallback() {
        if (typeof IntersectionObserver === 'undefined') {
            if (this.debug) {
                console.error("❌ FlipClockCard: IntersectionObserver is not supported in this environment! Starting timer permanently.");
            }
            // Fallback: Start timer permanently if IO is missing
            this.startClock(); 
            return;
        }

        if (!this.observer) {
            try {
                // Create the observer to watch if the element is visible (threshold: 0.1 = 10% visible)
                this.observer = new IntersectionObserver(this.handleIntersection.bind(this), { threshold: 0.1 });
                this.observer.observe(this);
                if (this.debug) {
                    console.log("👀 FlipClockCard: OBSERVER INITIALIZED.");
                }
            } catch (error) {
                if (this.debug) {
                    console.error("FlipClockCard: Observer initialization error:", error);
                }
                // Fallback to permanent timer
                this.startClock();
            }
        }
    }

    /**
     * OVERRIDE disconnectedCallback: Disconnects the Observer
     * This runs when the card is removed from the DOM tree (or hidden).
     */
    disconnectedCallback() {
        if (this.observer) {
            try {
                this.observer.disconnect();
                this.observer = null;
                if (this.debug) {
                    console.log("👋 FlipClockCard: OBSERVER DISCONNECTED.");
                }
            } catch (error) {
                if (this.debug) {
                    console.error("FlipClockCard: Observer disconnect error:", error);
                }
            }
        }
        this.stopClock();
        // Stop timer as a final measure
    }

    getCardSize() {
        return 3;
    }
}

customElements.define('flip-clock-card', FlipClockCard);
