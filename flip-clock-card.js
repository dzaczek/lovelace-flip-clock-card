/**
 * Flip Clock Card for Home Assistant
 * Version: 25.2.2-beta
 * A retro-style flip clock card with 3D animations
 * New: Added label_size parameter (20-100% of card size)
 * New: Removed show_utc/utc_label, added show_label & label_position
 * New: Multiple timezone label variants per timezone
 * New: Label positioning (right, left, top, bottom, right-vertical)
 * Fix: Prevent duplicate custom element registration in HA 25.x
 */
class FlipClockCard extends HTMLElement {
    constructor() {
        super();
        this.timer = null;
        this.observer = null;
        this.currentDigits = { h1: null, h2: null, m1: null, m2: null, s1: null, s2: null };
        this.debug = false; // Set to true for development debugging
        this.digitElementsCache = {}; // Cache for DOM elements to avoid repeated queries
        this.version = '25.2.2-beta';
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
     * Sanitize text content for safe rendering
     * @param {string} text - Text to sanitize
     * @returns {string} - Sanitized text
     */
    sanitizeText(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

            // Validate timezone (can be IANA identifier or object with timezone and label)
            if (config?.timezone) {
                if (typeof config.timezone === 'string') {
                    this.timezone = config.timezone;
                    this.timezone_label = null;
                } else if (typeof config.timezone === 'object' && config.timezone.value) {
                    this.timezone = config.timezone.value;
                    this.timezone_label = config.timezone.label || null;
                } else {
                    this.timezone = null;
                    this.timezone_label = null;
                }
            } else {
                this.timezone = null;
                this.timezone_label = null;
            }

            // Validate show_label (boolean)
            this.show_label = config?.show_label === true || config?.show_label === 'true';

            // Validate label_position
            const validPositions = ['right', 'left', 'top', 'bottom', 'right-vertical'];
            this.label_position = validPositions.includes(config?.label_position) 
                ? config.label_position 
                : 'right';

            // Validate label_size (percentage of card size: 20-100)
            this.label_size = this.validateNumber(config?.label_size, 20, 100, 35);

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
            this.timezone = null;
            this.timezone_label = null;
            this.show_label = false;
            this.label_position = 'right';
            this.label_size = 35;
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
                    --label-size: ${this.validateNumber(this.label_size, 20, 100, 35)}; 
                }
                .clock-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                    background: transparent;
                    perspective: 1000px;
                    flex-direction: ${this.label_position === 'top' || this.label_position === 'bottom' ? 'column' : 'row'};
                }
                .clock-wrapper {
                    display: flex;
                    align-items: center;
                    gap: calc(var(--card-size) * 0.15);
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

                .timezone-label {
                    font-size: calc(var(--card-size) * var(--label-size) / 100);
                    color: var(--flip-text);
                    font-weight: 600;
                    font-family: var(--flip-font);
                    text-shadow: var(--flip-glow);
                    opacity: 0.85;
                    letter-spacing: 0.05em;

                    ${(this.theme.startsWith('trek') && !this.custom_style) ? `color: ${sanitizedBg}; opacity: 0.7;` : ''}
                    ${this.theme === 'borg' ? `text-shadow: 0 0 6px ${sanitizedText};` : ''}
                }

                .timezone-label.position-right {
                    margin-left: calc(var(--card-size) * 0.25);
                    padding-top: calc(var(--card-size) * 0.35);
                }

                .timezone-label.position-left {
                    margin-right: calc(var(--card-size) * 0.25);
                    padding-top: calc(var(--card-size) * 0.35);
                    order: -1;
                }

                .timezone-label.position-top {
                    margin-bottom: calc(var(--card-size) * 0.15);
                }

                .timezone-label.position-bottom {
                    margin-top: calc(var(--card-size) * 0.15);
                }

                .timezone-label.position-right-vertical {
                    margin-left: calc(var(--card-size) * 0.25);
                    writing-mode: vertical-rl;
                    text-orientation: mixed;
                    padding-top: 0;
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

            // Build clock HTML
            let clockHtml = `
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
                clockHtml += `
                    <div class="separator">:</div>
                    <div class="digit-group">
                        ${createDigitHtml('s1')}
                        ${createDigitHtml('s2')}
                    </div>
                `;
            }

            // Determine label to display
            const labelText = this.show_label && this.timezone_label ? this.sanitizeText(this.timezone_label) : '';

            // Build final HTML based on label position
            let html = '';
            if (this.label_position === 'top' && labelText) {
                html = `
                    <div class="timezone-label position-top">${labelText}</div>
                    <div class="clock-wrapper">${clockHtml}</div>
                `;
            } else if (this.label_position === 'bottom' && labelText) {
                html = `
                    <div class="clock-wrapper">${clockHtml}</div>
                    <div class="timezone-label position-bottom">${labelText}</div>
                `;
            } else {
                // left, right, right-vertical
                html = `<div class="clock-wrapper">${clockHtml}`;
                if (labelText) {
                    if (this.label_position === 'left') {
                        html = `<div class="clock-wrapper">
                            <div class="timezone-label position-left">${labelText}</div>
                            ${clockHtml}`;
                    } else if (this.label_position === 'right-vertical') {
                        html += `<div class="timezone-label position-right-vertical">${labelText}</div>`;
                    } else {
                        // right (default)
                        html += `<div class="timezone-label position-right">${labelText}</div>`;
                    }
                }
                html += `</div>`;
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
                let h, m, s;

                // Use timezone if specified, otherwise local time
                if (this.timezone) {
                    // Use specified timezone
                    try {
                        const formatter = new Intl.DateTimeFormat('en-US', {
                            timeZone: this.timezone,
                            hour: 'numeric',
                            minute: 'numeric',
                            second: 'numeric',
                            hour12: false
                        });
                        const parts = formatter.formatToParts(now);
                        h = parseInt(parts.find(p => p.type === 'hour').value);
                        m = parseInt(parts.find(p => p.type === 'minute').value);
                        s = parseInt(parts.find(p => p.type === 'second').value);
                    } catch (tzError) {
                        // Fallback to local time if timezone is invalid
                        if (this.debug) {
                            console.error("FlipClockCard: Invalid timezone, falling back to local time:", tzError);
                        }
                        h = now.getHours();
                        m = now.getMinutes();
                        s = now.getSeconds();
                    }
                } else {
                    h = now.getHours();
                    m = now.getMinutes();
                    s = now.getSeconds();
                }

                // 12-hour format logic
                if (this.time_format === '12') h = h % 12 || 12;

                const hStr = String(h).padStart(2, '0');
                const mStr = String(m).padStart(2, '0');
                const sStr = String(s).padStart(2, '0');
                
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

    /**
     * Configuration stub for Lovelace visual editor
     */
    static getStubConfig() {
        return {
            size: 100,
            time_format: '24',
            show_seconds: false,
            animation_speed: 0.6,
            theme: 'classic',
            timezone: null,
            show_label: false,
            label_position: 'right',
            label_size: 35
        };
    }

    static getConfigElement() {
        return document.createElement("flip-clock-card-editor");
    }
}

// Register the card for Lovelace
window.customCards = window.customCards || [];
window.customCards.push({
    type: "flip-clock-card",
    name: "Flip Clock Card",
    preview: true,
    description: "A retro-style flip clock card with 3D animations"
});

class FlipClockCardEditor extends HTMLElement {
    setConfig(config) {
        this._config = config;
        this.render();
    }

    configChanged(newConfig) {
        const event = new Event("config-changed", {
            bubbles: true,
            composed: true
        });
        event.detail = { config: newConfig };
        this.dispatchEvent(event);
    }

    getTimezoneMatch(value, label) {
        if (!this._config.timezone) return false;
        if (typeof this._config.timezone === 'string') {
            return this._config.timezone === value && !label;
        }
        if (typeof this._config.timezone === 'object') {
            return this._config.timezone.value === value && this._config.timezone.label === label;
        }
        return false;
    }

    render() {
        if (!this._config) return;

        this.innerHTML = `
            <div class="card-config">
                <div class="option">
                    <label class="label">Theme</label>
                    <select class="value" id="theme">
                        <option value="classic" ${this._config.theme === 'classic' ? 'selected' : ''}>Classic</option>
                        <option value="ios-light" ${this._config.theme === 'ios-light' ? 'selected' : ''}>iOS Light</option>
                        <option value="ios-dark" ${this._config.theme === 'ios-dark' ? 'selected' : ''}>iOS Dark</option>
                        <option value="neon" ${this._config.theme === 'neon' ? 'selected' : ''}>Neon</option>
                        <option value="red-stealth" ${this._config.theme === 'red-stealth' ? 'selected' : ''}>Red Stealth</option>
                        <option value="synthwave" ${this._config.theme === 'synthwave' ? 'selected' : ''}>Synthwave</option>
                        <option value="e-ink" ${this._config.theme === 'e-ink' ? 'selected' : ''}>E-Ink</option>
                        <option value="terminal" ${this._config.theme === 'terminal' ? 'selected' : ''}>Terminal</option>
                        <option value="wood" ${this._config.theme === 'wood' ? 'selected' : ''}>Wood</option>
                        <option value="trek-orange" ${this._config.theme === 'trek-orange' ? 'selected' : ''}>Trek Orange</option>
                        <option value="trek-red" ${this._config.theme === 'trek-red' ? 'selected' : ''}>Trek Red</option>
                        <option value="trek-blue" ${this._config.theme === 'trek-blue' ? 'selected' : ''}>Trek Blue</option>
                        <option value="borg" ${this._config.theme === 'borg' ? 'selected' : ''}>Borg</option>
                        <option value="aviator" ${this._config.theme === 'aviator' ? 'selected' : ''}>Aviator</option>
                    </select>
                </div>
                <div class="option">
                    <label class="label">Size (px)</label>
                    <input type="number" class="value" id="size" value="${this._config.size || 100}">
                </div>
                <div class="option">
                    <label class="label">Animation Speed (s)</label>
                    <input type="number" step="0.1" class="value" id="animation_speed" value="${this._config.animation_speed || 0.6}">
                </div>
                <div class="option">
                    <label class="label">Time Format</label>
                    <select class="value" id="time_format">
                        <option value="24" ${this._config.time_format !== '12' ? 'selected' : ''}>24h</option>
                        <option value="12" ${this._config.time_format === '12' ? 'selected' : ''}>12h</option>
                    </select>
                </div>
                <div class="option">
                    <label class="label">Show Seconds</label>
                    <input type="checkbox" class="value" id="show_seconds" ${this._config.show_seconds ? 'checked' : ''}>
                </div>
                <div class="option">
                    <label class="label">Show Label</label>
                    <input type="checkbox" class="value" id="show_label" ${this._config.show_label ? 'checked' : ''}>
                </div>
                <div class="option">
                    <label class="label">Label Position</label>
                    <select class="value" id="label_position">
                        <option value="right" ${(!this._config.label_position || this._config.label_position === 'right') ? 'selected' : ''}>Right (Horizontal)</option>
                        <option value="left" ${this._config.label_position === 'left' ? 'selected' : ''}>Left (Horizontal)</option>
                        <option value="top" ${this._config.label_position === 'top' ? 'selected' : ''}>Top</option>
                        <option value="bottom" ${this._config.label_position === 'bottom' ? 'selected' : ''}>Bottom</option>
                        <option value="right-vertical" ${this._config.label_position === 'right-vertical' ? 'selected' : ''}>Right (Vertical)</option>
                    </select>
                </div>
                <div class="option">
                    <label class="label">Label Size (%)</label>
                    <input type="number" min="20" max="100" step="5" class="value" id="label_size" value="${this._config.label_size || 35}">
                </div>
                <div class="option">
                    <label class="label">Timezone</label>
                    <select class="value" id="timezone">
                        <option value="null" ${!this._config.timezone ? 'selected' : ''}>Local Time</option>
                        <optgroup label="UTC / GMT">
                            <option value='{"value":"UTC","label":"UTC"}' ${this.getTimezoneMatch('UTC', 'UTC') ? 'selected' : ''}>UTC</option>
                            <option value='{"value":"UTC","label":"UTC (Z)"}' ${this.getTimezoneMatch('UTC', 'UTC (Z)') ? 'selected' : ''}>UTC (Z)</option>
                            <option value='{"value":"UTC","label":"GMT"}' ${this.getTimezoneMatch('UTC', 'GMT') ? 'selected' : ''}>GMT</option>
                            <option value='{"value":"UTC","label":"GMT+0"}' ${this.getTimezoneMatch('UTC', 'GMT+0') ? 'selected' : ''}>GMT+0</option>
                            <option value='{"value":"UTC","label":"ZULU"}' ${this.getTimezoneMatch('UTC', 'ZULU') ? 'selected' : ''}>ZULU</option>
                        </optgroup>
                        <optgroup label="Africa">
                            <option value='{"value":"Africa/Cairo","label":"Cairo"}' ${this.getTimezoneMatch('Africa/Cairo', 'Cairo') ? 'selected' : ''}>Cairo</option>
                            <option value='{"value":"Africa/Cairo","label":"Cairo (GMT+2)"}' ${this.getTimezoneMatch('Africa/Cairo', 'Cairo (GMT+2)') ? 'selected' : ''}>Cairo (GMT+2)</option>
                            <option value='{"value":"Africa/Cairo","label":"Egypt"}' ${this.getTimezoneMatch('Africa/Cairo', 'Egypt') ? 'selected' : ''}>Egypt</option>
                            <option value='{"value":"Africa/Johannesburg","label":"Johannesburg"}' ${this.getTimezoneMatch('Africa/Johannesburg', 'Johannesburg') ? 'selected' : ''}>Johannesburg</option>
                            <option value='{"value":"Africa/Johannesburg","label":"South Africa"}' ${this.getTimezoneMatch('Africa/Johannesburg', 'South Africa') ? 'selected' : ''}>South Africa</option>
                            <option value='{"value":"Africa/Johannesburg","label":"SAST"}' ${this.getTimezoneMatch('Africa/Johannesburg', 'SAST') ? 'selected' : ''}>SAST</option>
                            <option value='{"value":"Africa/Lagos","label":"Lagos"}' ${this.getTimezoneMatch('Africa/Lagos', 'Lagos') ? 'selected' : ''}>Lagos</option>
                            <option value='{"value":"Africa/Lagos","label":"Nigeria"}' ${this.getTimezoneMatch('Africa/Lagos', 'Nigeria') ? 'selected' : ''}>Nigeria</option>
                            <option value='{"value":"Africa/Nairobi","label":"Nairobi"}' ${this.getTimezoneMatch('Africa/Nairobi', 'Nairobi') ? 'selected' : ''}>Nairobi</option>
                            <option value='{"value":"Africa/Nairobi","label":"Kenya"}' ${this.getTimezoneMatch('Africa/Nairobi', 'Kenya') ? 'selected' : ''}>Kenya</option>
                            <option value='{"value":"Africa/Nairobi","label":"EAT"}' ${this.getTimezoneMatch('Africa/Nairobi', 'EAT') ? 'selected' : ''}>EAT</option>
                        </optgroup>
                        <optgroup label="America - North">
                            <option value='{"value":"America/New_York","label":"New York"}' ${this.getTimezoneMatch('America/New_York', 'New York') ? 'selected' : ''}>New York</option>
                            <option value='{"value":"America/New_York","label":"NYC"}' ${this.getTimezoneMatch('America/New_York', 'NYC') ? 'selected' : ''}>NYC</option>
                            <option value='{"value":"America/New_York","label":"EST/EDT"}' ${this.getTimezoneMatch('America/New_York', 'EST/EDT') ? 'selected' : ''}>EST/EDT</option>
                            <option value='{"value":"America/New_York","label":"Eastern Time"}' ${this.getTimezoneMatch('America/New_York', 'Eastern Time') ? 'selected' : ''}>Eastern Time</option>
                            <option value='{"value":"America/Los_Angeles","label":"Los Angeles"}' ${this.getTimezoneMatch('America/Los_Angeles', 'Los Angeles') ? 'selected' : ''}>Los Angeles</option>
                            <option value='{"value":"America/Los_Angeles","label":"LA"}' ${this.getTimezoneMatch('America/Los_Angeles', 'LA') ? 'selected' : ''}>LA</option>
                            <option value='{"value":"America/Los_Angeles","label":"PST/PDT"}' ${this.getTimezoneMatch('America/Los_Angeles', 'PST/PDT') ? 'selected' : ''}>PST/PDT</option>
                            <option value='{"value":"America/Los_Angeles","label":"Pacific Time"}' ${this.getTimezoneMatch('America/Los_Angeles', 'Pacific Time') ? 'selected' : ''}>Pacific Time</option>
                            <option value='{"value":"America/Chicago","label":"Chicago"}' ${this.getTimezoneMatch('America/Chicago', 'Chicago') ? 'selected' : ''}>Chicago</option>
                            <option value='{"value":"America/Chicago","label":"CST/CDT"}' ${this.getTimezoneMatch('America/Chicago', 'CST/CDT') ? 'selected' : ''}>CST/CDT</option>
                            <option value='{"value":"America/Chicago","label":"Central Time"}' ${this.getTimezoneMatch('America/Chicago', 'Central Time') ? 'selected' : ''}>Central Time</option>
                            <option value='{"value":"America/Denver","label":"Denver"}' ${this.getTimezoneMatch('America/Denver', 'Denver') ? 'selected' : ''}>Denver</option>
                            <option value='{"value":"America/Denver","label":"MST/MDT"}' ${this.getTimezoneMatch('America/Denver', 'MST/MDT') ? 'selected' : ''}>MST/MDT</option>
                            <option value='{"value":"America/Denver","label":"Mountain Time"}' ${this.getTimezoneMatch('America/Denver', 'Mountain Time') ? 'selected' : ''}>Mountain Time</option>
                            <option value='{"value":"America/Toronto","label":"Toronto"}' ${this.getTimezoneMatch('America/Toronto', 'Toronto') ? 'selected' : ''}>Toronto</option>
                            <option value='{"value":"America/Toronto","label":"Canada"}' ${this.getTimezoneMatch('America/Toronto', 'Canada') ? 'selected' : ''}>Canada</option>
                            <option value='{"value":"America/Mexico_City","label":"Mexico City"}' ${this.getTimezoneMatch('America/Mexico_City', 'Mexico City') ? 'selected' : ''}>Mexico City</option>
                            <option value='{"value":"America/Mexico_City","label":"Mexico"}' ${this.getTimezoneMatch('America/Mexico_City', 'Mexico') ? 'selected' : ''}>Mexico</option>
                        </optgroup>
                        <optgroup label="America - South">
                            <option value='{"value":"America/Sao_Paulo","label":"São Paulo"}' ${this.getTimezoneMatch('America/Sao_Paulo', 'São Paulo') ? 'selected' : ''}>São Paulo</option>
                            <option value='{"value":"America/Sao_Paulo","label":"Brazil"}' ${this.getTimezoneMatch('America/Sao_Paulo', 'Brazil') ? 'selected' : ''}>Brazil</option>
                            <option value='{"value":"America/Sao_Paulo","label":"BRT"}' ${this.getTimezoneMatch('America/Sao_Paulo', 'BRT') ? 'selected' : ''}>BRT</option>
                            <option value='{"value":"America/Argentina/Buenos_Aires","label":"Buenos Aires"}' ${this.getTimezoneMatch('America/Argentina/Buenos_Aires', 'Buenos Aires') ? 'selected' : ''}>Buenos Aires</option>
                            <option value='{"value":"America/Argentina/Buenos_Aires","label":"Argentina"}' ${this.getTimezoneMatch('America/Argentina/Buenos_Aires', 'Argentina') ? 'selected' : ''}>Argentina</option>
                            <option value='{"value":"America/Bogota","label":"Bogota"}' ${this.getTimezoneMatch('America/Bogota', 'Bogota') ? 'selected' : ''}>Bogota</option>
                            <option value='{"value":"America/Bogota","label":"Colombia"}' ${this.getTimezoneMatch('America/Bogota', 'Colombia') ? 'selected' : ''}>Colombia</option>
                            <option value='{"value":"America/Santiago","label":"Santiago"}' ${this.getTimezoneMatch('America/Santiago', 'Santiago') ? 'selected' : ''}>Santiago</option>
                            <option value='{"value":"America/Santiago","label":"Chile"}' ${this.getTimezoneMatch('America/Santiago', 'Chile') ? 'selected' : ''}>Chile</option>
                        </optgroup>
                        <optgroup label="Asia - East">
                            <option value='{"value":"Asia/Tokyo","label":"Tokyo"}' ${this.getTimezoneMatch('Asia/Tokyo', 'Tokyo') ? 'selected' : ''}>Tokyo</option>
                            <option value='{"value":"Asia/Tokyo","label":"Japan"}' ${this.getTimezoneMatch('Asia/Tokyo', 'Japan') ? 'selected' : ''}>Japan</option>
                            <option value='{"value":"Asia/Tokyo","label":"JST"}' ${this.getTimezoneMatch('Asia/Tokyo', 'JST') ? 'selected' : ''}>JST</option>
                            <option value='{"value":"Asia/Tokyo","label":"Tokyo (GMT+9)"}' ${this.getTimezoneMatch('Asia/Tokyo', 'Tokyo (GMT+9)') ? 'selected' : ''}>Tokyo (GMT+9)</option>
                            <option value='{"value":"Asia/Hong_Kong","label":"Hong Kong"}' ${this.getTimezoneMatch('Asia/Hong_Kong', 'Hong Kong') ? 'selected' : ''}>Hong Kong</option>
                            <option value='{"value":"Asia/Hong_Kong","label":"HKT"}' ${this.getTimezoneMatch('Asia/Hong_Kong', 'HKT') ? 'selected' : ''}>HKT</option>
                            <option value='{"value":"Asia/Shanghai","label":"Shanghai"}' ${this.getTimezoneMatch('Asia/Shanghai', 'Shanghai') ? 'selected' : ''}>Shanghai</option>
                            <option value='{"value":"Asia/Shanghai","label":"Beijing"}' ${this.getTimezoneMatch('Asia/Shanghai', 'Beijing') ? 'selected' : ''}>Beijing</option>
                            <option value='{"value":"Asia/Shanghai","label":"China"}' ${this.getTimezoneMatch('Asia/Shanghai', 'China') ? 'selected' : ''}>China</option>
                            <option value='{"value":"Asia/Shanghai","label":"CST"}' ${this.getTimezoneMatch('Asia/Shanghai', 'CST') ? 'selected' : ''}>CST</option>
                            <option value='{"value":"Asia/Singapore","label":"Singapore"}' ${this.getTimezoneMatch('Asia/Singapore', 'Singapore') ? 'selected' : ''}>Singapore</option>
                            <option value='{"value":"Asia/Singapore","label":"SGT"}' ${this.getTimezoneMatch('Asia/Singapore', 'SGT') ? 'selected' : ''}>SGT</option>
                            <option value='{"value":"Asia/Seoul","label":"Seoul"}' ${this.getTimezoneMatch('Asia/Seoul', 'Seoul') ? 'selected' : ''}>Seoul</option>
                            <option value='{"value":"Asia/Seoul","label":"Korea"}' ${this.getTimezoneMatch('Asia/Seoul', 'Korea') ? 'selected' : ''}>Korea</option>
                            <option value='{"value":"Asia/Bangkok","label":"Bangkok"}' ${this.getTimezoneMatch('Asia/Bangkok', 'Bangkok') ? 'selected' : ''}>Bangkok</option>
                            <option value='{"value":"Asia/Bangkok","label":"Thailand"}' ${this.getTimezoneMatch('Asia/Bangkok', 'Thailand') ? 'selected' : ''}>Thailand</option>
                        </optgroup>
                        <optgroup label="Asia - Middle East">
                            <option value='{"value":"Asia/Dubai","label":"Dubai"}' ${this.getTimezoneMatch('Asia/Dubai', 'Dubai') ? 'selected' : ''}>Dubai</option>
                            <option value='{"value":"Asia/Dubai","label":"UAE"}' ${this.getTimezoneMatch('Asia/Dubai', 'UAE') ? 'selected' : ''}>UAE</option>
                            <option value='{"value":"Asia/Dubai","label":"GST"}' ${this.getTimezoneMatch('Asia/Dubai', 'GST') ? 'selected' : ''}>GST</option>
                            <option value='{"value":"Asia/Kolkata","label":"Mumbai"}' ${this.getTimezoneMatch('Asia/Kolkata', 'Mumbai') ? 'selected' : ''}>Mumbai</option>
                            <option value='{"value":"Asia/Kolkata","label":"India"}' ${this.getTimezoneMatch('Asia/Kolkata', 'India') ? 'selected' : ''}>India</option>
                            <option value='{"value":"Asia/Kolkata","label":"IST"}' ${this.getTimezoneMatch('Asia/Kolkata', 'IST') ? 'selected' : ''}>IST</option>
                            <option value='{"value":"Asia/Jerusalem","label":"Jerusalem"}' ${this.getTimezoneMatch('Asia/Jerusalem', 'Jerusalem') ? 'selected' : ''}>Jerusalem</option>
                            <option value='{"value":"Asia/Jerusalem","label":"Israel"}' ${this.getTimezoneMatch('Asia/Jerusalem', 'Israel') ? 'selected' : ''}>Israel</option>
                            <option value='{"value":"Asia/Riyadh","label":"Riyadh"}' ${this.getTimezoneMatch('Asia/Riyadh', 'Riyadh') ? 'selected' : ''}>Riyadh</option>
                            <option value='{"value":"Asia/Riyadh","label":"Saudi Arabia"}' ${this.getTimezoneMatch('Asia/Riyadh', 'Saudi Arabia') ? 'selected' : ''}>Saudi Arabia</option>
                        </optgroup>
                        <optgroup label="Australia & Pacific">
                            <option value='{"value":"Australia/Sydney","label":"Sydney"}' ${this.getTimezoneMatch('Australia/Sydney', 'Sydney') ? 'selected' : ''}>Sydney</option>
                            <option value='{"value":"Australia/Sydney","label":"Australia"}' ${this.getTimezoneMatch('Australia/Sydney', 'Australia') ? 'selected' : ''}>Australia</option>
                            <option value='{"value":"Australia/Sydney","label":"AEDT/AEST"}' ${this.getTimezoneMatch('Australia/Sydney', 'AEDT/AEST') ? 'selected' : ''}>AEDT/AEST</option>
                            <option value='{"value":"Australia/Melbourne","label":"Melbourne"}' ${this.getTimezoneMatch('Australia/Melbourne', 'Melbourne') ? 'selected' : ''}>Melbourne</option>
                            <option value='{"value":"Australia/Perth","label":"Perth"}' ${this.getTimezoneMatch('Australia/Perth', 'Perth') ? 'selected' : ''}>Perth</option>
                            <option value='{"value":"Pacific/Auckland","label":"Auckland"}' ${this.getTimezoneMatch('Pacific/Auckland', 'Auckland') ? 'selected' : ''}>Auckland</option>
                            <option value='{"value":"Pacific/Auckland","label":"New Zealand"}' ${this.getTimezoneMatch('Pacific/Auckland', 'New Zealand') ? 'selected' : ''}>New Zealand</option>
                            <option value='{"value":"Pacific/Auckland","label":"NZDT/NZST"}' ${this.getTimezoneMatch('Pacific/Auckland', 'NZDT/NZST') ? 'selected' : ''}>NZDT/NZST</option>
                            <option value='{"value":"Pacific/Honolulu","label":"Honolulu"}' ${this.getTimezoneMatch('Pacific/Honolulu', 'Honolulu') ? 'selected' : ''}>Honolulu</option>
                            <option value='{"value":"Pacific/Honolulu","label":"Hawaii"}' ${this.getTimezoneMatch('Pacific/Honolulu', 'Hawaii') ? 'selected' : ''}>Hawaii</option>
                            <option value='{"value":"Pacific/Honolulu","label":"HST"}' ${this.getTimezoneMatch('Pacific/Honolulu', 'HST') ? 'selected' : ''}>HST</option>
                        </optgroup>
                        <optgroup label="Europe - West">
                            <option value='{"value":"Europe/London","label":"London"}' ${this.getTimezoneMatch('Europe/London', 'London') ? 'selected' : ''}>London</option>
                            <option value='{"value":"Europe/London","label":"UK"}' ${this.getTimezoneMatch('Europe/London', 'UK') ? 'selected' : ''}>UK</option>
                            <option value='{"value":"Europe/London","label":"GMT/BST"}' ${this.getTimezoneMatch('Europe/London', 'GMT/BST') ? 'selected' : ''}>GMT/BST</option>
                            <option value='{"value":"Europe/Dublin","label":"Dublin"}' ${this.getTimezoneMatch('Europe/Dublin', 'Dublin') ? 'selected' : ''}>Dublin</option>
                            <option value='{"value":"Europe/Dublin","label":"Ireland"}' ${this.getTimezoneMatch('Europe/Dublin', 'Ireland') ? 'selected' : ''}>Ireland</option>
                            <option value='{"value":"Europe/Lisbon","label":"Lisbon"}' ${this.getTimezoneMatch('Europe/Lisbon', 'Lisbon') ? 'selected' : ''}>Lisbon</option>
                            <option value='{"value":"Europe/Lisbon","label":"Portugal"}' ${this.getTimezoneMatch('Europe/Lisbon', 'Portugal') ? 'selected' : ''}>Portugal</option>
                        </optgroup>
                        <optgroup label="Europe - Central">
                            <option value='{"value":"Europe/Warsaw","label":"Warsaw"}' ${this.getTimezoneMatch('Europe/Warsaw', 'Warsaw') ? 'selected' : ''}>Warsaw</option>
                            <option value='{"value":"Europe/Warsaw","label":"Warszawa"}' ${this.getTimezoneMatch('Europe/Warsaw', 'Warszawa') ? 'selected' : ''}>Warszawa</option>
                            <option value='{"value":"Europe/Warsaw","label":"Poland"}' ${this.getTimezoneMatch('Europe/Warsaw', 'Poland') ? 'selected' : ''}>Poland</option>
                            <option value='{"value":"Europe/Warsaw","label":"Polska"}' ${this.getTimezoneMatch('Europe/Warsaw', 'Polska') ? 'selected' : ''}>Polska</option>
                            <option value='{"value":"Europe/Warsaw","label":"CET/CEST"}' ${this.getTimezoneMatch('Europe/Warsaw', 'CET/CEST') ? 'selected' : ''}>CET/CEST</option>
                            <option value='{"value":"Europe/Paris","label":"Paris"}' ${this.getTimezoneMatch('Europe/Paris', 'Paris') ? 'selected' : ''}>Paris</option>
                            <option value='{"value":"Europe/Paris","label":"France"}' ${this.getTimezoneMatch('Europe/Paris', 'France') ? 'selected' : ''}>France</option>
                            <option value='{"value":"Europe/Berlin","label":"Berlin"}' ${this.getTimezoneMatch('Europe/Berlin', 'Berlin') ? 'selected' : ''}>Berlin</option>
                            <option value='{"value":"Europe/Berlin","label":"Germany"}' ${this.getTimezoneMatch('Europe/Berlin', 'Germany') ? 'selected' : ''}>Germany</option>
                            <option value='{"value":"Europe/Rome","label":"Rome"}' ${this.getTimezoneMatch('Europe/Rome', 'Rome') ? 'selected' : ''}>Rome</option>
                            <option value='{"value":"Europe/Rome","label":"Italy"}' ${this.getTimezoneMatch('Europe/Rome', 'Italy') ? 'selected' : ''}>Italy</option>
                            <option value='{"value":"Europe/Madrid","label":"Madrid"}' ${this.getTimezoneMatch('Europe/Madrid', 'Madrid') ? 'selected' : ''}>Madrid</option>
                            <option value='{"value":"Europe/Madrid","label":"Spain"}' ${this.getTimezoneMatch('Europe/Madrid', 'Spain') ? 'selected' : ''}>Spain</option>
                            <option value='{"value":"Europe/Amsterdam","label":"Amsterdam"}' ${this.getTimezoneMatch('Europe/Amsterdam', 'Amsterdam') ? 'selected' : ''}>Amsterdam</option>
                            <option value='{"value":"Europe/Amsterdam","label":"Netherlands"}' ${this.getTimezoneMatch('Europe/Amsterdam', 'Netherlands') ? 'selected' : ''}>Netherlands</option>
                            <option value='{"value":"Europe/Brussels","label":"Brussels"}' ${this.getTimezoneMatch('Europe/Brussels', 'Brussels') ? 'selected' : ''}>Brussels</option>
                            <option value='{"value":"Europe/Brussels","label":"Belgium"}' ${this.getTimezoneMatch('Europe/Brussels', 'Belgium') ? 'selected' : ''}>Belgium</option>
                            <option value='{"value":"Europe/Vienna","label":"Vienna"}' ${this.getTimezoneMatch('Europe/Vienna', 'Vienna') ? 'selected' : ''}>Vienna</option>
                            <option value='{"value":"Europe/Vienna","label":"Austria"}' ${this.getTimezoneMatch('Europe/Vienna', 'Austria') ? 'selected' : ''}>Austria</option>
                            <option value='{"value":"Europe/Stockholm","label":"Stockholm"}' ${this.getTimezoneMatch('Europe/Stockholm', 'Stockholm') ? 'selected' : ''}>Stockholm</option>
                            <option value='{"value":"Europe/Stockholm","label":"Sweden"}' ${this.getTimezoneMatch('Europe/Stockholm', 'Sweden') ? 'selected' : ''}>Sweden</option>
                        </optgroup>
                        <optgroup label="Europe - East">
                            <option value='{"value":"Europe/Moscow","label":"Moscow"}' ${this.getTimezoneMatch('Europe/Moscow', 'Moscow') ? 'selected' : ''}>Moscow</option>
                            <option value='{"value":"Europe/Moscow","label":"Russia"}' ${this.getTimezoneMatch('Europe/Moscow', 'Russia') ? 'selected' : ''}>Russia</option>
                            <option value='{"value":"Europe/Moscow","label":"MSK"}' ${this.getTimezoneMatch('Europe/Moscow', 'MSK') ? 'selected' : ''}>MSK</option>
                            <option value='{"value":"Europe/Istanbul","label":"Istanbul"}' ${this.getTimezoneMatch('Europe/Istanbul', 'Istanbul') ? 'selected' : ''}>Istanbul</option>
                            <option value='{"value":"Europe/Istanbul","label":"Turkey"}' ${this.getTimezoneMatch('Europe/Istanbul', 'Turkey') ? 'selected' : ''}>Turkey</option>
                            <option value='{"value":"Europe/Athens","label":"Athens"}' ${this.getTimezoneMatch('Europe/Athens', 'Athens') ? 'selected' : ''}>Athens</option>
                            <option value='{"value":"Europe/Athens","label":"Greece"}' ${this.getTimezoneMatch('Europe/Athens', 'Greece') ? 'selected' : ''}>Greece</option>
                            <option value='{"value":"Europe/Helsinki","label":"Helsinki"}' ${this.getTimezoneMatch('Europe/Helsinki', 'Helsinki') ? 'selected' : ''}>Helsinki</option>
                            <option value='{"value":"Europe/Helsinki","label":"Finland"}' ${this.getTimezoneMatch('Europe/Helsinki', 'Finland') ? 'selected' : ''}>Finland</option>
                        </optgroup>
                    </select>
                </div>
                <style>
                    .card-config { display: flex; flex-direction: column; gap: 16px; padding: 16px; }
                    .option { display: flex; align-items: center; justify-content: space-between; }
                    .label { font-weight: bold; margin-right: 16px; }
                    .value { padding: 4px; border-radius: 4px; border: 1px solid #ccc; }
                    input[type="number"], select { width: 150px; }
                    select#timezone { width: 200px; }
                </style>
            </div>
        `;

        this.querySelectorAll('.value').forEach(el => {
            el.addEventListener('change', (e) => {
                const target = e.target;
                const prop = target.id;
                let value = target.value;
                if (target.type === 'checkbox') value = target.checked;
                if (target.type === 'number') value = Number(value);

                // Special handling for timezone (JSON string)
                if (prop === 'timezone') {
                    if (value === 'null') {
                        value = null;
                    } else {
                        try {
                            value = JSON.parse(value);
                        } catch (e) {
                            // If parsing fails, treat as plain string (backward compatibility)
                            value = value;
                        }
                    }
                }

                const newConfig = { ...this._config, [prop]: value };
                this.configChanged(newConfig);
            });
        });
    }
}

// Prevent duplicate registration in Home Assistant 25.x
// Check if custom elements are already defined before registering
if (!customElements.get("flip-clock-card-editor")) {
    customElements.define("flip-clock-card-editor", FlipClockCardEditor);
}

if (!customElements.get('flip-clock-card')) {
    customElements.define('flip-clock-card', FlipClockCard);
}
