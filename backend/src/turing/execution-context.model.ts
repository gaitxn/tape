import { BadRequestException } from '@nestjs/common';
import { AST } from '../interfaces/ast.interface.js';

export class ExecutionContext {
  private variables: Map<string, number> = new Map();
  private functions: Map<string, AST> = new Map();

  public setVariable(name: string, value: number): void {
    if (!name) {
      throw new BadRequestException('El nombre de la variable no puede estar vacío.');
    }
    this.variables.set(name, value);
  }

  public getVariable(name: string | undefined): number {
    if (!name) {
      throw new BadRequestException('Nombre de variable indefinido.');
    }
    
    const value = this.variables.get(name);
    if (value === undefined) {
      throw new BadRequestException(`La variable '${name}' no ha sido declarada.`);
    }
    
    return value;
  }

  public registerFunction(name: string, fnNode: AST): void {
    if (!name) {
      throw new BadRequestException('El nombre de la función no puede estar vacío.');
    }
    this.functions.set(name, fnNode);
  }

  public getFunction(name: string): AST | undefined {
    return this.functions.get(name);
  }
}