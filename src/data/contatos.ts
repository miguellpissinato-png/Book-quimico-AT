/** Telefones de emergência exibidos em todo o app. */
export const CONTATOS = {
  samu: { nome: 'SAMU', exibicao: '192', tel: '192' },
  intoxicacao: {
    nome: 'Disque-Intoxicação',
    exibicao: '0800 722 6001',
    tel: '08007226001',
  },
} as const;

/** Converte um telefone escrito de qualquer jeito em link "tel:" (mantém só dígitos e +). */
export function linkTelefone(telefone: string): string {
  return 'tel:' + telefone.replace(/[^\d+]/g, '');
}
