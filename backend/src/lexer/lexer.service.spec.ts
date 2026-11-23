import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LexerService } from './lexer.service.js';
import { TokenType } from '../interfaces/token.interface.js';

describe('LexerService', () => {
  let service: LexerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LexerService],
    }).compile();

    service = module.get<LexerService>(LexerService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('1. Palabras Clave (Keywords) e Identificadores', () => {
    it('debe reconocer todas las palabras clave reservadas del DSL', () => {
      const code = 'READ WRITE EMIT SPAWN KILL JUMP DEFINE';
      const tokens = service.tokenize(code);

      expect(tokens).toHaveLength(7);
      tokens.forEach((token) => {
        expect(token.type).toBe(TokenType.KEYWORD);
      });
      expect(tokens.map((t) => t.value)).toEqual([
        'READ', 'WRITE', 'EMIT', 'SPAWN', 'KILL', 'JUMP', 'DEFINE',
      ]);
    });

    it('debe reconocer nombres de pistas e identificadores de usuario', () => {
      const code = 'pista_A miVariable loop1 tempo';
      const tokens = service.tokenize(code);

      expect(tokens).toHaveLength(4);
      tokens.forEach((token) => {
        expect(token.type).toBe(TokenType.IDENTIFIER);
      });
      expect(tokens.map((t) => t.value)).toEqual(['pista_A', 'miVariable', 'loop1', 'tempo']);
    });
  });

  describe('2. Movimientos de Cabezal (Turing Heads)', () => {
    it('debe reconocer desplazamientos horizontales << y >>', () => {
      const code = '<< >>';
      const tokens = service.tokenize(code);

      expect(tokens).toEqual([
        { type: TokenType.SHIFT_LEFT, value: '<<', line: 1 },
        { type: TokenType.SHIFT_RIGHT, value: '>>', line: 1 },
      ]);
    });

    it('debe reconocer movimientos verticales ^ (UP) y v (DOWN)', () => {
      const code = '^ v';
      const tokens = service.tokenize(code);

      expect(tokens).toEqual([
        { type: TokenType.UP, value: '^', line: 1 },
        { type: TokenType.DOWN, value: 'v', line: 1 },
      ]);
    });
  });

  describe('3. Operadores Aritméticos, Relacionales y Asignación', () => {
    it('debe reconocer operadores aritméticos + y -', () => {
      const code = '+ -';
      const tokens = service.tokenize(code);

      expect(tokens).toEqual([
        { type: TokenType.PLUS, value: '+', line: 1 },
        { type: TokenType.MINUS, value: '-', line: 1 },
      ]);
    });

    it('debe reconocer operadores de doble carácter ==, !=, <=, >=', () => {
      const code = '== != <= >=';
      const tokens = service.tokenize(code);

      expect(tokens).toEqual([
        { type: TokenType.DOUBLE_EQUAL, value: '==', line: 1 },
        { type: TokenType.NOT_EQUAL, value: '!=', line: 1 },
        { type: TokenType.LESS_EQUAL, value: '<=', line: 1 },
        { type: TokenType.GREATER_EQUAL, value: '>=', line: 1 },
      ]);
    });

    it('debe reconocer operadores de un solo carácter <, >, =, !', () => {
      const code = '< > = !';
      const tokens = service.tokenize(code);

      expect(tokens).toEqual([
        { type: TokenType.LESS_THAN, value: '<', line: 1 },
        { type: TokenType.GREATER_THAN, value: '>', line: 1 },
        { type: TokenType.ASSIGN, value: '=', line: 1 },
        { type: TokenType.NOT, value: '!', line: 1 },
      ]);
    });
  });

  describe('4. Delimitadores, Literales Numéricos y Comentarios', () => {
    it('debe tokenizar correctamente signos de puntuación y delimitadores', () => {
      const code = '( ) { } , ;';
      const tokens = service.tokenize(code);

      expect(tokens).toEqual([
        { type: TokenType.LPAREN, value: '(', line: 1 },
        { type: TokenType.RPAREN, value: ')', line: 1 },
        { type: TokenType.LBRACE, value: '{', line: 1 },
        { type: TokenType.RBRACE, value: '}', line: 1 },
        { type: TokenType.COMMA, value: ',', line: 1 },
        { type: TokenType.SEMICOLON, value: ';', line: 1 },
      ]);
    });

    it('debe reconocer números enteros', () => {
      const code = '0 440 120 9999';
      const tokens = service.tokenize(code);

      expect(tokens).toEqual([
        { type: TokenType.NUMBER, value: '0', line: 1 },
        { type: TokenType.NUMBER, value: '440', line: 1 },
        { type: TokenType.NUMBER, value: '120', line: 1 },
        { type: TokenType.NUMBER, value: '9999', line: 1 },
      ]);
    });

    it('debe capturar comentarios de línea y continuar con los tokens siguientes', () => {
      const code = `// Comentario inicial
      EMIT(440); // Comentario de fin de línea`;
      const tokens = service.tokenize(code);

      expect(tokens[0]).toEqual({
        type: TokenType.COMMENT,
        value: '// Comentario inicial',
        line: 1,
      });
      expect(tokens[1]).toEqual({ type: TokenType.KEYWORD, value: 'EMIT', line: 2 });
    });

    it('debe actualizar el contador de líneas con saltos de línea \\n', () => {
      const code = 'READ\nWRITE\n\nEMIT';
      const tokens = service.tokenize(code);

      expect(tokens).toEqual([
        { type: TokenType.KEYWORD, value: 'READ', line: 1 },
        { type: TokenType.KEYWORD, value: 'WRITE', line: 2 },
        { type: TokenType.KEYWORD, value: 'EMIT', line: 4 },
      ]);
    });
  });

  describe('5. Flujo Feliz: Programa Completo DSL', () => {
    it('debe procesar un bloque típico de instrucción musical', () => {
      const program = `
        // Inicializar bucle
        DEFINE LOOP {
          EMIT(440, 500);
          >>
          +
          JUMP LOOP;
        }
      `;
      const tokens = service.tokenize(program);

      // Comprueba que no se produzca error y que contenga la estructura esperada
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens.some((t) => t.value === 'DEFINE')).toBe(true);
      expect(tokens.some((t) => t.value === 'LOOP')).toBe(true);
      expect(tokens.some((t) => t.value === 'EMIT')).toBe(true);
      expect(tokens.some((t) => t.value === '>>')).toBe(true);
      expect(tokens.some((t) => t.value === '+')).toBe(true);
      expect(tokens.some((t) => t.value === 'JUMP')).toBe(true);
    });
  });

  describe('6. Detección de Errores Léxicos', () => {
    it('debe lanzar BadRequestException al encontrar un carácter no permitido (@)', () => {
      const invalidCode = 'EMIT(440) @';

      expect(() => service.tokenize(invalidCode)).toThrow(BadRequestException);
      expect(() => service.tokenize(invalidCode)).toThrow(
        "Carácter inesperado '@' en la línea 1",
      );
    });

    it('debe indicar la línea exacta donde ocurre el error', () => {
      const multilineInvalid = 'READ;\nWRITE;\n$';

      expect(() => service.tokenize(multilineInvalid)).toThrow(
        "Carácter inesperado '$' en la línea 3",
      );
    });
  });
});
