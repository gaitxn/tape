import { Component, ElementRef, ViewChild, AfterViewInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LexerApi } from '../lexer.service';

@Component({
  selector: 'text-editor',
  imports: [FormsModule],
  templateUrl: './text-editor.html',
  styleUrl: './text-editor.css',
})
export class TextEditor {
  private api = inject(LexerApi);

  codeContent: string = 'WRITE(A, 0, 16)(A, 1, 12);\n// Escribe más líneas aquí...';

  lines: string[] = this.codeContent.split('\n');
  @ViewChild('lineNumbersRef') lineNumbersRef!: ElementRef<HTMLDivElement>;
  @ViewChild('textareaRef') textareaRef!: ElementRef<HTMLTextAreaElement>;

  ngAfterViewInit() {
    this.updateLines();
  }

  onInput() {
    this.updateLines();
  }

  updateLines() {
    this.lines = this.codeContent.split('\n');
    this.api.code = this.codeContent;   // solo guarda, no envía
  }

  onScroll() {
    if (this.lineNumbersRef && this.textareaRef) {
      this.lineNumbersRef.nativeElement.scrollTop = this.textareaRef.nativeElement.scrollTop;
    }
  }
}