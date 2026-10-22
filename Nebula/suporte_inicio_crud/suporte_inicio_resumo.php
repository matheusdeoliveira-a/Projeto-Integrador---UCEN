<?php
// ==========================================================
// GET suporte_inicio_crud/suporte_inicio_resumo.php
// Números do painel Início do suporte:
//   - alunos matriculados   (tabela matriculas)
//   - professores ativos    (tabela prof_login)
//   - chamados pendentes + os 4 chamados mais recentes (tabela chamados)
//
// O Início é liberado para todo operador, mas cada número pertence a um menu
// com permissão própria. Por isso só devolvemos o que o operador pode ver;
// o que ele não pode ver volta como null e a tela mostra "—".
//   alunos      -> menu "academico"
//   professores -> menu "professores"
//   chamados    -> menu "atendimento"
// ==========================================================
header("Content-Type: application/json; charset=utf-8");
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once __DIR__ . '/../iniciar_sessao.php';
iniciarSessao('suporte');

include_once __DIR__ . '/../connect_nebula.php';
mysqli_set_charset($link, "utf8mb4");
require_once __DIR__ . '/../suporte_permissoes.php';

$eu = carregarSuporteLogado($link);   // 401/403 em JSON se não estiver logado

// Conta linhas de um SELECT COUNT(*) com um parâmetro (prepared statement)
function contar(mysqli $link, string $sql, string $tipos, ...$valores): int {
    $stmt = mysqli_prepare($link, $sql);
    mysqli_stmt_bind_param($stmt, $tipos, ...$valores);
    mysqli_stmt_execute($stmt);
    $linha = mysqli_fetch_row(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);
    return (int) ($linha[0] ?? 0);
}

// "há 2 horas", "ontem", "há 3 dias"... (a diferença é calculada pelo próprio banco,
// assim não depende do fuso do PHP)
function tempoRelativo(int $minutos, int $dias, ?string $criadoEm): string {
    if ($minutos < 1)  return "agora mesmo";
    if ($minutos < 60) return "há " . $minutos . ($minutos === 1 ? " minuto" : " minutos");
    if ($dias === 0) {
        $h = intdiv($minutos, 60);
        return "há " . $h . ($h === 1 ? " hora" : " horas");
    }
    if ($dias === 1) return "ontem";
    if ($dias < 30)  return "há " . $dias . " dias";
    return $criadoEm ? date('d/m/Y', strtotime($criadoEm)) : "há muito tempo";
}

try {

    $resposta = [
        "sucesso"     => true,
        "alunos"      => null,
        "professores" => null,
        "chamados"    => null    // {pendentes: n, recentes: [...]}
    ];

    // ---------- ALUNOS MATRICULADOS ----------
    // Matrícula confirmada (já paga) e aluno ativo. Trancado, cancelado e
    // "aguardando pagamento" não entram.
    if (in_array('academico', $eu['menus'], true)) {
        $resposta["alunos"] = contar($link,
            "SELECT COUNT(*) FROM matriculas
              WHERE status_matricula = ? AND COALESCE(status_aluno, 'ativo') = ?",
            "ss", "confirmada", "ativo");
    }

    // ---------- PROFESSORES ATIVOS ----------
    if (in_array('professores', $eu['menus'], true)) {
        $resposta["professores"] = contar($link,
            "SELECT COUNT(*) FROM prof_login WHERE ativo = ?",
            "i", 1);
    }

    // ---------- CHAMADOS ----------
    if (in_array('atendimento', $eu['menus'], true)) {

        $pendentes = contar($link,
            "SELECT COUNT(*) FROM chamados WHERE status = ?",
            "s", "Pendente");

        $limite = 4;
        $stmt = mysqli_prepare($link,
            "SELECT id_chamado, nome, assunto, status, criado_em,
                    TIMESTAMPDIFF(MINUTE, criado_em, NOW())  AS minutos,
                    DATEDIFF(CURDATE(), DATE(criado_em))     AS dias
               FROM chamados
              ORDER BY id_chamado DESC
              LIMIT ?");
        mysqli_stmt_bind_param($stmt, "i", $limite);
        mysqli_stmt_execute($stmt);
        $res = mysqli_stmt_get_result($stmt);

        $recentes = [];
        while ($c = mysqli_fetch_assoc($res)) {
            $recentes[] = [
                "id"      => (int) $c['id_chamado'],
                "nome"    => $c['nome'],
                "assunto" => $c['assunto'],
                "status"  => $c['status'],
                "quando"  => tempoRelativo((int) $c['minutos'], (int) $c['dias'], $c['criado_em'])
            ];
        }
        mysqli_stmt_close($stmt);

        $resposta["chamados"] = ["pendentes" => $pendentes, "recentes" => $recentes];
    }

    echo json_encode($resposta, JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {

    error_log("suporte_inicio_resumo: " . $erro->getMessage());
    http_response_code(500);
    echo json_encode(["sucesso" => false, "mensagem" => "Não foi possível carregar o painel."]);

}
