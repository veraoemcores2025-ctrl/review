# Verao Reviews

Painel simples para cadastrar avaliacoes com fotos e exibir um widget na wBuy.

## Rodar localmente

```bash
npm install
npm start
```

Abra:

```text
http://localhost:4173/admin.html
```

Senha padrao local:

```text
verao123
```

Para hospedar, defina uma senha propria:

```bash
ADMIN_PASSWORD="sua-senha-forte" npm start
```

## Instalar o widget na wBuy

Quando a plataforma estiver hospedada em um dominio publico, coloque este codigo em:

```text
wBuy > Configuracoes > Scripts por pagina > Novo
Posicao: Fim do Body
Pagina: Pagina principal
```

Codigo:

```html
<div id="verao-reviews-widget"></div>
<script src="https://SEU-DOMINIO/widget.js" defer></script>
```

Troque `https://SEU-DOMINIO` pelo dominio onde este app estiver hospedado.

## Como usar

1. Abra o painel.
2. Cadastre nome da cliente, produto, nota, comentario e foto.
3. Marque "Mostrar na loja".
4. Salve.

O widget puxa automaticamente as avaliacoes ativas.

No painel tambem da para configurar titulo, subtitulo, cor principal, link do botao, quantidade de avaliacoes e se o bloco nativo de avaliacoes da home deve ser escondido.

## Supabase

Rode o arquivo `supabase.sql` no SQL Editor do Supabase para criar as tabelas e o bucket de fotos.

No painel da Vercel, configure as variaveis:

```text
ADMIN_PASSWORD=sua-senha-forte
AUTH_SECRET=um-segredo-grande-aleatorio
SUPABASE_URL=https://jztilgywniqypucyzshy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
SUPABASE_BUCKET=review-photos
```

Sem as variaveis do Supabase o app continua usando o JSON local, mas na Vercel esse armazenamento nao e permanente.

## Deploy na Vercel

Este projeto ja tem `vercel.json`. Depois de configurar o Supabase e as variaveis de ambiente, basta publicar o projeto pela Vercel.

## Arquivos principais

- `server.js`: API, upload e armazenamento.
- `public/admin.html`: painel de cadastro.
- `public/widget.js`: widget que aparece na loja.
- `data/reviews.json`: fallback local em JSON.
- `public/uploads/`: fallback local das fotos.
- `supabase.sql`: estrutura do banco e bucket no Supabase.
