# Website telemetry implementation

The Azure SQL Database container site keeps its existing Application Insights provider and also
sends the shared Microsoft SQL Agent Skills telemetry contract to the vscode-mssql 1DS/Aria tenant.

The generated bundle at `assets/js/mssql-agent-skills-telemetry.js` comes from the internal ADO
AgentSkills repository. Do not edit it directly. Regenerate it with:

```bash
cd /path/to/AgentSkills
npm ci
npm run telemetry:bundle:browser -- \
  --out /path/to/azure-sql-database-container/docs/assets/js/mssql-agent-skills-telemetry.js
```

The initializer sets:

```text
sourceType = website
sourceId = azure-sql-database-container
```

Layouts provide `view=mainPage` for the homepage and stable page slugs for documentation pages.
The site emits the same names and property vocabulary as the Azure SQL Developer Hub:

```text
mssql-agent-skills/site/action
mssql-agent-skills/site/error
mssql-agent-skills/site/statistic
```

Current action values include `pageView`, `contentCopied`, `contentOpened`, `copyPrompt`,
`viewPrompt`, `runtimeSelected`, `pathSelected`, `mediaEngaged`, and `outboundClicked`.

Copy events fire only after the clipboard write succeeds. Copied prompts, commands, code,
connection strings, and clipboard contents are never sent.
