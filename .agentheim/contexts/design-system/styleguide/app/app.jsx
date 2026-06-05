/* eslint-disable */
/* ============================================================
   Agentheim — design-system canvas (root app)
   ============================================================ */
const { useState, useEffect } = React;

const SAMPLE_TICKET = TICKETS.find((t) => t.id === "AGH-128");
const SAMPLE_DOC = LIBRARY[2].items[0]; // ADR-0007

function TopBar({ theme, setTheme }) {
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      display: "flex", alignItems: "center", gap: 14, height: 60, padding: "0 28px",
      background: "var(--surface-0)", borderBottom: "1px solid var(--hairline)",
    }}>
      <Glyph size={24} />
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--fg-1)" }}>Agentheim</span>
      <span style={{ width: 1, height: 18, background: "var(--hairline-strong)" }} />
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--fg-3)" }}>Design system</span>
      <div style={{ flex: 1 }} />
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)", padding: "3px 8px", border: "1px solid var(--hairline)", borderRadius: "var(--radius-sm)" }}>derived from Ledger</span>
      <Segmented value={theme} onChange={setTheme} options={[
        { value: "dark", label: "Dark", icon: "moon" },
        { value: "light", label: "Light", icon: "sun" },
      ]} />
    </header>
  );
}

function Hero() {
  return (
    <section style={{ padding: "60px 0 56px", borderBottom: "1px solid var(--hairline)", marginBottom: 56 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 22 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent-ochre)" }}>v0.1</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-4)" }}>·</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-3)" }}>dark-first · light variant</span>
      </div>
      <h1 style={{ margin: "0 0 20px", fontFamily: "var(--font-ui)", fontSize: 46, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.05, color: "var(--fg-1)", maxWidth: 760, textWrap: "balance" }}>
        A calm, content-first control panel for an agentic dev workflow.
      </h1>
      <p style={{ margin: "0 0 30px", fontFamily: "var(--font-ui)", fontSize: 16.5, lineHeight: 1.6, color: "var(--fg-2)", maxWidth: 620 }}>
        The visual language plus a set of styled reference components a developer can build from — tokens documented up top, then rendered in context: a kanban board, a slide-over reader, a markdown reading surface, and a browsable library of project knowledge.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {["Linear precision", "Notion calm", "Vercel restraint"].map((t) => (
          <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--fg-2)", padding: "5px 11px", border: "1px solid var(--hairline)", borderRadius: 99, background: "var(--surface-1)" }}>
            <span style={{ width: 5, height: 5, borderRadius: 99, background: "var(--accent-ochre)" }} />{t}
          </span>
        ))}
      </div>
    </section>
  );
}

// ---- 05: components in context (live) ----
function LiveSection() {
  const [cardVariant, setCardVariant] = useState("rail");
  const [headerVariant, setHeaderVariant] = useState("contextual");
  return (
    <GuideSection index="05" title="Components in context"
      desc="The system, assembled and working. Click any ticket or library document to slide the reader in from the right; press Esc or the scrim to dismiss. Switch the board between the Board and Library views in the left rail. The two controls below swap the live card and drawer-header directions.">
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <SubHead style={{ marginBottom: 8 }}>Ticket card</SubHead>
          <Segmented value={cardVariant} onChange={setCardVariant} options={[
            { value: "rail", label: "Status rail" }, { value: "badge", label: "Status badge" },
          ]} />
        </div>
        <div>
          <SubHead style={{ marginBottom: 8 }}>Drawer header</SubHead>
          <Segmented value={headerVariant} onChange={setHeaderVariant} options={[
            { value: "minimal", label: "Minimal" }, { value: "contextual", label: "Contextual" },
          ]} />
        </div>
      </div>
      <LiveApp cardVariant={cardVariant} headerVariant={headerVariant} />
    </GuideSection>
  );
}

