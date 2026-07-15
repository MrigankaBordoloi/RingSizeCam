// ──────────────────────────────────────────────────────────────
// camera.ts — getUserMedia wrapper.
// Prefers rear camera on mobile (facingMode: 'environment').
// ──────────────────────────────────────────────────────────────

/**
 * Initialize the camera and attach the stream to a video element.
 * Returns the MediaStream for later cleanup.
 */
export async function initCamera(video: HTMLVideoElement): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  video.srcObject = stream;

  // Wait for the video to actually start playing
  await new Promise<void>((resolve) => {
    video.onloadedmetadata = () => {
      video.play();
      resolve();
    };
  });

  return stream;
}
