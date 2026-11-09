export enum TokenType {
  KEYWORD = 'KEYWORD',           // READ, WRITE, SPAWN, KILL, JUMP, EMIT, DEFINE
  IDENTIFIER = 'IDENTIFIER',     // Variables definidas por el usuario
  NUMBER = 'NUMBER',             // 0, 1, 120
  SHIFT_LEFT = 'SHIFT_LEFT',     // <<
  SHIFT_RIGHT = 'SHIFT_RIGHT',   // >>
  UP = 'UP',                     // ^
  DOWN = 'DOWN',                 // v
  PLUS = 'PLUS',                 // +
  MINUS = 'MINUS',               // -
  LPAREN = 'LPAREN',             // (
  RPAREN = 'RPAREN',             // )
  LBRACE = 'LBRACE',             // {
  RBRACE = 'RBRACE',             // }
  COMMA = 'COMMA',               // ,
  SEMICOLON = 'SEMICOLON',       // ;
  COMMENT = 'COMMENT',           // //
  DOUBLE_EQUAL = "DOUBLE_EQUAL", // ==
  NOT_EQUAL = "NOT_EQUAL",       // !=
  LESS_THAN = "LT",              // <
  GREATER_THAN = "GT",           // >
  LESS_EQUAL = "LE",             // <=
  GREATER_EQUAL = "GE",          // >=
  ASSIGN = "ASSIGN",             // =
  NOT = "NOT",                   // !
  EOF = "EOF",                   // Fin del Documento

  ROW_REFERENCE = 'ROW_REFERENCE', // Ej: #A, #B, #C, #D
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
}