<?php
// Lista as inscrições com isenção (e os documentos da tentativa atual de cada uma).
include_once(__DIR__ . "/academico-base-nebula.php");
require_once __DIR__ . '/../suporte_permissoes.php';
exigirPermissao($link, 'academico');
exigirMetodo('GET');

const ROTULOS_DOC = [
    'doc-historico'   => 'Histórico escolar',
    'doc-residencia'  => 'Comprovante de residência',
    'doc-holerite'    => 'Holerite / contracheque',
    'doc-extrato'     => 'Extrato bancário'
];

try {

    $resultado = mysqli_query($link,
        "SELECT id_inscricoes AS id, nome_completo AS nome, cpf, email, telefone,
                curso_opcao1 AS curso, ensino_medio, status_isencao AS status,
                tentativas_isencao AS tentativas, motivo_recusa AS motivo,
                DATE_FORMAT(atualizado_em, '%d/%m/%Y %H:%i') AS enviado
           FROM inscricoes
          WHERE status_isencao IS NOT NULL
          ORDER BY (status_isencao = 'em_analise') DESC, atualizado_em DESC");
    $inscricoes = mysqli_fetch_all($resultado, MYSQLI_ASSOC);

    // Documentos: só os da tentativa atual de cada inscrição
    $docs = mysqli_query($link,
        "SELECT d.id_doc AS id, d.id_inscricoes AS inscricao, d.tipo, d.nome_original AS nome
           FROM inscricao_documentos d
           JOIN inscricoes i ON i.id_inscricoes = d.id_inscricoes
                            AND d.tentativa = i.tentativas_isencao
          ORDER BY d.id_doc");

    $porInscricao = [];
    while ($d = mysqli_fetch_assoc($docs)) {
        $porInscricao[$d['inscricao']][] = [
            "id"    => (int) $d['id'],
            "tipo"  => ROTULOS_DOC[$d['tipo']] ?? $d['tipo'],
            "nome"  => $d['nome']
        ];
    }

    foreach ($inscricoes as &$i) {
        $i['id']          = (int) $i['id'];
        $i['tentativas']  = (int) $i['tentativas'];
        $i['documentos']  = $porInscricao[$i['id']] ?? [];
    }
    unset($i);

    echo json_encode(["sucesso" => true, "inscricoes" => $inscricoes, "maximo" => 3]);

} catch (mysqli_sql_exception $e) {

    error_log("listar isencoes: " . $e->getMessage());
    http_response_code(500);
    responderErro("Não foi possível carregar as isenções.");

}
