# ReactiveKit Task Completion Workflow

## Essential Steps When Task is Complete

### 1. Code Quality Checks (MANDATORY)
```bash
pnpm run verify      # Run linting and tests
pnpm run lint        # If verify fails, run lint separately
pnpm run test        # If verify fails, run tests separately
```

### 2. Fix Any Issues
- **Linting Errors**: Fix ESLint and TypeScript errors
- **Test Failures**: Fix failing tests before proceeding
- **Build Errors**: Ensure all packages build successfully

### 3. Full CI Verification (Before Committing)
```bash
pnpm run ci          # Full pipeline: verify + build + coverage
```

### 4. Git Commit (Only if User Explicitly Requests)
- **Format**: Use Conventional Commits format
- **Types**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`
- **Structure**: `type(scope): description` with detailed body

## Darwin System Commands for Verification
- `git status` - Check repository status
- `git diff` - Review changes
- `find . -name "*.ts" -o -name "*.js"` - Find source files
- `grep -r "FIXME\|TODO"` - Check for remaining todos

## Quality Gates
- ✅ No ESLint errors
- ✅ No TypeScript errors  
- ✅ All tests passing
- ✅ Code coverage maintained
- ✅ All packages build successfully
- ✅ No console.log statements (ESLint enforced)

## Architecture Compliance
- **Consult ARCHITECTURE.md**: Always review before feature changes
- **Update Documentation**: Update ARCHITECTURE.md if architectural changes made
