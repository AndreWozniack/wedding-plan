"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function getFornecedores() {
  return prisma.fornecedor.findMany({
    include: { pagamentos: true },
    orderBy: { criadoEm: "desc" },
  });
}

export async function getFornecedor(id: string) {
  return prisma.fornecedor.findUnique({
    where: { id },
    include: { pagamentos: { orderBy: { vencimento: "asc" } } },
  });
}

export async function criarFornecedor(data: {
  nome: string;
  categoria: string;
  contato?: string;
  telefone?: string;
  email?: string;
  valorTotal: number;
  observacoes?: string;
}) {
  await prisma.fornecedor.create({ data });
  revalidatePath("/fornecedores");
}

export async function editarFornecedor(
  id: string,
  data: {
    nome: string;
    categoria: string;
    contato?: string;
    telefone?: string;
    email?: string;
    valorTotal: number;
    observacoes?: string;
  }
) {
  await prisma.fornecedor.update({ where: { id }, data });
  revalidatePath("/fornecedores");
}

export async function deletarFornecedor(id: string) {
  await prisma.fornecedor.delete({ where: { id } });
  revalidatePath("/fornecedores");
}
