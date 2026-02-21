const { AnthropicBedrock } = require("@anthropic-ai/bedrock-sdk");
const { Octokit } = require("@octokit/rest");

// ─── Setup ───────────────────────────────────────────────────────────────────
const anthropic = new AnthropicBedrock({
  awsAccessKey:    process.env.AWS_ACCESS_KEY_ID,
  awsSecretKey:    process.env.AWS_SECRET_ACCESS_KEY,
  awsSessionToken: process.env.AWS_SESSION_TOKEN,
  awsRegion:       process.env.AWS_REGION
});

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const [OWNER, REPO] = process.env.REPO.split("/");
const ISSUE_NUMBER  = parseInt(process.env.ISSUE_NUMBER);
const ISSUE_TITLE   = process.env.ISSUE_TITLE;
const ISSUE_BODY    = process.env.ISSUE_BODY;
const BRANCH        = `feature/issue-${ISSUE_NUMBER}`;
const MODEL         = "eu.anthropic.claude-sonnet-4-5-20250929-v1:0";

// ─── Tools ───────────────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: "get_file",
    description: "Read a file from the GitHub repo",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path e.g. src/app/todo.service.ts" }
      },
      required: ["path"]
    }
  },
  {
    name: "list_files",
    description: "List files in a directory of the repo",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directory path e.g. src/app" }
      },
      required: ["path"]
    }
  },
  {
    name: "create_branch",
    description: "Create a new feature branch from main",
    input_schema: {
      type: "object",
      properties: {
        branch: { type: "string", description: "Branch name e.g. feature/issue-42" }
      },
      required: ["branch"]
    }
  },
  {
    name: "commit_file",
    description: "Create or update a file on the feature branch",
    input_schema: {
      type: "object",
      properties: {
        path:    { type: "string", description: "File path" },
        content: { type: "string", description: "Full file content" },
        message: { type: "string", description: "Commit message" }
      },
      required: ["path", "content", "message"]
    }
  },
  {
    name: "create_pull_request",
    description: "Raise a PR from the feature branch to main",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "PR title" },
        body:  { type: "string", description: "PR description listing all changes" }
      },
      required: ["title", "body"]
    }
  },
  {
    name: "comment_on_issue",
    description: "Post a comment on the GitHub issue",
    input_schema: {
      type: "object",
      properties: {
        body: { type: "string", description: "Comment text" }
      },
      required: ["body"]
    }
  },
  {
    name: "search_code",
    description: "Search for a keyword in the repo before reading files",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term e.g. 'Todo model'" }
      },
      required: ["query"]
    }
  }
];

// ─── Tool Executor ────────────────────────────────────────────────────────────
async function executeTool(name, input) {
  console.log(`\n🔧 Tool: ${name}`, JSON.stringify(input, null, 2));

  if (name === "get_file") {
    const { data } = await octokit.repos.getContent({
      owner: OWNER, repo: REPO, path: input.path, ref: BRANCH
    }).catch(() =>
      octokit.repos.getContent({ owner: OWNER, repo: REPO, path: input.path })
    );
    return Buffer.from(data.content, "base64").toString("utf8");
  }

  if (name === "list_files") {
    const { data } = await octokit.repos.getContent({
      owner: OWNER, repo: REPO, path: input.path
    });
    return data.map(f => `${f.type === "dir" ? "📁" : "📄"} ${f.path}`).join("\n");
  }

  if (name === "create_branch") {
    const { data: ref } = await octokit.git.getRef({
      owner: OWNER, repo: REPO, ref: "heads/main"
    });
    await octokit.git.createRef({
      owner: OWNER, repo: REPO,
      ref: `refs/heads/${input.branch}`,
      sha: ref.object.sha
    });
    return `Branch ${input.branch} created successfully`;
  }

  if (name === "commit_file") {
    let sha;
    try {
      const { data } = await octokit.repos.getContent({
        owner: OWNER, repo: REPO, path: input.path, ref: BRANCH
      });
      sha = data.sha;
    } catch { /* new file */ }

    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER, repo: REPO,
      path: input.path,
      message: input.message,
      content: Buffer.from(input.content).toString("base64"),
      branch: BRANCH,
      ...(sha && { sha })
    });
    return `File ${input.path} committed to ${BRANCH}`;
  }

  if (name === "create_pull_request") {
    const { data: pr } = await octokit.pulls.create({
      owner: OWNER, repo: REPO,
      title: input.title,
      body: input.body,
      head: BRANCH,
      base: "main"
    });
    return `PR created: ${pr.html_url}`;
  }

  if (name === "comment_on_issue") {
    await octokit.issues.createComment({
      owner: OWNER, repo: REPO,
      issue_number: ISSUE_NUMBER,
      body: input.body
    });
    return "Comment posted on issue";
  }

  if (name === "search_code") {
    const { data } = await octokit.search.code({
      q: `${input.query}+repo:${OWNER}/${REPO}`
    });
    return data.items
      .slice(0, 5)
      .map(i => `${i.path}: ${i.name}`)
      .join("\n");
  }

  throw new Error(`Unknown tool: ${name}`);
}

// ─── Agentic Loop ─────────────────────────────────────────────────────────────
async function runAgent() {
  console.log(`\n🚀 AI Agent starting...`);
  console.log(`📋 Issue #${ISSUE_NUMBER}: ${ISSUE_TITLE}`);
  console.log(`🤖 Model: ${MODEL}`);
  console.log(`🌿 Target branch: ${BRANCH}\n`);

  const messages = [
    {
      role: "user",
      content: `
You are an AI coding agent working on the GitHub repo ${OWNER}/${REPO}.
This is a Smart Todo app built with .NET Core backend, Azure OpenAI, and Angular frontend.
- FIRST — read the CLAUDE.md file in the repo root. 
- It contains the exact repo structure and conventions.
- Use it to navigate directly to relevant files.
- Do NOT explore or list directories unless CLAUDE.md doesn't cover what you need.
- Never guess file paths

A new GitHub issue has been raised:

Issue #${ISSUE_NUMBER}: ${ISSUE_TITLE}
${ISSUE_BODY}

Your job:
1. Explore the repo structure to understand the codebase
2. Implement the feature described in the issue
3. Create branch: ${BRANCH}
4. Commit all changed files to that branch
5. Raise a PR titled: "${ISSUE_TITLE}" linking to issue #${ISSUE_NUMBER}
6. Comment on issue #${ISSUE_NUMBER} with the PR link

Rules:
- Read CLAUDE.md first — always
- Only read files directly needed for this issue
- Never read config files, lock files, or build output
- Create branch BEFORE committing any files
- Update both backend AND frontend when model changes
`.trim()
    }
  ];

  while (true) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8096,
      tools: TOOLS,
      messages
    });

    console.log(`\n🧠 Claude: stop_reason = ${response.stop_reason}`);
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      console.log("\n✅ Agent completed successfully!");
      break;
    }

    const toolResults = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        try {
          const result = await executeTool(block.name, block.input);
          console.log(`✅ Result: ${result}`);
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
        } catch (err) {
          console.error(`❌ Tool error: ${err.message}`);
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: `Error: ${err.message}`, is_error: true });
        }
      }
    }

    if (toolResults.length > 0) {
      messages.push({ role: "user", content: toolResults });
    }
  }
}

runAgent().catch(err => {
  console.error("💥 Agent failed:", err);
  process.exit(1);
});
