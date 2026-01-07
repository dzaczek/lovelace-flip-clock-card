/**
 * Flip Clock Card for Home Assistant
 * Version: 25.2.5
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
        this.version = '25.2.5';
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

            // Validate timezone (IANA timezone identifier)
            this.timezone = config?.timezone || null;
            
            // Generate label from timezone string if it exists
            if (this.timezone) {
                const parts = this.timezone.split('/');
                this.timezone_label = parts[parts.length - 1].replace(/_/g, ' ');
                } else {
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
                        <optgroup label="UTC">
                            <option value="UTC" ${this._config.timezone === 'UTC' ? 'selected' : ''}>UTC</option>
                        </optgroup>
                        <optgroup label="Africa">
                            <option value="Africa/Abidjan" ${this._config.timezone === 'Africa/Abidjan' ? 'selected' : ''}>Abidjan</option>
                            <option value="Africa/Accra" ${this._config.timezone === 'Africa/Accra' ? 'selected' : ''}>Accra</option>
                            <option value="Africa/Addis_Ababa" ${this._config.timezone === 'Africa/Addis_Ababa' ? 'selected' : ''}>Addis Ababa</option>
                            <option value="Africa/Algiers" ${this._config.timezone === 'Africa/Algiers' ? 'selected' : ''}>Algiers</option>
                            <option value="Africa/Cairo" ${this._config.timezone === 'Africa/Cairo' ? 'selected' : ''}>Cairo</option>
                            <option value="Africa/Casablanca" ${this._config.timezone === 'Africa/Casablanca' ? 'selected' : ''}>Casablanca</option>
                            <option value="Africa/Johannesburg" ${this._config.timezone === 'Africa/Johannesburg' ? 'selected' : ''}>Johannesburg</option>
                            <option value="Africa/Lagos" ${this._config.timezone === 'Africa/Lagos' ? 'selected' : ''}>Lagos</option>
                            <option value="Africa/Nairobi" ${this._config.timezone === 'Africa/Nairobi' ? 'selected' : ''}>Nairobi</option>
                            <option value="Africa/Tunis" ${this._config.timezone === 'Africa/Tunis' ? 'selected' : ''}>Tunis</option>
                        </optgroup>
                        <optgroup label="America - North">
                            <option value="America/Anchorage" ${this._config.timezone === 'America/Anchorage' ? 'selected' : ''}>Anchorage</option>
                            <option value="America/Chicago" ${this._config.timezone === 'America/Chicago' ? 'selected' : ''}>Chicago</option>
                            <option value="America/Denver" ${this._config.timezone === 'America/Denver' ? 'selected' : ''}>Denver</option>
                            <option value="America/Los_Angeles" ${this._config.timezone === 'America/Los_Angeles' ? 'selected' : ''}>Los Angeles</option>
                            <option value="America/Mexico_City" ${this._config.timezone === 'America/Mexico_City' ? 'selected' : ''}>Mexico City</option>
                            <option value="America/New_York" ${this._config.timezone === 'America/New_York' ? 'selected' : ''}>New York</option>
                            <option value="America/Phoenix" ${this._config.timezone === 'America/Phoenix' ? 'selected' : ''}>Phoenix</option>
                            <option value="America/Toronto" ${this._config.timezone === 'America/Toronto' ? 'selected' : ''}>Toronto</option>
                            <option value="America/Vancouver" ${this._config.timezone === 'America/Vancouver' ? 'selected' : ''}>Vancouver</option>
                        </optgroup>
                        <optgroup label="America - South & Central">
                            <option value="America/Argentina/Buenos_Aires" ${this._config.timezone === 'America/Argentina/Buenos_Aires' ? 'selected' : ''}>Buenos Aires</option>
                            <option value="America/Bogota" ${this._config.timezone === 'America/Bogota' ? 'selected' : ''}>Bogota</option>
                            <option value="America/Caracas" ${this._config.timezone === 'America/Caracas' ? 'selected' : ''}>Caracas</option>
                            <option value="America/Lima" ${this._config.timezone === 'America/Lima' ? 'selected' : ''}>Lima</option>
                            <option value="America/Santiago" ${this._config.timezone === 'America/Santiago' ? 'selected' : ''}>Santiago</option>
                            <option value="America/Sao_Paulo" ${this._config.timezone === 'America/Sao_Paulo' ? 'selected' : ''}>São Paulo</option>
                        </optgroup>
                        <optgroup label="Asia - East">
                            <option value="Asia/Bangkok" ${this._config.timezone === 'Asia/Bangkok' ? 'selected' : ''}>Bangkok</option>
                            <option value="Asia/Hong_Kong" ${this._config.timezone === 'Asia/Hong_Kong' ? 'selected' : ''}>Hong Kong</option>
                            <option value="Asia/Jakarta" ${this._config.timezone === 'Asia/Jakarta' ? 'selected' : ''}>Jakarta</option>
                            <option value="Asia/Kuala_Lumpur" ${this._config.timezone === 'Asia/Kuala_Lumpur' ? 'selected' : ''}>Kuala Lumpur</option>
                            <option value="Asia/Manila" ${this._config.timezone === 'Asia/Manila' ? 'selected' : ''}>Manila</option>
                            <option value="Asia/Seoul" ${this._config.timezone === 'Asia/Seoul' ? 'selected' : ''}>Seoul</option>
                            <option value="Asia/Shanghai" ${this._config.timezone === 'Asia/Shanghai' ? 'selected' : ''}>Shanghai</option>
                            <option value="Asia/Singapore" ${this._config.timezone === 'Asia/Singapore' ? 'selected' : ''}>Singapore</option>
                            <option value="Asia/Taipei" ${this._config.timezone === 'Asia/Taipei' ? 'selected' : ''}>Taipei</option>
                            <option value="Asia/Tokyo" ${this._config.timezone === 'Asia/Tokyo' ? 'selected' : ''}>Tokyo</option>
                        </optgroup>
                        <optgroup label="Asia - Middle East & Central">
                            <option value="Asia/Dubai" ${this._config.timezone === 'Asia/Dubai' ? 'selected' : ''}>Dubai</option>
                            <option value="Asia/Jerusalem" ${this._config.timezone === 'Asia/Jerusalem' ? 'selected' : ''}>Jerusalem</option>
                            <option value="Asia/Karachi" ${this._config.timezone === 'Asia/Karachi' ? 'selected' : ''}>Karachi</option>
                            <option value="Asia/Kolkata" ${this._config.timezone === 'Asia/Kolkata' ? 'selected' : ''}>Kolkata</option>
                            <option value="Asia/Riyadh" ${this._config.timezone === 'Asia/Riyadh' ? 'selected' : ''}>Riyadh</option>
                            <option value="Asia/Tehran" ${this._config.timezone === 'Asia/Tehran' ? 'selected' : ''}>Tehran</option>
                        </optgroup>
                        <optgroup label="Asia - Siberia & Far East">
                            <option value="Asia/Vladivostok" ${this._config.timezone === 'Asia/Vladivostok' ? 'selected' : ''}>Vladivostok</option>
                            <option value="Asia/Yakutsk" ${this._config.timezone === 'Asia/Yakutsk' ? 'selected' : ''}>Yakutsk</option>
                            <option value="Asia/Yekaterinburg" ${this._config.timezone === 'Asia/Yekaterinburg' ? 'selected' : ''}>Yekaterinburg</option>
                        </optgroup>
                        <optgroup label="Atlantic">
                            <option value="Atlantic/Azores" ${this._config.timezone === 'Atlantic/Azores' ? 'selected' : ''}>Azores</option>
                            <option value="Atlantic/Cape_Verde" ${this._config.timezone === 'Atlantic/Cape_Verde' ? 'selected' : ''}>Cape Verde</option>
                            <option value="Atlantic/Reykjavik" ${this._config.timezone === 'Atlantic/Reykjavik' ? 'selected' : ''}>Reykjavik</option>
                        </optgroup>
                        <optgroup label="Australia & Pacific">
                            <option value="Australia/Adelaide" ${this._config.timezone === 'Australia/Adelaide' ? 'selected' : ''}>Adelaide</option>
                            <option value="Australia/Brisbane" ${this._config.timezone === 'Australia/Brisbane' ? 'selected' : ''}>Brisbane</option>
                            <option value="Australia/Darwin" ${this._config.timezone === 'Australia/Darwin' ? 'selected' : ''}>Darwin</option>
                            <option value="Australia/Melbourne" ${this._config.timezone === 'Australia/Melbourne' ? 'selected' : ''}>Melbourne</option>
                            <option value="Australia/Perth" ${this._config.timezone === 'Australia/Perth' ? 'selected' : ''}>Perth</option>
                            <option value="Australia/Sydney" ${this._config.timezone === 'Australia/Sydney' ? 'selected' : ''}>Sydney</option>
                            <option value="Pacific/Auckland" ${this._config.timezone === 'Pacific/Auckland' ? 'selected' : ''}>Auckland</option>
                            <option value="Pacific/Fiji" ${this._config.timezone === 'Pacific/Fiji' ? 'selected' : ''}>Fiji</option>
                            <option value="Pacific/Guam" ${this._config.timezone === 'Pacific/Guam' ? 'selected' : ''}>Guam</option>
                            <option value="Pacific/Honolulu" ${this._config.timezone === 'Pacific/Honolulu' ? 'selected' : ''}>Honolulu</option>
                            <option value="Pacific/Tahiti" ${this._config.timezone === 'Pacific/Tahiti' ? 'selected' : ''}>Tahiti</option>
                        </optgroup>
                        <optgroup label="Europe - West">
                            <option value="Europe/Dublin" ${this._config.timezone === 'Europe/Dublin' ? 'selected' : ''}>Dublin</option>
                            <option value="Europe/Lisbon" ${this._config.timezone === 'Europe/Lisbon' ? 'selected' : ''}>Lisbon</option>
                            <option value="Europe/London" ${this._config.timezone === 'Europe/London' ? 'selected' : ''}>London</option>
                        </optgroup>
                        <optgroup label="Europe - Central">
                            <option value="Europe/Amsterdam" ${this._config.timezone === 'Europe/Amsterdam' ? 'selected' : ''}>Amsterdam</option>
                            <option value="Europe/Berlin" ${this._config.timezone === 'Europe/Berlin' ? 'selected' : ''}>Berlin</option>
                            <option value="Europe/Brussels" ${this._config.timezone === 'Europe/Brussels' ? 'selected' : ''}>Brussels</option>
                            <option value="Europe/Copenhagen" ${this._config.timezone === 'Europe/Copenhagen' ? 'selected' : ''}>Copenhagen</option>
                            <option value="Europe/Madrid" ${this._config.timezone === 'Europe/Madrid' ? 'selected' : ''}>Madrid</option>
                            <option value="Europe/Oslo" ${this._config.timezone === 'Europe/Oslo' ? 'selected' : ''}>Oslo</option>
                            <option value="Europe/Paris" ${this._config.timezone === 'Europe/Paris' ? 'selected' : ''}>Paris</option>
                            <option value="Europe/Prague" ${this._config.timezone === 'Europe/Prague' ? 'selected' : ''}>Prague</option>
                            <option value="Europe/Rome" ${this._config.timezone === 'Europe/Rome' ? 'selected' : ''}>Rome</option>
                            <option value="Europe/Stockholm" ${this._config.timezone === 'Europe/Stockholm' ? 'selected' : ''}>Stockholm</option>
                            <option value="Europe/Vienna" ${this._config.timezone === 'Europe/Vienna' ? 'selected' : ''}>Vienna</option>
                            <option value="Europe/Warsaw" ${this._config.timezone === 'Europe/Warsaw' ? 'selected' : ''}>Warsaw</option>
                            <option value="Europe/Zurich" ${this._config.timezone === 'Europe/Zurich' ? 'selected' : ''}>Zurich</option>
                        </optgroup>
                        <optgroup label="Europe - East">
                            <option value="Europe/Athens" ${this._config.timezone === 'Europe/Athens' ? 'selected' : ''}>Athens</option>
                            <option value="Europe/Bucharest" ${this._config.timezone === 'Europe/Bucharest' ? 'selected' : ''}>Bucharest</option>
                            <option value="Europe/Helsinki" ${this._config.timezone === 'Europe/Helsinki' ? 'selected' : ''}>Helsinki</option>
                            <option value="Europe/Istanbul" ${this._config.timezone === 'Europe/Istanbul' ? 'selected' : ''}>Istanbul</option>
                            <option value="Europe/Kiev" ${this._config.timezone === 'Europe/Kiev' ? 'selected' : ''}>Kiev</option>
                            <option value="Europe/Moscow" ${this._config.timezone === 'Europe/Moscow' ? 'selected' : ''}>Moscow</option>
                            <option value="Europe/Riga" ${this._config.timezone === 'Europe/Riga' ? 'selected' : ''}>Riga</option>
                            <option value="Europe/Sofia" ${this._config.timezone === 'Europe/Sofia' ? 'selected' : ''}>Sofia</option>
                            <option value="Europe/Tallinn" ${this._config.timezone === 'Europe/Tallinn' ? 'selected' : ''}>Tallinn</option>
                            <option value="Europe/Vilnius" ${this._config.timezone === 'Europe/Vilnius' ? 'selected' : ''}>Vilnius</option>
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

                // Special handling for utc_label and timezone
                if ((prop === 'utc_label' || prop === 'timezone') && value === 'null') {
                        value = null;
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
