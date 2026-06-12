import type { CSSProperties } from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { ScreenPresetId } from "./screen-presets";

export type FirstCompositionProps = {
  screenPreset: ScreenPresetId;
  badge: string;
  title: string;
  subtitle: string;
  metricLabel: string;
  metricValue: string;
  footer: string;
};

export const defaultFirstCompositionProps: FirstCompositionProps = {
  screenPreset: "9x16",
  badge: "New App",
  title: "Build serious tools faster.",
  subtitle:
    "A clean React + TypeScript workspace for planning, building and rendering video-driven products.",
  metricLabel: "Project status",
  metricValue: "Ready",
  footer: "React · TypeScript · Remotion",
};

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const colors = {
  bg: "#f8fafc",
  panel: "#ffffff",
  text: "#111827",
  muted: "#64748b",
  border: "#e5e7eb",
  indigo: "#4f46e5",
  indigoSoft: "#eef2ff",
  dark: "#111827",
};

export function FirstComposition({
  screenPreset,
  badge,
  title,
  subtitle,
  metricLabel,
  metricValue,
  footer,
}: FirstCompositionProps) {
  const { durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const heroDuration = Math.round(durationInFrames * 0.38);
  const workflowDuration = Math.round(durationInFrames * 0.38);
  const finalDuration = durationInFrames - heroDuration - workflowDuration;

  const workflowStart = heroDuration;
  const finalStart = heroDuration + workflowDuration;

  const outroOpacity = interpolate(
    frame,
    [durationInFrames - 18, durationInFrames - 1],
    [1, 0],
    clamp,
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        overflow: "hidden",
        opacity: outroOpacity,
      }}
    >
      <BackgroundGrid />

      <Sequence durationInFrames={heroDuration}>
        <HeroScene badge={badge} title={title} subtitle={subtitle} />
      </Sequence>

      <Sequence from={workflowStart} durationInFrames={workflowDuration}>
        <WorkflowScene metricLabel={metricLabel} metricValue={metricValue} />
      </Sequence>

      <Sequence from={finalStart} durationInFrames={finalDuration}>
        <FinalScene title="Ready to build" footer={footer} />
      </Sequence>
    </AbsoluteFill>
  );
}

function BackgroundGrid() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          opacity: 0.45,
        }}
      />

      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          borderRadius: "50%",
          right: -180,
          top: -180,
          background:
            "radial-gradient(circle, rgba(79,70,229,0.22), rgba(79,70,229,0))",
        }}
      />

      <div
        style={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          left: -150,
          bottom: -180,
          background:
            "radial-gradient(circle, rgba(99,102,241,0.16), rgba(99,102,241,0))",
        }}
      />
    </>
  );
}

type HeroSceneProps = {
  badge: string;
  title: string;
  subtitle: string;
};

function HeroScene({ badge, title, subtitle }: HeroSceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const heroSpring = spring({
    frame,
    fps,
    config: {
      damping: 18,
      stiffness: 120,
    },
  });

  const titleY = interpolate(heroSpring, [0, 1], [42, 0], clamp);
  const mockupX = interpolate(heroSpring, [0, 1], [90, 0], clamp);

  const subtitleOpacity = interpolate(frame, [28, 48], [0, 1], clamp);
  const footerOpacity = interpolate(frame, [58, 76], [0, 1], clamp);

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 76,
          top: 74,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: colors.dark,
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontSize: 18,
            fontWeight: 800,
            boxShadow: "0 18px 50px rgba(15,23,42,0.16)",
          }}
        >
          ✦
        </div>

        <div
          style={{
            padding: "8px 13px",
            borderRadius: 999,
            background: colors.indigoSoft,
            color: colors.indigo,
            border: `1px solid #dbe2ff`,
            fontSize: 17,
            fontWeight: 700,
          }}
        >
          {badge}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 76,
          top: 178,
          width: 560,
          transform: `translateY(${titleY}px)`,
          opacity: heroSpring,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 78,
            lineHeight: 0.96,
            letterSpacing: -3.6,
            fontWeight: 800,
            color: colors.text,
          }}
        >
          {title}
        </h1>

        <p
          style={{
            margin: "28px 0 0",
            fontSize: 25,
            lineHeight: 1.4,
            color: colors.muted,
            opacity: subtitleOpacity,
          }}
        >
          {subtitle}
        </p>

        <div
          style={{
            marginTop: 34,
            display: "flex",
            gap: 14,
            opacity: footerOpacity,
          }}
        >
          <div style={primaryButtonStyle}>Start building</div>
          <div style={secondaryButtonStyle}>View studio</div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          right: 74,
          top: 132,
          width: 500,
          height: 430,
          transform: `translateX(${mockupX}px)`,
          opacity: heroSpring,
        }}
      >
        <DashboardMockup />
      </div>
    </AbsoluteFill>
  );
}

