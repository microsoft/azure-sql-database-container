<!--
Thanks for contributing. For anything beyond a small documentation fix, please open an
issue first so we can agree on the approach: see CONTRIBUTING.md.
-->

## What this changes

<!-- What does this do, and why? If it fixes an issue, write "Fixes #123". -->

## How you verified it

<!--
Tell us what you actually ran, not what should work.

- Docs or site change: did you build the site locally, or check the rendered page?
- Command change: did you run the command? On which OS and container runtime?
- Agent skill change: did you load the skill and give an agent a real task with it?
-->

## Checklist

- [ ] I opened an issue first, or this is a small documentation fix
- [ ] Commands I changed are copy-pasteable and I ran them
- [ ] If I changed a container command, I noted any differences between runtimes (Docker, Podman, nerdctl)

<!-- If you changed anything under skills/ -->

- [ ] Skill frontmatter is still `name` and `description` only
- [ ] `SKILL.md` is still under 500 lines, with detail in `references/`
- [ ] No skill references a path outside its own folder
- [ ] I did not rename a skill (the names are published identifiers)

<!-- See skills/README.md#authoring-standard for the reasoning behind these. -->
