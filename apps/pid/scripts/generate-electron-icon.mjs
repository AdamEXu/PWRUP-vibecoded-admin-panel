import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PNG } from "pngjs";
import toIco from "to-ico";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const iconDir = path.join(projectRoot, "build", "icons");

function setPixel(png, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) {
    return;
  }

  const index = (png.width * y + x) << 2;
  png.data[index] = r;
  png.data[index + 1] = g;
  png.data[index + 2] = b;
  png.data[index + 3] = a;
}

function fillRect(png, x, y, width, height, color) {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) {
      setPixel(png, px, py, ...color);
    }
  }
}

function drawDiagonalStroke(png, x0, y0, x1, y1, thickness, color) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length = Math.max(Math.abs(dx), Math.abs(dy));
  const radius = Math.max(1, Math.floor(thickness / 2));

  for (let i = 0; i <= length; i += 1) {
    const x = Math.round(x0 + (dx * i) / length);
    const y = Math.round(y0 + (dy * i) / length);

    for (let oy = -radius; oy <= radius; oy += 1) {
      for (let ox = -radius; ox <= radius; ox += 1) {
        if (ox * ox + oy * oy <= radius * radius) {
          setPixel(png, x + ox, y + oy, ...color);
        }
      }
    }
  }
}

function drawRoundedFrame(png, size) {
  const framePadding = Math.round(size * 0.11);
  const frameRadius = Math.round(size * 0.14);
  const frameThickness = Math.max(2, Math.round(size * 0.035));
  const left = framePadding;
  const top = framePadding;
  const right = size - framePadding - 1;
  const bottom = size - framePadding - 1;
  const borderColor = [79, 216, 255, 255];

  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const nearestX = Math.min(Math.max(x, left + frameRadius), right - frameRadius);
      const nearestY = Math.min(Math.max(y, top + frameRadius), bottom - frameRadius);
      const dist = Math.hypot(x - nearestX, y - nearestY);

      if (dist <= frameRadius && dist >= frameRadius - frameThickness) {
        setPixel(png, x, y, ...borderColor);
      }
    }
  }
}

function drawLogoText(png, size) {
  const white = [247, 252, 255, 255];
  const stroke = Math.max(2, Math.round(size * 0.085));
  const letterHeight = Math.round(size * 0.5);
  const top = Math.round(size * 0.25);
  const bLeft = Math.round(size * 0.22);
  const rLeft = Math.round(size * 0.56);

  fillRect(png, bLeft, top, stroke, letterHeight, white);
  fillRect(png, bLeft, top, Math.round(size * 0.18), stroke, white);
  fillRect(png, bLeft, top + Math.round(letterHeight * 0.42), Math.round(size * 0.16), stroke, white);
  fillRect(png, bLeft, top + letterHeight - stroke, Math.round(size * 0.18), stroke, white);
  fillRect(png, bLeft + Math.round(size * 0.16), top + stroke, stroke, Math.round(letterHeight * 0.35), white);
  fillRect(
    png,
    bLeft + Math.round(size * 0.14),
    top + Math.round(letterHeight * 0.52),
    stroke,
    Math.round(letterHeight * 0.35),
    white
  );

  fillRect(png, rLeft, top, stroke, letterHeight, white);
  fillRect(png, rLeft, top, Math.round(size * 0.18), stroke, white);
  fillRect(png, rLeft, top + Math.round(letterHeight * 0.42), Math.round(size * 0.16), stroke, white);
  fillRect(png, rLeft + Math.round(size * 0.16), top + stroke, stroke, Math.round(letterHeight * 0.35), white);
  drawDiagonalStroke(
    png,
    rLeft + Math.round(size * 0.06),
    top + Math.round(letterHeight * 0.5),
    rLeft + Math.round(size * 0.22),
    top + letterHeight,
    Math.max(2, Math.round(stroke * 0.8)),
    white
  );
}

function renderIcon(size) {
  const png = new PNG({ width: size, height: size });
  const center = (size - 1) / 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const distance = Math.hypot(x - center, y - center) / (size * 0.75);
      const shade = Math.min(1, Math.max(0, distance));
      const r = Math.round(13 + 18 * shade);
      const g = Math.round(35 + 82 * shade);
      const b = Math.round(70 + 135 * shade);
      setPixel(png, x, y, r, g, b, 255);
    }
  }

  drawRoundedFrame(png, size);
  drawLogoText(png, size);
  return PNG.sync.write(png);
}

async function main() {
  await fs.mkdir(iconDir, { recursive: true });

  const iconPngBuffer = renderIcon(512);
  const icoSizes = [256, 128, 64, 48, 32, 16].map((size) => renderIcon(size));
  const icoBuffer = await toIco(icoSizes);

  await fs.writeFile(path.join(iconDir, "icon.png"), iconPngBuffer);
  await fs.writeFile(path.join(iconDir, "icon.ico"), icoBuffer);

  process.stdout.write(`Generated icons in ${iconDir}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
