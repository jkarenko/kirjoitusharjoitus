import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

