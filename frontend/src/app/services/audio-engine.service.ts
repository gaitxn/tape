import { Injectable, OnDestroy, signal } from '@angular/core';
import * as Tone from 'tone';
import { AudioEvent, AudioMatrixDTO, TapeHistory } from '../interfaces/audio-matrix.interface';

export type PlaybackState = 'stopped' | 'playing' | 'paused';

@Injectable({ providedIn: 'root' })
export class AudioEngineApi implements OnDestroy {
  // 1. Estado reactivo (Signals) para los botones RUN/PAUSE/STOP y la cinta visual
  public readonly playbackState = signal<PlaybackState>('stopped');
  public readonly currentStep = signal<number>(0);

  public readonly liveTapeCells = signal(new Map());
  public readonly emittedCells = signal(new Map());
  public readonly activeHead = signal<[number, number] | null>(null);

  private tapeHistory: TapeHistory[] = [];

  public readonly bpm = signal<number>(120);

  // 2. Recursos internos de Tone.js
  // Mapa de sintetizadores polifónicos independientes por track/head (Polifonía real)
  private trackSynths = new Map<string, Tone.PolySynth>();
  private scheduledPart: Tone.Part | null = null;
  private stepEvents: number[] = [];

  private cellsMap = new Map<string, string | number>();
  private lastAppliedIndex = -1;
  private lastAppliedStep = -1;

  private playableEvents: (AudioEvent & { note: string })[] = [];

  public getEvents(): AudioEvent[] {
    return this.playableEvents;
  }

  private resetTapeState(): void {
    this.cellsMap.clear();
    this.lastAppliedIndex = -1;
    this.lastAppliedStep = -1;
    this.liveTapeCells.set(new Map());
    this.activeHead.set(null);
  }

  public setBpm(newBpm: number): void {
    const validBpm = Math.max(20, Math.min(300, Math.round(newBpm)));
    this.bpm.set(validBpm);
  }

  /**
   * Carga un nuevo AudioMatrixDTO compilado desde el backend y programa la partitura.
   */
  public loadMatrix(dto: AudioMatrixDTO): void {
    this.stop();
    this.resetTapeState();
    this.clearScheduledEvents();

    this.tapeHistory = dto.tapeHistory || [];
    // Carga el estado inicial (step 0)
    this.applyTapeSnapshotAtStep(0);

    this.playableEvents = dto.audioMatrix.filter(
      (event): event is AudioEvent & { note: string } => event.note !== null
    );

    this.scheduledPart = new Tone.Part((time, event) => {
      if (typeof event === 'number' || !event.note) return;

      const durationSec = Tone.Time(event.duration).toSeconds();
      const synth = this.getOrCreateSynthForTrack(event.track);
      synth.triggerAttackRelease(event.note, durationSec, time);

      // 1. Actualizar valores de la cinta (tapeHistory) hasta este step
      Tone.getDraw().schedule(() => {
        this.currentStep.set(event.step);
        // 1. Primero actualiza los números en la cinta hasta este step
        this.applyTapeSnapshotAtStep(event.step);
      
        // 2. Después ilumina la celda emitida (ya mostrará el valor escrito, no 0)
        const pos = event.position ?? this.findPositionForEvent(event);
        if (pos) {
          const cellKey = `${pos[0]}-${pos[1]}`;
          this.emittedCells.update((prev) => {
            const next = new Map(prev);
            next.set(cellKey, (next.get(cellKey) ?? 0) + 1);
            return next;
          });
        }
      }, time);

      // 2. Apagar exactamente esta emisión al terminar su duración
      Tone.getDraw().schedule(() => {
        const pos = event.position ?? this.findPositionForEvent(event);
        if (pos) {
          const cellKey = `${pos[0]}-${pos[1]}`;
          this.emittedCells.update((prev) => {
            const next = new Map(prev);
            const count = (next.get(cellKey) ?? 1) - 1;
            if (count <= 0) {
              next.delete(cellKey);
            } else {
              next.set(cellKey, count);
            }
            return next;
          });
        }
      }, time + Math.max(0.05, durationSec * 0.9)); // 90% de duración para que se note el parpadeo entre notas repetidas

    }, this.playableEvents.map((ev) => [ev.time, ev]));

    this.scheduledPart.start(0);
      const totalDurationSec = this.playableEvents.reduce((maxEnd, ev) => {
      const end = ev.time + Tone.Time(ev.duration).toSeconds();
      return Math.max(maxEnd, end);
    }, 0);

    const endEventId = Tone.getTransport().scheduleOnce((time) => {
      this.trackSynths.forEach((s) => s.releaseAll(time));
      Tone.getDraw().schedule(() => {
        this.stop();
      }, time);
    }, totalDurationSec + 0.05);

    this.stepEvents.push(endEventId);
  }

