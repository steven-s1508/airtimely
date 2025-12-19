## Brief overview

- Guidelines for codebase exploration and context gathering in the Airtimely project workspace.

## Communication style

- Always refer to the current workspace as the primary context when asked to analyze or review the codebase.
- Be concise and direct when describing which directories or files are being examined.

## Development workflow

- When a feature request is focused on the app, prioritize reviewing the root directory, `/app`, and `/src`.
- For any codebase analysis, begin with the current workspace and expand only if necessary.
- When working on features that would benefit from database or data aggregation context, also check the `/supabase` and `/windmill` directories.
- Always check the knowledge graph memory for relevant context or technical details before asking the user for clarification.

## Coding best practices

- Align code exploration and implementation with the structure and conventions found in the root, `/app`, and `/src` directories.
- Use memory-backed insights to inform decisions and avoid redundant questions.

## Project context

- Treat the current workspace as the authoritative source for code and project structure.
- Use the knowledge graph memory as the primary reference for domain concepts and architectural context.

## Other guidelines

- Do not analyze directories or files outside the current workspace unless explicitly instructed.
- If memory lookup is inconclusive, clearly state what was searched before requesting user input.
