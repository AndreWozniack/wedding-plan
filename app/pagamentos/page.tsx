import { getPagamentos } from "@/lib/actions/pagamentos";
import { getFornecedores } from "@/lib/actions/fornecedores";
import { atualizarStatusAtrasados } from "@/lib/actions/pagamentos";
import PagamentosClient from "./PagamentosClient";

export default async function PagamentosPage() {
  await atualizarStatusAtrasados();
  const [pagamentos, fornecedores] = await Promise.all([
    getPagamentos(),
    getFornecedores(),
  ]);
  return <PagamentosClient pagamentos={pagamentos} fornecedores={fornecedores} />;
}
