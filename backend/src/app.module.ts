import { Module } from '@nestjs/common';
import { LexerController } from './lexer/lexer.controller.js';
import { LexerService } from './lexer/lexer.service.js';
import { ParserController } from './parser/parser.controller.js';
import { ParserService } from './parser/parser.service.js';
import { TuringController } from './turing/turing-engine.controller.js';
import { TuringService } from './turing/turing-engine.service.js';

@Module({
  imports: [],
  controllers: [LexerController, ParserController, TuringController],
  providers: [LexerService, ParserService, TuringService],
})
export class AppModule {}