// ---- 06: ticket card anatomy ----
function StateLabel({ children }) {
  return <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-4)", marginBottom: 9, textTransform: "uppercase", letterSpacing: "0.05em" }}>{children}</div>;
}
function CardStates({ variant, title, note }) {
  return (
    <DocCard pad={22} style={{ background: "var(--surface-0)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, color: "var(--fg-1)" }}>{title}</span>
      </div>
      <p style={{ margin: "0 0 20px", fontFamily: "var(--font-ui)", fontSize: 12.5, lineHeight: 1.5, color: "var(--fg-3)", maxWidth: 280 }}>{note}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div><StateLabel>Default</StateLabel><TicketCard ticket={SAMPLE_TICKET} variant={variant} /></div>
        <div><StateLabel>Hover</StateLabel><TicketCard ticket={SAMPLE_TICKET} variant={variant} forceHover /></div>
        <div><StateLabel>Selected</StateLabel><TicketCard ticket={SAMPLE_TICKET} variant={variant} selected /></div>
      </div>
    </DocCard>
  );
}
function CardSection() {
  return (
    <GuideSection index="06" title="Ticket card"
      desc="Comfortable density: a ticket ID, a two-line title, and two meta chips with room to breathe. Two directions for signalling status — a quiet colored rail down the left edge, or an explicit status badge on top. Both share hover (a 1px lift) and a selected state (ochre ring).">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <CardStates variant="rail" title="Direction A — Status rail"
          note="Status reads from a 3px colored edge. Quietest option; lets the title lead. Ticket ID sits top-left in mono." />
        <CardStates variant="badge" title="Direction B — Status badge"
          note="Status is an explicit labeled pill. Most legible when columns are long or a card sits out of its column (search, filters)." />
      </div>
    </GuideSection>
  );
}

// ---- 07: slide-over drawer ----
function HeaderFrame({ children, label, note }) {
  return (
    <div>
      <StateLabel>{label}</StateLabel>
      <div style={{ border: "1px solid var(--hairline)", borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--surface-0)", boxShadow: "var(--shadow-sm)" }}>
        {children}
        <div style={{ padding: "18px 22px", fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--fg-3)" }}>{note}</div>
      </div>
    </div>
  );
}
function DrawerSection() {
  return (
    <GuideSection index="07" title="Slide-over drawer"
      desc="A document opens in a panel that animates in from the right over 180ms, dimming the board behind it — the same surface for a ticket's description and for any library document. Two header directions: a slim minimal bar, or a contextual band tinted in the content type's color with status and path metadata.">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        <HeaderFrame label="Direction A — Minimal" note="Type pill, file path, and quiet actions. The prose H1 below carries the title.">
          <HeaderMinimal info={describeItem(SAMPLE_DOC)} onClose={() => {}} />
        </HeaderFrame>
        <HeaderFrame label="Direction B — Contextual" note="Tinted by content type, with status and path metadata for tickets. Stronger sense of place.">
          <HeaderContextual info={describeItem(SAMPLE_TICKET)} onClose={() => {}} />
        </HeaderFrame>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24 }}>
        <DocCard pad={0} style={{ overflow: "hidden" }}>
          <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="git-commit-horizontal" size={15} color="var(--accent-ochre)" />
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 500, color: "var(--fg-2)" }}>Entrance motion</span>
          </div>
          <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
            {[["Panel", "translateX(100%) → 0", "180ms"], ["Scrim", "opacity 0 → 0.40", "180ms"], ["Easing", "cubic-bezier(.4,0,.2,1)", "—"], ["Dismiss", "Esc · scrim click", "reverses"]].map(([k, v, d]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 12, borderBottom: "1px solid var(--hairline)" }}>
                <span style={{ width: 64, fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 500, color: "var(--fg-1)" }}>{k}</span>
                <span style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--fg-2)" }}>{v}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-4)" }}>{d}</span>
              </div>
            ))}
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--fg-3)", lineHeight: 1.5 }}>See it live in section 05 — click any card.</div>
          </div>
        </DocCard>
        <div>
          <StateLabel>Empty drawer</StateLabel>
          <div style={{ height: 268, border: "1px solid var(--hairline)", borderRadius: "var(--radius-md)", background: "var(--surface-0)", boxShadow: "var(--shadow-sm)" }}>
            <EmptyDrawer />
          </div>
        </div>
      </div>
    </GuideSection>
  );
}

