import { Component, OnInit } from '@angular/core';
import { TodoService } from '../../services/todo.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Todo } from '../../models/todo.model';
import { TodoModalComponent } from '../todo-modal/todo-modal.component';
import { Output, EventEmitter, Input } from '@angular/core';

@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TodoModalComponent],
  templateUrl: './todo-list.component.html',
  styleUrls: ['./todo-list.component.scss']
})
export class TodoListComponent implements OnInit {
  todos: Todo[] = [];
  @Output() openAdd = new EventEmitter<void>();
  @Output() openEdit = new EventEmitter<Todo>();
  @Input() todosLoaded: EventEmitter<void> | undefined;

  constructor(private todoService: TodoService) {}

  ngOnInit(): void {
    this.loadTodos();
    if (this.todosLoaded) {
      this.todosLoaded.subscribe(() => {
        this.loadTodos();
      });
    }
  }

  loadTodos(): void {
    this.todoService.getTodos().subscribe(data => this.todos = data);
  }

  // Create a new todo
  addTodo(newTodo: Todo): void {
    this.todoService.addTodo(newTodo).subscribe(() => {
      this.loadTodos();  // Reload todos after adding a new one
    });
  }

  // Update an existing todo
  editTodo(updatedTodo: Todo): void {
    this.todoService.updateTodo(updatedTodo.id, updatedTodo).subscribe(() => {
      this.loadTodos();  // Reload todos after updating
    });
  }

  // Delete a todo
  deleteTodo(id: number): void {
    this.todoService.deleteTodo(id).subscribe(() => {
      this.loadTodos();  // Reload todos after deletion
    });
  }

  onOpenAdd() {
    this.openAdd.emit();
  }

  onOpenEdit(todo: Todo) {
    this.openEdit.emit(todo);
  }
}
