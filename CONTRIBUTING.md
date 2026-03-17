# Contributing to WakeyWakeyStop

Thank you for your interest in contributing! This guide explains how to participate effectively.

---

## GitHub Issues vs Pull Requests

### Open a GitHub Issue when you want to:
- **Report a bug** – describe what happened, what you expected, and steps to reproduce.
- **Request a feature** – explain the problem you're trying to solve and your proposed solution.
- **Ask a question or start a discussion** – get alignment before writing any code.

> **Rule of thumb:** if no code change is ready yet, open an Issue first.

### Open a Pull Request (PR) when you:
- Have code changes ready that fix a bug or implement a feature.
- Are addressing an open Issue (link it in the PR description with `Closes #<issue-number>`).
- Want to propose a documentation or configuration update.

---

## Why Open a PR?

A Pull Request is the mechanism for getting your code into the project. It:

1. **Proposes a change** – shows exactly what you added, removed, or modified.
2. **Enables code review** – maintainers and other contributors can comment, request changes, or approve.
3. **Runs CI checks** – automated tests and linting run on every PR to catch regressions early.
4. **Creates traceability** – linking a PR to an Issue (`Closes #42`) connects the discussion to the implementation, making the project history easy to follow.

---

## PR Workflow

1. **Fork** the repository and create a feature branch from `main`.
   ```bash
   git checkout -b fix/my-bug-fix
   ```
2. **Make your changes** – keep commits focused and descriptive.
3. **Run linting locally** before pushing.
   ```bash
   npm run lint
   ```
4. **Open a PR** against the `main` branch.
   - Fill in the PR template (title, description, linked issue).
   - Use `Closes #<issue-number>` in the description to auto-close the related Issue on merge.
5. **Address review feedback** – push additional commits to the same branch.
6. **Merge** – a maintainer merges the PR once approved and all CI checks pass.

---

## CI Checks

Every PR automatically runs:
- **ESLint** – enforces code style and catches common errors.
- Any other checks configured in `.github/workflows/`.

PRs with failing checks will not be merged until the issues are resolved.

---

## Quick Reference

| Situation | Action |
|---|---|
| Found a bug, no fix yet | Open an **Issue** |
| Have a bug fix ready | Open a **PR** (link the Issue) |
| Want a new feature | Open an **Issue** first, then a **PR** |
| Documentation update | Open a **PR** |
| General question | Open an **Issue** |