// ---- 08: markdown ----
function MarkdownSection() {
  return (
    <GuideSection index="08" title="Markdown reading surface"
      desc="The surface ADRs and research notes are read through — the part that matters most. A wider reading scale, a comfortable measure near 68 characters, and tuned treatments for headings, links, inline code, code blocks, blockquotes, lists, and tables. Shown here rendering a full decision record.">
      <div style={{ border: "1px solid var(--hairline-strong)", borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--surface-0)", boxShadow: "var(--shadow-md)", maxWidth: 720, margin: "0 auto" }}>
        <HeaderContextual info={describeItem(SAMPLE_DOC)} onClose={() => {}} />
        <div className="scroll-quiet" style={{ maxHeight: 760, overflowY: "auto", padding: "30px 40px 48px" }}>
          <Markdown source={MD_ADR} />
        </div>
      </div>
    </GuideSection>
  );
}

// ---- 09: navigation / file tree ----
function TreeSpecimen() {
  const [sel, setSel] = useState("adr-0007");
  return (
    <div style={{ width: 280, flexShrink: 0, border: "1px solid var(--hairline)", borderRadius: "var(--radius-md)", background: "var(--surface-0)", padding: "12px 8px", boxShadow: "var(--shadow-sm)" }}>
      <div style={{ padding: "4px 8px 10px", fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--fg-3)" }}>Workspace</div>
      {LIBRARY.map((g) => (
        <TreeGroup key={g.group} group={g.group} items={g.items} selectedId={sel} onOpen={(it) => setSel(it.id)} defaultOpen={g.group !== "Research"} />
      ))}
    </div>
  );
}
function NavSection() {
  return (
    <GuideSection index="09" title="Navigation &amp; file tree"
      desc="The left rail browses the project's agent workspace. Collapsible groups hold each kind of document; the content-type icon carries its own color, so a README, an ADR, and a research note are distinguishable before you read a single word. Selected rows take a colored inset edge matching their type.">
      <div style={{ display: "flex", gap: 28, alignItems: "flex-start", flexWrap: "wrap" }}>
        <TreeSpecimen />
        <DocCard style={{ flex: 1, minWidth: 280 }}>
          <SubHead>Type legend</SubHead>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {Object.entries(CONTENT_TYPES).map(([k, t]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name={t.icon} size={16} color={t.color} />
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--fg-1)" }}>{t.label}</span>
              </div>
            ))}
          </div>
          <div style={{ height: 1, background: "var(--hairline)", margin: "20px 0" }} />
          <p style={{ margin: 0, fontFamily: "var(--font-ui)", fontSize: 12.5, lineHeight: 1.6, color: "var(--fg-3)" }}>
            Icons are the only chromatic element in the rail. Labels and chevrons stay neutral; color is doing one job — telling document kinds apart.
          </p>
        </DocCard>
      </div>
    </GuideSection>
  );
}

// ---- 10: empty states ----
function EmptySection() {
  return (
    <GuideSection index="10" title="Empty states"
      desc="State the fact, then the action — never alarmist, never decorative. An empty column invites a ticket; an empty drawer waits quietly for a selection.">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <StateLabel>Empty column</StateLabel>
          <DocCard pad={20} style={{ background: "var(--surface-0)" }}>
            <ColumnHeader status="todo" count={0} onAdd={() => {}} />
            <EmptyColumn status="todo" />
          </DocCard>
        </div>
        <div>
          <StateLabel>Empty drawer</StateLabel>
          <div style={{ height: 232, border: "1px solid var(--hairline)", borderRadius: "var(--radius-md)", background: "var(--surface-0)" }}>
            <EmptyDrawer />
          </div>
        </div>
      </div>
    </GuideSection>
  );
}

function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--hairline)", padding: "32px 0 64px", marginTop: 32, display: "flex", alignItems: "center", gap: 12 }}>
      <Glyph size={20} />
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--fg-2)" }}>Agentheim design system · v0.1</span>
      <div style={{ flex: 1 }} />
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-4)" }}>Inter Tight · JetBrains Mono · Lucide</span>
    </footer>
  );
}

function App() {
  const [theme, setTheme] = useState("dark");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.add("theme-fade");
    const t = setTimeout(() => document.documentElement.classList.remove("theme-fade"), 320);
    return () => clearTimeout(t);
  }, [theme]);

  return (
    <ThemeCtx.Provider value={theme}>
      <TopBar theme={theme} setTheme={setTheme} />
      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "0 28px" }}>
        <Hero />
        <ColorSection />
        <TypographySection />
        <SpacingSection />
        <IconSection />
        <LiveSection />
        <CardSection />
        <DrawerSection />
        <MarkdownSection />
        <NavSection />
        <EmptySection />
        <Footer />
      </main>
    </ThemeCtx.Provider>
  );
}

window.App = App;
