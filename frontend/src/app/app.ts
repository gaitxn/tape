import { Component, signal } from '@angular/core';
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
export class App {
  protected readonly title = signal('frontend');
}
