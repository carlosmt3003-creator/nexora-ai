"use strict";

/* ==========================================
   HOMERC FEEDBACK
   SISTEMA DE SIMULAÇÃO LOCAL
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    const $ = (selector) => document.querySelector(selector);

    /* ELEMENTOS */

    const analyzeBtn = $("#analyzeBtn");
    const doublesBtn = $("#doublesBtn");

    const processingPanel = $("#processingPanel");
    const scenarioResult = $("#scenarioResult");
    const diceResult = $("#diceResult");

    const processingTitle = $("#processingTitle");
    const processingMessage = $("#processingMessage");
    const processingProgress = $("#processingProgress");
    const analysisCountdown = $("#analysisCountdown");

    const timerValue = $("#timerValue");
    const timerProgress = $("#timerProgress");
    const timerMessage = $("#timerMessage");

    const toast = $("#toast");

    /* CONFIGURAÇÕES */

    const ANALYSIS_DURATION = 10;
    const COOLDOWN_DURATION = 40;

    let analysisRunning = false;
    let cooldownEnd = 0;

    let analysisInterval = null;
    let cooldownInterval = null;
    let toastTimeout = null;

    /* ==========================================
       NOTIFICAÇÕES
    ========================================== */

    function showToast(message) {
        if (!toast) return;

        toast.textContent = message;
        toast.classList.add("show");

        clearTimeout(toastTimeout);

        toastTimeout = setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }

    /* ==========================================
       RELÓGIO
    ========================================== */

    function updateClock() {
        const now = new Date();

        const clock = $("#clock");
        const date = $("#date");

        if (clock) {
            clock.textContent = now.toLocaleTimeString("pt-BR");
        }

        if (date) {
            date.textContent = now.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric"
            });
        }

        const minuteKey = [
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            now.getHours(),
            now.getMinutes()
        ].join("-");

        if (minuteKey !== updateClock.lastMinute) {
            updateClock.lastMinute = minuteKey;
            updateSchedule(now);
        }
    }

    /* ==========================================
       HORÁRIOS MONITORADOS
       Marcadores de tempo, não previsões.
    ========================================== */

    function updateSchedule(now = new Date()) {
        const tbody = $("#scheduleBody");

        if (!tbody) return;

        tbody.innerHTML = "";

        const base = new Date(now);
        base.setSeconds(0, 0);

        for (let i = 1; i <= 5; i++) {
            const future = new Date(
                base.getTime() + i * 2 * 60 * 1000
            );

            const time = future.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit"
            });

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>0${i}</td>
                <td>${time}</td>
                <td>
                    <span class="schedule-status">
                        ● AGUARDANDO
                    </span>
                </td>
            `;

            tbody.appendChild(row);
        }
    }

    /* ==========================================
       DISTRIBUIÇÃO PERCENTUAL
       Soma exatamente 100%.
    ========================================== */

    function generatePercentages(count, minimum = 0) {
        const values = [];

        for (let i = 0; i < count; i++) {
            values.push(
                Math.floor(Math.random() * 100) + 1
            );
        }

        const total = values.reduce((a, b) => a + b, 0);

        const available = 100 - minimum * count;

        const exact = values.map(value =>
            (value / total) * available
        );

        const percentages = exact.map(value =>
            Math.floor(value) + minimum
        );

        const remainder =
            100 - percentages.reduce((a, b) => a + b, 0);

        const order = exact
            .map((value, index) => ({
                index,
                decimal: value - Math.floor(value)
            }))
            .sort((a, b) => b.decimal - a.decimal);

        for (let i = 0; i < remainder; i++) {
            percentages[order[i].index]++;
        }

        return percentages;
    }

    /* ==========================================
       SIMULAÇÃO DOS DADOS
    ========================================== */

    function generateDiceAnalysis() {
        const grid = $("#diceGrid");
        const rankingText = $("#rankingText");

        if (!grid) {
            showToast("Não foi encontrado o espaço dos dados no HTML.");
            return;
        }

        const values = generatePercentages(6);

        const pipPositions = {
            1: [5],
            2: [1, 9],
            3: [1, 5, 9],
            4: [1, 3, 7, 9],
            5: [1, 3, 5, 7, 9],
            6: [1, 3, 4, 6, 7, 9]
        };

        const dice = values.map((percentage, index) => ({
            number: index + 1,
            percentage
        }));

        dice.sort((a, b) => a.number - b.number);

        const ranking = [...dice].sort(
            (a, b) => b.percentage - a.percentage
        );

        const topThree = ranking.slice(0, 3);

        grid.innerHTML = "";

        dice.forEach(item => {
            const isTop = topThree.some(
                top => top.number === item.number
            );

            const pips = Array.from(
                { length: 9 },
                (_, index) => {
                    const position = index + 1;

                    return `
                        <span class="pip ${
                            pipPositions[item.number].includes(position)
                                ? "active"
                                : ""
                        }"></span>
                    `;
                }
            ).join("");

            const card = document.createElement("div");

            card.className =
                `dice-card ${isTop ? "top-three" : ""}`;

            card.innerHTML = `
                <div class="dice-face">
                    ${pips}
                </div>

                <div class="dice-number">
                    DADO ${item.number}
                </div>

                <span class="dice-percent">
                    ${item.percentage}%
                </span>

                <div class="dice-bar">
                    <div style="width:${item.percentage}%"></div>
                </div>

                ${
                    isTop
                    ? '<span class="top-label">★ TOP 3</span>'
                    : '<span class="top-label" style="visibility:hidden">---</span>'
                }
            `;

            grid.appendChild(card);
        });

        if (rankingText) {
            rankingText.textContent = ranking
                .slice(0, 3)
                .map(item =>
                    `Dado ${item.number}: ${item.percentage}%`
                )
                .join(" · ");
        }
    }

    /* ==========================================
       RESULTADO DEMONSTRATIVO
    ========================================== */

    function generateScenario() {
        const scenarioName = $("#scenarioName");

        if (!scenarioName) {
            showToast("Não foi encontrado o espaço do resultado no HTML.");
            return;
        }

        const scenarios = [
            "PLAYER E TIER",
            "BANKER E TIER",
            "BANKER",
            "PLAYER"
        ];

        const index = Math.floor(
            Math.random() * scenarios.length
        );

        scenarioName.textContent = scenarios[index];
    }

    /* ==========================================
       CONTROLE DOS BOTÕES
    ========================================== */

    function setButtonsState(disabled) {
        if (analyzeBtn) {
            analyzeBtn.disabled = disabled;

            analyzeBtn.innerHTML = disabled
                ? "AGUARDE..."
                : 'ANALISAR CENÁRIO <span>→</span>';
        }

        if (doublesBtn) {
            doublesBtn.disabled = disabled;

            doublesBtn.innerHTML = disabled
                ? "AGUARDE..."
                : 'ANALISAR DUPLOS <span>→</span>';
        }
    }

    /* ==========================================
       INTERVALO DE 40 SEGUNDOS
    ========================================== */

    function startCooldown() {
        cooldownEnd = Date.now() + COOLDOWN_DURATION * 1000;

        setButtonsState(true);

        clearInterval(cooldownInterval);

        function updateCooldown() {
            const remaining = Math.max(
                0,
                Math.ceil((cooldownEnd - Date.now()) / 1000)
            );

            const minutes = String(
                Math.floor(remaining / 60)
            ).padStart(2, "0");

            const seconds = String(
                remaining % 60
            ).padStart(2, "0");

            if (timerValue) {
                timerValue.textContent = `${minutes}:${seconds}`;
            }

            if (timerProgress) {
                const percentage =
                    (remaining / COOLDOWN_DURATION) * 100;

                timerProgress.style.width = `${percentage}%`;
            }

            if (remaining > 0) {
                if (timerMessage) {
                    timerMessage.textContent =
                        "Sistema em período de intervalo.";
                }
            } else {
                clearInterval(cooldownInterval);

                cooldownEnd = 0;

                if (timerValue) {
                    timerValue.textContent = "00:00";
                }

                if (timerProgress) {
                    timerProgress.style.width = "0%";
                }

                if (timerMessage) {
                    timerMessage.textContent =
                        "Sistema disponível para novas simulações.";
                }

                setButtonsState(false);
            }
        }

        updateCooldown();

        cooldownInterval = setInterval(
            updateCooldown,
            250
        );
    }

    /* ==========================================
       PROCESSAMENTO DE 10 SEGUNDOS
    ========================================== */

    function startAnalysis(type) {
        if (analysisRunning || Date.now() < cooldownEnd) {
            showToast("Aguarde a liberação do sistema.");
            return;
        }

        analysisRunning = true;

        if (scenarioResult) {
            scenarioResult.classList.add("hidden");
        }

        if (diceResult) {
            diceResult.classList.add("hidden");
        }

        if (processingPanel) {
            processingPanel.classList.remove("hidden");
        }

        if (processingTitle) {
            processingTitle.textContent =
                type === "scenario"
                    ? "Central de simulação"
                    : "Distribuição matemática";
        }

        const messages = [
    "Estabelecendo conexão com a base de dados...",
    "Processando registros históricos e frequências...",
    "Identificando padrões e recorrências estatísticas...",
    "Executando análise com inteligência artificial integrada...",
    "Consolidando indicadores e finalizando a análise..."
];

        if (processingProgress) {
            processingProgress.style.width = "0%";
        }

        if (analysisCountdown) {
            analysisCountdown.textContent = "10s";
        }

        const startTime = Date.now();

        startCooldown();

        clearInterval(analysisInterval);

        function updateAnalysis() {
            const elapsed =
                (Date.now() - startTime) / 1000;

            const progress = Math.min(
                100,
                (elapsed / ANALYSIS_DURATION) * 100
            );

            const remaining = Math.max(
                0,
                Math.ceil(ANALYSIS_DURATION - elapsed)
            );

            if (processingProgress) {
                processingProgress.style.width =
                    `${progress}%`;
            }

            if (analysisCountdown) {
                analysisCountdown.textContent =
                    `${remaining}s`;
            }

            const messageIndex = Math.min(
                messages.length - 1,
                Math.floor(elapsed / 2.5)
            );

            if (processingMessage) {
                processingMessage.textContent =
                    messages[messageIndex];
            }

            if (elapsed >= ANALYSIS_DURATION) {
                clearInterval(analysisInterval);
                analysisInterval = null;

                finishAnalysis(type);
            }
        }

        updateAnalysis();

        analysisInterval = setInterval(
            updateAnalysis,
            100
        );
    }

    /* ==========================================
       FINALIZAÇÃO
    ========================================== */

    function finishAnalysis(type) {
        analysisRunning = false;

        if (processingPanel) {
            processingPanel.classList.add("hidden");
        }

        if (type === "scenario") {
            generateScenario();

            if (scenarioResult) {
                scenarioResult.classList.remove("hidden");

                scenarioResult.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
            }
        } else {
            generateDiceAnalysis();

            if (diceResult) {
                diceResult.classList.remove("hidden");

                diceResult.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
            }
        }

        showToast("Simulação concluída.");
    }

    /* ==========================================
       EVENTOS DOS BOTÕES
    ========================================== */

    if (analyzeBtn) {
        analyzeBtn.addEventListener("click", () => {
            startAnalysis("scenario");
        });
    } else {
        console.error("Elemento #analyzeBtn não encontrado no HTML.");
    }

    if (doublesBtn) {
        doublesBtn.addEventListener("click", () => {
            startAnalysis("dice");
        });
    } else {
        console.error("Elemento #doublesBtn não encontrado no HTML.");
    }

    /* ==========================================
       PLATAFORMA EXTERNA
    ========================================== */

    const loadPlatform = $("#loadPlatform");

    if (loadPlatform) {
        loadPlatform.addEventListener("click", () => {
            const input = $("#platformUrl");

            if (!input) return;

            const rawUrl = input.value.trim();

            if (!rawUrl) {
                showToast("Informe o endereço da plataforma.");
                input.focus();
                return;
            }

            let url;

            try {
                url = new URL(rawUrl);
            } catch {
                showToast("Informe uma URL válida.");
                input.focus();
                return;
            }

            if (
                !["http:", "https:"].includes(url.protocol) ||
                !url.hostname ||
                url.username ||
                url.password
            ) {
                showToast("Endereço não permitido.");
                return;
            }

            const iframe = $("#platformFrame");
            const iframeAddress = $("#iframeAddress");
            const iframeContainer = $("#iframeContainer");

            if (!iframe || !iframeContainer) {
                showToast("Área da plataforma não encontrada.");
                return;
            }

            iframe.src = url.href;

            if (iframeAddress) {
                iframeAddress.textContent =
                    url.hostname.toUpperCase();
            }

            iframeContainer.classList.remove("hidden");

            iframeContainer.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });
    }

    const closePlatform = $("#closePlatform");

    if (closePlatform) {
        closePlatform.addEventListener("click", () => {
            const iframe = $("#platformFrame");
            const iframeContainer = $("#iframeContainer");
            const input = $("#platformUrl");

            if (iframe) {
                iframe.src = "about:blank";
            }

            if (iframeContainer) {
                iframeContainer.classList.add("hidden");
            }

            if (input) {
                input.value = "";
            }

            showToast("Visualização encerrada.");
        });
    }

    /* ==========================================
       INICIALIZAÇÃO
    ========================================== */

    function initialize() {
        if (processingPanel) {
            processingPanel.classList.add("hidden");
        }

        if (scenarioResult) {
            scenarioResult.classList.add("hidden");
        }

        if (diceResult) {
            diceResult.classList.add("hidden");
        }

        updateClock();

        setInterval(updateClock, 1000);

        updateSchedule();

        if (timerValue) {
            timerValue.textContent = "00:40";
        }

        if (timerProgress) {
            timerProgress.style.width = "100%";
        }

        if (timerMessage) {
            timerMessage.textContent =
                "Sistema disponível para novas simulações.";
        }

        setButtonsState(false);
    }

    initialize();

});
