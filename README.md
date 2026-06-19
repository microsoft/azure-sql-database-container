<div align="center">

# Azure SQL Database container

### Build apps and AI features faster with Azure SQL Database container

Try Azure SQL Database in minutes with no Azure subscription and no credit card required. Azure SQL Database Container provides a local development environment that mirrors Azure SQL Database behavior, helping you build faster, validate your application locally, and deploy to the cloud with confidence.
Whether you're building web applications, APIs, integration services, or AI-powered experiences, start building in minutes using the Azure SQL Database Container.

✅ No Azure subscription required
✅ Works offline
✅ Runs on Docker and Podman
✅ Supports AMD64 and ARM64
✅ Build locally, deploy to Azure SQL Database later



[![Status: Private Preview](https://img.shields.io/badge/status-private%20preview-1366E0?style=for-the-badge)](https://microsoft.github.io/azure-sql-database-container/)
[![Docs](https://img.shields.io/badge/docs-read-0A1830?style=for-the-badge)](https://microsoft.github.io/azure-sql-database-container/)
[![Discussions](https://img.shields.io/badge/discussions-join-18C7C7?style=for-the-badge)](../../discussions)
[![Report a bug](https://img.shields.io/badge/report-a%20bug-D6334B?style=for-the-badge)](../../issues/new?template=bug_report.yml)

<a href="https://youtu.be/S6PWxUAUspY">
  <img src="https://img.youtube.com/vi/S6PWxUAUspY/maxresdefault.jpg" alt="Watch the Azure SQL Database container demo" width="760">
</a>

**▶ Watch the demo**

</div>

## Build apps and AI experiences faster

Ship features without waiting on cloud setup. Azure SQL Database container gives app developers a local environment aligned with Azure SQL Database behavior, so you can build, test, and iterate locally, then move to Azure SQL Database with confidence.

Whether you are building web apps, APIs, background workers, integration services, or AI and RAG experiences, you can get started in minutes.

✅ No Azure subscription required  
✅ No credit card required  
✅ Works offline after image pull  
✅ Runs on Docker and Podman  
✅ Supports AMD64 and ARM64  
✅ Build locally, deploy to Azure SQL Database later

## Start here

- Request Private Preview access: [Sign up](docs/sign-up.md)
- Get running quickly: [Getting Started](docs/getting-started.md)
- Ask questions: [GitHub Discussions](../../discussions)
- Report bugs: [Bug report](../../issues/new?template=bug_report.yml)
- Request features: [Feature request](../../issues/new?template=feature_request.yml)
- Contact the team: [Support options](docs/support.md)

## Private Preview in 5 steps

### 1) Request access

Start here: [docs/sign-up.md](docs/sign-up.md)

### 2) Receive approval details

If approved, you will receive:
- Current preview onboarding guidance
- Access instructions
- Known limitations and feedback channels

### 3) Pull and run the container

```bash
docker pull mcr.microsoft.com/azure-sql-database

docker run \
  -e MSSQL_SA_PASSWORD=<your-password> \
  -p 1433:1433 \
  mcr.microsoft.com/azure-sql-database
```

### 4) Connect using your preferred tools

- Visual Studio Code
- Visual Studio
- sqlcmd
- SQL Server Management Studio (SSMS)
- Docker Compose
- SQL Server compatible drivers and ORMs

### 5) Verify Azure SQL Database identity

```sql
SELECT @@VERSION;
SELECT SERVERPROPERTY('EngineEdition');
```

Expected result:

```text
EngineEdition = 5
```

## Why app developers use this

- Develop locally without provisioning cloud resources
- Validate schema changes and migrations before deployment
- Run integration tests in CI/CD against a real Azure SQL Database engine surface
- Build AI and RAG workflows with vector capabilities
- Keep local and cloud behavior aligned to reduce deployment surprises

## Common scenarios

### Build application features locally

Use your existing stack and tools:
- .NET / ASP.NET
- Node.js
- Python
- Java
- Go
- Rust

### Run automated tests in CI/CD

Use the container in:
- GitHub Actions
- Azure Pipelines
- Docker Compose
- Testcontainers

### Build AI and RAG features

Prototype and test AI application patterns with:
- Vector data type
- Vector search and indexes
- JSON support
- External REST endpoints

## Local to cloud workflow

Use one development path:
1. Build and test locally
2. Validate behavior and migrations
3. Run integration tests
4. Deploy app and database artifacts
5. Switch environment configuration and connect to Azure SQL Database in production

## Samples

- [Node.js + Prisma](samples/nodejs-prisma/)
- [Python + SQLAlchemy](samples/python-sqlalchemy/)
- [AI / RAG with vector search](samples/ai-rag/)
- [.NET Aspire](samples/dotnet-aspire/)
- [CLI quickstart](samples/cli/)
- [Container-specialized agent skills (tool-agnostic)](samples/agent-skills/)
- [Azure skills collection for local-to-cloud deployment](samples/azure-skills/)

## Documentation

- [What is the Azure SQL Database container?](docs/what-is-the-container.md)
- [Goals of the Private Preview](docs/goals-of-the-private-preview.md)
- [Prerequisites](docs/prerequisites.md)
- [Getting Started](docs/getting-started.md)
- [Known limitations](docs/known-limitations.md)
- [Sign up for Private Preview](docs/sign-up.md)
- [Support options](docs/support.md)
- [FAQ](docs/faq.md)
- [Feedback and how to engage](docs/feedback-and-how-to-engage.md)

## Feedback and support

- File a bug: [GitHub Issues](../../issues/new?template=bug_report.yml)
- Request a feature: [GitHub Issues](../../issues/new?template=feature_request.yml)
- Ask a question or share an idea: [GitHub Discussions](../../discussions)
- Connect with the team: [book a session](https://aka.ms/azuresql-container-meet) or email [azuresqldb-container@microsoft.com](mailto:azuresqldb-container@microsoft.com)

## FAQ

### Is this SQL Server?

No. This container is designed for Azure SQL Database aligned development and testing scenarios.

### Do I need an Azure subscription?

No. You can develop and test locally without an Azure subscription.

### Does it work offline?

Yes. After you pull the image, local development and testing can run offline.

### Can I use it in CI/CD?

Yes. It is designed to support automated testing workflows in CI/CD pipelines.

### Can I use it in production?

No. This Private Preview is for local development, testing, and CI/CD scenarios. Use Azure SQL Database in Azure for production.

## License

This Private Preview is governed by a separate Private Preview license shared during sign-up. Samples in this repository are released under the MIT license.

## Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us the rights to use your contribution.

For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide a CLA and decorate the PR appropriately. Simply follow the instructions provided by the bot. You only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information, see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft trademarks or logos is subject to and must follow [Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos is subject to those third-party policies.
