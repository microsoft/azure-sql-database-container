# Outcome Evaluation: assertion checklists

Yes/no checklists for grading transcripts, one section per scenario. Every assertion is derived from the accuracy baseline and connection model documented in the skills README; if a generated workflow contradicts one, it is wrong by the repository's own definition.

Run each scenario prompt in both conditions (baseline and skilled, 3 trials each, plan-only unless testing execution) and tick each assertion against the transcript. Score = assertions passed / assertions applicable. Lift = skilled average minus baseline average.

The scenario prompts below can be run as written, or replaced with the corresponding build prompts in `docs/prompts/`, which are the curated long-form versions of the same scenarios.

## Scenario 1: provision a local database (prompt: T1 or T3 from trigger-evals.md)

- [ ] Plan uses the Azure SQL Developer image from the preview registry, not mcr.microsoft.com/mssql/server
- [ ] ACCEPT_EULA=Y is set
- [ ] MSSQL_SA_PASSWORD meets the documented complexity requirement, and the plan does not reuse a published literal password verbatim
- [ ] Plan includes a readiness wait (retry loop) rather than querying immediately after docker run
- [ ] Plan explicitly creates the user database (CREATE DATABASE) rather than assuming auto-creation
- [ ] Application connection targets the user database, not master
- [ ] Non-x64 host handling is addressed (--platform linux/amd64) or the plan is explicitly x64-scoped

## Scenario 2: add the database to docker-compose or a Dev Container (prompt: T2)

- [ ] Correct image (as in Scenario 1), declared as a compose service
- [ ] App reaches the database by service name, not localhost
- [ ] Healthcheck present so dependents wait until the engine is ready
- [ ] Database provisioning handled (init step or documented manual step), not assumed automatic
- [ ] platform: linux/amd64 addressed for non-x64 hosts
- [ ] Single connection string surfaced through an environment variable, not hardcoded

## Scenario 3: CI integration (prompt: T4)

- [ ] Engine runs as a CI service container with a health check
- [ ] User database provisioned before tests run
- [ ] Test connection string targets the user database, not master
- [ ] Registry credentials handled as secrets, not inlined
- [ ] No client tools assumed on the runner beyond what the workflow installs or the container provides

## Scenario 4: vector search / RAG (prompt: T9)

- [ ] Uses the native VECTOR(n) type and VECTOR_DISTANCE, not an external vector store (pgvector, FAISS, Chroma, Pinecone) when the data lives in SQL
- [ ] Insert pattern uses the documented double CAST (CAST(CAST(? AS NVARCHAR(MAX)) AS VECTOR(n))) with a literal dimension
- [ ] Does not rely on CREATE VECTOR INDEX; uses full-scan top-k as documented while the index is in development

## Scenario 5: migrate off the SQL Server image (prompt: T10)

- [ ] Detects the mcr.microsoft.com/mssql/server usage and replaces the image rather than keeping it
- [ ] Verifies engine identity (EngineEdition returns 5, Edition returns 'SQL Azure')
- [ ] Re-points connection strings from master to a provisioned user database
- [ ] Flags SQL Server-only features that will not carry over, instead of silently assuming parity

## Scenario 6: local to cloud (prompt: T8)

- [ ] States that the application code is unchanged and only the connection string changes
- [ ] Addresses the authentication difference between local SA auth and cloud Microsoft Entra auth
- [ ] Avoids USE for database switching; selects the database in the connection string

## Grading notes

- Grade only what the transcript shows. An assertion the plan does not address is a fail, not a skip, unless it is inapplicable to the prompt as asked (mark inapplicable and exclude from the denominator).
- Baseline (Condition A) runs are graded against the same checklists. Low baseline scores are expected and are the point of the comparison.
- Record verbatim any incorrect defaults the baseline produces (engine choice, image choice, missing provisioning); the failure pattern is as informative as the score.
