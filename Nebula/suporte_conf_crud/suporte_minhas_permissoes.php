<?php
// ==========================================================
// GET suporte_minhas_permissoes.php
// Diz ao front-end (suporte_permissoes.js) quais menus o operador logado pode ver.
// Não exige nenhum menu específico: só que esteja logado como suporte.
// ==========================================================

header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/../iniciar_sessao.php';
iniciarSessao('suporte');

include_once __DIR__ . '/../connect_nebula.php';
require_once __DIR__ . '/../suporte_permissoes.php';

$eu = carregarSuporteLogado($link);

echo json_encode([
    "sucesso" => true,
    "nome"    => $eu['nome'],
    "total"   => $eu['total'],
    "menus"   => array_merge(['inicio'], $eu['menus'])   // Início é sempre liberado
]);
