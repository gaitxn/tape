import { Component, ChangeDetectionStrategy } from '@angular/core';
import { inject } from '@angular/core';
import { AudioEngineApi } from '../services/audio-engine.service';

@Component({
  selector: 'viewer',
  templateUrl: './viewer.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./viewer.css'],
})
export class Viewer {
  public readonly audioEngine = inject(AudioEngineApi);
  // Filas fijas a la izquierda (A, B, C, D)
  rows: string[] = ['A', 'B', 'C', 'D'];

  // Generamos un arreglo de 35 columnas (o N columnas) para numerar del 1 a N arriba
  totalColumns: number = 35;

  // Sistema para manejar qué celdas están activas
  activeCells = new Set<string>();
  gridData: number[][] = this.rows.map((row, rIndex) => {
    return Array.from({ length: this.totalColumns }, (_, cIndex) => {
      // Valor para cada celda
      return 0;
    });
  });

  setData(rIndex: number, cIndex: number, value: number) {
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

  public getData(rIndex: number, cIndex: number): number {
    const liveMap = this.audioEngine.liveTapeCells();
    if (liveMap.size > 0) {
      return liveMap.get(`${rIndex}-${cIndex}`) ?? 0;
    }
    return this.gridData[rIndex][cIndex];
  }

  public isEmitted(rIndex: number, cIndex: number): boolean {
    return (this.audioEngine.emittedCells().get(`${rIndex}-${cIndex}`) ?? 0) > 0;
  }

  public isHeadAt(rIndex: number, cIndex: number): boolean {
    const head = this.audioEngine.activeHead();
    return head !== null && head[0] === rIndex && head[1] === cIndex;
  }
}
