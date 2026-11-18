import { describe, it, expect } from 'vitest';
import { encodeWav, AudioData } from './wav-encoder';

describe('WavEncoder Utility (Sprint 4)', () => {
  it('debe lanzar un error si no se proporcionan canales', () => {
    const invalidAudio: AudioData = {
      sampleRate: 44100,
      channels: [],
    };
    expect(() => encodeWav(invalidAudio)).toThrow('Debe proporcionarse al menos un canal de audio.');
  });

  it('debe generar un Blob WAV con las cabeceras estándar RIFF y WAVE', async () => {
    // Generar 100 muestras de tono senoidal mono a 44100Hz
    const sampleRate = 44100;
    const samples = 100;
    const channelData = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      channelData[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate);
    }

    const audioData: AudioData = {
      sampleRate,
      channels: [channelData],
    };

    const blob = encodeWav(audioData);
    expect(blob).toBeTruthy();
    expect(blob.type).toBe('audio/wav');

    // Leer la cabecera binaria del Blob
    const arrayBuffer = await blob.arrayBuffer();
    const view = new DataView(arrayBuffer);

    // 1. RIFF
    const riff = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3)
    );
    expect(riff).toBe('RIFF');

    // 2. WAVE
    const wave = String.fromCharCode(
      view.getUint8(8),
      view.getUint8(9),
      view.getUint8(10),
      view.getUint8(11)
    );
    expect(wave).toBe('WAVE');

    // 3. Sub-chunk 'fmt '
    const fmt = String.fromCharCode(
      view.getUint8(12),
      view.getUint8(13),
      view.getUint8(14),
      view.getUint8(15)
    );
    expect(fmt).toBe('fmt ');

    // 4. Parámetros de audio
    expect(view.getUint16(20, true)).toBe(1); // PCM sin compresión
    expect(view.getUint16(22, true)).toBe(1); // 1 Canal (mono)
    expect(view.getUint32(24, true)).toBe(44100); // Sample rate
    expect(view.getUint16(34, true)).toBe(16); // 16 bits por muestra

    // 5. Sub-chunk 'data'
    const dataTag = String.fromCharCode(
      view.getUint8(36),
      view.getUint8(37),
      view.getUint8(38),
      view.getUint8(39)
    );
    expect(dataTag).toBe('data');
    expect(view.getUint32(40, true)).toBe(samples * 2); // 100 muestras * 2 bytes
  });

  it('debe admitir audio estéreo (2 canales) correctamente', async () => {
    const sampleRate = 48000;
    const samples = 50;
    const left = new Float32Array(samples).fill(0.5);
    const right = new Float32Array(samples).fill(-0.5);

    const audioData: AudioData = {
      sampleRate,
      channels: [left, right],
    };

    const blob = encodeWav(audioData);
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);

    expect(view.getUint16(22, true)).toBe(2); // 2 Canales (estéreo)
    expect(view.getUint32(24, true)).toBe(48000); // 48kHz
    // Data size: 50 muestras * 2 canales * 2 bytes = 200 bytes
    expect(view.getUint32(40, true)).toBe(200);
  });
});
