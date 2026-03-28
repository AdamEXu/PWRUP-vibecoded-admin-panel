import { ExternalLink } from "lucide-react";

interface DeptProps { name: string; body: string; }

function Dept({ name, body }: DeptProps) {
  return (
    <div style={{
      padding: "14px 16px",
      background: "var(--card)",
      borderRadius: 10,
      display: "flex",
      flexDirection: "column",
      gap: 5,
    }}>
      <span style={{
        fontFamily: "var(--f-inter)",
        fontSize: "0.9rem",
        fontWeight: 600,
        color: "var(--text-1)",
      }}>{name}</span>
      <span style={{
        fontFamily: "var(--f-inter)",
        fontSize: "0.82rem",
        lineHeight: 1.6,
        color: "var(--text-2)",
      }}>{body}</span>
    </div>
  );
}

interface LinkProps { label: string; href: string; }

function LinkRow({ label, href }: LinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 54,
        padding: "0 16px",
        background: "var(--card)",
        borderRadius: 10,
        textDecoration: "none",
        border: "1px solid var(--line)",
      }}
    >
      <span style={{
        fontFamily: "var(--f-inter)",
        fontSize: "0.9rem",
        fontWeight: 500,
        color: "var(--text-1)",
      }}>{label}</span>
      <ExternalLink size={14} color="var(--text-3)" />
    </a>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: "block",
      fontFamily: "var(--f-inter)",
      fontSize: "0.72rem",
      fontWeight: 500,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "var(--text-3)",
      marginBottom: 4,
    }}>{children}</span>
  );
}

export function TeamTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Identity */}
      <div>
        <span style={{
          display: "block",
          fontFamily: "var(--f-brand)",
          fontSize: "clamp(1.6rem, 5vw, 2.2rem)",
          color: "var(--text-1)",
          lineHeight: 1.1,
        }}>
          Pinewood Robotics
        </span>
        <span style={{
          display: "block",
          fontFamily: "var(--f-brand)",
          fontSize: "1.1rem",
          color: "var(--green)",
          marginTop: 4,
          letterSpacing: "0.08em",
        }}>
          4765
        </span>
        {/* PLACEHOLDER: replace with copy from pinewoodrobotics.org */}
        <p style={{
          fontFamily: "var(--f-inter)",
          fontSize: "0.95rem",
          lineHeight: 1.65,
          color: "var(--text-2)",
          marginTop: 10,
        }}>
          Team 4765 Pinewood Robotics has competed in FIRST since 2013. We build competition robots, grow engineers, and push ourselves to win.
        </p>
      </div>

      {/* Subteams — PLACEHOLDER: update from pinewoodrobotics.org */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <SectionLabel>Subteams</SectionLabel>
        <Dept name="Software"  body="Robot code in Java/WPILib, custom vision pipeline in Rust + Python, and this dashboard." />
        <Dept name="Hardware"  body="Mechanical design, CNC fabrication, wiring, and pneumatics." />
        <Dept name="Business"  body="Grants, sponsorships, outreach events, and team operations." />
        <Dept name="Marketing" body="Social media, branding, and community engagement." />
      </div>

      {/* Links — PLACEHOLDER: verify URLs */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <SectionLabel>Links</SectionLabel>
        <LinkRow label="The Blue Alliance"    href="https://www.thebluealliance.com/team/4765" />
        <LinkRow label="GitHub"               href="https://github.com/Pinewood-Robotics" />
        <LinkRow label="pinewoodrobotics.org" href="https://www.pinewoodrobotics.org" />
      </div>
    </div>
  );
}
