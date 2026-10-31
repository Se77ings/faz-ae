# CLAUDE.md — faz-ae (Afazeres)

Complementa o `C:\Github\CLAUDE.md` (comentários, Conventional Commits em português, granularidade). Aqui ficam só as regras e o contexto deste projeto.

> `Agent.md` é um documento anterior e está **desatualizado** (cita Expo Router, pasta `app/`, `taskFormScreen.js`, MySQL). Em caso de conflito, vale este arquivo.

## Produto

App mobile (Android como alvo principal) de gestão de tarefas pessoais com sub-tarefas, prazo e alarme/notificação.
Gestão do trabalho no Jira: site `se77ings.atlassian.net`, projeto **TDS — Afazeres** (board 34). Itens do Jira são referenciados no código como `<TDS-NN>` dentro de `TODO`s; mantenha esse padrão.

## Stack

- Expo SDK **57** (`expo ~57.0.4`), React Native 0.86, React 19.2, JavaScript puro (sem TypeScript).
- **Antes de escrever código Expo, consulte a doc versionada**: https://docs.expo.dev/versions/v57.0.0/ (ver `AGENTS.md`).
- Navegação: `@react-navigation/native-stack` (Stack em `App.js`: `Home`, `TaskForm`, `ViewTask`). **Não** é Expo Router.
- Persistência: `expo-sqlite` (`SQLiteProvider` com `databaseName="faz_ae.db"` e `onInit={initializeDatabase}`).
- IDs: `expo-crypto` `randomUUID()`.
- Data/hora: `@react-native-community/datetimepicker` (API com `onValueChange`).
- Alarmes: `android-alarm-manager`, Expo Module próprio em `../android-alarm-manager` (ver "Alarmes").
- Testes: Jest com preset `jest-expo`.

Sem libs externas de UI (Paper, NativeBase...) nem de formulário/validação (Zod, React Hook Form). UI e validação são feitas à mão.

## Comandos

```bash
npm test               # jest
npm run android        # expo run:android (development build; o módulo de alarme é nativo, não roda no Expo Go)
npm start              # expo start
```

`/android` e `/ios` são gerados pelo `expo prebuild` e estão no `.gitignore`. **Nunca edite arquivos dentro de `android/`**: tudo o que o app precisa no nativo vem do `app.json`, dos config plugins ou do manifest de algum módulo. Assim, um `npx expo prebuild --clean` numa máquina nova reproduz o projeto.

### Setup numa máquina nova

1. Clone `faz-ae` **e** `android-alarm-manager` lado a lado em `C:\Github\`.
2. No faz-ae, rode `npm install`. O `.npmrc` tem `install-links=true`, então o módulo é copiado para `node_modules`, e não linkado.
3. Rode `npm run android`.

## Arquitetura (4 camadas)

```
src/
├── domain/          # regras puras, sem RN/SQLite
│   ├── entities/        taskAggregate.js (raiz do agregado), subTask.js
│   ├── enumerations/    taskStatus.js ('todo' | 'done' + parse), tabEnum.js (DAY | WEEK | MONTH)
│   └── validation/      contractValidator.js (fluente), taskValidator.js (estático)
├── application/     taskServices.js (TaskService: orquestra agregado + repositório)
│   └── __tests__/
├── infra/
│   ├── alarms/          taskAlarmScheduler.js (adapter do android-alarm-manager)
│   ├── database/        databaseSchema.js (DDL), sqlite-connection.js (guarda a instância do db)
│   └── repositories/    taskRepository.js
└── presentation/    homeScreen.js, taskForm.js, viewTaskPage.js, components/taskList.js,
                     alarmPermissions.js, styles/homeScreenStyles.js, globalizations/i18n.js
