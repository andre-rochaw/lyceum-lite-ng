import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';

export interface ConfirmExcluirDisciplinaData {
  nome: string;
}

@Component({
  selector: 'app-confirm-excluir-disciplina-dialog',
  imports: [
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
  ],
  template: `
    <h2 mat-dialog-title>Excluir disciplina</h2>
    <mat-dialog-content>
      Confirma a exclusao de <strong>{{ data.nome }}</strong>? Esta acao nao pode ser
      desfeita.
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Cancelar</button>
      <button mat-flat-button color="warn" [mat-dialog-close]="true" type="button">
        Excluir
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmExcluirDisciplinaDialog {
  readonly data = inject<ConfirmExcluirDisciplinaData>(MAT_DIALOG_DATA);
}
