<?php
// ==========================================================
// GET suporte_dados_obter.php
// Devolve os "Dados de atendimento & contato" (tabela suporte_dados, linha id = 1).
// Vale para todo o suporte: quem tem acesso às Configurações vê os mesmos dados.
// ==========================================================

header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/../iniciar_sessao.php';
iniciarSessao('suporte');

include_once __DIR__ . '/../connect_nebula.php';
require_once __DIR__ . '/../suporte_permissoes.php';

exigirPermissao($link, 'configuracoes');

try {
    $res = mysqli_query($link, "SELECT nome_equipe, email, telefone, whatsapp, horario FROM suporte_dados WHERE id = 1 LIMIT 1");
    $dados = mysqli_fetch_assoc($res);

    // Ainda não salvou nada: devolve tudo vazio (a tela mostra os campos em branco)
    if (!$dados) {
        $dados = ["nome_equipe" => "", "email" => "", "telefone" => "", "whatsapp" => "", "horario" => ""];
    }

    echo json_encode(["sucesso" => true, "dados" => $dados]);

} catch (Throwable $erro) {
    error_log("Erro ao obter dados de atendimento: " . $erro->getMessage());
    responderJsonErro(500, "Erro ao carregar os dados de atendimento.");
}
