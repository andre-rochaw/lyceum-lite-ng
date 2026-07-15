import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-home',
  imports: [MatCardModule, DatePipe],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  readonly user = inject(AuthService).currentUser;
}
