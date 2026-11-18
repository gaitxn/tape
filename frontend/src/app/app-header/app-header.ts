import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CompilerApi } from '../compiler.service'; // Ajusta la ruta según donde tengas tu compiler.service.ts

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './app-header.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app-header.css',
})
export class AppHeader {
  private compilerApi = inject(CompilerApi);

  activeTab: string = 'edit';
  codeContent: string = '';

  setTab(tabName: string) {
    this.activeTab = tabName;
  }

  build() {
    this.codeContent = this.compilerApi.code;
    console.log('Iniciando compilación completa (Lexer + Parser + Turing Engine)...');

    this.compilerApi.compileFull(this.codeContent).subscribe({
      next: (response) => {
        console.log('Tokens generados: ', this.compilerApi.tokens);
        console.log('AST generado:', this.compilerApi.ast);
        console.log('Matriz de Audio (para Tone.js):', response.audioMatrix);
        console.log('Historial de Cintas (para el Viewer):', response.tapeHistory);
      },
      error: (err) => {
        console.error('Error de compilación o ejecución:', err);
      },
    });
  }
}
