<?php
// ==========================================================
// vestibular_nota_nebula.php
// "Gerar nota em diante": sorteia a nota do vestibular (50 a 100), deixa o
// status como 'pendente' (aparece para o suporte decidir) e cria o token da matrícula.
//
// Usado por TRÊS caminhos (assim a regra fica num lugar só):
//   1) academico_crud/isencao-decidir-nebula.php  -> quando o suporte APROVA a isenção
//   2) pagamento/confirmar_pix.php                -> quando o Pix simulado é confirmado
//   3) inscricao_php/inscricao-enem-salvar-nebula.php -> inscrição pelo ENEM
//      (aqui $sortearNota = false: a nota está dentro do PDF do boletim, então o campo
//       fica NULL e o suporte só aprova ou recusa olhando o PDF)
//
// Chame DENTRO de uma transação já aberta.
// COALESCE garante que nota, status e token são gerados uma única vez por inscrição.
// ==========================================================

function gerarNotaVestibular($link, $idInscricao, $sortearNota = true) {

    $nota  = $sortearNota ? random_int(50, 100) : null;
    $token = bin2hex(random_bytes(16));

    $stmt = mysqli_prepare($link,
        "UPDATE inscricoes
            SET nota_vestibular   = COALESCE(nota_vestibular, ?),
                status_vestibular = COALESCE(status_vestibular, 'pendente'),
                token_matricula   = COALESCE(token_matricula, ?)
          WHERE id_inscricoes = ?");
    mysqli_stmt_bind_param($stmt, "isi", $nota, $token, $idInscricao);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);
}
