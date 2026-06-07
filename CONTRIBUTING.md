Thank you for contributing to ecommerce-api! Please follow these guidelines to make reviews fast and productive.

1. Workflow
- Fork and create feature branches: feature/<short-desc>, fix/<short-desc>, chore/<short-desc>.
- Keep PRs small and focused (max ~300 lines when possible).

2. Before opening a PR
- Pull latest main and rebase or merge.
- Run tests: npm test
- Run lint: npm run lint && npm run format:check
- Add/update tests and migrations if behavior or schema changes.

3. Commit messages
- Use imperative tense, short subject ("Add user login endpoint").

4. Review checklist (for PRs)
- Tests pass
- Lint/format passes
- Documentation updated
- Migration and seed scripts included when needed

5. Code style
- Follow ESLint and Prettier rules. Use --fix where available.

6. Questions
- For architecture or large changes, open an issue or discuss with maintainers before implementation.
