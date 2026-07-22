import { Routes } from '@angular/router';

export const MATRICULAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/matricula-list/matricula-list').then((m) => m.MatriculaList),
  },
  {
    path: 'novo',
    loadComponent: () =>
      import('./pages/matricula-form/matricula-form').then((m) => m.MatriculaForm),
  },
];
