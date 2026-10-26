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

  ngAfterViewInit() {
    this.updateLines();
  }

  onScroll(event: Event) {
    if (this.lineNumbersRef && this.textareaRef) {
      this.lineNumbersRef.nativeElement.scrollTop = this.textareaRef.nativeElement.scrollTop;
    }
  }

  onInput() {
    this.updateLines();
  }

  updateLines() {
    this.lines = this.codeContent.split('\n');
    this.api.code = this.codeContent;   // solo guarda, no envía
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