# Smart AI Todo — Codebase Guide for AI Agents

## Repo Structure
- Backend: `backend/SmartTodo/` — .NET Core Web API
- Frontend: `frontend/todo-app/src/app/` — Angular app

## Key Files — Read ONLY What You Need for the Issue

### Backend (.NET Core)
- Todo Model: `backend/SmartTodo/Todo.cs`
- Todo Controller: `backend/SmartTodo/Controllers/TodoController.cs`
- AI Service: `backend/SmartTodo/Services/AIService.cs`
- AI Response Model: `backend/SmartTodo/Services/AIResponse.cs`
- DB Context: `backend/SmartTodo/TodoDbContext.cs`
- Entry Point: `backend/SmartTodo/Program.cs`

### Frontend (Angular)
- Todo Model: `frontend/todo-app/src/app/models/todo.model.ts`
- Todo Service: `frontend/todo-app/src/app/services/todo.service.ts`
- Todo Form Component: `frontend/todo-app/src/app/components/todo-form/todo-form.component.ts`
- Todo Form Template: `frontend/todo-app/src/app/components/todo-form/todo-form.component.html`
- Todo List Component: `frontend/todo-app/src/app/components/todo-list/todo-list.component.ts`
- Todo List Template: `frontend/todo-app/src/app/components/todo-list/todo-list.component.html`
- Todo Modal Component: `frontend/todo-app/src/app/components/todo-modal/todo-modal.component.ts`
- Todo Modal Template: `frontend/todo-app/src/app/components/todo-modal/todo-modal.component.html`
- Chatbot Component: `frontend/todo-app/src/app/components/chatbot/chatbot.component.ts`

## Coding Conventions
- .NET: Todo model lives directly in `backend/SmartTodo/Todo.cs` (not in a Models subfolder)
- Angular: Use existing service patterns in `todo.service.ts` for all API calls
- Angular: Use reactive forms, follow patterns in `todo-form.component.ts`
- Always update BOTH backend AND frontend for any model/field changes
- For new backend fields: update `Todo.cs` + `TodoController.cs` + `TodoDbContext.cs`
- For new frontend fields: update `todo.model.ts` + `todo.service.ts` + relevant component

## Which Files to Read Per Issue Type

### Adding a new field to Todo:
1. `backend/SmartTodo/Todo.cs`
2. `backend/SmartTodo/Controllers/TodoController.cs`
3. `frontend/todo-app/src/app/models/todo.model.ts`
4. `frontend/todo-app/src/app/components/todo-form/todo-form.component.ts`
5. `frontend/todo-app/src/app/components/todo-form/todo-form.component.html`
6. `frontend/todo-app/src/app/components/todo-list/todo-list.component.html`

### Changing AI behaviour:
1. `backend/SmartTodo/Services/AIService.cs`
2. `backend/SmartTodo/Services/AIResponse.cs`

### Frontend UI changes only:
1. Relevant component .ts and .html files only

## Do NOT Read — Waste of Tokens
- `node_modules/`, `bin/`, `obj/`, `dist/`, `.angular/`
- `*.json`, `*.lock`, `*.csproj`, `*.sln` files
- `appsettings*.json`, `launchSettings.json`
- `*.spec.ts` test files unless issue is about tests
- `*.scss` files unless issue is about styling
- Any file not directly related to the issue
