# Image and registry (single source of truth)

This is the canonical source for the image tag and how to sign in. Other skills
link here instead of repeating the tag.

## The image

```
sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
```

- This is the **Azure SQL Database engine** (Private Preview), EngineEdition 5,
  Edition `'SQL Azure'`.
- It is **x64 only** (`linux/amd64`). There is no arm64 image. On a non-x64
  host, run under emulation by adding `--platform linux/amd64`.
- The registry host and tag are **provisional during Private Preview** and may
  change. Treat this file as the place to update if they do.

## This is NOT the SQL Server box image

Do not substitute `mcr.microsoft.com/mssql/server`. That is the SQL Server box
product and reports a different EngineEdition. If a task pulled the box image,
stop and switch to the image above.

## Sign in to the private registry (Path B: external access)

The external access path pulls from the preview registry
`sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io` (image
`mssql-server/sqldb-dev-edition`, rolling tag `latest`) using a shared,
pull-only username and password.

The credentials are provided to Private Preview cohort participants: request
them through the early-access feedback channel. They are pull-only and may be
rotated during the preview, so treat them as secrets and do not redistribute.
Sign in and enter the password
when prompted:

```bash
docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io -u <username>
```

Podman:

```bash
podman login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io -u <username>
```

After a successful login, `docker pull` (or the `docker run` in the canonical
recipe) can fetch the image. If a pull returns "unauthorized" or "manifest
unknown", re-run the login above with the shared pull-only credentials from the
feedback channel, which may have been rotated.

## Pull explicitly (optional)

```bash
docker pull sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
```

On a non-x64 host:

```bash
docker pull --platform linux/amd64 \
  sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
```

## Do not

- Do not use `mcr.microsoft.com/mssql/server`.
- Do not look for an arm64 tag; there is not one.
- Do not hardcode the registry host in many places; reference this file.
