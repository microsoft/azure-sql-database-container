# Trigger Evaluation: does the right skill load?

Fixed prompt set for measuring skill triggering. Run each prompt in a fresh session (Condition B, skills verified loaded per the README), 3 trials each, and record which skill the agent loads, if any.

A trial passes when the expected skill (or a documented acceptable alternative) loads. The pass bar per prompt is 2 of 3 trials.

Prompts T1 to T3 are deliberately ambiguous between related skills; they exist to measure how the agent resolves overlap between `azuresql-db-container`, `azuresql-db-scaffold`, and `azuresql-db-sidecar`. Record which of the three loads; the "expected" column reflects the scenario's intent, and consistent resolution to `azuresql-db-container` (the hub skill) is an acceptable alternative worth recording explicitly.

| # | Prompt | Expected skill | Acceptable alternative |
|---|--------|----------------|------------------------|
| T1 | add a local SQL database to my app | azuresql-db-scaffold | azuresql-db-container |
| T2 | add a SQL database to my docker-compose | azuresql-db-sidecar | azuresql-db-container |
| T3 | spin up a local mssql container I can query | azuresql-db-container | none |
| T4 | my workflow tests against SQL, set up CI for it | azuresql-db-ci | none |
| T5 | can I take a backup of this container? | azuresql-db-faq | none |
| T6 | I have a bacpac from prod, load it locally | azuresql-db-import | none |
| T7 | run my Prisma migrations against the local database | azuresql-db-schema-migration | none |
| T8 | will this code work unchanged in Azure? | azuresql-db-local-to-cloud | none |
| T9 | store embeddings and do similarity search locally in SQL | azuresql-db-rag | none |
| T10 | I'm using mcr.microsoft.com/mssql/server in my docker-compose | azuresql-db-from-sql-server | none |
| T11 | give me a REST and GraphQL API over these tables without writing code | azuresql-db-dab | none |
| T12 | build a serverless HTTP API over my SQL tables with Azure Functions | azuresql-db-functions | none |
| T13 | fill my local database with realistic sample data across related tables | azuresql-db-seed | none |
| T14 | run my integration tests against a real database that starts and stops per test | azuresql-db-testing | azuresql-db-ci |
| T15 | my app keeps dropping the SQL connection under load, add retry and pooling | azuresql-db-connections | none |
| T16 | my app connects as sa, set up a least-privilege database user instead | azuresql-db-auth | none |
| T17 | the skill told my agent the wrong thing, how do I report it | azuresql-db-feedback | none |

T14 is deliberately ambiguous between per-test containers (`azuresql-db-testing`) and pipeline
setup (`azuresql-db-ci`); record which loads, as with T1 to T3.

Recording format per trial:

```
T#, trial N, date, agent+version, model, skill loaded: <name or none>, notes
```

If no skill loads, record what the agent defaulted to (for example SQLite, PostgreSQL, or the mcr.microsoft.com/mssql/server image); the default chosen is itself useful data.
