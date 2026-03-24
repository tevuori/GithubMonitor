import { Octokit } from '@octokit/rest';

export function getOctokit(accessToken: string) {
  return new Octokit({ auth: accessToken });
}

export async function getUserRepos(accessToken: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.listForAuthenticatedUser({ sort: 'updated', per_page: 50 });
  return data;
}

export async function getRepoStats(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  const [repoData, commits, issues, pulls] = await Promise.all([
    octokit.repos.get({ owner, repo }),
    octokit.repos.listCommits({ owner, repo, per_page: 10 }),
    octokit.issues.listForRepo({ owner, repo, state: 'open' }),
    octokit.pulls.list({ owner, repo, state: 'open' })
  ]);
  return {
    repo: repoData.data,
    recentCommits: commits.data,
    openIssues: issues.data,
    openPulls: pulls.data
  };
}

export async function getRepoCommits(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.listCommits({ owner, repo, per_page: 30 });
  return data;
}

export async function getRepoBranches(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.listBranches({ owner, repo, per_page: 50 });
  return data;
}

// ==================== PR REVIEW FEATURES ====================

export async function getPullRequest(accessToken: string, owner: string, repo: string, pullNumber: number) {
  const octokit = getOctokit(accessToken);
  const [pr, reviews, comments, files] = await Promise.all([
    octokit.pulls.get({ owner, repo, pull_number: pullNumber }),
    octokit.pulls.listReviews({ owner, repo, pull_number: pullNumber }),
    octokit.pulls.listReviewComments({ owner, repo, pull_number: pullNumber }),
    octokit.pulls.listFiles({ owner, repo, pull_number: pullNumber, per_page: 100 }),
  ]);
  return {
    ...pr.data,
    reviews: reviews.data,
    comments: comments.data,
    files: files.data,
  };
}

export async function getPullRequestDiff(accessToken: string, owner: string, repo: string, pullNumber: number) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
    mediaType: { format: 'diff' }
  });
  return data;
}

export async function getRepoPullRequests(accessToken: string, owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open') {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.pulls.list({ owner, repo, state, per_page: 50, sort: 'updated' });
  return data;
}

// ==================== CODE SEARCH ====================

export async function searchCode(accessToken: string, query: string, page: number = 1) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.search.code({ q: query, per_page: 30, page });
  return data;
}

export async function searchRepos(accessToken: string, query: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.search.repos({ q: query, per_page: 20 });
  return data;
}

// ==================== FILE BROWSER ====================

export async function getRepoContents(accessToken: string, owner: string, repo: string, path: string = '', ref?: string) {
  const octokit = getOctokit(accessToken);
  const params: any = { owner, repo, path };
  if (ref) params.ref = ref;
  const { data } = await octokit.repos.getContent(params);
  return data;
}

export async function getFileContent(accessToken: string, owner: string, repo: string, path: string, ref?: string) {
  const octokit = getOctokit(accessToken);
  const params: any = { owner, repo, path };
  if (ref) params.ref = ref;
  const { data } = await octokit.repos.getContent(params);
  if ('content' in data && data.type === 'file') {
    return {
      ...data,
      decodedContent: Buffer.from(data.content, 'base64').toString('utf-8'),
    };
  }
  return data;
}

export async function getRepoTree(accessToken: string, owner: string, repo: string, sha: string = 'HEAD') {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.git.getTree({ owner, repo, tree_sha: sha, recursive: 'true' });
  return data;
}

// ==================== REPOSITORY TRAFFIC ====================

export async function getRepoTrafficViews(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.getViews({ owner, repo, per: 'day' });
  return data;
}

export async function getRepoTrafficClones(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.getClones({ owner, repo, per: 'day' });
  return data;
}

export async function getRepoTrafficReferrers(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.getTopReferrers({ owner, repo });
  return data;
}

export async function getRepoTrafficPaths(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.getTopPaths({ owner, repo });
  return data;
}

// ==================== ORGANIZATION ====================

export async function getUserOrgs(accessToken: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.orgs.listForAuthenticatedUser({ per_page: 50 });
  return data;
}

export async function getOrgDetails(accessToken: string, org: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.orgs.get({ org });
  return data;
}

export async function getOrgMembers(accessToken: string, org: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.orgs.listMembers({ org, per_page: 100 });
  return data;
}

