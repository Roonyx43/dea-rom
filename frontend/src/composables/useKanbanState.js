import { ref } from 'vue'

export const codorcsFinanceiro = ref(new Set())
export const financeiroReady = ref(false)

export function setFinanceiroCodes(codes = []) {
  codorcsFinanceiro.value = new Set(
    (codes || []).map(Number).filter(Number.isFinite)
  )
}

export function isFinanceiro(cod) {
  return codorcsFinanceiro.value.has(Number(cod))
}

export function setFinanceiroReady(v) {     // ✅ GARANTA QUE ISTO ESTÁ EXPORTADO
  financeiroReady.value = !!v
}