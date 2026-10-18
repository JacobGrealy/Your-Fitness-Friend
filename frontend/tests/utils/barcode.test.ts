import { BarcodeFormat } from '@zxing/library'
import { createBarcodeReader, decodeFrame, toLuminance } from '@/utils/barcode'

// FF-0060: the real decode test. The scanner used to decode with jsQR, which only
// reads QR codes, so a product barcode was never recognised no matter how well it
// was framed. These tests feed actual bitmaps through the decoder - including a
// genuine EAN-13 built from the encoding tables rather than a fixture image.

const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011']
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111']
const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100']
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL']

/** EAN-13 checksum digit. */
function checkDigit(first12: string): string {
  let sum = 0
  for (let i = 0; i < 12; i += 1) sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3)
  return String((10 - (sum % 10)) % 10)
}

/** The 95-module bit pattern of an EAN-13, as the spec defines it. */
function ean13Bits(code: string): string {
  const digits = code.split('').map(Number)
  const parity = PARITY[digits[0]]
  let bits = '101'
  for (let i = 1; i <= 6; i += 1) bits += (parity[i - 1] === 'L' ? L : G)[digits[i]]
  bits += '01010'
  for (let i = 7; i <= 12; i += 1) bits += R[digits[i]]
  return `${bits}101`
}

/** Render a bit pattern into an RGBA buffer the way a camera would see it. */
function renderBits(bits: string, options: { width?: number; height?: number; modules?: number } = {}) {
  const moduleWidth = options.modules ?? 5
  const quiet = 10 * moduleWidth
  const width = options.width ?? quiet * 2 + bits.length * moduleWidth
  const height = options.height ?? 200
  const data = new Uint8ClampedArray(width * height * 4)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = Math.floor((x - quiet) / moduleWidth)
      const isBar = x >= quiet && index >= 0 && index < bits.length && bits[index] === '1'
      const value = isBar ? 0 : 255
      const offset = (y * width + x) * 4
      data[offset] = value
      data[offset + 1] = value
      data[offset + 2] = value
      data[offset + 3] = 255
    }
  }
  return { data, width, height }
}

describe('toLuminance', () => {
  it('converts RGBA to one byte per pixel, green-weighted', () => {
    const rgba = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255, 0, 255, 0, 255])
    const luminance = toLuminance(rgba, 3, 1)

    expect(luminance).toHaveLength(3)
    expect(luminance[0]).toBe(0)          // black
    expect(luminance[1]).toBe(255)        // white
    expect(luminance[2]).toBe(127)        // pure green: (0 + 510 + 0) >> 2
  })
})

describe('decodeFrame (FF-0060)', () => {
  it('reads a real EAN-13 product barcode', () => {
    // Nutella's actual EAN-13, with the checksum computed rather than assumed.
    const code = '301762042200' + checkDigit('301762042200')
    expect(code).toBe('3017620422003')
    const frame = renderBits(ean13Bits(code))

    const decoded = decodeFrame(createBarcodeReader(), frame)

    expect(decoded).toBe(code)
  })

  it('reads the code when the frame is small and the bars are thin', () => {
    const first12 = '012345678901'
    const code = first12 + checkDigit(first12)
    const frame = renderBits(ean13Bits(code), { modules: 3, height: 120 })

    // A leading-zero EAN-13 *is* a UPC-A, and ZXing reports it as UPC-A: 12 digits
    // rather than 13. That is correct behaviour, and the server canonicalises the
    // two forms so a US product is not missed (see test_barcode_codes.py).
    const decoded = decodeFrame(createBarcodeReader(), frame)
    expect(decoded).not.toBeNull()
    expect([code, code.slice(1)]).toContain(decoded)
  })

  it('returns null for a frame with no barcode in it', () => {
    const width = 320
    const height = 240
    const blank = { data: new Uint8ClampedArray(width * height * 4).fill(255), width, height }

    expect(decodeFrame(createBarcodeReader(), blank)).toBeNull()
  })

  it('returns null rather than throwing on an empty frame', () => {
    const empty = { data: new Uint8ClampedArray(0), width: 0, height: 0 }
    expect(decodeFrame(createBarcodeReader(), empty)).toBeNull()
  })

})
