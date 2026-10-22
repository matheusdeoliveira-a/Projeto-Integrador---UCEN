<?php
// ==========================================================
// GET relatorios_crud/relatorio_listar.php
// Lista os PDFs da aba "Relatórios gerados" (mais novos primeiro).
// ==========================================================
require_once __DIR__ . '/relatorios_comum.php';

$res = mysqli_query($link,
    "SELECT id_relatorio, titulo, categoria, periodo, arquivo_original, tamanho, enviado_por, criado_em
       FROM relatorios_suporte
      ORDER BY id_relatorio DESC
      LIMIT 500");

$relatorios = [];
while ($r = mysqli_fetch_assoc($res)) {
    $relatorios[] = [
        "id"          => (int) $r['id_relatorio'],
        "titulo"      => $r['titulo'],
        "categoria"   => $r['categoria'],
        "periodo"     => $r['periodo'],
        "arquivo"     => $r['arquivo_original'],
        "tamanho"     => (int) $r['tamanho'],
        "enviado_por" => $r['enviado_por'],
        "data"        => date('d/m/Y', strtotime($r['criado_em']))
    ];
}

saida(["sucesso" => true, "relatorios" => $relatorios]);
