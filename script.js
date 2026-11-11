
"use strict";

const $ = selector => document.querySelector(selector);

const CONFIG = {
    colorAnalysis: 10000,
    colorCooldown: 40000,
    doubleAnalysis: 15000,
    doubleCooldown: 30000
};

const colorEntries = [
    "PLAYER OU EMPATE",
    "BANKER OU EMPATE",
    "PLAYER",
    "BANKER"
];

const state = {
    colors: {
        running: false,
        blockedUntil: 0,
        timer: null
    },
    doubles: {
        running: false,
        blockedUntil: 0,
        timer: null
    },
    sound: false,
    audio: null,
    history: JSON.parse(localStorage.getItem("megaHistory") || "[]"),
    timeResults: {}
};

/* SOM */

function playSound(frequency = 600) {
    if (!state.sound) return;

    try {
        state.audio ||= new AudioContext();

        const oscillator = state.audio.createOscillator();
        const gain = state.audio.createGain();

        oscillator.frequency.value = frequency;
        gain.gain.value = 0.05;

        oscillator.connect(gain);
        gain.connect(state.audio.destination);

        oscillator.start();
        oscillator.stop(state.audio.currentTime + 0.12);
    } catch (error) {
        console.warn("Áudio indisponível.");
    }
}

/* HISTÓRICO */

function saveHistory(type, result) {
    const item = {
        type,
        result,
        date: new Date().toLocaleString("pt-BR")
    };

    state.history.unshift(item);
    state.history = state.history.slice(0, 40);

    localStorage.setItem("megaHistory", JSON.stringify(state.history));

    renderHistory();
}


