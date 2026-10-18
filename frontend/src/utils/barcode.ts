import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from '@zxing/library'

/**
 * Barcode decoding (FF-0060).
 *
 * Products carry 1D symbologies — EAN-13, UPC-A, Code-128 — and the app used to
 * decode with jsQR, which only understands QR codes. It returned null for every
 * packet on the shelf, no matter how well the code was framed.
 *
 * ZXing handles both 1D and 2D, so it replaces jsQR outright.
 */

/** Formats worth attempting for food. QR stays in: some products use it. */
const FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.ITF,
  BarcodeFormat.QR_CODE,
]

export type BarcodeReader = MultiFormatReader

export function createBarcodeReader(): BarcodeReader {
  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS)
  // TRY_HARDER costs time per frame but reads angled, small or partly obscured
  // codes — which is most of what a phone camera sees in a kitchen.
  hints.set(DecodeHintType.TRY_HARDER, true)
  const reader = new MultiFormatReader()
  reader.setHints(hints)
  return reader
}

/**
 * Convert RGBA canvas pixels to the single-byte grayscale ZXing expects.
 *
 * This is not cosmetic: `RGBLuminanceSource` only unpacks pixels when
 * `BYTES_PER_ELEMENT === 4` (an Int32Array). Hand it a `Uint8ClampedArray` of RGBA
 * and it treats every *byte* as a pixel — the image is garbage and every frame
 * fails to decode, silently. Converting explicitly is the whole ballgame.
 */
export function toLuminance(rgba: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const pixels = width * height
  const luminance = new Uint8ClampedArray(pixels)
  for (let i = 0, j = 0; j < pixels; i += 4, j += 1) {
    // Green-weighted, matching ZXing's own conversion.
    luminance[j] = (rgba[i] + 2 * rgba[i + 1] + rgba[i + 2]) >> 2
  }
  return luminance
}

/**
 * Decode one frame. Returns the code (trimmed) or null when nothing readable is
 * in view — which is the normal case for most frames, so it must not throw.
 */
export function decodeFrame(
  reader: BarcodeReader,
  image: { data: Uint8ClampedArray; width: number; height: number }
): string | null {
  if (!image.width || !image.height) return null
  try {
    const luminance = toLuminance(image.data, image.width, image.height)
    const source = new RGBLuminanceSource(luminance, image.width, image.height)
    const bitmap = new BinaryBitmap(new HybridBinarizer(source))
    const result = reader.decode(bitmap)
    const text = result?.getText()?.trim()
    return text ? text : null
  } catch {
    // NotFoundException on every frame that has no code in it. Expected.
    return null
  }
}

/** Longest edge to decode at; bigger frames only cost time. */
export const MAX_DECODE_EDGE = 800
