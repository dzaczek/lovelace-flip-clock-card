class FlipClockCard extends HTMLElement {
  setConfig(config) {
    this.config = config;
    this.card_size = config.size || 100;
    this.time_format = config.time_format || '24';
    this.show_seconds = config.show_seconds === true || config.show_seconds === 'true';

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

      const style = document.createElement('style');
      style.textContent = `
        :host {
          display: block;
          --card-size: ${this.card_size}px;
          --bg-color: #333;
          --text-color: #eee;
          /* Cały ruch trwa 0.6s, ale jest podzielony na pół */
          --half-speed: 0.3s; 
        }
        .clock-container {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          background: transparent;
          perspective: 1000px; /* Głebia 3D */
        }
        .digit-group {
          display: flex;
          gap: calc(var(--card-size) * 0.15);
        }
        .separator {
          font-size: calc(var(--card-size) * 0.6);
          color: var(--text-color);
          margin: 0 8px;
          font-weight: bold;
          padding-top: calc(var(--card-size) * 0.1);
          font-family: 'Roboto Mono', monospace;
        }

        .flip-unit {
          position: relative;
          width: calc(var(--card-size) * 0.7);
          height: var(--card-size);
          font-family: 'Roboto Mono', monospace;
          font-weight: 700;
          font-size: calc(var(--card-size) * 0.8);
          border-radius: calc(var(--card-size) * 0.1);
          background: var(--bg-color);
          color: var(--text-color);
          box-shadow: 0 4px 10px rgba(0,0,0,0.5); /* Mocniejszy cień */
          transform-style: preserve-3d;
        }

        .upper, .lower {
          position: absolute;
          left: 0;
          width: 100%;
          height: 50%;
          overflow: hidden;
          background: var(--bg-color);
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }

        .upper {
          top: 0;
          border-radius: calc(var(--card-size) * 0.1) calc(var(--card-size) * 0.1) 0 0;
          transform-origin: 50% 100%; /* Oś obrotu na DOLE górnej połówki */
          z-index: 1;
        }
        
        .lower {
          bottom: 0;
          border-radius: 0 0 calc(var(--card-size) * 0.1) calc(var(--card-size) * 0.1);
          transform-origin: 50% 0%; /* Oś obrotu na GÓRZE dolnej połówki */
          z-index: 1;
        }

        /* SPAN FIX (Wyrównanie tekstu) */
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

        /* Linia podziału */
        .upper::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 1px;
          background: rgba(0,0,0,0.4);
        }

        /* WARSTWY */
        .upper-back, .lower-back { z-index: 1; } /* Tła statyczne */
        
        /* KLAPKI ANIMOWANE */
        .upper.flip-card { 
            z-index: 10; 
            transform-origin: bottom; 
        }
        .lower.flip-card { 
            z-index: 10; 
            transform-origin: top; 
            transform: rotateX(90deg); /* Startuje ukryta (poziomo) */
        }

        /* --- KLUCZOWE ZMIANY W ANIMACJI --- */

        /* 1. Faza: Górna klapka opada do poziomu (i znika) */
        .flip-down-top {
          animation: rotateTop var(--half-speed) linear forwards;
        }

        /* 2. Faza: Dolna klapka przejmuje ruch OD RAZU po górnej */
        .flip-down-bottom {
          animation: rotateBottom var(--half-speed) linear forwards; 
          animation-delay: var(--half-speed); /* Czeka aż górna skończy! */
        }

        /* Górna obraca się od 0 do -90 (kładzie się na płasko) */
        @keyframes rotateTop {
          0% { transform: rotateX(0deg); }
          100% { transform: rotateX(-90deg); }
        }

        /* Dolna obraca się od 90 (płasko) do 0 (pionowo) + Odbicie */
        @keyframes rotateBottom {
          0% { transform: rotateX(90deg); }
          60% { transform: rotateX(0deg); } /* Szybkie uderzenie w dół */
          80% { transform: rotateX(15deg); } /* Odbicie w górę */
          100% { transform: rotateX(0deg); } /* Spoczynek */
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

      // USTAWIENIE WARTOŚCI (Logika fizyczna)
      
      // 1. Pod spodem (co będzie widoczne po opadnięciu):
      topBack.textContent = newValue;       // Nowa góra
      bottomBack.textContent = previousValue; // Stary dół (zostaje, dopóki nie zostanie zakryty)

      // 2. Klapka (to co się rusza):
      topFlip.textContent = previousValue;  // Stara góra (zaczyna opadać)
      bottomFlip.textContent = newValue;    // Nowy dół (jest rewersem starej góry)

      // RESTART ANIMACJI
      const topFlipCard = el.querySelector('.upper.flip-card');
      const bottomFlipCard = el.querySelector('.lower.flip-card');

      topFlipCard.classList.remove('flip-down-top');
      bottomFlipCard.classList.remove('flip-down-bottom');
      
      void el.offsetWidth; // Magic Reflow

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
