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
export interface DecodeOptions {
  /**
   * Quarter turns to attempt, in order. Default `[0]`; the scanner passes all four
   * periodically so an upright barcode is still read.
   */
  quarterTurns?: number[]
}

export function decodeFrame(
  reader: BarcodeReader,
  image: { data: Uint8ClampedArray; width: number; height: number },
  options: DecodeOptions = {}
): string | null {
  if (!image.width || !image.height) return null
  const turns = options.quarterTurns ?? [0]
  const upright = toLuminance(image.data, image.width, image.height)

  for (const quarterTurns of turns) {
    const rotated = rotateLuminance(upright, image.width, image.height, quarterTurns)
    try {
      const source = new RGBLuminanceSource(rotated.data, rotated.width, rotated.height)
      const bitmap = new BinaryBitmap(new HybridBinarizer(source))
      const text = reader.decode(bitmap)?.getText()?.trim()
      if (text) return text
    } catch {
      // NotFoundException — the normal result for a frame without a readable code.
    }
  }
  return null
}

/** Longest edge to decode at; bigger frames only cost time. */
export const MAX_DECODE_EDGE = 800

/**
 * Rotate a luminance buffer by quarter turns (clockwise).
 *
 * ZXing's 1D readers only scan horizontal rows, so a barcode that appears upright
 * in the frame is invisible to them — measured at 23ms and a miss versus 1ms and a
 * hit for the same code lying flat (FF-0062). Holding a packet sideways, or a
 * WebView that hands over frames rotated relative to the preview, is enough to make
 * the scanner look completely dead.
 */
export function rotateLuminance(
  luminance: Uint8ClampedArray,
  width: number,
  height: number,
  quarterTurns: number
): { data: Uint8ClampedArray; width: number; height: number } {
  const turns = ((quarterTurns % 4) + 4) % 4
  if (turns === 0) return { data: luminance, width, height }

  const swap = turns % 2 === 1
  const outWidth = swap ? height : width
  const outHeight = swap ? width : height
  const out = new Uint8ClampedArray(luminance.length)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = luminance[y * width + x]
      let nx: number
      let ny: number
      if (turns === 1) {
        nx = height - 1 - y
        ny = x
      } else if (turns === 2) {
        nx = width - 1 - x
        ny = height - 1 - y
      } else {
        nx = y
        ny = width - 1 - x
      }
      out[ny * outWidth + nx] = value
    }
  }

  return { data: out, width: outWidth, height: outHeight }
}
