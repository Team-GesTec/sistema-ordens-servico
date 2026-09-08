# SGOS - Sistema de Gestão de Ordens de Serviço (ALTAVE)

O Sistema de Gestão de Ordens de Serviço (SGOS) foi desenvolvido pela equipe **GesTec** para a empresa parceira **ALTAVE**. O objetivo do sistema é centralizar, estruturar e rastrear todo o fluxo de solicitações operacionais e projetos de implantação da empresa.

---

## Descrição do Desafio

A ALTAVE enfrentava gargalos no acompanhamento descentralizado de solicitações de serviço, ausência de padronização nas etapas operacionais entre departamentos (Hardware, Compras e SST) e falta de previsibilidade sobre os prazos de atendimento de SLA contratual.

O SGOS resolve essa dor ao oferecer um agrupador central de projetos, desmembramento automático de ordens de serviço por setor, notificações multicanal (e-mail e in-app), controle rígido de status e logs de auditoria detalhados.

---

## Backlog de Produto

| Rank | Épico | Prioridade | User Story | Sprint |
| :---: | :--- | :---: | :--- | :---: |
| 1 | EP04 - Auditoria de Ações e Documentação | Alta | **US#4.1** Como colaborador do sistema, quero autenticar com e-mail e senha, para acessar o SGOS e garantir o controle de acesso conforme meu perfil (Gestor, Analista, Técnico). | 1 |
| 2 | EP01 - Gestão e Rastreabilidade de Projetos | Alta | **US#1.2** Como gestor de projetos, quero abrir um projeto de implantação associado a um cliente e selecionar os departamentos envolvidos, para servir como agrupador central das O.S. | 1 |
| 3 | EP02 - Gestão do Ciclo de Vida da O.S. | Alta | **US#2.1** Como analista de suporte, quero abrir uma O.S. associada a um cliente/projeto escolhendo o tipo (Instalação/Manutenção) e a criticidade, incluindo a opção de vincular o código de uma O.S. anterior reincidente, para direcionar o chamado ao setor correto. | 1 |
| 4 | EP04 - Auditoria de Ações e Documentação | Média | **US#4.2** Como gestor de projetos, quero cadastrar departamentos (Hardware, Compras, SST) e técnicos/colaboradores, para estruturar a equipe e permitir a atribuição de tarefas. | 1 |
| 5 | EP01 - Gestão e Rastreabilidade de Projetos | Média | **US#1.1** Como gestor de projetos, quero cadastrar um cliente informando razão social, ramo de atuação, categoria e ativos/locais operacionais (embarcação, usina, site), para mapear a base de atendimento. | 1 |
| 6 | EP02 - Gestão do Ciclo de Vida da O.S. | Média | **US#2.2** Como gestor de projetos, quero desmembrar um projeto em O.S. direcionadas para os departamentos (Hardware, Compras e SST), para garantir a execução integrada da demanda. | 1 |
| 7 | EP02 - Gestão do Ciclo de Vida da O.S. | Alta | **US#2.4** Como responsável técnico, quero alterar o status da O.S. (passando por Pendente, Em Andamento, Aguardando Embarque, Validação/Testes, Bloqueado, Review ou Concluído) e registrar o parecer técnico, para oficializar o andamento e a conclusão do trabalho. | 2 |
| 8 | EP03 - Controle de SLA, Priorização e Alertas | Alta | **US#3.2** Como responsável técnico, quero receber alertas visuais quando uma O.S. atingir a margem de risco de SLA, para priorizar atendimentos críticos. | 2 |
| 9 | EP02 - Gestão do Ciclo de Vida da O.S. | Média | **US#2.3** Como líder de área, quero atribuir um responsável técnico específico a uma O.S. do meu setor, para definir a responsabilidade pela execução. | 2 |
| 10 | EP03 - Controle de SLA, Priorização e Alertas | Média | **US#3.1** Como gestor de projetos, quero que o sistema calcule a data limite de SLA automaticamente para demandas padrão e permita a sobreposição manual de prazos, para ajustar datas a paradas operacionais e regras contratuais. | 2 |
| 11 | EP03 - Controle de SLA, Priorização e Alertas | Média | **US#3.3** Como envolvido na O.S., quero receber notificações no sistema (in-app) e por e-mail sobre alterações de status, prioridade e nova atribuição, para acompanhar a evolução do atendimento em tempo real. | 2 |
| 12 | EP02 - Gestão do Ciclo de Vida da O.S. | Baixa | **US#2.5** Como responsável técnico, quero consultar minha fila de O.S. atribuídas com filtro por status e prioridade, para organizar os atendimentos do dia. | 2 |
| 13 | EP02 - Gestão do Ciclo de Vida da O.S. | Média | **US#2.6** Como colaborador, quero anexar fotos, laudos e documentos à O.S. com limite de tamanho por arquivo, para comprovar a execução do serviço ou detalhar o problema operacional. | 2 |
| 14 | EP04 - Auditoria de Ações e Documentação | Alta | **US#4.3** Como gestor de projetos, quero consultar o histórico de alterações da O.S. (quem alterou, o quê e quando), para atender às exigências de rastreabilidade. | 3 |
| 15 | EP04 - Auditoria de Ações e Documentação | Média | **US#4.4** Como desenvolvedor ou avaliador, quero acessar a documentação interativa da API via Swagger, para validar as integrações e contratos das rotas. | 3 |
| 16 | EP01 - Gestão e Rastreabilidade de Projetos | Baixa | **US#1.3** Como gestor de projetos, quero consultar um painel consolidado com o status e progresso percentual dos projetos, para acompanhar a operação sem gerar relatórios manuais. | 3 |
| 17 | EP01 - Gestão e Rastreabilidade de Projetos | Baixa | **US#1.4** Como responsável técnico, quero visualizar um gráfico semanal da minha fila de trabalho (Pendente, Em Andamento, Concluída), para ter um resumo visual das minhas entregas. | 3 |

