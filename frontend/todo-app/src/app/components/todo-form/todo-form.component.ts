import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Todo } from '../../models/todo.model';
import { TodoService } from '../../services/todo.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-todo-form',
  templateUrl: './todo-form.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class TodoFormComponent implements OnInit {
  todo: Todo = {
    id: 0,
    title: '',
    description: '',
    completed: false
  };
  isEditMode = false;

  constructor(
    private todoService: TodoService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.isEditMode = true;
      this.todoService.getTodo(+id).subscribe(t => {
        if (t) {
          this.todo = { ...t };
        }
      });
    }
  }

  onSubmit(): void {
    const trimmedTitle = this.todo.title.trim();
    if (!trimmedTitle) {
      return; // do nothing if title is empty or only spaces
    }

    this.todo.title = trimmedTitle;
    if (this.isEditMode) {
      this.todoService.updateTodo(this.todo.id, this.todo).subscribe(() => this.router.navigate(['/']));
    } else {
      this.todoService.addTodo(this.todo).subscribe(() => this.router.navigate(['/']));
    }
  }

  onCancel(): void {
    this.router.navigate(['/']);
  }
}
