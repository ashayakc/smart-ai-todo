using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartTodo;

[ApiController]
[Route("api/todo")]
public class TodosController : ControllerBase
{
    private readonly TodoDbContext _context;
    private readonly IAIService _aIService;

    public TodosController(TodoDbContext context, IAIService aIService)
    {
        _context = context;
        _aIService = aIService;
    }

    // GET: api/Todos
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Todo>>> GetTodos()
    {
        return await _context.Todos.ToListAsync();
    }

    // GET: api/Todos/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Todo>> GetTodo(int id)
    {
        var todo = await _context.Todos.FindAsync(id);

        if (todo == null)
        {
            return NotFound();
        }

        return todo;
    }

    // POST: api/Todos
    [HttpPost]
    public async Task<ActionResult<Todo>> PostTodo(Todo todo)
    {
        string category = await _aIService.CategorizeTodo(todo);
        todo.Category = category;
        await Create(todo);

        return CreatedAtAction(nameof(GetTodo), new { id = todo.Id }, todo);
    }

    private async Task Create(Todo todo)
    {
        _context.Todos.Add(todo);
        await _context.SaveChangesAsync();
    }

    // PUT: api/Todos/5
    [HttpPut("{id}")]
    public async Task<IActionResult> PutTodo(int id, Todo todo)
    {
        if (id != todo.Id)
        {
            return BadRequest();
        }

        // Call the AI service to categorize the todo
        string category = await _aIService.CategorizeTodo(todo);
        todo.Category = category; // Set the category

        try
        {
            await Update(todo);
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!TodoExists(id))
            {
                return NotFound();
            }
            else
            {
                throw;
            }
        }

        return Ok();
    }

    private async Task Update(Todo todo)
    {
        _context.Entry(todo).State = EntityState.Modified;
        await _context.SaveChangesAsync();
    }

    // DELETE: api/Todos/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTodo(int id)
    {
        var todo = await _context.Todos.FindAsync(id);
        if (todo == null)
        {
            return NotFound();
        }

        _context.Todos.Remove(todo);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    public class ProcessInstructionRequest
    {
        public string Instruction { get; set; }
        public List<string> ChatHistory { get; set; }
    }

    [HttpPost("process")]
    public async Task<IActionResult> ProcessInstruction([FromBody] ProcessInstructionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Instruction))
        {
            return BadRequest("Instruction cannot be null or empty.");
        }

        var aiResponse = await _aIService.ProcessUserInstruction(request.Instruction, request.ChatHistory);

        switch (aiResponse.Action)
        {
            case "create_todo":
                await Create(aiResponse.Todo);
                return Ok(new { summary = "Created todo", data = aiResponse.Todo });
            case "update_todo":
                if (!aiResponse.Id.HasValue)
                {
                    return BadRequest("Todo ID is required for updating.");
                }
                if (aiResponse.Todo == null)
                {
                    return NotFound($"Todo with ID {aiResponse.Id.Value} not found.");
                }
                return Ok(new { summary = "Updated todo", data = aiResponse.Todo });
            case "confirm_delete_todo":
                if (!aiResponse.Id.HasValue)
                {
                    return BadRequest("Todo ID is required for deleting.");
                }
                return Ok(new { summary = aiResponse.Message, data = new { id = aiResponse.Id }, action = "confirm_delete_todo" }); // Return the confirmation message
            case "delete_todo":
                if (!aiResponse.Id.HasValue)
                {
                    return BadRequest("Todo ID is required for deleting.");
                }
                await DeleteTodo(aiResponse.Id.Value);
                return Ok(new { summary = "Deleted todo", data = new { id = aiResponse.Id } });
            case "search_todos":
                var todos = await SearchTodosByKey(aiResponse.Title);
                return Ok(new { summary = $"Showing todos with the search key: {aiResponse.Title}", data = todos });
            case "count_todos_by_category":
                var count = await CountTodosByCategory(aiResponse.Category);
                return Ok(new { summary = $"Counted todos in category {aiResponse.Category}", data = new { category = aiResponse.Category, count } });
            case "clarification_needed":
                return Ok(new { summary = "Clarification needed", data = new { message = aiResponse.Message } });
            case "what_can_you_do":
                return Ok(new { summary = "Available actions", data = new { message = "I can help you manage your todo list. You can ask me to create, update, delete, show, and count your todos." } });
            case "non_todo_related":
                return Ok(new { summary = "Non-todo related", data = new { message = "I can only help with your todo list." } });
            case "error":
                return StatusCode(500, new { summary = "Error", data = new { message = aiResponse.Message } }); // Return 500 for internal server error
            default:
                return BadRequest("Invalid action.");
        }
    }

    private bool TodoExists(int id)
    {
        return _context.Todos.Any(e => e.Id == id);
    }

    private Task<int> CountTodosByCategory(string category)
    {
        return _context.Todos.CountAsync(e => e.Category == category);
    }

    private Task<List<Todo>> SearchTodosByKey(string searchKey)
    {
        return _context.Todos.Where(e => e.Title.Contains(searchKey, StringComparison.OrdinalIgnoreCase)
                                    || e.Description.Contains(searchKey, StringComparison.OrdinalIgnoreCase))
            .ToListAsync();
    }
}
