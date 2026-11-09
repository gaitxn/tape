import { Component, ElementRef, ViewChild, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompilerApi } from '../compiler.service';

@Component({
  selector: 'text-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './text-editor.html',
  styleUrls: ['./text-editor.css']
})
export class TextEditor implements AfterViewInit {
  private api = inject(CompilerApi);

  codeContent: string = 'WRITE(5); >>;\nEMIT(READ(), 1);\nJUMP(READ() == 1, #B, A);\n//Escribe más líneas aquí...';

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