import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ParserService } from './parser.service.js';
import { Token, TokenType } from '../interfaces/token.interface.js';
import { ASTType } from '../interfaces/ast.interface.js';

describe('ParserService (Sprint 2)', () => {
  let parser: ParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParserService],
    }).compile();

    parser = module.get<ParserService>(ParserService);
  });

  it('debe estar definido', () => {
    expect(parser).toBeDefined();
  });

  describe('1. Filtrado de Comentarios y Estructura Base (Program)', () => {
    it('debe generar un nodo raíz Program vacío cuando no hay tokens o solo hay comentarios', () => {
      const tokens: Token[] = [
        { type: TokenType.COMMENT, value: '// comentario', line: 1 },
      ];
      const ast = parser.parse(tokens);

      expect(ast.type).toBe(ASTType.PROGRAM);
      expect(ast.body).toEqual([]);
    });

    it('debe ignorar punto y coma aislados', () => {
      const tokens: Token[] = [
        { type: TokenType.SEMICOLON, value: ';', line: 1 },
      ];
      const ast = parser.parse(tokens);
      expect(ast.type).toBe(ASTType.PROGRAM);
      expect(ast.body).toEqual([]);
    });
  });

  describe('2. Movimientos de Cabezal (Turing Heads)', () => {
    it('debe parsear movimientos <<, >>, ^, v como InstructionNode', () => {
      const tokens: Token[] = [
        { type: TokenType.SHIFT_LEFT, value: '<<', line: 1 },
        { type: TokenType.SHIFT_RIGHT, value: '>>', line: 1 },
        { type: TokenType.UP, value: '^', line: 1 },
        { type: TokenType.DOWN, value: 'v', line: 1 },
      ];

      const ast = parser.parse(tokens);
      expect(ast.body).toHaveLength(4);
      expect(ast.body![0]).toEqual({ type: ASTType.INSTRUCTION, name: '<<' });
      expect(ast.body![1]).toEqual({ type: ASTType.INSTRUCTION, name: '>>' });
      expect(ast.body![2]).toEqual({ type: ASTType.INSTRUCTION, name: '^' });
      expect(ast.body![3]).toEqual({ type: ASTType.INSTRUCTION, name: 'v' });
    });
  });

  describe('3. Asignación de Variables y Llamadas a Función', () => {
    it('debe parsear asignación de variable: x = 10', () => {
      const tokens: Token[] = [
        { type: TokenType.IDENTIFIER, value: 'x', line: 1 },
        { type: TokenType.ASSIGN, value: '=', line: 1 },
        { type: TokenType.NUMBER, value: '10', line: 1 },
      ];

      const ast = parser.parse(tokens);
      expect(ast.body).toHaveLength(1);
      expect(ast.body![0]).toEqual({
        type: ASTType.IDENTIFIER,
        name: 'x',
        value: '10',
        arguments: [],
      });
    });

    it('debe parsear llamada a función: miFn(1, 2)', () => {
      const tokens: Token[] = [
        { type: TokenType.IDENTIFIER, value: 'miFn', line: 1 },
        { type: TokenType.LPAREN, value: '(', line: 1 },
        { type: TokenType.NUMBER, value: '1', line: 1 },
        { type: TokenType.COMMA, value: ',', line: 1 },
        { type: TokenType.NUMBER, value: '2', line: 1 },
        { type: TokenType.RPAREN, value: ')', line: 1 },
      ];

      const ast = parser.parse(tokens);
      expect(ast.body).toHaveLength(1);
      expect(ast.body![0].type).toBe(ASTType.CALL);
      expect(ast.body![0].name).toBe('miFn');
      expect(ast.body![0].arguments).toHaveLength(2);
    });
  });

  describe('4. Instrucciones del DSL (WRITE, READ, SPAWN, KILL, EMIT)', () => {
    it('debe parsear WRITE(10)', () => {
      const tokens: Token[] = [
        { type: TokenType.KEYWORD, value: 'WRITE', line: 1 },
        { type: TokenType.LPAREN, value: '(', line: 1 },
        { type: TokenType.NUMBER, value: '10', line: 1 },
        { type: TokenType.RPAREN, value: ')', line: 1 },
      ];

      const ast = parser.parse(tokens);
      expect(ast.body![0].type).toBe(ASTType.INSTRUCTION);
      expect(ast.body![0].name).toBe('WRITE');
      expect(ast.body![0].arguments).toHaveLength(1);
      expect(ast.body![0].arguments![0].value).toBe('10');
    });

    it('debe lanzar error si WRITE no recibe exactamente 1 argumento', () => {
      const tokens: Token[] = [
        { type: TokenType.KEYWORD, value: 'WRITE', line: 1 },
        { type: TokenType.LPAREN, value: '(', line: 1 },
        { type: TokenType.RPAREN, value: ')', line: 1 },
      ];

      expect(() => parser.parse(tokens)).toThrow(BadRequestException);
    });

    it('debe parsear READ() sin argumentos', () => {
      const tokens: Token[] = [
        { type: TokenType.KEYWORD, value: 'READ', line: 1 },
        { type: TokenType.LPAREN, value: '(', line: 1 },
        { type: TokenType.RPAREN, value: ')', line: 1 },
      ];

      const ast = parser.parse(tokens);
      expect(ast.body![0].name).toBe('READ');
      expect(ast.body![0].arguments).toEqual([]);
    });

    it('debe lanzar error si READ() recibe argumentos', () => {
      const tokens: Token[] = [
        { type: TokenType.KEYWORD, value: 'READ', line: 1 },
        { type: TokenType.LPAREN, value: '(', line: 1 },
        { type: TokenType.NUMBER, value: '1', line: 1 },
        { type: TokenType.RPAREN, value: ')', line: 1 },
      ];

      expect(() => parser.parse(tokens)).toThrow(BadRequestException);
    });

    it('debe parsear EMIT(60, 4, 1)', () => {
      const tokens: Token[] = [
        { type: TokenType.KEYWORD, value: 'EMIT', line: 1 },
        { type: TokenType.LPAREN, value: '(', line: 1 },
        { type: TokenType.NUMBER, value: '60', line: 1 },
        { type: TokenType.COMMA, value: ',', line: 1 },
        { type: TokenType.NUMBER, value: '4', line: 1 },
        { type: TokenType.COMMA, value: ',', line: 1 },
        { type: TokenType.NUMBER, value: '1', line: 1 },
        { type: TokenType.RPAREN, value: ')', line: 1 },
      ];

      const ast = parser.parse(tokens);
      expect(ast.body![0].name).toBe('EMIT');
      expect(ast.body![0].arguments).toHaveLength(3);
    });

    it('debe lanzar error si EMIT no recibe 3 argumentos', () => {
      const tokens: Token[] = [
        { type: TokenType.KEYWORD, value: 'EMIT', line: 1 },
        { type: TokenType.LPAREN, value: '(', line: 1 },
        { type: TokenType.NUMBER, value: '60', line: 1 },
        { type: TokenType.RPAREN, value: ')', line: 1 },
      ];

      expect(() => parser.parse(tokens)).toThrow(BadRequestException);
    });
  });

  describe('5. Instrucción JUMP y Condiciones', () => {
    it('debe parsear JUMP(READ() == 0, #B, 2)', () => {
      const tokens: Token[] = [
        { type: TokenType.KEYWORD, value: 'JUMP', line: 1 },
        { type: TokenType.LPAREN, value: '(', line: 1 },
        // Condición
        { type: TokenType.KEYWORD, value: 'READ', line: 1 },
        { type: TokenType.LPAREN, value: '(', line: 1 },
        { type: TokenType.RPAREN, value: ')', line: 1 },
        { type: TokenType.DOUBLE_EQUAL, value: '==', line: 1 },
        { type: TokenType.NUMBER, value: '0', line: 1 },
        { type: TokenType.COMMA, value: ',', line: 1 },
        // Fila (#B)
        { type: TokenType.ROW_REFERENCE, value: '#B', line: 1 },
        { type: TokenType.COMMA, value: ',', line: 1 },
        // Columna (2)
        { type: TokenType.NUMBER, value: '2', line: 1 },
        { type: TokenType.RPAREN, value: ')', line: 1 },
      ];

      const ast = parser.parse(tokens);
      const jumpNode = ast.body![0];

      expect(jumpNode.name).toBe('JUMP');
      expect(jumpNode.arguments).toHaveLength(3);
      expect(jumpNode.arguments![0].type).toBe(ASTType.CONDITION);
      expect(jumpNode.arguments![0].operator).toBe('==');
      expect(jumpNode.arguments![1].value).toBe('#B');
      expect(jumpNode.arguments![2].value).toBe('2');
    });

    it('debe lanzar error si el 2do argumento de JUMP no es ROW_REFERENCE', () => {
      const tokens: Token[] = [
        { type: TokenType.KEYWORD, value: 'JUMP', line: 1 },
        { type: TokenType.LPAREN, value: '(', line: 1 },
        { type: TokenType.NUMBER, value: '1', line: 1 },
        { type: TokenType.DOUBLE_EQUAL, value: '==', line: 1 },
        { type: TokenType.NUMBER, value: '1', line: 1 },
        { type: TokenType.COMMA, value: ',', line: 1 },
        { type: TokenType.NUMBER, value: '99', line: 1 }, // Inválido: no es #B
        { type: TokenType.COMMA, value: ',', line: 1 },
        { type: TokenType.NUMBER, value: '2', line: 1 },
        { type: TokenType.RPAREN, value: ')', line: 1 },
      ];

      expect(() => parser.parse(tokens)).toThrow(BadRequestException);
    });
  });

  describe('6. Definición de Funciones (DEFINE)', () => {
    it('debe parsear DEFINE miPatron() { WRITE(1); }', () => {
      const tokens: Token[] = [
        { type: TokenType.KEYWORD, value: 'DEFINE', line: 1 },
        { type: TokenType.IDENTIFIER, value: 'miPatron', line: 1 },
        { type: TokenType.LPAREN, value: '(', line: 1 },
        { type: TokenType.RPAREN, value: ')', line: 1 },
        { type: TokenType.LBRACE, value: '{', line: 1 },
        { type: TokenType.KEYWORD, value: 'WRITE', line: 2 },
        { type: TokenType.LPAREN, value: '(', line: 2 },
        { type: TokenType.NUMBER, value: '1', line: 2 },
        { type: TokenType.RPAREN, value: ')', line: 2 },
        { type: TokenType.SEMICOLON, value: ';', line: 2 },
        { type: TokenType.RBRACE, value: '}', line: 3 },
      ];

      const ast = parser.parse(tokens);
      expect(ast.body![0].type).toBe(ASTType.FUNCTION);
      expect(ast.body![0].name).toBe('miPatron');
      expect(ast.body![0].body).toHaveLength(1);
      expect(ast.body![0].body![0].name).toBe('WRITE');
    });
  });
});
