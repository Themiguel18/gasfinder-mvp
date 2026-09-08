# GasFinder MVP

Aplicação Express com interface cliente existente e áreas autenticadas de cliente, agência e administrador.

## Iniciar

```bash
npm install
npm start
```

A aplicação fica disponível em `http://localhost:3000`. Para desenvolvimento, use `npm run dev`. Os dados persistem em `data/gasfinder.json`; o arquivo é criado na primeira inicialização.

## Rotas

- `/`: pesquisa pública por localização e tipo de botija, começando em 5 km.
- `/agencia`: login da agência.
- `/agencia/cadastro`: solicitação de cadastro, inicialmente pendente.
- `/agencia/dashboard`: atualização de telefone, endereço, horário, disponibilidade e preços.
- `/admin`: login administrativo.
- `/admin/dashboard`, `/admin/agencias` e `/admin/solicitacoes`: indicadores e gestão das agências.

As APIs ficam em `/api/auth`, `/api/agencias` e `/api/admin`. JWT protege os dashboards; uma agência só altera o próprio ID e o administrador controla todas.

## Acesso de desenvolvimento

- Administrador: `admin@gasfinder.app` / `admin123`
- Agência aprovada: `saojose@gasfinder.app` / `agencia123`

## Testar o fluxo

1. Acesse `/agencia/cadastro` e envie uma nova solicitação com latitude e longitude.
2. Entre em `/admin`, aprove a agência na lista de pendentes e confirme que ela passa a aparecer na pesquisa pública.
3. Entre em `/agencia`, atualize disponibilidade e preços no dashboard.
4. Na home, permita a localização ou informe latitude/longitude manualmente; selecione a botija e pesquise.
5. Confirme distância, preço, tipos disponíveis e estado de gás. Sem resultados, use o botão para ampliar o raio.

## Verificação

```bash
npm test
```

