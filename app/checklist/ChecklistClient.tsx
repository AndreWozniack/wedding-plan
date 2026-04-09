"use client";

import { useState, useTransition } from "react";
import { formatDate } from "@/lib/utils";
import {
  criarTarefa,
  atualizarStatusTarefa,
  deletarTarefa,
  editarTarefa,
} from "@/lib/actions/tarefas";
import { useRouter } from "next/navigation";
import type { Tarefa, StatusTarefa, Prioridade } from "@prisma/client";

const CATEGORIAS = [
  "Local / Venue",
  "Fotografia / Vídeo",
  "Buffet / Catering",
  "Decoração / Flores",
  "Música / DJ",
  "Vestido / Traje",
  "Convites / Papelaria",
  "Beleza / Make",
  "Lua de mel",
  "Documentação",
  "Outro",
];

const STATUS_LABELS: Record<StatusTarefa, string> = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
};

const PRIORIDADE_LABELS: Record<Prioridade, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
};

const PRIORIDADE_COLORS: Record<Prioridade, string> = {
  BAIXA: "#166534",
  MEDIA: "#854d0e",
  ALTA: "#991b1b",
};

type FormData = {
  titulo: string;
  categoria: string;
  vencimento: string;
  observacoes: string;
  prioridade: Prioridade;
};

const emptyForm: FormData = {
  titulo: "",
  categoria: CATEGORIAS[0],
  vencimento: "",
  observacoes: "",
  prioridade: "MEDIA",
};