---

## Cronograma de Evolução do Projeto

```text
[Sprint 1: Set/2026] ➔ [Sprint 2: Out/2026] ➔ [Sprint 3: Nov/2026]
 ├─ Autenticação        ├─ Ciclo de Vida O.S.    ├─ Histórico & Auditoria
 ├─ Cadastros Base      ├─ Regras de SLA         ├─ Dashboards Visuais
 └─ Abertura de O.S.    └─ Anexos e Notificação  └─ Documentação Swagger
```

### Tabela Descritiva das Sprints

| Período da Sprint | Link para Documentação da Sprint | Link para Vídeo no Youtube do Incremento Entregue |
| --- | --- | --- |
| Sprint 1: 01/09/2026 - 25/09/2026 | [Documentação da Sprint 1](#) | [Demonstração da Sprint 1 - YouTube](#) |
| Sprint 2: 28/09/2026 - 23/10/2026 | [Documentação da Sprint 2](#) | [Demonstração da Sprint 2 - YouTube](#) |
| Sprint 3: 26/10/2026 - 20/11/2026 | [Documentação da Sprint 3](#) | [Demonstração da Sprint 3 - YouTube](#) |

---

## Tecnologias Utilizadas

- **Frontend:** React.js / TypeScript / Tailwind CSS
- **Backend:** Node.js / TypeScript / Express.js
- **Banco de Dados:** PostgreSQL
- **Documentação de API:** Swagger (OpenAPI 3.0)
- **Autenticação:** JSON Web Token (JWT) e bcrypt

---

## Estrutura do Projeto

```bash
sistema-ordens-servico/
├── backend
│   ├── controllers
│   │   └── .gitkeep
│   ├── models
│   │   └── .gitkeep
│   ├── repositories
│   │   └── .gitkeep
│   ├── routes
│   │   └── .gitkeep
│   └── services
│       └── .gitkeep
├── docs
│   └── .gitkeep
├── frontend
│   ├── components
│   │   └── .gitkeep
│   ├── images
│   │   └── .gitkeep
│   ├── pages
│   │   └── .gitkeep
│   ├── services
│   │   └── .gitkeep
│   └── styles
│       └── .gitkeep
├── .gitignore
└── README.md
```

---

## Como Executar, Usar e Testar o Projeto

**1. Clonar o Repositório:**

```bash
git clone https://github.com/Team-GesTec/sistema-ordens-servico.git
cd sistema-ordens-servico
```

**2. Configuração do Backend e Banco de Dados:**

```bash
cd backend
npm install
cp .env.example .env
npm run migrate
npm run dev
```

**3. Configuração do Frontend:**

```bash
cd ../frontend
npm install
npm run dev
```

**4. Execução dos Testes Automatizados:**

```bash
# No diretório backend ou frontend
npm run test
```

---

## Links para Pasta de Documentação

- [Checklist de DoR e DoD](#)
- [DoR e DoD por Sprint](#)
- [Estratégia de Branch](#)
- [Manual do Usuário](#)
- [Manual de Instalação](#)

---

## Equipe GesTec

| Nome Completo | Papel | Foto | Link para GitHub | Link para LinkedIn |
| --- | --- | --- | --- | --- |
| Samuel Estevão Pereira Martins | Product Owner | <img src="https://github.com/SamuelMartins00.png" width="50"> | [GitHub](https://github.com/SamuelMartins00) | [LinkedIn](#) |
| Cid Daniel Neves DOliveira | Scrum Master | <img src="https://github.com/C1dneve.png" width="50"> | [GitHub](https://github.com/C1dneve) | [LinkedIn](#) |
| Guilherme de Lima Leite | Desenvolvedor | <img src="https://github.com/Guilherme-Leite1701.png" width="50"> | [GitHub](https://github.com/Guilherme-Leite1701) | [LinkedIn](#) |
| Júlia Carolina dos Santos Inácio | Desenvolvedora | <img src="https://github.com/juliacarolina728-sudo.png" width="50"> | [GitHub](https://github.com/juliacarolina728-sudo) | [LinkedIn](#) |
| Marina Duque de Holanda Cavalcanti | Desenvolvedora | <img src="https://github.com/ninaduquehc.png" width="50"> | [GitHub](https://github.com/ninaduquehc) | [LinkedIn](#) |
| Pamela Emily Iwabuchi Maciel | Desenvolvedora | <img src="https://github.com/pamelaiwabuchi.png" width="50"> | [GitHub](https://github.com/pamelaiwabuchi) | [LinkedIn](#) |
| Pedro Pereira Rodrigues| Desenvolvedor | <img src="https://github.com/pedroprdgs.png" width="50"> | [GitHub](https://github.com/pedroprdgs) | [LinkedIn](https://linkedin.com/in/pedroprdgs) |
| Rafael Silva Mioni Coltro | Desenvolvedor | <img src="https://github.com/RafaelMioniC.png" width="50"> | [GitHub](https://github.com/RafaelMioniC) | [LinkedIn](#) |
| Vitor Assis Hasman Diniz | Desenvolvedor | <img src="https://github.com/VitorAssisHasmanDiniz.png" width="50"> | [GitHub](https://github.com/VitorAssisHasmanDiniz) | [LinkedIn](#) |
