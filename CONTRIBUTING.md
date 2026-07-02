# Contributing Guide - WonderWord AI

## 1. Workflow (Trunk-Based Development)
- All branches must be created directly from `main`.
- Use short, descriptive names: `feature/<description>` or `fix/<description>`.
- Keep branches short-lived and merge within 1-2 days to avoid pain merge conflicts.
- Delete the branch immediately after a successful merge.

## 2. Commit Conventions
We use Conventional Commits. Ensure your commit messages start with:
- `feat:` New feature (e.g., `feat: add WhisperX endpoint`)
- `fix:` Bug fix (e.g., `fix: correct similarity threshold`)
- `docs:` Documentation changes (e.g., `docs: update README`)
- `chore:` Maintenance tasks or dependencies (e.g., `chore: bump dependencies`)

## 3. Pull Requests & Code Review
- Every single change must go through a Pull Request.
- Link the PR to its corresponding Issue by adding `Closes #N` to the description.
- All PRs require at least 1 approving review and passing CI checks before merging.
- Respect the team's multi-timezone nature; aim to complete reviews within 24 hours.
- Resolve all conversations and comments before triggering the merge.

## 4. Local Environment & Secrets
- Never commit real API keys or credentials to the repository.
- Refer to `apps/web/.env.example` and `apps/ml-service/.env.example` to set up your local development environment.