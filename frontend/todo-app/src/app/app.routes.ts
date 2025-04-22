import { Routes } from '@angular/router';
import { TodoListComponent } from './components/todo-list/todo-list.component';
import { TodoFormComponent } from './components/todo-form/todo-form.component';

export const routes: Routes = [
  { path: '', component: TodoListComponent },
  { path: 'add', component: TodoFormComponent },
  { path: 'edit/:id', component: TodoFormComponent },
  { path: '**', redirectTo: '' }
];
