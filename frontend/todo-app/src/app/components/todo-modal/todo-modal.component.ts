import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Todo } from '../../models/todo.model';

@Component({
  selector: 'app-todo-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './todo-modal.component.html',
  styleUrls: ['./todo-modal.component.scss']
})
export class TodoModalComponent {
  @Input() todo: Todo | null = null;
  @Output() save = new EventEmitter<Todo>();
  @Output() cancel = new EventEmitter<void>();

  title: string = '';
  description: string = '';
  category: string = '';
  completed: boolean = false;

  ngOnInit() {
    if (this.todo) {
      this.title = this.todo.title ?? '';
      this.description = this.todo.description ?? '';
      this.category = this.todo.category ?? '';
      this.completed = this.todo.completed ?? false;
    }
  }

  saveTodo() {
    const newTodo: Todo = {
      id: this.todo ? this.todo.id : 0,
      title: this.title,
      description: this.description,
      category: this.category,
      completed: this.completed
    };
    this.save.emit(newTodo);
  }

  cancelModal() {
    this.cancel.emit();
  }
}
