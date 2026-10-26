import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'text-editor',
  imports: [FormsModule],
  templateUrl: './text-editor.html',
  styleUrl: './text-editor.css',
})
export class TextEditor {
  codeContent: string = 'WRITE(A, 0, 16)(A, 1, 12);\n// Escribe más líneas aquí...';

  lines: string[] = [];
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
  }

  onScroll() {
    if (this.lineNumbersRef && this.textareaRef) {
      this.lineNumbersRef.nativeElement.scrollTop = this.textareaRef.nativeElement.scrollTop;
    }
  }
}
