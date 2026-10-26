import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'text-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './text-editor.html',
  styleUrls: ['./text-editor.css']
})
export class TextEditor implements AfterViewInit {
  @ViewChild('textareaRef') textareaRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('lineNumbersRef') lineNumbersRef!: ElementRef<HTMLDivElement>;

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

  private updateLineCount() {
    const lines = this.codeContent.split('\n');
    this.lineCount = Math.max(1, lines.length);
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