# FitnessFriend Development Guidelines

## Environment Setup

### Python (Backend)
- **ALWAYS use the project venv** at `./venv/bin/python` and `./venv/bin/pip`
- Do NOT install packages system-wide or use the system Python
- Example: `./venv/bin/python -m pytest tests/`

### Node.js (Frontend)
- Use full path: `/home/angrygiant/.nvm/versions/node/v22.22.2/bin/node`
- Use `npm` commands from within the `frontend/` directory
- Example: `cd frontend && npm test`

## Testing
- Backend: `./venv/bin/python -m pytest tests/`
- Frontend: `cd frontend && npm test`

## Branching
- When working on a feature or bug fix, create a feature branch (e.g., `feat/add-food-redesign` or `fix/diary-date-nav`)
- Do not wait for user confirmation — create the branch proactively
- Switch to the feature branch before starting work
- Commit work to the feature branch
