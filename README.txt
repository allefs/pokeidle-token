POKÉ IDLE — MARKET MONITOR
==========================

O que faz
---------
- Consulta somente leitura o endpoint GET https://poke.idleworld.online/api/game/market?category=All
- Atualiza automaticamente a cada 30 segundos (2 consultas por minuto por navegador; o servidor local ainda mantém cache por 15 segundos).
- Filtros locais por busca, categoria, moeda, shiny, IV total, Quality, preço e nível.
- Ordenação por data, preço, IV, Quality, nível ou nome.
- Não envia compras, vendas, ofertas ou qualquer ação para o jogo.

Como abrir no Windows
---------------------
1. Extraia todos os arquivos do ZIP para uma pasta.
2. Instale Node.js LTS em https://nodejs.org/ caso ainda não tenha (uma instalação só).
3. Dê dois cliques em iniciar.bat.
4. O navegador abrirá http://127.0.0.1:3000.
5. Para encerrar, volte à janela preta do terminal e pressione Ctrl+C.

Requisitos e privacidade
------------------------
- Requer Node.js 18 ou superior (usa fetch nativo do Node).
- O servidor escuta apenas em 127.0.0.1, portanto não fica publicado na internet.
- Não pede nem armazena senha. O token é mantido somente no servidor, via variável de ambiente GAME_ACCESS_TOKEN; nunca fica no HTML nem no GitHub.
- No Render, abra o serviço > Environment > Add Environment Variable. Nome: GAME_ACCESS_TOKEN. Valor: um access token válido, sem o prefixo “Bearer ”. Salve e faça redeploy.
- Tokens expiram. Quando receber HTTP 401, atualize a variável com um token novo obtido por um método autorizado. O projeto não automatiza o CAPTCHA nem tenta contornar a proteção Cloudflare.
- Se continuar recebendo HTTP 403 mesmo com token válido, peça à equipe do jogo um método autorizado de integração server-to-server; não copie cookies cf_clearance para tentar contornar o bloqueio.
- O acesso ao endpoint e o intervalo de atualização devem continuar de acordo com a autorização e os limites definidos pela equipe do jogo.

Arquivos
-------
server.js          servidor local e ponte para a API
public/index.html  interface, filtros e atualização automática
iniciar.bat        atalho para abrir no Windows

Hospedagem gratuita no Render
-----------------------------
1. Envie estes arquivos para a raiz de um repositório GitHub (privado é recomendado). Nunca inclua tokens ou senhas.
2. No Render, escolha New > Web Service e conecte o repositório.
3. Configure Build Command: npm install; Start Command: npm start.
4. Em Environment, adicione GAME_ACCESS_TOKEN com um access token válido obtido por um método autorizado.
5. Selecione o plano Free e clique em Deploy. O Render fornecerá um endereço HTTPS.

O servidor já escuta em 0.0.0.0 e utiliza a variável PORT da plataforma.
No plano gratuito do Render, o serviço pode dormir após 15 minutos sem tráfego e demorar cerca de um minuto para voltar na primeira visita. Respeite sempre os limites de consulta autorizados pela equipe do jogo.
