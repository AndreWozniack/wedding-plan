"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  criarFornecedor,
  editarFornecedor,
  deletarFornecedor,
} from "@/lib/actions/fornecedores";
import {
  criarPagamento,
  marcarPago,
  marcarPendente,
  deletarPagamento,
} from "@/lib/actions/pagamentos";
import type { Fornecedor, Pagamento, StatusPagamento } from "@prisma/client";

type FornecedorComPagamentos = Fornecedor & { pagamentos: Pagamento[] };

const CATEGORIAS = [
  "Fotografia / Vídeo",
  "Buffet / Catering",
  "Local / Venue",
  "Decoração / Flores",
  "Música / DJ",
  "Vestido / Traje",
  "Convites / Papelaria",
  "Beleza / Make",
  "Cerimonialista",
  "Transporte",
  "Outro",
];

type FForm = {
  nome: string;
  categoria: string;
  contato: string;
  telefone: string;
  email: string;
  valorTotal: string;
  observacoes: string;
};

type PForm = {
  descricao: string;
  valor: string;
  vencimento: string;
};

const emptyFForm: FForm = {
  nome: "",
  categoria: CATEGORIAS[0],
  contato: "",
  telefone: "",
  email: "",
  valorTotal: "",
  observacoes: "",
};

const emptyPForm: PForm = { descricao: "", valor: "", vencimento: "" };

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

