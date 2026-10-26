import { Component, inject } from '@angular/core';
import { LexerApi } from '../lexer.service';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './app-header.html',
  styleUrl: './app-header.css',
})
export class AppHeader {
  private api = inject(LexerApi);

  activeTab: string = 'edit';

  setTab(tabName: string) {
    this.activeTab = tabName;
  }

  build() {
    this.api.build().subscribe({
      next: (res) => console.log('Respuesta del backend:', res),
      error: (err) => console.error('No se pudo conectar con el backend:', err),
    });
  }
}