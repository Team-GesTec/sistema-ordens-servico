# US#4.4 — Checklist de validação

## Backend / OpenAPI

- [x] Swagger UI público em `/docs`.
- [x] JSON OpenAPI público em `/docs/openapi.json`.
- [x] Autorização JWT global preservada para as rotas de dados.
- [x] `POST /auth/login` documentado como público; `GET /auth/me` protegido.
- [x] Esquema Bearer JWT e instrução de uso do Authorize.
- [x] Rotas dos routers existentes inventariadas: 63 operações em 43 caminhos.
- [x] Perfis e restrições descritos a partir dos middlewares e comentários/regras dos services inspecionados; sem perfil Líder.
- [x] Upload multipart: campo `arquivo`, `relato` opcional, 50 MB, limite de relato 2.000 caracteres e MIME types configuráveis.
- [x] Download de anexos documenta cabeçalhos de arquivo; relatórios documentam `application/pdf` e `Content-Disposition`.
- [x] URLs de servidor configuráveis por `API_PUBLIC_URL`, `API_HOMOLOGACAO_URL` e `API_PRODUCAO_URL`; nenhum domínio fictício é incluído.
- [x] Linter estrutural OpenAPI (`npm run lint:openapi`), incluindo referências, `operationId`, conteúdo das respostas HTTP documentadas (exceto 204) e rejeição de payloads JSON genéricos.
- [x] Cobertura automatizada das declarações de rota, prefixos, parâmetros dinâmicos e routers aninhados em fixtures (`npm run test:openapi`).
- [x] Schemas de entrada específicos para clientes, departamentos, funcionários, projetos, ordens de serviço, status, atribuição, SLA manual, horas e anexos, com exemplos representativos.
- [x] Schemas de resposta para entidades e operações CRUD principais; schemas de listagem e detalhes documentados para departamentos, funcionários, projetos e O.S.
- [ ] Revisão manual campo a campo de todos os 63 contratos e exemplos de resposta com instância real. Os schemas foram enriquecidos com base nos services, controllers e modelos, mas não foram exercitados contra um banco de homologação.
- [ ] Validar a interface Swagger e executar `Try it out` em ambiente publicado com CORS e banco disponíveis.

## Observação sobre a cobertura

O teste descobre os módulos importados e montados em `app.use`, extrai os métodos/caminhos literais, combina prefixos, trata routers aninhados e converte parâmetros `:id` para `{id}`. As factories de anexos são analisadas pelo corpo da função e pelos prefixos reais de montagem. Há testes de regressão que inserem uma rota não documentada e uma fixture de routers aninhados. A estratégia é estática: não introspecta o stack Express em runtime e não resolve caminhos calculados dinamicamente em tempo de execução.

## Frontend

- [x] Rota `/ajuda` dentro da área privada existente.
- [x] Link Ajuda adicionado à Sidebar para todos os perfis autenticados.
- [x] Link Swagger configurável por `VITE_SWAGGER_URL` ou `VITE_API_URL`.
- [x] Link de visualização/download do manual PDF configurável por `VITE_MANUAL_URL`.
- [ ] Executar build/lint do frontend em ambiente com dependências instaladas. A tentativa atual falhou por ausência dos tipos `vite/client` e `node` e do executável ESLint, após a instalação de dependências exceder o tempo limite.
- [ ] Validar visualmente desktop/mobile e os três perfis em ambiente com login disponível.

## Manual

- [x] Um único PDF com capa, sumário geral e partes independentes para Gestor, Técnico e Analista.
- [x] Guia de instalação e configuração incluído.
- [x] Referências ao perfil Líder removidas do manual atualizado.
- [x] Permissões revisadas conforme as rotas/middlewares existentes.
- [x] PDF texto-selecionável e paginado, com sumário de páginas gerado e 66 anotações de navegação interna verificadas.
- [ ] Revisar capturas de `docs/prints` contra uma instância atual. As imagens existentes foram inspecionadas como arquivos, mas não incorporadas porque não foi possível confirmar sua correspondência com a interface executável atual.

## Execução nesta entrega

- [x] `cd backend && npm run check:docs` — aprovado: 43 caminhos, 63 operações; fixture de rota sem documentação e fixture de router aninhado aprovadas.
- [x] `python docs/scripts/gerar-manual-pdf.py` — PDF gerado novamente.
- [x] `pdfinfo`, `pdftotext` e `pdfimages -list` — 8 páginas A4, sumário com páginas coerentes e texto extraível; nenhuma imagem incorporada.
- [ ] `cd backend && npm run build` — não aprovado: faltam tipos de `express` e `node` devido à instalação incompleta.
- [ ] `cd frontend && npm run build` — não aprovado: faltam tipos de `vite/client` e `node`.
- [ ] `cd frontend && npm run lint` — não executado com sucesso: `eslint` não encontrado.
- [ ] Testes de integração com JWT, Supabase, CORS, autorização e downloads — dependem de ambiente configurado e não foram executados.