function DashboardMockup() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 28,
        border: `1px solid ${colors.border}`,
        background: "rgba(255,255,255,0.86)",
        boxShadow: "0 30px 90px rgba(15,23,42,0.16)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 54,
          borderBottom: `1px solid ${colors.border}`,
          display: "flex",
          alignItems: "center",
          padding: "0 18px",
          gap: 8,
        }}
      >
        <Dot color="#ef4444" />
        <Dot color="#f59e0b" />
        <Dot color="#22c55e" />
        <div
          style={{
            marginLeft: 14,
            height: 12,
            width: 170,
            borderRadius: 999,
            background: "#eef2f7",
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "140px 1fr",
          height: "calc(100% - 54px)",
        }}
      >
        <div
          style={{
            borderRight: `1px solid ${colors.border}`,
            padding: 16,
          }}
        >
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              style={{
                height: 34,
                borderRadius: 10,
                background: item === 0 ? colors.indigoSoft : "#f1f5f9",
                marginBottom: 10,
              }}
            />
          ))}
        </div>

        <div style={{ padding: 20 }}>
          <div
            style={{
              height: 82,
              borderRadius: 18,
              background: colors.dark,
              marginBottom: 16,
              padding: 18,
              color: "#fff",
            }}
          >
            <div
              style={{
                width: 170,
                height: 12,
                borderRadius: 999,
                background: "rgba(255,255,255,0.34)",
                marginBottom: 16,
              }}
            />
            <div
              style={{
                width: 260,
                height: 18,
                borderRadius: 999,
                background: "rgba(255,255,255,0.74)",
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
            }}
          >
            <MiniCard />
            <MiniCard />
            <MiniCard wide />
            <MiniCard />
          </div>
        </div>
      </div>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <div
      style={{
        width: 11,
        height: 11,
        borderRadius: "50%",
        background: color,
      }}
    />
  );
}

function MiniCard({ wide = false }: { wide?: boolean }) {
  return (
    <div
      style={{
        height: wide ? 96 : 82,
        borderRadius: 18,
        border: `1px solid ${colors.border}`,
        background: "#fff",
        padding: 14,
      }}
    >
      <div
        style={{
          width: "62%",
          height: 10,
          borderRadius: 999,
          background: "#e2e8f0",
          marginBottom: 12,
        }}
      />
      <div
        style={{
          width: "38%",
          height: 20,
          borderRadius: 999,
          background: colors.indigoSoft,
        }}
      />
    </div>
  );
}

function WorkflowScene({
  metricLabel,
  metricValue,
}: {
  metricLabel: string;
  metricValue: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], clamp);
  const lineProgress = interpolate(frame, [26, 74], [0, 1], clamp);

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 76,
          top: 68,
          opacity: titleOpacity,
        }}
      >
        <div
          style={{
            color: colors.indigo,
            fontSize: 18,
            fontWeight: 800,
            marginBottom: 12,
          }}
        >
          Workflow
        </div>

        <h2
          style={{
            margin: 0,
            width: 740,
            fontSize: 58,
            letterSpacing: -2.4,
            lineHeight: 1,
            fontWeight: 800,
          }}
        >
          From idea to video workspace.
        </h2>
      </div>

      <div
        style={{
          position: "absolute",
          left: 84,
          right: 84,
          top: 300,
          height: 4,
          borderRadius: 999,
          background: "#e2e8f0",
        }}
      >
        <div
          style={{
            width: `${lineProgress * 100}%`,
            height: "100%",
            borderRadius: 999,
            background: colors.indigo,
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: 76,
          right: 76,
          top: 214,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 22,
        }}
      >
        <WorkflowCard
          index={1}
          title="Plan"
          text="Structure the app before writing heavy code."
          frame={frame}
          fps={fps}
        />
        <WorkflowCard
          index={2}
          title="Build"
          text="Create React screens and Remotion compositions."
          frame={frame}
          fps={fps}
        />
        <WorkflowCard
          index={3}
          title="Render"
          text="Prepare export flow after the video logic is stable."
          frame={frame}
          fps={fps}
        />
      </div>

      <div
        style={{
          position: "absolute",
          right: 76,
          bottom: 70,
          width: 320,
        }}
      >
        <MetricCard
          frame={frame}
          fps={fps}
          label={metricLabel}
          value={metricValue}
        />
      </div>
    </AbsoluteFill>
  );
}

