# Git Standards

## Mandatory AI approval boundaries

An AI agent must never, without explicit user approval:

- stage files;
- commit or amend commits;
- push;
- merge or rebase;
- create, switch, rename, or delete branches;
- run destructive Git operations, including resets, cleans, forced updates, or history rewriting.

Read-only inspection is allowed when relevant. Preserve user changes and never discard, overwrite, or include them in unrelated work. Dependency and lockfile changes also require explicit approval.

## Eventual commit principles

When the user separately authorizes commits, prefer small coherent commits with imperative messages that explain intent. Keep generated output, secrets, unrelated formatting, and unrelated changes out of the commit. Review the exact diff and quality results first. Approval to implement is not approval to stage, commit, or push.
