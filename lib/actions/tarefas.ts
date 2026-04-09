"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function getTarefas() {
  return prisma.tarefa.findMany({
    orderBy: [{ status: "asc" }, { vencimento: "asc" }],
  });
}

export async function criarTarefa(data: {
  titulo: string;
  categoria: string;
  vencimento?: Date;
  observacoes?: string;
  prioridade: "BAIXA" | "MEDIA" | "ALTA";
}) {
  await prisma.tarefa.create({ data });
  revalidatePath("/checklist");
}

export async function atualizarStatusTarefa(
  id: string,
  status: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDA"
) {
  await prisma.tarefa.update({ where: { id }, data: { status } });
  revalidatePath("/checklist");
  revalidatePath("/");
}

export async function editarTarefa(
  id: string,
  data: {
    titulo: string;
    categoria: string;
    vencimento?: Date;
    observacoes?: string;
    prioridade: "BAIXA" | "MEDIA" | "ALTA";
  }
) {
  await prisma.tarefa.update({ where: { id }, data });
  revalidatePath("/checklist");
}

export async function deletarTarefa(id: string) {
  await prisma.tarefa.delete({ where: { id } });
  revalidatePath("/checklist");
}
