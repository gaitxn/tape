// frontend/src/app/viewer/compiler.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap, tap } from 'rxjs';
import { Token } from '../interfaces/token.interface';
import { AST } from '../interfaces/ast.interface';
import { AudioEvent, AudioMatrixDTO, TapeHistory, CompilationMetadata }
from '../interfaces/audio-matrix.interface';

@Injectable({ providedIn: 'root' })
export class CompilerApi {
  private http = inject(HttpClient);
  private baseUrl = import.meta.env.NG_APP_PUBLIC_API_URL || 'http://localhost:3000';

  code: string = '';
  tokens: Token[] = [];
  ast?: AST;

  public audioMatrix: AudioEvent[] = [];
  public tapeHistory: TapeHistory[] = [];

  tokenize(code: string): Observable<{ lines: number; tokens: Token[] }> {
    this.code = code;
    return this.http.post<{ lines: number; tokens: Token[] }>(`${this.baseUrl}/lexer/tokenize`, { code });
  }

  parse(tokens: Token[]): Observable<{ ast: AST }> {
    this.tokens = tokens;
    return this.http.post<{ ast: AST }>(`${this.baseUrl}/parser/parse`, { tokens });
  }

  // 1. Nuevo método para invocar al TuringController en NestJS
  executeTuring(ast: AST, metadata?: CompilationMetadata): Observable<AudioMatrixDTO> {
    this.ast = ast;
    return this.http.post<AudioMatrixDTO>(`${this.baseUrl}/turing/compile`, { 
      ast, 
      metadata,
    });
  }

  // 2. Flujo completo: Lexer -> Parser -> Turing Engine
  compileFull(code: string, metadata?: CompilationMetadata): Observable<AudioMatrixDTO> {
    return this.tokenize(code).pipe(
      switchMap((lexerRes) => this.parse(lexerRes.tokens)),
      switchMap((parserRes) => this.executeTuring(parserRes.ast, metadata)),
      tap((finalRes: AudioMatrixDTO) => {
        // Ahora finalRes sí está tipado como AudioMatrixDTO y trae los datos reales
        this.audioMatrix = finalRes.audioMatrix || [];
        this.tapeHistory = finalRes.tapeHistory || [];
      })
    );
  }
}