export default function FornecedoresClient({
  fornecedores,
}: {
  fornecedores: FornecedorComPagamentos[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showFForm, setShowFForm] = useState(false);
  const [editingFId, setEditingFId] = useState<string | null>(null);
  const [fForm, setFForm] = useState<FForm>(emptyFForm);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPForm, setShowPForm] = useState<string | null>(null); // fornecedorId
  const [pForm, setPForm] = useState<PForm>(emptyPForm);

  function openNewF() {
    setEditingFId(null);
    setFForm(emptyFForm);
    setShowFForm(true);
  }

  function openEditF(f: FornecedorComPagamentos) {
    setEditingFId(f.id);
    setFForm({
      nome: f.nome,
      categoria: f.categoria,
      contato: f.contato ?? "",
      telefone: f.telefone ?? "",
      email: f.email ?? "",
      valorTotal: String(f.valorTotal),
      observacoes: f.observacoes ?? "",
    });
    setShowFForm(true);
  }

  function submitFornecedor() {
    const data = {
      nome: fForm.nome,
      categoria: fForm.categoria,
      contato: fForm.contato || undefined,
      telefone: fForm.telefone || undefined,
      email: fForm.email || undefined,
      valorTotal: parseFloat(fForm.valorTotal) || 0,
      observacoes: fForm.observacoes || undefined,
    };
    startTransition(async () => {
      if (editingFId) {
        await editarFornecedor(editingFId, data);
      } else {
        await criarFornecedor(data);
      }
      setShowFForm(false);
      setFForm(emptyFForm);
      router.refresh();
    });
  }

  function handleDeleteF(id: string) {
    if (!confirm("Excluir fornecedor e todos os seus pagamentos?")) return;
    startTransition(async () => {
      await deletarFornecedor(id);
      if (expandedId === id) setExpandedId(null);
      router.refresh();
    });
  }

  function submitPagamento(fornecedorId: string) {
    startTransition(async () => {
      await criarPagamento({
        fornecedorId,
        descricao: pForm.descricao || undefined,
        valor: parseFloat(pForm.valor),
        vencimento: new Date(pForm.vencimento),
      });
      setShowPForm(null);
      setPForm(emptyPForm);
      router.refresh();
    });
  }

  function handleMarcarPago(id: string) {
    startTransition(async () => {
      await marcarPago(id);
      router.refresh();
    });
  }

  function handleMarcarPendente(id: string) {
    startTransition(async () => {
      await marcarPendente(id);
      router.refresh();
    });
  }

  function handleDeleteP(id: string) {
    if (!confirm("Excluir pagamento?")) return;
    startTransition(async () => {
      await deletarPagamento(id);
      router.refresh();
    });
  }

  const totalOrcamento = fornecedores.reduce((s, f) => s + f.valorTotal, 0);
  const totalPago = fornecedores
    .flatMap((f) => f.pagamentos)
    .filter((p) => p.status === "PAGO")
    .reduce((s, p) => s + p.valor, 0);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--primary)" }}>Fornecedores</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            {fornecedores.length} fornecedor{fornecedores.length !== 1 ? "es" : ""} · Orçamento: {formatCurrency(totalOrcamento)} · Pago: {formatCurrency(totalPago)}
          </p>
        </div>
        <button className="btn-primary" onClick={openNewF}>+ Novo Fornecedor</button>
      </div>

      {/* Lista */}
      {fornecedores.length === 0 ? (
        <div className="card text-center py-12" style={{ color: "var(--muted)" }}>
          <p className="text-4xl mb-3">♦</p>
          <p className="font-medium">Nenhum fornecedor cadastrado</p>
          <p className="text-sm mt-1">Clique em "Novo Fornecedor" para adicionar</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {fornecedores.map((f) => {
            const expanded = expandedId === f.id;
            const pagoF = f.pagamentos.filter((p) => p.status === "PAGO").reduce((s, p) => s + p.valor, 0);
            const atrasadosF = f.pagamentos.filter((p) => p.status === "ATRASADO");

            return (
              <div key={f.id} className="card" style={{ padding: "1rem 1.25rem" }}>
                {/* Linha principal */}
                <div className="flex items-center gap-3">
                  <button
                    className="flex-1 flex items-center gap-3 text-left"
                    onClick={() => setExpandedId(expanded ? null : f.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{f.nome}</span>
                        {atrasadosF.length > 0 && (
                          <span className="badge badge-atrasado">{atrasadosF.length} atrasado{atrasadosF.length > 1 ? "s" : ""}</span>
                        )}
                      </div>
                      <span className="text-xs" style={{ color: "var(--muted)" }}>{f.categoria}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(f.valorTotal)}</div>
                      <div className="text-xs" style={{ color: "#166534" }}>{formatCurrency(pagoF)} pago</div>
                    </div>
                    <span style={{ color: "var(--muted)", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
                  </button>
                  <button className="btn-ghost" onClick={() => openEditF(f)} title="Editar">✎</button>
                  <button className="btn-danger" onClick={() => handleDeleteF(f.id)} title="Excluir">×</button>
                </div>

                {/* Expanded */}
                {expanded && (
                  <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                    {/* Info de contato */}
                    {(f.contato || f.telefone || f.email || f.observacoes) && (
                      <div className="mb-4 text-sm flex flex-wrap gap-4">
                        {f.contato && <span><span style={{ color: "var(--muted)" }}>Contato: </span>{f.contato}</span>}
                        {f.telefone && <span><span style={{ color: "var(--muted)" }}>Tel: </span>{f.telefone}</span>}
                        {f.email && <span><span style={{ color: "var(--muted)" }}>E-mail: </span>{f.email}</span>}
                        {f.observacoes && <span style={{ color: "var(--muted)" }}>{f.observacoes}</span>}
                      </div>
                    )}

                    {/* Pagamentos */}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold">Pagamentos</h3>
                      <button
                        className="btn-secondary"
                        style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem" }}
                        onClick={() => { setShowPForm(f.id); setPForm(emptyPForm); }}
                      >
                        + Adicionar
                      </button>
                    </div>

                    {f.pagamentos.length === 0 ? (
                      <p className="text-sm" style={{ color: "var(--muted)" }}>Nenhum pagamento cadastrado.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {f.pagamentos
                          .slice()
                          .sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime())
                          .map((p) => (
                            <div key={p.id} className="flex items-center gap-3 text-sm">
                              <span className={`badge ${STATUS_BADGE[p.status as StatusPagamento]}`}>
                                {STATUS_LABELS[p.status as StatusPagamento]}
                              </span>
                              <span className="flex-1">
                                {p.descricao || "Pagamento"}
                              </span>
                              <span className="font-medium">{formatCurrency(p.valor)}</span>
                              <span style={{ color: "var(--muted)" }}>vence {formatDate(p.vencimento)}</span>
                              {p.status !== "PAGO" ? (
                                <button
                                  className="btn-ghost text-xs"
                                  onClick={() => handleMarcarPago(p.id)}
                                  disabled={isPending}
                                  title="Marcar como pago"
                                >
                                  ✓ Pagar
                                </button>
                              ) : (
                                <button
                                  className="btn-ghost text-xs"
                                  onClick={() => handleMarcarPendente(p.id)}
                                  disabled={isPending}
                                  title="Desfazer pagamento"
                                >
                                  ↩
                                </button>
                              )}
                              <button className="btn-danger text-xs" onClick={() => handleDeleteP(p.id)} title="Excluir">×</button>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Form novo pagamento inline */}
                    {showPForm === f.id && (
                      <div className="mt-4 p-4 rounded-lg" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
                        <h4 className="text-sm font-semibold mb-3">Novo Pagamento</h4>
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div>
                            <label className="label">Descrição</label>
                            <input
                              className="input"
                              placeholder="Ex: Sinal, Parcela 1..."
                              value={pForm.descricao}
                              onChange={(e) => setPForm({ ...pForm, descricao: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="label">Valor (R$) *</label>
                            <input
                              type="number"
                              className="input"
                              placeholder="0,00"
                              value={pForm.valor}
                              onChange={(e) => setPForm({ ...pForm, valor: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="label">Vencimento *</label>
                            <input
                              type="date"
                              className="input"
                              value={pForm.vencimento}
                              onChange={(e) => setPForm({ ...pForm, vencimento: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button className="btn-secondary" onClick={() => setShowPForm(null)}>Cancelar</button>
                          <button
                            className="btn-primary"
                            disabled={!pForm.valor || !pForm.vencimento || isPending}
                            onClick={() => submitPagamento(f.id)}
                          >
                            Adicionar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Fornecedor */}
      {showFForm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: "rgba(0,0,0,0.3)" }}
          onClick={(e) => e.target === e.currentTarget && setShowFForm(false)}
        >
          <div className="card w-full max-w-lg" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
            <h2 className="font-semibold text-lg mb-4">
              {editingFId ? "Editar Fornecedor" : "Novo Fornecedor"}
            </h2>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nome *</label>
                  <input
                    className="input"
                    value={fForm.nome}
                    onChange={(e) => setFForm({ ...fForm, nome: e.target.value })}
                    placeholder="Ex: Studio Luz"
                  />
                </div>
                <div>
                  <label className="label">Categoria</label>
                  <select
                    className="input"
                    value={fForm.categoria}
                    onChange={(e) => setFForm({ ...fForm, categoria: e.target.value })}
                  >
                    {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nome do Contato</label>
                  <input
                    className="input"
                    value={fForm.contato}
                    onChange={(e) => setFForm({ ...fForm, contato: e.target.value })}
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div>
                  <label className="label">Telefone / WhatsApp</label>
                  <input
                    className="input"
                    value={fForm.telefone}
                    onChange={(e) => setFForm({ ...fForm, telefone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">E-mail</label>
                  <input
                    type="email"
                    className="input"
                    value={fForm.email}
                    onChange={(e) => setFForm({ ...fForm, email: e.target.value })}
                    placeholder="contato@exemplo.com"
                  />
                </div>
                <div>
                  <label className="label">Valor Total (R$)</label>
                  <input
                    type="number"
                    className="input"
                    value={fForm.valorTotal}
                    onChange={(e) => setFForm({ ...fForm, valorTotal: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div>
                <label className="label">Observações</label>
                <textarea
                  className="input"
                  value={fForm.observacoes}
                  onChange={(e) => setFForm({ ...fForm, observacoes: e.target.value })}
                  placeholder="Notas sobre o fornecedor..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setShowFForm(false)}>Cancelar</button>
              <button
                className="btn-primary"
                disabled={!fForm.nome.trim() || isPending}
                onClick={submitFornecedor}
              >
                {editingFId ? "Salvar" : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
