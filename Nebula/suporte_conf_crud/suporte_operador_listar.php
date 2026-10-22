<?php
// ==========================================================
// GET suporte_operador_listar.php
// Lista os operadores do suporte (suporte_login) com as permissões de cada um.
// Também devolve "eu": quem está logado e o que ele pode liberar para os outros.
// ==========================================================

header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/../iniciar_sessao.php';
iniciarSessao('suporte');

include_once __DIR__ . '/../connect_nebula.php';
require_once __DIR__ . '/../suporte_permissoes.php';

$eu = exigirPermissao($link, 'configuracoes');

try {
    $res = mysqli_query($link, "SELECT id_suporte, nome, email, cargo, ativo, acesso_total, permissoes
                                FROM suporte_login
                                ORDER BY nome");

    $operadores = [];
    while ($l = mysqli_fetch_assoc($res)) {
        $operadores[] = [
            "id"           => (int) $l["id_suporte"],
            "nome"         => $l["nome"],
            "email"        => $l["email"],
            "cargo"        => $l["cargo"] ?? "",
            "acesso_total" => ((int) $l["acesso_total"] === 1),
            "permissoes"   => limparPermissoes($l["permissoes"] ?? "[]"),
            "status"       => ((int) $l["ativo"] === 1) ? "ativo" : "inativo"
        ];
    }

    echo json_encode([
        "sucesso"    => true,
        "operadores" => $operadores,
        "eu"         => ["id" => $eu["id"], "total" => $eu["total"], "menus" => $eu["menus"]]
    ]);

} catch (Throwable $erro) {
    error_log("Erro ao listar operadores: " . $erro->getMessage());
    responderJsonErro(500, "Erro ao consultar os operadores.");
}
