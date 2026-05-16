# Verão Reviews

Painel simples para cadastrar avaliações com fotos e exibir um widget na wBuy.

## Rodar localmente

```bash
npm install
npm start
```

Abra:

```text
http://localhost:4173/admin.html
```

Senha padrão local:

```text
verao123
```

Para hospedar, defina uma senha própria:

```bash
ADMIN_PASSWORD="sua-senha-forte" npm start
```

## Instalar o widget na wBuy

Quando a plataforma estiver hospedada em um domínio público, coloque este código em:

```text
wBuy > Configurações > Scripts por página > Novo
Posição: Fim do Body
Página: Página principal
```

Código:

```html
<div id="verao-reviews-widget"></div>
<script src="https://SEU-DOMINIO/widget.js" async></script>
```

Troque `https://SEU-DOMINIO` pelo domínio onde este app estiver hospedado.

## Como usar

1. Abra o painel.
2. Cadastre nome da cliente, produto, nota, comentário e foto.
3. Marque "Mostrar na loja".
4. Salve.

O widget puxa automaticamente as avaliações ativas.

No painel também dá para configurar título, subtítulo, cor principal, link do botão, quantidade de avaliações e se o bloco nativo de avaliações da home deve ser escondido.

## Deploy na Vercel

Este projeto já tem `vercel.json`.

No painel da Vercel, configure as variáveis:

```text
ADMIN_PASSWORD=sua-senha-forte
AUTH_SECRET=um-segredo-grande-aleatorio
```

Observação: a Vercel não mantém uploads e JSON local de forma permanente. Para produção, conecte um banco/storage como Supabase ou Vercel Blob. Do jeito atual, serve para testar o painel e o widget online.

## Arquivos principais

- `server.js`: API, upload e armazenamento.
- `public/admin.html`: painel de cadastro.
- `public/widget.js`: widget que aparece na loja.
- `data/reviews.json`: banco simples em JSON.
- `public/uploads/`: fotos enviadas.
