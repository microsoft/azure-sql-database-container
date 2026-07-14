# Contributing

Thanks for your interest in Azure SQL Developer. This repository holds the documentation, the ready-made prompts, and the `azuresql-db-*` agent skills for the Private Preview. **The container image itself is not built from this repository**, so code changes here affect the docs, the site, and the skills, not the engine.

## What we are looking for

During the Private Preview, the most valuable contributions are:

- **Bug reports about the container.** Something behaves differently from Azure SQL Database in the cloud, or does not work at all: [file a bug](https://aka.ms/azuresql-developer-bug).
- **Feedback on the agent skills.** A skill told your agent the wrong thing, or no skill loaded when one should have: [tell us](https://aka.ms/sql-agent-skills-feedback). This is the feedback we are least able to get any other way.
- **Feature requests.** Something missing that would change how you use it: [request it](https://aka.ms/azuresql-developer-feature-request). Filing one also lets us count how many people need the same thing, which is a real input to what we prioritize.
- **Documentation fixes.** Typos, unclear steps, broken commands, missing platform notes. Send a pull request.

## Before you open a pull request

Please **open an issue first** for anything beyond a small documentation fix, so we can agree on the approach before you spend time on it.

If you are changing the agent skills in `skills/`, keep these in mind:

- **Frontmatter is `name` and `description` only.** Anything else is agent-specific and breaks portability across Claude Code, GitHub Copilot, Codex, and Cursor.
- **Descriptions are written in the third person** and name concrete trigger phrases. The description is what the model uses to decide whether to load the skill; it is not documentation for a human.
- **Keep `SKILL.md` under 500 lines.** Detail belongs in `references/`, which is read only when needed.
- **A skill never references a path outside its own folder.** Skills install independently, so a path into a sibling skill resolves to nothing.
- **Every skill stands alone, even where that means repeating a canonical fact.** A user may install one skill rather than the collection.
- **Do not rename a skill.** The names are published identifiers.

The conventions and the reasoning behind them are in the [skills README](skills/README.md#authoring-standard).

## Building the site locally

The site is Jekyll and is published from `docs/` with GitHub Pages. To preview it:

```bash
cd docs
bundle install
bundle exec jekyll serve
```

Then open `http://localhost:4000`.

## Style

- Write for a developer who is new to the product. Explain the why, not just the what.
- Prefer plain language over internal jargon. No severity labels, no codenames.
- The product is **Azure SQL Developer**. The thing you run is still **a container**: keep the technical language technical.
- Commands should be copy-pasteable and correct on macOS, Linux, and Windows. Note when a command differs by container runtime.

## Contributor License Agreement

Most contributions require you to agree to a Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us the rights to use your contribution. For details, visit <https://cla.opensource.microsoft.com>.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide a CLA and decorate the PR appropriately (for example, status check, comment). Simply follow the instructions provided by the bot. You will only need to do this once across all repositories using our CLA.

## Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft trademarks or logos is subject to and must follow [Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general). Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship. Any use of third-party trademarks or logos is subject to those third-parties' policies.
