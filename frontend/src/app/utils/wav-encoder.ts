/**
 * Interfaz que define un buffer de audio básico con sus canales y tasa de muestreo.
 */
export interface AudioData {
  sampleRate: number;
  channels: Float32Array[]; // Array de canales (mono: 1 canal, estéreo: 2 canales)
}

/**
 * Convierte datos de audio flotantes (canales de -1.0 a 1.0) en un Blob binario con formato estándar WAV (PCM 16-bit).
 *
 * @param audioData Objeto con sampleRate y array de canales Float32Array.
 * @returns Blob del archivo de audio .wav listo para reproducir o descargar.
 */
export function encodeWav(audioData: AudioData): Blob {
  const numChannels = audioData.channels.length;
  if (numChannels === 0) {
    throw new Error('Debe proporcionarse al menos un canal de audio.');
  }

  const sampleRate = audioData.sampleRate;
  const numSamples = audioData.channels[0].length;
  const bytesPerSample = 2; // PCM 16 bits = 2 bytes
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Escribir string ASCII en el DataView
  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  /* Cabecera RIFF */
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // Tamaño del archivo - 8 bytes
  writeString(8, 'WAVE');

  /* Sub-chunk 'fmt ' */
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Tamaño del sub-chunk fmt (16 para PCM)
  view.setUint16(20, 1, true); // Formato de audio: 1 = PCM (sin compresión)
  view.setUint16(22, numChannels, true); // Cantidad de canales
  view.setUint32(24, sampleRate, true); // Frecuencia de muestreo (ej. 44100)
  view.setUint32(28, byteRate, true); // Byte rate
  view.setUint16(32, blockAlign, true); // Block align
  view.setUint16(34, 16, true); // Bits por muestra (16 bits)

  /* Sub-chunk 'data' */
  writeString(36, 'data');
  view.setUint32(40, dataSize, true); // Tamaño de datos de audio

  // Escribir muestras intercaladas (interleaved) PCM de 16 bits
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      // Clamping entre -1.0 y 1.0
      const sample = Math.max(-1, Math.min(1, audioData.channels[channel][i]));
      // Escalar a entero con signo de 16 bits (-32768 a 32767)
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Utilidad auxiliar para disparar la descarga en el navegador de un Blob de audio.
 */
export function downloadWavFile(blob: Blob, fileName: string = 'tape-output.wav'): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName.endsWith('.wav') ? fileName : `${fileName}.wav`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
