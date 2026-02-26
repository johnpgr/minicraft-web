# Minicraft — Protótipo Web com Three.js + Pixel Art 2D

## Visão Geral

Protótipo MVP do Minicraft (Notch, 2011) usando Three.js para renderizar sprites 2D em um mundo top-down com geração procedural. O jogador pode se movimentar, explorar, coletar recursos e realizar crafting básico.

---

## 1. Tela Inicial

- Tela de título estilo pixel art com o nome "Minicraft"
- Botão "Play" para iniciar o jogo
- Visual minimalista/retro combinando com a estética do jogo original

## 2. Mundo e Mapa Procedural

- Geração de mapa top-down usando noise simples (Perlin/Simplex)
- Tiles de terreno: **grama, areia, água, pedra, árvores**
- Mapa com tamanho fixo (~64x64 tiles) gerado aleatoriamente a cada novo jogo
- Renderizado com Three.js usando sprites/planos com texturas pixel art
- Câmera ortográfica seguindo o jogador

## 3. Personagem e Movimentação

- Sprite pixel art do jogador com animações simples (idle, andando em 4 direções)
- Movimento via teclado (WASD ou setas)
- Colisão com tiles sólidos (água, pedras grandes)

## 4. Coleta de Recursos

- 2 recursos coletáveis: **Madeira** (de árvores) e **Pedra** (de rochas)
- Interação ao pressionar tecla de ação perto do recurso
- Feedback visual ao coletar (tile muda/desaparece, partículas simples)
- Inventário simples exibido como HUD no canto da tela

## 5. Crafting Básico

- Menu de crafting acessível por tecla (ex: C)
- 2-3 receitas simples:
    - **Picareta de madeira** (madeira × 5)
    - **Espada de madeira** (madeira × 3 + pedra × 2)
    - **Bancada de trabalho** (madeira × 10)
- Itens craftados aparecem no inventário e podem ser equipados

## 6. HUD / Interface

- Barra de vida do jogador
- Inventário com ícones pixel art dos itens e quantidades
- Indicador do item equipado atualmente
- Estilo visual pixel art consistente com o jogo

## 7. Assets Visuais

- Sprites pixel art simples (16x16 ou 32x32) criados programaticamente via canvas ou inline
- Paleta de cores limitada para manter a estética retro/game jam
- Renderização com `image-rendering: pixelated` para manter nitidez

---

**Stack técnica:** React + Three.js (@react-three/fiber) com câmera ortográfica, sprites como planos texturizados, e lógica de jogo no game loop do Three.js.
