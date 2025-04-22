import { Component } from '@angular/core';
import { TodoListComponent } from './components/todo-list/todo-list.component';
import { TodoFormComponent } from './components/todo-form/todo-form.component';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChatbotComponent } from './components/chatbot/chatbot.component';
import { TodoModalComponent } from './components/todo-modal/todo-modal.component';
import { Todo } from './models/todo.model';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TodoService } from './services/todo.service';
import { Output, EventEmitter, AfterViewInit, ElementRef, ViewChild, Inject, PLATFORM_ID } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, TodoListComponent, TodoFormComponent, FormsModule, ChatbotComponent, TodoModalComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewInit {
  title = 'smart-todo-app';
  showTodoForm = false;
  showModal = false;
  selectedTodo: Todo | null = null;
  @Output() todosLoaded = new EventEmitter<void>();
  @ViewChild('resizable', { static: false }) resizable!: ElementRef;

  constructor(private todoService: TodoService, @Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      const resizer = document.querySelector('.resizer') as HTMLElement;
      const leftSide = document.querySelector('.col-md-4') as HTMLElement;
      const rightSide = document.querySelector('.col-md-8') as HTMLElement;

      let original_width = 0;
      let original_mouse_x = 0;

      const initDrag = (e: MouseEvent) => {
        original_width = parseFloat(getComputedStyle(leftSide).getPropertyValue('width'));
        original_mouse_x = e.pageX;
        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
      }

      const doDrag = (e: MouseEvent) => {
        const width = original_width + (e.pageX - original_mouse_x);
        leftSide.style.width = width + 'px';
        rightSide.style.width = (100 - width/document.body.offsetWidth * 100) + '%';
      }

      const stopDrag = (e: MouseEvent) => {
        document.removeEventListener('mousemove', doDrag);
        document.removeEventListener('mouseup', stopDrag);
      }

      resizer.addEventListener('mousedown', initDrag);
    }
  }

  toggleTodoForm() {
    this.showTodoForm = !this.showTodoForm;
  }

  openAddModal() {
    this.selectedTodo = null;
    this.showModal = true;
  }

  openEditModal(todo: Todo) {
    this.selectedTodo = todo;
    this.showModal = true;
  }

  onCloseModal() {
    this.showModal = false;
    this.selectedTodo = null;
  }

  onSaveTodo(todo: Todo) {
    if (todo.id) {
      this.todoService.updateTodo(todo.id, todo).subscribe(() => {
        this.loadTodos();
      });
    } else {
      this.todoService.addTodo(todo).subscribe(() => {
        this.loadTodos();
      });
    }
    this.showModal = false;
    this.selectedTodo = null;
  }

  loadTodos() {
    this.todosLoaded.emit();
  }
}
