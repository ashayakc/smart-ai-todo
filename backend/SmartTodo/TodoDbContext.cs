namespace SmartTodo
{
    using Microsoft.EntityFrameworkCore;

    public class TodoDbContext : DbContext
    {
        public TodoDbContext(DbContextOptions<TodoDbContext> options) : base(options)
        {
        }

        public DbSet<Todo> Todos { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Seed data will go here later
            base.OnModelCreating(modelBuilder);
        }
    }
}
