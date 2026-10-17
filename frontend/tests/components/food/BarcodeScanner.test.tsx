import { render, screen, waitFor, act } from '@testing-library/react'
import BarcodeScanner from '@/components/food/BarcodeScanner'
import jsQR from 'jsqr'

// FF-0030: the scanner only exists because the app is now served over HTTPS.
// jsdom has neither a camera nor a canvas decoder, so both are stubbed: the point
// of these tests is the decision logic (secure context, permission, decode ->
// callback), not the pixels.

jest.mock('jsqr', () => ({ __esModule: true, default: jest.fn() }))

const decode = jsQR as unknown as jest.Mock

const fakeStream = () => ({
  getTracks: () => [{ stop: jest.fn() }],
})

function stubCamera(impl?: () => Promise<unknown>) {
  const getUserMedia = jest.fn(impl ?? (() => Promise.resolve(fakeStream())))
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  })
  return getUserMedia
}

function stubCanvas() {
  // jsdom has no 2d context; give it just enough for the frame loop.
  const context = {
    drawImage: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
  };
  (HTMLCanvasElement.prototype as any).getContext = jest.fn(() => context);
  Object.defineProperty(HTMLVideoElement.prototype, 'readyState', {
    configurable: true,
    get: () => 4, // HAVE_ENOUGH_DATA
  })
  Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, get: () => 640 })
  Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, get: () => 480 })
  HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve())
}

describe('BarcodeScanner (FF-0030)', () => {
  beforeEach(() => {
    decode.mockReset()
    stubCanvas()
  })

  afterEach(() => {
    // leave no half-stubbed camera behind for the next suite
    delete (navigator as any).mediaDevices
  })

  it('explains the HTTPS requirement when the origin is not a secure context', async () => {
    // jsdom has no mediaDevices at all, which is exactly the plain-HTTP case
    const onUnavailable = jest.fn()
    render(<BarcodeScanner onDetected={jest.fn()} onUnavailable={onUnavailable} />)

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/https/i))
    expect(onUnavailable).toHaveBeenCalled()
  })

  it('reports a refused permission in words a user can act on', async () => {
    stubCamera(() => Promise.reject(Object.assign(new Error('no'), { name: 'NotAllowedError' })))
    render(<BarcodeScanner onDetected={jest.fn()} />)

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/permission was refused/i))
    expect(screen.getByRole('alert')).toHaveTextContent(/android settings/i)
  })

  it('asks for the rear camera', async () => {
    const getUserMedia = stubCamera()
    render(<BarcodeScanner onDetected={jest.fn()} />)

    await waitFor(() => expect(getUserMedia).toHaveBeenCalled())
    expect(getUserMedia.mock.calls[0][0].video.facingMode.ideal).toBe('environment')
    expect(getUserMedia.mock.calls[0][0].audio).toBe(false)
  })

  it('reports a decoded code once and stops looking', async () => {
    stubCamera()
    decode.mockReturnValue({ data: ' 3017620422003 ' })
    const onDetected = jest.fn()

    render(<BarcodeScanner onDetected={onDetected} />)

    await waitFor(() => expect(onDetected).toHaveBeenCalledWith('3017620422003'))
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300))
    })
    expect(onDetected).toHaveBeenCalledTimes(1)
  })

  it('keeps scanning while nothing decodes', async () => {
    stubCamera()
    decode.mockReturnValue(null)
    const onDetected = jest.fn()

    render(<BarcodeScanner onDetected={onDetected} />)

    await waitFor(() => expect(decode).toHaveBeenCalled())
    expect(onDetected).not.toHaveBeenCalled()
  })

  it('releases the camera when it unmounts', async () => {
    const stop = jest.fn()
    stubCamera(() => Promise.resolve({ getTracks: () => [{ stop }] }))

    const { unmount } = render(<BarcodeScanner onDetected={jest.fn()} />)
    await waitFor(() => expect(screen.getByText(/point the camera/i)).toBeInTheDocument())

    unmount()

    expect(stop).toHaveBeenCalled()
  })
})
