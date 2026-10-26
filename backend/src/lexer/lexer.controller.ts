import { Body, Controller, Logger, Post } from '@nestjs/common';
import { LexerService } from './lexer.service.js';

@Controller('lexer')
export class LexerController {
  private readonly logger = new Logger(LexerController.name);

  constructor(private readonly lexerService: LexerService) {}

  /**
   * Recibe el código escrito por el usuario, lo pasa por el lexer
   * y muestra en consola cada instrucción (línea) con sus tokens.
   */
  @Post('tokenize')
  tokenize(@Body() body: { code?: string }) {
    const code = body?.code ?? '';

    this.logger.log('──────── Código recibido ────────');
    code.split('\n').forEach((instruction, i) => {
      this.logger.log(`Línea ${i + 1}: ${instruction}`);
    });

    const tokens = this.lexerService.tokenize(code);

    this.logger.log(`Tokens generados (${tokens.length}):`);
    console.table(tokens);

    return { lines: code.split('\n').length, tokens };
  }
}