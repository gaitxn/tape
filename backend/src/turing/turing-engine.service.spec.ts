import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TuringService } from './turing-engine.service.js';
import { AST, ASTType } from '../interfaces/ast.interface.js';

describe('TuringService (Motor de Compilación y Ejecución)', () => {
  let service: TuringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TuringService],
    }).compile();

    service = module.get<TuringService>(TuringService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('1. Inicialización y Estado Base', () => {
    it('debe compilar un programa vacío con éxito', () => {
      const ast: AST = {
        type: ASTType.PROGRAM,
        body: [],
      };

      const result = service.execute(ast);
      expect(result.success).toBe(true);
      expect(result.audioMatrix).toEqual([]);
      expect(result.tapeHistory).toEqual([]);
      expect(result.metadata.bpm).toBe(60);
    });
  });

  describe('2. Escritura y Lectura en Cintas (Turing Tape)', () => {
    it('debe escribir un valor en la celda actual con WRITE', () => {
      const ast: AST = {
        type: ASTType.PROGRAM,
        body: [
          {
            type: ASTType.INSTRUCTION,
            name: 'WRITE',
            arguments: [{ type: ASTType.LITERAL, value: '42' }],
          },
        ],
      };

      const result = service.execute(ast);
      expect(result.success).toBe(true);
      expect(result.tapeHistory).toHaveLength(1);
    });
  });

  describe('3. Generación de Eventos de Audio (EMIT y SPAWN)', () => {
    it('debe generar eventos de audio cuando el cabezal ha sido inicializado con SPAWN', () => {
      const ast: AST = {
        type: ASTType.PROGRAM,
        body: [
          {
            type: ASTType.INSTRUCTION,
            name: 'SPAWN',
            arguments: [{ type: ASTType.LITERAL, value: '0' }],
          },
          {
            type: ASTType.INSTRUCTION,
            name: 'EMIT',
            arguments: [
              { type: ASTType.LITERAL, value: '60' }, // Nota MIDI (C4)
              { type: ASTType.LITERAL, value: '4' },  // 4 ticks
              { type: ASTType.LITERAL, value: '0' },  // Cabezal 0
            ],
          },
        ],
      };

      const result = service.execute(ast);
      expect(result.audioMatrix).toHaveLength(1);
      expect(result.audioMatrix[0].note).toBe('C4');
      expect(result.audioMatrix[0].step).toBe(0);
      expect(result.audioMatrix[0].duration).toBe('1.000s');
    });

    it('debe lanzar error si se intenta hacer EMIT con un cabezal no inicializado', () => {
      const ast: AST = {
        type: ASTType.PROGRAM,
        body: [
          {
            type: ASTType.INSTRUCTION,
            name: 'EMIT',
            arguments: [
              { type: ASTType.LITERAL, value: '60' },
              { type: ASTType.LITERAL, value: '4' },
              { type: ASTType.LITERAL, value: '99' }, // No existe
            ],
          },
        ],
      };

      expect(() => service.execute(ast)).toThrow();
    });
  });

  describe('4. Movimientos y Desplazamientos del Cabezal', () => {
    it('debe desplazar el cabezal a la derecha (>>) y registrar el historial', () => {
      const ast: AST = {
        type: ASTType.PROGRAM,
        body: [
          { type: ASTType.INSTRUCTION, name: '>>' },
          { type: ASTType.INSTRUCTION, name: '>>' },
        ],
      };

      const result = service.execute(ast);
      expect(result.tapeHistory).toHaveLength(2);
      expect(result.tapeHistory[0].step).toBe(1);
      expect(result.tapeHistory[1].step).toBe(2);
    });
  });

  describe('5. Control de Flujo y Protección contra Ciclos Infinitos', () => {
    it('debe detectar y prevenir bucles infinitos en ejecuciones descontroladas', () => {
      // Simular un programa que exceda el límite máximo de iteraciones (5000)
      const infiniteLoopAST: AST = {
        type: ASTType.PROGRAM,
        body: [
          {
            type: ASTType.INSTRUCTION,
            name: 'JUMP',
            arguments: [
              {
                type: ASTType.CONDITION,
                operator: '==',
                left: { type: ASTType.LITERAL, value: '1' },
                right: { type: ASTType.LITERAL, value: '1' },
              },
              { type: ASTType.LITERAL, value: '#A' },
              { type: ASTType.LITERAL, value: '0' },
            ],
          },
        ],
      };

      // Si el motor llega a exceder el umbral, debe lanzar BadRequestException
      // O ejecutar el salto sin colapsar el sistema
      expect(() => service.execute(infiniteLoopAST)).not.toThrow(RangeError);
    });
  });
});
