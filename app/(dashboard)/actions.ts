"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canEdit, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildNotificacaoHtml } from "@/lib/notificacao-html";

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function boolValue(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function parseAnexos(formData: FormData) {
  const nome = stringValue(formData, "anexo_nome");
  const url = stringValue(formData, "anexo_url");
  if (!nome && !url) return undefined;
  return [{ nome, url }];
}

async function assertCanEdit() {
  const user = await requireUser();
  if (!canEdit(user)) {
    throw new Error("Usuario sem permissao para editar ou importar.");
  }
  return user;
}

export async function createNotificacao(formData: FormData) {
  const user = await assertCanEdit();
  const id = randomUUID();
  const anexos = parseAnexos(formData);
  const data = {
    id,
    created_date: new Date(),
    updated_date: new Date(),
    created_by_id: user.id,
    created_by: user.email,
    tipo_notificacao: stringValue(formData, "tipo_notificacao"),
    numero_oficio: stringValue(formData, "numero_oficio"),
    data_notificacao: stringValue(formData, "data_notificacao"),
    nota_atendimento: stringValue(formData, "nota_atendimento"),
    empresa: stringValue(formData, "empresa"),
    status_envio: stringValue(formData, "status_envio"),
    vencimento: stringValue(formData, "vencimento"),
    ano_vencimento: stringValue(formData, "ano_vencimento"),
    endereco: stringValue(formData, "endereco"),
    bairro: stringValue(formData, "bairro"),
    cidade: stringValue(formData, "cidade"),
    estado: stringValue(formData, "estado"),
    contrato_numero: stringValue(formData, "contrato_numero"),
    ac: stringValue(formData, "ac"),
    numero_nome: stringValue(formData, "numero_nome"),
    celebrado_em: stringValue(formData, "celebrado_em"),
    numero_parceiro: stringValue(formData, "numero_parceiro"),
    cnpj: stringValue(formData, "cnpj"),
    empresa_rep: stringValue(formData, "empresa_rep"),
    endereco_rep: stringValue(formData, "endereco_rep"),
    bairro_rep: stringValue(formData, "bairro_rep"),
    cidade_rep: stringValue(formData, "cidade_rep"),
    estado_rep: stringValue(formData, "estado_rep"),
    campo_11_6_3: stringValue(formData, "campo_11_6_3"),
    endereco_notificacao: stringValue(formData, "endereco_notificacao"),
    prazo_dias: stringValue(formData, "prazo_dias"),
    prazo_resposta: stringValue(formData, "prazo_resposta"),
    lote_nome: stringValue(formData, "lote_nome"),
    lote_id: stringValue(formData, "lote_id"),
    status: stringValue(formData, "status") || "Pendente",
    observacoes: stringValue(formData, "observacoes"),
    retorno_cliente: stringValue(formData, "retorno_cliente"),
    anexo_url: stringValue(formData, "anexo_url"),
    anexo_nome: stringValue(formData, "anexo_nome"),
    anexos,
    origem: stringValue(formData, "origem") || "manual",
    visualizada: boolValue(formData, "visualizada"),
    arquivada: boolValue(formData, "arquivada"),
    sem_projeto: boolValue(formData, "sem_projeto"),
    encaminhado_prefeitura: boolValue(formData, "encaminhado_prefeitura")
  };

  const created = await prisma.notificacao.create({ data });
  await prisma.notificacao.update({
    where: { id },
    data: {
      html_content: buildNotificacaoHtml(created),
      pdfUrl: `/api/notificacoes/${id}/pdf`
    }
  });

  revalidatePath("/notificacoes");
  redirect(`/notificacoes/${id}`);
}

export async function updateNotificacao(id: string, formData: FormData) {
  await assertCanEdit();
  const anexos = parseAnexos(formData);
  await prisma.notificacao.update({
    where: { id },
    data: {
      updated_date: new Date(),
      tipo_notificacao: stringValue(formData, "tipo_notificacao"),
      numero_oficio: stringValue(formData, "numero_oficio"),
      data_notificacao: stringValue(formData, "data_notificacao"),
      nota_atendimento: stringValue(formData, "nota_atendimento"),
      empresa: stringValue(formData, "empresa"),
      status_envio: stringValue(formData, "status_envio"),
      vencimento: stringValue(formData, "vencimento"),
      ano_vencimento: stringValue(formData, "ano_vencimento"),
      endereco: stringValue(formData, "endereco"),
      bairro: stringValue(formData, "bairro"),
      cidade: stringValue(formData, "cidade"),
      estado: stringValue(formData, "estado"),
      contrato_numero: stringValue(formData, "contrato_numero"),
      ac: stringValue(formData, "ac"),
      numero_nome: stringValue(formData, "numero_nome"),
      celebrado_em: stringValue(formData, "celebrado_em"),
      numero_parceiro: stringValue(formData, "numero_parceiro"),
      cnpj: stringValue(formData, "cnpj"),
      empresa_rep: stringValue(formData, "empresa_rep"),
      endereco_rep: stringValue(formData, "endereco_rep"),
      bairro_rep: stringValue(formData, "bairro_rep"),
      cidade_rep: stringValue(formData, "cidade_rep"),
      estado_rep: stringValue(formData, "estado_rep"),
      campo_11_6_3: stringValue(formData, "campo_11_6_3"),
      endereco_notificacao: stringValue(formData, "endereco_notificacao"),
      prazo_dias: stringValue(formData, "prazo_dias"),
      prazo_resposta: stringValue(formData, "prazo_resposta"),
      lote_nome: stringValue(formData, "lote_nome"),
      lote_id: stringValue(formData, "lote_id"),
      status: stringValue(formData, "status") || "Pendente",
      observacoes: stringValue(formData, "observacoes"),
      retorno_cliente: stringValue(formData, "retorno_cliente"),
      anexo_url: stringValue(formData, "anexo_url"),
      anexo_nome: stringValue(formData, "anexo_nome"),
      anexos,
      origem: stringValue(formData, "origem") || "manual",
      visualizada: boolValue(formData, "visualizada"),
      arquivada: boolValue(formData, "arquivada"),
      sem_projeto: boolValue(formData, "sem_projeto"),
      encaminhado_prefeitura: boolValue(formData, "encaminhado_prefeitura")
    }
  });
  revalidatePath("/notificacoes");
  revalidatePath(`/notificacoes/${id}`);
  redirect(`/notificacoes/${id}`);
}

export async function markNotificacao(id: string, field: "visualizada" | "arquivada" | "sem_projeto" | "encaminhado_prefeitura", value: boolean) {
  await assertCanEdit();
  await prisma.notificacao.update({
    where: { id },
    data: { [field]: value, updated_date: new Date() }
  });
  revalidatePath("/notificacoes");
  revalidatePath(`/notificacoes/${id}`);
}

export async function createEmpresa(formData: FormData) {
  const user = await assertCanEdit();
  const id = randomUUID();
  await prisma.empresa.create({
    data: {
      id,
      created_date: new Date(),
      updated_date: new Date(),
      created_by_id: user.id,
      created_by: user.email,
      nome: stringValue(formData, "nome") || "Sem nome",
      cnpj: stringValue(formData, "cnpj"),
      contrato_numero: stringValue(formData, "contrato_numero"),
      endereco: stringValue(formData, "endereco"),
      cidade: stringValue(formData, "cidade"),
      estado: stringValue(formData, "estado"),
      celebrado_em: stringValue(formData, "celebrado_em"),
      tem_clausula_11_6_3: boolValue(formData, "tem_clausula_11_6_3"),
      campo_11_6_3: stringValue(formData, "campo_11_6_3")
    }
  });
  revalidatePath("/empresas");
  redirect(`/empresas/${id}`);
}

export async function updateEmpresa(id: string, formData: FormData) {
  await assertCanEdit();
  await prisma.empresa.update({
    where: { id },
    data: {
      updated_date: new Date(),
      nome: stringValue(formData, "nome") || "Sem nome",
      cnpj: stringValue(formData, "cnpj"),
      contrato_numero: stringValue(formData, "contrato_numero"),
      endereco: stringValue(formData, "endereco"),
      cidade: stringValue(formData, "cidade"),
      estado: stringValue(formData, "estado"),
      celebrado_em: stringValue(formData, "celebrado_em"),
      tem_clausula_11_6_3: boolValue(formData, "tem_clausula_11_6_3"),
      campo_11_6_3: stringValue(formData, "campo_11_6_3")
    }
  });
  revalidatePath("/empresas");
  revalidatePath(`/empresas/${id}`);
  redirect(`/empresas/${id}`);
}

export async function updateUserPermission(id: string, formData: FormData) {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("Apenas administradores alteram usuarios.");
  await prisma.user.update({
    where: { id },
    data: {
      role: stringValue(formData, "role") || "user",
      pode_editar_importar: boolValue(formData, "pode_editar_importar")
    }
  });
  revalidatePath("/usuarios");
}
