# Smart AI Todo — Codebase Guide for AI Agents

## Repo Structure
- Backend: `/backend/SmartTodo/` — .NET Core Web API
- Frontend: `/frontend/` — Angular app
- Models: `/backend/SmartTodo/Models/`
- Controllers: `/backend/SmartTodo/Controllers/`
- Services: `/backend/SmartTodo/Services/`
- Angular Components: `/frontend/src/app/components/`
- Angular Services: `/frontend/src/app/services/`

## Key Files — Read These for Context
- Todo Model: `backend/SmartTodo/Models/Todo.cs`
- Todo Controller: `backend/SmartTodo/Controllers/TodoController.cs`
- Todo Service: `backend/SmartTodo/Services/TodoService.cs`
- Angular Todo Component: `frontend/src/app/components/todo/todo.component.ts`
- Angular Todo Service: `frontend/src/app/services/todo.service.ts`

## Coding Conventions
- .NET: Follow existing model patterns, always add migrations
- Angular: Use existing service patterns, reactive forms only
- Always update both backend AND frontend for model changes
- Branch naming: feature/issue-{number}

## What NOT to Read
- node_modules/
- bin/ obj/ dist/
- *.json config files unless directly relevant
