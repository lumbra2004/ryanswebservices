# Christmas Theme for Ryans Web Services

A high-quality, festive Christmas theme that can be easily enabled/disabled across the entire website.

## Quick Start

### Enable Christmas Theme (All Pages at Once)

Add this single line before the closing `</body>` tag on any page:

```html
<script src="/themes/christmas/christmas.js"></script>
```

That's it! The JavaScript will automatically:
- Load the festive CSS
- Add falling snowflakes
- Display twinkling string lights
- Show corner decorations
- Display a "Happy Holidays" greeting (once per session)

### Disable Christmas Theme

Open `themes/christmas/christmas.js` and change line 20:

```javascript
ENABLED: false,  // Change true to false
```

Or simply remove the script tag from your pages.

---

## Features

| Feature | Default | Description |
|---------|---------|-------------|
| `snowflakes` | ✅ On | Gentle falling snow animation |
| `twinklingLights` | ✅ On | String lights at top of page |
| `festiveCSS` | ✅ On | Red/green/gold color scheme |
| `cornerDecoration` | ✅ On | Holly & candy cane decorations |
| `greeting` | ✅ On | "Happy Holidays" toast (once) |
| `santaHat` | ❌ Off | Santa hat on logo |
| `cursorTrail` | ❌ Off | Sparkle trail on cursor |

## Customization

Edit the CONFIG object in `christmas.js`:

```javascript
const CONFIG = {
    ENABLED: true,              // Master on/off switch
    
    snowflakes: true,           // Falling snow
    twinklingLights: true,      // String lights
    festiveCSS: true,           // Color scheme
    santaHat: false,            // Hat on logo
    cursorTrail: false,         // Sparkle cursor
    cornerDecoration: true,     // Holly & candy cane
    greeting: true,             // Welcome toast
    
    snowflakeCount: 50,         // More = heavier snow
    snowflakeSpeed: 1,          // 0.5=slow, 1=normal, 2=fast
    lightsColor: 'multicolor',  // Options below
};
```

### Light Colors
- `'multicolor'` - Classic rainbow Christmas lights
- `'warm'` - Warm orange/yellow tones
- `'cool'` - Blue/white winter feel
- `'red-green'` - Traditional red and green only

---

## Files

```
themes/christmas/
├── christmas.js     # Main controller (edit CONFIG here)
├── christmas.css    # Festive color overrides
└── README.md        # This file
```

## Performance

- Snowflakes use CSS animations (GPU accelerated)
- All decorations use `pointer-events: none` (won't interfere with clicks)
- Toast message only shows once per session
- Default 50 snowflakes is optimized for performance

## Adding to All Pages

For a quick site-wide enable, add the script to your common pages:
- `index.html`
- `pricing.html`
- `login.html`
- `signup.html`
- `profile.html`
- `messages.html`
- `blog.html`
- `resources.html`
- `admin.html`

Or use a server-side include/template to add it everywhere at once.

---

**Enjoy the holidays! 🎄⭐🎅**
