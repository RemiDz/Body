/**
 * Resonance Body Map - Audio File Input
 * Allows loading an audio file (MP3/WAV) and visualizing it
 * instead of live microphone input.
 */

export class AudioFileInput {
  constructor() {
    this.fileInput = null;
    this.audioElement = null;
    this.isPlaying = false;
    this.onFileReady = null; // callback(audioElement)
    this.createUI();
  }

  createUI() {
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = 'audio/*';
    this.fileInput.style.display = 'none';
    this.fileInput.addEventListener('change', (e) => this.handleFile(e));
    document.body.appendChild(this.fileInput);
  }

  /**
   * Open file picker
   */
  open() {
    this.fileInput?.click();
  }

  handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected
    this.fileInput.value = '';

    // Clean up previous
    this.stop();

    const url = URL.createObjectURL(file);
    this.audioElement = new Audio(url);
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.loop = false;

    this._endedHandler = () => {
      this.isPlaying = false;
    };
    this.audioElement.addEventListener('ended', this._endedHandler);

    if (this.onFileReady) {
      this.onFileReady(this.audioElement, file.name);
    }
  }

  play() {
    if (this.audioElement) {
      this.audioElement.play();
      this.isPlaying = true;
    }
  }

  pause() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.isPlaying = false;
    }
  }

  stop() {
    if (this.audioElement) {
      // Remove ended listener to prevent leak
      if (this._endedHandler) {
        this.audioElement.removeEventListener('ended', this._endedHandler);
        this._endedHandler = null;
      }
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.isPlaying = false;
      // Revoke old object URL
      if (this.audioElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.audioElement.src);
      }
      this.audioElement = null;
    }
  }

  destroy() {
    this.stop();
    this.fileInput?.remove();
  }
}
