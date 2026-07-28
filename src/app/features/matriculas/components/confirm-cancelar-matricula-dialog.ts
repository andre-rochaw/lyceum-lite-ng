import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';

export interface ConfirmCancelarMatriculaData {
  alunoNome: string;
  turmaNome: string;
}

@Component({
  selector: 'app-confirm-cancelar-matricula-dialog',
  imports: [
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
  ],
  template: `
    <h2 mat-dialog-title>Cancelar matricula</h2>
    <mat-dialog-content>
      Deseja cancelar esta matricula?
      <p class="dialog-detail">
        <strong>{{ data.alunoNome }}</strong> em
        <strong>{{ data.turmaNome }}</strong>
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Voltar</button>
      <button mat-flat-button color="warn" [mat-dialog-close]="true" type="button">
        Cancelar matricula
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
export class ConfirmCancelarMatriculaDialog {
  readonly data = inject<ConfirmCancelarMatriculaData>(MAT_DIALOG_DATA);
}
