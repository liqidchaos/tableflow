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

`main` must require:

1. Status check **CI / test** (job name from `ci.yml`)
2. Pull request before merge
3. Up-to-date branch before merge (recommended)

Apply via GitHub Settings → Branches, or the bootstrap script:

```bash
./scripts/bootstrap-github-branch-protection.sh
```

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
