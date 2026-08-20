# Microsoft Entra ID authentication

Microsoft Entra ID authentication works on the Azure SQL Database container. Configure it
with the `MSSQL_AAD_*` environment variables and a mounted certificate. SQL
authentication (`sa`) remains the simple default for local development; use
Entra when you want closer parity with Azure SQL Database in the cloud.

For app registration, certificate creation, and Kubernetes deployments, follow
the Learn tutorial:
[Configure Microsoft Entra ID authentication for SQL Server on containers](https://learn.microsoft.com/sql/linux/security/authentication/container-kubernetes-microsoft-entra-deployment).

## Prerequisites

1. A Microsoft Entra application registration with a certificate uploaded.
2. A `.pfx` certificate file for the container (export password must be empty;
   a password-protected `.pfx` prevents the engine from starting). Protect the
   certificate with restrictive file permissions on the host (for example
   readable only by the account that mounts it).
3. Network reachability from the container to Microsoft Entra ID endpoints.

## Required environment variables

| Variable | Notes |
| --- | --- |
| `MSSQL_AAD_CLIENT_ID` | Application (client) ID of the registered Entra app. |
| `MSSQL_AAD_PRIMARY_TENANT` | Directory (tenant) ID. |
| `MSSQL_AAD_CERTIFICATE_FILE_PATH` | Path to the `.pfx` **inside** the container (for example `/var/opt/mssql/mssql-entra-id.pfx`). |

Mount the host `.pfx` read-only at that path.

## Optional: bootstrap an Entra server admin at start

Set all three to create an Entra login and grant it server admin when the
container starts. You then do not need a post-init `CREATE LOGIN` or
`sp_addsrvrolemember`.

| Variable | Notes |
| --- | --- |
| `MSSQL_AAD_SERVER_ADMIN_NAME` | Entra user UPN or group name (for example `user@contoso.com`). |
| `MSSQL_AAD_SERVER_ADMIN_TYPE` | `0` for an Entra user, `1` for an Entra group. |
| `MSSQL_AAD_SERVER_ADMIN_SID` | Object ID of that user or group (GUID). |

## Example: enable Entra on start

Replace the placeholders and the host path to your `.pfx`:

```bash
docker run -d --name sqldb \
  -e "ACCEPT_EULA=Y" \
  -e "MSSQL_SA_PASSWORD=YourStr0ng_Passw0rd" \
  -e "MSSQL_AAD_CLIENT_ID=<client-id>" \
  -e "MSSQL_AAD_PRIMARY_TENANT=<tenant-id>" \
  -e "MSSQL_AAD_CERTIFICATE_FILE_PATH=/var/opt/mssql/mssql-entra-id.pfx" \
  -v /path/to/mssql-entra-id.pfx:/var/opt/mssql/mssql-entra-id.pfx:ro \
  -p "1433:1433" \
  sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest
```

With optional admin bootstrap, add:

```bash
  -e "MSSQL_AAD_SERVER_ADMIN_NAME=user@contoso.com" \
  -e "MSSQL_AAD_SERVER_ADMIN_TYPE=0" \
  -e "MSSQL_AAD_SERVER_ADMIN_SID=00000000-0000-0000-0000-000000000000" \
```

Without the optional admin variables, connect as `sa` after the engine is ready
and create principals yourself.

For cloud parity, prefer a contained user in the user database (connect to
`appdb`, after it exists):

```sql
CREATE USER [my-app-identity] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [my-app-identity];
ALTER ROLE db_datawriter ADD MEMBER [my-app-identity];
```

For a server-scoped login (server admin path), run on a **master** connection.
It is server-scope; on a user-db session you would hit Msg 40508:

```sql
CREATE LOGIN [user@contoso.com]
FROM EXTERNAL PROVIDER;
```

## Verify

Do not rely on "Entra enabled" or "certificate loaded" log lines alone; those
appeared even when Entra init then failed silently.

1. Confirm the authentication manager did **not** fail:

```bash
docker logs sqldb 2>&1 | grep -i "authentication manager initialization failed"
```

Expect no matches.

2. Functional check: on a **master** connection as `sa`, run
`CREATE LOGIN [some-principal] FROM EXTERNAL PROVIDER;`. Entra is configured when
you get **Msg 33134** (principal could not be resolved) rather than **Msg 37525**
(AAD not configured for this instance). Use a real UPN or object name when you
intend to create the login.

## Do not

- Do not use a password-protected `.pfx`; leave the export password empty.
- Do not leave the host certificate world-readable; restrict file permissions.
- Do not confuse Entra with Windows Authentication / NTLM (those are out of
  scope for Azure SQL Database and for this container).
- Do not treat Entra as required for local work; `sa` SQL auth is still the
  pragmatic default. See `environment-variables.md` for the required start vars.
