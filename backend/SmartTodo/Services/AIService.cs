using Azure;
using Azure.AI.OpenAI;
using SmartTodo;
using System.Text.Json.Nodes;
using System.Text.Json;
using SmartTodo.Services;
using Microsoft.EntityFrameworkCore;

public interface IAIService
{
    Task<string> CategorizeTodo(Todo todo);

    Task<AIResponse> ProcessUserInstruction(string userInput, List<string> chatHistory);
}

public class AIService : IAIService
{
    private readonly OpenAIClient _openAIClient;
    private readonly string _deploymentName;
    private readonly IConfiguration _configuration; 
    private readonly TodoDbContext _dbContext; 

    public AIService(IConfiguration configuration, TodoDbContext dbContext) // Modify constructor
    {
        string apiKey = configuration["AzureOpenAI:ApiKey"];
        string endpoint = configuration["AzureOpenAI:Endpoint"];
        _deploymentName = configuration["AzureOpenAI:DeploymentName"];
        _configuration = configuration; // Store
        _openAIClient = new OpenAIClient(new Uri(endpoint), new AzureKeyCredential(apiKey));
        _dbContext = dbContext; // Store the database context
    }

    public async Task<string> CategorizeTodo(Todo todo)
    {
        // (Existing code, but now takes a Todo object)
        string prompt = $"""
            Categorize the following todo item into one of the following categories:
            Work, Personal, Home, Finance, Health, Shopping, Social, Travel, Education, Others.

            Todo Title: {todo.Title}
            Todo Description: {todo.Description}

            Provide only the category name.  Do not include any other text.
            """;

        try
        {
            var response = await _openAIClient.GetChatCompletionsAsync(
                new ChatCompletionsOptions
                {
                    DeploymentName = _deploymentName,
                    Messages =
                    {
                        new ChatMessage(ChatRole.User, prompt)
                    }
                }
            );

            string category = response.Value.Choices[0].Message.Content;
            return category.Trim();
        }
        catch (RequestFailedException ex)
        {
            Console.WriteLine($"Error calling Azure OpenAI: {ex.Message}");
            return "Others";
        }
    }

