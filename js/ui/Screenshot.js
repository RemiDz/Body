/**
 * Resonance Body Map - Screenshot
 * Captures the current visualization state as an image
 */

export class Screenshot {
  /**
   * Capture the body container as a canvas image
   * Falls back to a styled info card if html2canvas is unavailable
   */
  static async capture() {
    const container = document.getElementById('app');
    if (!container) return;

    try {
      // Use the native Canvas capture approach
      const canvas = document.createElement('canvas');
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      // Draw background
      ctx.fillStyle = getComputedStyle(document.body).backgroundColor || '#08080c';
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Get frequency info
      const freqNum = document.querySelector('.freq-number')?.textContent || '';
      const freqNote = document.getElementById('freqNote')?.textContent || '';
      const freqRegion = document.getElementById('freqRegion')?.textContent || '';

      // Draw text info
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '14px Quicksand, sans-serif';
      ctx.textAlign = 'center';
      const cx = rect.width / 2;

      if (freqNum && freqNum !== '---') {
        ctx.font = 'bold 48px Cormorant Garamond, serif';
        ctx.fillText(`${freqNum} Hz`, cx, rect.height / 2 - 20);
        if (freqNote) {
          ctx.font = '24px Cormorant Garamond, serif';
          ctx.fillText(freqNote, cx, rect.height / 2 + 20);
        }
        if (freqRegion) {
          ctx.font = '16px Quicksand, sans-serif';
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.fillText(freqRegion, cx, rect.height / 2 + 50);
        }
      } else {
        ctx.font = '24px Cormorant Garamond, serif';
        ctx.fillText('Resonance Body Map', cx, rect.height / 2);
      }

      // Watermark
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px Quicksand, sans-serif';
      ctx.fillText('Resonance Body Map', cx, rect.height - 20);

      // Trigger download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resonance-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');

    } catch (err) {
      console.error('Screenshot failed:', err);
    }
  }

  /**
   * Share using Web Share API if available
   */
  static async share() {
    if (!navigator.share) {
      // Fallback to download
      await Screenshot.capture();
      return;
    }

    try {
      await navigator.share({
        title: 'Resonance Body Map',
        text: 'Sound frequency visualization',
        url: window.location.href
      });
    } catch (_) {
      // User cancelled or not supported — fall back to capture
      await Screenshot.capture();
    }
  }
}
