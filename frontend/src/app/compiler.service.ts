// frontend/src/app/viewer/compiler.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { Token } from './interfaces/token.interface'; // Importación local limpia

@Injectable({ providedIn: 'root' })
export class CompilerApi {
  private http = inject(HttpClient);
  private baseUrl = import.meta.env.NG_APP_PUBLIC_API_URL || 'http://localhost:3000';

  code: string = '';
  tokens: Token[] = [];

  tokenize(code: string): Observable<{ tokens: Token[]; }> {
    this.code = code;
    return this.http.post<{ lines: number; tokens: Token[] }>(`${this.baseUrl}/lexer/tokenize`, { code });
  }
  parse(tokens: Token[]): Observable<{ ast: any }> {
    this.tokens = tokens;
    return this.http.post<{ ast: any }>(`${this.baseUrl}/parser/parse`, { tokens });
  }

  compileFull(code: string): Observable<any> {
    return this.tokenize(code).pipe(
      switchMap((lexerRes) => {
        console.log('Tokens generados (Lexer):', lexerRes.tokens);
        return this.parse(lexerRes.tokens)
      })
    );
  }
}