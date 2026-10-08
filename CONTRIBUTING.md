# Contributing

When contributing to this repository, please first dicuss the change you wish to make via issue or any other method with the owners of this repository before making a change. 

## Code Contributions

### Your first issue

1. Read the project's README.md to learn how to setup development environment. 
2. Find an issue to work on. The best way is to look for the good first issue or help wanted labels. 
3. Comment on the issue saying you are going to work on it. 
4. Code! Make sure to update unit tests!
5. When done, create your pull request. 
6. Verify that the CI passes all status checks, or fix if needed. 
7. Wait for other developers to review your code and update code as needed. 
8. Once reviewed and approved, a NodeFlow developer will merge your pull request. 

### Pull Request Process

1. Verify that CI passes all status checks, or fix if needed. 
2. Update the pull request with details of changes to the interface, this includes new environment variables, exposed ports, useful file locations, and container parameters. 
3. Wait for other developers to review your code and update code as needed. 
4. Once reviewed and approved, a NodeFlow developer will merge your pull request. 

### Code Formatting

NodeFlow uses various formatters and linters to maintain a standar of code. We will not merge code that does not pass automated CI tests. 

### Formatter

#### Ruff

For python files, NodeFlow uses ruff to format files to keep coding styles consistent throughout the code base.

It is automatically installed through the backend/requirements.txt when you set up your dev environment. 

You can check the formatting of the backend by running from repository root:

```bash
python -m ruff check backend
```

and automatically fix supported cases by running:

```bash
python -m ruff check backend --fix
```

#### Prettier

For JSX files, NodeFlow uses Prettier to format files to keep coding styles consistent throughout the code base. 

To install Prettier, search up Prettier is VSCode extension marketplace and install it. 

You can check the formatting of the frontend by running:

```bash
npm run format:check
```

and can automatically format the frontend files by rinning 

```bash
npm run format
```

### Linting

#### Ruff

For python files, NodeFlow uses Ruff to lint for potential syntax/code errors.
Run ruff with the following command while in the repository root:

```bash
python -m ruff format --check backend
```

and automatically fix supported issues by running from repo root:

```bash
python -m ruff format backend
```


#### ESLint

For JSX files, NodeFlow uses ESLint to lint for potential syntax/code errors.
Run ESLint with the following command while in the frontend folder: 

```bash
npm run lint
```

Supprted lint issues can be automatically fixed by running:

```bash
npx eslint --fix
```


## Attribution

Portions adopted from <https://github.com/rapidsai/cuml/blob/branch-24.04/CONTRIBUTING.md> and <https://github.com/jlab-sensing/ENTS-backend/blob/main/CONTRIBUTING.md>
