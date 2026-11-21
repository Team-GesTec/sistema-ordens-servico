// Especificação OpenAPI central da API. Mantida alinhada às rotas Express.
// Especificação OpenAPI central da API. Mantida alinhada às rotas Express.
// Especificação OpenAPI central da API. Mantida alinhada às rotas Express.
// Especificação OpenAPI central da API. Mantida alinhada às rotas Express.
// Especificação OpenAPI central da API. Mantida alinhada às rotas Express.
// Especificação OpenAPI central da API. Mantida alinhada às rotas Express.
// Especificação OpenAPI central da API. Mantida alinhada às rotas Express.
const base =   {
    "openapi": "3.0.3",
    "info": {
      "title": "SGOS — Sistema de Gestão de Ordens de Serviço",
      "version": "1.1.0",
      "description": "Contratos HTTP da API SGOS. A documentação é pública; operações protegidas continuam exigindo JWT e autorização do perfil correspondente. As descrições de acesso refletem os middlewares e services registrados no backend."
    },
    "servers": [
      {
        "url": "/",
        "description": "Origem atual da API"
      }
    ],
    "tags": [
      {
        "name": "Autenticação",
        "description": "Operações de autenticação."
      },
      {
        "name": "Clientes",
        "description": "Operações de clientes."
      },
      {
        "name": "Departamentos",
        "description": "Operações de departamentos."
      },
      {
        "name": "Funcionários",
        "description": "Operações de funcionários."
      },
      {
        "name": "Projetos",
        "description": "Operações de projetos."
      },
      {
        "name": "Ordens de serviço",
        "description": "Operações de ordens de serviço."
      },
      {
        "name": "Anexos",
        "description": "Operações de anexos."
      },
      {
        "name": "Notificações",
        "description": "Operações de notificações."
      },
      {
        "name": "Auditoria",
        "description": "Operações de auditoria."
      },
      {
        "name": "Relatórios",
        "description": "Operações de relatórios."
      },
      {
        "name": "Sistema",
        "description": "Verificação operacional da API."
      }
    ],
    "components": {
      "securitySchemes": {
        "BearerAuth": {
          "type": "http",
          "scheme": "bearer",
          "bearerFormat": "JWT",
          "description": "Informe o JWT retornado por POST /auth/login. Use apenas o token, sem prefixar com Bearer."
        }
      },
      "schemas": {
        "ComentarioOrdem": {
      "type": "object",
      "required": ["id", "os_id", "conteudo", "criado_em", "autor"],
      "properties": {
        "id": {"type": "integer"},
        "os_id": {"type": "integer"},
        "conteudo": {"type": "string", "maxLength": 2000},
        "criado_em": {"type": "string", "format": "date-time"},
        "autor": {
          "type": "object",
          "required": ["id", "nome", "tipo"],
          "properties": {
            "id": {"type": "integer"},
            "nome": {"type": "string"},
            "tipo": {"type": "string"}
          }
        }
      }
    },
    "Erro": {
          "type": "object",
          "required": [
            "mensagem"
          ],
          "properties": {
            "mensagem": {
              "type": "string"
            }
          },
          "example": {
            "mensagem": "Requisição inválida."
          }
        },
        "LoginRequest": {
          "type": "object",
          "required": [
            "usuario",
            "senha"
          ],
          "properties": {
            "usuario": {
              "type": "string"
            },
            "senha": {
              "type": "string",
              "format": "password"
            }
          }
        },
        "LoginResponse": {
          "type": "object",
          "required": [
            "token",
            "tipo_token",
            "expira_em",
            "funcionario"
          ],
          "properties": {
            "token": {
              "type": "string",
              "description": "JWT assinado com HS256."
            },
            "tipo_token": {
              "type": "string",
              "enum": [
                "Bearer"
              ]
            },
            "expira_em": {
              "type": "string",
              "example": "8h"
            },
            "funcionario": {
              "$ref": "#/components/schemas/FuncionarioPublico"
            }
          }
        },
        "ArquivoUpload": {
          "type": "object",
          "required": [
            "arquivo"
          ],
          "properties": {
            "arquivo": {
              "type": "string",
              "format": "binary"
            },
            "relato": {
              "type": "string",
              "maxLength": 2000
            }
          }
        },
        "Paginacao": {
          "type": "object",
          "description": "Metadados de paginação.",
          "properties": {
            "pagina": {
              "type": "integer",
              "example": 1
            },
            "limite": {
              "type": "integer",
              "example": 10
            },
            "total": {
              "type": "integer",
              "example": 37
            },
            "total_paginas": {
              "type": "integer",
              "example": 4
            }
          }
        },
        "AtividadeAuditoria": {
          "type": "object",
          "description": "Registro imutável de auditoria pronto para exibição.",
          "properties": {
            "id": {
              "type": "integer"
            },
            "os_id": {
              "type": "integer"
            },
            "funcionario_id": {
              "type": "integer"
            },
            "data_modificacao": {
              "type": "string",
              "format": "date-time"
            },
            "data_hora": {
              "type": "string",
              "description": "Data/hora formatada para Brasília."
            },
            "acao": {
              "type": "string",
              "enum": [
                "insercao",
                "atualizacao",
                "exclusao"
              ]
            },
            "tipo_evento": {
              "type": "string",
              "enum": [
                "criacao",
                "edicao",
                "mudanca_status",
                "atribuicao_responsavel",
                "alteracao_sla",
                "anexo",
                "registro_horas",
                "ativacao"
              ]
            },
            "descricao": {
              "type": "string"
            },
            "campo_alterado": {
              "type": "string",
              "nullable": true
            },
            "dado_antigo": {
              "type": "string",
              "nullable": true
            },
            "dado_novo": {
              "type": "string",
              "nullable": true
            },
            "justificativa": {
              "type": "string",
              "nullable": true
            },
            "parecer": {
              "type": "string",
              "nullable": true
            },
            "apontamento_id": {
              "type": "integer",
              "nullable": true
            },
            "funcionarios": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "integer"
                },
                "nome": {
                  "type": "string"
                },
                "usuario": {
                  "type": "string"
                }
              }
            },
            "ordem_servico": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "integer"
                },
                "titulo": {
                  "type": "string"
                }
              }
            }
          }
        },
        "IndicadoresAuditoria": {
          "type": "object",
          "properties": {
            "total_eventos": {
              "type": "integer"
            },
            "eventos_hoje": {
              "type": "integer"
            },
            "ordens_impactadas": {
              "type": "integer"
            },
            "ultimo_evento": {
              "type": "string",
              "format": "date-time",
              "nullable": true
            },
            "ultimo_evento_formatado": {
              "type": "string",
              "nullable": true
            }
          }
        },
        "FuncionarioPublico": {
          "type": "object",
          "description": "Funcionário retornado sem senha_hash.",
          "properties": {
            "id": {
              "type": "integer"
            },
            "departamento_id": {
              "type": "integer"
            },
            "usuario": {
              "type": "string"
            },
            "email": {
              "type": "string",
              "nullable": true
            },
            "nome": {
              "type": "string"
            },
            "tipo": {
              "type": "string",
              "enum": [
                "gestor",
                "tecnico",
                "analista"
              ]
            },
            "ativo": {
              "type": "boolean"
            }
          },
          "example": {
            "id": 12,
            "departamento_id": 4,
            "usuario": "tecnico.exemplo",
            "email": "tecnico@example.com",
            "nome": "Técnico Exemplo",
            "tipo": "tecnico",
            "ativo": true
          }
        },
        "NotificacaoLista": {
          "type": "object",
          "properties": {
            "dados": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/Notificacao"
              }
            },
            "total": {
              "type": "integer"
            },
            "pagina": {
              "type": "integer"
            },
            "limite": {
              "type": "integer"
            },
            "totalPaginas": {
              "type": "integer"
            }
          }
        },
        "AnexoResposta": {
          "type": "object",
          "properties": {
            "id": {
              "type": "integer"
            },
            "os_id": {
              "type": "integer"
            },
            "nome": {
              "type": "string"
            },
            "tipo": {
              "type": "string"
            },
            "tamanho": {
              "type": "integer",
              "description": "Tamanho em bytes."
            },
            "autor": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "integer"
                },
                "nome": {
                  "type": "string"
                }
              }
            },
            "data": {
              "type": "string",
              "format": "date-time"
            },
            "relato": {
              "type": "string",
              "nullable": true
            }
          },
          "example": {
            "id": 8,
            "os_id": 2026,
            "nome": "relatorio.pdf",
            "tipo": "application/pdf",
            "tamanho": 2048,
            "autor": {
              "id": 12,
              "nome": "Técnico Exemplo"
            },
            "data": "2026-11-20T12:00:00.000Z",
            "relato": "Relatório da inspeção."
          }
        },
        "ConfiguracaoAnexos": {
          "type": "object",
          "properties": {
            "tipos_permitidos": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "extensoes_permitidas": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "tamanho_maximo_bytes": {
              "type": "integer",
              "example": 52428800
            },
            "quantidade_maxima_por_os": {
              "type": "integer"
            },
            "tamanho_maximo_relato": {
              "type": "integer",
              "example": 2000
            }
          }
        },
        "Notificacao": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "os_id": {
              "type": "integer"
            },
            "funcionario_id": {
              "type": "integer"
            },
            "tipo": {
              "type": "string",
              "enum": [
                "status_alterado",
                "sla_critica",
                "sla_expirada",
                "responsavel_definido",
                "departamento_definido"
              ]
            },
            "titulo": {
              "type": "string"
            },
            "mensagem": {
              "type": "string"
            },
            "lida": {
              "type": "boolean"
            },
            "data_criacao": {
              "type": "string",
              "format": "date-time"
            },
            "ordens_servico": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "integer"
                },
                "titulo": {
                  "type": "string"
                },
                "status": {
                  "type": "string"
                }
              }
            }
          },
          "example": {
            "id": "00000000-0000-4000-8000-000000000001",
            "os_id": 2026,
            "funcionario_id": 12,
            "tipo": "status_alterado",
            "titulo": "Status atualizado",
            "mensagem": "A ordem teve seu status atualizado.",
            "lida": false,
            "data_criacao": "2026-11-20T12:00:00.000Z",
            "ordens_servico": {
              "id": 2026,
              "titulo": "Inspeção preventiva",
              "status": "em_andamento"
            }
          }
        },
        "LocalOperacionalInput": {
          "type": "object",
          "properties": {
            "tipo": {
              "type": "string",
              "enum": [
                "offshore",
                "terrestre",
                "site"
              ]
            },
            "descricao": {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            }
          },
          "required": [
            "tipo",
            "descricao"
          ],
          "additionalProperties": false
        },
        "ClienteCreate": {
          "type": "object",
          "properties": {
            "nome": {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            },
            "razao_social": {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            },
            "ramo_atuacao": {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            },
            "locais_operacionais": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/LocalOperacionalInput"
              },
              "description": "Lista obrigatória; pode ser vazia."
            }
          },
          "required": [
            "nome",
            "razao_social",
            "ramo_atuacao",
            "locais_operacionais"
          ],
          "additionalProperties": false,
          "example": {
            "nome": "Cliente Exemplo",
            "razao_social": "Cliente Exemplo Ltda.",
            "ramo_atuacao": "Operações",
            "locais_operacionais": [
              {
                "tipo": "terrestre",
                "descricao": "Unidade operacional"
              }
            ]
          }
        },
        "ClienteReplace": {
          "type": "object",
          "properties": {
            "nome": {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            },
            "razao_social": {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            },
            "ramo_atuacao": {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            },
            "locais_operacionais": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/LocalOperacionalInput"
              },
              "description": "Lista obrigatória; pode ser vazia."
            }
          },
          "required": [
            "nome",
            "razao_social",
            "ramo_atuacao",
            "locais_operacionais"
          ],
          "additionalProperties": false
        },
        "ClientePatch": {
          "type": "object",
          "description": "Envie ao menos um campo. Campos omitidos permanecem inalterados.",
          "properties": {
            "nome": {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            },
            "razao_social": {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            },
            "ramo_atuacao": {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            },
            "locais_operacionais": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/LocalOperacionalInput"
              }
            }
          },
          "additionalProperties": false,
          "minProperties": 1
        },
        "DepartamentoCreate": {
          "type": "object",
          "properties": {
            "nome": {
              "type": "string",
              "minLength": 1,
              "maxLength": 100
            },
            "responsavel_id": {
              "type": "integer",
              "minimum": 1,
              "maximum": 2147483647,
              "nullable": true,
              "description": "Opcional; null remove o responsável."
            }
          },
          "required": [
            "nome"
          ],
          "additionalProperties": false,
          "example": {
            "nome": "Manutenção",
            "responsavel_id": 12
          }
        },
        "DepartamentoReplace": {
          "type": "object",
          "properties": {
            "nome": {
              "type": "string",
              "minLength": 1,
              "maxLength": 100
            },
            "responsavel_id": {
              "type": "integer",
              "minimum": 1,
              "maximum": 2147483647,
              "nullable": true,
              "description": "Opcional; null remove o responsável."
            }
          },
          "required": [
            "nome"
          ],
          "additionalProperties": false
        },
        "DepartamentoPatch": {
          "type": "object",
          "description": "Envie ao menos um campo.",
          "properties": {
            "nome": {
              "type": "string",
              "minLength": 1,
              "maxLength": 100
            },
            "responsavel_id": {
              "type": "integer",
              "minimum": 1,
              "maximum": 2147483647,
              "nullable": true
            }
          },
          "additionalProperties": false,
          "minProperties": 1
        },
        "FuncionarioCreate": {
          "type": "object",
          "properties": {
            "departamento_id": {
              "type": "integer",
              "minimum": 1,
              "maximum": 2147483647
            },
            "usuario": {
              "type": "string",
              "minLength": 1,
              "maxLength": 100,
              "pattern": "^[a-zA-Z0-9._@-]+$"
            },
            "senha": {
              "type": "string",
              "format": "password",
              "minLength": 8,
              "description": "Mínimo de 8 caracteres e máximo de 72 bytes UTF-8."
            },
            "nome": {
              "type": "string",
              "minLength": 1,
              "maxLength": 150
            },
            "email": {
              "type": "string",
              "maxLength": 255,
              "nullable": true
            },
            "tipo": {
              "type": "string",
              "enum": [
                "gestor",
                "tecnico",
                "analista"
              ],
              "default": "tecnico"
            }
          },
          "required": [
            "departamento_id",
            "usuario",
            "senha",
            "nome"
          ],
          "additionalProperties": false,
          "example": {
            "departamento_id": 3,
            "usuario": "tecnico.exemplo",
            "senha": "SenhaTemporaria123",
            "nome": "Técnico Exemplo",
            "email": "tecnico@example.com",
            "tipo": "tecnico"
          }
        },
        "FuncionarioReplace": {
          "type": "object",
          "properties": {
            "departamento_id": {
              "type": "integer",
              "minimum": 1,
              "maximum": 2147483647
            },
            "usuario": {
              "type": "string",
              "minLength": 1,
              "maxLength": 100,
              "pattern": "^[a-zA-Z0-9._@-]+$"
            },
            "senha": {
              "type": "string",
              "format": "password",
              "minLength": 8,
              "description": "Opcional; ausente ou vazio mantém a senha atual."
            },
            "nome": {
              "type": "string",
              "minLength": 1,
              "maxLength": 150
            },
            "email": {
              "type": "string",
              "maxLength": 255,
              "nullable": true
            },
            "tipo": {
              "type": "string",
              "enum": [
                "gestor",
                "tecnico",
                "analista"
              ]
            }
          },
          "required": [
            "departamento_id",
            "usuario",
            "nome",
            "tipo"
          ],
          "additionalProperties": false
        },
        "FuncionarioPatch": {
          "type": "object",
          "description": "Envie ao menos um campo; ativo não pode ser alterado neste endpoint.",
          "properties": {
            "departamento_id": {
              "type": "integer",
              "minimum": 1,
              "maximum": 2147483647
            },
            "usuario": {
              "type": "string",
              "minLength": 1,
              "maxLength": 100,
              "pattern": "^[a-zA-Z0-9._@-]+$"
            },
            "senha": {
              "type": "string",
              "format": "password",
              "minLength": 8
            },
            "nome": {
              "type": "string",
              "minLength": 1,
              "maxLength": 150
            },
            "email": {
              "type": "string",
              "maxLength": 255,
              "nullable": true
            },
            "tipo": {
              "type": "string",
              "enum": [
                "gestor",
                "tecnico",
                "analista"
              ]
            }
          },
          "additionalProperties": false,
          "minProperties": 1
        },
        "ProjetoCreate": {
          "type": "object",
          "properties": {
            "nome": {
              "type": "string",
              "minLength": 1
            },
            "cliente_id": {
              "type": "integer",
              "minimum": 1,
              "maximum": 2147483647
            },
            "departamentos": {
              "type": "array",
              "minItems": 1,
              "items": {
                "type": "integer",
                "minimum": 1,
                "maximum": 2147483647
              }
            },
            "data_inicio": {
              "type": "string",
              "nullable": true,
              "description": "Texto de data aceito pelo parser Date do Node.js; null limpa o valor."
            },
            "data_fim": {
              "type": "string",
              "nullable": true,
              "description": "Texto de data aceito pelo parser Date do Node.js; null limpa o valor."
            },
            "status": {
              "type": "string",
              "enum": [
                "em_planejamento",
                "em_andamento",
                "pausado",
                "concluido"
              ],
              "default": "em_planejamento"
            }
          },
          "required": [
            "nome",
            "cliente_id",
            "departamentos"
          ],
          "additionalProperties": false,
          "example": {
            "nome": "Projeto Exemplo",
            "cliente_id": 7,
            "departamentos": [
              2,
              3
            ],
            "data_inicio": "2026-11-01",
            "data_fim": null,
            "status": "em_planejamento"
          }
        },
        "ProjetoReplace": {
          "type": "object",
          "properties": {
            "nome": {
              "type": "string",
              "minLength": 1
            },
            "cliente_id": {
              "type": "integer",
              "minimum": 1,
              "maximum": 2147483647
            },
            "departamentos": {
              "type": "array",
              "minItems": 1,
              "items": {
                "type": "integer",
                "minimum": 1,
                "maximum": 2147483647
              }
            },
            "data_inicio": {
              "type": "string",
              "nullable": true,
              "description": "Texto de data aceito pelo parser Date do Node.js; null limpa o valor."
            },
            "data_fim": {
              "type": "string",
              "nullable": true,
              "description": "Texto de data aceito pelo parser Date do Node.js; null limpa o valor."
            },
            "status": {
              "type": "string",
              "enum": [
                "em_planejamento",
                "em_andamento",
                "pausado",
                "concluido"
              ]
            }
          },
          "required": [
            "nome",
            "cliente_id",
            "departamentos",
            "status"
          ],
          "additionalProperties": false
        },
        "ProjetoPatch": {
          "type": "object",
          "description": "Envie ao menos um campo; ativo é controlado pela rota /ativo.",
          "properties": {
            "nome": {
              "type": "string",
              "minLength": 1
            },
            "cliente_id": {
              "type": "integer",
              "minimum": 1,
              "maximum": 2147483647
            },
            "departamentos": {
              "type": "array",
              "minItems": 1,
              "items": {
                "type": "integer",
                "minimum": 1,
                "maximum": 2147483647
              }
            },
            "data_inicio": {
              "type": "string",
              "nullable": true,
              "description": "Texto de data aceito pelo parser Date do Node.js; null limpa o valor."
            },
            "data_fim": {
              "type": "string",
              "nullable": true,
              "description": "Texto de data aceito pelo parser Date do Node.js; null limpa o valor."
            },
            "status": {
              "type": "string",
              "enum": [
                "em_planejamento",
                "em_andamento",
                "pausado",
                "concluido"
              ]
            }
          },
          "additionalProperties": false,
          "minProperties": 1
        },
        "AtivoRequest": {
          "type": "object",
          "properties": {
            "ativo": {
              "type": "boolean"
            }
          },
          "required": [
            "ativo"
          ],
          "additionalProperties": false,
          "example": {
            "ativo": true
          }
        },
        "StatusOrdemRequest": {
          "type": "object",
          "properties": {
            "status": {
              "type": "string",
              "enum": [
                "em_andamento",
                "aguardando",
                "validacao_testes",
                "bloqueado",
                "concluido"
              ]
            },
            "parecer_tecnico": {
              "type": "string",
              "maxLength": 1000,
              "nullable": true
            }
          },
          "required": [
            "status"
          ],
          "additionalProperties": false,
          "example": {
            "status": "em_andamento",
            "parecer_tecnico": "Atividade iniciada."
          }
        },
        "AtribuirResponsavelRequest": {
          "type": "object",
          "properties": {
            "funcionario_id": {
              "type": "integer",
              "minimum": 1,
              "maximum": 2147483647
            }
          },
          "required": [
            "funcionario_id"
          ],
          "additionalProperties": false,
          "example": {
            "funcionario_id": 12
          }
        },
        "SlaManualRequest": {
          "type": "object",
          "properties": {
            "data_limite_sla": {
              "type": "string",
              "format": "date-time"
            },
            "justificativa_sla_manual": {
              "type": "string",
              "minLength": 1
            }
          },
          "required": [
            "data_limite_sla",
            "justificativa_sla_manual"
          ],
          "additionalProperties": false,
          "example": {
            "data_limite_sla": "2026-12-15T17:00:00-03:00",
            "justificativa_sla_manual": "Prazo acordado com o solicitante."
          }
        },
        "RegistroHorasRequest": {
          "type": "object",
          "properties": {
            "duracao": {
              "type": "string",
              "minLength": 1,
              "pattern": "^(?:(?:[0-9]+w)?\\s*(?:[0-9]+d)?\\s*(?:[0-9]+h)?\\s*(?:[0-9]+m)?)$",
              "example": "2h 30m",
              "description": "Formato Jira; 1 dia = 8 horas e 1 semana = 5 dias. Deve representar duração maior que zero."
            },
            "data_trabalho": {
              "type": "string",
              "format": "date",
              "description": "AAAA-MM-DD; não pode ser uma data futura."
            }
          },
          "required": [
            "duracao",
            "data_trabalho"
          ],
          "additionalProperties": false,
          "example": {
            "duracao": "2h 30m",
            "data_trabalho": "2026-11-20"
          }
        },
        "OrdemServicoCreate": {
          "type": "object",
          "properties": {
            "tipo": {
              "type": "string",
              "enum": [
                "instalacao",
                "manutencao"
              ]
            },
            "titulo": {
              "type": "string",
              "minLength": 1,
              "maxLength": 60
            },
            "descricao": {
              "type": "string",
              "minLength": 1,
              "maxLength": 1000
            },
            "departamento_id": {
              "type": "integer",
              "minimum": 1,
              "maximum": 2147483647
            },
            "cliente_id": {
              "type": "integer",
              "minimum": 1,
              "maximum": 2147483647,
              "nullable": true
            },
            "responsavel_id": {
              "type": "integer",
              "minimum": 1,
              "maximum": 2147483647,
              "nullable": true,
              "description": "Opcional; para Analista, o backend define responsável null."
            },
            "projeto_id": {
              "type": "integer",
              "minimum": 1,
              "maximum": 2147483647,
              "nullable": true
            },
            "ativo_id": {
              "type": "integer",
              "minimum": 1,
              "maximum": 2147483647,
              "nullable": true
            },
            "anterior_id": {
              "type": "integer",
              "minimum": 1,
              "maximum": 2147483647,
              "nullable": true
            },
            "criticidade": {
              "type": "string",
              "enum": [
                "baixo",
                "medio",
                "alto",
                "muito_alto",
                "urgente"
              ],
              "default": "medio"
            },
            "parecer_tecnico": {
              "type": "string",
              "maxLength": 1000,
              "nullable": true
            },
            "status": {
              "type": "string",
              "enum": [
                "em_andamento",
                "aguardando",
                "validacao_testes",
                "bloqueado",
                "concluido"
              ],
              "default": "em_andamento",
              "description": "Status inicial; para Analista, o backend força o status padrão independentemente do valor enviado."
            },
            "data_criacao": {
              "type": "string",
              "description": "Texto de data interpretável pelo parser Date do Node.js."
            },
            "data_inicio": {
              "type": "string",
              "nullable": true,
              "description": "Texto de data interpretável pelo parser Date do Node.js."
            },
            "data_fim": {
              "type": "string",
              "nullable": true,
              "description": "Texto de data interpretável pelo parser Date do Node.js."
            },
            "data_limite_sla": {
              "type": "string",
              "nullable": true,
              "description": "Texto de data interpretável pelo parser Date do Node.js."
            },
            "prazo_dias_uteis_custom": {
              "type": "integer",
              "minimum": 1,
              "maximum": 2147483647,
              "nullable": true
            },
            "sla_manual": {
              "type": "boolean",
              "enum": [
                false
              ],
              "default": false,
              "description": "O SLA é calculado pelo sistema; não envie configuração manual."
            }
          },
          "required": [
            "tipo",
            "titulo",
            "descricao",
            "departamento_id"
          ],
          "additionalProperties": false,
          "example": {
            "tipo": "manutencao",
            "titulo": "Inspeção preventiva",
            "descricao": "Realizar inspeção preventiva do equipamento.",
            "departamento_id": 3,
            "cliente_id": 7,
            "criticidade": "medio"
          }
        },
        "OrdemServicoPatch": {
          "type": "object",
          "description": "Envie ao menos um campo. status, ativo, responsavel_id e campos de SLA não podem ser alterados por esta rota.",
          "properties": {
            "tipo": {
              "type": "string",
              "enum": [
                "instalacao",
                "manutencao"
              ]
            },
            "titulo": {
              "type": "string",
              "minLength": 1,
              "maxLength": 60
            },
            "descricao": {
              "type": "string",
              "minLength": 1,
              "maxLength": 1000
            },
            "departamento_id": {
              "type": "integer",
              "minimum": 1,
              "maximum": 2147483647
            },
            "cliente_id": {
              "type": "integer",
              "minimum": 1,
              "maximum": 2147483647,
              "nullable": true
            },
            "projeto_id": {
              "type": "integer",
              "minimum": 1,
              "maximum": 2147483647,
              "nullable": true
            },
            "ativo_id": {
              "type": "integer",
              "minimum": 1,
              "maximum": 2147483647,
              "nullable": true
            },
            "anterior_id": {
              "type": "integer",
              "minimum": 1,
              "maximum": 2147483647,
              "nullable": true
            },
            "criticidade": {
              "type": "string",
              "enum": [
                "baixo",
                "medio",
                "alto",
                "muito_alto",
                "urgente"
              ]
            },
            "parecer_tecnico": {
              "type": "string",
              "maxLength": 1000,
              "nullable": true
            },
            "data_criacao": {
              "type": "string",
              "description": "Texto de data interpretável pelo parser Date do Node.js."
            },
            "data_inicio": {
              "type": "string",
              "nullable": true,
              "description": "Texto de data interpretável pelo parser Date do Node.js."
            },
            "data_fim": {
              "type": "string",
              "nullable": true,
              "description": "Texto de data interpretável pelo parser Date do Node.js."
            },
            "justificativa": {
              "type": "string",
              "maxLength": 1000,
              "nullable": true
            }
          },
          "additionalProperties": false,
          "minProperties": 1
        },
        "ClienteResposta": {
          "type": "object",
          "properties": {
            "id": {
              "type": "integer"
            },
            "nome": {
              "type": "string"
            },
            "razao_social": {
              "type": "string"
            },
            "ramo_atuacao": {
              "type": "string"
            },
            "ativo": {
              "type": "boolean"
            },
            "locais_operacionais": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "integer"
                  },
                  "cliente_id": {
                    "type": "integer"
                  },
                  "tipo": {
                    "type": "string",
                    "enum": [
                      "offshore",
                      "terrestre",
                      "site"
                    ]
                  },
                  "descricao": {
                    "type": "string"
                  }
                },
                "required": []
              }
            }
          },
          "required": [
            "id",
            "nome",
            "razao_social",
            "ramo_atuacao",
            "ativo"
          ],
          "example": {
            "id": 21,
            "nome": "Cliente Exemplo",
            "razao_social": "Cliente Exemplo Ltda.",
            "ramo_atuacao": "Operações",
            "ativo": true,
            "locais_operacionais": [
              {
                "id": 8,
                "cliente_id": 21,
                "tipo": "terrestre",
                "descricao": "Unidade operacional"
              }
            ]
          }
        },
        "DepartamentoResposta": {
          "type": "object",
          "properties": {
            "id": {
              "type": "integer"
            },
            "nome": {
              "type": "string"
            },
            "responsavel_id": {
              "type": "integer",
              "nullable": true
            },
            "ativo": {
              "type": "boolean"
            }
          },
          "required": [
            "id",
            "nome",
            "ativo"
          ],
          "example": {
            "id": 4,
            "nome": "Manutenção",
            "responsavel_id": 12,
            "ativo": true
          }
        },
        "ProjetoResposta": {
          "type": "object",
          "properties": {
            "id": {
              "type": "integer"
            },
            "nome": {
              "type": "string"
            },
            "cliente_id": {
              "type": "integer"
            },
            "data_inicio": {
              "type": "string",
              "format": "date-time",
              "nullable": true
            },
            "data_fim": {
              "type": "string",
              "format": "date-time",
              "nullable": true
            },
            "status": {
              "type": "string",
              "enum": [
                "em_planejamento",
                "em_andamento",
                "pausado",
                "concluido"
              ]
            },
            "ativo": {
              "type": "boolean"
            },
            "departamentos": {
              "type": "array",
              "items": {
                "type": "integer"
              }
            },
            "departamentos_detalhes": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "integer"
                  },
                  "nome": {
                    "type": "string"
                  }
                },
                "required": []
              }
            },
            "cliente": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "integer"
                },
                "nome": {
                  "type": "string"
                },
                "razao_social": {
                  "type": "string"
                }
              },
              "required": []
            },
            "total_os_elegiveis": {
              "type": "integer"
            },
            "os_concluidas": {
              "type": "integer"
            },
            "percentual_conclusao": {
              "type": "number",
              "nullable": true
            },
            "ordens_servico": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "integer"
                  },
                  "titulo": {
                    "type": "string"
                  },
                  "status": {
                    "type": "string"
                  },
                  "ativo": {
                    "type": "boolean"
                  },
                  "data_criacao": {
                    "type": "string",
                    "format": "date-time"
                  },
                  "data_fim": {
                    "type": "string",
                    "format": "date-time",
                    "nullable": true
                  },
                  "data_limite_sla": {
                    "type": "string",
                    "format": "date-time",
                    "nullable": true
                  }
                },
                "required": []
              }
            }
          },
          "required": [
            "id",
            "nome",
            "cliente_id",
            "status",
            "ativo"
          ],
          "example": {
            "id": 5,
            "nome": "Projeto Exemplo",
            "cliente_id": 21,
            "data_inicio": "2026-11-01T00:00:00.000Z",
            "data_fim": null,
            "status": "em_planejamento",
            "ativo": true,
            "departamentos": [
              4
            ],
            "departamentos_detalhes": [
              {
                "id": 4,
                "nome": "Manutenção"
              }
            ],
            "cliente": {
              "id": 21,
              "nome": "Cliente Exemplo",
              "razao_social": "Cliente Exemplo Ltda."
            },
            "total_os_elegiveis": 0,
            "os_concluidas": 0,
            "percentual_conclusao": null,
            "ordens_servico": []
          }
        },
        "OrdemServicoResposta": {
          "type": "object",
          "properties": {
            "id": {
              "type": "integer"
            },
            "departamento_id": {
              "type": "integer"
            },
            "cliente_id": {
              "type": "integer",
              "nullable": true
            },
            "solicitante_id": {
              "type": "integer"
            },
            "responsavel_id": {
              "type": "integer",
              "nullable": true
            },
            "projeto_id": {
              "type": "integer",
              "nullable": true
            },
            "anterior_id": {
              "type": "integer",
              "nullable": true
            },
            "parecer_tecnico": {
              "type": "string",
              "nullable": true
            },
            "tipo": {
              "type": "string",
              "enum": [
                "instalacao",
                "manutencao"
              ]
            },
            "criticidade": {
              "type": "string",
              "enum": [
                "baixo",
                "medio",
                "alto",
                "muito_alto",
                "urgente"
              ]
            },
            "descricao": {
              "type": "string"
            },
            "status": {
              "type": "string",
              "enum": [
                "em_andamento",
                "aguardando",
                "validacao_testes",
                "bloqueado",
                "concluido"
              ]
            },
            "data_criacao": {
              "type": "string",
              "format": "date-time"
            },
            "ativo_id": {
              "type": "integer",
              "nullable": true
            },
            "data_fim": {
              "type": "string",
              "format": "date-time",
              "nullable": true
            },
            "data_inicio": {
              "type": "string",
              "format": "date-time",
              "nullable": true
            },
            "data_limite_sla": {
              "type": "string",
              "format": "date-time",
              "nullable": true
            },
            "justificativa_sla_manual": {
              "type": "string",
              "nullable": true
            },
            "prazo_dias_uteis": {
              "type": "integer",
              "nullable": true
            },
            "sla_config_id": {
              "type": "integer",
              "nullable": true
            },
            "sla_manual": {
              "type": "boolean"
            },
            "titulo": {
              "type": "string"
            },
            "ativo": {
              "type": "boolean"
            },
            "arquivada_em": {
              "type": "string",
              "format": "date-time",
              "nullable": true
            },
            "estado_sla": {
              "type": "string",
              "enum": [
                "sem_sla",
                "normal",
                "em_risco",
                "vencido",
                "encerrada"
              ]
            }
          },
          "required": [
            "id",
            "departamento_id",
            "solicitante_id",
            "tipo",
            "criticidade",
            "descricao",
            "status",
            "data_criacao",
            "sla_manual",
            "titulo",
            "ativo"
          ],
          "example": {
            "id": 2026,
            "departamento_id": 4,
            "cliente_id": 21,
            "solicitante_id": 12,
            "responsavel_id": 12,
            "projeto_id": 5,
            "anterior_id": null,
            "parecer_tecnico": null,
            "tipo": "manutencao",
            "criticidade": "medio",
            "descricao": "Inspeção preventiva do equipamento.",
            "status": "em_andamento",
            "data_criacao": "2026-11-20T12:00:00.000Z",
            "ativo_id": null,
            "data_fim": null,
            "data_inicio": null,
            "data_limite_sla": null,
            "justificativa_sla_manual": null,
            "prazo_dias_uteis": null,
            "sla_config_id": null,
            "sla_manual": false,
            "titulo": "Inspeção preventiva",
            "ativo": true,
            "arquivada_em": null,
            "estado_sla": "sem_sla"
          }
        },
        "MensagemResposta": {
          "type": "object",
          "properties": {
            "mensagem": {
              "type": "string"
            }
          },
          "required": [
            "mensagem"
          ]
        },
        "ClienteAcaoResposta": {
          "type": "object",
          "properties": {
            "mensagem": {
              "type": "string"
            },
            "cliente": {
              "$ref": "#/components/schemas/ClienteResposta"
            }
          },
          "required": [
            "mensagem",
            "cliente"
          ]
        },
        "FuncionarioAcaoResposta": {
          "type": "object",
          "properties": {
            "mensagem": {
              "type": "string"
            },
            "funcionario": {
              "$ref": "#/components/schemas/FuncionarioPublico"
            }
          },
          "required": [
            "mensagem",
            "funcionario"
          ]
        }
      }
    },
    "security": [
      {
        "BearerAuth": []
      }
    ],
    "paths": {
      "/auth/login": {
        "post": {
          "tags": [
            "Autenticação"
          ],
          "summary": "Realiza login e retorna o token JWT.",
          "description": "Acesso: Público. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "post_auth_login",
          "responses": {
            "200": {
              "description": "Login realizado; token JWT e dados públicos do funcionário.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/LoginResponse"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "usuario",
                    "senha"
                  ],
                  "properties": {
                    "usuario": {
                      "type": "string"
                    },
                    "senha": {
                      "type": "string",
                      "format": "password"
                    }
                  }
                }
              }
            }
          },
          "security": []
        }
      },
      "/auth/me": {
        "get": {
          "tags": [
            "Autenticação"
          ],
          "summary": "Retorna os dados do usuário autenticado.",
          "description": "Acesso: Autenticado. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "get_auth_me",
          "responses": {
            "200": {
              "description": "Funcionário autenticado, sem senha_hash.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/FuncionarioPublico"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          }
        }
      },
      "/cliente": {
        "get": {
          "tags": [
            "Clientes"
          ],
          "summary": "Lista clientes ativos.",
          "description": "Acesso: Autenticado. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "get_cliente",
          "responses": {
            "200": {
              "description": "Lista de clientes ativos.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/ClienteResposta"
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          }
        },
        "post": {
          "tags": [
            "Clientes"
          ],
          "summary": "Cadastra um cliente.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "post_cliente",
          "responses": {
            "201": {
              "description": "Cliente criado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/ClienteResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "409": {
              "description": "Conflito com registro existente, como nome ou razão social duplicados.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "requestBody": {
            "required": true,
            "description": "Cadastro de cliente. Os quatro campos são exigidos pelo service.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ClienteCreate"
                }
              }
            }
          }
        }
      },
      "/cliente/inativos": {
        "get": {
          "tags": [
            "Clientes"
          ],
          "summary": "Lista clientes inativos (rota autenticada).",
          "description": "Acesso: qualquer usuário autenticado. A rota não aplica autorização exclusiva de Gestor.",
          "operationId": "get_cliente_inativos",
          "responses": {
            "200": {
              "description": "Lista de clientes inativos.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/ClienteResposta"
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          }
        }
      },
      "/cliente/{id}": {
        "get": {
          "tags": [
            "Clientes"
          ],
          "summary": "Consulta um cliente.",
          "description": "Acesso: Autenticado. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "get_cliente_id",
          "responses": {
            "200": {
              "description": "Cliente encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/ClienteResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ]
        },
        "put": {
          "tags": [
            "Clientes"
          ],
          "summary": "Substitui os dados de um cliente.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "put_cliente_id",
          "responses": {
            "200": {
              "description": "Cliente atualizado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/ClienteResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "409": {
              "description": "Conflito com registro existente, como nome ou razão social duplicados.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ],
          "requestBody": {
            "required": true,
            "description": "Substituição dos dados do cliente; exige todos os campos.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ClienteReplace"
                }
              }
            }
          }
        },
        "patch": {
          "tags": [
            "Clientes"
          ],
          "summary": "Atualiza parcialmente um cliente.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "patch_cliente_id",
          "responses": {
            "200": {
              "description": "Cliente atualizado parcialmente.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/ClienteResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "409": {
              "description": "Conflito com registro existente, como nome ou razão social duplicados.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ],
          "requestBody": {
            "required": true,
            "description": "Atualização parcial do cliente.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ClientePatch"
                }
              }
            }
          }
        },
        "delete": {
          "tags": [
            "Clientes"
          ],
          "summary": "Exclui um cliente.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "delete_cliente_id",
          "responses": {
            "200": {
              "description": "Cliente inativado logicamente.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/ClienteAcaoResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ]
        }
      },
      "/cliente/{id}/ativar": {
        "patch": {
          "tags": [
            "Clientes"
          ],
          "summary": "Reativa um cliente.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "patch_cliente_id_ativar",
          "responses": {
            "200": {
              "description": "Cliente reativado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/ClienteAcaoResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ]
        }
      },
      "/departamento": {
        "get": {
          "tags": [
            "Departamentos"
          ],
          "summary": "Lista departamentos ativos.",
          "description": "Acesso: Autenticado. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "get_departamento",
          "responses": {
            "200": {
              "description": "Lista departamentos ativos.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/DepartamentoResposta"
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          }
        },
        "post": {
          "tags": [
            "Departamentos"
          ],
          "summary": "Cadastra um departamento.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "post_departamento",
          "responses": {
            "201": {
              "description": "Departamento criado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/DepartamentoResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "requestBody": {
            "required": true,
            "description": "Cadastro de departamento.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DepartamentoCreate"
                }
              }
            }
          }
        }
      },
      "/departamento/inativos": {
        "get": {
          "tags": [
            "Departamentos"
          ],
          "summary": "Lista departamentos inativos.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "get_departamento_inativos",
          "responses": {
            "200": {
              "description": "Lista departamentos inativos.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/DepartamentoResposta"
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          }
        }
      },
      "/departamento/{id}": {
        "get": {
          "tags": [
            "Departamentos"
          ],
          "summary": "Consulta um departamento.",
          "description": "Acesso: Autenticado. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "get_departamento_id",
          "responses": {
            "200": {
              "description": "Departamento encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/DepartamentoResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ]
        },
        "put": {
          "tags": [
            "Departamentos"
          ],
          "summary": "Substitui os dados do departamento.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "put_departamento_id",
          "responses": {
            "200": {
              "description": "Departamento atualizado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/DepartamentoResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ],
          "requestBody": {
            "required": true,
            "description": "Substituição dos dados do departamento.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DepartamentoReplace"
                }
              }
            }
          }
        },
        "patch": {
          "tags": [
            "Departamentos"
          ],
          "summary": "Atualiza parcialmente o departamento.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "patch_departamento_id",
          "responses": {
            "200": {
              "description": "Departamento atualizado parcialmente.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/DepartamentoResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ],
          "requestBody": {
            "required": true,
            "description": "Atualização parcial do departamento.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DepartamentoPatch"
                }
              }
            }
          }
        }
      },
      "/departamento/{id}/equipe": {
        "get": {
          "tags": [
            "Departamentos"
          ],
          "summary": "Consulta funcionários, projetos e ordens vinculados ao departamento.",
          "description": "Acesso: Autenticado; histórico/inativos somente Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "get_departamento_id_equipe",
          "responses": {
            "200": {
              "description": "Equipe e vínculos do departamento. O parâmetro historico=true exige Gestor.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "departamento": {
                        "$ref": "#/components/schemas/DepartamentoResposta"
                      },
                      "funcionarios": {
                        "type": "array",
                        "items": {
                          "$ref": "#/components/schemas/FuncionarioPublico"
                        }
                      },
                      "projetos": {
                        "type": "array",
                        "items": {
                          "type": "object",
                          "properties": {
                            "id": {
                              "type": "integer"
                            },
                            "nome": {
                              "type": "string"
                            },
                            "ativo": {
                              "type": "boolean"
                            },
                            "status": {
                              "type": "string"
                            },
                            "cliente_id": {
                              "type": "integer"
                            }
                          },
                          "required": []
                        }
                      },
                      "ordens_servico": {
                        "type": "array",
                        "items": {
                          "type": "object",
                          "properties": {
                            "id": {
                              "type": "integer"
                            },
                            "titulo": {
                              "type": "string"
                            },
                            "status": {
                              "type": "string"
                            },
                            "ativo": {
                              "type": "boolean"
                            },
                            "data_criacao": {
                              "type": "string",
                              "format": "date-time"
                            },
                            "data_limite_sla": {
                              "type": "string",
                              "format": "date-time",
                              "nullable": true
                            },
                            "responsavel_id": {
                              "type": "integer",
                              "nullable": true
                            },
                            "solicitante_id": {
                              "type": "integer"
                            }
                          },
                          "required": []
                        }
                      }
                    },
                    "required": [
                      "departamento",
                      "funcionarios",
                      "projetos",
                      "ordens_servico"
                    ]
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            },
            {
              "name": "historico",
              "in": "query",
              "schema": {
                "type": "boolean",
                "default": false
              }
            }
          ]
        }
      },
      "/departamento/{id}/ativo": {
        "patch": {
          "tags": [
            "Departamentos"
          ],
          "summary": "Ativa ou inativa um departamento.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "patch_departamento_id_ativo",
          "responses": {
            "200": {
              "description": "Estado do departamento alterado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/DepartamentoResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ],
          "requestBody": {
            "required": true,
            "description": "Altera o estado ativo do departamento.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AtivoRequest"
                }
              }
            }
          }
        }
      },
      "/funcionario": {
        "get": {
          "tags": [
            "Funcionários"
          ],
          "summary": "Lista funcionários ativos.",
          "description": "Acesso: Autenticado. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "get_funcionario",
          "responses": {
            "200": {
              "description": "Lista funcionários ativos sem senha_hash.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/FuncionarioPublico"
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          }
        },
        "post": {
          "tags": [
            "Funcionários"
          ],
          "summary": "Cadastra um funcionário.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "post_funcionario",
          "responses": {
            "201": {
              "description": "Funcionário criado sem expor senha_hash.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/FuncionarioPublico"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "409": {
              "description": "Conflito com usuário já cadastrado ou com regra de integridade dos funcionários.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "requestBody": {
            "required": true,
            "description": "Cadastro de funcionário. A senha é recebida em texto e armazenada como hash pelo backend.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FuncionarioCreate"
                }
              }
            }
          }
        }
      },
      "/funcionario/inativos": {
        "get": {
          "tags": [
            "Funcionários"
          ],
          "summary": "Lista funcionários inativos.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "get_funcionario_inativos",
          "responses": {
            "200": {
              "description": "Lista funcionários inativos; somente Gestor.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/FuncionarioPublico"
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          }
        }
      },
      "/funcionario/{id}": {
        "get": {
          "tags": [
            "Funcionários"
          ],
          "summary": "Consulta um funcionário.",
          "description": "Acesso: Autenticado. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "get_funcionario_id",
          "responses": {
            "200": {
              "description": "Funcionário encontrado sem senha_hash.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/FuncionarioPublico"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ]
        },
        "put": {
          "tags": [
            "Funcionários"
          ],
          "summary": "Substitui os dados do funcionário.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "put_funcionario_id",
          "responses": {
            "200": {
              "description": "Funcionário atualizado sem expor senha_hash.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/FuncionarioPublico"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "409": {
              "description": "Conflito com usuário já cadastrado ou com regra de integridade dos funcionários.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ],
          "requestBody": {
            "required": true,
            "description": "Atualização integral dos dados do funcionário; ativo é controlado por rotas próprias.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FuncionarioReplace"
                }
              }
            }
          }
        },
        "patch": {
          "tags": [
            "Funcionários"
          ],
          "summary": "Atualiza parcialmente o funcionário.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "patch_funcionario_id",
          "responses": {
            "200": {
              "description": "Funcionário atualizado parcialmente sem expor senha_hash.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/FuncionarioPublico"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "409": {
              "description": "Conflito com usuário já cadastrado ou com regra de integridade dos funcionários.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ],
          "requestBody": {
            "required": true,
            "description": "Atualização parcial dos dados do funcionário.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FuncionarioPatch"
                }
              }
            }
          }
        },
        "delete": {
          "tags": [
            "Funcionários"
          ],
          "summary": "Inativa/remove um funcionário conforme regra implementada.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "delete_funcionario_id",
          "responses": {
            "200": {
              "description": "Funcionário inativado logicamente.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/FuncionarioAcaoResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ]
        }
      },
      "/funcionario/{id}/ativar": {
        "patch": {
          "tags": [
            "Funcionários"
          ],
          "summary": "Reativa um funcionário.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "patch_funcionario_id_ativar",
          "responses": {
            "200": {
              "description": "Funcionário reativado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/FuncionarioAcaoResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ]
        }
      },
      "/projeto": {
        "get": {
          "tags": [
            "Projetos"
          ],
          "summary": "Lista projetos ativos.",
          "description": "Acesso: Autenticado. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "get_projeto",
          "responses": {
            "200": {
              "description": "Lista projetos ativos.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/ProjetoResposta"
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          }
        },
        "post": {
          "tags": [
            "Projetos"
          ],
          "summary": "Cadastra um projeto.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "post_projeto",
          "responses": {
            "201": {
              "description": "Projeto criado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/ProjetoResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "requestBody": {
            "required": true,
            "description": "Cadastro de projeto.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ProjetoCreate"
                }
              }
            }
          }
        }
      },
      "/projeto/inativos": {
        "get": {
          "tags": [
            "Projetos"
          ],
          "summary": "Lista projetos inativos.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "get_projeto_inativos",
          "responses": {
            "200": {
              "description": "Lista projetos inativos; somente Gestor.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/ProjetoResposta"
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          }
        }
      },
      "/projeto/{id}": {
        "get": {
          "tags": [
            "Projetos"
          ],
          "summary": "Consulta um projeto.",
          "description": "Acesso: Autenticado. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "get_projeto_id",
          "responses": {
            "200": {
              "description": "Projeto encontrado; O.S. relacionadas respeitam o perfil.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/ProjetoResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ]
        },
        "put": {
          "tags": [
            "Projetos"
          ],
          "summary": "Substitui os dados do projeto.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "put_projeto_id",
          "responses": {
            "200": {
              "description": "Projeto atualizado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/ProjetoResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ],
          "requestBody": {
            "required": true,
            "description": "Atualização integral do projeto.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ProjetoReplace"
                }
              }
            }
          }
        },
        "patch": {
          "tags": [
            "Projetos"
          ],
          "summary": "Atualiza parcialmente o projeto.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "patch_projeto_id",
          "responses": {
            "200": {
              "description": "Projeto atualizado parcialmente.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/ProjetoResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ],
          "requestBody": {
            "required": true,
            "description": "Atualização parcial do projeto.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ProjetoPatch"
                }
              }
            }
          }
        }
      },
      "/projeto/{id}/ativo": {
        "patch": {
          "tags": [
            "Projetos"
          ],
          "summary": "Ativa ou inativa um projeto.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "patch_projeto_id_ativo",
          "responses": {
            "200": {
              "description": "Estado do projeto alterado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/ProjetoResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ],
          "requestBody": {
            "required": true,
            "description": "Ativa ou inativa o projeto.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AtivoRequest"
                }
              }
            }
          }
        }
      },
      "/ordens-servico": {
        "get": {
          "tags": [
            "Ordens de serviço"
          ],
          "summary": "Lista ordens de serviço conforme escopo do usuário.",
          "description": "Acesso: Autenticado. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "get_ordens_servico",
          "responses": {
            "200": {
              "description": "Lista O.S. ativas não arquivadas com estado calculado do SLA.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/OrdemServicoResposta"
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "incluir_arquivadas",
              "in": "query",
              "schema": {
                "type": "boolean",
                "default": false
              }
            }
          ]
        },
        "post": {
          "tags": [
            "Ordens de serviço"
          ],
          "summary": "Abre uma ordem de serviço.",
          "description": "Acesso: Gestor, Técnico ou Analista. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "post_ordens_servico",
          "responses": {
            "201": {
              "description": "Ordem de serviço criada.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/OrdemServicoResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "422": {
              "description": "Configuração de SLA ausente ou condição de SLA fora dos limites permitidos.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "requestBody": {
            "required": true,
            "description": "Abertura de ordem de serviço. O solicitante é obtido do JWT e campos de SLA são definidos pelo backend.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OrdemServicoCreate"
                }
              }
            }
          }
        }
      },
      "/ordens-servico/inativas": {
        "get": {
          "tags": [
            "Ordens de serviço"
          ],
          "summary": "Lista ordens de serviço inativas.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "get_ordens_servico_inativas",
          "responses": {
            "200": {
              "description": "Lista O.S. inativas; somente Gestor.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/OrdemServicoResposta"
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          }
        }
      },
      "/ordens-servico/arquivadas": {
        "get": {
          "tags": [
            "Ordens de serviço"
          ],
          "summary": "Lista ordens de serviço arquivadas.",
          "description": "Acesso: Gestor ou Técnico. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "get_ordens_servico_arquivadas",
          "responses": {
            "200": {
              "description": "Lista O.S. arquivadas; Gestor e Técnico.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/OrdemServicoResposta"
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          }
        }
      },
      "/ordens-servico/{id}": {
        "get": {
          "tags": [
            "Ordens de serviço"
          ],
          "summary": "Consulta uma ordem de serviço.",
          "description": "Acesso: Autenticado. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "get_ordens_servico_id",
          "responses": {
            "200": {
              "description": "Ordem de serviço encontrada.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/OrdemServicoResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ]
        },
        "put": {
          "tags": [
            "Ordens de serviço"
          ],
          "summary": "Substitui os dados da ordem de serviço.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "put_ordens_servico_id",
          "responses": {
            "200": {
              "description": "Ordem de serviço atualizada.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/OrdemServicoResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ],
          "requestBody": {
            "required": true,
            "description": "Atualização integral dos campos editáveis; status, ativo, responsável e SLA possuem operações próprias.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OrdemServicoPatch"
                }
              }
            }
          }
        },
        "patch": {
          "tags": [
            "Ordens de serviço"
          ],
          "summary": "Atualiza parcialmente a ordem de serviço.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "patch_ordens_servico_id",
          "responses": {
            "200": {
              "description": "Ordem de serviço atualizada parcialmente.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/OrdemServicoResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ],
          "requestBody": {
            "required": true,
            "description": "Atualização parcial dos campos editáveis.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OrdemServicoPatch"
                }
              }
            }
          }
        },
        "delete": {
          "tags": [
            "Ordens de serviço"
          ],
          "summary": "Remove uma ordem de serviço.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "delete_ordens_servico_id",
          "responses": {
            "200": {
              "description": "Ordem de serviço excluída.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/MensagemResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ]
        }
      },
      "/ordens-servico/{id}/historico": {
        "get": {
          "tags": [
            "Ordens de serviço"
          ],
          "summary": "Atividades realizadas em uma O.S. (somente Gestor).",
          "description": "Lista somente os registros da O.S. informada, do mais recente ao mais antigo. O.S. sem atividades retorna dados vazios e paginação zerada.",
          "operationId": "get_ordens_servico_id_historico",
          "responses": {
            "200": {
              "description": "Página do histórico.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "dados": {
                        "type": "array",
                        "items": {
                          "$ref": "#/components/schemas/AtividadeAuditoria"
                        }
                      },
                      "paginacao": {
                        "$ref": "#/components/schemas/Paginacao"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            },
            {
              "name": "pagina",
              "in": "query",
              "schema": {
                "type": "integer",
                "minimum": 1,
                "default": 1
              }
            },
            {
              "name": "limite",
              "in": "query",
              "schema": {
                "type": "integer",
                "minimum": 1,
                "maximum": 100,
                "default": 10
              }
            }
          ]
        }
      },
      "/ordens-servico/atribuir/{id}": {
        "patch": {
          "tags": [
            "Ordens de serviço"
          ],
          "summary": "Atribui responsável à ordem de serviço.",
          "description": "Acesso: Gestor ou Técnico. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "patch_ordens_servico_atribuir_id",
          "responses": {
            "200": {
              "description": "Ordem de serviço atualizada.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/OrdemServicoResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ],
          "requestBody": {
            "required": true,
            "description": "Define o funcionário responsável; a autorização e o escopo são verificados no backend.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AtribuirResponsavelRequest"
                }
              }
            }
          }
        }
      },
      "/ordens-servico/{id}/sla-manual": {
        "patch": {
          "tags": [
            "Ordens de serviço"
          ],
          "summary": "Altera manualmente o SLA.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "patch_ordens_servico_id_sla_manual",
          "responses": {
            "200": {
              "description": "Ordem de serviço atualizada.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/OrdemServicoResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ],
          "requestBody": {
            "required": true,
            "description": "Define prazo de SLA manualmente; somente Gestor.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SlaManualRequest"
                }
              }
            }
          }
        }
      },
      "/ordens-servico/bloquear/{id}": {
        "patch": {
          "tags": [
            "Ordens de serviço"
          ],
          "summary": "Bloqueia uma ordem de serviço.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "patch_ordens_servico_bloquear_id",
          "responses": {
            "200": {
              "description": "Ordem de serviço atualizada.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/OrdemServicoResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ]
        }
      },
      "/ordens-servico/desbloquear/{id}": {
        "patch": {
          "tags": [
            "Ordens de serviço"
          ],
          "summary": "Desbloqueia uma ordem de serviço.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "patch_ordens_servico_desbloquear_id",
          "responses": {
            "200": {
              "description": "Ordem de serviço atualizada.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/OrdemServicoResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ]
        }
      },
      "/ordens-servico/{id}/ativo": {
        "patch": {
          "tags": [
            "Ordens de serviço"
          ],
          "summary": "Ativa ou inativa uma ordem de serviço.",
          "description": "Acesso: Gestor. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "patch_ordens_servico_id_ativo",
          "responses": {
            "200": {
              "description": "Ordem de serviço atualizada.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/OrdemServicoResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ],
          "requestBody": {
            "required": true,
            "description": "Altera o estado ativo da ordem de serviço.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AtivoRequest"
                }
              }
            }
          }
        }
      },
      "/ordens-servico/{id}/status": {
        "patch": {
          "tags": [
            "Ordens de serviço"
          ],
          "summary": "Altera o status da ordem de serviço.",
          "description": "Acesso: Gestor; Técnico somente nas ordens atribuídas a si. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "patch_ordens_servico_id_status",
          "responses": {
            "200": {
              "description": "Ordem de serviço atualizada.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/OrdemServicoResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ],
          "requestBody": {
            "required": true,
            "description": "Altera status e, opcionalmente, registra parecer técnico.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/StatusOrdemRequest"
                }
              }
            }
          }
        }
      },
      "/ordens-servico/{id}/horas": {
        "post": {
          "tags": [
            "Ordens de serviço"
          ],
          "summary": "Registra horas trabalhadas; o service valida o responsável.",
          "description": "Acesso: Autenticado; somente responsável. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "post_ordens_servico_id_horas",
          "responses": {
            "201": {
              "description": "Lançamento de horas criado.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "id": {
                        "type": "integer"
                      },
                      "os_id": {
                        "type": "integer"
                      },
                      "funcionario_id": {
                        "type": "integer"
                      },
                      "minutos": {
                        "type": "integer"
                      },
                      "data_trabalho": {
                        "type": "string",
                        "format": "date"
                      },
                      "status_os": {
                        "type": "string"
                      },
                      "criado_em": {
                        "type": "string",
                        "format": "date-time"
                      }
                    },
                    "required": [
                      "id",
                      "os_id",
                      "funcionario_id",
                      "minutos",
                      "data_trabalho",
                      "status_os",
                      "criado_em"
                    ]
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "422": {
              "description": "Duração ou data de trabalho inválida, ou data futura.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ],
          "requestBody": {
            "required": true,
            "description": "Registra duração e data do trabalho; somente o responsável pela O.S. pode registrar.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/RegistroHorasRequest"
                }
              }
            }
          }
        },
        "get": {
          "tags": [
            "Ordens de serviço"
          ],
          "summary": "Lista lançamentos de horas.",
          "description": "Acesso: Autenticado. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "get_ordens_servico_id_horas",
          "responses": {
            "200": {
              "description": "Lançamentos de horas e total da O.S.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "total_minutos": {
                        "type": "integer"
                      },
                      "total_duracao": {
                        "type": "string"
                      },
                      "lancamentos": {
                        "type": "array",
                        "items": {
                          "type": "object",
                          "properties": {
                            "id": {
                              "type": "integer"
                            },
                            "data_trabalho": {
                              "type": "string",
                              "format": "date"
                            },
                            "minutos": {
                              "type": "integer"
                            },
                            "duracao": {
                              "type": "string"
                            },
                            "status_os": {
                              "type": "string"
                            },
                            "autor": {
                              "type": "object",
                              "properties": {
                                "id": {
                                  "type": "integer"
                                },
                                "nome": {
                                  "type": "string"
                                }
                              },
                              "required": []
                            },
                            "registrado_em": {
                              "type": "string",
                              "format": "date-time"
                            }
                          },
                          "required": []
                        }
                      }
                    },
                    "required": [
                      "total_minutos",
                      "total_duracao",
                      "lancamentos"
                    ]
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ]
        }
      },
      "/ordens-servico/{id}/anexos": {
        "post": {
          "tags": [
            "Anexos"
          ],
          "summary": "Envia um anexo para a ordem de serviço.",
          "description": "Acesso: Gestor ou Técnico. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "post_ordens_servico_id_anexos",
          "responses": {
            "201": {
              "description": "Metadados do anexo criado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/AnexoResposta"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "413": {
              "description": "Arquivo maior que 50 MB.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "503": {
              "description": "Supabase Storage não configurado ou indisponível.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "requestBody": {
            "required": true,
            "content": {
              "multipart/form-data": {
                "schema": {
                  "type": "object",
                  "required": [
                    "arquivo"
                  ],
                  "properties": {
                    "arquivo": {
                      "type": "string",
                      "format": "binary",
                      "description": "Campo arquivo; um único arquivo de até 52.428.800 bytes (50 MB). Os MIME types são definidos por ANEXO_TIPOS_PERMITIDOS; o modelo aceita image/png, image/jpeg, image/webp e application/pdf."
                    },
                    "relato": {
                      "type": "string",
                      "maxLength": 2000,
                      "description": "Campo opcional com até 2.000 caracteres."
                    }
                  }
                }
              }
            }
          }
        },
        "get": {
          "tags": [
            "Anexos"
          ],
          "summary": "Lista anexos da ordem de serviço.",
          "description": "Acesso: Gestor ou Técnico. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "get_ordens_servico_id_anexos",
          "responses": {
            "200": {
              "description": "Lista de anexos da O.S.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/AnexoResposta"
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ]
        }
      },
      "/ordens-servico/{id}/anexos/{anexoId}/download": {
        "get": {
          "tags": [
            "Anexos"
          ],
          "summary": "Baixa um anexo da ordem de serviço.",
          "description": "Acesso: Gestor ou Técnico. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "get_ordens_servico_id_anexos_anexoId_download",
          "responses": {
            "200": {
              "description": "Arquivo anexado para download.",
              "content": {
                "application/octet-stream": {
                  "schema": {
                    "type": "string",
                    "format": "binary"
                  },
                  "description": "Content-Type real do arquivo; resposta também define Content-Disposition, Content-Length, X-Content-Type-Options e Cache-Control."
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            },
            {
              "name": "anexoId",
              "in": "path",
              "required": true,
              "schema": {
                "type": "string"
              },
              "description": "Identificador de anexoId."
            }
          ]
        }
      },
      "/anexos/configuracao": {
        "get": {
          "tags": [
            "Anexos"
          ],
          "summary": "Consulta regras de upload configuradas.",
          "description": "Acesso: Gestor ou Técnico. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "get_anexos_configuracao",
          "responses": {
            "200": {
              "description": "Regras atuais de upload configuradas no backend.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/ConfiguracaoAnexos"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          }
        }
      },
      "/notificacoes": {
        "get": {
          "tags": [
            "Notificações"
          ],
          "summary": "Lista notificações do usuário autenticado.",
          "description": "Acesso: Autenticado. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "get_notificacoes",
          "responses": {
            "200": {
              "description": "Lista paginada de notificações do usuário.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/NotificacaoLista"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "pagina",
              "in": "query",
              "schema": {
                "type": "integer",
                "minimum": 1,
                "default": 1
              }
            },
            {
              "name": "limite",
              "in": "query",
              "schema": {
                "type": "integer",
                "minimum": 1,
                "default": 20
              }
            },
            {
              "name": "lida",
              "in": "query",
              "schema": {
                "type": "boolean"
              },
              "description": "Filtra por notificações lidas ou não lidas."
            }
          ]
        }
      },
      "/notificacoes/nao-lidas/contagem": {
        "get": {
          "tags": [
            "Notificações"
          ],
          "summary": "Conta notificações não lidas.",
          "description": "Acesso: Autenticado. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "get_notificacoes_nao_lidas_contagem",
          "responses": {
            "200": {
              "description": "Quantidade de notificações não lidas.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "required": [
                      "total"
                    ],
                    "properties": {
                      "total": {
                        "type": "integer"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          }
        }
      },
      "/notificacoes/lidas": {
        "patch": {
          "tags": [
            "Notificações"
          ],
          "summary": "Marca todas as notificações como lidas.",
          "description": "Acesso: Autenticado. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "patch_notificacoes_lidas",
          "responses": {
            "200": {
              "description": "Quantidade atualizada.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "atualizadas": {
                        "type": "integer"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          }
        }
      },
      "/notificacoes/{id}": {
        "get": {
          "tags": [
            "Notificações"
          ],
          "summary": "Consulta uma notificação do usuário autenticado.",
          "description": "Acesso: Autenticado. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "get_notificacoes_id",
          "responses": {
            "200": {
              "description": "Notificação pertencente ao usuário autenticado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Notificacao"
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ]
        }
      },
      "/notificacoes/{id}/lida": {
        "patch": {
          "tags": [
            "Notificações"
          ],
          "summary": "Marca uma notificação como lida.",
          "description": "Acesso: Autenticado. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "patch_notificacoes_id_lida",
          "responses": {
            "204": {
              "description": "Notificação marcada como lida; resposta sem corpo."
            },
            "400": {
              "description": "Identificador UUID inválido.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Notificação não encontrada para o usuário.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ]
        }
      },
      "/auditoria": {
        "get": {
          "tags": [
            "Auditoria"
          ],
          "summary": "Logs de auditoria de todas as O.S. (somente Gestor).",
          "description": "Lista paginada, do mais recente ao mais antigo. Indicadores consideram os filtros aplicados, sem paginação. Somente leitura; não existem operações de alteração ou exclusão.",
          "operationId": "get_auditoria",
          "responses": {
            "200": {
              "description": "Página dos logs com indicadores.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "dados": {
                        "type": "array",
                        "items": {
                          "$ref": "#/components/schemas/AtividadeAuditoria"
                        }
                      },
                      "paginacao": {
                        "$ref": "#/components/schemas/Paginacao"
                      },
                      "indicadores": {
                        "$ref": "#/components/schemas/IndicadoresAuditoria"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "busca",
              "in": "query",
              "schema": {
                "type": "string",
                "maxLength": 100
              },
              "description": "Busca livre em descrição, campo, valores, justificativa, parecer, responsável e título da O.S."
            },
            {
              "name": "tipo",
              "in": "query",
              "schema": {
                "type": "string",
                "enum": [
                  "criacao",
                  "edicao",
                  "mudanca_status",
                  "atribuicao_responsavel",
                  "alteracao_sla",
                  "anexo",
                  "registro_horas",
                  "ativacao"
                ]
              }
            },
            {
              "name": "data_inicio",
              "in": "query",
              "schema": {
                "type": "string",
                "format": "date"
              },
              "description": "Primeiro dia do período, inclusive, no fuso de Brasília."
            },
            {
              "name": "data_fim",
              "in": "query",
              "schema": {
                "type": "string",
                "format": "date"
              },
              "description": "Último dia do período, inclusive; não pode ser anterior a data_inicio."
            },
            {
              "name": "pagina",
              "in": "query",
              "schema": {
                "type": "integer",
                "minimum": 1,
                "default": 1
              }
            },
            {
              "name": "limite",
              "in": "query",
              "schema": {
                "type": "integer",
                "minimum": 1,
                "maximum": 100,
                "default": 10
              }
            }
          ]
        }
      },
      "/ordens-servico/{id}/comentarios": {
        "get": {
          "tags": ["Ordens de serviço"],
          "summary": "Lista os comentários persistidos de uma ordem de serviço.",
          "description": "Gestores consultam todas as ordens; técnicos consultam ordens ativas atribuídas a eles ou não atribuídas do próprio departamento; analistas consultam ordens do próprio departamento.",
          "operationId": "get_ordens_servico_id_comentarios",
          "security": [{"BearerAuth": []}],
          "parameters": [{"name": "id", "in": "path", "required": true, "schema": {"type": "integer", "minimum": 1}}],
          "responses": {
            "200": {"description": "Comentários em ordem cronológica.", "content": {"application/json": {"schema": {"type": "array", "items": {"$ref": "#/components/schemas/ComentarioOrdem"}}}}},
            "401": {"description": "Token ausente, inválido ou expirado.", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Erro"}}}},
            "403": {"description": "Usuário sem acesso à ordem de serviço.", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Erro"}}}},
            "404": {"description": "Ordem de serviço não encontrada.", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Erro"}}}},
            "500": {"description": "Erro interno.", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Erro"}}}}
          }
        },
        "post": {
          "tags": ["Ordens de serviço"],
          "summary": "Adiciona um comentário a uma ordem de serviço.",
          "description": "O autor é obtido do token autenticado. Comentários têm até 2.000 caracteres e só podem ser adicionados a ordens ativas dentro do escopo do usuário.",
          "operationId": "post_ordens_servico_id_comentarios",
          "security": [{"BearerAuth": []}],
          "parameters": [{"name": "id", "in": "path", "required": true, "schema": {"type": "integer", "minimum": 1}}],
          "requestBody": {
            "required": true,
            "content": {"application/json": {"schema": {"type": "object", "required": ["conteudo"], "properties": {"conteudo": {"type": "string", "minLength": 1, "maxLength": 2000}}}}}
          },
          "responses": {
            "201": {"description": "Comentário salvo.", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ComentarioOrdem"}}}},
            "400": {"description": "Conteúdo vazio ou maior que 2.000 caracteres.", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Erro"}}}},
            "401": {"description": "Token ausente, inválido ou expirado.", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Erro"}}}},
            "403": {"description": "Usuário sem acesso à ordem de serviço.", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Erro"}}}},
            "404": {"description": "Ordem de serviço não encontrada.", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Erro"}}}},
            "409": {"description": "Ordem de serviço inativa.", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Erro"}}}},
            "500": {"description": "Erro interno.", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Erro"}}}}
          }
        }
      },
      "/dashboard/horas": {
        "get": {
          "tags": ["Relatórios"],
          "summary": "Retorna os totais de horas registrados no escopo do usuário.",
          "description": "Gestor consulta todos os departamentos e projetos; analista consulta somente o próprio departamento; técnico consulta somente os próprios lançamentos. Os totais são calculados a partir de lancamentos_horas.",
          "operationId": "get_dashboard_horas",
          "security": [{"BearerAuth": []}],
          "responses": {
            "200": {
              "description": "Totais, cinco lançamentos mais recentes e agregações por departamento e projeto no escopo do usuário.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "required": ["total_minutos", "total_horas", "total_duracao", "quantidade_lancamentos", "ultimos_lancamentos", "por_departamento", "por_projeto"],
                    "properties": {
                      "total_minutos": {"type": "integer"},
                      "total_horas": {"type": "number"},
                      "total_duracao": {"type": "string"},
                      "quantidade_lancamentos": {"type": "integer", "minimum": 0},
                      "ultimos_lancamentos": {
                        "type": "array",
                        "items": {
                          "type": "object",
                          "required": ["id", "os_id", "ordem_titulo", "data_trabalho", "minutos", "duracao", "funcionario", "registrado_em"],
                          "properties": {
                            "id": {"type": "string"},
                            "os_id": {"type": "integer"},
                            "ordem_titulo": {"type": "string"},
                            "data_trabalho": {"type": "string", "format": "date"},
                            "minutos": {"type": "integer"},
                            "duracao": {"type": "string"},
                            "funcionario": {"type": "object", "required": ["id", "nome"], "properties": {"id": {"type": "integer"}, "nome": {"type": "string"}}},
                            "registrado_em": {"type": "string", "format": "date-time"}
                          }
                        }
                      },
                      "por_departamento": {
                        "type": "array",
                        "items": {
                          "type": "object",
                          "required": ["id", "nome", "total_minutos", "total_horas", "total_duracao"],
                          "properties": {
                            "id": {"type": "integer"},
                            "nome": {"type": "string"},
                            "total_minutos": {"type": "integer"},
                            "total_horas": {"type": "number"},
                            "total_duracao": {"type": "string"}
                          }
                        }
                      },
                      "por_projeto": {
                        "type": "array",
                        "items": {
                          "type": "object",
                          "required": ["id", "nome", "total_minutos", "total_horas", "total_duracao"],
                          "properties": {
                            "id": {"type": "integer", "nullable": true},
                            "nome": {"type": "string"},
                            "total_minutos": {"type": "integer"},
                            "total_horas": {"type": "number"},
                            "total_duracao": {"type": "string"}
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Erro"}}}
            },
            "403": {
              "description": "Usuário autenticado sem perfil permitido.",
              "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Erro"}}}
            },
            "500": {
              "description": "Erro interno.",
              "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Erro"}}}
            }
          }
        }
      },
      "/ordens-servico/{id}/relatorio.pdf": {
        "get": {
          "tags": [
            "Relatórios"
          ],
          "summary": "Gera e baixa o relatório PDF de uma ordem de serviço.",
          "description": "Acesso: Gestor ou Analista. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "get_ordens_servico_id_relatorio_pdf",
          "responses": {
            "200": {
              "description": "Documento PDF para download.",
              "content": {
                "application/pdf": {
                  "schema": {
                    "type": "string",
                    "format": "binary"
                  }
                }
              },
              "headers": {
                "Content-Disposition": {
                  "schema": {
                    "type": "string"
                  },
                  "description": "attachment; filename com o nome do relatório."
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ]
        }
      },
      "/cliente/{id}/relatorio.pdf": {
        "get": {
          "tags": [
            "Relatórios"
          ],
          "summary": "Gera e baixa o relatório PDF de um cliente.",
          "description": "Acesso: Gestor ou Analista. A autorização é aplicada pelo backend. Consulte os schemas de entrada e as respostas reais do endpoint ao executar a operação.",
          "operationId": "get_cliente_id_relatorio_pdf",
          "responses": {
            "200": {
              "description": "Documento PDF para download.",
              "content": {
                "application/pdf": {
                  "schema": {
                    "type": "string",
                    "format": "binary"
                  }
                }
              },
              "headers": {
                "Content-Disposition": {
                  "schema": {
                    "type": "string"
                  },
                  "description": "attachment; filename com o nome do relatório."
                }
              }
            },
            "400": {
              "description": "Requisição inválida ou dados fora das validações.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "401": {
              "description": "Token ausente, inválido ou expirado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "403": {
              "description": "Usuário autenticado sem permissão para esta operação.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "404": {
              "description": "Registro não encontrado.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            },
            "500": {
              "description": "Erro interno.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Erro"
                  }
                }
              }
            }
          },
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Identificador de id."
            }
          ]
        }
      },
      "/health": {
        "get": {
          "tags": [
            "Sistema"
          ],
          "summary": "Verifica a disponibilidade da API.",
          "description": "Endpoint público de health check; não exige autenticação.",
          "operationId": "get_health",
          "security": [],
          "responses": {
            "200": {
              "description": "API disponível.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "status": {
                        "type": "string",
                        "enum": [
                          "ok"
                        ]
                      }
                    },
                    "required": [
                      "status"
                    ]
                  }
                }
              }
            }
          }
        }
      }
    }
  } as const;

export const especificacaoOpenApi = {
  ...base,
  servers: [
    ...(process.env.API_PUBLIC_URL?.trim() ? [{ url: process.env.API_PUBLIC_URL.trim().replace(/\/$/, ''), description: 'Ambiente público' }] : []),
    ...(process.env.API_HOMOLOGACAO_URL?.trim() ? [{ url: process.env.API_HOMOLOGACAO_URL.trim().replace(/\/$/, ''), description: 'Homologação' }] : []),
    ...(process.env.API_PRODUCAO_URL?.trim() ? [{ url: process.env.API_PRODUCAO_URL.trim().replace(/\/$/, ''), description: 'Produção' }] : []),
    ...(![process.env.API_PUBLIC_URL, process.env.API_HOMOLOGACAO_URL, process.env.API_PRODUCAO_URL].some((url) => url?.trim()) ? [{ url: '/', description: 'Origem atual da API' }] : []),
  ],
};
