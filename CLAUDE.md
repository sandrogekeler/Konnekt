See @agent_docs/CLAUDE.md for architecture, conventions, and build/test
commands, and @agent_docs/DEPENDENCIES.md before adding any dependency.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- graphify-out/ is gitignored and regenerable. If it's absent (e.g. a fresh clone), run `graphify update .` to build it — see `agent_docs/CLAUDE.md`'s "Local tooling" section for install notes.
