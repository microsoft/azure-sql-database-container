---
name: azuresql-db-feedback
description: >-
  Reports a bug, files a feature request, or shares feedback about Azure SQL Developer (the local Azure SQL Database engine in a container, Private Preview) and its azuresql-db-* agent skills. Use when the user says the container or a skill "did not work", hit an error, behaved unexpectedly, or is missing something; and when they say "report a bug", "file an issue", "open a GitHub issue", "request a feature", "give feedback", or "tell the team". Also use when you, the agent, had to deviate from an azuresql-db-* skill or work around a defect in it to finish a task: that is a bug in the skill and it is worth reporting. Builds a complete, prefilled GitHub issue from context you already have (image tag, host OS, runtime, the failing command, the error output) so the user does not have to assemble it by hand. Never submits anything without explicit confirmation from the user.
---

# Azure SQL Developer: report a bug or request a feature

The user should never have to assemble a bug report by hand. You are already holding everything a good one
needs: the image tag, the host OS and architecture, the container runtime, the command that failed, the error
text, and which skill you were following. Your job is to turn that into a complete report and hand it to the
user to submit.

**Repository:** `microsoft/azure-sql-database-container`

## The two rules that matter most

1. **Never create an issue without explicit confirmation.** Show the user the full title and body first and
   wait for a clear yes. You may offer; you may never submit unasked. This applies to every path below,
   including the `gh` CLI.
2. **Redact before you send.** Everything you submit is public. See [Redaction](#redaction-do-this-before-you-build-anything) below and treat it as a
   hard requirement, not a nicety.

## Workflow

Copy this checklist and work through it:

```
Feedback Progress:
- [ ] Step 1: Decide bug or feature
- [ ] Step 2: Gather the facts (bug only)
- [ ] Step 3: Redact
- [ ] Step 4: Draft the report and show it to the user
- [ ] Step 5: Submit the way the user prefers
```

### Step 1: Decide bug or feature

- Something is broken, wrong, or surprising, or you had to work around a skill to finish → **bug**.
- Something is missing that the user wants → **feature request**.

If the user is only reporting that something worked well, do not open an issue. Point them at
[Discussions](https://github.com/microsoft/azure-sql-database-container/discussions) instead and stop.

### Step 2: Gather the facts (bug only)

Collect these from the session, and only run a command if you do not already know the answer:

| Field | Where it comes from |
| --- | --- |
| Image tag | The `docker run` / compose file you used. Almost always `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest`. |
| Host OS | `uname -srm`. Map it to one of the four exact dropdown values in [references/issue-fields.md](references/issue-fields.md). |
| Runtime and version | `docker --version` or `podman --version`. |
| What happened | Expected versus actual, plus the error text. `docker logs sqldb` if the container is the problem. |
| Steps to reproduce | The actual commands run in this session, in order. Not an idealized version. |

If the bug is in a **skill** rather than the container, say so plainly in the description: name the skill, quote
the instruction that was wrong or missing, and state what you had to do instead. That is the single most useful
report we can receive, because it is invisible to us otherwise.

### Step 3: Redaction (do this before you build anything)

Strip all of the following from the description, the repro steps, and any logs:

- The SA password (`MSSQL_SA_PASSWORD`, `-P <password>`, the `Password=` field of a connection string). Replace with `***`.
- Registry credentials (the `docker login` username and password).
- Full connection strings. Keep the shape, drop the secret: `Server=localhost,1433;Database=appdb;User Id=sa;Password=***;TrustServerCertificate=true`.
- Any customer or application data, table contents, embeddings, or file paths that identify the user or their employer.
- Access tokens of any kind.

The repository is public and issues are world readable. A report that leaks the user's password is worse than
no report at all.

### Step 4: Draft and show

Write the report, then show it to the user in full and ask whether to file it. Say which fields you filled in
and which you left blank. If you could not determine a value confidently, leave it blank rather than guess: a
wrong image tag or host OS sends triage down the wrong path.

### Step 5: Submit

Try these in order and stop at the first one that works. Regardless of path, **confirm with the user first**.

**Tier 1: the `gh` CLI**, if `gh auth status` succeeds. The issue is authored by the user, which is what we
want: they get notified of replies.

```bash
gh issue create --repo microsoft/azure-sql-database-container \
  --title "[Bug]: <one-line summary>" \
  --label bug --label needs-triage --label User-filled --label via-skill \
  --body-file <path-to-body>
```

Write the body to a file rather than passing it inline, so quoting and newlines survive.

**Tier 2: a prefilled URL.** Works with no credentials and no setup, and the user sees exactly what will be
submitted before anything happens. This is the fallback that always works, so use it whenever `gh` is not
available.

Build the URL from the issue form's field ids and print it for the user to open. The exact field ids, the
verbatim dropdown values, and a worked example are in
[references/issue-fields.md](references/issue-fields.md). Read that file before constructing a URL.

**Do not** invent a third path. Do not POST to the GitHub API with a token you found lying around in the
environment, and never ask the user for a token.

## Do not

- Do not create, comment on, or close an issue without explicit user confirmation.
- Do not include the SA password, registry credentials, or access tokens in any field. Ever.
- Do not guess at the image tag, host OS, or runtime. Leave the field blank if you are unsure.
- Do not open an issue for something already listed on the [Known limitations](https://microsoft.github.io/azure-sql-database-container/known-limitations.html) page. Point the user there instead.
- Do not use `aka.ms` short links to carry a prefilled report. They drop query strings, so every prefilled field is silently lost. Use the full `github.com` URL.
- Do not file the same issue twice. Check [open issues](https://github.com/microsoft/azure-sql-database-container/issues) first.
- Do not nag. Offer once, take no for an answer, and move on.

## References

- [references/issue-fields.md](references/issue-fields.md): the exact issue-form field ids, the verbatim dropdown values, URL construction and its length limit, and a worked example. Read this before building a prefilled URL.
