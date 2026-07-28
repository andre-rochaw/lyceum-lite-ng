import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';

export interface ConfirmConfirmarMatriculaData {
  alunoNome: string;
  turmaNome: string;
}

@Component({
  selector: 'app-confirm-confirmar-matricula-dialog',
  imports: [
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
  ],
  template: `
    <h2 mat-dialog-title>Confirmar matricula</h2>
    <mat-dialog-content>
      Deseja confirmar esta matricula?
      <p class="dialog-detail">
        <strong>{{ data.alunoNome }}</strong> em
        <strong>{{ data.turmaNome }}</strong>
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Cancelar</button>
      <button mat-flat-button color="primary" [mat-dialog-close]="true" type="button">
        Confirmar
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .dialog-detail {
      margin: 0.75rem 0 0;
      opacity: 0.85;
    }
  `,
})
export class ConfirmConfirmarMatriculaDialog {
  readonly data = inject<ConfirmConfirmarMatriculaData>(MAT_DIALOG_DATA);
}
