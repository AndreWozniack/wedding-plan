"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  marcarPago,
  marcarPendente,
  criarPagamento,
  deletarPagamento,
} from "@/lib/actions/pagamentos";
import type { Fornecedor, Pagamento, StatusPagamento } from "@prisma/client";

type PagamentoComFornecedor = Pagamento & { fornecedor: Fornecedor };

const STATUS_BADGE: Record<StatusPagamento, string> = {
  PENDENTE: "badge-pendente",
  PAGO: "badge-pago",
  ATRASADO: "badge-atrasado",
};

const STATUS_LABELS: Record<StatusPagamento, string> = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
  ATRASADO: "Atrasado",
};

type PForm = {
  fornecedorId: string;
  descricao: string;
  valor: string;
  vencimento: string;
};

export default function PagamentosClient({
  pagamentos,
  fornecedores,
}: {
  pagamentos: PagamentoComFornecedor[];
  fornecedores: Fornecedor[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("TODAS");
  const [form, setForm] = useState<PForm>({
    fornecedorId: fornecedores[0]?.id ?? "",
    descricao: "",
    valor: "",
    vencimento: "",
  });

  const filtered = pagamentos.filter((p) => {
    if (filterStatus !== "TODAS" && p.status !== filterStatus) return false;
    return true;
  });

  // Agrupar por mês/ano
  const porMes = filtered.reduce<Record<string, PagamentoComFornecedor[]>>((acc, p) => {
    const d = new Date(p.vencimento);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const mesesOrdenados = Object.keys(porMes).sort();

  function mesLabel(key: string) {
    const [year, month] = key.split("-");
    return new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  }

  const totalGeral = pagamentos.reduce((s, p) => s + p.valor, 0);
  const totalPago = pagamentos.filter((p) => p.status === "PAGO").reduce((s, p) => s + p.valor, 0);
  const totalPendente = pagamentos.filter((p) => p.status === "PENDENTE").reduce((s, p) => s + p.valor, 0);
  const totalAtrasado = pagamentos.filter((p) => p.status === "ATRASADO").reduce((s, p) => s + p.valor, 0);

  function handlePago(id: string) {
    startTransition(async () => {
      await marcarPago(id);
      router.refresh();
    });
  }

  function handlePendente(id: string) {
    startTransition(async () => {
      await marcarPendente(id);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Excluir pagamento?")) return;
    startTransition(async () => {
      await deletarPagamento(id);
      router.refresh();
    });
  }

  function submitPagamento() {
    startTransition(async () => {
      await criarPagamento({
        fornecedorId: form.fornecedorId,
        descricao: form.descricao || undefined,
        valor: parseFloat(form.valor),
        vencimento: new Date(form.vencimento),
      });
      setShowForm(false);
      setForm({ fornecedorId: fornecedores[0]?.id ?? "", descricao: "", valor: "", vencimento: "" });
      router.refresh();
    });
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--primary)" }}>Pagamentos</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            Agenda de vencimentos
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)} disabled={fornecedores.length === 0}>
          + Novo Pagamento
        </button>
      </div>

      {fornecedores.length === 0 && (
        <div className="card mb-4 text-sm" style={{ color: "var(--muted)", background: "#fef9c3" }}>
          Cadastre um fornecedor antes de adicionar pagamentos.
        </div>
      )}

      {/* Resumo */}
      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="card">
          <div className="text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>Total</div>
          <div className="text-lg font-semibold">{formatCurrency(totalGeral)}</div>
        </div>
        <div className="card">
          <div className="text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>Pago</div>
          <div className="text-lg font-semibold" style={{ color: "#166534" }}>{formatCurrency(totalPago)}</div>
        </div>
        <div className="card">
          <div className="text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>Pendente</div>
          <div className="text-lg font-semibold" style={{ color: "#854d0e" }}>{formatCurrency(totalPendente)}</div>
        </div>
        <div className="card">
          <div className="text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>Atrasado</div>
          <div className="text-lg font-semibold" style={{ color: totalAtrasado > 0 ? "#991b1b" : "#166534" }}>
            {formatCurrency(totalAtrasado)}
          </div>
        </div>
      </div>

      {/* Filtro */}
      <div className="flex gap-3 mb-5">
        {["TODAS", "PENDENTE", "PAGO", "ATRASADO"].map((s) => (
          <button
            key={s}
            className="btn-ghost text-sm"
            style={{
              background: filterStatus === s ? "var(--accent)" : "transparent",
              color: filterStatus === s ? "var(--primary)" : "var(--muted)",
              fontWeight: filterStatus === s ? 600 : 400,
            }}
            onClick={() => setFilterStatus(s)}
          >
            {s === "TODAS" ? "Todos" : STATUS_LABELS[s as StatusPagamento]}
          </button>
        ))}
      </div>

      {/* Lista por mês */}
      {pagamentos.length === 0 ? (
        <div className="card text-center py-12" style={{ color: "var(--muted)" }}>
          <p className="text-4xl mb-3">◈</p>
          <p className="font-medium">Nenhum pagamento cadastrado</p>
          <p className="text-sm mt-1">Adicione pagamentos a partir da página de Fornecedores ou clique em "Novo Pagamento"</p>
        </div>
      ) : mesesOrdenados.length === 0 ? (
        <div className="card text-center py-8" style={{ color: "var(--muted)" }}>
          Nenhum pagamento com o filtro selecionado.
        </div>
      ) : (
        mesesOrdenados.map((mes) => {
          const items = porMes[mes];
          const totalMes = items.reduce((s, p) => s + p.valor, 0);
          const pagoMes = items.filter((p) => p.status === "PAGO").reduce((s, p) => s + p.valor, 0);

          return (
            <div key={mes} className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider capitalize" style={{ color: "var(--muted)" }}>
                  {mesLabel(mes)}
                </h2>
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  {formatCurrency(pagoMes)} / {formatCurrency(totalMes)}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((p) => (
                  <div key={p.id} className="card flex items-center gap-3" style={{ padding: "0.75rem 1rem" }}>
                    <span className={`badge ${STATUS_BADGE[p.status as StatusPagamento]}`}>
                      {STATUS_LABELS[p.status as StatusPagamento]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{p.fornecedor.nome}</span>
                      {p.descricao && (
                        <span className="text-xs ml-2" style={{ color: "var(--muted)" }}>— {p.descricao}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">{formatCurrency(p.valor)}</div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>
                        vence {formatDate(p.vencimento)}
                        {p.pagoEm && ` · pago ${formatDate(p.pagoEm)}`}
                      </div>
                    </div>
                    {p.status !== "PAGO" ? (
                      <button
                        className="btn-ghost text-xs"
                        onClick={() => handlePago(p.id)}
                        disabled={isPending}
                        title="Marcar como pago"
                      >
                        ✓ Pagar
                      </button>
                    ) : (
                      <button
                        className="btn-ghost text-xs"
                        onClick={() => handlePendente(p.id)}
                        disabled={isPending}
                        title="Desfazer"
                      >
                        ↩
                      </button>
                    )}
                    <button className="btn-danger text-xs" onClick={() => handleDelete(p.id)}>×</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Modal novo pagamento */}
      {showForm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: "rgba(0,0,0,0.3)" }}
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
          <div className="card w-full max-w-md" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
            <h2 className="font-semibold text-lg mb-4">Novo Pagamento</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="label">Fornecedor *</label>
                <select
                  className="input"
                  value={form.fornecedorId}
                  onChange={(e) => setForm({ ...form, fornecedorId: e.target.value })}
                >
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Descrição</label>
                <input
                  className="input"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Ex: Sinal, Parcela 2..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Valor (R$) *</label>
                  <input
                    type="number"
                    className="input"
                    value={form.valor}
                    onChange={(e) => setForm({ ...form, valor: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="label">Vencimento *</label>
                  <input
                    type="date"
                    className="input"
                    value={form.vencimento}
                    onChange={(e) => setForm({ ...form, vencimento: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button
                className="btn-primary"
                disabled={!form.valor || !form.vencimento || isPending}
                onClick={submitPagamento}
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
