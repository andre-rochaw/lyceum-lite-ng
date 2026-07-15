import { Component, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterOutlet } from '@angular/router';
import { LoadingService } from './core/services/loading.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatProgressSpinnerModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly loading = inject(LoadingService);
}
