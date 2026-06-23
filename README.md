<div align="center">

# Azure SQL Database container

### The Azure SQL Database engine, running locally.

Build and test against the same engine you run in the Microsoft Azure cloud. Try Azure SQL Database before you deploy, and run your tests in CI. Free for local development. No Azure subscription.

[![Status: Private Preview]
[![Docs](https://img.shields.io/badge/docs-read-0A1830?style=for-the-badge)](https://microsoft.github.io/azure-sql-database-container/)
[![Discussions](https://img.shields.io/badge/discussions-join-18C7C7?style=for-the-badge)](../../discussions)
[![Report a bug](https://img.shields.io/badge/report-a%20bug-D6334B?style=for-the-badge)](../../issues/new?template=bug_report.yml)

<a href="placeholder">
  <img src=placeholder>
</a>

**▶ Watch the demo**

</div>

The Azure SQL Database container is the Azure SQL Database engine, running locally. It runs on any modern container runtime (Docker, Podman, containerd, Rancher Desktop, Apple Container) on macOS, Linux, and Windows, and works with the drivers, ORMs, and editors developers already use. It supports the same AI-native capabilities as Azure SQL Database in the Microsoft Azure cloud: the native vector type, DiskANN vector indexes, vector search with `VECTOR_DISTANCE`, and in-database embeddings.

For the first time, developers can build, test, and ship applications against the Azure SQL Database engine without an Azure subscription and without a shared cloud instance. When you deploy to Azure SQL Database in the Microsoft Azure cloud, it is a connection-string change, not a code change.

## Global Table of Contents

- [What is the Azure SQL Database container?](docs/what-is-the-container.md)
- [Goals of the Private Preview](docs/goals-of-the-private-preview.md)
- [Prerequisites](docs/prerequisites.md)
- [Getting Started](docs/getting-started.md)
- [Known limitations](docs/known-limitations.md)
- [Feedback and how to engage](docs/feedback-and-how-to-engage.md)

## Samples

- [Node.js + Prisma](samples/nodejs-prisma/)
- [Python + SQLAlchemy](samples/python-sqlalchemy/)
- [AI / RAG with vector search](samples/ai-rag/)
- [.NET Aspire](samples/dotnet-aspire/)
- [CLI quickstart](samples/cli/)
- [Container-specialized agent skills (tool-agnostic)](samples/agent-skills/)
- [Azure skills collection for local-to-cloud deployment](samples/azure-skills/)

> **NOTE:** This Private Preview is designed for developers building modern applications, with a focus on the following key personas:
>
> - **Modern Application Developers:** Building feature-rich, scalable applications with frameworks like Next.js, NestJS, FastAPI, .NET Aspire, and Node.js.
> - **AI / Cloud-Native Developers:** Building RAG, agents, and AI features against a local database that supports vector data types, vector search, and embeddings out of the box.
> - **Platform Engineers:** Wiring SQL Database into Dev Containers, docker compose stacks, and CI / CD pipelines without provisioning a cloud instance.
> - **Database Developers:** Working in T-SQL against the same engine surface that runs in Azure SQL Database in the cloud, with no behavior surprises at deployment time.

## Local to cloud

The container speaks the same protocol as Azure SQL Database in the Microsoft Azure cloud: the same drivers, the same T-SQL, the same migrations. Every sample in this repository includes a **local-to-cloud leg** that uses the [Azure skills collection](samples/azure-skills/) to deploy the same application to Azure SQL Database in the Microsoft Azure cloud. There is no code change between local development and the cloud.

## Feedback

- File a bug: [GitHub Issues](../../issues/new?template=bug_report.yml)
- Request a feature: [GitHub Issues](../../issues/new?template=feature_request.yml)
- Ask a question, share a build, suggest an idea: [GitHub Discussions](../../discussions)
- Connect with the team: [book a session](https://aka.ms/azuresql-container-meet) or email [azuresqldb-container@microsoft.com](mailto:azuresqldb-container@microsoft.com)
- Real-time conversation: the private Teams channel shared with you in the welcome email

See [Feedback and how to engage](docs/feedback-and-how-to-engage.md) for the full guide on which channel fits which question.

## License

This Private Preview is governed by a separate Private Preview license shared with you during sign-up. The samples in this repository are released under the MIT license.

## Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
