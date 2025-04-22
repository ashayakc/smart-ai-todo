using Microsoft.EntityFrameworkCore;
using SmartTodo;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    // You can also create a more open policy for development if needed
    options.AddPolicy("AllowAnyOrigin",
        policy =>
        {
            policy.AllowAnyOrigin()
                   .AllowAnyHeader()
                   .AllowAnyMethod();
        });
});
builder.Services.AddDbContext<TodoDbContext>(options =>
    options.UseInMemoryDatabase("TodoList"));
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddScoped<IAIService, AIService>();

var app = builder.Build();

// Create a scope to access the service provider
using (var scope = app.Services.CreateScope())
{
    // Get the TodoDbContext instance
    var dbContext = scope.ServiceProvider.GetRequiredService<TodoDbContext>();

    // Ensure the database is created
    dbContext.Database.EnsureCreated();

    // Check if there are already any todos
    if (!dbContext.Todos.Any())
    {
        // Add 20 sample Todo items
        dbContext.Todos.AddRange(
            new Todo { Title = "Grocery Shopping", Description = "Buy milk, eggs, and bread", Completed = false, Category = "Home" },
            new Todo { Title = "Pay Bills", Description = "Pay rent and utilities", Completed = false, Category = "Finance" },
            new Todo { Title = "Schedule Doctor Appointment", Description = "Book a checkup for next week", Completed = false },
            new Todo { Title = "Write Blog Post", Description = "Draft the article for Friday", Completed = false, Category = "Work" },
            new Todo { Title = "Clean the House", Description = "Vacuum and mop the floors", Completed = false, Category = "Home" }
            );

        // Save the changes to the database
        dbContext.SaveChanges();
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseCors("AllowAnyOrigin");

app.UseAuthorization();

app.MapControllers();

app.Run();
