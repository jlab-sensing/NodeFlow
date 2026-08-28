# Frontend Documentation

## Introduction

The NodeFlow client is being built with [React](https://react.dev/), a component based web library

## Testing

We use vitest to run frontend tests. You can automatically run the frontend tests by running

```
npm run test:ci
```

## Linting

We use eslint as the frontend linter. You can check the current status of your files by running

```
npm run lint
```

Supported lint issues can be automatically fixed by running

```
npx eslint --fix
```

## Formatting

We use Prettier as the frontend formatter. You can check the formatting of the frontend by running

```
npm run format:check
```

and can automatically format the frontend files by running

```
npm run format
```
