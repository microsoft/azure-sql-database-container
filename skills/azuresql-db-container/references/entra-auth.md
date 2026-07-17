# Microsoft Entra ID authentication

Microsoft Entra ID authentication works on Azure SQL Developer the same way it
does on the SQL Server 2025 container. Configure it with the `MSSQL_AAD_*`
environment variables and a mounted certificate. SQL authentication (`sa`)
remains the simple default for local development; use Entra when you want closer
parity with Azure SQL Database in the cloud.

For app registration, certificate creation, and Kubernetes deployments, follow
the Learn tutorial:
[Configure Microsoft Entra ID authentication for SQL Server on containers](https://learn.microsoft.com/sql/linux/security/authentication/container-kubernetes-microsoft-entra-deployment).

## Prerequisites

1. A Microsoft Entra application registration with a certificate uploaded.
2. A `.pfx` certificate file for the container (export password must be empty;
   a password-protected `.pfx` prevents the engine from starting).
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
and create logins yourself:

```sql
CREATE LOGIN [user@contoso.com]
	FROM EXTERNAL PROVIDER;
```

## Verify

Check the container log for Entra enabled. You should see that Microsoft Entra
ID authentication is enabled and that the certificate loaded, with no
authentication-manager initialization failure.

```bash
docker logs sqldb 2>&1 | grep -i entra
```

## Do not

- Do not use a password-protected `.pfx`; leave the export password empty.
- Do not confuse Entra with Windows Authentication / NTLM (those are out of
  scope for Azure SQL Database and for this container).
- Do not treat Entra as required for local work; `sa` SQL auth is still the
  pragmatic default. See `environment-variables.md` for the required start vars.
