import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Todo } from '../models/todo.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  private apiUrl = 'http://localhost:5290/api/todo';

  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  getTodos(): Observable<Todo[]> {
    return this.http.get<Todo[]>(this.apiUrl);
  }

  getTodo(id: number): Observable<Todo> {
    return this.http.get<Todo>(`${this.apiUrl}/${id}`);
  }

  addTodo(todo: Todo): Observable<Todo> {
    return this.http.post<Todo>(this.apiUrl, todo, this.httpOptions);
  }

  updateTodo(id: number, todo: Todo): Observable<Todo> {
    return this.http.put<Todo>(`${this.apiUrl}/${id}`, todo, this.httpOptions);
  }

  deleteTodo(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
