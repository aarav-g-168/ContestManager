# Project preferences

- Use the `ui-ux-pro-max` skill as the default guide for work on this project. Consult `.agents/skills/ui-ux-pro-max/SKILL.md` and apply the guidance relevant to the task.
- Apply its UI/UX guidance to all interface design, implementation, reviews, and fixes, including accessibility, responsive layout, typography, color, interaction, and light/dark themes.
- Keep changes within the requested scope; this preference does not authorize unrelated UI redesigns during backend or configuration work.
- Keep local skills off GitHub. Never stage, commit, push, force-add, or copy `.agents/skills/` or `.codex/skills/` into tracked files. Preserve their `.gitignore` entries for all future commands and workflows.
- Before committing or pushing, verify that no local skill files are tracked or staged. If skill files become tracked, remove them from Git's index while preserving the local files.

# Project structure

- Follow `docs/project-structure.md` when adding or moving files. Keep it updated when the architecture changes.
- Keep Next.js pages, layouts, loading/error files and HTTP route handlers in `src/app/`; URLs must not change during an organizational refactor.
- Put product code in `src/features/<feature>/`: React UI in `components/`, hooks in `hooks/`, pure shared rules in `lib/`, backend code in `server/`, and feature CSS in `styles.css`. Create only folders that contain code.
- Shared UI belongs in `src/components/{layout,feedback,theme,ui}/`. Keep UI primitives independent of product features.
- Keep shared infrastructure in `src/lib/` (database, HTTP, Supabase, date and styling utilities), generic hooks in `src/hooks/`, and global CSS in `src/styles/`.
- Use PascalCase for feature React component filenames, `useName.ts` for hooks, and explicit `@/` imports within application code. Avoid mixed client/server barrel exports.
- Never import `src/app/` modules from features. Client runtime dependencies must not reach feature `server/` folders, database modules or Node-only services; use type-only imports when sharing types.
- Tests belong in `tests/integration/` (or `tests/unit/` / `tests/e2e/` when needed), with shared sample data in `tests/fixtures/`. Operational checks, setup tools and retired migration utilities belong in `scripts/checks/`, `scripts/setup/` and `scripts/legacy/` respectively.
- Keep existing npm command names working when paths change. Run `npm run check:structure`, lint, typecheck, relevant existing tests and a production build after broad moves.
