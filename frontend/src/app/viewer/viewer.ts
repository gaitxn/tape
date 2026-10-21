import { identifierName } from '@angular/compiler';
import { Component } from '@angular/core';

@Component({
  selector: 'viewer',
  templateUrl: './viewer.html',
  styleUrls: ['./viewer.css']
})
export class Viewer {
  // Filas fijas a la izquierda (A, B, C, D)
  rows: string[] = ['A', 'B', 'C', 'D'];

  // Generamos un arreglo de 35 columnas (o N columnas) para numerar del 1 a N arriba
  totalColumns: number = 35;
  cols: number[] = Array.from({ length: this.totalColumns }, (_, i) => i);
  
  // Sistema para manejar qué celdas están activas
  activeCells = new Set<string>();
  gridData: number[][] = this.rows.map((row, rIndex) => {
    return Array.from({ length: this.totalColumns }, (_, cIndex) => {
      // Valor para cada celda
      return 0;
    });
  });

  getData(rIndex:number, cIndex:number) {
    return this.gridData[rIndex][cIndex];
  }
  
  setData(rIndex:number, cIndex:number, value:number) {
    this.gridData[rIndex][cIndex] = value;
  }

  toggleCell(rowIndex: number, colIndex: number) {
    const key = `${rowIndex}-${colIndex}`;
    if (this.activeCells.has(key)) {
      this.activeCells.delete(key);
    } else {
      this.activeCells.add(key);
    }
  }

  isActive(rowIndex: number, colIndex: number): boolean {
    return this.activeCells.has(`${rowIndex}-${colIndex}`);
  }
}