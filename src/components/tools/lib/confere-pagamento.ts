export function modulo10(dados: string): number {
  let soma = 0;
  for (let i = dados.length - 1, peso = 2; i >= 0; i--, peso = peso === 2 ? 1 : 2) { const n = Number(dados[i]) * peso; soma += Math.floor(n / 10) + n % 10; }
  return (10 - soma % 10) % 10;
}
function resto11(dados: string) {
  let soma = 0;
  for (let i = dados.length - 1, peso = 2; i >= 0; i--, peso = peso === 9 ? 2 : peso + 1) soma += Number(dados[i]) * peso;
  return soma % 11;
}
export function modulo11Bancario(dados: string) { const dv = 11 - resto11(dados); return dv === 0 || dv === 10 || dv === 11 ? 1 : dv; }
export function modulo11Arrecadacao(dados: string) { const r = resto11(dados); return r === 0 || r === 1 ? 0 : r === 10 ? 1 : 11 - r; }
export function analisarBoleto(entrada: string) {
  if (!/^[\d\s.-]+$/.test(entrada)) throw new Error('Use somente os números, espaços, pontos e hífens da linha digitável.');
  const n = entrada.replace(/[\s.-]/g, '');
  if (!/^(?:\d{47}|\d{48})$/.test(n) || /^0+$/.test(n)) throw new Error('A linha digitável deve ter 47 ou 48 dígitos.');
  if (n.length === 47) {
    for (const [inicio, fim] of [[0, 9], [10, 20], [21, 31]] as const) if (modulo10(n.slice(inicio, fim)) !== Number(n[fim])) throw new Error('Um dos três blocos do boleto tem dígito verificador inválido.');
    const barras = n.slice(0, 4) + n[32] + n.slice(33) + n.slice(4, 9) + n.slice(10, 20) + n.slice(21, 31);
    if (n[3] !== '9') throw new Error('Moeda do boleto bancário não suportada.');
    if (modulo11Bancario(barras.slice(0, 4) + barras.slice(5)) !== Number(barras[4])) throw new Error('Dígito verificador geral do boleto inválido.');
    const fator = Number(n.slice(33, 37));
    const data = (base: string, dias: number) => new Date(Date.parse(base + 'T00:00:00Z') + dias * 86400000).toISOString().slice(0, 10).split('-').reverse().join('/');
    const vencimento = fator === 0 ? 'Sem vencimento informado no código.' : fator < 1000 ? `Fator antigo: ${data('1997-10-07', fator)}. Confirme no documento e no banco.` : `Fator ${fator}: pode representar ${data('1997-10-07', fator)} no ciclo antigo ou ${data('2025-02-22', fator - 1000)} no ciclo reiniciado. O código sozinho não distingue os ciclos; confirme no banco.`;
    const centavos = Number(n.slice(37, 47));
    return { tipo: 'Boleto bancário', valor: centavos ? centavos / 100 : null, vencimento, aviso: 'Os dígitos conferem, mas isso não confirma beneficiário, autenticidade ou existência da cobrança. Confira tudo na tela do banco.' };
  }
  if (n[0] !== '8' || !'12345679'.includes(n[1] ?? '') || !'6789'.includes(n[2] ?? '')) throw new Error('Identificador de arrecadação não suportado.');
  // O terceiro dígito é a referência de valor/módulo, não o segmento (segundo dígito).
  const dv = '67'.includes(n[2] ?? '') ? modulo10 : modulo11Arrecadacao;
  let barras = '';
  for (let i = 0; i < 48; i += 12) { const bloco = n.slice(i, i + 11); if (dv(bloco) !== Number(n[i + 11])) throw new Error('Dígito verificador de bloco da arrecadação inválido.'); barras += bloco; }
  if (dv(barras.slice(0, 3) + barras.slice(4)) !== Number(barras[3])) throw new Error('Dígito verificador geral da arrecadação inválido.');
  return { tipo: 'Arrecadação ou concessionária', valor: '68'.includes(n[2] ?? '') ? Number(barras.slice(4, 15)) / 100 : null, vencimento: 'Não é possível determinar um vencimento universal para este formato. Confira o documento e a tela do banco.', aviso: 'Os dígitos conferem, mas não confirmam a cobrança nem o beneficiário. Referências 7 e 9 não codificam um valor em reais.' };
}
export function crc16(texto: string) {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(texto)) { crc ^= byte << 8; for (let i = 0; i < 8; i++) crc = ((crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)) & 0xffff; }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
export function parseTlv(texto: string): Map<string, string> {
  const bytes = new TextEncoder().encode(texto), campos = new Map<string, string>();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  for (let i = 0; i < bytes.length;) {
    if (i + 4 > bytes.length) throw new Error('Cabeçalho de campo incompleto.');
    const cab = String.fromCharCode(...bytes.slice(i, i + 4));
    if (!/^\d{4}$/.test(cab)) throw new Error('Identificador ou tamanho de campo inválido.');
    const tag = cab.slice(0, 2), tamanho = Number(cab.slice(2)); i += 4;
    if (!tamanho || i + tamanho > bytes.length || campos.has(tag)) throw new Error('Campo vazio, duplicado ou com tamanho incorreto.');
    let valor: string; try { valor = decoder.decode(bytes.slice(i, i + tamanho)); } catch { throw new Error('Texto inválido dentro do campo.'); }
    campos.set(tag, valor); i += tamanho;
  }
  return campos;
}
export function analisarPix(entrada: string) {
  const texto = entrada.trim();
  if (!texto || texto.length > 10000) throw new Error('Cole um código Pix com até 10 mil caracteres.');
  const campos = parseTlv(texto);
  if (!/6304[\dA-Fa-f]{4}$/.test(texto) || [...campos.keys()].at(-1) !== '63' || campos.get('63')?.length !== 4) throw new Error('O CRC deve ser o último campo e ter quatro caracteres.');
  if (crc16(texto.slice(0, -4)) !== campos.get('63')?.toUpperCase()) throw new Error('CRC inválido. O código pode estar incompleto ou adulterado.');
  if ([...campos.keys()][0] !== '00' || campos.get('00') !== '01' || campos.get('53') !== '986' || campos.get('58') !== 'BR' || !/^\d{4}$/.test(campos.get('52') ?? '')) throw new Error('Formato, moeda ou país incompatível com Pix.');
  if (campos.has('01') && !['11', '12'].includes(campos.get('01')!)) throw new Error('Método de iniciação inválido.');
  const contas = [...campos].filter(([id]) => +id >= 26 && +id <= 51).map(([, v]) => parseTlv(v));
  const pix = contas.filter(c => c.get('00')?.toLowerCase() === 'br.gov.bcb.pix');
  if (pix.length !== 1) throw new Error('É necessário exatamente um identificador br.gov.bcb.pix.');
  const conta = pix[0]!, chave = conta.get('01'), local = conta.get('25');
  if ((!chave && !local) || (chave && local) || (chave && new TextEncoder().encode(chave).length > 77) || (local && (!/^[^\s/:]+\.[^\s/]+\/.+/.test(local) || local.length > 77))) throw new Error('Chave ou localização Pix ausente ou inválida.');
  if (campos.get('01') === '12' && !local) throw new Error('Pix dinâmico sem localização da cobrança.');
  const recebedor = campos.get('59'), cidade = campos.get('60');
  const tamanho = (s: string) => new TextEncoder().encode(s).length;
  if (!recebedor?.trim() || !cidade?.trim() || tamanho(recebedor) > 25 || tamanho(cidade) > 15) throw new Error('Nome ou cidade ausente ou fora do tamanho permitido.');
  const valor = campos.get('54');
  if (valor !== undefined && (!/^\d{1,10}(?:\.\d{2})?$/.test(valor) || Number(valor) <= 0 || valor.length > 13)) throw new Error('Valor Pix inválido.');
  const adicional = parseTlv(campos.get('62') ?? ''), txid = adicional.get('05');
  if (!txid || !/^(?:\*{3}|[A-Za-z0-9]{1,25})$/.test(txid)) throw new Error('Identificador da transação ausente ou inválido.');
  return { recebedor, cidade, valor: valor ? Number(valor) : null, txid, tipo: local ? 'Pix dinâmico' : 'Pix estático', aviso: 'O CRC confere apenas a integridade do texto. Não confirma titularidade, autenticidade nem substitui a tela do banco. Nome e cidade são dados declarados no código. Confira destinatário e valor no banco. Nenhuma cobrança dinâmica foi consultada.' };
}
