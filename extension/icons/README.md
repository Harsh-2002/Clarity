# Icon Assets Needed

This extension requires icon assets in PNG format. Please create the following icons:

## Default Icons (Blue/Primary Color)
- `icon-16.png` - 16x16 pixels
- `icon-48.png` - 48x48 pixels  
- `icon-128.png` - 128x128 pixels

## Green Icons (Bookmarked State)
- `icon-green-16.png` - 16x16 pixels
- `icon-green-48.png` - 48x48 pixels
- `icon-green-128.png` - 128x128 pixels

## Design Guidelines

### Default Icons
- Use Clarity brand colors (blue #4285f4)
- Simple bookmark icon or "C" logo
- Clean, minimal design

### Green Icons  
- Same design as default
- Change primary color to green (#34a853)
- Indicates "saved" state

## Quick Creation with SVG

You can create simple bookmark icons using this SVG template:

### Default (Blue)
```svg
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="24" fill="#4285f4"/>
  <path d="M40 30 h48 v68 l-24 -16 l-24 16 Z" fill="white"/>
</svg>
```

### Green  
```svg
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="24" fill="#34a853"/>
  <path d="M40 30 h48 v68 l-24 -16 l-24 16 Z" fill="white"/>
</svg>
```

Save these as SVG files, then convert to PNG at the required sizes using:
- Online tools like CloudConvert
- ImageMagick: `convert icon.svg -resize 16x16 icon-16.png`
- Inkscape: Export PNG at specific dimensions

## Temporary Workaround

For testing, you can use any PNG images of the correct sizes as placeholders.
