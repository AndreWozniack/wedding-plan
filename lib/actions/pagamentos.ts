"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { StatusPagamento } from "@prisma/client";

export async function getPagamentos() {
  return prisma.pagamento.findMany({
    include: { fornecedor: true },
    orderBy: { vencimento: "asc" },
  });
}

export async function getPagamentosProximos() {
  const hoje = new Date();
  const em30dias = new Date();
  em30dias.setDate(hoje.getDate() + 30);

  return prisma.pagamento.findMany({
    where: {
      vencimento: { lte: em30dias },
      status: { not: "PAGO" },
    },
    include: { fornecedor: true },
    orderBy: { vencimento: "asc" },
  });
}

export async function criarPagamento(data: {
  fornecedorId: string;
  descricao?: string;
  valor: number;
  vencimento: Date;
}) {
  await prisma.pagamento.create({ data });
  revalidatePath("/pagamentos");
  revalidatePath("/fornecedores");
}

export async function marcarPago(id: string) {
  await prisma.pagamento.update({
    where: { id },
    data: { status: "PAGO", pagoEm: new Date() },
  });
  revalidatePath("/pagamentos");
  revalidatePath("/");
}

export async function marcarPendente(id: string) {
  await prisma.pagamento.update({
    where: { id },
    data: { status: "PENDENTE", pagoEm: null },
  });
  revalidatePath("/pagamentos");
  revalidatePath("/");
}

export async function deletarPagamento(id: string) {
  await prisma.pagamento.delete({ where: { id } });
  revalidatePath("/pagamentos");
  revalidatePath("/fornecedores");
}

export async function atualizarStatusAtrasados() {
  const hoje = new Date();
  await prisma.pagamento.updateMany({
    where: {
      vencimento: { lt: hoje },
      status: "PENDENTE",
    },
    data: { status: "ATRASADO" },
  });
}
