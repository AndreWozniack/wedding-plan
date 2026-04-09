import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { atualizarStatusAtrasados } from "@/lib/actions/pagamentos";

export default async function Dashboard() {
  await atualizarStatusAtrasados();

  const [tarefas, fornecedores, pagamentos] = await Promise.all([
    prisma.tarefa.findMany(),
    prisma.fornecedor.findMany({ include: { pagamentos: true } }),
    prisma.pagamento.findMany({
      include: { fornecedor: true },
      orderBy: { vencimento: "asc" },
    }),
  ]);

  const hoje = new Date();
  const em30dias = new Date();
  em30dias.setDate(hoje.getDate() + 30);

  const totalOrcamento = fornecedores.reduce((s, f) => s + f.valorTotal, 0);
  const totalPago = pagamentos
    .filter((p) => p.status === "PAGO")
    .reduce((s, p) => s + p.valor, 0);
  const totalPendente = pagamentos
    .filter((p) => p.status !== "PAGO")
    .reduce((s, p) => s + p.valor, 0);

  const tarefasConcluidas = tarefas.filter((t) => t.status === "CONCLUIDA").length;
  const tarefasPendentes = tarefas.filter((t) => t.status !== "CONCLUIDA").length;
  const progresso = tarefas.length > 0 ? Math.round((tarefasConcluidas / tarefas.length) * 100) : 0;

  const proximosPagamentos = pagamentos.filter(
    (p) => p.status !== "PAGO" && new Date(p.vencimento) <= em30dias
  );

  const atrasados = pagamentos.filter((p) => p.status === "ATRASADO");

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--primary)" }}>
          Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Visão geral do seu planejamento
        </p>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 gap-4 mb-6" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="card">
          <div className="text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>Orçamento Total</div>
          <div className="text-xl font-semibold" style={{ color: "var(--primary)" }}>{formatCurrency(totalOrcamento)}</div>
        </div>
        <div className="card">
          <div className="text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>Pago</div>
          <div className="text-xl font-semibold" style={{ color: "#166534" }}>{formatCurrency(totalPago)}</div>
        </div>
        <div className="card">
          <div className="text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>A Pagar</div>
          <div className="text-xl font-semibold" style={{ color: atrasados.length > 0 ? "#991b1b" : "#854d0e" }}>
            {formatCurrency(totalPendente)}
          </div>
        </div>
        <div className="card">
          <div className="text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>Fornecedores</div>
          <div className="text-xl font-semibold">{fornecedores.length}</div>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {/* Checklist progress */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Checklist</h2>
            <Link href="/checklist" className="text-xs" style={{ color: "var(--primary)" }}>
              Ver tudo →
            </Link>
          </div>
          <div className="flex items-end gap-3 mb-3">
            <span className="text-3xl font-bold" style={{ color: "var(--primary)" }}>{progresso}%</span>
            <span className="text-sm pb-1" style={{ color: "var(--muted)" }}>
              {tarefasConcluidas} de {tarefas.length} concluídas
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--accent)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progresso}%`, background: "var(--primary)" }}
            />
          </div>
          {tarefasPendentes > 0 && (
            <p className="text-xs mt-3" style={{ color: "var(--muted)" }}>
              {tarefasPendentes} tarefa{tarefasPendentes !== 1 ? "s" : ""} pendente{tarefasPendentes !== 1 ? "s" : ""}
            </p>
          )}
          {tarefas.length === 0 && (
            <p className="text-xs mt-3" style={{ color: "var(--muted)" }}>Nenhuma tarefa cadastrada.</p>
          )}
        </div>

        {/* Alertas */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">
              Alertas
              {(atrasados.length > 0 || proximosPagamentos.length > 0) && (
                <span
                  className="ml-2 badge badge-atrasado"
                  style={{ fontSize: "0.65rem" }}
                >
                  {atrasados.length + proximosPagamentos.length}
                </span>
              )}
            </h2>
            <Link href="/pagamentos" className="text-xs" style={{ color: "var(--primary)" }}>
              Ver pagamentos →
            </Link>
          </div>

          {atrasados.length === 0 && proximosPagamentos.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Tudo em dia! Nenhum pagamento pendente ou atrasado.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {atrasados.slice(0, 3).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="badge badge-atrasado mr-2">Atrasado</span>
                    <span>{p.fornecedor.nome}</span>
                    {p.descricao && <span className="text-xs ml-1" style={{ color: "var(--muted)" }}>— {p.descricao}</span>}
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(p.valor)}</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>{formatDate(p.vencimento)}</div>
                  </div>
                </div>
              ))}
              {proximosPagamentos.filter(p => p.status !== "ATRASADO").slice(0, 3).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="badge badge-pendente mr-2">Vence em breve</span>
                    <span>{p.fornecedor.nome}</span>
                    {p.descricao && <span className="text-xs ml-1" style={{ color: "var(--muted)" }}>— {p.descricao}</span>}
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(p.valor)}</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>{formatDate(p.vencimento)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fornecedores recentes */}
      {fornecedores.length > 0 && (
        <div className="card mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Fornecedores</h2>
            <Link href="/fornecedores" className="text-xs" style={{ color: "var(--primary)" }}>
              Gerenciar →
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {fornecedores.slice(0, 5).map((f) => {
              const pagosF = f.pagamentos.filter((p) => p.status === "PAGO").reduce((s, p) => s + p.valor, 0);
              return (
                <div key={f.id} className="flex items-center justify-between text-sm py-1">
                  <div>
                    <span className="font-medium">{f.nome}</span>
                    <span className="ml-2 text-xs" style={{ color: "var(--muted)" }}>{f.categoria}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">{formatCurrency(f.valorTotal)}</span>
                    {f.valorTotal > 0 && (
                      <span className="ml-2 text-xs" style={{ color: "#166534" }}>
                        {formatCurrency(pagosF)} pago
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
