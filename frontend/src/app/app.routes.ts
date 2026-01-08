import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { DashboardComponent } from './components/admin/dashboard/dashboard.component';
import { FormEditorComponent } from './components/admin/form-editor/form-editor.component';
import { FormListComponent } from './components/admin/form-list/form-list.component';
import { ResponsesComponent } from './components/admin/responses/responses.component';
import { FormSelectionComponent } from './components/client/form-selection/form-selection.component';
import { FormFillComponent } from './components/client/form-fill/form-fill.component';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    children: [
      { path: '', component: DashboardComponent },
      { path: 'forms', component: FormListComponent },
      { path: 'forms/new', component: FormEditorComponent },
      { path: 'forms/:id/edit', component: FormEditorComponent },
      { path: 'responses', component: ResponsesComponent },
      { path: 'responses/:formId', component: ResponsesComponent },
      { path: 'form/:id', component: FormFillComponent }
    ]
  },
  {
    path: 'client',
    canActivate: [authGuard],
    children: [
      { path: '', component: FormSelectionComponent },
      { path: 'form/:id', component: FormFillComponent }
    ]
  }
];
