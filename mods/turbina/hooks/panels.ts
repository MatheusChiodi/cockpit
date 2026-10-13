// Gerado por scripts/build-manifests.mjs a partir de mods.json. Não edite à mão.
export const PANELS: readonly { name: string; description: string; group: string }[] = [
  {
    "name": "todo-band",
    "description": "Lista de tarefas do projeto fixa acima do prompt, clicável e persistente (/todo)",
    "group": "Dia a dia"
  },
  {
    "name": "goal-band",
    "description": "/goal fixa o objetivo do projeto acima do prompt e no contexto do Claude",
    "group": "Dia a dia"
  },
  {
    "name": "focus-band",
    "description": "/focus inicia um bloco de foco com barra de progresso fixa",
    "group": "Dia a dia"
  },
  {
    "name": "deadline-band",
    "description": "/deadline fixa uma contagem regressiva para o prazo do projeto",
    "group": "Dia a dia"
  },
  {
    "name": "pin-band",
    "description": "/pin fixa até 4 lembretes do projeto acima do prompt",
    "group": "Dia a dia"
  },
  {
    "name": "clock-status",
    "description": "Status line com dia e hora (útil no modo fullscreen)",
    "group": "Dia a dia"
  },
  {
    "name": "day-timer",
    "description": "Status line com o tempo ativo de Claude Code no dia, somando as sessões",
    "group": "Dia a dia"
  },
  {
    "name": "dolar-status",
    "description": "Status line com a cotação do dólar em reais (AwesomeAPI)",
    "group": "Dia a dia"
  },
  {
    "name": "weather-status",
    "description": "Status line com o clima da sua cidade (wttr.in)",
    "group": "Dia a dia"
  },
  {
    "name": "terminal-pet",
    "description": "Mascote acima do prompt que reage: trabalhando, feliz, triste ou com sono",
    "group": "Dia a dia"
  },
  {
    "name": "git-band",
    "description": "Faixa fixa com branch, arquivos alterados, +/- linhas, ahead/behind e último commit",
    "group": "Git"
  },
  {
    "name": "ci-status",
    "description": "Status line com o estado do último workflow do GitHub Actions (via gh)",
    "group": "Git"
  },
  {
    "name": "stash-status",
    "description": "Status line que lembra quantos stashes estão guardados",
    "group": "Git"
  },
  {
    "name": "uncommitted-band",
    "description": "Faixa de aviso quando há alterações sem commit há mais de 45 minutos",
    "group": "Git"
  },
  {
    "name": "pr-status",
    "description": "Status line com o pull request da branch atual e o estado do review (via gh)",
    "group": "Git"
  },
  {
    "name": "main-warning-band",
    "description": "Faixa vermelha enquanto você estiver na main/master",
    "group": "Git"
  },
  {
    "name": "conflict-band",
    "description": "Faixa que avisa de merge/rebase em andamento e arquivos em conflito",
    "group": "Git"
  },
  {
    "name": "commits-today",
    "description": "Status line com quantos commits você fez hoje neste repositório",
    "group": "Git"
  },
  {
    "name": "test-status",
    "description": "Status line com o resultado da última execução de testes: passou ou falhou, hora e duração",
    "group": "Projeto"
  },
  {
    "name": "project-status",
    "description": "Status line com nome e versão do projeto, versão do Node e gerenciador de pacotes",
    "group": "Projeto"
  },
  {
    "name": "ports-band",
    "description": "Faixa com os servidores de dev que estão no ar em localhost",
    "group": "Projeto"
  },
  {
    "name": "deps-status",
    "description": "Status line com quantas dependências npm estão desatualizadas",
    "group": "Projeto"
  },
  {
    "name": "todo-count-status",
    "description": "Status line com a contagem de TODO, FIXME e HACK no código versionado",
    "group": "Projeto"
  },
  {
    "name": "quality-status",
    "description": "Status line com o último resultado de lint, tipos e build",
    "group": "Projeto"
  },
  {
    "name": "usage-band",
    "description": "Faixa fixa com barras coloridas de contexto, janelas de 5h e 7 dias e custo",
    "group": "Sessão"
  },
  {
    "name": "files-band",
    "description": "Faixa fixa com os arquivos que o Claude alterou nesta sessão",
    "group": "Sessão"
  },
  {
    "name": "error-band",
    "description": "Mantém à vista o último comando que falhou e a linha do erro, até um comando passar",
    "group": "Sessão"
  },
  {
    "name": "agents-band",
    "description": "Faixa que mostra em tempo real quantos subagentes estão rodando e quais",
    "group": "Sessão"
  },
  {
    "name": "activity-status",
    "description": "Status line ao vivo com a ferramenta que o Claude está executando agora",
    "group": "Sessão"
  },
  {
    "name": "model-status",
    "description": "Status line com o modelo em uso na sessão",
    "group": "Sessão"
  },
  {
    "name": "cost-ticker",
    "description": "Status line com o custo do último turno e o total da sessão",
    "group": "Sessão"
  },
  {
    "name": "idle-clock",
    "description": "Status line com há quanto tempo a sessão está parada",
    "group": "Sessão"
  },
  {
    "name": "turn-progress",
    "description": "Status line ao vivo com tempo decorrido e tools do turno em andamento",
    "group": "Sessão"
  },
  {
    "name": "last-prompt-band",
    "description": "Faixa com o seu último pedido, para não se perder depois de respostas longas",
    "group": "Sessão"
  },
  {
    "name": "compact-nudge",
    "description": "Faixa com botão de compactar quando o contexto passa de 75%",
    "group": "Sessão"
  },
  {
    "name": "session-diff-band",
    "description": "Faixa com o total de linhas que o Claude escreveu e removeu na sessão",
    "group": "Sessão"
  },
  {
    "name": "shield-band",
    "description": "Faixa com a contagem de chamadas bloqueadas pelos guards e o último motivo",
    "group": "Sessão"
  },
  {
    "name": "reset-countdown",
    "description": "Status line com a contagem regressiva até o reset do rate limit mais apertado",
    "group": "Sessão"
  },
  {
    "name": "spend-today",
    "description": "Status line com o gasto do dia somando todas as sessões",
    "group": "Sessão"
  },
  {
    "name": "api-status",
    "description": "Status line com o estado da API da Anthropic pela página pública de status",
    "group": "Sessão"
  }
]
