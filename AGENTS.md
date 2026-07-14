<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Vercel Deployment Rule
Always commit and push your changes to GitHub after completing a user request in this repository. The user relies on Vercel for public URL testing, and Vercel will not deploy changes until they are pushed to the remote repository.

Example command:
`git add . && git commit -m "description" && git push`
