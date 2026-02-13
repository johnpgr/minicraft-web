import React from 'react';

interface TitleScreenProps {
  onPlay: () => void;
}

const TitleScreen: React.FC<TitleScreenProps> = ({ onPlay }) => {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        imageRendering: 'pixelated',
      }}
    >
      <h1
        style={{
          fontSize: '64px',
          color: '#5aaf4c',
          textShadow: '4px 4px 0px #2d5a1e, -2px -2px 0px #7cc96e',
          letterSpacing: '4px',
          marginBottom: '8px',
          fontFamily: 'monospace',
        }}
      >
        MINICRAFT
      </h1>
      <p
        style={{
          color: '#808080',
          fontSize: '14px',
          marginBottom: '48px',
        }}
      >
        Protótipo Web — Explore, colete e crie!
      </p>
      <button
        onClick={onPlay}
        style={{
          padding: '16px 48px',
          fontSize: '24px',
          fontFamily: 'monospace',
          background: '#4a7c3f',
          color: '#fff',
          border: '4px solid #2d5a1e',
          cursor: 'pointer',
          letterSpacing: '2px',
          transition: 'transform 0.1s',
          imageRendering: 'pixelated',
        }}
        onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
        onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        ▶ PLAY
      </button>
      <div style={{ marginTop: '64px', color: '#555', fontSize: '12px', textAlign: 'center' }}>
        <p>WASD / Setas — Mover</p>
        <p>ESPAÇO — Coletar recurso</p>
        <p>C — Crafting</p>
      </div>
    </div>
  );
};

export default TitleScreen;
