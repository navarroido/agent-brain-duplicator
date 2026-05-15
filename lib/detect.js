import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';

// Reads /proc/self/mountinfo to find where nanoclaw mounted our workspace and .claude
// Returns { workspacePath, claudeSharedPath, nanoclaRoot, groupName, agentId }
export function detectPaths() {
  const mountinfo = readFileSync('/proc/self/mountinfo', 'utf8');
  const lines = mountinfo.split('\n');

  let workspaceHostPath = null;
  let claudeSharedHostPath = null;

  for (const line of lines) {
    // e.g. "239 233 0:39 /idonavarro/Desktop/nano/nanoclaw-v2/groups/dm-with-ido-navarro /workspace/agent ..."
    const parts = line.split(' ');
    if (parts.length < 5) continue;
    const hostSuffix = parts[3]; // path on host filesystem (relative to mount root)
    const mountPoint = parts[4]; // where it's mounted in container

    if (mountPoint === '/workspace/agent' && hostSuffix.includes('groups')) {
      workspaceHostPath = '/Users' + hostSuffix;
    }
    if (mountPoint === '/home/node/.claude' && hostSuffix.includes('.claude-shared')) {
      claudeSharedHostPath = '/Users' + hostSuffix;
    }
  }

  if (!workspaceHostPath) throw new Error('Could not detect workspace path. Are you running inside a NanoClaw agent?');

  // Extract nanoclaw root and group name from workspace path
  // e.g. /Users/idonavarro/Desktop/nano/nanoclaw-v2/groups/dm-with-ido-navarro
  const groupsIdx = workspaceHostPath.indexOf('/groups/');
  if (groupsIdx === -1) throw new Error('Unexpected workspace path format: ' + workspaceHostPath);

  const nanoclaRoot = workspaceHostPath.slice(0, groupsIdx);
  const groupName = workspaceHostPath.slice(groupsIdx + '/groups/'.length);

  // Extract agentId from .claude-shared path
  let agentId = null;
  if (claudeSharedHostPath) {
    const sessMatch = claudeSharedHostPath.match(/v2-sessions\/(ag-[^/]+)\//);
    if (sessMatch) agentId = sessMatch[1];
  }

  return {
    workspaceHostPath,   // actual path on Mac
    claudeSharedHostPath, // actual path on Mac
    nanoclaRoot,         // ~/Desktop/nano/nanoclaw-v2
    groupName,           // dm-with-ido-navarro
    agentId,
  };
}

export function readContainerJson() {
  const path = '/workspace/agent/container.json';
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, 'utf8'));
}
