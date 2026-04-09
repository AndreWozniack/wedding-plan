import { getFornecedores } from "@/lib/actions/fornecedores";
import FornecedoresClient from "./FornecedoresClient";

export default async function FornecedoresPage() {
  const fornecedores = await getFornecedores();
  return <FornecedoresClient fornecedores={fornecedores} />;
}
