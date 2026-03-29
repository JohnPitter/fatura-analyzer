import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
  Audio,
  staticFile,
} from 'remotion';

// ─── Design tokens (faithful to the real app) ──────────────────────────────

const BG = '#FEFDFB';
const INK_900 = '#1A1612';
const INK_800 = '#2D2720';
const INK_400 = '#9C9389';
const INK_300 = '#B8B0A8';
const EMBER_500 = '#E8622C';
const EMBER_400 = '#F07A48';
const EMBER_100 = '#FEF0E8';
const JADE_500 = '#2D8E5E';
const JADE_100 = '#EDFAF3';
const RUBY_500 = '#C43D3D';
const RUBY_100 = '#FEF0F0';
const SKY_500 = '#2B7BB5';
const SKY_100 = '#EDF5FC';
const PLUM_500 = '#7E44A8';
const PLUM_100 = '#F5EDFC';
const GOLD_500 = '#B8860B';
const GOLD_100 = '#FCF5E0';
const SAND_200 = '#F5EDDC';
const SAND_100 = '#FBF8F1';

const font = `'Segoe UI', 'DM Sans', system-ui, sans-serif`;
const mono = `'Consolas', 'DM Mono', monospace`;

// ─── Reusable receipt icon ──────────────────────────────────────────────────

const ReceiptIcon: React.FC<{ size: number; stroke: string }> = ({ size, stroke }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 17V7" /><path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8" />
    <path d="M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z" />
  </svg>
);

