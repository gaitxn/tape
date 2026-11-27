import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { finalize } from 'rxjs';
import { CompilerApi } from '../services/compiler.service';
import { AudioEngineApi } from '../services/audio-engine.service';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './app-header.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app-header.css',
})
export class AppHeader {
  private compilerApi = inject(CompilerApi);
  public readonly audioEngine = inject(AudioEngineApi);
  
  compileTimeMs = signal<number | null>(null);

  activeTab: string = 'edit';
  codeContent: string = '';

  public isCompiling = false;
  public isCompiled = false;
  public errorMessage: string | null = null;

  setTab(tabName: string) {
    this.activeTab = tabName;
  }

  build() {
    this.isCompiling = true;
    this.errorMessage = null;
    this.audioEngine.stop();
    
    const startTime = performance.now();
    this.compileTimeMs.set(null);

    this.codeContent = this.compilerApi.code;
    console.log('Iniciando compilación completa (Lexer + Parser + Turing Engine)...');

    this.compilerApi.compileFull(this.codeContent, { bpm: this.audioEngine.bpm() })
    .pipe(
        finalize(() => {
          const elapsed = performance.now() - startTime;
          this.compileTimeMs.set(Math.round(elapsed));
        })
    ).subscribe({
      next: (response) => {
        console.log('Tokens generados: ', this.compilerApi.tokens);
        console.log('AST generado:', this.compilerApi.ast);
        console.log('Matriz de Audio (para Tone.js):', response.audioMatrix);
        console.log('Historial de Cintas (para el Viewer):', response.tapeHistory);

        this.audioEngine.loadMatrix(response);
        this.isCompiling = false;
        this.isCompiled = true;
      },
      error: (err) => {
        this.isCompiling = false;
        this.isCompiled = false;
        console.error('Error de compilación o ejecución:', err);
      },
    });
  }

  public async onRun(): Promise<void> {
    if (!this.isCompiled) return;
    await this.audioEngine.play();
  }

  public onPause(): void {
    this.audioEngine.pause();
  }

  public onStop(): void {
    this.audioEngine.stop();
  }

  public onBpmChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);
    if (!Number.isNaN(value) && value > 0) {
      this.audioEngine.setBpm(value);
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const content = await file.text();
    this.compilerApi.code = content;
    this.compilerApi.loadedCode.set(content);
    input.value = '';
  }

  isExporting = signal(false);

  async exportWav(): Promise<void> {
    if (this.isExporting()) return;

    const events = this.audioEngine.getEvents();
    console.log('[Export] eventos disponibles:', events?.length ?? 0);

    if (!events || events.length === 0) {
      console.warn('[Export] No hay eventos cargados para exportar.');
      return;
    }

    this.isExporting.set(true);
    try {
      const bpm = this.audioEngine.bpm();
      console.log('[Export] Renderizando WAV con BPM:', bpm);
      const wavBlob = await this.audioEngine.renderEventsToWav(events, bpm);
      const renderStart = performance.now();
      console.log(
        '[Export] Renderizado WAV en:',
        Math.round(performance.now() - renderStart),
        'ms | Tamaño:',
        (wavBlob.size / (1024 * 1024)).toFixed(2),
        'MB'
      );
      this.downloadBlob(wavBlob, 'tape-composition.wav');
      console.log('[Export] WAV descargado, bytes:', wavBlob.size);
    } catch (err) {
      console.error('[Export] Error al generar o descargar WAV:', err);
    } finally {
      this.isExporting.set(false);
    }
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
