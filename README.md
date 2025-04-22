# Smart TODO

## Run backend instructions:
- Run `dotnet restore` to restore the project
- Run `dotnet build` to build the project
- Run `dotnet publish -o ./publish`

## Run frontend instructions:
- Run `npm i` to install all dependencies
- Run `ng serve` to build and run the project

## Tech Stack:
- .Net Core 8.*
- EF Core
- Angular
- SCSS
- Azure Open AI

## Summary:
The application is a simple to-do list manager enhanced with artificial intelligence capabilities through the integration of Azure Open AI. The project utilizes a .NET Core backend, an Angular frontend, and Entity Framework Core for data management. Key features include basic task management (creation, description, completion tracking) and AI-powered task categorization via natural language processing. Furthermore, a chatbot functionality allows users to interact with and manage their to-do items through natural language commands.

### Main Themes and Important Ideas/Facts:

1. #### Core Functionality: Enhanced To-Do List:

    The primary goal of the application is to provide a "simple TODO app with bare minimal features to capture the daily tasks along with some descriptions if applicable and track them if they are complete. This indicates a focus on fundamental task management: creating tasks, adding details, and marking them as done.

2. #### AI-Powered categorization:

    A key enhancement is the integration of Azure Open AI to provide intelligent task categorization.
    The application aims to "make use of AI service to determine the category based on natural language processing." This suggests that the AI will analyze the task description to automatically assign relevant categories, improving organization and potentially enabling future features based on these categories.

3. #### Chatbot Interaction:

    The application includes a "chatbot feature where the user can talk to and perform all the actions related to TODO via chat. This highlights a natural language interface for managing tasks, allowing users to "create, update, delete, get count of TODO items based on category or similar" through conversation. This offers a more intuitive and potentially faster way to interact with the to-do list.