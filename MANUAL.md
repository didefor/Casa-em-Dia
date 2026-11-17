# Manual — Casa em Dia (versão nuvem)

Site das finanças da casa: contas, cartões, o que falta pagar, renda, poupança e despensa.
Funciona no celular e no computador, de qualquer lugar (não depende do servidor de casa ligado).

## Entrar
- **Primeira vez:** *Criar conta* → seu nome, nome da casa, e-mail e senha. Entra na hora, sem aprovação.
- **Pessoa da casa (ex.: Kyaren):** não precisa criar conta. Quem já está dentro cria o acesso dela em **Pessoas**.
- Trocar senha: botão 👤 no topo → *Minha conta*.

## As telas
| Tela | Para quê |
|---|---|
| **Visão** | Resumo do mês: renda recebida/prevista, sobra, falta pagar, saldos das contas e alerta se alguma vai ficar negativa. Mostra também o **acerto da casa** (quem devolve quanto para quem). |
| **Lançamentos** | Lançar gasto, entrada, compra no cartão (com parcelas), transferência entre contas, guardar/retirar da caixinha. Lista do mês com busca e filtro por conta. Clique na descrição para editar. |
| **A pagar** | Contas fixas, faturas dos cartões, parcelas de empréstimo, assinaturas fora do cartão e depósitos das caixinhas. *Marcar como pago* já registra a saída na conta; *Desfazer* apaga tudo junto. |
| **Renda** | Salários e contratos do mês: previsto × recebido. *Recebi* registra a entrada na conta. |
| **Despensa** | Estoque de casa e **lista de compras** automática (o que está abaixo do mínimo). Guarda o histórico de preços. |
| **Pessoas** | Quem é da casa e o salário de cada um (usado para dividir as contas). Dá acesso ou tira o acesso. |
| **Cadastros** | Contas bancárias, cartões, contas fixas, assinaturas, empréstimos, receitas, caixinhas, bens, projetos etc. |
| **Ajustes** | Nome da casa, divisão das contas (proporcional ao salário ou meio a meio) e **cópia de segurança** dos dados. |

## Pessoas e acesso
Em **Pessoas → Adicionar pessoa**:
- **Só cadastro:** preencha nome e salário. Ela entra na divisão das contas, mas não tem login.
- **Com login:** marque *Criar login para esta pessoa*, ponha o e-mail e uma senha inicial (mín. 8) e passe para ela.
  Ela entra e vê os mesmos dados da casa. Depois troca a senha em *Minha conta*.
- Já cadastrada sem login? Abra *Criar acesso para…* no cartão dela.
- **Remover acesso:** o login é apagado, mas o cadastro e os lançamentos dela continuam.

Cada casa só vê os próprios dados. Alguém que crie conta por fora ganha uma casa vazia separada, sem acesso à de vocês.

## Dicas
- **Cartão:** a compra cai na fatura certa pelo dia de fechamento do cartão. Cadastre fechamento e vencimento.
- **Transferência** entre contas suas não conta como renda nem como gasto.
- **Contas da casa** (tipo *casa*) são divididas no acerto; as do tipo *pessoal*, não.
- **Backup:** em *Ajustes → Baixar cópia de todos os dados*. Guarde de vez em quando.

## Bom saber
- O Supabase grátis **pausa o projeto depois de 7 dias sem ninguém usar**. Se o site parar de carregar dados,
  entre em supabase.com → projeto → *Restore*. Nada se perde.
- *Esqueci a senha* por e-mail só funciona depois de configurar um e-mail próprio no Supabase (Auth → SMTP).
  Até lá, se alguém esquecer: em **Pessoas**, remova o acesso e crie de novo com outra senha.
- O site novo e o Casa em Dia do servidor de casa são **separados**: o que lançar em um não aparece no outro.
