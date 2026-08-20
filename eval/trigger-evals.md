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

Recording format per trial:

```
T#, trial N, date, agent+version, model, skill loaded: <name or none>, notes
```

If no skill loads, record what the agent defaulted to (for example SQLite, PostgreSQL, or the mcr.microsoft.com/mssql/server image); the default chosen is itself useful data.
