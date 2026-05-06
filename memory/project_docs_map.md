---
name: Project Documentation Map
description: Where every doc file lives and what it covers — avoids duplicating or misplacing content
type: project
---

| File | Audience | Contents |
|---|---|---|
| `README.md` | Humans | Quick-start commands, config vars, API table, where to drop the .pt model |
| `CLAUDE.md` | Claude Code | Full system architecture, data flow diagram, coordinate system, two operating modes, what's not yet built |
| `PoseCollection.md` | Claude Code | Camera system internals: pipeline, rep detector, recorder, async video writer, output schema |
| `frontend/CLAUDE.md` | Claude Code | Frontend screen flow, 3D rendering, mock vs real API, rep JSON format, key constraints |
| `frontend/API_SPEC.md` | Both | `POST /analyze` request/response contract with field definitions |
| `frontend/FRONT.md` | Both | Frontend stack, CSS/animations reference, component responsibilities, how to add a screen |
| `memory/` | Claude Code | Cross-session context: stack, data model, implementation status, workflow preferences |

**Rule:** CLAUDE.md files describe architecture and integration. README.md describes how to run. Memory files store what can't be derived from code. Never put running instructions in CLAUDE.md or architecture in README.md.
