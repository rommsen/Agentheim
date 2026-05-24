# agentheim

A DDD-flavored agentic harness for Claude Code. Installed as a plugin once, used across projects. It turns a raw idea into a vision, a vision into a modeled backlog of bounded contexts, and a backlog into parallel, dependency-aware execution — with ADRs, a protocol log, and per-BC READMEs falling out naturally.

## Install

From inside Claude Code, in the project where you want the plugin:

```
/plugin marketplace add heimeshoff/agentheim
/plugin install agentheim@agentheim
```

The first command registers this repo as a marketplace — Claude Code clones it from GitHub for you, so no local download is needed. The `owner/repo` shorthand resolves to GitHub; the full `https://github.com/heimeshoff/agentheim` URL works too. The second command installs the plugin from the registered marketplace. Restart Claude Code afterward so hooks and skills are picked up.

### Updates

#### Releasing a change (maintainer side)

When you change anything that consumer projects should pick up — a skill, an agent, a hook, a slash command — bump the `version` field in `.claude-plugin/plugin.json` and commit. Updates are only detected when the version *changes*: that field is the authority. Use semver: bump the patch for fixes, the minor for new behavior, the major for breaking changes to skill contracts or hook shapes.

If you'd rather not bump by hand, omit the `version` field entirely and Claude Code falls back to the git commit SHA — every commit then counts as a new version. The trade-off is that consumers see noise from every internal commit, not just intentional releases.

After committing and pushing to GitHub, consumers can pull the change with the steps below. Tagging the release (`git tag v0.6.0 && git push --tags`) is good practice so versions are pinnable.

#### Pulling a change (consumer side)

Local/third-party marketplaces have auto-update **disabled** by default. To enable it, run `/plugin`, go to the **Marketplaces** tab, select `agentheim`, and choose "Enable auto-update". Claude Code will then refresh on startup and prompt you to run `/reload-plugins` when there's a new version.

To update manually:

```
/plugin marketplace update agentheim
/plugin update agentheim@agentheim
/reload-plugins
```

The first command refreshes the marketplace's view of the source repo, the second pulls the new plugin version into your project, and the third reloads skills/hooks so the change is live in the current session.

## The four skills

Skills auto-trigger from natural-language phrases — no slash commands to memorize. The orchestrator agent routes work to specialists (strategic-modeler, tactical-modeler, architect, researcher, worker). Two of those specialists are paired with a fresh-context **gate** that re-checks their output before it's trusted: the `verifier` audits a worker's code, and the `research-reviewer` re-verifies a researcher's factual claims against primary sources.

| Skill | Triggered by | Produces |
|---|---|---|
| **brainstorm** | "let's brainstorm", "start a new project", "create a vision", "model this from scratch" | `.agentheim/vision.md` (+ `context-map.md` when warranted). Closes with an architecture foundation pass that emits `type: decision` tasks, a walking-skeleton spike, and (when frontend exists) a styleguide task. No code yet — those land in `todo/` for `work` to execute. |
| **model** | "I have an idea", "capture this", "refine the auth backlog", "promote X to todo", "there's a bug" | Task markdown files in `contexts/<bc>/backlog\|todo/` with status, dependencies, acceptance criteria. |
| **work** | "start working", "execute the todo", "let's go", "pick up where you left off" | Code, commits, ADRs. Parallel workers respect the dependency DAG. Each worker runs TDD (red-green-refactor) by default, and every `SUCCESS` passes through a fresh-context **verifier** agent before the commit. |
| **research** | "research X", "state of the art for", "compare options for" | A markdown report in `.agentheim/knowledge/research/`. Every report passes through a fresh-context **research-reviewer** agent that re-verifies its checkable claims (versions, prices, package names, API surface) against primary sources before the report is citable. Cited by tasks and ADRs. |

## How the workflow works

The full workflow — how brainstorm, model, research, and work hand off to each other, the architecture-foundation pass, the orchestration layer, the task lifecycle, and the knowledge layer — is laid out in a visual guide:

- **[agentheim-workflow.pdf](agentheim-workflow.pdf)** — renders inline on GitHub, one topic per page.
- **[agentheim-workflow.html](agentheim-workflow.html)** — the same guide as an interactive page; clone the repo and open it in a browser.

## Project state layout

All state for a project lives in `.agentheim/` inside that project — never in the plugin dir:

```
.agentheim/
├── vision.md
├── context-map.md                      # only for multi-BC domains
├── contexts/
│   └── <bounded-context>/
│       ├── README.md                   # ubiquitous language, aggregates, events
│       ├── INDEX.md                    # auto-maintained catalog of this BC
│       ├── backlog/                    # captured, not yet refined
│       ├── todo/                       # ready to work
│       ├── doing/                      # in flight (claimed by a worker)
│       ├── done/                       # completed, linked to commit SHA
│       └── concepts/                   # opt-in synthesis pages (rich-domain BCs)
└── knowledge/
    ├── index.md                        # top-level catalog (BCs, global ADRs, cross-BC research)
    ├── protocol.md                     # chronological diary, newest on top
    ├── decisions/                      # ADRs (global + BC-scoped)
    └── research/                       # research reports
```

Tasks are plain markdown with frontmatter (`id`, `status`, `depends_on`, `type`). One task = one commit, made by the work skill after the worker reports `SUCCESS` *and* the verifier returns `PASS`. Workers return a strict `RESULT/TASK_ID/SUMMARY/FILES_CHANGED/...` format to keep the orchestrator context lean across long batches.

The `INDEX.md` per BC and the top-level `knowledge/index.md` are the **memory layer**: skills consult them for prior-art lookup before capture, for dependency hints, and for surfacing concept candidates. They're maintained incrementally by `model`/`work`/`research`; `scripts/backfill-indexes.ps1` rebuilds them for pre-existing state.

Scaffolding is English; your own domain language can be in any language.

## Spoken notifications

Want Claude Code to speak its end-of-turn summaries and attention prompts aloud? That's a separate plugin: **utterheim-narrator**, which lives in the [Utterheim](https://github.com/heimeshoff/utterheim) repo (the local TTS sidecar) and is installed independently. See `utterheim/claude-code-plugin/README.md` for setup and the `/narrator` voice picker.

## Layout of this repo

```
.claude-plugin/plugin.json         # plugin manifest
agents/                            # orchestrator + specialists (incl. verifier, research-reviewer)
skills/                            # brainstorm, model, research, work, test-driven-development, verification-before-completion, research-review
scripts/backfill-indexes.ps1       # one-shot rebuild of .agentheim/ indexes for projects predating 0.6.0
evals/                             # benchmarks against other harnesses
references/                        # design notes and source material
```

## Status

Iteration 1 validated (2026-04-24). Benchmarked at 100% vs. 54.8% on the reference suite. Load-bearing disciplines — no-code brainstorm, strict worker return format, orchestrator never writing code, protocol log on every action — are intentional and should not be regressed.

## License

See `LICENSE`.
