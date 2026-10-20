import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'viewer',
  imports: [],
  templateUrl: './viewer.html',
  styleUrl: './viewer.css',
})
export class Viewer {
  grid: { text: string; active: boolean }[][] = [];
  letters: string[] = 'ABCDEFG'.split('');

  ngOnInit() {
    this.generateGrid(4, 35); // 4 filas, 35 columnas
  }

  generateGrid(rows: number, cols: number) {    
    for (let r = 0; r < rows; r++) {
      const row: { text: string; active: boolean }[] = [];
      for (let c = 0; c < cols; c++) {
        const col= `${c}`;
        row.push({
          text: `${r}:${col}`,
          active: false
        });
      }
      this.grid.push(row);
      this.letters.push();
    }
  }
}
