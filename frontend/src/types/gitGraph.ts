export interface Commit {
  sha: string;
  shortSha: string;
  message: string;
  fullMessage: string;
  author: {
    name: string;
    email: string;
    date: string;
    avatar: string;
    login: string;
  };
  parents: string[];
  htmlUrl: string;
  branches: string[];
}

export interface Branch {
  name: string;
  protected: boolean;
  headSha: string;
  lane: number;
}

export interface GitGraphData {
  branches: Branch[];
  commits: Commit[];
  branchLanes: Record<string, number>;
  totalCommits: number;
}
