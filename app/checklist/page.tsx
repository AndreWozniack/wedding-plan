import { getTarefas } from "@/lib/actions/tarefas";
import ChecklistClient from "./ChecklistClient";

export default async function ChecklistPage() {
  const tarefas = await getTarefas();
  return <ChecklistClient tarefas={tarefas} />;
}