  /**
   * Recorre tapeIndex y symbols en paralelo para poblar el Map 'row-col' -> value.
   */
  private applyTapeSnapshotAtStep(step: number): void {
    if (this.tapeHistory.length === 0) {
      this.liveTapeCells.set(new Map());
      return;
    }

    const minStep = this.tapeHistory[0].step;
    const effectiveStep = Math.max(step, minStep);

    // Si retrocedemos en el tiempo, reconstruimos limpiamente hasta effectiveStep
    if (effectiveStep < this.lastAppliedStep) {
      this.cellsMap.clear();
      this.lastAppliedIndex = -1;
    }

    let latestHead: [number, number] | null = null;

    for (let i = this.lastAppliedIndex + 1; i < this.tapeHistory.length; i++) {
      const snapshot = this.tapeHistory[i];
      if (snapshot.step > effectiveStep) break;

      // Soporta tanto formato delta (changes: [row, col, value][]) como el actual (tapeIndex + symbols)
      if (snapshot.changes) {
        for (const [row, col, value] of snapshot.changes) {
          this.cellsMap.set(`${row}-${col}`, value);
        }
      } else if (snapshot.tapeIndex && snapshot.symbols) {
        for (let j = 0; j < snapshot.tapeIndex.length; j++) {
          const [row, col] = snapshot.tapeIndex[j];
          this.cellsMap.set(`${row}-${col}`, snapshot.symbols[j]);
        }
      }

      if (snapshot.headPosition) {
        latestHead = [snapshot.headPosition[0], snapshot.headPosition[1]];
      }

      this.lastAppliedIndex = i;
    }

    this.lastAppliedStep = effectiveStep;

    // Emitimos una nueva referencia de Map solo si la señal lo necesita en el hilo gráfico
    this.liveTapeCells.set(new Map(this.cellsMap));
    if (latestHead) {
      this.activeHead.set(latestHead);
    }
  }
  
  /**
   * Inicia o reanuda la reproducción (Botón RUN)[cite: 1].
   */
  public async play(): Promise<void> {
    // Requisito obligatorio de navegadores: desbloquear AudioContext tras interacción del usuario
    if (Tone.getContext().state !== 'running') {
      await Tone.start();
    }

    if (this.playbackState() === 'playing') {
      return;
    }

    Tone.getTransport().start();
    this.playbackState.set('playing');
  }

  /**
   * Pausa la reproducción manteniendo la posición actual del cabezal (Botón PAUSE)[cite: 1].
   */
  public pause(): void {
    if (this.playbackState() !== 'playing') {
      return;
    }

    Tone.getTransport().pause();
    this.playbackState.set('paused');
  }

  /**
   * Detiene la reproducción y reinicia el cabezal al paso 0 (Botón STOP)[cite: 1].
   */
  public stop(): void {
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;

    this.resetTapeState();

    // Silenciar inmediatamente todas las notas que sigan sonando
    this.trackSynths.forEach((synth) => synth.releaseAll());

    this.emittedCells.set(new Map());
    this.activeHead.set(null);
    this.applyTapeSnapshotAtStep(0);
    
    this.playbackState.set('stopped');
    this.currentStep.set(0)

    this.liveTapeCells.set(new Map())
  }

  /**
   * Obtiene o crea un sintetizador polifónico independiente para cada pista/cabezal.
   */
  private masterGain = new Tone.Gain(0.7).toDestination();

