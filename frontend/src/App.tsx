import { useRef, useState, type ChangeEvent } from "react";
import ForceGraph2D from "react-force-graph-2d";
import "./App.css";

type Page = "home" | "upload" | "graph" | "search" | "analytics";

type Entity = {
  id: string;
  type: string;
  title: string;
  description: string;
  source?: string;
};

type Relation = {
  id: string;
  from: string;
  relation: string;
  to: string;
};

type GraphNode = {
  id: string;
  label: string;
  group: string;
  x?: number;
  y?: number;
};

type GraphLink = {
  source: string | GraphNode;
  target: string | GraphNode;
  label: string;
};

type AnalyzeResponse = {
  document: {
    id: string;
    name: string;
    type: string;
    uploadedAt: string;
  };
  entities: Entity[];
  relations: Relation[];
  graph: {
    nodes: GraphNode[];
    links: GraphLink[];
  };
  tags: string[];
};

type ProcessedFile = {
  id: string;
  name: string;
  type: string;
  year: number;
  geography: string;
  status: "Обработан" | "Ошибка" | "В обработке";
  size: string;
  entities: number;
  relations: number;
  uploadedAt: string;
};

type NavigatorItem = {
  type: string;
  title: string;
  description: string;
  target: Page;
  badge: string;
  filter?: string;
};

const pages: { key: Page; label: string; icon: string }[] = [
  { key: "home", label: "Главная", icon: "⌂" },
  { key: "upload", label: "Загрузка данных", icon: "⇧" },
  { key: "graph", label: "Карта знаний", icon: "✣" },
  { key: "search", label: "Поиск", icon: "⌕" },
  { key: "analytics", label: "Аналитика", icon: "▥" },
];

const demoText =
  "В эксперименте №12 исследовалось влияние температуры термообработки на прочность титанового сплава ВТ1-0. Работы проводились в лаборатории материаловедения. Ответственным исполнителем указан Иванов И.И. В результате испытаний установлено повышение прочности после обработки при температуре 650°C.";

const initialFiles: ProcessedFile[] = [
  {
    id: "file-1",
    name: "Тех. отчёт — Обогащение руды.pdf",
    type: "Технический отчёт",
    year: 2024,
    geography: "Россия",
    status: "Обработан",
    size: "8.4 МБ",
    entities: 130,
    relations: 90,
    uploadedAt: "Сегодня, 10:42",
  },
  {
    id: "file-2",
    name: "Исследование никеля.docx",
    type: "Научная статья",
    year: 2023,
    geography: "Россия, Канада",
    status: "Обработан",
    size: "2.1 МБ",
    entities: 86,
    relations: 59,
    uploadedAt: "Сегодня, 09:15",
  },
  {
    id: "file-3",
    name: "Экспериментальные данные.xlsx",
    type: "Эксперимент",
    year: 2023,
    geography: "Россия",
    status: "Обработан",
    size: "1.2 МБ",
    entities: 54,
    relations: 36,
    uploadedAt: "Вчера, 17:38",
  },
  {
    id: "file-4",
    name: "Наблюдения и заметки.txt",
    type: "Примечания",
    year: 2022,
    geography: "Россия",
    status: "Обработан",
    size: "320 КБ",
    entities: 22,
    relations: 14,
    uploadedAt: "Вчера, 15:22",
  },
];

