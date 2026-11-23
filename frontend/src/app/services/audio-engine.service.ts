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

  public setBpm(newBpm: number): void {
    const validBpm = Math.max(20, Math.min(300, Math.round(newBpm)));
    this.bpm.set(validBpm);
  }

  /**
   * Carga un nuevo AudioMatrixDTO compilado desde el backend y programa la partitura.
   */
  public loadMatrix(dto: AudioMatrixDTO): void {
    this.stop();
    this.clearScheduledEvents();

    this.tapeHistory = dto.tapeHistory || [];
    // Carga el estado inicial (step 0)
    this.applyTapeSnapshotAtStep(0);

    const playableEvents = dto.audioMatrix.filter(
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

    }, playableEvents.map((ev) => [ev.time, ev]));

    this.scheduledPart.start(0);
      const totalDurationSec = playableEvents.reduce((maxEnd, ev) => {
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
   * Busca el último snapshot en tapeHistory cuyo step sea <= step actual.
   */
  private findSnapshotAtStep(step: number): TapeHistory | undefined {
    // Recorrer de atrás hacia adelante para tomar el ÚLTIMO estado registrado en ese step
    for (let i = this.tapeHistory.length - 1; i >= 0; i--) {
      if (this.tapeHistory[i].step <= step) {
        return this.tapeHistory[i];
      }
    }
    return undefined;
  }
  /**
   * Recorre tapeIndex y symbols en paralelo para poblar el Map 'row-col' -> value.
   */
  private applyTapeSnapshotAtStep(step: number): void {
    const updatedMap = new Map<string, string | number>();

    // Recorremos en orden desde el inicio hasta el step actual para acumular
    // todas las escrituras de todos los cabezales sin perder ninguna
    for (const snapshot of this.tapeHistory) {
      if (snapshot.step > step) break;

      for (let i = 0; i < snapshot.tapeIndex.length; i++) {
        const [row, col] = snapshot.tapeIndex[i];
        const value = snapshot.symbols[i];
        updatedMap.set(`${row}-${col}`, value);
      }
    }

    this.liveTapeCells.set(updatedMap);
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