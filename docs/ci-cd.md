# CI/CD

TableFlow publishes through GitHub Actions + Vercel.

## Pipelines

| Workflow | Trigger | Purpose |
|---|---|---|
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | Push / PR → `main` | `npm ci`, type-check, lint, unit tests, Playwright E2E |
| [`.github/workflows/cd.yml`](../.github/workflows/cd.yml) | Green CI on `main`, PRs, manual | Vercel preview (PRs) and production (`main`) |
| [`.github/workflows/pr-management.yml`](../.github/workflows/pr-management.yml) | PR events | Path labels + merge checklist comment |

## Required GitHub secrets (CD)

Set these on `liqidchaos/tableflow` → Settings → Secrets and variables → Actions:

| Secret | Source |
|---|---|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens |
| `VERCEL_ORG_ID` | `.vercel/project.json` → `orgId` (after `vercel link`) |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` → `projectId` |

Vercel Git integration can also deploy the linked project when connected; Actions CD is the audited gate that waits for green CI on `main`.

## Branch protection (PR management)

`main` requires:

1. Status check **test** (job name from `ci.yml`)
2. Conversation resolution before merge
3. No force-pushes / deletions

Bootstrap:

```bash
./scripts/bootstrap-github-branch-protection.sh
```

Note: GitHub free private repos cannot use branch protection; this repo is **public** so required checks can enforce PR policy. Upgrade to GitHub Pro if the board wants a private repo with the same gates.

## Vercel Git integration (optional)

Actions CD (`cd.yml`) is the audited deploy path and uses `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`.

Native Vercel↔GitHub auto-deploy additionally needs the [Vercel GitHub App](https://github.com/apps/vercel) installed on the `liqidchaos` account. Until that app is installed, rely on Actions CD.

## Local mirror of CI

```bash
npm ci
npm run type-check
npm run lint
npm run test
cd apps/web && npx playwright install chromium && npx playwright test
```

## Environments

- **Preview:** every PR → unique Vercel URL (posted on the PR when `VERCEL_*` secrets are set)
- **Production:** successful CI on `main` → Vercel `--prod`