const ShieldIcon: React.FC<{ size: number; stroke: string }> = ({ size, stroke }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

// ─── Scene 1: Cinematic Hero Reveal (0-3s, 90 frames) ──────────────────────

const SceneHero: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade from black
  const blackOverlay = interpolate(frame, [0, 20], [1, 0], { extrapolateRight: 'clamp' });
  // Slow push-in on logo
  const logoScale = interpolate(frame, [0, 90], [0.9, 1], { extrapolateRight: 'clamp' });
  const logoSpring = spring({ frame: Math.max(0, frame - 5), fps, config: { damping: 15, stiffness: 60 } });
  // Light sweep
  const sweepX = interpolate(frame, [15, 50], [-400, 2400], { extrapolateRight: 'clamp' });
  // Title
  const titleOp = interpolate(frame, [18, 32], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [18, 32], [40, 0], { extrapolateRight: 'clamp' });
  // Subtitle
  const subOp = interpolate(frame, [32, 46], [0, 1], { extrapolateRight: 'clamp' });
  const subY = interpolate(frame, [32, 46], [24, 0], { extrapolateRight: 'clamp' });
  // Bank badges
  const badge1 = spring({ frame: Math.max(0, frame - 52), fps, config: { damping: 10 } });
  const badge2 = spring({ frame: Math.max(0, frame - 58), fps, config: { damping: 10 } });
  // Vignette
  const vignetteOp = interpolate(frame, [0, 30], [0.6, 0.15], { extrapolateRight: 'clamp' });
  // Particles
  const particleY = (i: number) => interpolate(frame, [0, 90], [800 + i * 30, -200 + i * 15], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: INK_900, fontFamily: font }}>
      {/* Gradient background */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 40%, ${INK_800} 0%, ${INK_900} 70%)` }} />

      {/* Floating particles */}
      {[0, 1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{
          position: 'absolute',
          left: 200 + i * 280,
          top: particleY(i),
          width: 3 + i % 3,
          height: 3 + i % 3,
          borderRadius: '50%',
          background: EMBER_500,
          opacity: 0.15 + (i % 3) * 0.1,
        }} />
      ))}

      {/* Light sweep */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0,
        left: sweepX, width: 200,
        background: `linear-gradient(90deg, transparent, rgba(232,98,44,0.06), transparent)`,
        transform: 'skewX(-15deg)',
      }} />

      {/* Center content */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        {/* Logo */}
        <div style={{
          transform: `scale(${logoScale * logoSpring})`,
          width: 110, height: 110, borderRadius: 28,
          background: `linear-gradient(135deg, ${EMBER_500}, ${EMBER_400})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 20px 60px rgba(232,98,44,0.3)`,
          marginBottom: 36,
        }}>
          <ReceiptIcon size={56} stroke="#fff" />
        </div>

        {/* Title */}
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)` }}>
          <h1 style={{ fontSize: 76, fontWeight: 700, color: '#fff', letterSpacing: -3, margin: 0, lineHeight: 1 }}>
            Fatura <span style={{ color: EMBER_400 }}>Analyzer</span>
          </h1>
        </div>

        {/* Subtitle */}
        <div style={{ opacity: subOp, transform: `translateY(${subY}px)`, marginTop: 14 }}>
          <p style={{ fontSize: 26, color: INK_300, margin: 0, fontWeight: 300, letterSpacing: 0.5 }}>
            Suas faturas de cartao, organizadas em segundos
          </p>
        </div>

        {/* Bank badges */}
        <div style={{ display: 'flex', gap: 14, marginTop: 40 }}>
          <div style={{ transform: `scale(${badge1})`, padding: '10px 28px', borderRadius: 14, background: 'rgba(232,98,44,0.15)', border: '1px solid rgba(232,98,44,0.3)' }}>
            <span style={{ fontSize: 20, fontWeight: 600, color: EMBER_400 }}>Itau</span>
          </div>
          <div style={{ transform: `scale(${badge2})`, padding: '10px 28px', borderRadius: 14, background: 'rgba(196,61,61,0.15)', border: '1px solid rgba(196,61,61,0.3)' }}>
            <span style={{ fontSize: 20, fontWeight: 600, color: '#F08A8A' }}>Bradesco</span>
          </div>
        </div>
      </div>

      {/* Vignette */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse, transparent 50%, rgba(0,0,0,${vignetteOp}) 100%)`, pointerEvents: 'none' }} />

      {/* Black fade in */}
      <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: blackOverlay, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};

// ─── Scene 2: Upload + Categories Reveal (3-6.5s, 105 frames) ──────────────

const SceneUpload: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // PDF dropping animation
  const pdfY = interpolate(frame, [0, 18], [-120, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const pdfOp = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const pdfScale = spring({ frame: Math.max(0, frame - 14), fps, config: { damping: 12 } });

  // Arrow
  const arrowOp = interpolate(frame, [22, 32], [0, 1], { extrapolateRight: 'clamp' });
  const arrowX = interpolate(frame, [22, 35], [-20, 0], { extrapolateRight: 'clamp' });

  // Category cards stagger
  const categories = [
    { name: 'Supermercado', emoji: '🛒', value: 'R$ 775', color: JADE_500, bg: JADE_100 },
    { name: 'Tecnologia', emoji: '💻', value: 'R$ 591', color: SKY_500, bg: SKY_100 },
    { name: 'Restaurante', emoji: '🍽', value: 'R$ 311', color: EMBER_500, bg: EMBER_100 },
    { name: 'Educacao', emoji: '🎓', value: 'R$ 218', color: PLUM_500, bg: PLUM_100 },
    { name: 'Farmacia', emoji: '💊', value: 'R$ 224', color: JADE_500, bg: JADE_100 },
    { name: 'Vestuario', emoji: '👕', value: 'R$ 147', color: PLUM_500, bg: PLUM_100 },
  ];

  // Heading
  const headOp = interpolate(frame, [5, 18], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: font }}>
      {/* Subtle grid pattern */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: `repeating-linear-gradient(0deg, ${INK_900} 0 1px, transparent 1px 60px), repeating-linear-gradient(90deg, ${INK_900} 0 1px, transparent 1px 60px)` }} />

      <div style={{ display: 'flex', alignItems: 'center', height: '100%', padding: '0 100px', gap: 80 }}>
        {/* Left: PDF upload mockup */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: 14, color: INK_400, textTransform: 'uppercase', letterSpacing: 4, fontWeight: 600, marginBottom: 28, opacity: headOp }}>
            Faca upload do PDF
          </p>
          <div style={{
            opacity: pdfOp, transform: `translateY(${pdfY}px) scale(${pdfScale})`,
            width: 320, padding: '40px 32px', borderRadius: 24,
            border: `2px dashed ${SAND_200}`, background: 'white',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            boxShadow: '0 8px 40px rgba(0,0,0,0.04)',
          }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: EMBER_100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 32 }}>📄</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 600, color: INK_900, margin: '0 0 4px' }}>BradescoFatura.pdf</p>
              <p style={{ fontSize: 13, color: INK_400, margin: 0 }}>FaturaItau.pdf</p>
            </div>
            <div style={{ padding: '10px 32px', borderRadius: 12, background: INK_900, color: '#fff', fontSize: 14, fontWeight: 600 }}>
              Processar faturas
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div style={{ opacity: arrowOp, transform: `translateX(${arrowX}px)`, fontSize: 48, color: EMBER_500 }}>
          →
        </div>

        {/* Right: Category results */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, color: INK_400, textTransform: 'uppercase', letterSpacing: 4, fontWeight: 600, marginBottom: 20, opacity: headOp }}>
            Resultado instantaneo
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {categories.map((cat, i) => {
              const delay = 30 + i * 8;
              const s = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 14 } });
              const op = interpolate(frame, [delay, delay + 8], [0, 1], { extrapolateRight: 'clamp' });
              return (
                <div key={i} style={{
                  transform: `scale(${s})`, opacity: op,
                  background: cat.bg, borderRadius: 16, padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  border: `1px solid ${SAND_200}`,
                }}>
                  <span style={{ fontSize: 28 }}>{cat.emoji}</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: cat.color, margin: 0 }}>{cat.name}</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: INK_900, margin: 0, fontFamily: mono }}>{cat.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 3: Real Dashboard (6.5-10s, 105 frames) ─────────────────────────

const SceneDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const categories = [
    { name: 'Financeiro', value: 'R$ 1.432,08', pct: 100, color: RUBY_500, bg: RUBY_100, count: '24x' },
    { name: 'Supermercado', value: 'R$ 775,29', pct: 54, color: JADE_500, bg: JADE_100, count: '6x' },
    { name: 'Tecnologia', value: 'R$ 591,01', pct: 41, color: SKY_500, bg: SKY_100, count: '8x' },
    { name: 'Educacao', value: 'R$ 504,44', pct: 35, color: PLUM_500, bg: PLUM_100, count: '9x' },
    { name: 'Assinaturas', value: 'R$ 482,90', pct: 33, color: PLUM_500, bg: PLUM_100, count: '7x' },
  ];

  const txRows = [
    { date: '01/03', desc: 'ATACAREJO PAULISTA', cat: 'Supermercado', value: 'R$ 326,05', bank: 'Bradesco', parcela: '' },
    { date: '13/03', desc: 'CLAUDE.AI SUBSCRIPTION', cat: 'Tecnologia', value: 'R$ 591,01', bank: 'Itau', parcela: '' },
    { date: '12/11', desc: 'PICPAY*Joao Pedro', cat: 'Financeiro', value: 'R$ 1.544,55', bank: 'Bradesco', parcela: '05/12' },
    { date: '03/03', desc: 'FELIX E CAVALCANTI', cat: 'Supermercado', value: 'R$ 204,62', bank: 'Bradesco', parcela: '' },
    { date: '07/03', desc: 'VERDAO', cat: 'Supermercado', value: 'R$ 138,28', bank: 'Bradesco', parcela: '' },
  ];

  // Panel slide-in
  const panelX = interpolate(frame, [0, 20], [-400, 0], { extrapolateRight: 'clamp' });
  const panelOp = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  // Table slide-in
  const tableX = interpolate(frame, [8, 28], [100, 0], { extrapolateRight: 'clamp' });
  const tableOp = interpolate(frame, [8, 22], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: font }}>
      {/* Top bar (mimics the real header) */}
      <div style={{ height: 56, background: 'rgba(254,253,251,0.9)', borderBottom: `1px solid ${SAND_200}`, display: 'flex', alignItems: 'center', padding: '0 32px', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: INK_900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ReceiptIcon size={18} stroke={SAND_100} />
        </div>
        <span style={{ fontSize: 16, fontWeight: 600, color: INK_900 }}>Fatura Analyzer</span>
        <div style={{ flex: 1 }} />
        <div style={{ padding: '6px 16px', borderRadius: 8, background: JADE_100, fontSize: 11, color: JADE_500, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldIcon size={12} stroke={JADE_500} /> Privacidade
        </div>
        <div style={{ padding: '6px 16px', borderRadius: 8, background: SAND_200, fontSize: 11, color: INK_800, fontWeight: 600 }}>Exportar ▾</div>
        <div style={{ padding: '6px 16px', borderRadius: 8, background: SAND_200, fontSize: 11, color: INK_800, fontWeight: 600 }}>Dividir gastos</div>
        <div style={{ padding: '6px 16px', borderRadius: 8, background: EMBER_500, fontSize: 11, color: '#fff', fontWeight: 600 }}>Upload PDF</div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 16, padding: '20px 32px' }}>
        {[
          { label: 'TOTAL DA FATURA', value: 'R$ 10.569,96', color: INK_900 },
          { label: 'MEU TOTAL (PESSOAL)', value: 'R$ 7.234,18', color: EMBER_500 },
          { label: 'CATEGORIAS', value: '16', color: INK_900 },
          { label: 'POR BANCO', extra: true },
        ].map((c, i) => {
          const s = spring({ frame: Math.max(0, frame - i * 4), fps, config: { damping: 14 } });
          return (
            <div key={i} style={{
              flex: 1, background: 'white', borderRadius: 14, padding: '18px 22px',
              border: `1px solid ${SAND_200}`, transform: `scale(${s})`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}>
              {c.extra ? (
                <>
                  <p style={{ fontSize: 10, color: INK_400, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600, margin: '0 0 10px' }}>POR BANCO</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ flex: 1, padding: '6px', borderRadius: 8, background: INK_900, color: '#fff', fontSize: 11, fontWeight: 600, textAlign: 'center' }}>Todos</div>
                    <div style={{ flex: 1, padding: '6px', borderRadius: 8, background: SAND_100, color: INK_400, fontSize: 11, fontWeight: 600, textAlign: 'center' }}>Itau</div>
                    <div style={{ flex: 1, padding: '6px', borderRadius: 8, background: SAND_100, color: INK_400, fontSize: 11, fontWeight: 600, textAlign: 'center' }}>Bradesco</div>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 10, color: INK_400, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600, margin: 0 }}>{c.label}</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: c.color, margin: '4px 0 0', fontFamily: mono, letterSpacing: -1 }}>{c.value}</p>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* 2-column layout */}
      <div style={{ display: 'flex', gap: 20, padding: '0 32px', flex: 1 }}>
        {/* Left: Categories panel */}
        <div style={{
          width: 380, background: 'white', borderRadius: 14, padding: 20,
          border: `1px solid ${SAND_200}`,
          transform: `translateX(${panelX}px)`, opacity: panelOp,
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: INK_900, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>📊</span> Gastos por Categoria
          </p>
          {categories.map((cat, i) => {
            const delay = 15 + i * 7;
            const barW = interpolate(frame, [delay, delay + 18], [0, cat.pct], { extrapolateRight: 'clamp' });
            const op = interpolate(frame, [delay, delay + 6], [0, 1], { extrapolateRight: 'clamp' });
            return (
              <div key={i} style={{ marginBottom: 14, opacity: op }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: cat.color }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: INK_900 }}>{cat.name}</span>
                    <span style={{ fontSize: 10, color: INK_400 }}>{cat.count}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: mono, color: INK_900 }}>{cat.value}</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: SAND_200, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, background: `${cat.color}99`, width: `${barW}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Transaction table */}
        <div style={{
          flex: 1, background: 'white', borderRadius: 14,
          border: `1px solid ${SAND_200}`,
          transform: `translateX(${tableX}px)`, opacity: tableOp,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${SAND_200}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: INK_900, margin: 0 }}>Transacoes (100)</p>
            <div style={{ padding: '4px 12px', borderRadius: 8, border: `1px solid ${SAND_200}`, fontSize: 11, color: INK_400 }}>🔍 Buscar descricao...</div>
          </div>
          {/* Header row */}
          <div style={{ display: 'flex', padding: '10px 20px', background: SAND_100, fontSize: 10, color: INK_400, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5 }}>
            <span style={{ width: 60 }}>Data</span>
            <span style={{ flex: 1 }}>Descricao</span>
            <span style={{ width: 110 }}>Categoria</span>
            <span style={{ width: 100, textAlign: 'right' }}>Valor</span>
            <span style={{ width: 70, textAlign: 'center' }}>Dividir</span>
          </div>
          {/* Data rows */}
          {txRows.map((row, i) => {
            const delay = 25 + i * 6;
            const rowOp = interpolate(frame, [delay, delay + 6], [0, 1], { extrapolateRight: 'clamp' });
            const rowY = interpolate(frame, [delay, delay + 8], [12, 0], { extrapolateRight: 'clamp' });
            return (
              <div key={i} style={{
                display: 'flex', padding: '12px 20px', alignItems: 'center',
                borderBottom: `1px solid ${SAND_100}`,
                opacity: rowOp, transform: `translateY(${rowY}px)`,
              }}>
                <span style={{ width: 60, fontSize: 12, color: INK_400, fontFamily: mono }}>{row.date}</span>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: INK_900 }}>{row.desc}</span>
                  {row.parcela && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: SKY_100, color: SKY_500, fontFamily: mono, fontWeight: 600 }}>{row.parcela}</span>}
                  <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: row.bank === 'Itau' ? EMBER_100 : RUBY_100, color: row.bank === 'Itau' ? EMBER_500 : RUBY_500, fontWeight: 600 }}>{row.bank}</span>
                </div>
                <span style={{ width: 110, fontSize: 10, padding: '3px 8px', borderRadius: 6, background: JADE_100, color: JADE_500, fontWeight: 600, textAlign: 'center' }}>{row.cat}</span>
                <span style={{ width: 100, fontSize: 13, fontWeight: 700, fontFamily: mono, color: INK_900, textAlign: 'right' }}>{row.value}</span>
                <span style={{ width: 70, textAlign: 'center', fontSize: 12, fontFamily: mono, color: INK_400 }}>1</span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 4: Split + Export Features (10-13s, 90 frames) ───────────────────

