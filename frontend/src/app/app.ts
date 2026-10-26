import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeader } from './app-header/app-header';
import { TextEditor } from './text-editor/text-editor';
import { Viewer } from './viewer/viewer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppHeader, TextEditor, Viewer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements AfterViewInit, OnDestroy {

@ViewChild('viewerRef') viewerRef!: ElementRef<HTMLElement>;
  
  private resizeObserver!: ResizeObserver;

  ngAfterViewInit() {
    this.updateViewerHeight();

    if (this.viewerRef?.nativeElement) {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateViewerHeight();
      });
      this.resizeObserver.observe(this.viewerRef.nativeElement);
    }
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private updateViewerHeight() {
    // El operador ?. evita el error si el elemento es undefined temporalmente
    const height = this.viewerRef?.nativeElement?.offsetHeight;
    
    if (height && height > 0) {
      document.documentElement.style.setProperty('--dynamic-viewer-height', `${height}px`);
    } else {
      // Valor de respaldo por seguridad si llega a medir cero o undefined
      document.documentElement.style.setProperty('--dynamic-viewer-height', '240px');
    }
  }
}
