import { Controller, Post, Body, Logger, BadRequestException } from '@nestjs/common';
import { TuringService } from './turing-engine.service.js';
import { AST } from '../interfaces/ast.interface.js';
import type { AudioMatrixDTO, CompilationMetadata } from '../interfaces/audio-matrix.interface.js';

@Controller('turing')
export class TuringController {
  private readonly logger = new Logger(TuringController.name);

  constructor(
    private readonly turingService: TuringService,
  ) {}

  @Post('compile')
  compile(@Body() body: { ast: AST, metadata?: CompilationMetadata }): AudioMatrixDTO {
    if (!body || !body.ast) {
      throw new BadRequestException('No se proporcionó un Árbol de Sintaxis Abstracta (AST) válido para ejecutar.');
    }

    // this.logger.log('──────── Ejecutando AST en Turing Engine ────────');
    
    const result = this.turingService.execute(body.ast, body.metadata);

    // this.logger.log(`Ejecución finalizada: ${result.audioMatrix.length} eventos de audio generados.`);

    return result;
  }
}