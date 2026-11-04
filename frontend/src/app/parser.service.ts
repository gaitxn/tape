import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Token } from './interfaces/token.interface';

@Injectable({ providedIn: 'root' })
export class ParserApi {
  private http = inject(HttpClient);

  // Último código escrito en el editor
  tokens: Token[] = [];

  parse(tokens: Token[]) {
    const baseUrl = 'http://localhost:3000';
    return this.http.post(`${baseUrl}/parser/parse`, { tokens });
  }

  build() {
    return this.parse(this.tokens);
  }
}