function renderHistory() {
    const container = $("#historyList");

    if (!state.history.length) {
        container.textContent = "Nenhum registro disponível.";
        return;
    }

    container.innerHTML = state.history.map(item => {
        const result = String(item.result || "").toUpperCase();

        const isGreen = result.includes("GREEN");
        const isRed = result.includes("RED");

        let statusClass = "";

        if (isGreen) {
            statusClass = "history-green";
        } else if (isRed) {
            statusClass = "history-red";
        }

        return `
            <div class="history-item ${statusClass}">
                <div class="history-info">
                    <strong>${escapeHTML(item.type)}</strong>
                    <div class="history-date">
                        ${escapeHTML(item.date)}
                    </div>
                </div>

                <strong class="history-result">
                    ${escapeHTML(item.result)}
                </strong>
            </div>
        `;
    }).join("");
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

/* TEMPORIZADORES INDEPENDENTES */

function runAnalysis(config) {
    const { key, duration, cooldown, button, status, progress, countdown, callback } = config;

    const system = state[key];

    if (system.running || Date.now() < system.blockedUntil) return;

    system.running = true;
    button.disabled = true;

    const started = Date.now();
    const ends = started + duration;

    status.textContent = "Processamento em andamento...";
    progress.style.width = "0%";

    playSound(500);

    clearInterval(system.timer);

    system.timer = setInterval(() => {
        const remaining = Math.max(0, ends - Date.now());
        const percent = Math.min(100, ((duration - remaining) / duration) * 100);

        progress.style.width = percent + "%";
        status.textContent = `Analisando... ${Math.ceil(remaining / 1000)}s`;

        if (remaining <= 0) {
            clearInterval(system.timer);

            callback();

            system.running = false;
            system.blockedUntil = Date.now() + cooldown;

            playSound(850);

            startCooldown({
                system,
                button,
                countdown,
                status,
                progress
            });
        }
    }, 100);
}

function startCooldown({ system, button, countdown, status, progress }) {
    const update = () => {
        const remaining = Math.max(0, system.blockedUntil - Date.now());

        if (remaining <= 0) {
            clearInterval(system.cooldownTimer);
            system.cooldownTimer = null;
            button.disabled = false;
            countdown.textContent = "";
            status.textContent = "Sistema disponível";
            progress.style.width = "0%";
            playSound(700);
            return;
        }

        button.disabled = true;
        countdown.textContent = `NOVAMENTE EM ${Math.ceil(remaining / 1000)} SEGUNDOS`;
    };

    update();

    clearInterval(system.cooldownTimer);
    system.cooldownTimer = setInterval(update, 200);
}

/* ANÁLISE DE CORES */


/* ANÁLISE DE CORES */

$("#colorButton").addEventListener("click", () => {
    runAnalysis({
        key: "colors",
        duration: CONFIG.colorAnalysis,
        cooldown: CONFIG.colorCooldown,
        button: $("#colorButton"),
        status: $("#colorStatus"),
        progress: $("#colorProgress"),
        countdown: $("#colorCountdown"),

        callback: () => {
            const entry = colorEntries[
                Math.floor(Math.random() * colorEntries.length)
            ];

            const percentage = Math.floor(Math.random() * 18) + 80;

            const resultElement = $("#colorResult");

            // ATUALIZAR RESULTADO
            resultElement.textContent = entry;

            // REMOVER CORES ANTERIORES
            resultElement.classList.remove(
                "banker-color",
                "player-color"
            );

            // APLICAR COR CORRESPONDENTE
            if (entry.includes("BANKER")) {
                resultElement.classList.add("banker-color");
            } else if (entry.includes("PLAYER")) {
                resultElement.classList.add("player-color");
            }

            // ATUALIZAR PORCENTAGEM
            $("#colorPercentage").textContent = percentage + "%";

            // REGISTRAR NO HISTÓRICO
            saveHistory("CORES", entry);

            // FINALIZAR
            $("#colorStatus").textContent = "Análise concluída";
        }
    });
});


/* DADOS TRADICIONAIS */

const dicePatterns = {
    1: [0, 0, 0, 0, 1, 0, 0, 0, 0],
    2: [1, 0, 0, 0, 0, 0, 0, 0, 1],
    3: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    4: [1, 0, 1, 0, 0, 0, 1, 0, 1],
    5: [1, 0, 1, 0, 1, 0, 1, 0, 1],
    6: [1, 0, 1, 1, 0, 1, 1, 0, 1]
};

function renderDice() {
    document.querySelectorAll(".die").forEach(die => {
        const number = Number(die.dataset.number);

        die.innerHTML = `
            <div class="dots">
                ${dicePatterns[number].map(value =>
                    `<span class="pip ${value ? "" : "empty"}"></span>`
                ).join("")}
            </div>
        `;
    });
}

/* PORCENTAGENS EXATAS EM 100% */

function generatePercentages() {
    const values = Array.from({ length: 6 }, () =>
        Math.floor(Math.random() * 100) + 1
    );

    const total = values.reduce((sum, value) => sum + value, 0);

    const percentages = values.map(value =>
        Math.round(value / total * 10000) / 100
    );

    const difference = 10000 -
        percentages.reduce((sum, value) => sum + Math.round(value * 100), 0);

    percentages[0] += difference / 100;

    return percentages;
}

/* ANÁLISE DE DUPLOS */

/* ==========================================
   ANÁLISE DE DUPLOS
========================================== */

$("#doubleButton").addEventListener("click", () => {

    runAnalysis({
        key: "doubles",
        duration: CONFIG.doubleAnalysis,
        cooldown: CONFIG.doubleCooldown,
        button: $("#doubleButton"),
        status: $("#doubleStatus"),
        progress: $("#doubleProgress"),
        countdown: $("#doubleCountdown"),

        callback: () => {

            // GERAR PORCENTAGENS
            const percentages = generatePercentages();

            // ORGANIZAR OS SEIS DADOS
            const ranking = percentages
                .map((percentage, index) => ({
                    number: index + 1,
                    percentage
                }))
                .sort((a, b) => b.percentage - a.percentage);

            // REMOVER DESTAQUES ANTERIORES
            document.querySelectorAll(".die").forEach(die => {
                die.classList.remove("selected");
            });

            // DESTACAR OS TRÊS MELHORES DADOS
            ranking.slice(0, 3).forEach(item => {

                const die = document.querySelector(
                    `.die[data-number="${item.number}"]`
                );

                if (die) {
                    die.classList.add("selected");
                }

            });

            // EXIBIR OS TRÊS MELHORES RESULTADOS
            $("#doubleResult").innerHTML = ranking
                .slice(0, 3)
                .map((item, index) => `
                    <div class="ranking-item ${index === 0 ? "best" : ""}">

                        <span>
                            ${index + 1}º LUGAR — DADO ${item.number}
                        </span>

                        <strong>
                            ${item.percentage.toFixed(2)}%
                        </strong>

                    </div>
                `)
                .join("");

            // SALVAR NO HISTÓRICO
            saveHistory(
                "DUPLOS",
                ranking
                    .slice(0, 3)
                    .map(item => item.number)
                    .join(" / ")
            );

            // FINALIZAR ANÁLISE
            $("#doubleStatus").textContent =
                "Distribuição percentual concluída";

        }

    });

});

/* HORÁRIOS FUTUROS */

function updateTimes() {
    const now = new Date();

    $("#clock").textContent = now.toLocaleTimeString("pt-BR");

    const next = new Date(now);
    next.setSeconds(0, 0);

    const remainder = next.getMinutes() % 2;

    if (remainder !== 0 || next <= now) {
        next.setMinutes(next.getMinutes() + (remainder === 0 ? 2 : 1));
    }

    const times = [];

    for (let i = 0; i < 5; i++) {
        const time = new Date(next.getTime() + i * 2 * 60000);
        const key = time.toISOString();

        times.push({
            time,
            key,
            result: state.timeResults[key] || "QUENTE!"
        });
    }

    $("#timeList").innerHTML = times.map((item, index) => {
        const hot = index < 2;

        return `
            <div class="time-item ${hot ? "hot" : ""}">
                <span class="time-rank">${index + 1}º</span>
                <strong>${item.time.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit"
                })}</strong>
                <span>${hot ? "HORÁRIO DESTACADO" : "MONITORAMENTO"}</span>
                <span class="time-status ${
                    item.result === "GREEN" ? "green" :
                    item.result === "RED" ? "red" : "waiting"
                }">${item.result}</span>
            </div>
        `;
    }).join("");
}

/* RESULTADOS DE HORÁRIOS */

function processTimes() {
    const now = Date.now();

    const next = new Date();
    next.setSeconds(0, 0);

    const remainder = next.getMinutes() % 2;

    if (remainder !== 0 || next <= new Date()) {
        next.setMinutes(next.getMinutes() + (remainder === 0 ? 2 : 1));
    }

    for (let i = 0; i < 5; i++) {
        const time = new Date(next.getTime() + i * 2 * 60000);
        const key = time.toISOString();

        if (now >= time.getTime() && !state.timeResults[key]) {
            state.timeResults[key] = "QUENTE";
        }
    }

    updateTimes();
}

/* IFRAME */

$("#toggleGame").addEventListener("click", () => {
    const card = $("#gameCard");
    card.classList.toggle("expanded");

    $("#toggleGame").textContent =
        card.classList.contains("expanded") ? "Recolher" : "Expandir";
});

/* CONFIGURAÇÕES */

function loadSettings() {
    const theme = localStorage.getItem("megaTheme") || "dark";
    const sound = localStorage.getItem("megaSound") === "true";
    const iframe = localStorage.getItem("megaIframe") || "";

    document.body.classList.toggle("light", theme === "light");

    $("#themeToggle").checked = theme === "dark";
    $("#soundToggle").checked = sound;
    $("#iframeUrl").value = iframe;

    state.sound = sound;

    if (iframe) {
        loadIframe(iframe);
    }
}

function loadIframe(url) {
    try {
        const parsed = new URL(url);

        if (!["http:", "https:"].includes(parsed.protocol)) {
            throw new Error("Endereço inválido");
        }

        $("#gameFrame").src = parsed.href;
        $("#gameCard").classList.add("has-frame");
    } catch {
        alert("Informe um endereço HTTP ou HTTPS válido.");
    }
}

$("#saveSettings").addEventListener("click", () => {
    const theme = $("#themeToggle").checked ? "dark" : "light";
    const sound = $("#soundToggle").checked;
    const iframe = $("#iframeUrl").value.trim();

    localStorage.setItem("megaTheme", theme);
    localStorage.setItem("megaSound", sound);
    localStorage.setItem("megaIframe", iframe);

    document.body.classList.toggle("light", theme === "light");

    state.sound = sound;

    if (iframe) {
        loadIframe(iframe);
    }

    playSound(750);
});

$("#settingsButton").addEventListener("click", () => {
    $("#configuracoes").scrollIntoView({ behavior: "smooth" });
});

/* LIMPAR HISTÓRICO */

$("#clearHistory").addEventListener("click", () => {
    if (!confirm("Deseja limpar todo o histórico?")) return;

    state.history = [];

    localStorage.removeItem("megaHistory");

    renderHistory();
});

/* INICIALIZAÇÃO */

renderDice();
renderHistory();
loadSettings();
processTimes();

setInterval(processTimes, 1000);

/* ==========================================
   REGISTRO MANUAL GREEN E RED
========================================== */

function registerManualResult(type, result) {

    const name = type === "CORES"
        ? $("#colorResult").textContent
        : $("#doubleResult").innerText
            .replace(/\s+/g, " ")
            .trim();

    if (
        !name ||
        name === "AGUARDANDO" ||
        name === "Aguardando análise"
    ) {
        alert("Realize uma análise antes de registrar o resultado.");
        return;
    }

    saveHistory(
        type,
        `${result} - ${name}`
    );

    playSound(result === "GREEN" ? 850 : 350);
}

/* BOTÕES DA ANÁLISE DE CORES */

$("#colorGreen").addEventListener("click", () => {
    registerManualResult("CORES", "GREEN");
});

$("#colorRed").addEventListener("click", () => {
    registerManualResult("CORES", "RED");
});

/* BOTÕES DA ANÁLISE DE DUPLOS */

$("#doubleGreen").addEventListener("click", () => {
    registerManualResult("DUPLOS", "GREEN");
});

$("#doubleRed").addEventListener("click", () => {
    registerManualResult("DUPLOS", "RED");
});
