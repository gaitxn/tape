import { Injectable, BadRequestException } from '@nestjs/common';
import { Token, TokenType } from '../interfaces/token.interface.js';
import { AST, ASTType } from '../interfaces/ast.interface.js';

@Injectable()
export class ParserService {
    private tokens: Token[] = [];
    private current = 0;

    public parse(tokens: Token[]): AST {
    this.tokens = tokens;
    this.current = 0;
    
    const body: AST[] = [];
    
    while (!this.isAtEnd()) {
      this.skipComments();
      // Ignorar puntos y comas sobrantes a nivel global si es necesario
      if (this.check(TokenType.SEMICOLON)) {
        this.advance();
        continue;
      }
      if (this.isAtEnd()) break;
      body.push(this.parseExpression());
    }

    // Nodo Raíz del Programa
    return {
      type: ASTType.PROGRAM,
      body: body,
    };
  }

  private parseExpression(): AST {
    if (this.isAtEnd()) {
      throw new BadRequestException('Fin de archivo inesperado.');
    }

    const token = this.peek();

    let node: AST = {
      type: ASTType.NONE,
    };

    if (this.isAtEnd()) {
      console.log(token);
      this.advance();
      return node;
    }

    if (token.type === TokenType.KEYWORD) {
      return this.parseInstruction();
    }

    if (token.type === TokenType.NUMBER) {
      return this.parseLiteral();
    }

    if (this.check(TokenType.IDENTIFIER)) {
      const variableToken = this.peek();
      
      // Comprobar si el SIGUIENTE token es un operador de asignación '='
      const nextToken = this.tokens[this.current + 1];
      const isAssignment = nextToken && nextToken.type === TokenType.ASSIGN;

      if (isAssignment) {
        // CASO A: Es una asignación (ej: x = 10)
        this.advance(); // Consumir el identificador
        this.consume(TokenType.ASSIGN, 'Se esperaba operador de asignación \'=\'.');
        const valueNode = this.parseLiteral(); // parseExpression() para expresiones a la derecha
        
        return {
          type: ASTType.IDENTIFIER,
          name: variableToken.value,
          value: valueNode.value,
          arguments: [],
        };
      } else {
        // CASO B: Es solo un uso/referencia de variable (ej: WRITE(C) o parámetros de DEFINE)
        this.advance(); // Consumir el identificador
        return {
          type: ASTType.IDENTIFIER,
          name: variableToken.value,
        };
      }
    }

    if ([TokenType.UP, TokenType.DOWN, TokenType.SHIFT_LEFT, TokenType.SHIFT_RIGHT].includes(token.type)) {
      this.advance();
      return {
        type: ASTType.INSTRUCTION,
        name: token.value,
      };
    }

    throw new BadRequestException(`Sintaxis inesperada '${token.value}': ${token.type} en la línea ${token.line}`);
  }

  private parseInstruction(): AST {
    const keywordToken = this.consume(TokenType.KEYWORD, 'Se esperaba una palabra clave.');
    const keyword = keywordToken.value.toUpperCase(); // Normalizar para comparar

    const node: AST = {
      type: ASTType.INSTRUCTION,
      name: keywordToken.value,
      arguments: [],
    };

    switch (keyword) {
      case 'READ':
        this.parseArguments(node); // Consume los paréntesis ()
        if (node.arguments!.length !== 0) {
          throw new BadRequestException(`La instrucción 'READ' no debe recibir argumentos en la línea ${keywordToken.line}.`);
        }
        break;

      case 'SPAWN':
        this.parseArguments(node);
        // Validaciones específicas para SPAWN si las hubiera
        break;

      case 'WRITE':
      case 'KILL':
      case 'EMIT':
        this.parseArguments(node);
        // Deben recibir exactamente 1 argumento
        if (node.arguments!.length !== 1) {
          throw new BadRequestException(`La instrucción '${keyword}' requiere exactamente 1 argumento en la línea ${keywordToken.line}.`);
        }
        break;

      case 'JUMP':
        this.parseArguments(node);
        // Debe recibir exactamente 3 argumentos: (condition, row, columm)
        if (node.arguments!.length !== 3) {
          throw new BadRequestException(`La instrucción 'JUMP' requiere exactamente 3 argumentos (condition, row, column) en la línea ${keywordToken.line}.`);
        }
        break;

      case 'DEFINE': {
        const funcNameToken = this.consume(TokenType.IDENTIFIER, 'Se esperaba el nombre de la función.');
  
        const argsNode: AST = { type: ASTType.INSTRUCTION, arguments: [] };
        this.parseArguments(argsNode); 

        const blockNode = this.parseBlock();

        return {
          type: ASTType.FUNCTION,
          name: funcNameToken.value,
          arguments: argsNode.arguments || [], // Garantiza que sea AST[]
          body: blockNode.body || [],          // Garantiza que sea AST[] (blockNode.body es un AST[])
        };
      }

      default:
        // Instrucciones generales por defecto
        this.parseArguments(node);
        break;
    }

    return node;
  }

  private parseArguments(node: AST) {
    // Soporte para expresiones anidadas con paréntesis (ej: EMIT(READ(id)))
    if (this.check(TokenType.LPAREN)) {
      this.advance(); // Consumir '('

      if (!node.arguments) {
        node.arguments = [];
      }
      
      while (!this.check(TokenType.RPAREN) && !this.isAtEnd()) {
        node.arguments.push(this.parseExpression()); // Llamada recursiva para anidamiento

        if (this.check(TokenType.COMMA)) {
          this.advance(); // Consumir la coma ',' entre argumentos
        }
      }
      
      this.consume(TokenType.RPAREN, "Se esperaba ')' al cerrar la instrucción.");
    }

    return node;
  }

  private parseBlock(): AST {
    // 1. Consumir la llave de apertura '{'
    this.consume(TokenType.LBRACE, "Se esperaba '{' para iniciar el bloque.");

    const body: AST[] = [];

    // 2. Iterar hasta encontrar la llave de cierre '}' o el fin de archivo
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.check(TokenType.SEMICOLON)) {
        this.advance();
        continue;
      }

      body.push(this.parseExpression());
    }

    // 3. Consumir la llave de cierre '}'
    this.consume(TokenType.RBRACE, "Se esperaba '}' para cerrar el bloque.");

    return {
      type: ASTType.PROGRAM, 
      body: body,
    };
  }

  private parseLiteral(): AST {
    const token = this.peek();
    if (token.type === TokenType.NUMBER) {
      this.advance();
      return {
        type: ASTType.LITERAL,
        value: token.value,
      };
    }
    throw new BadRequestException(`Se esperaba un valor literal en la línea ${token.line}`);
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length
  }
  private peek(): Token {
    return this.tokens[this.current] || { type: TokenType.EOF, value: '', line: 0 };
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.tokens[this.current - 1];
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new BadRequestException(message);
  }

  private skipComments() {
    while (!this.isAtEnd() && this.peek().type === TokenType.COMMENT) {
      this.current++; // Avanza y descarta el comentario
    }
  }
}