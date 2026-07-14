---
name: azuresql-db-feedback
description: >-
  Reports a bug or files feedback about the azuresql-db-* agent skills themselves, or about Azure SQL Developer (the local Azure SQL Database engine in a container, Private Preview). Use when the user says a skill or the container "did not work", hit an error, behaved unexpectedly, or is missing something; and when they say "report a bug", "file an issue", "open a GitHub issue", "request a feature", "give feedback", or "tell the team". Also use when you, the agent, had to deviate from an azuresql-db-* skill or work around a defect in one to finish a task: that is a bug in the skill and it is worth reporting, even if the task ultimately succeeded. Decides whether the problem belongs to the SKILL or to the CONTAINER, since they use different issue templates, then builds a complete prefilled GitHub issue from context you already have. Never submits anything without explicit confirmation from the user.
---

# Report a problem with the skills, or with the container

The user should never have to assemble a bug report by hand. You are already holding what a good one needs:
which skill you were following, what it told you to do, what you actually had to do, the image tag, the host,
the runtime, the failing command, and the error. Your job is to turn that into a complete report and hand it
to the user to submit.

**Repository:** `microsoft/azure-sql-database-container` (both the container and the skills live here).

## The two rules that matter most

1. **Never create an issue without explicit confirmation.** Show the user the full title and body first and
   wait for a clear yes. You may offer; you may never submit unasked. This applies to every path below,
   including the `gh` CLI.
2. **Redact before you send.** Everything submitted is public. See [Redaction](#step-3-redaction-do-this-before-you-build-anything).

## Step 1: skill problem, or container problem?

**Get this right first: they use different issue templates.**

Ask yourself what actually failed.

| The problem | It belongs to | Template |
| --- | --- | --- |
| A skill told the agent to do the **wrong** thing, or failed to say something it needed to say | the **skill** | `skill_feedback.yml` |
| The **wrong skill** loaded, or no skill loaded when one should have | the **skill** | `skill_feedback.yml` |
| A skill would not install, or the agent never picked it up | the **skill** | `skill_feedback.yml` |
| You had to **deviate from the skill** or work around it to make the task succeed | the **skill** | `skill_feedback.yml` |
| The skill said the right thing, the agent did the right thing, and **the container still failed** (will not start, query errors, engine behaves unexpectedly) | the **container** | `bug_report.yml` |
| The **container** is missing a capability the user wants | the **container** | `feature_request.yml` |

The test that settles it: **if the instructions were correct and the engine still broke, it is a container
bug. If the instructions were wrong, incomplete, or ignored, it is a skill bug.** When genuinely torn, ask the
user. Do not guess, and do not file both.

If the user is only reporting that something worked well, do not open an issue. Point them at
[Discussions](https://github.com/microsoft/azure-sql-database-container/discussions) and stop.

## Step 2: gather the facts

Only run a command if you do not already know the answer.

**For a skill problem** (the important ones, and the ones we are otherwise blind to):

- Which skill, by name (`azuresql-db-rag`, etc). If none loaded, say so: that is itself the bug.
- Which agent you are (Claude Code, GitHub Copilot, Codex, Cursor). Skills behave differently across
  harnesses and we cannot see which one the user ran.
- **The instruction that was wrong or missing, quoted from the skill, and what actually worked instead.**
  This is the single most valuable field in the whole report. Without it we cannot fix the skill.
- The prompt the user gave you.

**For a container problem:** the image tag, the host OS (mapped to the exact dropdown value), the container
runtime and version, what happened, and the commands that reproduce it. `docker logs sqldb` if the container
is what broke.

## Step 3: redaction (do this before you build anything)

Strip all of the following from every field, including logs and repro steps:

- The SA password (`MSSQL_SA_PASSWORD`, `-P <password>`, the `Password=` field of a connection string). Replace with `***`.
- Registry credentials (the `docker login` username and password).
- Full connection strings. Keep the shape, drop the secret: `Server=localhost,1433;Database=appdb;User Id=sa;Password=***;TrustServerCertificate=true`.
- Any customer or application data, table contents, embeddings, or paths that identify the user or their employer.
- Access tokens of any kind.

The repository is public and issues are world readable. A report that leaks the user's password is worse than
no report at all.

## Step 4: draft and show

Write the report, then show it to the user in full and ask whether to file it. Say which fields you filled and
which you left blank. If you could not determine a value confidently, **leave it blank rather than guess**: a
wrong skill name or host OS sends triage down the wrong path.

## Step 5: submit

Try these in order, stop at the first that works, and **confirm with the user first** either way.

**Tier 1: the `gh` CLI**, if `gh auth status` succeeds. The issue is authored by the user, so they get replies.

```bash
gh issue create --repo microsoft/azure-sql-database-container \
  --title "[Skill]: <one-line summary>" \
  --label skills --label needs-triage --label User-filled --label via-skill \
  --body-file <path-to-body>
```

Write the body to a file rather than passing it inline, so quoting and newlines survive.

**Tier 2: a prefilled URL.** No credentials, no setup, and the user sees exactly what will be submitted before
anything happens. Use this whenever `gh` is not available; it always works.

Build the URL from the issue form's field ids and print it for the user to open. The field ids, the **verbatim**
dropdown values, and worked examples for all three templates are in
[references/issue-fields.md](references/issue-fields.md). **Read that file before constructing a URL.**

## Do not

- Do not create, comment on, or close an issue without explicit user confirmation.
- Do not include the SA password, registry credentials, or access tokens in any field. Ever.
- Do not file a skill problem on the container template, or the reverse. They are triaged by different people.
- Do not guess a dropdown value. Leave the field out if you are unsure; an omitted dropdown renders unselected, but a wrong one misroutes triage.
- Do not use an `aka.ms` short link to carry a prefilled report. Those links drop query strings, so every field you filled in is silently lost. Use the full `github.com` URL. (The `aka.ms` links are for humans opening an empty form: [skills feedback](https://aka.ms/sql-agent-skills-feedback), [container bug](https://aka.ms/azuresql-developer-bug), [container feature](https://aka.ms/azuresql-developer-feature-request).)
- Do not open an issue for something already on the [Known limitations](https://microsoft.github.io/azure-sql-database-container/known-limitations.html) page, or already in [open issues](https://github.com/microsoft/azure-sql-database-container/issues). Point the user there instead.
- Do not nag. Offer once, take no for an answer, and move on.

## References

- [references/issue-fields.md](references/issue-fields.md): the exact field ids for all three templates, the verbatim dropdown values, URL construction and its length limit, and worked examples. Read this before building a prefilled URL.
