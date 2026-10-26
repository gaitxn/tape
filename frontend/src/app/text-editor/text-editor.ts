import { Component, ElementRef, ViewChild, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LexerApi } from '../lexer.service';

@Component({
  selector: 'text-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './text-editor.html',
  styleUrls: ['./text-editor.css']
})
export class TextEditor implements AfterViewInit {
  private api = inject(LexerApi);

  codeContent: string = 'WRITE(A, 0, 16)(A, 1, 12);\n// Escribe más líneas aquí...';

  lines: string[] = this.codeContent.split('\n');
  @ViewChild('lineNumbersRef') lineNumbersRef!: ElementRef<HTMLDivElement>;
  @ViewChild('textareaRef') textareaRef!: ElementRef<HTMLTextAreaElement>;

  codeContent: string = '// Escribe tu código aquí...';
  lineCount: number = 1; // Inicializado obligatoriamente como número entero

  ngAfterViewInit() {
    this.updateLineCount();
  }

  onScroll(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    if (this.lineNumbersRef) {
      this.lineNumbersRef.nativeElement.scrollTop = textarea.scrollTop;
    }
  }

  onInput() {
    this.updateLineCount();
  }

  updateLines() {
    this.lines = this.codeContent.split('\n');
    this.lineCount = Math.max(1, lines.length);
    this.api.code = this.codeContent;   // solo guarda, no envía
  }

  onScroll() {
    if (this.lineNumbersRef && this.textareaRef) {
      this.lineNumbersRef.nativeElement.scrollTop = this.textareaRef.nativeElement.scrollTop;
    }
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      event.preventDefault();
      const textarea = this.textareaRef.nativeElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      this.codeContent = this.codeContent.substring(0, start) + '    ' + this.codeContent.substring(end);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      });
    }
  }
}