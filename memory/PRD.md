# GitHub Monitor Center - PRD

## Original Problem Statement
Build a GitHub monitoring dashboard with deep GitHub integration features including PR Review, Code Search, File Browser, Traffic Analytics, and Organization Dashboard.

## Architecture
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + React Query
- **Backend**: Node.js + Express + TypeScript + Octokit
- **Auth**: GitHub OAuth via Passport.js

## Core Features Implemented

### Phase 1 (Initial)
- [x] GitHub OAuth authentication
- [x] Repository listing and metrics
- [x] Commit history visualization (GitGraph)
- [x] Branch monitoring with protection status
- [x] PR/Issue tracking
- [x] CI/CD workflow monitoring
- [x] Contributor stats

### Phase 2 (Jan 2026 - Deep GitHub Integration)
- [x] **PR Review Interface** (`/pull-requests/:owner/:repo/:pullNumber`)
  - View PR details with reviews and comments
  - File changes with diff viewer
  - Review state badges (approved, changes requested, etc.)
  
- [x] **Code Search** (`/search`)
  - Search code across all repos
  - Search repositories
  - Support for GitHub search qualifiers

- [x] **File Browser** (`/files`)
  - Browse repository file tree
  - View file contents with line numbers
  - Navigate directories with breadcrumbs

- [x] **Repository Traffic** (`/traffic`)
  - Views and unique visitors (14-day chart)
  - Clone statistics
  - Top referrers
  - Popular content paths

- [x] **Organization Dashboard** (`/organization`)
  - Org overview with stats
  - Members list
  - Teams list
  - Organization repositories

## API Routes Added
- `/api/search/code` - Code search
- `/api/search/repos` - Repository search
- `/api/files/:owner/:repo/contents` - Directory listing
- `/api/files/:owner/:repo/file` - File content
- `/api/files/:owner/:repo/tree` - Full repo tree
- `/api/traffic/:owner/:repo` - Traffic analytics
- `/api/orgs` - User organizations
- `/api/orgs/:org/dashboard` - Org dashboard data
- `/api/pulls/:owner/:repo/:pullNumber` - PR details with reviews

## Navigation
1. Dashboard
2. Repositories
3. Commits
4. Pull Requests (with detail view)
5. Issues
6. Branches (Git Graph)
7. Workflows
8. Contributors
9. Code Search (NEW)
10. File Browser (NEW)
11. Traffic (NEW)
12. Organization (NEW)

## Backlog
- P1: Diff Viewer (compare branches/commits)
- P1: Contribution Analytics (detailed patterns)
- P1: Release Management
- P2: Security Alerts (Dependabot)
- P2: Branch Protection Rules management
- P2: Real-time webhooks

## Tech Notes
- Traffic API requires push access to repo
- Org API requires org membership
- Code search uses GitHub Search API (rate limited)
