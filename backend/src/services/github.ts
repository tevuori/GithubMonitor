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

export async function getUserIssues(accessToken: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.issues.listForAuthenticatedUser({ state: 'open', sort: 'updated', per_page: 50 });
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
