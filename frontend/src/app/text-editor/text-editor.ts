import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  inject,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompilerApi } from '../services/compiler.service';

@Component({
  selector: 'text-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './text-editor.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./text-editor.css'],
})
export class TextEditor implements AfterViewInit {
  private api = inject(CompilerApi);

  constructor() {
    effect(() => {
      const externalCode = this.api.loadedCode();
      if (externalCode !== null && externalCode !== this.codeContent) {
        queueMicrotask(() => {
          this.codeContent = externalCode;
          this.lines = this.codeContent.split('\n');
          this.api.code = this.codeContent;
        });
      }
    });
  }

  codeContent: string = `WRITE(5); >>;
SPAWN(1);
EMIT(READ(), 2, 1);
JUMP(READ() == 1, #B, 1);

DEFINE JumperOne(value){
    JUMP(READ() == value, #A, value);
}

JumperOne(3);
EMIT(2, 6, 1);
KILL(1);
// Escribe más líneas aquí...`;

  lines: string[] = this.codeContent.split('\n');
  @ViewChild('lineNumbersRef') lineNumbersRef!: ElementRef<HTMLDivElement>;
  @ViewChild('textareaRef') textareaRef!: ElementRef<HTMLTextAreaElement>;

  ngAfterViewInit() {
    this.updateLines();
  }

  public setCode(content: string): void {
    this.codeContent = content;
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
    this.api.code = this.codeContent; // solo guarda, no envía
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      event.preventDefault();
      const textarea = this.textareaRef.nativeElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      this.codeContent =
        this.codeContent.substring(0, start) + '    ' + this.codeContent.substring(end);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      });
    }
  }
}
