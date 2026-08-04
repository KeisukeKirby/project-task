# Development Workflow Rules

## Deployment and Verification
- **CRITICAL RULE**: Whenever changes are made that need to be reflected on the live environment (e.g. Vercel), you MUST ALWAYS commit and push the code to GitHub (git add ., git commit, git push).
- Do not report completion to the user until you have confirmed that the GitHub push was successful and the corresponding Vercel deployment (build) has completed successfully without errors.
- Always double-check that your local changes have been properly persisted and synced to the remote repository before asking the user to verify on their end.