import { BadRequestException } from '@nestjs/common';

export class TapeMatrix {
  private readonly ROWS = ['A', 'B', 'C', 'D'];
  private readonly MAX_COLS = 35;
  private readonly MAX_CELL_VALUE = 127;

  private grid: Record<string, number[]> = {
    A: new Array(this.MAX_COLS).fill(0),
    B: new Array(this.MAX_COLS).fill(0),
    C: new Array(this.MAX_COLS).fill(0),
    D: new Array(this.MAX_COLS).fill(0),
  };

  private heads: Map<string | number, { row: string; col: number }> = new Map();

  private currentStep: number = 0;
  // Almacena pares [rowIndex, colIndex] de las celdas activas o modificadas
  private activeCells: number[][] = [[0, 0]];
  // [0] = índice de fila (0..3 -> A..D), [1] = índice de columna (0..34)
  private headPosition: number[] = [0, 0];

  // --- LECTURA Y ESCRITURA ---

  public writeCurrentCell(value: number): void {
    if (value < 0 || value > this.MAX_CELL_VALUE || isNaN(value)) {
      throw new BadRequestException(
        `El valor (${value}) debe estar entre 0 y ${this.MAX_CELL_VALUE}.`
      );
    }

    const [rowIdx, colIdx] = this.headPosition;
    const rowKey = this.ROWS[rowIdx];
    this.grid[rowKey][colIdx] = Math.floor(value);

    this.registerActiveCell(rowIdx, colIdx);
    this.currentStep++;
  }

  public readCurrentCell(): number {
    const [rowIdx, colIdx] = this.headPosition;
    const rowKey = this.ROWS[rowIdx];
    return this.grid[rowKey][colIdx];
  }

  // --- MOVIMIENTO Y SALTOS DE CABEZAL ---

  public moveHead(direction: '<<' | '>>' | '^' | 'v'): void {
    switch (direction) {
      case '<<':
        if (this.headPosition[1] - 1 < 0) {
          throw new BadRequestException('Límite izquierdo alcanzado.');
        }
        this.headPosition[1]--;
        break;

      case '>>':
        if (this.headPosition[1] + 1 >= this.MAX_COLS) {
          throw new BadRequestException('Límite derecho alcanzado.');
        }
        this.headPosition[1]++;
        break;

      case '^':
        if (this.headPosition[0] - 1 < 0) {
          throw new BadRequestException('Límite superior (A) alcanzado.');
        }
        this.headPosition[0]--;
        break;

      case 'v':
        if (this.headPosition[0] + 1 >= this.ROWS.length) {
          throw new BadRequestException('Límite inferior (D) alcanzado.');
        }
        this.headPosition[0]++;
        break;
    }

    this.registerActiveCell(this.headPosition[0], this.headPosition[1]);
  }

  public jumpHeadTo(rowLabel: string, col: number): void {
    // Limpia el '#' si viene de la referencia de fila (ej. '#B' -> 'B')
    const cleanRow = rowLabel.replace('#', '').toUpperCase();
    const rowIdx = this.ROWS.indexOf(cleanRow);

    if (rowIdx === -1) {
      throw new BadRequestException(`Fila '${rowLabel}' inexistente.`);
    }
    if (col < 0 || col >= this.MAX_COLS) {
      throw new BadRequestException(`Columna (${col}) fuera de límites.`);
    }

    this.headPosition = [rowIdx, col];
    this.registerActiveCell(rowIdx, col);
    this.currentStep++;
  }

  // --- GESTIÓN DE CABEZALES DE EMISIÓN (SPAWN / KILL) ---

  public spawnHead(id: string | number, row: string = 'A', col: number = 0): void {
    if (this.heads.has(id)) {
      throw new BadRequestException(`El cabezal '${id}' ya existe.`);
    }
    const cleanRow = row.replace('#', '').toUpperCase();
    if (!this.ROWS.includes(cleanRow) || col < 0 || col >= this.MAX_COLS) {
      throw new BadRequestException(`Coordenadas inválidas en SPAWN.`);
    }

    this.heads.set(id, { row: cleanRow, col });
    // this.currentStep++;
  }

  public killHead(id: string | number): void {
    if (!this.heads.has(id)) {
      throw new BadRequestException(`El cabezal '${id}' no existe.`);
    }
    this.heads.delete(id);
    // this.currentStep++;
  }

  public validateEmitHead(headId: number): void {
    const id = Number(headId);
    if (isNaN(id) || !this.heads.has(id)) {
      throw new BadRequestException(
        `El cabezal de emisión '${headId}' no ha sido inicializado con SPAWN(${headId}) o ya fue cerrado con KILL.`
      );
    }
  }

  // --- HELPERS Y CONSULTAS PARA TapeHistory ---

  private registerActiveCell(rowIdx: number, colIdx: number): void {
    const exists = this.activeCells.some(([r, c]) => r === rowIdx && c === colIdx);
    if (!exists) {
      this.activeCells.push([rowIdx, colIdx]);
    }
  }

  public incrementStep() {
    this.currentStep++;
  }

  public getCurrentStep(): number {
    return this.currentStep;
  }

  public getActiveCells(): number[][] {
    // Retorna copia profunda de las coordenadas activas [[fila, col], ...]
    return this.activeCells.map((coord) => [...coord]);
  }

  public getHeadPosition(): number[] {
    // Retorna copia [rowIdx, colIdx]
    return [...this.headPosition];
  }

  public getCurrentTapeSymbols(): number[] {
    const currentValues: number[] = [];
    for (const [rowIdx, colIdx] of this.activeCells) {
      const rowKey = this.ROWS[rowIdx];
      currentValues.push(this.grid[rowKey][colIdx]);
    }
    return currentValues;
  }
}