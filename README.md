# Flip Clock Card 
![Preview card](./img/flipfalp.jpg)

Yo! Here is a neat little card I whipped up for Home Assistant. It's a retro style Flip Clock (split flap display) that actually animates properly.

![Preview card](./img/flipconf.jpg)

I wasn't happy with the static clocks out there, so I made this one. It has a real 3D fall down animation with a satisfying little bounce at the end. Looks super clean on wall mounted tablets.

## Why you might want this

* **It moves!** The cards actually flip down. It’s weirdly satisfying to watch.
* **No bloat.** It’s just pure CSS and JS. No heavy libraries attached.
* **Customizable.** Make it huge, make it tiny  your call.
* **12h / 24h.** Whether you like AM/PM or military time, I got you covered.
* **Seconds.** You can show them if you want to see time fly by.
* **Themed.** Comes with built-in styles like Star Trek, Apple style, neon, and a few nerdy ones.

---

## How to install

### The Easy Way (HACS)

1. Go to **HACS → Frontend**.
2. Click the 3 dots (top right) → **Custom repositories**.
3. Paste the URL of this repo.
4. Choose **Lovelace** as the category.
5. Click **Add**, then install. Done.

### The "I like pain" Way (Manual)

1. Download the `flip-clock-card.js` file from the releases.
2. Drop it into your `/config/www/` folder.
3. Add it to your dashboard resources:

   ```yaml
   url: /local/flip-clock-card.js
   type: module
   ```

4. Hard refresh your browser (Ctrl+F5 / Cmd+Shift+R), or bump the URL with `?v=2`.

---

## How to use it 🛠️

Setting this up is straightforward. YAML mode, one card, done.

### 1. Basic setup (quick start)

```yaml
type: custom:flip-clock-card
size: 80                # Card size in px (height of one tile). Default: 100
time_format: '24'       # '12' for AM/PM, '24' for 24h
show_seconds: true      # false to hide seconds
```

---

### 2. Animation speed

You can control how fast the flip animation runs.

```yaml
animation_speed: 0.6
```

- Value is in **seconds** for the full flip cycle (top drop + bottom rise).
- Internally the card splits that into two halves (top phase + bottom phase).
- Reasonable range:
  - `0.3` – fast, snappy flip
  - `0.6` – default, with a nice little bounce
  - `0.8–1.0` – slower, more “mechanical”

**Example: slower, more dramatic flip**

```yaml
type: custom:flip-clock-card
size: 120
time_format: '24'
show_seconds: true
animation_speed: 0.8
```

---

### 3. Themes (built-in styles)

The card comes with several built-in themes that change colors, fonts, shadows and overall vibe.

You set them with:

```yaml
theme: classic   # or ios-dark, neon, borg, ...
```

Available themes:

- `classic` – dark panel, light text, default retro look
- `ios-light` – bright, clean, iOS-like
- `ios-dark` – dark Apple-style clock, subtle and soft
- `neon` – black background, neon green glow
- `red-stealth` – dark + red digits, stealth HUD kind of feel
- `synthwave` – purple / magenta, loud and fun
- `e-ink` – light background, dark text, paper-ish look
- `terminal` – green monospace on black, classic terminal
- `wood` – brown, warm, retro wall clock vibes
- `trek-orange` / `trek-red` / `trek-blue` – bold colors inspired by Star Trek LCARS-style panels
- `borg` – black, green, harsh glow, very “resistance is futile”

**Example: iOS-style dark**

```yaml
type: custom:flip-clock-card
size: 130
time_format: '24'
show_seconds: true
theme: ios-dark
animation_speed: 0.5
```

**Example: neon terminal flip**

```yaml
type: custom:flip-clock-card
size: 110
time_format: '24'
show_seconds: true
theme: neon
animation_speed: 0.4
```

**Example: full nerd – Borg**

```yaml
type: custom:flip-clock-card
size: 120
time_format: '24'
show_seconds: true
theme: borg
animation_speed: 0.5
```

---

### 4. Custom theme (override built-in styles)

If the built-in themes aren’t enough, you can take any `theme` as a base and override some or all of its values with `custom_style`.

Available fields inside `custom_style`:

- `bg` – tile background color
- `text` – digit color
- `font` – font-family
- `radius` – border radius (relative, e.g. `0.1` = 10% of tile height)
- `shadow` – box-shadow
- `line` – color of the split line between top and bottom halves
- `glow` – text-shadow used as glow for the digits

**Example: custom yellow glow on top of classic**

```yaml
type: custom:flip-clock-card
size: 120
time_format: '24'
show_seconds: true
theme: classic
animation_speed: 0.55
custom_style:
  bg: "#101010"
  text: "#ffcc00"
  glow: "0 0 12px rgba(255, 204, 0, 0.8)"
```

**Example: softer e-ink style**

```yaml
type: custom:flip-clock-card
size: 100
time_format: '24'
show_seconds: false
theme: e-ink
custom_style:
  bg: "#fdf7e3"
  text: "#222222"
  font: "'Georgia', serif"
```

---

### 5. Full example (wall tablet)

```yaml
type: custom:flip-clock-card
size: 160
time_format: '24'
show_seconds: true
animation_speed: 0.6
theme: ios-dark
```

Or something more aggressive:

```yaml
type: custom:flip-clock-card
size: 140
time_format: '24'
show_seconds: true
animation_speed: 0.4
theme: synthwave
```

---

That’s it. Drop it on a dashboard, pick a theme, tweak the animation speed and you’ve got a flip clock that looks like it belongs on an airport board, a starship bridge, or your hallway tablet.

If it acts weird: check your browser cache and make sure the `theme` name is spelled correctly before blaming the card 😉
