import { Routes } from '@angular/router';

export const TURMAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/turma-list/turma-list').then((m) => m.TurmaList),
  },
  {
    path: 'novo',
    loadComponent: () =>
      import('./pages/turma-form/turma-form').then((m) => m.TurmaForm),
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./pages/turma-form/turma-form').then((m) => m.TurmaForm),
  },
];