export default function ChecklistClient({ tarefas }: { tarefas: Tarefa[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [filterStatus, setFilterStatus] = useState<string>("TODAS");
  const [filterCat, setFilterCat] = useState<string>("TODAS");

  const categorias = ["TODAS", ...Array.from(new Set(tarefas.map((t) => t.categoria).concat(CATEGORIAS)))];

  const tarefasFiltradas = tarefas.filter((t) => {
    if (filterStatus !== "TODAS" && t.status !== filterStatus) return false;
    if (filterCat !== "TODAS" && t.categoria !== filterCat) return false;
    return true;
  });

  const porCategoria = tarefasFiltradas.reduce<Record<string, Tarefa[]>>((acc, t) => {
    if (!acc[t.categoria]) acc[t.categoria] = [];
    acc[t.categoria].push(t);
    return acc;
  }, {});

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(t: Tarefa) {
    setEditingId(t.id);
    setForm({
      titulo: t.titulo,
      categoria: t.categoria,
      vencimento: t.vencimento ? new Date(t.vencimento).toISOString().slice(0, 10) : "",
      observacoes: t.observacoes ?? "",
      prioridade: t.prioridade as Prioridade,
    });
    setShowForm(true);
  }

  function handleSubmit() {
    const data = {
      titulo: form.titulo,
      categoria: form.categoria,
      vencimento: form.vencimento ? new Date(form.vencimento) : undefined,
      observacoes: form.observacoes || undefined,
      prioridade: form.prioridade,
    };
    startTransition(async () => {
      if (editingId) {
        await editarTarefa(editingId, data);
      } else {
        await criarTarefa(data);
      }
      setShowForm(false);
      setForm(emptyForm);
      router.refresh();
    });
  }

  function handleStatus(id: string, status: StatusTarefa) {
    startTransition(async () => {
      await atualizarStatusTarefa(id, status);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Excluir tarefa?")) return;
    startTransition(async () => {
      await deletarTarefa(id);
      router.refresh();
    });
  }

  const total = tarefas.length;
  const concluidas = tarefas.filter((t) => t.status === "CONCLUIDA").length;
  const progresso = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--primary)" }}>Checklist</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            {concluidas} de {total} tarefas concluídas — {progresso}%
          </p>
        </div>
        <button className="btn-primary" onClick={openNew}>+ Nova Tarefa</button>
      </div>

      {/* Barra de progresso */}
      {total > 0 && (
        <div className="mb-6">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--accent)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progresso}%`, background: "var(--primary)" }}
            />
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select className="input" style={{ width: "auto" }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="TODAS">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="EM_ANDAMENTO">Em andamento</option>
          <option value="CONCLUIDA">Concluída</option>
        </select>
        <select className="input" style={{ width: "auto" }} value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          {categorias.map((c) => (
            <option key={c} value={c}>{c === "TODAS" ? "Todas as categorias" : c}</option>
          ))}
        </select>
      </div>

      {/* Lista por categoria */}
      {Object.keys(porCategoria).length === 0 ? (
        <div className="card text-center py-12" style={{ color: "var(--muted)" }}>
          <p className="text-4xl mb-3">✓</p>
          <p className="font-medium">Nenhuma tarefa encontrada</p>
          <p className="text-sm mt-1">Clique em "Nova Tarefa" para começar</p>
        </div>
      ) : (
        Object.entries(porCategoria).map(([cat, items]) => (
          <div key={cat} className="mb-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
              {cat} ({items.length})
            </h2>
            <div className="flex flex-col gap-2">
              {items.map((t) => (
                <div
                  key={t.id}
                  className="card flex items-start gap-3 py-3 px-4"
                  style={{ opacity: t.status === "CONCLUIDA" ? 0.65 : 1 }}
                >
                  {/* Checkbox de status */}
                  <button
                    className="mt-0.5 flex-shrink-0"
                    onClick={() =>
                      handleStatus(
                        t.id,
                        t.status === "CONCLUIDA" ? "PENDENTE" : "CONCLUIDA"
                      )
                    }
                    disabled={isPending}
                    title="Marcar como concluída"
                  >
                    <div
                      className="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                      style={{
                        borderColor: t.status === "CONCLUIDA" ? "var(--primary)" : "var(--border)",
                        background: t.status === "CONCLUIDA" ? "var(--primary)" : "white",
                      }}
                    >
                      {t.status === "CONCLUIDA" && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </button>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="font-medium text-sm"
                        style={{ textDecoration: t.status === "CONCLUIDA" ? "line-through" : "none" }}
                      >
                        {t.titulo}
                      </span>
                      <span
                        className="text-xs font-medium"
                        style={{ color: PRIORIDADE_COLORS[t.prioridade as Prioridade] }}
                      >
                        {PRIORIDADE_LABELS[t.prioridade as Prioridade]}
                      </span>
                      {t.status === "EM_ANDAMENTO" && (
                        <span className="badge badge-andamento">Em andamento</span>
                      )}
                    </div>
                    {t.vencimento && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                        Prazo: {formatDate(t.vencimento)}
                      </p>
                    )}
                    {t.observacoes && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{t.observacoes}</p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex gap-1 flex-shrink-0">
                    {t.status === "PENDENTE" && (
                      <button
                        className="btn-ghost text-xs"
                        onClick={() => handleStatus(t.id, "EM_ANDAMENTO")}
                        disabled={isPending}
                        title="Marcar em andamento"
                      >
                        →
                      </button>
                    )}
                    <button className="btn-ghost text-xs" onClick={() => openEdit(t)} title="Editar">
                      ✎
                    </button>
                    <button className="btn-danger text-xs" onClick={() => handleDelete(t.id)} title="Excluir">
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Modal / Form */}
      {showForm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: "rgba(0,0,0,0.3)" }}
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
          <div className="card w-full max-w-md" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
            <h2 className="font-semibold text-lg mb-4">
              {editingId ? "Editar Tarefa" : "Nova Tarefa"}
            </h2>

            <div className="flex flex-col gap-4">
              <div>
                <label className="label">Título *</label>
                <input
                  className="input"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ex: Contratar fotógrafo"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Categoria</label>
                  <select
                    className="input"
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Prioridade</label>
                  <select
                    className="input"
                    value={form.prioridade}
                    onChange={(e) => setForm({ ...form, prioridade: e.target.value as Prioridade })}
                  >
                    <option value="BAIXA">Baixa</option>
                    <option value="MEDIA">Média</option>
                    <option value="ALTA">Alta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Prazo</label>
                <input
                  type="date"
                  className="input"
                  value={form.vencimento}
                  onChange={(e) => setForm({ ...form, vencimento: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Observações</label>
                <textarea
                  className="input"
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  placeholder="Detalhes adicionais..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={!form.titulo.trim() || isPending}
              >
                {editingId ? "Salvar" : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