const mockAnalyzeResponse: AnalyzeResponse = {
  document: {
    id: "doc-128",
    name: "Отчёт по испытаниям сорбента 2024.pdf",
    type: "Технический отчёт",
    uploadedAt: "Сегодня, 10:42",
  },
  entities: [
    {
      id: "entity-1",
      type: "Материал",
      title: "Титан ВТ1-0",
      description: "Материал, найденный в отчёте по испытаниям.",
      source: "Отчёт по испытаниям сорбента 2024.pdf",
    },
    {
      id: "entity-2",
      type: "Эксперимент",
      title: "Эксперимент №12",
      description: "Исследование влияния температуры на свойства материала.",
      source: "Отчёт по испытаниям сорбента 2024.pdf",
    },
    {
      id: "entity-3",
      type: "Свойство",
      title: "Прочность",
      description: "Ключевой параметр, связанный с результатами испытаний.",
      source: "Отчёт по испытаниям сорбента 2024.pdf",
    },
    {
      id: "entity-4",
      type: "Лаборатория",
      title: "Лаборатория материаловедения",
      description: "Подразделение, в котором проводились испытания.",
      source: "Отчёт по испытаниям сорбента 2024.pdf",
    },
    {
      id: "entity-5",
      type: "Сотрудник",
      title: "Иванов И.И.",
      description: "Ответственный исполнитель исследования.",
      source: "Отчёт по испытаниям сорбента 2024.pdf",
    },
    {
      id: "entity-6",
      type: "Режим",
      title: "650°C",
      description: "Температурный режим обработки материала.",
      source: "Отчёт по испытаниям сорбента 2024.pdf",
    },
  ],
  relations: [
    {
      id: "rel-1",
      from: "Титан ВТ1-0",
      relation: "используется в",
      to: "Эксперимент №12",
    },
    {
      id: "rel-2",
      from: "Эксперимент №12",
      relation: "исследует",
      to: "Прочность",
    },
    {
      id: "rel-3",
      from: "Иванов И.И.",
      relation: "проводил",
      to: "Эксперимент №12",
    },
    {
      id: "rel-4",
      from: "Иванов И.И.",
      relation: "работает в",
      to: "Лаборатория материаловедения",
    },
    {
      id: "rel-5",
      from: "Эксперимент №12",
      relation: "использует режим",
      to: "650°C",
    },
  ],
  graph: {
    nodes: [
      { id: "titan", label: "Титан ВТ1-0", group: "Материал" },
      { id: "experiment", label: "Эксперимент №12", group: "Эксперимент" },
      { id: "strength", label: "Прочность", group: "Свойство" },
      { id: "ivanov", label: "Иванов И.И.", group: "Сотрудник" },
      { id: "lab", label: "Лаборатория материаловедения", group: "Лаборатория" },
      { id: "temp", label: "650°C", group: "Режим" },
    ],
    links: [
      { source: "titan", target: "experiment", label: "используется в" },
      { source: "experiment", target: "strength", label: "исследует" },
      { source: "ivanov", target: "experiment", label: "проводил" },
      { source: "ivanov", target: "lab", label: "работает в" },
      { source: "experiment", target: "temp", label: "использует режим" },
    ],
  },
  tags: ["Материаловедение", "Термообработка", "Прочность", "Испытания"],
};

const analyticsCoverage = [
  { title: "Гидрометаллургия", value: 78 },
  { title: "Пирометаллургия", value: 52 },
  { title: "Экология", value: 66 },
  { title: "Переработка отходов", value: 41 },
];

const riskZones = [
  "Мало источников по кучному выщелачиванию в холодном климате",
  "Противоречивые данные по скорости циркуляции католита",
  "Нет экспериментов для комбинации: никелевая руда + SO₂",
];

const teamActivity = [
  { team: "Лаборатория гидрометаллургии", value: 42 },
  { team: "Лаборатория пирометаллургии", value: 31 },
  { team: "Лаборатория экологии", value: 24 },
  { team: "Лаборатория переработки отходов", value: 16 },
  { team: "Центр моделирования процессов", value: 15 },
];

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getLinkId(value: string | GraphNode) {
  return typeof value === "string" ? value : value.id;
}

function cleanGraph(graph: AnalyzeResponse["graph"]) {
  return {
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      group: node.group,
    })),
    links: graph.links.map((link) => ({
      source: getLinkId(link.source),
      target: getLinkId(link.target),
      label: link.label,
    })),
  };
}

