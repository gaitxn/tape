import { Component, inject } from '@angular/core';
import { CompilerApi } from '../compiler.service'; // Ajusta la ruta según donde tengas tu compiler.service.ts

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './app-header.html',
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
    console.log('Iniciando compilación (Lexer + Parser)...');
    console.log('Texto actual en el editor:', this.codeContent);
    // Aquí llamamos a compileFull pasando el código que el usuario escribió
    this.compilerApi.compileFull(this.codeContent).subscribe({
      next: (response) => {
        console.log('Respuesta del Parser (AST):', response.ast);
      },
      error: (err) => {
        console.error('No se pudo conectar con el backend o hubo un error de sintaxis:', err);
      }
    });
  }
}