const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const ICON_SIZES = [192, 512];
const SOURCE_ICON = path.join(__dirname, '../public/favicon.svg');
const OUTPUT_DIR = path.join(__dirname, '../public');

async function generateIcons() {
  try {
    // Read the source SVG
    const sourceBuffer = await fs.readFile(SOURCE_ICON);

    // Generate each size
    for (const size of ICON_SIZES) {
      await sharp(sourceBuffer)
        .resize(size, size)
        .toFile(path.join(OUTPUT_DIR, `pwa-${size}x${size}.png`));
      
      console.log(`Generated ${size}x${size} icon`);
    }

    console.log('Icon generation complete!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();