  private getOrCreateSynthForTrack(trackId: string | number): Tone.PolySynth {
    const key = String(trackId);
    let synth = this.trackSynths.get(key);

    if (!synth) {
      const waveforms = ['triangle', 'sine', 'square', 'sawtooth'] as const;
      const numericId = Number(trackId) || 0;
      const oscillatorType = waveforms[numericId % waveforms.length];

      synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: oscillatorType },
        envelope: {
          attack: 0.01,
          decay: 0.05,
          sustain: 0.4,
          release: 0.05,
        },
      }).connect(this.masterGain); // Conectado al Gain maestro en lugar de directo a toDestination()

      this.trackSynths.set(key, synth);
    }

    return synth;
  }

  public async renderEventsToWav(events: AudioEvent[], bpm: number): Promise<Blob> {
    const playable = events.filter(
      (ev): ev is AudioEvent & { note: string } => Boolean(ev.note)
    );

    if (playable.length === 0) {
      throw new Error('No hay eventos reproducibles para exportar.');
    }

    const waveforms = ['triangle', 'sine', 'square', 'sawtooth'] as const;

    // Duración total estimada según el último evento (time + duración en segundos)
    const totalDuration = playable.reduce((maxEnd, ev) => {
      const start = Number(ev.time) || 0;
      const dur = Tone.Time(ev.duration).toSeconds();
      return Math.max(maxEnd, start + dur + 0.2); // margen para release
    }, 1);

    const buffer = await Tone.Offline(({ transport }) => {
      transport.bpm.value = bpm;

      const offlineGain = new Tone.Gain(0.7).toDestination();
      const offlineSynths = new Map<string, Tone.PolySynth>();

      const getOfflineSynth = (trackId: string | number): Tone.PolySynth => {
        const key = String(trackId);
        let synth = offlineSynths.get(key);
        if (!synth) {
          const numericId = Number(trackId) || 0;
          const oscType = waveforms[numericId % waveforms.length];
          synth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: oscType },
            envelope: {
              attack: 0.01,
              decay: 0.05,
              sustain: 0.4,
              release: 0.05,
            },
          }).connect(offlineGain);
          offlineSynths.set(key, synth);
        }
        return synth;
      };

      for (const ev of playable) {
        const synth = getOfflineSynth(ev.track);
        const durationSec = Tone.Time(ev.duration).toSeconds();
        synth.triggerAttackRelease(ev.note, durationSec, Number(ev.time) || 0);
      }
    }, totalDuration);

    return this.audioBufferToWavBlob(buffer.get()!);
  }

  private audioBufferToWavBlob(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    // Interleave channels
    const length = buffer.length * numChannels;
    const samples = new Int16Array(length);
    const channels: Float32Array[] = [];

    for (let ch = 0; ch < numChannels; ch++) {
      channels.push(buffer.getChannelData(ch));
    }

    let offset = 0;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const clamped = Math.max(-1, Math.min(1, channels[ch][i]));
        samples[offset++] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      }
    }

    const dataByteLength = samples.byteLength;
    const wavBuffer = new ArrayBuffer(44 + dataByteLength);
    const view = new DataView(wavBuffer);

    const writeString = (pos: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(pos + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataByteLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size for PCM
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true); // ByteRate
    view.setUint16(32, numChannels * (bitDepth / 8), true); // BlockAlign
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataByteLength, true);

    const wavBytes = new Uint8Array(wavBuffer, 44);
    wavBytes.set(new Uint8Array(samples.buffer));

    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  private findPositionForEvent(event: AudioEvent): [number, number] | undefined {
    const trackRow = Number(event.track);
    // Busca el snapshot del mismo step y de la pista/fila correspondiente
    const exact = this.tapeHistory.find(
      (h) => h.step === event.step && h.headPosition[0] === trackRow
    );
    if (exact) {
      return [exact.headPosition[0], exact.headPosition[1]];
    }
    return undefined;
  }

  /**
   * Limpia eventos programados previos antes de cargar una nueva compilación.
   */
  private clearScheduledEvents(): void {
    if (this.scheduledPart) {
      this.scheduledPart.dispose();
      this.scheduledPart = null;
    }

    this.stepEvents.forEach((id) => Tone.getTransport().clear(id));
    this.stepEvents = [];
  }

  /**
   * Libera memoria de Web Audio API si el servicio se destruye.
   */
  public ngOnDestroy(): void {
    this.stop();
    this.clearScheduledEvents();
    this.trackSynths.forEach((synth) => synth.dispose());
    this.trackSynths.clear();
  }
}