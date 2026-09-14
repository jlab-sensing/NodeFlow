# Merge Queue README

In order to merge a branch into NodeFlow main branch, it must be added to the GitHub merge queue. In order for the PR to be merged from the queue, it must pass all CI tests. After targetting main branch, github interface will allow dev to click a button 'Merge when ready' which will add it to the queue, run the tests, and merge to the targetted branch, assuming the tests pass. 

PRs can also be added to the queue from the command line. The command is: 

```bash
gh pr merge 45 --repo jlab-sensing/NodeFlow
```

where 45 is replaced by the PR number. 