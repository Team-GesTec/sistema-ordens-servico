# Checklist de DoR e DoD — GesTec

Este documento reúne as duas checklists que toda User Story do GesTec precisa cumprir: **Definition of Ready (DoR)**, antes de entrar em uma Sprint, e **Definition of Done (DoD)**, para ser considerada realmente concluída.

> Fonte: seções "Definition of Ready (DoR)" e "Definition of Done (DoD)" do guia de decisões confirmadas do Dev Team.

---

## Definition of Ready (DoR)

Checklist que uma User Story precisa cumprir **antes de entrar em uma Sprint**.

### Sobre a User Story

- [ ] Título claro
- [ ] Critérios de aceitação escritos
- [ ] Padronização de código combinada
- [ ] Comentários/docstrings esperados
- [ ] Regras de negócio claras
- [ ] Estimativa feita pelo time via Planning Poker
- [ ] Nenhuma dependência bloqueadora
- [ ] Compreensão validada pelo time

### Artefatos correlatos

- [ ] Wireframe/mockup disponível
- [ ] Modelo de dados disponível
- [ ] Regra de SLA/prioridade documentada quando necessária
- [ ] Estratégia de teste definida

---

## Definition of Done (DoD)

O trabalho só é considerado concluído quando atende a este acordo — **entregar código não é o mesmo que concluir a User Story**.

- [ ] Código versionado no Git, na branch correta
- [ ] Pull Request aberto, com descrição do que foi implementado
- [ ] Code review feito por outro membro — nunca autoaprovado
- [ ] Sem código comentado abandonado
- [ ] Testes nas rotas principais
- [ ] Documentação atualizada, com README da funcionalidade quando aplicável
- [ ] Swagger atualizado quando aplicável
- [ ] Teste manual ponta a ponta realizado
- [ ] Nenhum erro indevido no console/log

> **Importante:** entregar código não significa necessariamente concluir a User Story. A entrega precisa atender ao DoD completo.

---

## Como usar

- Antes de puxar uma US para a Sprint, o time (não só quem vai implementar) confere a checklist de **DoR** em conjunto.
- Antes de marcar uma US como concluída no board, quem implementou confere a checklist de **DoD** e o revisor confirma no Pull Request.
- Para acompanhar isso Sprint a Sprint, veja [DoR e DoD por Sprint](./dor-dod-por-sprint.md).