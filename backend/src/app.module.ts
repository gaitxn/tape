import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { LexerController } from './lexer/lexer.controller.js';
import { LexerService } from './lexer/lexer.service.js';

@Module({
  imports: [],
  controllers: [AppController, LexerController],
  providers: [AppService, LexerService],
})
export class AppModule {}
