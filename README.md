# Azure SQL Database container

Run and build against Azure SQL Database, right on your local environment. Try it before you deploy, run your tests in CI, and ship with no code change. Free for development, with no Azure subscription and no credit card required.

[![Private Preview](https://img.shields.io/badge/Private%20Preview-green?logo=github)](https://microsoft.github.io/azure-sql-database-container/)
[![Report Bug](https://img.shields.io/badge/Report%20Bug-red?logo=github)](../../issues/new?template=bug_report.yml)
[![Request Feature](https://img.shields.io/badge/Request%20Feature-blue?logo=github)](../../issues/new?template=feature_request.yml)
[![Discussions](https://img.shields.io/badge/Discussions-blueviolet?logo=github)](../../discussions)

<a href="https://youtu.be/S6PWxUAUspY">
  <img src="docs/assets/img/azuresqldb-thumbnail.png" alt="Watch the Azure SQL Database container demo" width="760">
</a>

**▶ Watch the demo**

</div>

The Azure SQL Database container is the Azure SQL Database engine, running locally. It runs on any modern container runtime (Docker, Podman, containerd, Rancher Desktop, Apple Container) on macOS, Linux, and Windows, and works with the drivers, ORMs, and editors developers already use. It supports the same AI-native capabilities as Azure SQL Database in the Microsoft Azure cloud: the native vector type, DiskANN vector indexes, vector search with `VECTOR_DISTANCE`, and in-database embeddings.

For the first time, developers can build, test, and ship applications against the Azure SQL Database engine without an Azure subscription and without a shared cloud instance. When you deploy to Azure SQL Database in the Microsoft Azure cloud, it is a connection-string change, not a code change.

## Global Table of Contents

- [What is the Azure SQL Database container?](docs/what-is-the-container.md)
- [Goals of the Private Preview](docs/goals-of-the-private-preview.md)
- [Prerequisites