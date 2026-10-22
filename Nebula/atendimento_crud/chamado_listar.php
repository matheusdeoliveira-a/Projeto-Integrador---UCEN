<?php
// ==========================================================
// GET atendimento_crud/chamado_listar.php
// Lista os chamados para a Central de Atendimento. Só para o suporte com o menu "Central de Atendimento".
// ==========================================================
header("Content-Type: application/json; charset=utf-8");
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once __DIR__ . '/../iniciar_sessao.php';
iniciarSessao('suporte');

include_once __DIR__ . '/../connect_nebula.php';
mysqli_set_charset($link, "utf8mb4");
require_once __DIR__ . '/../suporte_permissoes.php';
exigirPermissao($link, 'atendimento');

$origens = ['home' => 'Site (Ajuda)', 'portal_aluno' => 'Portal do Aluno', 'suporte' => 'Aberto pelo suporte'];

try {

    $res = mysqli_query($link,
        "SELECT id_chamado, nome, email, categoria, assunto, mensagem, origem, responsavel, status, criado_em
           FROM chamados
          ORDER BY id_chamado DESC
          LIMIT 500");

    $chamados = [];
    while ($c = mysqli_fetch_assoc($res)) {
        $chamados[] = [
            "num"         => (int) $c['id_chamado'],
            "id"          => "#CH-" . str_pad($c['id_chamado'], 4, '0', STR_PAD_LEFT),
            "aluno"       => $c['nome'],
            "email"       => $c['email'] ?? '',
            "categoria"   => $c['categoria'],
            "assunto"     => $c['assunto'],
            "mensagem"    => $c['mensagem'],
            "origem"      => $origens[$c['origem']] ?? $c['origem'],
            "data"        => date('d/m/Y H:i', strtotime($c['criado_em'])),
            "responsavel" => $c['responsavel'],
            "status"      => $c['status']
        ];
    }

    echo json_encode(["sucesso" => true, "chamados" => $chamados]);

} catch (mysqli_sql_exception $e) {

    error_log("chamado_listar: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["sucesso" => false, "erro" => "Não foi possível carregar os chamados."]);

}