export async function getOrgTeams(accessToken: string, org: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.teams.list({ org, per_page: 100 });
  return data;
}

export async function getOrgRepos(accessToken: string, org: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.listForOrg({ org, sort: 'updated', per_page: 50 });
  return data;
}


export async function getGitGraph(accessToken: string, owner: string, repo: string, perPage: number = 100) {
  const octokit = getOctokit(accessToken);
  
  // Fetch all branches
  const { data: branches } = await octokit.repos.listBranches({ owner, repo, per_page: 100 });
  
  // Fetch commits for each branch with parent info
  const branchCommits = await Promise.all(
    branches.map(async (branch) => {
      try {
        const { data: commits } = await octokit.repos.listCommits({
          owner,
          repo,
          sha: branch.name,
          per_page: perPage,
        });
        return {
          branch: branch.name,
          protected: branch.protected,
          commits: commits.map((c: any) => ({
            sha: c.sha,
            shortSha: c.sha.slice(0, 7),
            message: c.commit.message.split(/\r?\n/)[0],
            fullMessage: c.commit.message,
            author: {
              name: c.commit.author?.name || 'Unknown',
              email: c.commit.author?.email || '',
              date: c.commit.author?.date || '',
              avatar: c.author?.avatar_url || '',
              login: c.author?.login || '',
            },
            parents: c.parents.map((p: any) => p.sha),
            htmlUrl: c.html_url,
          })),
        };
      } catch {
        return { branch: branch.name, protected: branch.protected, commits: [] };
      }
    })
  );

  // Build unified commit map and calculate graph lanes
  const commitMap = new Map<string, any>();
  const branchHeads = new Map<string, string>();

  branchCommits.forEach(({ branch, commits, protected: isProtected }) => {
    if (commits.length > 0) {
      branchHeads.set(branch, commits[0].sha);
    }
    commits.forEach((commit: any) => {
      if (!commitMap.has(commit.sha)) {
        commitMap.set(commit.sha, { ...commit, branches: [branch] });
      } else {
        const existing = commitMap.get(commit.sha);
        if (!existing.branches.includes(branch)) {
          existing.branches.push(branch);
        }
      }
    });
  });

  // Sort commits by date (newest first)
  const allCommits = Array.from(commitMap.values()).sort(
    (a, b) => new Date(b.author.date).getTime() - new Date(a.author.date).getTime()
  );

  // Assign lanes to branches for visualization
  const branchLanes: Record<string, number> = {};
  let laneIndex = 0;
  branches.forEach((b) => {
    branchLanes[b.name] = laneIndex++;
  });

  return {
    branches: branches.map((b) => ({
      name: b.name,
      protected: b.protected,
      headSha: branchHeads.get(b.name) || '',
      lane: branchLanes[b.name],
    })),
    commits: allCommits,
    branchLanes,
    totalCommits: allCommits.length,
  };
}

export async function getUserIssues(accessToken: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.issues.listForAuthenticatedUser({ 
  filter: 'all',  // Shows all issues: created by, assigned to, or mentioning the user
  state: 'open', 
  sort: 'updated', 
  per_page: 50 
});
// Also filters out PRs since GitHub API returns them mixed with issues
return data.filter((issue: any) => !issue.pull_request);

  return data;
}

export async function getUserPullRequests(accessToken: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.search.issuesAndPullRequests({ q: 'is:pr is:open author:@me', sort: 'updated', per_page: 30 });
  return data.items;
}

export async function getRepoWorkflowRuns(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.actions.listWorkflowRunsForRepo({ owner, repo, per_page: 20 });
  return data.workflow_runs;
}

export async function getContributorStats(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  // GitHub may return 202 while computing stats, retry up to 3 times
  for (let i = 0; i < 3; i++) {
    const res = await octokit.repos.getContributorsStats({ owner, repo });
    if (res.status === 200 && res.data) {
      return (res.data as any[]).map(c => ({
        login: c.author.login,
        avatarUrl: c.author.avatar_url,
        profileUrl: c.author.html_url,
        totalCommits: c.total,
        additions: c.weeks.reduce((sum: number, w: any) => sum + w.a, 0),
        deletions: c.weeks.reduce((sum: number, w: any) => sum + w.d, 0),
      })).sort((a, b) => b.totalCommits - a.totalCommits);
    }
    await new Promise(r => setTimeout(r, 2000)); // wait 2s before retry
  }
  return [];
}
