# Flip Clock Card 
![Preview card](./img/flipfalp.jpg)

A retro-style Flip Clock card for Home Assistant with realistic 3D flip animations inspired by split-flap displays.

![Preview card](./img/flipconf.jpg)

This card features a smooth 3D flip-down animation with a satisfying bounce effect, perfect for wall-mounted tablets and dashboards.

## Table of Contents

- [Features](#features)
- [Quick Reference](#quick-reference)
- [Installation](#installation)
- [Configuration](#configuration)
  - [Configuration Parameters](#configuration-parameters)
  - [Configuration Examples](#configuration-examples)
- [Available Themes](#available-themes)
- [Custom Styling](#custom-styling)
- [Complete Examples](#complete-examples)
- [All Parameters Reference](#all-parameters-reference)
- [Security & Validation](#security--validation)
- [Troubleshooting](#troubleshooting)

## Features

* **Realistic Animation** - Cards flip down with a 3D effect and bounce
* **Lightweight** - Pure CSS and JavaScript with no external dependencies
* **Highly Customizable** - Adjust size, colors, fonts, and animations
* **Time Formats** - 12-hour (with AM/PM) or 24-hour format
* **Seconds Display** - Optional seconds display
* **World Timezones** - Support for 100+ cities with custom labels
* **Multiple Themes** - 14 built-in themes plus custom styling options
* **AM/PM Indicator** - Customizable AM/PM display with multiple positions and styles

---

## Quick Reference

| What you want | Parameter to use |
|---------------|------------------|
| Change clock size | `size: 100` (10-500px) |
| 12/24 hour format | `time_format: '24'` or `'12'` |
| Show seconds | `show_seconds: true` |
| Change animation speed | `animation_speed: 0.6` (0.1-2.0s) |
| Apply a theme | `theme: 'classic'` |
| Show timezone label | `show_label: true` + `custom_label: 'NYC'` |
| Display different timezone | `timezone: 'America/New_York'` |
| Show AM/PM (12h only) | `am_pm_indicator: true` |
| Customize colors | Use `custom_style` object |

---

## Installation

### Method 1: HACS (Recommended)

**Home Assistant Community Store - easiest method:**

1. Open **HACS** in your Home Assistant
2. Go to **Frontend** section
3. Click the **3 dots menu** (top right) → **Custom repositories**
4. Paste this repository URL: `https://github.com/yourusername/lovelace-flip-clock-card`
5. Select **Lovelace** as the category
6. Click **Add**, then click **Install**
7. Restart Home Assistant
8. Hard refresh your browser (Ctrl+F5 or Cmd+Shift+R)

### Method 2: Manual Installation

**For those who prefer manual control:**

1. **Download** the `flip-clock-card.js` file from the [latest release](../../releases)
2. **Copy** the file to your Home Assistant `/config/www/` folder
3. **Add resource** to your dashboard:
   - Go to **Settings** → **Dashboards** → **Resources** (3-dot menu)
   - Click **Add Resource**
   - URL: `/local/flip-clock-card.js`
   - Resource type: **JavaScript Module**
   
   Or add manually to your configuration:
   ```yaml
   resources:
     - url: /local/flip-clock-card.js
   type: module
   ```

4. **Clear cache**: Hard refresh your browser (Ctrl+F5 / Cmd+Shift+R)
5. **Optional**: Add `?v=2` to the URL to force cache refresh: `/local/flip-clock-card.js?v=2`

### Verification

After installation, the card should appear in the Lovelace card picker:
1. Edit any dashboard
2. Click **Add Card**
3. Search for "Flip Clock Card"
4. Configure and enjoy!

---

## Configuration 🛠️

### Visual Editor 
The card fully supports the Lovelace Visual Editor. Configure all options directly in the UI without editing YAML.

### YAML Configuration

#### Quick Start Example

```yaml
type: custom:flip-clock-card
size: 100
time_format: '24'
show_seconds: true
theme: classic
```

---

## Configuration Parameters

### Core Settings

| Parameter | Type | Default | Range/Options | Description |
|-----------|------|---------|---------------|-------------|
| `type` | string | **required** | `custom:flip-clock-card` | Card type identifier |
| `size` | number | `100` | `10-500` | Height of each flip tile in pixels |
| `time_format` | string | `'24'` | `'12'`, `'24'` | 12-hour or 24-hour time format |
| `show_seconds` | boolean | `false` | `true`, `false` | Display seconds |
| `animation_speed` | number | `0.6` | `0.1-2.0` | Flip animation duration in seconds |

### Theme Settings

| Parameter | Type | Default | Options | Description |
|-----------|------|---------|---------|-------------|
| `theme` | string | `'classic'` | See [Available Themes](#available-themes) | Pre-defined visual theme |
| `custom_style` | object | `null` | See [Custom Styling](#custom-styling) | Override theme properties |

### Timezone Settings

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `timezone` | string or object | `null` | IANA timezone identifier (e.g., `'America/New_York'`) or object with `value` and `label` properties. `null` uses local time |
| `show_label` | boolean | `false` | Display timezone/custom label |
| `label_position` | string | `'right'` | Label position: `'right'`, `'left'`, `'top'`, `'bottom'`, `'right-vertical'` |
| `label_size` | number | `24` | Label font size in pixels (`10-100`) |
| `custom_label` | string | `null` | Custom text label (overrides timezone label if set) |

### AM/PM Indicator Settings (12-hour format only)

| Parameter | Type | Default | Options | Description |
|-----------|------|---------|---------|-------------|
| `am_pm_indicator` | boolean | `false` | `true`, `false` | Show AM/PM indicator (only works with `time_format: '12'`) |
| `am_pm_style` | string | `'flip'` | `'flip'`, `'text'` | Display style: flip tiles or text |
| `am_pm_position` | string | `'right'` | `'right'`, `'left'`, `'top'`, `'bottom'`, `'right-top'`, `'right-bottom'` | Position relative to clock |
| `am_pm_orientation` | string | `'horizontal'` | `'horizontal'`, `'vertical'` | Orientation of AM/PM letters |
| `am_pm_distance` | number | `15` | `0-100` | Distance from clock as percentage of card size |
| `am_pm_size` | number | `50` | `10-100` | Size of AM/PM as percentage of card size |

---

## Configuration Examples

### 1. Basic Setup

Simple clock with default settings:

```yaml
type: custom:flip-clock-card
size: 100
time_format: '24'
show_seconds: false
theme: classic
```

### 2. Clock with Timezone Label

Display time in a specific timezone with a label:

```yaml
type: custom:flip-clock-card
size: 120
timezone: 'America/New_York'
show_label: true
label_position: 'right'
label_size: 30
custom_label: 'NYC'
theme: ios-dark
```

**Timezone Format Options:**

Simple format (auto-generates label from timezone):
```yaml
timezone: 'America/New_York'
```

Advanced format with custom label:
```yaml
timezone:
  value: 'America/New_York'
  label: 'NYC'
```

**Label Positions:**
- `right` - Horizontal label on the right (default)
- `left` - Horizontal label on the left
- `top` - Label above the clock
- `bottom` - Label below the clock
- `right-vertical` - Vertical label on the right

### 3. 12-Hour Format with AM/PM Indicator

```yaml
type: custom:flip-clock-card
size: 120
time_format: '12'
show_seconds: true
am_pm_indicator: true
am_pm_style: 'flip'
am_pm_position: 'right'
am_pm_orientation: 'vertical'
am_pm_size: 50
am_pm_distance: 20
theme: classic
```

**AM/PM Position Options:**
- `right` - Right side of clock (default)
- `left` - Left side of clock
- `top` - Above the clock
- `bottom` - Below the clock
- `right-top` - Right side, aligned to top
- `right-bottom` - Right side, aligned to bottom

**AM/PM Style Options:**
- `flip` - Animated flip tiles (default)
- `text` - Static text display

### 4. Multiple Timezones Grid

Display multiple timezones simultaneously:

```yaml
type: grid
columns: 3
cards:
  - type: custom:flip-clock-card
    timezone: 'Europe/Warsaw'
    custom_label: 'Polska'
    show_label: true
    label_position: 'bottom'
    theme: classic
    size: 80
  - type: custom:flip-clock-card
    timezone: 'America/New_York'
    custom_label: 'NYC'
    show_label: true
    label_position: 'bottom'
    theme: ios-dark
    size: 80
  - type: custom:flip-clock-card
    timezone: 'Asia/Tokyo'
    custom_label: 'JST'
    show_label: true
    label_position: 'bottom'
    theme: neon
    size: 80
```

### 5. Custom Animation Speed

```yaml
type: custom:flip-clock-card
size: 120
animation_speed: 0.8
show_seconds: true
```

**Animation Speed Guide:**
- `0.3` - Fast, snappy flip
- `0.6` - Default with bounce (recommended)
- `0.8-1.0` - Slower, more mechanical
- Range: `0.1` to `2.0` seconds

---

## Available Themes

The card includes 14 pre-defined themes. Set with the `theme` parameter:

```yaml
theme: 'classic'
```

### Modern Themes

| Theme | Description |
|-------|-------------|
| `classic` | Dark panel with light text, default retro look |
| `ios-light` | Bright, clean, Apple iOS-inspired style |
| `ios-dark` | Dark Apple-style clock, subtle and elegant |
| `aviator` | Airport departure board style with Oswald font |

### Vibrant Themes

| Theme | Description |
|-------|-------------|
| `neon` | Black background with neon green glow |
| `red-stealth` | Dark with red digits, HUD-style appearance |
| `synthwave` | Purple/magenta, retro 80s aesthetic |

### Minimalist Themes

| Theme | Description |
|-------|-------------|
| `e-ink` | Light background, dark text, paper-like display |
| `terminal` | Green monospace on black, classic terminal |
| `wood` | Brown, warm, retro wall clock appearance |

### Sci-Fi Themes

| Theme | Description |
|-------|-------------|
| `trek-orange` | Bold orange inspired by Star Trek LCARS |
| `trek-red` | Bold red LCARS-style |
| `trek-blue` | Bold blue LCARS-style |
| `borg` | Black and green with harsh glow |

### Theme Examples

**iOS Dark:**
```yaml
type: custom:flip-clock-card
size: 130
theme: ios-dark
show_seconds: true
animation_speed: 0.5
```

**Neon:**
```yaml
type: custom:flip-clock-card
size: 110
theme: neon
show_seconds: true
animation_speed: 0.4
```

**Borg:**
```yaml
type: custom:flip-clock-card
size: 120
theme: borg
show_seconds: true
animation_speed: 0.5
```

### 🧩 Preview All Themes

Want to see all themes in action? Copy the contents of **[lovelace_examples.yaml](lovelace_examples.yaml)** into a new Dashboard (Raw configuration editor) for a complete gallery.

---

## Custom Styling

Override any theme properties using the `custom_style` object. You can use any theme as a base and customize specific properties.

### Custom Style Properties

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `bg` | color | Tile background color | `"#333"`, `"rgb(51, 51, 51)"` |
| `text` | color | Digit text color | `"#eee"`, `"#ffcc00"` |
| `font` | string | Font family | `"'Roboto', sans-serif"` |
| `radius` | number | Border radius (0-1, relative to tile height) | `0.1` (10% of height) |
| `shadow` | string | CSS box-shadow | `"0 4px 10px rgba(0,0,0,0.5)"` |
| `line` | color | Split line color between tile halves | `"rgba(0,0,0,0.4)"` |
| `glow` | string | CSS text-shadow for digit glow effect | `"0 0 10px rgba(255,0,0,0.8)"` |

### Custom Style Examples

**Yellow Glow Effect:**

```yaml
type: custom:flip-clock-card
size: 120
theme: classic
custom_style:
  bg: "#101010"
  text: "#ffcc00"
  glow: "0 0 12px rgba(255, 204, 0, 0.8)"
```

**Custom E-Ink Style:**

```yaml
type: custom:flip-clock-card
size: 100
theme: e-ink
custom_style:
  bg: "#fdf7e3"
  text: "#222222"
  font: "'Georgia', serif"
  radius: "0.02"
```

**Blue Neon Effect:**

```yaml
type: custom:flip-clock-card
size: 120
theme: neon
custom_style:
  text: "#00d4ff"
  glow: "0 0 15px rgba(0, 212, 255, 0.9)"
  shadow: "0 0 20px rgba(0, 212, 255, 0.3)"
```

---

## Complete Examples

### Wall Tablet Clock

Large, elegant clock for wall-mounted tablets:

```yaml
type: custom:flip-clock-card
size: 160
time_format: '24'
show_seconds: true
animation_speed: 0.6
theme: ios-dark
```

### Multi-Timezone Dashboard

Display multiple timezones with different themes:

```yaml
type: vertical-stack
cards:
  - type: custom:flip-clock-card
    size: 140
    timezone: 'UTC'
    custom_label: 'UTC'
    show_label: true
    label_position: 'top'
    theme: aviator
    show_seconds: true
  - type: custom:flip-clock-card
    size: 140
    timezone: 'America/New_York'
    custom_label: 'New York'
    show_label: true
    label_position: 'top'
    theme: ios-dark
    show_seconds: true
  - type: custom:flip-clock-card
    size: 140
    timezone: 'Asia/Tokyo'
    custom_label: 'Tokyo'
    show_label: true
    label_position: 'top'
    theme: neon
    show_seconds: true
```

### Synthwave Aesthetic

Retro 80s style with custom animations:

```yaml
type: custom:flip-clock-card
size: 140
time_format: '12'
show_seconds: true
am_pm_indicator: true
am_pm_style: 'flip'
am_pm_position: 'right'
animation_speed: 0.4
theme: synthwave
```

---

## All Parameters Reference

Complete list of all available parameters with types, defaults, and valid ranges.

### Basic Parameters

```yaml
type: custom:flip-clock-card           # Required - Card type identifier
size: 100                               # Default: 100, Range: 10-500 (pixels)
time_format: '24'                       # Default: '24', Options: '12', '24'
show_seconds: false                     # Default: false, Type: boolean
animation_speed: 0.6                    # Default: 0.6, Range: 0.1-2.0 (seconds)
theme: 'classic'                        # Default: 'classic', See Available Themes
```

### Timezone Parameters

```yaml
timezone: 'America/New_York'            # Default: null (local time), Type: string or object
# OR
timezone:
  value: 'America/New_York'             # IANA timezone identifier
  label: 'NYC'                          # Custom label for this timezone

show_label: false                       # Default: false, Type: boolean
label_position: 'right'                 # Default: 'right', Options: 'right', 'left', 'top', 'bottom', 'right-vertical'
label_size: 24                          # Default: 24, Range: 10-100 (pixels)
custom_label: null                      # Default: null, Type: string (overrides timezone label)
```

### AM/PM Parameters (12-hour format only)

```yaml
am_pm_indicator: false                  # Default: false, Type: boolean (requires time_format: '12')
am_pm_style: 'flip'                     # Default: 'flip', Options: 'flip', 'text'
am_pm_position: 'right'                 # Default: 'right', Options: 'right', 'left', 'top', 'bottom', 'right-top', 'right-bottom'
am_pm_orientation: 'horizontal'         # Default: 'horizontal', Options: 'horizontal', 'vertical'
am_pm_distance: 15                      # Default: 15, Range: 0-100 (% of card size)
am_pm_size: 50                          # Default: 50, Range: 10-100 (% of card size)
```

### Custom Style Parameters

```yaml
custom_style:                           # Default: null, Type: object
  bg: '#333'                            # Background color (CSS color)
  text: '#eee'                          # Text color (CSS color)
  font: "'Roboto', sans-serif"          # Font family (CSS font-family)
  radius: '0.1'                         # Border radius (0-1, relative to tile height)
  shadow: '0 4px 10px rgba(0,0,0,0.5)' # Box shadow (CSS box-shadow)
  line: 'rgba(0,0,0,0.4)'               # Split line color (CSS color)
  glow: 'none'                          # Text glow effect (CSS text-shadow)
```

### Complete Example with All Parameters

```yaml
type: custom:flip-clock-card
size: 120
time_format: '12'
show_seconds: true
animation_speed: 0.6
theme: 'ios-dark'
timezone:
  value: 'America/New_York'
  label: 'NYC'
show_label: true
label_position: 'top'
label_size: 30
custom_label: 'New York Time'
am_pm_indicator: true
am_pm_style: 'flip'
am_pm_position: 'right'
am_pm_orientation: 'vertical'
am_pm_distance: 20
am_pm_size: 50
custom_style:
  bg: '#1a1a1a'
  text: '#ffffff'
  glow: '0 0 10px rgba(255,255,255,0.3)'
```

---

## Security & Validation

The card includes comprehensive input validation and sanitization to prevent injection attacks and ensure safe operation.

### Input Validation Rules

| Parameter | Validation | Default Fallback |
|-----------|------------|------------------|
| `size` | Number between 10-500 | `100` |
| `animation_speed` | Number between 0.1-2.0 | `0.6` |
| `time_format` | Must be `'12'` or `'24'` | `'24'` |
| `show_seconds` | Boolean only | `false` |
| `timezone` | Valid IANA identifier or null | `null` (local time) |
| `show_label` | Boolean only | `false` |
| `label_position` | Whitelisted positions only | `'right'` |
| `label_size` | Number between 10-100 | `24` |
| `am_pm_indicator` | Boolean only | `false` |
| `am_pm_position` | Whitelisted positions only | `'right'` |
| `am_pm_orientation` | `'horizontal'` or `'vertical'` | `'horizontal'` |
| `am_pm_distance` | Number between 0-100 | `15` |
| `am_pm_size` | Number between 10-100 | `50` |
| `am_pm_style` | `'flip'` or `'text'` | `'flip'` |
| `theme` | Whitelisted theme names only | `'classic'` |
| `custom_style` | All properties sanitized | `null` |

### Custom Style Sanitization

All `custom_style` properties are validated:

- **Colors** (`bg`, `text`, `line`): Validated against CSS color formats (hex, rgb, rgba, hsl, named colors)
- **Fonts** (`font`): Sanitized to prevent injection, alphanumeric and standard characters only
- **CSS Values** (`shadow`, `glow`): Escaped to prevent XSS attacks, dangerous patterns removed
- **Numeric Values** (`radius`): Range-checked between 0 and 1

### Security Features

- ✅ All CSS values sanitized before DOM insertion
- ✅ Theme names validated against whitelist
- ✅ Custom style properties individually validated
- ✅ Safe default fallbacks for all invalid inputs
- ✅ XSS attack prevention through input escaping
- ✅ No external dependencies or remote resources (except fonts)

---

## Troubleshooting

### Common Issues

#### Clock Not Updating

| Issue | Solution |
|-------|----------|
| Clock frozen | Check browser console for errors |
| Time not changing | Verify the card is visible (uses IntersectionObserver) |
| Wrong time displayed | Check timezone configuration |
| Initial render incorrect | Clear browser cache (Ctrl+F5 or Cmd+Shift+R) |

**Additional Steps:**
1. Hard refresh your browser
2. Add `?v=2` to the resource URL to bust cache
3. Check Home Assistant logs for errors
4. Verify all configuration parameters are valid

#### Theme Not Applying

| Problem | Cause | Solution |
|---------|-------|----------|
| Theme looks wrong | Typo in theme name | Theme names are case-sensitive, verify spelling |
| Custom colors ignored | Invalid color format | Use valid CSS colors (hex, rgb, rgba, hsl) |
| Falls back to classic | Invalid theme name | Check against [Available Themes](#available-themes) list |

#### Animation Problems

| Problem | Possible Cause | Solution |
|---------|----------------|----------|
| Animation too fast/slow | Invalid `animation_speed` | Use range 0.1-2.0 seconds |
| Choppy animations | Performance issue | Reduce `size` or increase `animation_speed` |
| No animation | Browser compatibility | Requires modern browser with CSS animation support |

#### AM/PM Indicator Issues

| Problem | Solution |
|---------|----------|
| AM/PM not showing | Ensure `time_format: '12'` and `am_pm_indicator: true` |
| Position incorrect | Check `am_pm_position` value against valid options |
| Size too large/small | Adjust `am_pm_size` (10-100) |

#### Label Issues

| Problem | Solution |
|---------|----------|
| Label not visible | Set `show_label: true` |
| Wrong timezone name | Use `custom_label` to override |
| Label position wrong | Verify `label_position` value |
| Label size incorrect | Adjust `label_size` (10-100 pixels) |

### Performance Optimization

**For Best Performance:**

1. **Size**: Keep `size` under 300px for multiple instances
2. **Animation**: Use `animation_speed` between 0.4-0.8s
3. **Seconds**: Disable `show_seconds` if not needed (reduces updates)
4. **Multiple Clocks**: Limit to 3-5 simultaneous instances
5. **Visibility**: Card automatically stops when not visible (IntersectionObserver)

### Browser Compatibility

**Supported Browsers:**
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Home Assistant Companion App

**Required Features:**
- CSS Animations
- Custom Elements v1
- Shadow DOM
- IntersectionObserver API

### Debugging

**Enable Debug Mode:**

The card includes internal debug logging. To enable, edit the source file:

```javascript
this.debug = true; // Line 21 in flip-clock-card.js
```

This will output detailed logs to the browser console.

**Common Error Messages:**

- `"Element with id 'X' not found"` - Configuration mismatch, reconfigure the card
- `"Invalid timezone"` - Falls back to local time, check IANA timezone identifier
- `"Configuration error"` - Invalid config, check browser console for details

### Getting Help

If problems persist:

1. Check the [Issues](../../issues) page for similar problems
2. Include your YAML configuration when reporting issues
3. Include browser console errors
4. Specify Home Assistant version and browser type

---

## Contributing

Contributions are welcome! If you have ideas for improvements:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

**Areas for Contribution:**
- New themes
- Bug fixes
- Documentation improvements
- Performance optimizations
- New features

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Changelog

See [Releases](../../releases) for version history and changes.

---

## Credits

Created with ❤️ for the Home Assistant community.

**Special Thanks:**
- Home Assistant team for the amazing platform
- HACS for making custom component distribution easy
- All contributors and users who provided feedback

---

## Support

If you find this card useful, consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs
- 💡 Suggesting new features
- 📖 Improving documentation
- 🎨 Creating new themes

---

**Made for dashboards, tablets, and anyone who appreciates a good flip clock animation. Whether it's on an airport departure board, a starship bridge, or your hallway tablet - this card's got you covered.** 🕐
