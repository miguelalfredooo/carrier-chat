# Local Development Setup

## Authentication Method

This project uses **Anthropic API authentication** via `ANTHROPIC_API_KEY` stored in `.env.local`.

- **Not used:** Claude Code's stored login token (to avoid conflicts)
- **File:** `.env.local` (git-ignored, never committed)
- **Provider:** Anthropic / Claude API

## direnv (Required)

To prevent authentication conflicts when switching between projects, this project uses **direnv** to automatically manage environment variables.

### Initial Setup (One Time)

If you haven't set up direnv yet:

```bash
# Install direnv via Homebrew
brew install direnv

# Add the direnv hook to ~/.zshrc (if not already present)
# Look for: eval "$(direnv hook zsh)"
# If missing, add this line to ~/.zshrc and reload:
source ~/.zshrc
```

### Allowing the .envrc File

When you first `cd` into this project, direnv will detect `.envrc` and ask for permission:

```
direnv: error .envrc is blocked. Run `direnv allow` to approve its content.
```

Run this to allow it:

```bash
direnv allow
```

**Why?** direnv requires explicit permission to load env files for security. This is a one-time setup per project.

### After Setup

Once allowed, whenever you:
- **Enter** this directory: `ANTHROPIC_API_KEY` is automatically loaded from `.env.local`
- **Leave** this directory: `ANTHROPIC_API_KEY` is automatically unloaded

This prevents conflicts with Claude Code's authentication token.

## If the Auth Conflict Warning Appears

If you see:
```
Auth conflict: Both a token (claude.ai) and an API key (ANTHROPIC_API_KEY) are set.
```

**Quick fix — run this in your current shell:**

```bash
unset ANTHROPIC_API_KEY
```

Then:
1. **Reload ~/.zshrc** (if direnv changes were made):
   ```bash
   source ~/.zshrc
   ```
2. **Verify direnv is active:**
   ```bash
   which direnv && direnv version
   ```
3. **Allow the .envrc again:**
   ```bash
   cd /Users/miguelarias/Code/carrier-chat
   direnv allow
   ```

## Environment Variables

Your `.env.local` should contain (already set up, don't modify unless adding new vars):

```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
SYNTHESIS_PROVIDER=anthropic
ANTHROPIC_SYNTHESIS_MODEL=claude-haiku-4-5-20251001
# ... other Supabase and design vars
```

**Never** commit `.env.local` or move `ANTHROPIC_API_KEY` to `.env.global`. It stays project-local.

## Switching Between Projects

With direnv properly configured, switching between Carrier and Carrier Chat is seamless:

```bash
cd ~/Code/carrier       # direnv loads carrier's ANTHROPIC_API_KEY
# ... work ...
cd ~/Code/carrier-chat  # direnv unloads carrier's, loads carrier-chat's
# ... work ...
```

No manual `unset` commands needed once direnv is set up.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "direnv: error .envrc is blocked" | Run `direnv allow` in the project root |
| "Auth conflict" warning persists | Check that `.zshrc` has the direnv hook (`eval "$(direnv hook zsh)"`) and reload with `source ~/.zshrc` |
| direnv not found | Run `brew install direnv` and add hook to `~/.zshrc` |
| Environment variables not loading | Run `direnv status` to see why, then `direnv reload` |
| .envrc appears in git status | Verify `.envrc` is in `.gitignore` (it should be) and run `git rm --cached .envrc` if already committed |
