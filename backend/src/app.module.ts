import { Module } from '@nestjs/common';
import { LexerController } from './lexer/lexer.controller.js';
import { LexerService } from './lexer/lexer.service.js';
import { ParserController } from './parser/parser.controller.js';
import { ParserService } from './parser/parser.service.js';

@Module({
  imports: [],
  controllers: [LexerController, ParserController],
  providers: [LexerService, ParserService],
})
export class AppModule {}
