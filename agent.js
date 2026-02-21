const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Octokit } = require("@octokit/rest");

// ─── Setup ───────────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const [OWNER, REPO] = process.env.REPO.split("/");
const ISSUE_NUMBER  = parseInt(process.env.ISSUE_NUMBER);
const ISSUE_TITLE   = process.env.ISSUE_TITLE;
const ISSUE_BODY    = process.env.ISSUE_BODY;
const BRANCH        = `feature/issue-${ISSUE_NUMBER}`;
const MODEL         = "gemini-2.0-flash";

// ─── Tool Definitions (Gemini format) ────────────────────────────────────────
const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "get_file",
        description: "Read a file from the GitHub repo",
        parameters: {
          type: "OBJECT",
          properties: {
            path: { type: "STRING", description: "File path e.g. src/app/todo.service.ts" }
          },
          required: ["path"]
        }
      },
      {
        name: "list_files",
        description: "List files in a directory of the repo",
        parameters: {
          type: "OBJECT",
          properties: {
            path: { type: "STRING", description: "Directory path e.g. src/app" }
          },
          required: ["path"]
        }
      },
      {
        name: "create_branch",
        description: "Create a new feature branch from main",
        parameters: {
          type: "OBJECT",
          properties: {
            branch: { type: "STRING", description: "Branch name e.g. feature/issue-42" }
          },
          required: ["branch"]
        }
      },
      {
        name: "commit_file",
        description: "Create or update a file on the feature branch",
        parameters: {
          type: "OBJECT",
          properties: {
            path:    { type: "STRING", description: "File path" },
            content: { type: "STRING", description: "Full file content" },
            message: { type: "STRING", description: "Commit message" }
          },
          required: ["path", "content", "message"]
        }
      },
      {
        name: "create_pull_request",
        description: "Raise a PR from the feature branch to main",
        parameters: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING", description: "PR title" },
            body:  { type: "STRING", description: "PR description listing all changes" }
          },
          required: ["title", "body"]
        }
      },
      {
        name: "comment_on_issue",
        description: "Post a comment on the GitHub issue",
        parameters: {
          type: "OBJECT",
          properties: {
            body: { type: "STRING", description: "Comment text" }
          },
          required: ["body"]
        }
      }
    ]
  }
];

// ─── Tool Executor (Octokit calls) ────────────────────────────────────────────
async function executeTool(name, args) {
  console.log(`\n🔧 Tool: ${name}`, JSON.stringify(args, null, 2));

  if (name === "get_file") {
    const { data } = await octokit.repos.getContent({
      owner: OWNER, repo: REPO, path: args.path, ref: BRANCH
    }).catch(() =>
      octokit.repos.getContent({ owner: OWNER, repo: REPO, path: args.path })
    );
    return Buffer.from(data.content, "base64").toString("utf8");
  }

  if (name === "list_files") {
    const { data } = await octokit.repos.getContent({
      owner: OWNER, repo: REPO, path: args.path
    });
    return data.map(f => `${f.type === "dir" ? "📁" : "📄"} ${f.path}`).join("\n");
  }

  if (name === "create_branch") {
    const { data: ref } = await octokit.git.getRef({
      owner: OWNER, repo: REPO, ref: "heads/main"
    });
    await octokit.git.createRef({
      owner: OWNER, repo: REPO,
      ref: `refs/heads/${args.branch}`,
      sha: ref.object.sha
    });
    return `Branch ${args.branch} created successfully`;
  }

  if (name === "commit_file") {
    let sha;
    try {
      const { data } = await octokit.repos.getContent({
        owner: OWNER, repo: REPO, path: args.path, ref: BRANCH
      });
      sha = data.sha;
    } catch { /* new file */ }

    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER, repo: REPO,
      path: args.path,
      message: args.message,
      content: Buffer.from(args.content).toString("base64"),
      branch: BRANCH,
      ...(sha && { sha })
    });
    return `File ${args.path} committed to ${BRANCH}`;
  }

  if (name === "create_pull_request") {
    const { data: pr } = await octokit.pulls.create({
      owner: OWNER, repo: REPO,
      title: args.title,
      body: args.body,
      head: BRANCH,
      base: "main"
    });
    return `PR created: ${pr.html_url}`;
  }

  if (name === "comment_on_issue") {
    await octokit.issues.createComment({
      owner: OWNER, repo: REPO,
      issue_number: ISSUE_NUMBER,
      body: args.body
    });
    return "Comment posted on issue";
  }

  throw new Error(`Unknown tool: ${name}`);
}

// ─── Agentic Loop ─────────────────────────────────────────────────────────────
async function runAgent() {
  console.log(`\n🚀 AI Agent starting...`);
  console.log(`📋 Issue #${ISSUE_NUMBER}: ${ISSUE_TITLE}`);
  console.log(`🤖 Model: ${MODEL}`);
  console.log(`🌿 Target branch: ${BRANCH}\n`);

  const model = genAI.getGenerativeModel({
    model: MODEL,
    tools: TOOLS,
    systemInstruction: `
You are an AI coding agent working on the GitHub repo ${OWNER}/${REPO}.
This is a Smart Todo app built with .NET Core backend, Azure OpenAI, and Angular frontend.

Your job when given an issue:
1. Explore the repo structure to understand the codebase
2. Implement the feature described in the issue
3. Create the feature branch before committing any files
4. Commit all changed files to that branch
5. Raise a PR linking to the issue
6. Comment on the issue with the PR link

Rules:
- Use tools only — no local file system
- Always create the branch before committing files
- Read files before editing them so you understand existing patterns
- Make all changes consistent across .NET backend and Angular frontend
    `.trim()
  });

  const chat = model.startChat();

  const initialMessage = `
A new GitHub issue has been raised:

Issue #${ISSUE_NUMBER}: ${ISSUE_TITLE}
${ISSUE_BODY}

Branch to use: ${BRANCH}

Please implement this feature now.
  `.trim();

  let response = await chat.sendMessage(initialMessage);

  // Agentic loop — keep processing tool calls until Gemini stops
  while (true) {
    const candidate = response.response.candidates[0];
    const parts = candidate.content.parts;

    // Collect all function calls in this response
    const functionCalls = parts.filter(p => p.functionCall);

    if (functionCalls.length === 0) {
      // No more tool calls — Gemini is done
      const textParts = parts.filter(p => p.text).map(p => p.text).join("\n");
      console.log("\n🧠 Gemini final response:", textParts);
      console.log("\n✅ Agent completed successfully!");
      break;
    }

    // Execute all tool calls and collect results
    const toolResults = [];
    for (const part of functionCalls) {
      const { name, args } = part.functionCall;
      try {
        const result = await executeTool(name, args);
        console.log(`✅ Result: ${result}`);
        toolResults.push({
          functionResponse: {
            name,
            response: { result }
          }
        });
      } catch (err) {
        console.error(`❌ Tool error: ${err.message}`);
        toolResults.push({
          functionResponse: {
            name,
            response: { error: err.message }
          }
        });
      }
    }

    // Send tool results back to Gemini
    response = await chat.sendMessage(toolResults);
  }
}

// ─── Run ──────────────────────────────────────────────────────────────────────
runAgent().catch(err => {
  console.error("💥 Agent failed:", err);
  process.exit(1);
});
