# 🎮 ATIVIDADE 2 – Análise e Evolução do Game Criado por IA

> **Regras importantes**
> - **Não olhar código.**
> - A análise deve ser feita **apenas jogando**.
> - Compare: **jogo original escolhido** vs **jogo recriado com IA (Lovable ou similar)**.

## Alunos

- João Paulo Greidinger dos Reis
- Bernardo Neto da Silva Santos
- Paulo Renan Santana de Almeida
- Igor Neves de Souza

---

## ✅ Identificação

- **Nome do jogo original:**  
  Minicraft

- **Plataforma do jogo original (ex: browser/PC/mobile/console):**  
  PC

- **Link do jogo criado pela IA (primeira versão):**  
  https://minicraft-clone-prototype.lovable.app/ 

- **Ferramenta de IA utilizada (ex: Lovable):**  
  Lovable

- **Data da análise:**  
  2026-02-25

---

# 📌 PARTE 1 – Análise do Jogo Criado pela IA (sem olhar código)

## 1️⃣ Mecânica (Gameplay)

- **As regras estão funcionando?**  
  Não

- **Existe sistema de vitória/derrota?**  
  Não

- **A dificuldade está equilibrada?**  
  Não

- **Existem fases ou progressão?**  
  Não

---

## 2️⃣ Dinâmica

- **O jogo é divertido?**  
  Não

- **Existe desafio?**  
  Não

- **Existe estratégia ou é repetitivo?**  
  Não

- **O ritmo do jogo está adequado?**  
  Não

---

## 3️⃣ Estética / Interface

- **Existe menu?**  
  Sim

- **Existe HUD (vida, pontuação, tempo)?**  
  Sim

- **As animações existem?**  
  Não

- **A interface é intuitiva?**  
  Sim

---

## 4️⃣ Narrativa / Contexto

- **Existe história?**  
  Não

- **O objetivo do jogador é claro?**  
  Não

- **O jogo tem identidade?**  
  Sim

---

## 5️⃣ Funcionalidades Técnicas

- **Funciona no navegador?**  
  Sim

- **Possui bugs? Quais?**  
  Sim, bug na movimentação do personagem, bug na colisão com ambiente

- **Tem tela de início e reinício?**  
  Não

- **O som funciona?**  
  Não

---

## 📄 Entregável da Parte 1 — Tabela Comparativa

Preencha a tabela comparando o que existe no jogo criado pela IA.

| Elemento | Existe? (Sim/Não) | Está completo? (Sim/Parcial/Não) | Observações |
|---|---|---|---|
| Tela inicial | Sim | Parcial |  |
| Menu / navegação | Sim | Sim |  |
| Sistema de regras | Sim | Parcial  | Crafting não funciona  |
| Condição de vitória | Não |  |  |
| Condição de derrota | Não |  |  |
| Progressão (níveis/fases) | Não |  |  |
| Dificuldade / balanceamento | Não |  |  |
| Pontuação | Não |  |  |
| HUD (vida, tempo, score etc.) | Sim  | Parcial |  |
| Feedback visual (animações, partículas, efeitos) | Não |  |  |
| Feedback sonoro (música, SFX) | Não |  |  |
| Controles / responsividade | Sim | Parcial | Bugado |
| Tela de reinício / Game Over | Não |  |  |
| Bugs (travamentos, colisão, input etc.) | Sim |  | Colisão com objetos do cenário bugado |
| Identidade / estética geral | Sim | Parcial |  |
| Narrativa / contexto | Não |  |  |

---

## ✍️ Análise crítica (texto)

Responda em **mínimo 10 linhas**:

1. O jogo criado pela IA consegue representar bem o jogo original? Por quê?  
   Não, bem limitado em funcionalidades comparado com o jogo original, arte bem diferente

2. Quais foram os principais problemas encontrados?  
   Falta de elementos centrais da gameplay, inimigos, fases, itens funcionais, chefe final, e outros..

3. O que ficou mais distante do jogo original?  
   Arte, estética

4. O que a IA fez melhor do que você esperava?  
   Nada

---

# 📌 PARTE 2 – Plano de Melhorias (pensando como Game Designer)

**Pergunta central:** o que precisa ser melhorado para ficar mais próximo do original?

## 🔹 Melhorias de Mecânica (regras e sistemas)

- Renderização base de entidades (Player, Slime, Zombie) já corrigida; manter validação para evitar regressões.
- Aumentar diversidade de mobs (não ficar só em Slime/Zombie) para aproximar da variedade do original.
- Finalizar sistema de combate com paridade do original: dano, knockback, invulnerabilidade, stamina/energia e morte.
- Completar drops e coleta (slime, cloth, wood, stone) com pontuação e feedback visual.
- Concluir sistema de crafting/inventário com uso real de recursos e progressão de equipamento.
- Implementar progressão de jogo completa com níveis subterrâneos e nível do céu (underground/sky), além da superfície.
- Implementar loop de fim de jogo com chefe final (Air Wizard) e condição de vitória/derrota.

