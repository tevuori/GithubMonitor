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
- P2: Branch Protection Rules management
- P2: Real-time webhooks
- P2: Starred Repositories management
- P2: Quick Actions (create issues, merge PRs)

## Tech Notes
- Traffic API requires push access to repo
- Org API requires org membership
- Code search uses GitHub Search API (rate limited)
- Security alerts require admin/security access to repository
- Dependabot alerts require repository admin permissions

## Phase 3 (Jan 2026 - UI Improvements)

### Dashboard Improvements
- [x] Welcome banner with user avatar
- [x] 6 stat cards (repos, stars, forks, issues, PRs, private)
- [x] Recent activity feed (PRs + Issues combined)
- [x] Language breakdown chart
- [x] Recent repositories list
- [x] Quick links to new features

### Commits Page Improvements
- [x] Search by message or SHA
- [x] Filter by author
- [x] Commits grouped by date
- [x] Stats bar (commits count, contributors)
- [x] Better commit cards with avatars
- [x] Merge commit badges
- [x] Relative time formatting

### Repositories Page Improvements
- [x] Stats cards with clickable filters (all/public/private/fork/source)
- [x] Search by name, description, topics
- [x] Filter by language
- [x] Sort options (updated, stars, forks, name, created)
- [x] List and Grid view modes
- [x] Topic tags display
- [x] Quick links to File Browser and Git Graph
- [x] Language color indicators

## Phase 4 (Jan 2026 - Advanced Features)

### Diff Viewer (`/diff`)
- [x] Compare branches side-by-side
- [x] Compare commits
- [x] Unified and split view modes
- [x] Syntax highlighted diffs
- [x] File changes with additions/deletions count
- [x] Expandable file patches
- [x] Commit list in comparison

### Release Management (`/releases`)
- [x] List all releases with metadata
- [x] View release assets and download counts
- [x] Create new releases with form
- [x] Support for draft and pre-release flags
- [x] Download ZIP/TAR archives
- [x] View release notes/changelog

### Repository Insights (`/insights`)
- [x] Code frequency chart (additions/deletions over time)
- [x] Commit activity chart (commits per week)
- [x] Participation chart (owner vs all contributors)
- [x] Punch card heatmap (commits by day/hour)
- [x] Interactive charts with Recharts

### Security Alerts (`/security`)
- [x] Dependabot alerts with severity filtering
- [x] Code scanning alerts
- [x] Secret scanning alerts
- [x] Summary cards with alert counts
- [x] Filter by state (open/fixed/dismissed)
- [x] Filter by severity (critical/high/medium/low)
- [x] Direct links to GitHub for remediation

### Notifications Center (`/notifications`)
- [x] View all GitHub notifications
- [x] Filter by unread/all/participating
- [x] Filter by type (Issue/PR/Commit/Release/Discussion)
- [x] Mark individual notifications as read
- [x] Mark all notifications as read
- [x] Reason badges (review requested, mentioned, etc.)
- [x] Direct links to GitHub items

## New API Routes (Phase 4)
- `/api/compare/:owner/:repo/branches` - Compare branches
- `/api/compare/:owner/:repo/commits` - Compare commits
- `/api/releases/:owner/:repo` - List releases
- `/api/releases/:owner/:repo/tags` - List tags
- `/api/releases/:owner/:repo` (POST) - Create release
- `/api/insights/:owner/:repo/code-frequency` - Code frequency stats
- `/api/insights/:owner/:repo/commit-activity` - Commit activity stats
- `/api/insights/:owner/:repo/punch-card` - Punch card data
- `/api/insights/:owner/:repo/participation` - Participation stats
- `/api/security/:owner/:repo` - All security alerts summary
- `/api/security/:owner/:repo/dependabot` - Dependabot alerts
- `/api/security/:owner/:repo/code-scanning` - Code scanning alerts
- `/api/security/:owner/:repo/secret-scanning` - Secret scanning alerts
- `/api/notifications` - User notifications
- `/api/notifications/thread/:id/read` - Mark as read
- `/api/notifications/read` - Mark all as read

## Updated Navigation (17 items)
1. Dashboard
2. Repositories
3. Commits
4. Pull Requests
5. Issues
6. Branches (Git Graph)
7. Diff Viewer (NEW)
8. Workflows
9. Releases (NEW)
10. Contributors
11. Insights (NEW)
12. Security (NEW)
13. Code Search
14. File Browser
15. Traffic
16. Organization
17. Notifications (NEW)
