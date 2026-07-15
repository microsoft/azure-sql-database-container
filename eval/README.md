# Agent Skills Evaluation Suite

This directory contains a manual, reproducible methodology for evaluating whether the agent skills in this repository change AI coding agent behavior. It measures two things:

1. **Trigger evaluation**: does the agent load the right skill for a given prompt?
2. **Outcome evaluation**: does an agent with the skills installed produce more correct plans and workflows than the same agent without them?

The suite is designed to run by hand with no additional tooling: a person runs the prompts in an agent, records what happens, and grades the transcripts against fixed checklists. It can later be automated, but nothing here requires automation.

## Concepts

- **Condition A (baseline)**: a fresh agent session with none of these skills installed.
- **Condition B (skilled)**: an identical session with all skills from this repository correctly installed.
- **Trial**: one execution of one prompt in one condition. Agents are non-deterministic, so each prompt is run 3 times per condition.
- **Assertion**: a single yes/no check applied to a transcript (for example: "the plan uses the Azure SQL Developer image, not mcr.microsoft.com/mssql/server"). A run's score is the percentage of assertions passed.
- **Lift**: the Condition B average score minus the Condition A average score, per scenario. Lift is the headline measure of whether the skills changed behavior.

## Before you run anything: verify the skills are actually loaded

Installation location matters. Claude Code loads skills from `.claude/skills/` (project) or `~/.claude/skills/` (global); other agents use their own locations (see the install matrix in the skills README). An install step that places files elsewhere will report success while the agent sees nothing, which silently converts a skilled run into a baseline run and invalidates the comparison.

Verification step, required before every Condition B session:

1. Start a fresh agent session in the test directory.
2. Ask: "what skills do you have available?"
3. Confirm every `azuresql-db-*` skill appears in the response. If any are missing, fix the installation (copying the skill folders into the agent's documented skills directory works) and restart the session before running any trial.

For Condition A sessions, run the same check and confirm the skills do NOT appear.

## Protocol

1. Create a fresh, empty working directory for each condition. Do not run trials inside a directory that contains the skill files themselves as visible folders; the agent can notice them in a directory listing, which contaminates the trigger measurement.
2. Run each prompt as a new conversation (clear context between trials). Append "just tell me your plan first, don't execute anything" to keep runs plan-only unless you are intentionally testing execution.
3. Record for every trial: date, agent and version, model, condition, prompt, which skill loaded (if any), and the full transcript.
4. Grade each transcript against the relevant checklist in `outcome-assertions.md`. Grade only what the transcript shows; do not infer.
5. Compute per-scenario scores and lift. Report the number of trials alongside any result; small samples are fine if labeled as such.

## Files

- `trigger-evals.md`: the fixed prompt set for trigger evaluation, with the expected skill for each prompt.
- `outcome-assertions.md`: per-scenario yes/no checklists for outcome evaluation, derived from the accuracy baseline in the skills README.

## Caveats to state with any results

- Results are model-specific and version-specific: record and report both.
- Plan-only runs grade the plan, not an executed workflow. Execution runs additionally require access to the container image.
- Trigger expectations reflect the current skill descriptions; if descriptions change, re-baseline.

## Contributing

Additions welcome: new prompts, new assertions, results from other agents. Follow the repository contribution conventions and open a pull request from a feature branch.
