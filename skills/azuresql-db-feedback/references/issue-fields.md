# Issue form fields and prefilled URLs

## Contents

- [How prefilling works](#how-prefilling-works)
- [Bug report fields](#bug-report-fields)
- [Feature request fields](#feature-request-fields)
- [Labels: pass all of them](#labels-pass-all-of-them)
- [URL length](#url-length)
- [Worked example](#worked-example)
- [Checkboxes cannot be prefilled](#checkboxes-cannot-be-prefilled)

## How prefilling works

GitHub issue forms prefill from URL query parameters. The parameter name is the field's `id` in the template
YAML, and the value is URL-encoded. The base URL is:

```
https://github.com/microsoft/azure-sql-database-container/issues/new?template=bug_report.yml
```

Append one `&<id>=<url-encoded value>` per field you can fill.

Use the full `github.com` URL. **Do not route a prefilled report through an `aka.ms` short link:** those
redirect to the bare form and drop the query string, so every field you filled in is silently lost.

## Bug report fields

`?template=bug_report.yml`

| Query param | Type | Notes |
| --- | --- | --- |
| `title` | string | The template prefix is `[Bug]: `. Preserve it: `title=[Bug]: container exits on start under emulation`. |
| `image-tag` | input | Usually `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest`. |
| `host-os` | dropdown | **Must match one option verbatim.** See below. |
| `runtime` | input | For example `Docker 27.0.3` or `Podman 5.0`. |
| `description` | textarea | What you expected versus what happened, plus the error text. |
| `repro` | textarea | The actual commands, in order. Newlines encode as `%0A`. |
| `additional` | textarea | Driver/ORM and version, related issues. Optional. |

### `host-os` values (verbatim, exactly one)

The dropdown only accepts a string that matches an option character for character:

- `macOS (x86_64 / Intel)`
- `Linux (x86_64)`
- `Windows 11 (x86_64)`
- `Other (describe below)`

Map from `uname -srm`. Apple Silicon runs the x64 image under emulation and still reports `arm64`; it is
still macOS, so use `macOS (x86_64 / Intel)` and mention the emulation in the description. If none of the four
fit, use `Other (describe below)` and explain. If you cannot tell, **omit the parameter entirely** rather than
guessing: an omitted dropdown just renders unselected, but a wrong one misroutes triage.

## Feature request fields

`?template=feature_request.yml`. Title prefix is `[Feature]: `.

| Query param | Type | Notes |
| --- | --- | --- |
| `use-case` | textarea | What the user is trying to do. |
| `current-workaround` | textarea | Optional. "No workaround" is a valid answer. |
| `proposed` | textarea | What the ideal solution looks like. |
| `who-benefits` | dropdown (multi) | Verbatim values below. Comma-separate for multiple. |
| `urgency` | dropdown | Verbatim values below. |
| `additional` | textarea | Optional. |

### `who-benefits` values (verbatim)

- `Modern Application Developers (Next.js, NestJS, FastAPI, Hono, etc.)`
- `AI / Cloud-Native Developers (RAG, agents, AI features)`
- `Platform Engineers (Dev Containers, docker compose, CI / CD)`
- `Database Developers (T-SQL, schema, migrations)`
- `All developers`

### `urgency` values (verbatim)

- `Blocks my evaluation of the Private Preview`
- `Important for my Public Preview adoption`
- `Nice to have`

Do not guess urgency on the user's behalf. Ask them, or omit it.

## Labels: pass all of them

A `labels=` query parameter **replaces** the template's own labels rather than adding to them. The bug template
carries `bug`, `needs-triage`, and `User-filled`; the feature template carries `enhancement`, `needs-triage`,
and `User-filled`. So if you pass only `via-skill`, you strip the rest and the issue lands untriaged.

Always pass the full set:

- Bug: `&labels=bug,needs-triage,User-filled,via-skill`
- Feature: `&labels=enhancement,needs-triage,User-filled,via-skill`

`via-skill` is what lets the team see which reports came through an agent skill. Include it every time.

## URL length

GitHub returns `414 URI Too Long` on an over-long URL, and truncates very long field values. Keep the whole
URL comfortably under about 8,000 characters:

- Cap `repro` at roughly 1,500 characters.
- Cap `description` at roughly 2,000 characters.
- Truncate logs to the ~30 lines that actually matter, and tell the user in your message that you trimmed them
  and they should paste the rest into the form before submitting.

If the content genuinely will not fit, prefill the short fields, leave `description` for the user, and give
them the trimmed text in the chat to paste in.

## Worked example

Bug: the container exits at startup because `--platform` was omitted on an Apple Silicon host.

```
https://github.com/microsoft/azure-sql-database-container/issues/new
?template=bug_report.yml
&labels=bug,needs-triage,User-filled,via-skill
&title=%5BBug%5D%3A%20container%20exits%20immediately%20on%20Apple%20Silicon%20without%20--platform
&image-tag=sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io%2Fazure-sql%2Fdb-dev%3Alatest
&host-os=macOS%20(x86_64%20%2F%20Intel)
&runtime=Docker%2027.0.3
&description=Expected%20the%20container%20to%20start.%20It%20exited%20with%20code%20139.%0A%0Adocker%20logs%20sqldb%3A%0A%60%60%60%0Aexec%20format%20error%0A%60%60%60
&repro=1.%20docker%20run%20-d%20--name%20sqldb%20-e%20%22ACCEPT_EULA%3DY%22%20-e%20%22MSSQL_SA_PASSWORD%3D***%22%20-p%201433%3A1433%20sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io%2Fazure-sql%2Fdb-dev%3Alatest%0A2.%20docker%20ps%20-a%20shows%20Exited%20(139)
```

(Written across lines for readability. Emit it as a single line with no whitespace.)

Note the password is `***`, not the real value. That is not optional.

## Checkboxes cannot be prefilled

`bug_report.yml` ends with a required `confirm` checkbox ("I scanned open issues and Known limitations for a
duplicate"). Checkbox fields do not prefill from the URL, and that is fine: the user ticking it is the moment
they take ownership of the report. Tell them they need to tick it before GitHub will let them submit.