```

Regras:
- `domain` não importa nada de `infra` nem de `presentation`.
- `presentation` só fala com `TaskService`. A única exceção é montar a dependência dentro do componente:
  ```js
  const taskServiceRef = useRef(null);
  if (!taskServiceRef.current) {
    taskServiceRef.current = new TaskService(new TaskRepository());
  }
  ```
  (`taskList.js` instancia em escopo de módulo, o que também é aceitável.)
- O `TaskService` recebe o repositório pelo construtor; nos testes o repositório é um mock com `getByIdAsync`, `getAllAsync`, `saveAsync`, `deleteAsync`.
- Métodos assíncronos levam o sufixo `Async`. Os serviços e repositórios **não lançam exceções para a UI**: logam e retornam `false`/`null`/`[]`.
- O repositório não usa ORM. O agregado é reidratado por factories estáticas (`TaskAggregate.createFromDatabase`, `SubTask.restore`), já que JS não tem sobrecarga de construtor.
- `saveAsync` do repositório faz `INSERT OR REPLACE` da task e **recria todas as sub_tasks** (DELETE + INSERT). O agregado é sempre salvo inteiro.

## Domínio

**TaskAggregate**: `id` (UUID), `description` (obrigatória, ≤100), `observation` (string, ≤500), `priority` (inteiro), `dueDate` (Date válida), `createdDate`, `notify` (boolean), `status`, `progressPercentage` (calculado: % de sub-tarefas `done`), `subTasks` (privado `#_subTasks`, só leitura via getter).
- O construtor valida com `TaskValidator.validateMainTask` e lança exceção se for inválido.
- `completeTask()` / `reopenTask()` mudam o status entre `todo` e `done`.
- `addSubTasks([...])` ignora sub-tarefas inválidas e devolve avisos.
- `update(...)` substitui as sub-tarefas: com `id` → `SubTask.restore`, sem `id` → nova.

**SubTask**: `description` (≤100), `status`, `complete()`/`reopen()`. `priority` e `notify` existem, mas ainda não são usados.

**Regras de negócio** (vindas do Jira):
- Concluir uma task com sub-tarefas pendentes conclui todas elas. A UI pede confirmação antes (`Alert` em `viewTaskPage.js`).
- Só é possível ativar a notificação se o prazo for futuro. Se o prazo for para o passado, `notify` é forçado para `false` (formulário).
- Prioridade: uma nova task recebe `maxPriority + 1` para aparecer no topo (`ORDER BY priority DESC`) sem renumerar as outras. Ao reordenar, manipula-se a lista em memória e persiste-se só depois de alguns segundos sem interação ou ao salvar.
- Os intervalos de notificação serão definidos numa tela de Configurações (ainda não existe). Se não houver nenhum configurado, mostrar um atalho para essa tela.

## Banco (SQLite)

`tasks` (id TEXT PK, description, observation, priority INTEGER, dueDate TEXT ISO, createdDate TEXT ISO, notify INTEGER 0/1, status, progressPercentage REAL) e `sub_tasks` (FK `task_id` com `ON DELETE CASCADE`). `PRAGMA journal_mode = WAL` e `foreign_keys = ON`.
Não há versionamento de schema: só `CREATE TABLE IF NOT EXISTS`. Mudar uma coluna exige criar uma migração (ainda não há mecanismo para isso).

## Navegação e atualização das telas

- Para ir a outra tela: `navigation.navigate('ViewTask', { taskId })` / `navigate('TaskForm', { taskId? , maxPriority })`.
- Para avisar a tela anterior que precisa recarregar: `navigation.navigate('<Tela>', { refreshRequired: true }, { merge: true })`. A tela de destino observa `route.params?.refreshRequired` num `useEffect`, recarrega e zera o parâmetro com `navigation.setParams({ refreshRequired: false })`. A Home repassa isso via `refreshCounter` para a `TaskList`.
- A filtragem por Dia/Semana/Mês é feita **em memória** na `TaskList` (busca as 100 primeiras tasks e filtra pela `dueDate`). A semana começa no domingo.

## UI e i18n

