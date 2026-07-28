# Guia do Desenvolvedor e Arquitetura - Faz-ae

Este documento resume a arquitetura, regras de domínio, esquemas do banco de dados e fluxos de navegação do aplicativo **Faz-ae** para evitar a necessidade de reanalisar todos os arquivos a cada sessão.

---

## 🏗️ 1. Arquitetura do Sistema

O projeto é estruturado seguindo os princípios de Clean Architecture e separação de conceitos:

```
faz-ae/
├── index.js                   # Ponto de entrada do aplicativo (import "expo-router/entry")
├── app/                       # Expo Router (Roteamento baseado em arquivos)
│   ├── _layout.js             # Layout raiz (SQLiteProvider, StatusBar e Stack Navigation)
│   ├── index.js               # Tela Principal (HomePage)
│   └── form.js                # Tela de Formulário (TaskFormPage)
└── src/
    ├── domain/                # Camada de Domínio (Lógica pura, sem infraestrutura)
    │   ├── entities/          # Entidades do Domínio (TaskAggregate)
    │   ├── enumerations/      # Enums como taskStatus
    │   └── validation/        # Validadores fluentes como ContractValidator
    ├── application/           # Camada de Aplicação (Serviços e Casos de Uso)
    │   └── taskServices.js    # TaskService (Orquestração de negócio e chamadas de Repo)
    ├── infra/                 # Camada de Infraestrutura (Persistência direta)
    │   ├── database/          # Inicialização SQLite (PRAGMA WAL e Schema)
    │   └── repositories/      # Repositórios (TaskRepository para SQLite)
    └── presentation/          # Camada de Apresentação (Globalizações e legado)
        └── globalizations/    # I18n simples estático (i18n.js)
```

---

## 🔒 2. Regras de Negócio e Restrições Rígidas

1. **Acoplamento Zero com Infraestrutura**: A camada de `presentation` nunca deve importar repositórios ou SQLite diretamente, exceto para a instanciação das dependências dentro do componente.
2. **Instanciação Manual via useRef**: Para injeção de dependência simplificada sem frameworks, inicializa-se o serviço dentro da view usando `useRef`:
   ```javascript
   const taskServiceRef = useRef(null);
   if (!taskServiceRef.current) {
     const repository = new TaskRepository();
     taskServiceRef.current = new TaskService(repository);
   }
   const taskService = taskServiceRef.current;
   ```
3. **Navegação com Expo Router**: A navegação utiliza o roteamento nativo baseado em arquivos do Expo Router. Os arquivos principais estão sob a pasta [app/](file:///C:/Github/faz-ae/app).
   - **Navegação**: Feita usando `router.push({ pathname: '/form', params: { maxPriority } })`.
   - **Retorno**: Feito com `router.back()`.
   - **Atualização ao Focar**: Devido à preservação da tela no histórico da Stack, a HomePage utiliza o hook `useFocusEffect` (combinado com `useCallback`) para recarregar a listagem sempre que ganha foco novamente.
   - **Parâmetros**: Obtidos usando a hook `useLocalSearchParams()` na tela de destino.
4. **Sem Pacotes Externos para UI ou Validação**: Nenhum framework de formulários (Zod, React Hook Form) ou kits de UI (Paper, NativeBase) é permitido. Toda a UI e a validação imperativa são desenvolvidas de forma nativa e enxuta.

---

## 💾 3. Esquema do Banco de Dados (SQLite)

O banco de dados de persistência local é o `faz_ae.db` inicializado em [sqlite-connection.js](file:///C:/Github/faz-ae/src/infra/database/sqlite-connection.js) sob a especificação de [databaseSchema.js](file:///C:/Github/faz-ae/src/infra/database/databaseSchema.js):

* **tasks**
  * `id` (TEXT, PRIMARY KEY)
  * `description` (TEXT, NOT NULL)
  * `observation` (TEXT)
  * `priority` (INTEGER, NOT NULL) - Ordenação por priority DESC
  * `dueDate` (TEXT, NOT NULL) - Formato ISO string
  * `createdDate` (TEXT, NOT NULL) - Formato ISO string
  * `notify` (INTEGER, NOT NULL) - 0 ou 1
  * `status` (TEXT, NOT NULL) - Valor mapeado do enum `taskStatus` ('todo' | 'done')
  * `progressPercentage` (REAL, DEFAULT 0.0)

* **sub_tasks**
  * Relacionamento 1-N através de `task_id` com cascateamento ao deletar (`ON DELETE CASCADE`).

---

## 🎯 4. Lógica de Domínio e Validações

* **TaskAggregate** ([taskAggregate.js](file:///C:/Github/faz-ae/src/domain/entities/taskAggregate.js)):
  * **Regras de Validação**:
    * `description`: Obrigatório, String, tamanho máximo 100.
    * `observation`: Opcional no domínio (mas obrigatório na validação do formulário de criação), String, tamanho máximo 500.
    * `priority`: Obrigatório, Inteiro.
    * `dueDate`: Obrigatório, Instância de Date válida.
    * `notify`: Obrigatório, Boolean.
  * **Notificação**: A ação `toggleNotify()` do agregado valida se a tarefa está dentro do prazo antes de permitir ativar a notificação.

---

## ⚙️ 5. Lógica da UI na Apresentação

### A. HomePage ([homeScreen.js](file:///C:/Github/faz-ae/src/presentation/homeScreen.js))
* **Ordenação Manual e Debounce**: O usuário pode mover itens. O movimento atualiza o estado em memória instantaneamente reatribuindo prioridades decrescentes da primeira para a última tarefa do array. A persistência silenciosa no SQLite é disparada após 3 segundos sem interações usando `debounceTimeoutRef`.
* **Cálculo de Prioridade**: Ao adicionar uma nova tarefa, localiza-se o maior valor de prioridade atual (`tasks[0]?.priority || 0`) para ser incrementado em +1 no formulário de criação, garantindo que o novo registro apareça sempre no topo (ordem `priority DESC`).

### B. TaskFormPage ([taskFormScreen.js](file:///C:/Github/faz-ae/src/presentation/taskFormScreen.js))
* **Validação Imperativa**: Nenhum campo de input pode ser nulo ou string vazia.
* **Seletor de Prazo (Due Date)**: Seletor interativo em linha para manipulação de Dia, Mês, Ano, Hora e Minuto com botões `+` e `-`.
* **Notificar Condicional**: A opção de notificar é ativada somente se `dueDate` for estritamente maior que `new Date()`. Se a data for reduzida para o passado, o status de notificação é forçado para `false` e desabilitado visualmente.
