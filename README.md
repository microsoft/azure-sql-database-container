# Azure SQL Developer

Run and build against Azure SQL Database, right on your local environment. Try it before you deploy, run your tests in CI, and ship with no code change. Free for development, with no Azure subscription and no credit card required.

[![Sign Up](https://img.shields.io/badge/Sign%20Up-brightgreen?logo=github)](https://aka.ms/sqldbcontainerpreview-signup)
[![Documentation](https://img.shields.io/badge/Documentation-blue?logo=github)](https://aka.ms/azuresql-developer)
[![Report Bug](https://img.shields.io/badge/Report%20Bug-red?logo=github)](https://aka.ms/azuresql-developer-bug)
[![Request Feature](https://img.shields.io/badge/Request%20Feature-blue?logo=github)](https://aka.ms/azuresql-developer-feature-request)
[![Discussions](https://img.shields.io/badge/Discussions-blueviolet?logo=github)](../../discussions)

<a href="https://aka.ms/azuresql-developer-demo">
  <img src="docs/assets/img/Azure SQL Developer cover page.png" alt="Watch the Azure SQL Developer demo" width="760">
</a>

<a href="https://aka.ms/azuresql-developer-demo">**▶ Watch the demo**</a>

Azure SQL Developer is the Azure SQL Database engine, running locally in a container. It runs on any modern container runtime (Docker, Podman, containerd, Rancher Desktop) on macOS, Linux, and Windows, and works with the drivers, ORMs, and editors developers already use. It supports the same AI-native capabilities as Azure SQL Database in the Microsoft Azure cloud: the native vector type, vector search with `VECTOR_DISTANCE`, and in-database embeddings (DiskANN vector indexes are in development).

For the first time, developers can build, test, and ship applications against the Azure SQL Database engine without an Azure subscription and without a shared cloud instance. When you deploy to Azure SQL Database in the Microsoft Azure cloud, it is a connection-string change, not a code change.

> [!IMPORTANT]
> The container image is in a private registry. **[Sign up for the Private Preview](https://aka.ms/sqldbcontainerpreview-signup)** to get the registry username and password you need to pull it. Signing up is the only way to get access.

## Global Table of Contents

- [What is Azure SQL Developer?](docs/what-is-the-container.md)
- [Goals of the Private Preview](docs/goals-of-the-private-preview.md)
- [Prerequisites](docs/prerequisites.md)
- [Getting Started](docs/getting-started.md)
- [Known limitations](docs/known-limitations.md)
- [Feedback and how to engage](docs/feedback-and-how-to-engage.md)

## Feedback

- File a bug: [GitHub Issues](https://aka.ms/azuresql-developer-bug)
- Request a feature: [GitHub Issues](https://aka.ms/azuresql-developer-feature-request)
- Ask a question, share a build, suggest an idea: [GitHub Discussions](../../discussions)
- Connect with the team: [book a session](https://aka.ms/azuresql-developer-meet) or email [azuresqldb-container@microsoft.com](mailto:azuresqldb-container@microsoft.com)
- Real-time conversation: the private Teams channel shared via the early-access feedback channel

See [Feedback and how to engage](docs/feedback-and-how-to-engage.md) for the full guide on which channel fits which question.

## License

This Private Preview is governed by a separate Private Preview license shared with you during sign-up. The samples in this repository are released under the MIT license.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
