<?php
// Lista as análises pendentes/decididas para o suporte: vestibular (nota gerada pelo sistema) e ENEM
// (sem nota: o suporte confere o PDF do boletim e aprova ou recusa).
include_once(__DIR__ . "/academico-base-nebula.php");
require_once __DIR__ . '/../suporte_permissoes.php';
exigirPermissao($link, 'academico');
exigirMetodo('GET');

const ROTULOS_DOC_ENEM = [
    'boletim-enem' => 'Boletim do ENEM',
    'laudo-pcd'    => 'Laudo médico (PcD)'
];

try {

    $resultado = mysqli_query($link,
        "SELECT id_inscricoes AS id, nome_completo AS nome, cpf, email,
                curso_opcao1 AS curso, ingresso, nota_vestibular AS nota,
                status_vestibular AS status, motivo_vestibular AS motivo,
                DATE_FORMAT(analisado_em, '%d/%m/%Y %H:%i') AS isencao_em,
                DATE_FORMAT(analisado_vestibular_em, '%d/%m/%Y %H:%i') AS decidido_em
           FROM inscricoes
          WHERE status_vestibular IS NOT NULL
          ORDER BY (status_vestibular = 'pendente') DESC, COALESCE(analisado_em, atualizado_em) DESC");
    $notas = mysqli_fetch_all($resultado, MYSQLI_ASSOC);

    // PDFs do ENEM (boletim e laudo), para o suporte abrir pela própria tela
    $docs = mysqli_query($link,
        "SELECT d.id_doc AS id, d.id_inscricoes AS inscricao, d.tipo, d.nome_original AS nome
           FROM inscricao_documentos d
           JOIN inscricoes i ON i.id_inscricoes = d.id_inscricoes
          WHERE i.ingresso = 'enem'
          ORDER BY d.id_doc");

    $porInscricao = [];
    while ($d = mysqli_fetch_assoc($docs)) {
        $porInscricao[$d['inscricao']][] = [
            "id"   => (int) $d['id'],
            "tipo" => ROTULOS_DOC_ENEM[$d['tipo']] ?? $d['tipo'],
            "nome" => $d['nome']
        ];
    }

    foreach ($notas as &$n) {
        $n['id']         = (int) $n['id'];
        // ENEM não tem nota sorteada: vem NULL e a tela mostra "ver boletim"
        $n['nota']       = $n['nota'] === null ? null : (int) $n['nota'];
        $n['documentos'] = $porInscricao[$n['id']] ?? [];
    }
    unset($n);

    echo json_encode(["sucesso" => true, "notas" => $notas]);

} catch (mysqli_sql_exception $e) {

    error_log("listar notas: " . $e->getMessage());
    http_response_code(500);
    responderErro("Não foi possível carregar as notas do vestibular.");

}
