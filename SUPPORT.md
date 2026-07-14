# Support

## How to get help

Azure SQL Developer is in **Private Preview**. It is supported through this repository and the preview channels below, not through standard Azure support.

### Something is broken

- **The container:** it will not start, a query fails, or the engine behaves differently from Azure SQL Database in the cloud. → [File a bug](https://aka.ms/azuresql-developer-bug).
- **An agent skill:** a skill told your agent the wrong thing, or no skill loaded when one should have. → [Report it here](https://aka.ms/sql-agent-skills-feedback).

Please check [Known limitations](https://microsoft.github.io/azure-sql-database-container/known-limitations.html) first. The behavior may be a documented gap rather than a bug, and the page lists the workaround where one exists.

### Something is missing

[Request a feature](https://aka.ms/azuresql-developer-feature-request). Filing it does two things: it gets tracked, and it lets us count how many people need the same scenario. That number is a real input into what we prioritize for Public Preview.

### You have a question

- **[Documentation](https://microsoft.github.io/azure-sql-database-container/)**, including [Getting started](https://microsoft.github.io/azure-sql-database-container/getting-started.html) and its [troubleshooting section](https://microsoft.github.io/azure-sql-database-container/getting-started.html#troubleshooting).
- **[GitHub Discussions](https://github.com/microsoft/azure-sql-database-container/discussions)** for open-ended questions, ideas, and showing what you built.
- **Weekly office hours** for live questions and demos. The invite is shared through the Private Preview channel.

### Fastest path: ask your agent

Install the [agent skills](https://github.com/microsoft/azure-sql-database-container/tree/main/skills) and ask in plain English. They know the registry, the image, the connection model, and the common failures, and they can read your container logs:

```bash
npx skills add microsoft/azure-sql-database-container
```

## Support policy

Support for this project is limited to the resources listed above. Azure SQL Developer is for **local development** (development, testing, CI, and demos). It is not a production database and is not covered by an Azure SLA. For production, deploy to [Azure SQL Database](https://learn.microsoft.com/azure/azure-sql/database/) in the Microsoft Azure cloud, which has full Azure support.
