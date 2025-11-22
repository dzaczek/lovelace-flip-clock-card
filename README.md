# Flip Clock Card ![Preview card](./img/flipfalp.jpg)

Yo! Here is a neat little card I whipped up for Home Assistant. It's a retro style Flip Clock (split flap display) that actually animates properly.
![Preview card](./img/flipconf.jpg)
I wasn't happy with the static clocks out there, so I made this one. It has a real 3D fall down animation with a satisfying little bounce at the end. Looks super clean on wall mounted tablets.

## Why you might want this
* **It moves!** The cards actually flip down. It’s weirdly satisfying to watch.
* **No bloat.** It’s just pure CSS and JS. No heavy libraries attached.
* **Customizable.** Make it huge, make it tiny – your call.
* **12h / 24h.** Whether you like AM/PM or military time, I got you covered.
* **Seconds.** You can show them if you want to see time fly by.

## How to install

### The Easy Way (HACS)
1. Go to HACS > Frontend.
2. Click the 3 dots (top right) -> **Custom repositories**.
3. Paste the URL of this repo.
4. Choose **Lovelace** as the category.
5. Click **Add**, then install. Easy peasy.

### The "I like pain" Way (Manual)
1. Download the `flip-clock-card.js` file from the releases.
2. Throw it into your `/config/www/` folder.
3. Add it to your dashboard resources (`/local/flip-clock-card.js`).
4. Don't forget to refresh your cache!

## How to use it

Just copy-paste this bad boy into your dashboard configuration (YAML mode):

```yaml
type: custom:flip-clock-card
size: 80                # How big do you want it? (Default is 100)
time_format: '24'       # '12' for AM/PM stuff, '24' for normal people ;)
show_seconds: true      # Set to false if you hate seconds
