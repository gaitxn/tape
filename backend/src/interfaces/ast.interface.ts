export enum ASTType {
  PROGRAM = 'Program',
  FUNCTION = 'Function',
  CALL = 'Call',
  INSTRUCTION = 'InstructionNode',
  CONDITION = 'Condition',
  IDENTIFIER = 'Identifier',
  LITERAL = 'Literal',
  NONE = 'None',
}

export interface AST {
  type: ASTType,
  value?: string | number;
  name?: string,
  arguments?: AST[],
  operator?: string,
  left?: AST,
  right?: AST,
  body?: AST[]
}