const SceneFeatures: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { icon: '👥', title: 'Dividir gastos', desc: 'Atribua despesas a pessoas ou divida igualmente', color: PLUM_500, bg: PLUM_100 },
    { icon: '📊', title: 'Exportar Excel e PDF', desc: 'Relatorio completo com totais por pessoa', color: SKY_500, bg: SKY_100 },
    { icon: '🔒', title: 'Historico criptografado', desc: 'AES-256 salvo no navegador com sua senha', color: JADE_500, bg: JADE_100 },
    { icon: '📝', title: 'Observacoes e parcelas', desc: 'Adicione notas e veja parcelas de cada gasto', color: GOLD_500, bg: GOLD_100 },
  ];

  const headOp = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const headY = interpolate(frame, [0, 12], [20, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: font, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', width: '100%', padding: '0 120px' }}>
        <div style={{ opacity: headOp, transform: `translateY(${headY}px)`, marginBottom: 40 }}>
          <p style={{ fontSize: 14, color: EMBER_500, textTransform: 'uppercase', letterSpacing: 4, fontWeight: 600, margin: '0 0 8px' }}>Tudo que voce precisa</p>
          <h2 style={{ fontSize: 44, fontWeight: 700, color: INK_900, margin: 0, letterSpacing: -1 }}>Controle total dos seus gastos</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 1100, margin: '0 auto' }}>
          {features.map((f, i) => {
            const delay = 12 + i * 10;
            const s = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 14 } });
            const op = interpolate(frame, [delay, delay + 8], [0, 1], { extrapolateRight: 'clamp' });
            return (
              <div key={i} style={{
                transform: `scale(${s})`, opacity: op,
                background: 'white', borderRadius: 20, padding: '28px 32px',
                display: 'flex', alignItems: 'flex-start', gap: 20, textAlign: 'left',
                border: `1px solid ${SAND_200}`, boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
              }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
                  {f.icon}
                </div>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 600, color: f.color, margin: '0 0 4px' }}>{f.title}</p>
                  <p style={{ fontSize: 15, color: INK_400, margin: 0, lineHeight: 1.4 }}>{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 5: Privacy + CTA (13-15s, 60 frames) ────────────────────────────

const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const shieldScale = spring({ frame, fps, config: { damping: 12, stiffness: 60 } });
  const textOp = interpolate(frame, [10, 22], [0, 1], { extrapolateRight: 'clamp' });
  const textY = interpolate(frame, [10, 22], [30, 0], { extrapolateRight: 'clamp' });
  const ctaScale = spring({ frame: Math.max(0, frame - 28), fps, config: { damping: 10 } });
  const ctaOp = interpolate(frame, [28, 38], [0, 1], { extrapolateRight: 'clamp' });
  // Glow pulse
  const glowOp = interpolate(frame, [35, 45, 55, 60], [0, 0.4, 0, 0.3], { extrapolateRight: 'clamp' });
  // Fade out
  const fadeOut = interpolate(frame, [50, 60], [1, 0.9], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: INK_900, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font, opacity: fadeOut }}>
      {/* Gradient accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${EMBER_500}, ${JADE_500}, ${SKY_500}, ${PLUM_500})` }} />

      {/* Subtle radial glow */}
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, rgba(232,98,44,0.08), transparent)`, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />

      <div style={{ textAlign: 'center', zIndex: 1 }}>
        {/* Shield + lock */}
        <div style={{ transform: `scale(${shieldScale})`, marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', width: 80, height: 80, borderRadius: 22, background: JADE_500, alignItems: 'center', justifyContent: 'center', boxShadow: `0 12px 40px rgba(45,142,94,0.3)` }}>
            <ShieldIcon size={40} stroke="white" />
          </div>
        </div>

        <div style={{ opacity: textOp, transform: `translateY(${textY}px)` }}>
          <h2 style={{ fontSize: 40, fontWeight: 700, color: '#fff', margin: '0 0 8px', letterSpacing: -1 }}>
            100% privado. 100% gratuito.
          </h2>
          <p style={{ fontSize: 20, color: INK_300, margin: 0 }}>
            Nenhum dado sai do seu navegador. Nunca.
          </p>
        </div>

        {/* CTA */}
        <div style={{ opacity: ctaOp, transform: `scale(${ctaScale})`, marginTop: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            padding: '16px 48px', borderRadius: 16,
            background: `linear-gradient(135deg, ${EMBER_500}, ${EMBER_400})`,
            color: 'white', fontSize: 22, fontWeight: 600,
            boxShadow: `0 8px 32px rgba(232,98,44,${0.3 + glowOp})`,
          }}>
            Experimente agora
          </div>
          <p style={{ fontSize: 18, color: INK_400, marginTop: 16, fontFamily: mono }}>
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
      {/* Background music */}
      <Audio src={staticFile('bgm.mp3')} volume={0.7} />

      <Sequence from={0} durationInFrames={90}>
        <SceneHero />
      </Sequence>
      <Sequence from={90} durationInFrames={105}>
        <SceneUpload />
      </Sequence>
      <Sequence from={195} durationInFrames={105}>
        <SceneDashboard />
      </Sequence>
      <Sequence from={300} durationInFrames={90}>
        <SceneFeatures />
      </Sequence>
      <Sequence from={390} durationInFrames={60}>
        <SceneCTA />
      </Sequence>
    </AbsoluteFill>
  );
};
