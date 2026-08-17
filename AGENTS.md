# Container — Agent Instructions

This project uses [Operator Memory](https://github.com/aerovato/operator) for durable, agent-maintained documentation (instructions, specs, codebase index).

- Shared instructions: `.operator-shared/operator.md`
- Shared Project Index (codebase map): `.operator-shared/index/index.md`

If you are an agent or contributor working in this repository, installing Operator Memory is strongly recommended to develop effectively.

To install:

```
# With NPM
npm install --global @aerovato/operator-helper

# With Bun
bun add --global --minimum-release-age 0 @aerovato/operator-helper@latest

# Install OpenCode plugin
operator-helper install opencode
```

Without Operator installed, read the files listed above manually before making changes.
