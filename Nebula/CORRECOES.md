# Correções aplicadas

## Como instalar
Copie o conteúdo desta pasta POR CIMA do seu projeto (mesma estrutura de pastas).
Seus arquivos de segredos NÃO estão no pacote e continuam como estão na sua pasta:
`config_email.php`, `entrar_google/config_google.php` e `sirius_gemini/config_gemini.php`.
Imagens e vídeos também não vieram (não foram alterados): mantenha os seus.
Depois do primeiro deploy, limpe os cookies do navegador (ou use aba anônima).

## O que mudou
1. **Sessão separada por portal** (aluno / professor / suporte), via `iniciar_sessao.php`.
   Logout em um portal não derruba os outros.
   - Login (senha, código e Google), 3 `logout_*.php`, e todos os PHPs de agenda, calendário,
     arquivos, acadêmico, perfil do professor e CRUD de professores do suporte.
   - `inscricao_php/inscricao-salvar-nebula.php` ficou como estava (sessão de visitante).
2. **Botão de sair** nas 23 páginas dos portais (HTML + CSS), com 2 s de carregamento e volta para a home.
3. **Segurança**
   - `arquivos_crud/` (excluir, listar, nova_pasta, turmas, upload) agora exige professor logado.
   - `academico_crud/` agora exige suporte logado (antes qualquer logado entrava).
   - `tela-de-carregamento.html` só aceita destino da própria pasta (bloqueia link externo).
   - `.gitignore` criado; senha antiga removida do `login/LEIA-ME_LOGIN_CODIGO.md`.
4. **Bugs**
   - `pagamento/criar_pagamento.php`: caminho do `vendor/autoload.php` corrigido.
   - `salvar_logado_prof/*`: include errado (`config_google.php`) trocado por `connect_nebula.php`,
     sessão do professor e checagem de tipo.

## Ainda pendente (precisa de decisão ou de arquivos que não existem)
- `salvar_logado_prof/*` agora usa `$_SESSION['id_prof']` no lugar do antigo id de usuário.
  Confirme que `professores.id_usuarios` guarda o `id_prof`; se não, renomeie a coluna/ajuste a consulta.
- `aluno_perfil.js` chama `salva_perfil_aluno.php`, `busca_perfil_aluno.php` e
  `salva_preferencia_aluno.php`, que não existem no projeto.
- Gere um novo Client Secret do Google (o atual foi exposto em conversa) e confira se a senha de app
  do Gmail antiga foi revogada.
- `aluno.html` (portal antigo em arquivo único) não foi alterado.