    public async Task<AIResponse> ProcessUserInstruction(string userInput, List<string> chatHistory)
    {
        // Use the prompt from above
        string chatHistoryString = string.Join("\n", chatHistory);
        string prompt = @"
            You are a helpful assistant that understands user instructions related to a todo list.

            Here are the available actions:
            - create_todo: Create a new todo item.
            - update_todo: Update an existing todo item.
            - delete_todo: Delete an existing todo item.
            - show_todos: Show all todo items.
            - count_todos_by_category: Count the number of todo items in a specific category.

            When creating or updating a todo, rephrase the title to a maximum of 5 words and shorten the description to a maximum of 10 words, improving grammar.  If the user does not provide enough information to understand the todo, ask for more details. 
            When creating or updating a todo, User can just state the action, convert it to a todo.
            When creating or updating a todo, User can just provide a text which need not be case sensitive.
            
            For update_todo, if the user provides a title or partial title, you MUST use that information to find the corresponding todo ID.  Do not ask the user for the ID.  If you cannot find a matching todo, respond with a clarification_needed action.
            
            For delete_todo, if the user provides a title or partial title, you MUST use that information to find the corresponding todo ID.  Do not ask the user for the ID.  If you cannot find a matching todo, respond with a clarification_needed action.

            If the user asks ""what can you do"" or a similar question, respond with: ""I can help you manage your todo list. You can ask me to create, update, delete, show, and count your todos.""  Do not provide any other information.

            If the user asks a question that is not related to the todo list, respond with: ""I can only help with your todo list."" Do not provide any other information. 
            
            But let the user express some expressions like ""Ahh, I see"" or ""Thanks for your help"" or ""I appreciate your help"" or ""Ah"" or ""Sorry"".

            Here are some examples of user input and your corresponding JSON output:

            User Input: ""Add a task to buy milk and the description is to get 2% milk from the store""
            Your output: {""action"": ""create_todo"", ""title"": ""Buy milk"", ""description"": ""Get 2% milk""}

            User Input: ""Update the task with the title Clean room, set the description to clean my room""
            Your output: {""action"": ""update_todo"", ""title"": ""Clean room"", ""description"": ""Clean room""}

            User Input: ""Update the task which contains 'Clean', set the description to 'Clean room'""
            Your output: {""action"": ""update_todo"", ""title"": ""Clean room"", ""description"": ""Clean room""}

            User Input: ""Delete the todo with id 3""
            Your output: {""action"": ""delete_todo"", ""id"": 3, ""summary"": ""Deleted todo: Buy milk""}

            User Input: ""Show me all the todos""
            Your output: {""action"": ""show_todos""}

            User Input: ""How many todos are in Home""
            Your output: {""action"": ""count_todos_by_category"", ""category"": ""Home""}

            User Input: ""Add a new todo""
            Your output: {""action"": ""clarification_needed"", ""message"": ""Please provide a title and description for the todo.""}

            User Input: ""Change todo 1""
            Your output: {""action"": ""clarification_needed"", ""message"": ""Please provide a title and/or description for the update.""}

             User Input: ""Update the task with title Non existing task, set the description to New Description""
            Your output: {""action"" : ""clarification_needed"", ""message"": ""I cannot find a todo with title 'Non existing task'""}

            User Input: ""Remove task number 2""
            Your output: {""action"": ""delete_todo"", ""id"": 2, ""summary"": ""Deleted todo: Clean room""}

            User Input: ""What can you do?""
            Your output: {""action"": ""what_can_you_do""}

            User Input: ""Hi, how are you?""
            Your output: {""action"": ""non_todo_related""}

            Previous Chat History:" + chatHistoryString + @" 
            Current User Input: " + userInput + @" 
            Your output:
            ";

        try
        {
            var chatCompletionsOptions = new ChatCompletionsOptions
            {
                DeploymentName = _deploymentName,
                Messages =
                {
                    new ChatMessage(ChatRole.User, prompt)
                }
            };

            var response = await _openAIClient.GetChatCompletionsAsync(chatCompletionsOptions);

            string jsonResponse = response.Value.Choices[0].Message.Content.Trim();
            //Fixes the error The input was not valid JSON.
            if (!jsonResponse.StartsWith("{") || !jsonResponse.EndsWith("}"))
            {
                jsonResponse = "{ \"action\": \"non_todo_related\", \"message\": \"I can only help with your todo list.\" }";
            }
            JsonNode jsonNode = JsonNode.Parse(jsonResponse);


            AIResponse aiResponse = new AIResponse();

            if (jsonNode != null)
            {
                aiResponse.Action = jsonNode["action"].ToString();
                switch (aiResponse.Action)
                {
                    case "create_todo":
                        aiResponse.Title = jsonNode["title"]?.ToString();
                        aiResponse.Description = jsonNode["description"]?.ToString();
                        Todo newTodo = new Todo { Title = aiResponse.Title, Description = aiResponse.Description };
                        newTodo.Category = await CategorizeTodo(newTodo);
                        aiResponse.Category = newTodo.Category;
                        aiResponse.Todo = newTodo;
                        break;
                    case "update_todo":
                        aiResponse.Title = jsonNode["title"]?.ToString();
                        aiResponse.Description = jsonNode["description"]?.ToString();

                        // Try to find the Todo by title (or part of title)
                        string titleToSearch = aiResponse.Title;
                        Todo existingTodo = await _dbContext.Todos.FirstOrDefaultAsync(t => t.Title.Contains(titleToSearch, StringComparison.OrdinalIgnoreCase));

                        if (existingTodo != null)
                        {
                            aiResponse.Id = existingTodo.Id;
                            Todo updateTodo = new Todo { Id = existingTodo.Id, Title = aiResponse.Title, Description = aiResponse.Description };
                            updateTodo.Category = await CategorizeTodo(updateTodo);
                            aiResponse.Todo = updateTodo;
                        }
                        else
                        {
                            aiResponse.Action = "clarification_needed";
                            aiResponse.Message = $"I cannot find a todo with title containing '{titleToSearch}'";
                            return aiResponse;
                        }
                        break;
                    case "delete_todo":
                        aiResponse.Title = jsonNode["title"]?.ToString();
                        string titleToSearchAndDelete = aiResponse.Title;
                        Todo todoToBeDeleted = null!;
                        if (titleToSearchAndDelete != null)
                        {
                            todoToBeDeleted = await _dbContext.Todos.FirstOrDefaultAsync(t => t.Title.Contains(titleToSearchAndDelete));
                        }

                        if (todoToBeDeleted != null)
                        {
                            aiResponse.Id = todoToBeDeleted.Id;
                            Todo updateTodo = new Todo { Id = todoToBeDeleted.Id, Title = aiResponse.Title, Description = aiResponse.Description };
                            updateTodo.Category = await CategorizeTodo(updateTodo);
                            aiResponse.Todo = updateTodo;
                        }
                        else
                        {
                            aiResponse.Action = "clarification_needed";
                            aiResponse.Message = $"I cannot find a todo with title containing '{titleToSearchAndDelete}'";
                            return aiResponse;
                        }
                        break;
                    case "show_todos":
                        // Handled in controller
                        break;
                    case "count_todos_by_category":
                        aiResponse.Category = jsonNode["category"]?.ToString();
                        break;
                    case "clarification_needed":
                        aiResponse.Message = jsonNode["message"]?.ToString();
                        break;
                    case "what_can_you_do":
                        break;
                    case "non_todo_related":
                        break;
                    default:
                        aiResponse.Action = "invalid_action";
                        aiResponse.Message = "Sorry, I didn't understand that action.";
                        break;
                }
            }
            else
            {
                aiResponse.Action = "invalid_response";
                aiResponse.Message = "Sorry, I couldn't understand the response from the AI.";
            }

            return aiResponse;
        }
        catch (RequestFailedException ex)
        {
            Console.WriteLine($"Error calling Azure OpenAI: {ex.Message}");
            return new AIResponse
            {
                Action = "error",
                Message = "Sorry, there was an error communicating with the AI service."
            };
        }
        catch (JsonException ex)
        {
            Console.WriteLine($"Error parsing JSON: {ex.Message}, Response: ");
            return new AIResponse
            {
                Action = "error",
                Message = "Sorry, there was an error parsing the AI response."
            };
        }
    }
}