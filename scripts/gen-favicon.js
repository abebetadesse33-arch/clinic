/**
 * Generates a valid binary .ico file for the NiniMed favicon.
 * ICO format: ICONDIR + ICONDIRENTRY + BMP/PNG image data.
 * Uses a PNG-in-ICO (Vista+) with a 32x32 green medical cross.
 */
const fs = require("fs");
const path = require("path");

// We'll embed a minimal PNG inside an ICO container.
// This is the modern "PNG-in-ICO" format supported by all modern browsers.

// Create a simple 32x32 PNG with a green background and white cross
// using pure Node.js Buffer manipulation (no canvas/sharp needed).
// We use a pre-encoded minimal PNG that is a valid 32x32 RGBA image.

// Minimal valid 16x16 green cross ICO (hand-crafted binary, well-formed ICO + BMP)
// ICO Header (6 bytes): reserved=0, type=1, count=1
// ICO Directory Entry (16 bytes): width=16, height=16, colorCount=0, reserved=0, planes=1, bitCount=32, sizeInBytes=..., offset=22
// BMP data follows

function writePng32x32GreenCross() {
  // We'll create a simple ICO using a hardcoded valid ICO binary
  // This is a 16x16 green (#005C4B) square with white cross — encoded as ICO with embedded BMP
  // Generated from a known-valid ICO source

  // Standard ICO file structure:
  // [ICONDIR: 6 bytes][ICONDIRENTRY x N: 16 bytes each][Image data]

  // Use a well-known minimal valid ICO binary (green, 16x16, 32-bit BMP-in-ICO)
  // The following is a legitimate hand-assembled ICO file:
  const icoHex =
    // ICONDIR: idReserved=0000, idType=0100, idCount=0100
    "000001000100" +
    // ICONDIRENTRY: bWidth=10, bHeight=10, bColorCount=00, bReserved=00
    // wPlanes=0100, wBitCount=2000 (32bpp)
    // dwBytesInRes=68030000 (840 bytes), dwImageOffset=16000000 (22 = 0x16)
    "10100000010020004803000016000000" +
    // BITMAPINFOHEADER (40 bytes): size=28000000, width=10000000, height=20000000 (2x actual)
    // planes=0100, bitcount=2000, compression=0,0,0,0
    // sizeImage=00300000, xPPM=0, yPPM=0, clrUsed=0, clrImportant=0
    "2800000010000000200000000100200000000000003000000000000000000000000000000000000000";

  // This approach won't give us a pixel-perfect ICO without a full PNG encoder.
  // Instead, let's just write a known-good ICO binary that is structurally valid.
  return null;
}

// Best approach without external deps: copy the SVG and add proper ICO wrapping
// OR: write a script that creates a PNG using canvas API in Node

// Since we don't have canvas, let's use a pre-encoded minimal ICO
// This is a real valid 32x32 favicon.ico binary (NiniMed green #005C4B with white cross)
// encoded as base64 from a known-good source:

const FAVICON_BASE64 = `
AAABAAEAICAQAAEABADoAgAAFgAAACgAAAAgAAAAQAAAAAEABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAA5cY0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAdwAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAf3d3d3d3d3d3d3d3d3d3d3d3d3d3f3d3d3d3d3d3d3d3d3d3d3d3d3d3f3cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAd3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3
`.replace(/\s/g, "");

// That base64 is illustrative. Let's instead write the correct approach:
// Create a proper ICO file from a well-known 1-color source.

// FINAL APPROACH: Write a valid minimal ICO file by hand
// Format: ICONDIR (6) + ICONDIRENTRY (16) + BITMAPINFOHEADER (40) + pixel data + mask
// 32x32 32-bit ICO = 40 + (32*32*4) + (32*4) = 40 + 4096 + 128 = 4264 bytes total

function createIco32x32() {
  const width = 32;
  const height = 32;
  const bpp = 32;
  const pixelDataSize = width * height * 4; // RGBA
  const maskSize = (width * height) / 8; // 1-bit mask
  const bmpSize = 40 + pixelDataSize + maskSize;
  const fileSize = 6 + 16 + bmpSize;

  const buf = Buffer.alloc(fileSize, 0);
  let off = 0;

  // === ICONDIR ===
  buf.writeUInt16LE(0, off); off += 2; // idReserved
  buf.writeUInt16LE(1, off); off += 2; // idType = 1 (ICO)
  buf.writeUInt16LE(1, off); off += 2; // idCount = 1

  // === ICONDIRENTRY ===
  buf.writeUInt8(width, off); off += 1;   // bWidth
  buf.writeUInt8(height, off); off += 1;  // bHeight
  buf.writeUInt8(0, off); off += 1;       // bColorCount (0 = true color)
  buf.writeUInt8(0, off); off += 1;       // bReserved
  buf.writeUInt16LE(1, off); off += 2;    // wPlanes
  buf.writeUInt16LE(bpp, off); off += 2;  // wBitCount
  buf.writeUInt32LE(bmpSize, off); off += 4; // dwBytesInRes
  buf.writeUInt32LE(6 + 16, off); off += 4;  // dwImageOffset

  // === BITMAPINFOHEADER ===
  buf.writeUInt32LE(40, off); off += 4;           // biSize
  buf.writeInt32LE(width, off); off += 4;          // biWidth
  buf.writeInt32LE(height * 2, off); off += 4;     // biHeight (doubled for ICO mask)
  buf.writeUInt16LE(1, off); off += 2;             // biPlanes
  buf.writeUInt16LE(bpp, off); off += 2;           // biBitCount
  buf.writeUInt32LE(0, off); off += 4;             // biCompression (BI_RGB)
  buf.writeUInt32LE(pixelDataSize, off); off += 4; // biSizeImage
  buf.writeInt32LE(0, off); off += 4;              // biXPelsPerMeter
  buf.writeInt32LE(0, off); off += 4;              // biYPelsPerMeter
  buf.writeUInt32LE(0, off); off += 4;             // biClrUsed
  buf.writeUInt32LE(0, off); off += 4;             // biClrImportant

  // === Pixel Data (BGRA, bottom-up) ===
  // Background: #005C4B (dark green) = R=0, G=92, B=75
  const bgB = 75, bgG = 92, bgR = 0;
  // Cross: white = R=255, G=255, B=255

  // Draw 32x32 image bottom-up (row 0 of buffer = bottom row of image)
  for (let row = 0; row < height; row++) {
    const y = height - 1 - row; // flip for bottom-up
    for (let x = 0; x < width; x++) {
      // White cross: columns 14-17 OR rows 14-17 (centered cross, 4px wide)
      const inCrossH = y >= 13 && y <= 18;
      const inCrossV = x >= 13 && x <= 18;
      const isCross = inCrossH || inCrossV;
      const R = isCross ? 255 : bgR;
      const G = isCross ? 255 : bgG;
      const B = isCross ? 255 : bgB;
      const A = 255;
      buf.writeUInt8(B, off); off += 1; // Blue
      buf.writeUInt8(G, off); off += 1; // Green
      buf.writeUInt8(R, off); off += 1; // Red
      buf.writeUInt8(A, off); off += 1; // Alpha
    }
  }

  // === AND Mask (all transparent = 0x00 = opaque) ===
  // Already zeroed by Buffer.alloc

  return buf;
}

const icoBuffer = createIco32x32();
const outPath = path.join(__dirname, "..", "public", "favicon.ico");
fs.writeFileSync(outPath, icoBuffer);
console.log(`✅ Written valid binary favicon.ico (${icoBuffer.length} bytes) to ${outPath}`);
