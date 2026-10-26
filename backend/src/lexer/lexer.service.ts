import { Injectable, BadRequestException } from '@nestjs/common';
import { Token, TokenType } from '../interfaces/token.interface.js';

@Injectable()
export class LexerService {
  tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let cursor = 0;
    let line = 1;

    const keywords = ['READ', 'WRITE', 'EMIT', 'SPAWN', 'KILL', 'JUMP', 'DEFINE'];

    // Símbolos de un solo carácter
    const singles: Record<string, TokenType> = {
      '^': TokenType.UP,
      '+': TokenType.PLUS,
      '-': TokenType.MINUS,
      '(': TokenType.LPAREN,
      ')': TokenType.RPAREN,
      '{': TokenType.LBRACE,
      '}': TokenType.RBRACE,
      ',': TokenType.COMMA,
      ';': TokenType.SEMICOLON,
    };

    const isDigit = (c: string) => c >= '0' && c <= '9';
    const isLetter = (c: string) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';

    while (cursor < input.length) {
      const char = input[cursor];
      const next = input[cursor + 1];

      // Espacios y saltos de línea
      if (char === '\n') {
        line++;
        cursor++;
        continue;
      }
      if (char === ' ' || char === '\t' || char === '\r') {
        cursor++;
        continue;
      }

      // Comentario: // hasta el final de la línea
      if (char === '/' && next === '/') {
        let end = cursor;
        while (end < input.length && input[end] !== '\n') end++;
        tokens.push({ type: TokenType.COMMENT, value: input.slice(cursor, end).trimEnd(), line });
        cursor = end;
        continue;
      }

      // Números
      if (isDigit(char)) {
        let end = cursor;
        while (end < input.length && isDigit(input[end])) end++;
        tokens.push({ type: TokenType.NUMBER, value: input.slice(cursor, end), line });
        cursor = end;
        continue;
      }

      // Palabras: keyword, 'v' (DOWN) o identificador
      if (isLetter(char)) {
        let end = cursor;
        while (end < input.length && (isLetter(input[end]) || isDigit(input[end]))) end++;
        const word = input.slice(cursor, end);

        let type = TokenType.IDENTIFIER;
        if (keywords.includes(word)) type = TokenType.KEYWORD;
        else if (word === 'v') type = TokenType.DOWN;

        tokens.push({ type, value: word, line });
        cursor = end;
        continue;
      }

      // Operadores de dos caracteres (van antes que los de uno)
      const two = char + (next ?? '');
      const doubles: Record<string, TokenType> = {
        '<<': TokenType.SHIFT_LEFT,
        '>>': TokenType.SHIFT_RIGHT,
        '==': TokenType.DOUBLE_EQUAL,
        '!=': TokenType.NOT_EQUAL,
        '<=': TokenType.LESS_EQUAL,
        '>=': TokenType.GREATER_EQUAL,
      };
      if (doubles[two]) {
        tokens.push({ type: doubles[two], value: two, line });
        cursor += 2;
        continue;
      }

      // Operadores de un carácter
      const oneChar: Record<string, TokenType> = {
        ...singles,
        '<': TokenType.LESS_THAN,
        '>': TokenType.GREATER_THAN,
        '=': TokenType.ASSIGN,
        '!': TokenType.NOT,
      };
      if (oneChar[char]) {
        tokens.push({ type: oneChar[char], value: char, line });
        cursor++;
        continue;
      }

      // Cualquier otro carácter no es válido en el lenguaje
      throw new BadRequestException(`Carácter inesperado '${char}' en la línea ${line}`);
    }

    return tokens;
  }
}
