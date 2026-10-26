import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class LexerApi {
  private http = inject(HttpClient);

  // Último código escrito en el editor
  code = '';

  tokenize(code: string) {
    return this.http.post('http://localhost:3000/lexer/tokenize', { code });
  }

  build() {
    return this.tokenize(this.code);
  }
}