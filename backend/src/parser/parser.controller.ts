import { Controller, Post, Body } from '@nestjs/common';
import { LexerService } from '../lexer/lexer.service.js';
import { ParserService } from './parser.service.js';
import { Token } from '../interfaces/token.interface.js';

@Controller('parser')
export class ParserController {
  constructor(
    private readonly parserService: ParserService,
  ) {}

  @Post('parse')
  parseOnly(@Body() body: { tokens?: Token[] }) {
    console.log('Cuerpo recibido en /parser/parse:', body);
    const tokens = body?.tokens ?? [];
    const ast = this.parserService.parse(tokens);
    console.log('Estructura AST: ', ast)
    return { ast };
  }
}