function WorkflowCard({
  index,
  title,
  text,
  frame,
  fps,
}: {
  index: number;
  title: string;
  text: string;
  frame: number;
  fps: number;
}) {
  const entrance = spring({
    frame: frame - index * 8,
    fps,
    config: {
      damping: 18,
      stiffness: 110,
    },
  });

  const y = interpolate(entrance, [0, 1], [36, 0], clamp);

  return (
    <div
      style={{
        height: 190,
        borderRadius: 26,
        border: `1px solid ${colors.border}`,
        background: "#fff",
        boxShadow: "0 22px 70px rgba(15,23,42,0.08)",
        padding: 26,
        opacity: entrance,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 16,
          display: "grid",
          placeItems: "center",
          background: colors.indigoSoft,
          color: colors.indigo,
          fontSize: 20,
          fontWeight: 800,
          marginBottom: 22,
        }}
      >
        {index}
      </div>

      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: -0.8,
          marginBottom: 10,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 18,
          lineHeight: 1.45,
          color: colors.muted,
        }}
      >
        {text}
      </div>
    </div>
  );
}

function MetricCard({
  frame,
  fps,
  label,
  value,
}: {
  frame: number;
  fps: number;
  label: string;
  value: string;
}) {
  const entrance = spring({
    frame: frame - 48,
    fps,
    config: {
      damping: 16,
      stiffness: 120,
    },
  });

  const y = interpolate(entrance, [0, 1], [40, 0], clamp);

  return (
    <div
      style={{
        borderRadius: 24,
        background: colors.dark,
        color: "#fff",
        padding: 24,
        boxShadow: "0 24px 80px rgba(15,23,42,0.22)",
        opacity: entrance,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          color: "rgba(255,255,255,0.62)",
          fontSize: 17,
          marginBottom: 10,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 44,
          fontWeight: 900,
          letterSpacing: -1.8,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function FinalScene({ title, footer }: { title: string; footer: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({
    frame,
    fps,
    config: {
      damping: 14,
      stiffness: 120,
    },
  });

  const titleOpacity = interpolate(frame, [14, 30], [0, 1], clamp);
  const footerOpacity = interpolate(frame, [30, 46], [0, 1], clamp);

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 94,
          height: 94,
          borderRadius: 28,
          background: colors.dark,
          color: "#fff",
          display: "grid",
          placeItems: "center",
          fontSize: 42,
          fontWeight: 900,
          transform: `scale(${logoSpring})`,
          boxShadow: "0 30px 90px rgba(15,23,42,0.2)",
        }}
      >
        ✦
      </div>

      <h2
        style={{
          margin: "30px 0 0",
          fontSize: 72,
          lineHeight: 1,
          letterSpacing: -3,
          opacity: titleOpacity,
        }}
      >
        {title}
      </h2>

      <p
        style={{
          margin: "22px 0 0",
          fontSize: 24,
          color: colors.muted,
          opacity: footerOpacity,
        }}
      >
        {footer}
      </p>
    </AbsoluteFill>
  );
}

const primaryButtonStyle: CSSProperties = {
  height: 52,
  padding: "0 24px",
  borderRadius: 14,
  background: colors.indigo,
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 17,
  fontWeight: 800,
  boxShadow: "0 18px 50px rgba(79,70,229,0.24)",
};

const secondaryButtonStyle: CSSProperties = {
  height: 52,
  padding: "0 24px",
  borderRadius: 14,
  background: "#fff",
  color: colors.text,
  border: `1px solid ${colors.border}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 17,
  fontWeight: 800,
};
