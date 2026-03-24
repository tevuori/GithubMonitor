import { Octokit } from '@octokit/rest';

export function getOctokit(accessToken: string) {
  return new Octokit({ auth: accessToken });
}

export async function getUserRepos(accessToken: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: 50
  });
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
