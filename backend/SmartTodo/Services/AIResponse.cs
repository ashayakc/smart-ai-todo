namespace SmartTodo.Services
{
    public class AIResponse
    {
        public string Action { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string Category { get; set; }
        public int? Id { get; set; }
        public string Message { get; set; }
        public int? Count { get; set; } // For count_todos_by_category
        public List<Todo> Todos { get; set; }
        public Todo Todo { get; set; }
    }
}