## 🔹 Melhorias de Dinâmica (experiência, desafio, ritmo)

- Ajustar ritmo de spawn de inimigos para criar pressão progressiva sem frustrar no início.
- Melhorar o “game feel” do combate com feedback imediato (flash de dano, partículas, hit confirm).
- Balancear risco/recompensa na exploração (coletar recursos vs. enfrentar mobs).
- Criar progressão de desafio por tempo/nível para evitar repetição da superfície.

## 🔹 Melhorias de Interface e Feedback (HUD, telas, clareza, sensação)

- Usar os sprites originais
- Efeitos sonoros
- HUD igual a original
- Corrigir logo/menu inicial para ficar legível e com orientação correta dos sprites.
- Garantir UI 100% in-engine (sem dependência de HUD em DOM) com leitura clara de vida, stamina e score.
- Melhorar feedback de estado (tela de morte, opção de restart, mensagens de ação).

## 🔹 Melhorias Técnicas (bugs, performance, compatibilidade)

- Corrigir bugs de atlas/palette (tiles exibindo letras/números em vez dos sprites corretos).
- Adicionar testes de regressão visual para garantir que sprites de player/mobs continuem corretos após mudanças.
- Validar pipeline GPU moderno (chunks instanciados + sprite batch) sem regressões visuais.
- Garantir estabilidade de render (sem tela preta/menu sumido) após reinícios e mudanças de estado.
- Manter 60 FPS com mapa completo e múltiplas entidades ativas.

---

# 📌 PARTE 3 – Priorização (pensamento de produção)

Agora organize todas as melhorias em:

## 🔥 Essencial (sem isso o jogo não funciona bem)

- Finalizar combate base (ataque, dano, morte, stamina, colisão com inimigos).
- Concluir sistema de crafting/inventário funcional com consumo de recursos e criação de itens.
- Implementar progressão de níveis (superfície + underground + sky).
- Implementar chefe final (Air Wizard) e condição clara de vitória.
- Garantir fluxo jogável completo: menu inicial → jogo → morte → reinício.

## ⭐ Importante (melhora muito a experiência)

- Ajustar IA/spawn e balanceamento do ritmo de jogo.
- Integrar SFX essenciais (ataque, dano, coleta, morte).
- Refinar HUD e feedback (partículas, textos de dano, clareza de estado).
- Melhorar consistência visual da UI com a estética original.
- Ampliar diversidade de mobs para melhorar desafio e reduzir repetição.

## 💡 Extra (seria legal, mas não é prioridade)

- Efeitos de iluminação mais avançados e pós-processamento opcional.
- Melhorias de acessibilidade (remapeamento de controles, escala de UI).
- Conteúdo adicional além do slice atual (mais biomas/níveis e polimento estético extra).

### Justificativa (5 linhas)

_Resposta:_  
Com a correção da renderização de player/mobs, a base visual do gameplay ficou estável.  
Agora os maiores gaps para aproximar do original são conteúdo e progressão: crafting completo, mais variedade de mobs, underground/sky e chefe final.  
Depois disso, o maior ganho vem de balanceamento, áudio e feedback de combate, que aumentam bastante a diversão.  
Os itens “Extra” agregam qualidade, mas não impedem o jogo de funcionar e representar o original.  
Por isso a priorização segue impacto direto na jogabilidade e no fechamento do loop completo do jogo.

---

# 📌 PARTE 4 – Atualização do Game (usando apenas créditos gratuitos)

1. Aplique as melhorias **priorizadas** (principalmente as **Essenciais**).
2. Publique novamente e compartilhe o link.

- **Link do jogo atualizado (nova versão):**  
  _Resposta:_ Em andamento (build local de teste: http://localhost:8080)

---

# 🧾 Relato final (5 a 10 linhas)

- O que foi possível melhorar?
- O que ainda ficou faltando?
- O que a IA teve dificuldade em fazer?

_Resposta:_ 
Foi possível modernizar a base de renderização para GPU (Three.js), substituindo a abordagem de framebuffer por chunks instanciados e sprite batching.  
Também foi possível manter boa parte da estética pixel-art com atlas original e filtros corretos.  
Além disso, a renderização de sprites de player e mobs foi corrigida.  
Alguns estados de UI/menu ainda apresentaram regressões durante a migração (orientação e legibilidade).  
A versão atual ainda está incompleta em conteúdo: pouca diversidade de mobs, sistema de crafting parcial, sem progressão para underground/sky e sem chefe final.  
A IA teve dificuldade em manter paridade exata com a lógica de flip/offset do Java original em todos os casos.  
O próximo passo é fechar o escopo de gameplay (crafting completo, mais mobs, níveis e boss final) e depois avançar para balanceamento, áudio e polimento.
