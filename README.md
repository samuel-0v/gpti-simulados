# GPTI | Simulados

Protótipo local de revisão baseado no PDF de simulados PMBOK enviado.

**Acesso público:** [Abrir o site](https://gpti-simulados.vercel.app/)

A branch `main` está conectada ao Vercel; novos commits nela iniciam uma atualização de produção automática.

## Funcionalidades
- Cinco simulados temáticos com 25 questões cada: Custos, Riscos, Comunicações, Qualidade e Aquisições.
- Modo de correção imediata ou correção ao finalizar.
- Simulado geral com 5 questões sorteadas por tema (25 no total).
- Histórico de tentativas salvo no localStorage deste navegador.
- Estatísticas por tema ou gerais, com questões mais erradas e revisão das respostas corretas.
- Tema claro e escuro, com preferência salva neste navegador.
- Exportação CSV da tentativa com questão, tema, resposta escolhida, resultado, gabarito e nota.

## Executar
Requer Node.js 20.19+ ou 22.12+.

```sh
npm install
npm run dev
```

Acesse o endereço local indicado pelo Vite. Para gerar os arquivos de produção: `npm run build`.

Os resultados permanecem no navegador e não são enviados a um servidor. Limpar os dados do navegador apaga o histórico local. O conteúdo das questões e o gabarito foram extraídos do PDF fonte.
