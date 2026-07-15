import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

const TOAST_POSITION: MatSnackBarConfig = {
  verticalPosition: 'top',
  horizontalPosition: 'center',
};

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, 'Fechar', {
      ...TOAST_POSITION,
      duration: 3500,
      panelClass: ['snack-success'],
    });
  }

  error(message: string): void {
    this.snackBar.open(message, 'Fechar', {
      ...TOAST_POSITION,
      duration: 5000,
      panelClass: ['snack-error'],
    });
  }

  info(message: string): void {
    this.snackBar.open(message, 'Fechar', {
      ...TOAST_POSITION,
      duration: 3500,
    });
  }
}
