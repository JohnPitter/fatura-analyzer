import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from 'remotion';

// ─── Shared styles ──────────────────────────────────────────────────────────

const BG = '#FEFDFB';
const INK_900 = '#1A1612';
const INK_400 = '#9C9389';
const INK_300 = '#B8B0A8';
const EMBER_500 = '#E8622C';
const EMBER_100 = '#FEF0E8';
const JADE_500 = '#2D8E5E';
const JADE_100 = '#EDFAF3';
const RUBY_500 = '#C43D3D';
const SKY_100 = '#EDF5FC';
const SKY_500 = '#2B7BB5';
const PLUM_100 = '#F5EDFC';
const PLUM_500 = '#7E44A8';
const SAND_200 = '#F5EDDC';

const font = `'DM Sans', 'Segoe UI', sans-serif`;
const mono = `'DM Mono', 'Consolas', monospace`;

// ─── Scene 1: Hero ──────────────────────────────────────────────────────────

const SceneHero: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12 } });
  const titleY = interpolate(frame, [8, 25], [60, 0], { extrapolateRight: 'clamp' });
  const titleOp = interpolate(frame, [8, 22], [0, 1], { extrapolateRight: 'clamp' });
  const subOp = interpolate(frame, [20, 35], [0, 1], { extrapolateRight: 'clamp' });
  const subY = interpolate(frame, [20, 35], [30, 0], { extrapolateRight: 'clamp' });
  const badgeOp = interpolate(frame, [40, 55], [0, 1], { extrapolateRight: 'clamp' });
  const badgeScale = spring({ frame: Math.max(0, frame - 40), fps, config: { damping: 10 } });

  return (
    <AbsoluteFill style={{ background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font }}>
      {/* Decorative circles */}
      <div style={{ position: 'absolute', top: -120, right: -120, width: 500, height: 500, borderRadius: '50%', background: EMBER_100, opacity: 0.5 }} />
      <div style={{ position: 'absolute', bottom: -80, left: -80, width: 350, height: 350, borderRadius: '50%', background: JADE_100, opacity: 0.4 }} />

      <div style={{ textAlign: 'center', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ transform: `scale(${logoScale})`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 100, height: 100, borderRadius: 24, background: INK_900, marginBottom: 32 }}>
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#FBF8F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 17V7" /><path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8" />
            <path d="M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z" />
          </svg>
        </div>

        {/* Title */}
        <div style={{ transform: `translateY(${titleY}px)`, opacity: titleOp }}>
          <h1 style={{ fontSize: 72, fontWeight: 700, color: INK_900, letterSpacing: -2, margin: 0, lineHeight: 1 }}>
            Fatura Analyzer
          </h1>
        </div>

        {/* Subtitle */}
        <div style={{ transform: `translateY(${subY}px)`, opacity: subOp, marginTop: 16 }}>
          <p style={{ fontSize: 28, color: INK_400, margin: 0, fontWeight: 400 }}>
            Analise suas faturas de cartao direto no navegador
          </p>
        </div>

        {/* Bank badges */}
        <div style={{ opacity: badgeOp, transform: `scale(${badgeScale})`, marginTop: 36, display: 'flex', gap: 16, justifyContent: 'center' }}>
          <span style={{ padding: '8px 24px', borderRadius: 12, background: EMBER_100, color: EMBER_500, fontSize: 22, fontWeight: 600 }}>Itau</span>
          <span style={{ padding: '8px 24px', borderRadius: 12, background: '#FEF0F0', color: RUBY_500, fontSize: 22, fontWeight: 600 }}>Bradesco</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 2: Features ──────────────────────────────────────────────────────

const SceneFeatures: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { icon: '📊', label: 'Categorias automaticas', color: EMBER_100, textColor: EMBER_500 },
    { icon: '👥', label: 'Dividir entre pessoas', color: PLUM_100, textColor: PLUM_500 },
    { icon: '📁', label: 'Exportar Excel e PDF', color: SKY_100, textColor: SKY_500 },
    { icon: '🔒', label: 'Historico criptografado', color: JADE_100, textColor: JADE_500 },
  ];

  const titleOp = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font }}>
      <div style={{ textAlign: 'center', width: '100%', padding: '0 100px' }}>
        <p style={{ fontSize: 18, color: INK_400, textTransform: 'uppercase', letterSpacing: 4, fontWeight: 600, marginBottom: 20, opacity: titleOp }}>
          Funcionalidades
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, maxWidth: 1000, margin: '0 auto' }}>
          {features.map((f, i) => {
            const delay = 10 + i * 12;
            const s = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 12 } });
            const op = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateRight: 'clamp' });
            return (
              <div key={i} style={{
                transform: `scale(${s})`, opacity: op,
                background: f.color, borderRadius: 20, padding: '32px 40px',
                display: 'flex', alignItems: 'center', gap: 20, textAlign: 'left',
              }}>
                <span style={{ fontSize: 48 }}>{f.icon}</span>
                <span style={{ fontSize: 28, fontWeight: 600, color: f.textColor }}>{f.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 3: Dashboard mockup ──────────────────────────────────────────────

const SceneDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardScale = spring({ frame, fps, config: { damping: 12 } });

  const categories = [
    { name: 'Supermercado', value: 'R$ 775,29', pct: 100, color: JADE_500 },
    { name: 'Tecnologia', value: 'R$ 591,01', pct: 76, color: SKY_500 },
    { name: 'Restaurante', value: 'R$ 311,49', pct: 40, color: EMBER_500 },
    { name: 'Educacao', value: 'R$ 218,88', pct: 28, color: PLUM_500 },
  ];

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: font, padding: 60 }}>
      {/* Header bar */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 40 }}>
        {[
          { label: 'Total da Fatura', value: 'R$ 10.569,96', color: INK_900 },
          { label: 'Meu Total', value: 'R$ 7.234,18', color: EMBER_500 },
          { label: 'Transacoes', value: '100', color: INK_900 },
        ].map((c, i) => {
          const s = spring({ frame: Math.max(0, frame - i * 5), fps, config: { damping: 12 } });
          return (
            <div key={i} style={{
              flex: 1, background: 'white', borderRadius: 16, padding: '28px 32px',
              border: `1px solid ${SAND_200}`, transform: `scale(${s})`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <p style={{ fontSize: 13, color: INK_400, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600, margin: 0 }}>{c.label}</p>
              <p style={{ fontSize: 36, fontWeight: 700, color: c.color, margin: '8px 0 0', fontFamily: mono, letterSpacing: -1 }}>{c.value}</p>
            </div>
          );
        })}
      </div>

      {/* Categories */}
      <div style={{ background: 'white', borderRadius: 16, padding: 32, border: `1px solid ${SAND_200}`, transform: `scale(${cardScale})` }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: INK_900, marginBottom: 24, margin: '0 0 24px' }}>Gastos por Categoria</p>
        {categories.map((cat, i) => {
          const delay = 15 + i * 8;
          const barW = interpolate(frame, [delay, delay + 20], [0, cat.pct], { extrapolateRight: 'clamp' });
          const op = interpolate(frame, [delay, delay + 8], [0, 1], { extrapolateRight: 'clamp' });
          return (
            <div key={i} style={{ marginBottom: 20, opacity: op }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 18, fontWeight: 500, color: INK_900 }}>{cat.name}</span>
                <span style={{ fontSize: 18, fontWeight: 700, fontFamily: mono, color: INK_900 }}>{cat.value}</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: SAND_200, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 4, background: cat.color, width: `${barW}%`, transition: 'none' }} />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 4: Privacy + CTA ─────────────────────────────────────────────────

const ScenePrivacy: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const shieldScale = spring({ frame, fps, config: { damping: 10, stiffness: 80 } });
  const textOp = interpolate(frame, [15, 30], [0, 1], { extrapolateRight: 'clamp' });
  const textY = interpolate(frame, [15, 30], [40, 0], { extrapolateRight: 'clamp' });
  const ctaScale = spring({ frame: Math.max(0, frame - 50), fps, config: { damping: 10 } });
  const ctaOp = interpolate(frame, [50, 65], [0, 1], { extrapolateRight: 'clamp' });

  const items = [
    'Nenhum dado e armazenado em servidores',
    'Processamento 100% no navegador',
    'Criptografia AES-256 para o historico',
  ];

  return (
    <AbsoluteFill style={{ background: INK_900, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font }}>
      {/* Gradient accent */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${EMBER_500}, ${JADE_500}, ${SKY_500})` }} />

      <div style={{ textAlign: 'center', zIndex: 1 }}>
        {/* Shield */}
        <div style={{ transform: `scale(${shieldScale})`, marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', width: 88, height: 88, borderRadius: 22, background: JADE_500, alignItems: 'center', justifyContent: 'center' }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
        </div>

        {/* Privacy items */}
        <div style={{ opacity: textOp, transform: `translateY(${textY}px)` }}>
          {items.map((item, i) => {
            const itemOp = interpolate(frame, [20 + i * 8, 30 + i * 8], [0, 1], { extrapolateRight: 'clamp' });
            return (
              <p key={i} style={{ fontSize: 24, color: '#E8DCC4', margin: '12px 0', opacity: itemOp, fontWeight: 400 }}>
                {item}
              </p>
            );
          })}
        </div>

        {/* CTA */}
        <div style={{ opacity: ctaOp, transform: `scale(${ctaScale})`, marginTop: 48 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            padding: '16px 40px', borderRadius: 16,
            background: EMBER_500, color: 'white',
            fontSize: 24, fontWeight: 600,
          }}>
            Experimente agora — e gratuito
          </div>
          <p style={{ fontSize: 16, color: INK_300, marginTop: 16 }}>
            johnpitter.github.io/fatura-analyzer
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Main composition ───────────────────────────────────────────────────────

export const PromoVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={105}>
        <SceneHero />
      </Sequence>
      <Sequence from={105} durationInFrames={105}>
        <SceneFeatures />
      </Sequence>
      <Sequence from={210} durationInFrames={120}>
        <SceneDashboard />
      </Sequence>
      <Sequence from={330} durationInFrames={120}>
        <ScenePrivacy />
      </Sequence>
    </AbsoluteFill>
  );
};
