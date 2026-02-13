import React, { useState } from 'react';
import TitleScreen from '@/components/game/TitleScreen';
import GameCanvas from '@/components/game/GameCanvas';

const Index = () => {
  const [started, setStarted] = useState(false);

  if (!started) {
    return <TitleScreen onPlay={() => setStarted(true)} />;
  }

  return <GameCanvas />;
};

export default Index;
