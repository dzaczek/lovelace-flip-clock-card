class FlipClockCard extends HTMLElement {
  setConfig(config) {
    this.config = config;
    this.card_size = config.size || 100;
    this.time_format = config.time_format || '24';
    this.show_seconds = config.show_seconds === true || config.show_seconds === 'true';
    this.anim_speed = config.animation_speed || 0.6;
    
    // Base theme selection
    this.theme = config.theme || 'classic';
    
    // CUSTOM STYLE: User overrides
    this.custom_style = config.custom_style || null;

    this.currentDigits = { h1: null, h2: null, m1: null, m2: null, s1: null, s2: null };

    if (this.content) {
      this.content.remove();
      this.content = null;
      if (this.timer) clearInterval(this.timer);
    }
    
    this.render();
  }

  render() {
    if (!this.content) {
      if (!this.shadowRoot) {
        this.attachShadow({ mode: 'open' });
      }

      const halfSpeed = this.anim_speed / 2;

      // --- 1. DEFINICJE GOTOWYCH MOTYWÓW ---
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
        }
      };

      // --- 2. LOGIKA ŁĄCZENIA STYLI ---
      // Pobieramy bazowy motyw
      let base = themes[this.theme] || themes['classic'];

      // Jeśli użytkownik podał custom_style, nadpisujemy wartości bazy
      let t = this.custom_style ? { ...base, ...this.custom_style } : base;

      const style = document.createElement('style');
      style.textContent = `
        :host {
          display: block;
          --card-size: ${this.card_size}px;
          --flip-bg: ${t.bg};
          --flip-text: ${t.text};
          --flip-font: ${t.font};
          --flip-radius: calc(var(--card-size) * ${t.radius});
          --flip-shadow: ${t.shadow};
          --flip-line: ${t.line};
          --flip-glow: ${t.glow};
          --half-speed: ${halfSpeed}s; 
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
          
          /* Logika separatora dla Treka i Borga */
          ${(this.theme.startsWith('trek') && !this.custom_style) ? `color: ${t.bg}; opacity: 0.8;` : ''}
          ${this.theme === 'borg' ? `text-shadow: 0 0 10px ${t.text};` : ''}
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
        }
        .lower.flip-card { 
            z-index: 10; 
            transform-origin: top; 
            transform: rotateX(90deg); 
        }
        
        .flip-down-top {
          animation: rotateTop var(--half-speed) linear forwards;
        }

        .flip-down-bottom {
          animation: rotateBottom var(--half-speed) linear forwards; 
          animation-delay: var(--half-speed);
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
      
      this.startClock();
    }
  }

  startClock() {
    const update = () => {
      const now = new Date();
      let h = now.getHours();
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
    };
    
    update();
    this.timer = setInterval(update, 1000);
  }

  updateDigit(id, newValue) {
    if (this.currentDigits[id] !== newValue) {
      const el = this.shadowRoot.getElementById(id);
      if (!el) return;

      const previousValue = this.currentDigits[id] === null ? newValue : this.currentDigits[id];
      this.currentDigits[id] = newValue;

      const topBack = el.querySelector('.upper-back span');
      const bottomBack = el.querySelector('.lower-back span');
      const topFlip = el.querySelector('.upper.flip-card span');
      const bottomFlip = el.querySelector('.lower.flip-card span');

      topBack.textContent = newValue;
      bottomBack.textContent = previousValue; 
      topFlip.textContent = previousValue;
      bottomFlip.textContent = newValue;

      const topFlipCard = el.querySelector('.upper.flip-card');
      const bottomFlipCard = el.querySelector('.lower.flip-card');

      topFlipCard.classList.remove('flip-down-top');
      bottomFlipCard.classList.remove('flip-down-bottom');
      
      void el.offsetWidth;

      topFlipCard.classList.add('flip-down-top');
      bottomFlipCard.classList.add('flip-down-bottom');
    }
  }

  disconnectedCallback() {
    if (this.timer) clearInterval(this.timer);
  }

  getCardSize() {
    return 3;
  }
}

customElements.define('flip-clock-card', FlipClockCard);
