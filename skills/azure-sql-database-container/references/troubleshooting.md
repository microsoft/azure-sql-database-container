# Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Container exits right after start; logs say `requires at least 2000 megabytes of memory` | Engine has less than 2 GB | Give it more memory. On Apple Containers add `--memory 4g` (it defaults to 1 GB). On Docker Desktop raise the VM memory. |
| Container exits immediately; no memory error | `MSSQL_SA_PASSWORD` fails the complexity policy | Use 8+ characters mixing upper, lower, digit, and a symbol, then recreate the container. |
| Container will not start; nothing about password or memory | `ACCEPT_EULA` not set | Add `-e "ACCEPT_EULA=Y"` (or `ACCEPT_EULA: "Y"` in compose). It is required. |
| `docker pull` / `container image pull` fails with auth error | Not signed in to the private registry | `docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io -u <username>` (or `container registry login ...`) with the welcome-email credentials. |
| Connection refused on `localhost:1433` | Port already in use, or the container is still starting | Wait for "SQL Server is now ready for client connections" in `docker logs sqldb`; or remap the host port (`-p 1436:1433`) and connect to `localhost,1436`. |
| TLS / certificate validation error from a driver | Driver does not trust the self-signed certificate | Set `TrustServerCertificate=true` (or `yes`), or `-C` for sqlcmd. |
| `USE <db>` returns `Msg 40508` | Azure SQL Database does not allow `USE` to switch databases | Select the database in the connection string (`Database=appdb`) and open a new connection; see `connection-model.md`. |
| Image will not pull or run on Apple Silicon / arm64 (`no matching manifest`) | The image is x64 only; there is no native arm64 image | Run under emulation: `docker run --platform linux/amd64 ...`, or `container run --arch amd64 --rosetta ...` on Apple Containers. Enable Rosetta in Docker Desktop for speed. |
| Running on Windows on ARM | Not supported in the preview | Use an x64 Windows host, or macOS / Linux on arm64 under emulation. |
| A statement succeeds locally but fails in Azure SQL Database | Some PaaS restrictions are not yet enforced locally | Validate against an Azure SQL Database instance before declaring readiness; the engine surface is the same but restriction enforcement is still landing. |

## Quick health check

```bash
docker logs sqldb | tail -20                      # docker / podman
container logs sqldb | tail -20                    # Apple Containers
sqlcmd -S localhost,1433 -U sa -P "<pw>" -C -Q "SELECT 1"   # connectivity
```

If a question is not answered here or in the other references, file an issue: https://github.com/microsoft/azure-sql-database-container/issues/new?template=bug_report.yml