- Tema escuro fixo: fundo `#000000`, superfícies `#1C1C1E`/`#27272A`, destaque `#FACC15`, sucesso `#10B981`, alerta `#EA580C`, erro `#E11D48`. Os ícones são emojis.
- Estilos via `StyleSheet.create` no fim do arquivo da tela (a Home usa `styles/homeScreenStyles.js`).
- Textos visíveis passam por `translate('chave')` (`i18n.js`, `pt-BR` padrão e fallback `en-US`). Toda chave nova vai nos dois idiomas. Ainda há strings fixas em PT nas telas (ex.: "CONCLUIR TAREFA", "Prazo deve ser futuro", textos do `Alert`); ao mexer nelas, mova-as para o i18n.

## Alarmes (TDS-26)

O requisito é um **alarme de despertador**: tela cheia sobre o bloqueio, som em loop, botões Parar e Adiar. Push simples não serve. Por isso foram descartados o `expo-notifications` (não tem full-screen nem som contínuo no SDK 57) e o Notifee (arquivado em 04/2026, sem New Architecture). A solução é o Expo Module próprio `../android-alarm-manager`; o funcionamento, as permissões e as políticas da Play Store estão no README dele.

No app:
- `src/infra/alarms/taskAlarmScheduler.js`: adapter do módulo, que traduz os rótulos (o módulo não tem i18n).
- `TaskService` recebe o scheduler como 2º argumento do construtor (opcional) e o sincroniza a cada persistência: toca se `notify && status === todo && dueDate futuro`; nos outros casos, cancela. O id do alarme é o id da task.
- Horário do alarme: `dueDate - 60 min` (TDS-6). Se esse horário já passou, toca no próprio `dueDate`. Quando a tela de Configurações existir, o intervalo vem dela.
- Adiar = 10 min (`taskAlarmScheduler.js`).
- Uma falha ao agendar o alarme é logada e **não** impede salvar a task.
- `src/presentation/alarmPermissions.js`: ao ligar "Notificar" no formulário, pede `POST_NOTIFICATIONS` (bloqueante) e oferece abrir os ajustes de alarme exato e de tela cheia (não bloqueantes, um por vez).
- As permissões vêm do manifest do módulo, mesclado no build. Não as declare no `app.json`.

## Testes

Escreva testes a partir de casos reais de uso (ver as histórias TDS-6 a TDS-9), sem gerar uma bateria massiva de testes artificiais. Teste `domain` e `application` com o repositório e o alarmScheduler mockados.
O mock do `expo-crypto` no `jest-expo` não gera UUID (`task.id` fica `undefined`): quando o teste depender do id, atribua um manualmente.

## Débitos conhecidos (verificados no código)

- **Tipo de `status` inconsistente**: o domínio usa `'todo'`/`'done'` (string), mas o schema declara `status INTEGER` e há resquícios do formato antigo `1`/`2` (`taskList.js` `isDone = item.status === 2`, que nunca é verdadeiro hoje; `taskRepository` `st.status || 1`; `completeTaskAsync` `status !== 2`; comparações duplas em `viewTaskPage.js`). Relacionado ao TDS-24.
- `TaskAggregate.toggleNotify()` tem a condição invertida (`dueDate < new Date()` só permite alternar quando o prazo já passou).
- `taskList.js`: a barra de progresso usa `progressPercentage != 0 ?? <View>` e nunca renderiza (deveria ser `&&`).
- `taskServices.js` `reopenSubTaskAsync`: typo `csonsole.error`.
- Teste importa `'../../domain/entities/TaskAggregate'`, mas o arquivo é `taskAggregate.js`. Passa no Windows e quebra em sistemas case-sensitive.
- `homeScreen.js` envia `maxPriority: 10` fixo em vez da maior prioridade real.
- Não existe ação de excluir na UI (`deleteAsync` existe no serviço).
- `getAllAsync` monta o `IN (...)` das sub_tasks por interpolação de string.
- Todos esses itens estão documentados na TDS-27 (última tarefa da sprint #1).
