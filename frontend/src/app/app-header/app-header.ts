import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
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

    this.codeContent = this.compilerApi.code;
    console.log('Iniciando compilación completa (Lexer + Parser + Turing Engine)...');

    this.compilerApi.compileFull(this.codeContent, { bpm: this.audioEngine.bpm() }).subscribe({
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
}
