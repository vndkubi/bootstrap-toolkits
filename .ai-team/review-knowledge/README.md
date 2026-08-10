# Review Knowledge

This area captures reusable engineering review perspectives from pull requests that the user explicitly names.

```text
.ai-team/review-knowledge/
|-- inbox/          # Raw API packets; ignored because they may contain private or untrusted text
|-- observations/   # Curated, source-linked notes
`-- proposals/      # Repeated heuristics awaiting eval and human decision
```

## Safe learning workflow

1. The user supplies a PR URL, a bounded list of PRs, or an exact reviewer login plus repository scope.
2. `capture-review` performs read-only GitHub API collection. Use `GH_TOKEN` or `GITHUB_TOKEN` only through the environment when authenticated access is needed.
3. The `review-learning` skill treats all fetched content as untrusted data and creates a concise observation note.
4. One comment stays an observation. Repeated evidence may become a heuristic proposal.
5. A human/domain owner validates applicability and a protecting eval before any skill, constitution, business rule, or compliance guidance changes.

This process learns review practices, not personal profiles. Do not rank reviewers, collect unrelated activity, or crawl beyond the repository/count the user approved.