function App() {
  const [activePage, setActivePage] = useState<Page>("home");
  const [processedFiles, setProcessedFiles] =
    useState<ProcessedFile[]>(initialFiles);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(
    mockAnalyzeResponse
  );
  const [text, setText] = useState(demoText);
  const [fileName, setFileName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState("Все");
  const [isCopied, setIsCopied] = useState(false);
  const [siteSearch, setSiteSearch] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isPageSearchOpen, setIsPageSearchOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentEntities = analysisResult?.entities || [];
  const currentRelations = analysisResult?.relations || [];
  const currentGraph = analysisResult?.graph || { nodes: [], links: [] };

  const entityTypes = [
    "Все",
    ...Array.from(new Set(currentEntities.map((entity) => entity.type))),
  ];

  const filteredEntities = currentEntities.filter((entity) => {
    const matchesType = entityFilter === "Все" || entity.type === entityFilter;

    return matchesType;
  });

  const exportData = analysisResult
    ? {
        document: analysisResult.document,
        extracted_entities: analysisResult.entities,
        relations: analysisResult.relations,
        graph: cleanGraph(analysisResult.graph),
        tags: analysisResult.tags,
        meta: {
          entities_count: analysisResult.entities.length,
          relations_count: analysisResult.relations.length,
          source: "semantic-analysis-api",
        },
      }
    : null;

  const dashboardStats = [
    { label: "Документы", value: processedFiles.length + 124, icon: "▤" },
    { label: "Эксперименты", value: 342, icon: "⚗" },
    { label: "Сущности", value: 4815 + currentEntities.length, icon: "⬡" },
    { label: "Связи", value: 12940 + currentRelations.length, icon: "↗" },
  ];

  const uploadStats = [
    { label: "Извлечено документов", value: processedFiles.length, icon: "▤" },
    { label: "Материалов", value: 38, icon: "⬡" },
    { label: "Процессов", value: 17, icon: "✣" },
    { label: "Параметров", value: 64, icon: "☷" },
    { label: "Связей", value: 210, icon: "↗" },
  ];

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setFileName(file.name);
    setErrorMessage("");

    const readableFile = /\.(txt|md|csv|puml)$/i.test(file.name);

    if (!readableFile) {
      setText(
        `Файл "${file.name}" выбран. Содержимое будет обработано серверной частью после запуска обработки.`
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result === "string") {
        setText(result);
      }
    };

    reader.readAsText(file);
  };

  const handleUseDemoCorpus = () => {
    setFileName("demo-corpus.zip");
    setText(demoText);
    setErrorMessage("");
  };

  const handleClearUpload = () => {
    setText("");
    setFileName("");
    setErrorMessage("");
    setIsProcessing(false);
    setIsCopied(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleProcess = () => {
    const preparedText = normalizeText(text);

    if (!fileName && preparedText.length < 20) {
      setErrorMessage("Загрузите файл или вставьте более полный фрагмент текста.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");

    setTimeout(() => {
      const documentName = fileName || "manual-input.txt";

      const result: AnalyzeResponse = {
        ...mockAnalyzeResponse,
        document: {
          id: `doc-${Date.now()}`,
          name: documentName,
          type: documentName.split(".").pop()?.toUpperCase() || "TXT",
          uploadedAt: "Сегодня, 16:58",
        },
      };

      const newFile: ProcessedFile = {
        id: `file-${Date.now()}`,
        name: documentName,
        type: "Загруженный документ",
        year: new Date().getFullYear(),
        geography: "Россия",
        status: "Обработан",
        size: "—",
        entities: result.entities.length,
        relations: result.relations.length,
        uploadedAt: "Только что",
      };

      setAnalysisResult(result);
      setProcessedFiles((prev) => [newFile, ...prev].slice(0, 6));
      setIsProcessing(false);
      setActivePage("graph");
    }, 900);
  };

  const handleExportJson = () => {
    if (!exportData) return;

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "knowledge-map-result.json";
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleCopyJson = async () => {
    if (!exportData) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      setIsCopied(true);

      setTimeout(() => {
        setIsCopied(false);
      }, 1500);
    } catch {
      setErrorMessage("Не удалось скопировать JSON. Попробуйте скачать файл.");
    }
  };

  const renderTopbar = () => {
    const runNavigatorSearch = () => {
      const query = normalizeText(siteSearch);

      if (!query) return;

      setSearchQuery(query);
      setActivePage("search");
      setIsPageSearchOpen(false);
    };

    return (
      <header className="topbar">
        <div
          className={
            isPageSearchOpen
              ? "page-search-widget search-open"
              : "page-search-widget"
          }
        >
          <button
            className="page-search-toggle"
            type="button"
            onClick={() => setIsPageSearchOpen((prev) => !prev)}
            aria-label="Поиск по базе знаний"
          >
            ⌕
          </button>

          {isPageSearchOpen && (
            <>
              <input
                autoFocus
                value={siteSearch}
                onChange={(event) => setSiteSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    runNavigatorSearch();
                  }
                }}
                placeholder="Найти в базе знаний..."
              />

              {siteSearch && (
                <button
                  className="page-search-clear"
                  type="button"
                  onClick={() => setSiteSearch("")}
                >
                  ×
                </button>
              )}

              <button
                className="page-search-go"
                type="button"
                onClick={runNavigatorSearch}
              >
                Найти
              </button>
            </>
          )}
        </div>
      </header>
    );
  };

  const renderHome = () => (
    <>
      <section className="page-heading">
        <h1>Научный клубок</h1>
        <p>
          Единая карта знаний R&D для научных отчётов, экспериментов и
          исследований.
        </p>
      </section>

      <section className="hero-dashboard">
        <div className="hero-visual">
          <img src="/yarn-ball.png" alt="Научный клубок" />
          <div className="network-orbit orbit-one"></div>
          <div className="network-orbit orbit-two"></div>
          <div className="network-dot dot-one">▤</div>
          <div className="network-dot dot-two">⚗</div>
          <div className="network-dot dot-three">↗</div>
        </div>

        <div className="hero-copy">
          <h2>Собираем знания. Связываем смысл. Ускоряем открытия.</h2>
          <p>
            Система загружает отчёты, статьи и результаты экспериментов,
            получает структурированные результаты анализа и отображает их как
            карту знаний о материалах, процессах, методах и результатах
            исследований.
          </p>

          <div className="hero-actions">
            <button className="primary" onClick={() => setActivePage("upload")}>
              ⇧ Загрузить данные
            </button>

            <button className="secondary" onClick={() => setActivePage("search")}>
              ⌕ Открыть навигатор
            </button>
          </div>
        </div>
      </section>

      <section className="kpi-grid">
        {dashboardStats.map((stat) => (
          <article className="kpi-card" key={stat.label}>
            <div className="kpi-icon">{stat.icon}</div>

            <div>
              <span>{stat.label}</span>
              <b>{stat.value.toLocaleString("ru-RU")}</b>
            </div>
          </article>
        ))}
      </section>

      <section className="two-column-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>Последние активности</h2>
          </div>

          <div className="activity-list">
            {processedFiles.slice(0, 3).map((file) => (
              <div className="activity-item" key={file.id}>
                <div className="activity-icon">▤</div>

                <div>
                  <b>Загружен документ: «{file.name}»</b>
                  <p>
                    Извлечено сущностей: {file.entities}, создано связей:{" "}
                    {file.relations}
                  </p>
                </div>

                <span>{file.uploadedAt}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Популярные темы</h2>
          </div>

          <div className="topic-grid">
            {[
              "Обессоливание воды",
              "Электроэкстракция никеля",
              "Шахтные воды",
              "Кучное выщелачивание",
            ].map((topic) => (
              <button
                key={topic}
                onClick={() => {
                  setSearchQuery(topic);
                  setActivePage("search");
                }}
              >
                {topic}
              </button>
            ))}
          </div>
        </article>
      </section>
    </>
  );

  const renderUpload = () => (
    <>
      <section className="page-heading">
        <h1>Загрузка и обработка данных</h1>
        <p>
          Импорт технических документов, отчётов и экспериментов для
          автоматического извлечения знаний и построения карты.
        </p>
      </section>

      <section className="upload-panel">
        <div className="tabs">
          <button className="active">⇧ Загрузить файлы</button>
          <button onClick={handleUseDemoCorpus}>▤ Использовать демо-корпус</button>
        </div>

        <div className="upload-content">
          <div
            className="dropzone"
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <div className="dropzone-icon">⇧</div>

            <div>
              <b>Перетащите файлы сюда или выберите на компьютере</b>
              <p>Поддерживаемые форматы: PDF, DOCX, TXT, CSV, XLSX, PUML</p>
              <button className="outline-button">Выбрать файлы</button>
            </div>

            <input
              ref={fileInputRef}
              className="hidden-file-input"
              type="file"
              accept=".txt,.md,.csv,.puml,.pdf,.doc,.docx,.xlsx"
              onChange={handleFileUpload}
            />
          </div>

          <div className="processing-card">
            <div className="processing-icon">⚙</div>

            <div>
              <h3>Автоматическая обработка</h3>
              <p>
                Система извлекает сущности, связи и параметры, нормализует
                данные и обновляет карту знаний.
              </p>

              <div className="upload-actions">
                <button
                  className="primary"
                  onClick={handleProcess}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Обрабатываем..." : "▷ Запустить обработку"}
                </button>

                <button className="secondary" onClick={handleClearUpload}>
                  Очистить
                </button>
              </div>

              {exportData && (
                <div className="export-actions-inline">
                  <button className="small-outline-button" onClick={handleCopyJson}>
                    {isCopied ? "Скопировано" : "Скопировать JSON"}
                  </button>

                  <button className="small-outline-button" onClick={handleExportJson}>
                    Скачать JSON
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {fileName && (
          <div className="selected-file">
            <b>Выбран файл:</b> {fileName}
          </div>
        )}

        {errorMessage && <div className="error-banner">{errorMessage}</div>}
      </section>

      <section className="stat-strip">
        {uploadStats.map((stat) => (
          <article key={stat.label}>
            <div className="stat-strip-icon">{stat.icon}</div>
            <span>{stat.label}</span>
            <b>{stat.value}</b>
          </article>
        ))}
      </section>

      <section className="upload-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>Обработанные файлы</h2>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Файл</th>
                  <th>Тип</th>
                  <th>Год</th>
                  <th>География</th>
                  <th>Статус</th>
                  <th>Найдено</th>
                </tr>
              </thead>

              <tbody>
                {processedFiles.map((file) => (
                  <tr key={file.id}>
                    <td>
                      <b>{file.name}</b>
                      <span>{file.size}</span>
                    </td>
                    <td>{file.type}</td>
                    <td>{file.year}</td>
                    <td>{file.geography}</td>
                    <td>
                      <span className="status-success">✓ {file.status}</span>
                      <small>{file.uploadedAt}</small>
                    </td>
                    <td>
                      <span className="mini-metrics">
                        ⬡ {file.entities} · ↗ {file.relations}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Результат обработки</h2>
          </div>

          <div className="check-list">
            {[
              "Документы загружены и распознаны",
              "Извлечены сущности и параметры",
              "Построены связи между сущностями",
              "Данные нормализованы и обогащены",
              "Карта знаний обновлена",
            ].map((item) => (
              <div key={item}>
                <span>✓</span>
                <p>{item}</p>
              </div>
            ))}
          </div>

          <button className="link-button" onClick={() => setActivePage("graph")}>
            Перейти к карте знаний →
          </button>
        </article>
      </section>
    </>
  );

  const renderGraph = () => (
    <>
      <section className="page-heading">
        <h1>Карта знаний</h1>
        <p>
          Интерактивная визуализация сущностей и связей, полученных после
          обработки документов.
        </p>
      </section>

      <section className="graph-layout">
        <article className="panel graph-main">
          <div className="panel-header">
            <div>
              <h2>Связанный граф</h2>
              <p>Перетаскивайте узлы и исследуйте отношения между сущностями.</p>
            </div>
          </div>

          <div className="legend">
            {entityTypes
              .filter((type) => type !== "Все")
              .map((type) => (
                <span key={type}>{type}</span>
              ))}
          </div>

          <div className="graph-box">
            <ForceGraph2D
              graphData={currentGraph}
              width={760}
              height={520}
              nodeLabel={(node) => {
                const graphNode = node as GraphNode;
                return `${graphNode.label} — ${graphNode.group}`;
              }}
              linkLabel={(link) => {
                const graphLink = link as GraphLink;
                return graphLink.label;
              }}
              nodeCanvasObject={(node, ctx, globalScale) => {
                const graphNode = node as GraphNode;
                const label = graphNode.label;
                const fontSize = 14 / globalScale;
                const x = graphNode.x ?? 0;
                const y = graphNode.y ?? 0;

                ctx.font = `${fontSize}px Arial`;
                ctx.fillStyle = "#07998f";
                ctx.beginPath();
                ctx.arc(x, y, 8, 0, 2 * Math.PI);
                ctx.fill();

                ctx.fillStyle = "#071b4d";
                ctx.fillText(label, x + 12, y + 4);
              }}
            />
          </div>
        </article>

        <article className="panel entity-panel">
          <div className="panel-header">
            <h2>Сущности</h2>
          </div>

          <div className="filter-row">
            {entityTypes.map((type) => (
              <button
                key={type}
                className={entityFilter === type ? "chip active" : "chip"}
                onClick={() => setEntityFilter(type)}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="entity-list">
            {filteredEntities.map((entity) => (
              <div className="entity-item" key={entity.id}>
                <span>{entity.type}</span>
                <b>{entity.title}</b>
                <p>{entity.description}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );

  const renderSearch = () => {
    const query = searchQuery.trim().toLowerCase();

    const navigationItems: NavigatorItem[] = [
      ...processedFiles.map((file) => ({
        type: "Документ",
        title: file.name,
        description: `${file.type} • ${file.year} • ${file.geography} • ${file.entities} сущностей`,
        target: "upload" as Page,
        badge: file.status,
      })),

      ...currentEntities.map((entity) => ({
        type: entity.type,
        title: entity.title,
        description: entity.description,
        target: "graph" as Page,
        badge: entity.source || "Карта знаний",
        filter: entity.type,
      })),

      ...(analysisResult?.tags || []).map((tag) => ({
        type: "Тег",
        title: tag,
        description: "Тематический тег, связанный с обработанными документами.",
        target: "analytics" as Page,
        badge: "Таксономия",
      })),

      ...analyticsCoverage.map((item) => ({
        type: "Направление",
        title: item.title,
        description: `Покрытие направления в базе знаний: ${item.value}%.`,
        target: "analytics" as Page,
        badge: `${item.value}% покрытия`,
      })),
    ];

    const filteredItems = query
      ? navigationItems.filter((item) => {
          const searchableText =
            `${item.type} ${item.title} ${item.description} ${item.badge}`.toLowerCase();

          return searchableText.includes(query);
        })
      : navigationItems;

    const openNavigationItem = (item: NavigatorItem) => {
      if (item.filter) {
        setEntityFilter(item.filter);
      }

      setActivePage(item.target);
    };

    return (
      <>
        <section className="page-heading">
          <h1>Навигатор по базе знаний</h1>
          <p>
            Быстрый поиск по документам, сущностям, тегам и направлениям
            исследований.
          </p>
        </section>

        <section className="search-panel navigator-panel">
          <h2>Найти объект в базе знаний</h2>

          <div className="search-input-row">
            <span>⌕</span>

            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Например: титан, эксперимент, прочность, гидрометаллургия..."
            />

            {searchQuery && <button onClick={() => setSearchQuery("")}>×</button>}
          </div>

          <div className="navigator-chips">
            {[
              "Документ",
              "Материал",
              "Эксперимент",
              "Свойство",
              "Тег",
              "Направление",
            ].map((item) => (
              <button key={item} onClick={() => setSearchQuery(item)}>
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="navigator-layout">
          <article className="panel">
            <div className="panel-header">
              <div>
                <h2>Результаты навигации</h2>
                <p>Найдено объектов: {filteredItems.length}</p>
              </div>
            </div>

            <div className="navigator-list">
              {filteredItems.map((item) => (
                <button
                  className="navigator-item"
                  key={`${item.type}-${item.title}`}
                  onClick={() => openNavigationItem(item)}
                >
                  <div>
                    <span>{item.type}</span>
                    <b>{item.title}</b>
                    <p>{item.description}</p>
                  </div>

                  <em>{item.badge}</em>
                </button>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="navigator-empty">
                Ничего не найдено. Попробуйте другой запрос.
              </div>
            )}
          </article>

          <article className="panel">
            <div className="panel-header">
              <h2>Быстрые переходы</h2>
            </div>

            <div className="quick-nav-grid">
              <button onClick={() => setActivePage("upload")}>
                <span>⇧</span>
                <b>Загрузка данных</b>
                <p>Файлы, обработка и результаты импорта</p>
              </button>

              <button onClick={() => setActivePage("graph")}>
                <span>✣</span>
                <b>Карта знаний</b>
                <p>Граф сущностей и связей</p>
              </button>

              <button onClick={() => setActivePage("analytics")}>
                <span>▥</span>
                <b>Аналитика</b>
                <p>Покрытие, риски и активность</p>
              </button>

              <button onClick={() => setSearchQuery("Тег")}>
                <span>#</span>
                <b>Теги</b>
                <p>Темы и классификация документов</p>
              </button>
            </div>
          </article>
        </section>
      </>
    );
  };

  const renderAnalytics = () => (
    <>
      <section className="page-heading">
        <h1>Аналитика базы знаний</h1>
        <p>Покрытие, риски и активность по направлениям исследований.</p>
      </section>

      <section className="kpi-grid">
        {[
          { label: "Направления", value: 4, icon: "⬡" },
          { label: "Источники", value: 128, icon: "▤" },
          { label: "Активные команды", value: 9, icon: "♙" },
          { label: "Темы риска", value: 3, icon: "!" },
        ].map((stat) => (
          <article className="kpi-card" key={stat.label}>
            <div className="kpi-icon warning-icon">{stat.icon}</div>

            <div>
              <span>{stat.label}</span>
              <b>{stat.value}</b>
            </div>
          </article>
        ))}
      </section>

      <section className="analytics-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>Покрытие по направлениям</h2>
          </div>

          <div className="coverage-list">
            {analyticsCoverage.map((item) => (
              <div key={item.title}>
                <div className="coverage-head">
                  <span>{item.title}</span>
                  <b>{item.value}%</b>
                </div>

                <div className="progress">
                  <div style={{ width: `${item.value}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Зоны риска</h2>
          </div>

          <div className="risk-list">
            {riskZones.map((risk) => (
              <div key={risk}>
                <span>!</span>
                <p>{risk}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Активность команд</h2>
          </div>

          <div className="team-list">
            {teamActivity.map((team) => (
              <div key={team.team}>
                <span>{team.team}</span>

                <div>
                  <div style={{ width: `${team.value * 2}%` }}></div>
                </div>

                <b>{team.value}</b>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Сравнение практик</h2>
          </div>

          <div className="comparison-table">
            {[
              ["Покрытие тем", "56%", "74%", "-18 п.п."],
              ["Средний год источников", "2016", "2021", "-5 лет"],
              ["Доля экспериментальных данных", "38%", "62%", "-24 п.п."],
              ["Открытый доступ", "27%", "54%", "-27 п.п."],
            ].map((row) => (
              <div key={row[0]}>
                <span>{row[0]}</span>
                <b>{row[1]}</b>
                <b>{row[2]}</b>
                <em>{row[3]}</em>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );

  return (
    <div
      className={
        isSidebarCollapsed ? "app-shell sidebar-collapsed" : "app-shell"
      }
    >
      <aside className="sidebar">
        <div className="brand">
          <img src="/yarn-ball.png" alt="Научный клубок" />
          <b>Научный клубок</b>
        </div>

        <nav>
          {pages.map((page) => (
            <button
              key={page.key}
              className={activePage === page.key ? "active" : ""}
              onClick={() => setActivePage(page.key)}
            >
              <span>{page.icon}</span>
              {page.label}
            </button>
          ))}
        </nav>

        <button
          className="collapse-button"
          onClick={() => setIsSidebarCollapsed((prev) => !prev)}
        >
          {isSidebarCollapsed ? "›" : "‹ Свернуть"}
        </button>
      </aside>

      <main className="main-area">
        {renderTopbar()}

        {activePage === "home" && renderHome()}
        {activePage === "upload" && renderUpload()}
        {activePage === "graph" && renderGraph()}
        {activePage === "search" && renderSearch()}
        {activePage === "analytics" && renderAnalytics()}
      </main>
    </div>
  );
}

export default App;