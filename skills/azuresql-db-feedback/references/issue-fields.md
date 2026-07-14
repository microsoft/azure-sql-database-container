# Issue form fields and prefilled URLs

## Contents

- [How prefilling works](#how-prefilling-works)
- [Which template](#which-template)
- [Skill feedback fields](#skill-feedback-fields-skill_feedbackyml)
- [Container bug fields](#container-bug-fields-bug_reportyml)
- [Container feature fields](#container-feature-fields-feature_requestyml)
- [Labels: pass all of them](#labels-pass-all-of-them)
- [URL length](#url-length)
- [Worked example: a skill bug](#worked-example-a-skill-bug)
- [Checkboxes cannot be prefilled](#checkboxes-cannot-be-prefilled)

## How prefilling works

GitHub issue forms prefill from URL query parameters. The parameter name is the field's `id` in the template
YAML; the value is URL-encoded. Base URL:

```
https://github.com/microsoft/azure-sql-database-container/issues/new?template=<template>.yml
```

Append one `&<id>=<url-encoded value>` per field you can fill.

**Always use the full `github.com` URL.** Do not route a prefilled report through an `aka.ms` short link:
those redirect to the bare form and **drop the query string**, so every field is silently lost. The `aka.ms`
links exist for humans opening an empty form.

## Which template

| Template | For | Human short link |
| --- | --- | --- |
| `skill_feedback.yml` | a problem with an `azuresql-db-*` **skill** | https://aka.ms/sql-agent-skills-feedback |
| `bug_report.yml` | a problem with the **container** | https://aka.ms/azuresql-developer-bug |
| `feature_request.yml` | a missing **container** capability | https://aka.ms/azuresql-developer-feature-request |

## Skill feedback fields (`skill_feedback.yml`)

Title prefix is `[Skill]: ` (preserve it).

| Query param | Type | Notes |
| --- | --- | --- |
| `skill` | dropdown | **Verbatim.** See below. |
| `problem-type` | dropdown | **Verbatim.** See below. |
| `agent` | dropdown | **Verbatim.** Which harness you are. |
| `install-method` | dropdown | **Verbatim.** |
| `what-happened` | textarea | What the user asked, and what the agent did. |
| `skill-said` | textarea | **The most valuable field.** The instruction that was wrong or missing, quoted, and what actually worked instead. |
| `repro` | textarea | The prompt and the commands. Redacted. |
| `additional` | textarea | Host OS, runtime, anything else. Optional. |

### `skill` values (verbatim, exactly one)

- `azuresql-db-container`
- `azuresql-db-from-sql-server`
- `azuresql-db-local-to-cloud`
- `azuresql-db-schema-migration`
- `azuresql-db-import`
- `azuresql-db-rag`
- `azuresql-db-ci`
- `azuresql-db-sidecar`
- `azuresql-db-scaffold`
- `azuresql-db-faq`
- `azuresql-db-feedback`
- `The collection as a whole (install, discovery, or the wrong skill loaded)`
- `Not sure`

### `problem-type` values (verbatim)

- `The skill told the agent to do something wrong`
- `The skill was missing something it needed to say`
- `The wrong skill was used, or no skill was used at all`
- `The skill would not install or would not load`
- `The skill worked, but I want to suggest an improvement`
- `Something else`

### `agent` values (verbatim)

- `Claude Code`
- `GitHub Copilot (VS Code)`
- `GitHub Copilot (CLI)`
- `Codex`
- `Cursor`
- `Other (describe below)`

### `install-method` values (verbatim)

- `npx skills add`
- `Copied the directories in by hand`
- `Not sure`

## Container bug fields (`bug_report.yml`)

Title prefix is `[Bug]: `.

| Query param | Type | Notes |
| --- | --- | --- |
| `image-tag` | input | Usually `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest`. |
| `host-os` | dropdown | **Verbatim.** See below. |
| `runtime` | input | For example `Docker 27.0.3` or `Podman 5.0`. |
| `description` | textarea | Expected versus actual, plus the error text. |
| `repro` | textarea | The actual commands, in order. Newlines encode as `%0A`. |
| `additional` | textarea | Driver/ORM and version. Optional. |

### `host-os` values (verbatim)

- `macOS (x86_64 / Intel)`
- `Linux (x86_64)`
- `Windows 11 (x86_64)`
- `Other (describe below)`

Map from `uname -srm`. Apple Silicon runs the x64 image under emulation and still reports `arm64`; it is
still macOS, so use `macOS (x86_64 / Intel)` and mention the emulation in the description. If you cannot tell,
**omit the parameter** rather than guessing.

## Container feature fields (`feature_request.yml`)

Title prefix is `[Feature]: `. Fields: `use-case`, `current-workaround`, `proposed`, `who-benefits`
(multi-select dropdown), `urgency` (dropdown), `additional`.

`who-benefits` values (verbatim, comma-separate for several):

- `Modern Application Developers (Next.js, NestJS, FastAPI, Hono, etc.)`
- `AI / Cloud-Native Developers (RAG, agents, AI features)`
- `Platform Engineers (Dev Containers, docker compose, CI / CD)`
- `Database Developers (T-SQL, schema, migrations)`
- `All developers`

`urgency` values (verbatim):

- `Blocks my evaluation of the Private Preview`
- `Important for my Public Preview adoption`
- `Nice to have`

Do not guess urgency on the user's behalf. Ask, or omit it.

## Labels: pass all of them

A `labels=` query parameter **replaces** the template's own labels rather than adding to them. So passing only
`via-skill` strips the rest and the issue lands untriaged. Always pass the full set:

| Template | Labels to pass |
| --- | --- |
| `skill_feedback.yml` | `&labels=skills,needs-triage,User-filled,via-skill` |
| `bug_report.yml` | `&labels=bug,needs-triage,User-filled,via-skill` |
| `feature_request.yml` | `&labels=enhancement,needs-triage,User-filled,via-skill` |

`via-skill` is what lets the team see which reports came through an agent skill. Include it every time.

## URL length

GitHub returns `414 URI Too Long` on an over-long URL and truncates very long values. Keep the whole URL under
about 8,000 characters:

- Cap `repro` at roughly 1,500 characters and `what-happened` / `description` at roughly 2,000.
- Truncate logs to the ~30 lines that matter, and tell the user you trimmed them so they can paste the rest
  into the form before submitting.

If it genuinely will not fit, prefill the short fields, leave the long one for the user, and give them the
trimmed text in the chat to paste in.

## Worked example: a skill bug

The `azuresql-db-container` skill omitted `--platform` on an Apple Silicon host, so the container died and the
agent had to add the flag itself.

```
https://github.com/microsoft/azure-sql-database-container/issues/new
?template=skill_feedback.yml
&labels=skills,needs-triage,User-filled,via-skill
&title=%5BSkill%5D%3A%20azuresql-db-container%20omits%20--platform%20on%20Apple%20Silicon
&skill=azuresql-db-container
&problem-type=The%20skill%20was%20missing%20something%20it%20needed%20to%20say
&agent=Claude%20Code
&install-method=npx%20skills%20add
&what-happened=I%20asked%20the%20agent%20to%20add%20a%20local%20Azure%20SQL%20database.%20It%20followed%20the%20skill%2C%20the%20container%20exited%20with%20code%20139.
&skill-said=The%20skill%20said%3A%20docker%20run%20-d%20--name%20sqldb%20...%0AWhat%20actually%20worked%3A%20docker%20run%20--platform%20linux%2Famd64%20-d%20--name%20sqldb%20...%0AThe%20skill%20never%20mentioned%20--platform%20for%20a%20non-x64%20host.
&repro=1.%20Ask%3A%20%22add%20a%20local%20Azure%20SQL%20database%22%0A2.%20Agent%20runs%20docker%20run%20-e%20%22MSSQL_SA_PASSWORD%3D***%22%20...%0A3.%20docker%20ps%20-a%20shows%20Exited%20(139)
```

(Wrapped for readability. Emit it as a single line with no whitespace.)

Note the password is `***`, not the real value. That is not optional.

## Checkboxes cannot be prefilled

Both templates end with required checkboxes (`confirm`). Checkbox fields do **not** prefill from the URL, and
that is fine: the user ticking them is the moment they take ownership of the report. Tell them they need to
tick the boxes before GitHub will let them submit. On `skill_feedback.yml` there are two, and one of them is
the confirmation that they redacted their credentials, so do not paper over it.
