
"use strict";

/* =====================================================
   1. ELEMENTOS E CONFIGURAÇÕES
   ===================================================== */

const $ = (selector) => document.querySelector(selector);

const panel = $("#analyzerPanel");
const analyzeBtn = $("#analyzeBtn");
const buttonText = $("#buttonText");
const progressBox = $("#analysisProgress");
const progressFill = $("#totalProgress");
const progressPercent = $("#progressPercent");
const analysisState = $("#analysisState");
const vaultSection = $("#vaultSection");
const resultChoice = $("#resultChoice");
const feedbackOverlay = $("#feedbackOverlay");

const STEPS = [
    "ESTABELECENDO CONEXÃO E VALIDANDO A INTEGRIDADE DA API",
    "PROCESSANDO O HISTÓRICO DAS 120 RODADAS MAIS RECENTES",
    "EXECUTANDO A DETECÇÃO E A CORRELAÇÃO DE PADRÕES ESTATÍSTICOS",
    "PROCESSAMENTO FINALIZADO COM SUCESSO"
];

const ANALYSIS_DURATION = 20_000;
const COOLDOWN_DURATION = 60_000;
const STEP_DURATION = ANALYSIS_DURATION / STEPS.length;

let analyzing = false;
let nextAnalysisAt = 0;
let analysisFrame = null;
let feedbackTimer = null;
let effectTimer = null;
let cooldownTimer = null;

let greenCount = 0;
let redCount = 0;

let activeStepIndex = -1;
let completedSteps = new Set();
let startTime = 0;

/* =====================================================
   2. SISTEMA DE SOM
   Apenas um som pode tocar por vez.
   ===================================================== */

let audioContext = null;
let currentOscillator = null;

function playTone(frequency = 600, duration = 0.09, volume = 0.035) {
    try {
        audioContext ??= new (
            window.AudioContext || window.webkitAudioContext
        )();

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        // Interrompe o som anterior antes de tocar outro.
        if (currentOscillator) {
            try {
                currentOscillator.stop();
            } catch (_) {
                // O oscilador pode já ter terminado.
            }

            currentOscillator = null;
        }

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        currentOscillator = oscillator;

        oscillator.type = "sine";

        oscillator.frequency.setValueAtTime(
            frequency,
            audioContext.currentTime
        );

        gain.gain.setValueAtTime(
            volume,
            audioContext.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audioContext.currentTime + duration
        );

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.onended = () => {
            if (currentOscillator === oscillator) {
                currentOscillator = null;
            }

            oscillator.disconnect();
            gain.disconnect();
        };

        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
        console.warn("Áudio indisponível:", error);
    }
}

function playCompletionSound() {
    // Um único som ao finalizar, sem sequência de bipes.
    playTone(880, 0.2, 0.04);
}

/* =====================================================
   3. ETAPAS E BARRAS DE PROGRESSO
   ===================================================== */

function resetSteps() {
    document.querySelectorAll(".analysis-step").forEach((step) => {
        step.classList.remove("active", "complete");

        const fill = step.querySelector(".step-fill");
        const percent = step.querySelector(".step-percent");

        if (fill) fill.style.width = "0%";
        if (percent) percent.textContent = "0%";
    });

    progressFill.style.width = "0%";
    progressPercent.textContent = "0%";

    analysisState.textContent = "INICIALIZANDO PROCESSAMENTO";
}

function updateStep(stepIndex, percent) {
    const step = document.querySelector(
        `.analysis-step[data-step="${stepIndex}"]`
    );

    if (!step) return;

    const fill = step.querySelector(".step-fill");
    const label = step.querySelector(".step-percent");

    if (fill) fill.style.width = `${percent}%`;
    if (label) label.textContent = `${percent}%`;
}

function activateStep(stepIndex) {
    const step = document.querySelector(
        `.analysis-step[data-step="${stepIndex}"]`
    );

    if (!step) return;

    // Somente uma etapa fica ativa visualmente.
    document.querySelectorAll(".analysis-step").forEach((item) => {
        item.classList.remove("active");
    });

    step.classList.add("active");
    analysisState.textContent = STEPS[stepIndex];

    // Um som apenas quando uma nova etapa começa.
    playTone(480 + stepIndex * 90, 0.08, 0.025);
}

function completeStep(stepIndex) {
    // Impede concluir ou reproduzir eventos da mesma etapa novamente.
    if (completedSteps.has(stepIndex)) return;

    completedSteps.add(stepIndex);

    const step = document.querySelector(
        `.analysis-step[data-step="${stepIndex}"]`
    );

    if (!step) return;

    step.classList.remove("active");
    step.classList.add("complete");

    const fill = step.querySelector(".step-fill");
    const percent = step.querySelector(".step-percent");

    if (fill) fill.style.width = "100%";
    if (percent) percent.textContent = "100%";

    // Não toca som ao concluir.
    // O som é reproduzido somente ao iniciar cada etapa.
}

/* =====================================================
   4. EXECUÇÃO DA ANÁLISE
   ===================================================== */

function runAnalysis() {
    if (analyzing || Date.now() < nextAnalysisAt) return;

    analyzing = true;
    nextAnalysisAt = Date.now() + COOLDOWN_DURATION;

    // Cancela uma animação anterior, se houver.
    if (analysisFrame !== null) {
        cancelAnimationFrame(analysisFrame);
        analysisFrame = null;
    }

    analyzing = true;
    activeStepIndex = -1;
    completedSteps = new Set();

    analyzeBtn.disabled = true;
    buttonText.textContent = "ANÁLISE EM PROCESSAMENTO";

    progressBox.hidden = false;
    vaultSection.hidden = true;

    resetSteps();

    startTime = performance.now();

    // Inicia apenas a primeira etapa.
    activeStepIndex = 0;
    activateStep(0);

    // Inicia o ciclo de atualização.
    analysisFrame = requestAnimationFrame(tick);
}

function tick(now) {
    if (!analyzing) return;

    const elapsed = Math.min(
        now - startTime,
        ANALYSIS_DURATION
    );

    const overall = Math.min(
        100,
        Math.floor((elapsed / ANALYSIS_DURATION) * 100)
    );

    progressFill.style.width = `${overall}%`;
    progressPercent.textContent = `${overall}%`;

    const currentStep = Math.min(
        STEPS.length - 1,
        Math.floor(elapsed / STEP_DURATION)
    );

    // Atualiza as etapas sem repetir conclusões ou sons.
    STEPS.forEach((_, index) => {
        if (elapsed >= (index + 1) * STEP_DURATION) {
            completeStep(index);
        } else if (index === currentStep) {
            const stepProgress = Math.min(
                100,
                Math.floor(
                    ((elapsed - index * STEP_DURATION) /
                        STEP_DURATION) * 100
                )
            );

            updateStep(index, stepProgress);
        }
    });

    // Ativa uma nova etapa somente quando necessário.
    if (currentStep !== activeStepIndex) {
        activeStepIndex = currentStep;
        activateStep(currentStep);
    }

    if (elapsed < ANALYSIS_DURATION) {
        analysisFrame = requestAnimationFrame(tick);
        return;
    }

    analysisFrame = null;
    finishAnalysis();
}

/* =====================================================
   5. PORCENTAGENS DEMONSTRATIVAS
   Verde: máximo de 3%.
   Soma total: exatamente 100%.
   ===================================================== */

function generateProbabilities() {
    const green = Math.floor(Math.random() * 4);
    const remaining = 100 - green;

    const blue = Math.floor(
        Math.random() * (remaining + 1)
    );

    const red = remaining - blue;

    return { blue, green, red };
}

function updateLiquid(selector, percentage) {
    const item = $(selector);

    if (!item) return;

    const percent = item.querySelector(".vault-percent");
    const liquid = item.querySelector(".liquid");
    const wave = item.querySelector(".liquid-wave");

    if (percent) percent.textContent = `${percentage}%`;
    if (liquid) liquid.style.height = `${percentage}%`;

    if (wave) {
        wave.style.height = `${Math.min(percentage + 8, 100)}%`;
    }
}

function showResult(probabilities) {
    const { blue, green, red } = probabilities;

    updateLiquid("#blueVault", blue);
    updateLiquid("#greenVault", green);
    updateLiquid("#redVault", red);

    $("#bluePercent").textContent = `${blue}%`;
    $("#greenPercent").textContent = `${green}%`;
    $("#redPercent").textContent = `${red}%`;

    $("#sumPercent").textContent =
        `TOTAL: ${blue + green + red}%`;

    const entries = [
        { name: "PLAYER (AZUL)", value: blue, color: "blue" },
        { name: "EMPATE (VERDE)", value: green, color: "green" },
        { name: "BANKER (VERMELHA)", value: red, color: "red" }
    ];

    const winner = entries.reduce((best, entry) =>
        entry.value > best.value ? entry : best
    );

    resultChoice.classList.remove(
        "result-blue",
        "result-green",
        "result-red"
    );

    resultChoice.classList.add(`result-${winner.color}`);

    $("#resultName").textContent = winner.name;
    $("#resultValue").textContent = `${winner.value}%`;

    vaultSection.hidden = false;
}

/* =====================================================
   6. FINALIZAÇÃO
   ===================================================== */

function finishAnalysis() {
    if (!analyzing) return;

    if (analysisFrame !== null) {
        cancelAnimationFrame(analysisFrame);
        analysisFrame = null;
    }

    // Garante que todas as etapas sejam concluídas uma única vez.
    STEPS.forEach((_, index) => {
        completeStep(index);
    });

    progressFill.style.width = "100%";
    progressPercent.textContent = "100%";
    analysisState.textContent = STEPS[3];

    const probabilities = generateProbabilities();
    showResult(probabilities);

    analyzing = false;

    buttonText.textContent = "ANÁLISE CONCLUÍDA";

    // Um único som de conclusão.
    playCompletionSound();

    updateCooldown();
}

function updateCooldown() {
    if (cooldownTimer !== null) {
        clearTimeout(cooldownTimer);
        cooldownTimer = null;
    }

    if (analyzing) return;

    const remaining = nextAnalysisAt - Date.now();

    if (remaining <= 0) {
        analyzeBtn.disabled = false;
        buttonText.textContent = "ANALISAR NOVAMENTE";
        return;
    }

    analyzeBtn.disabled = true;

    const seconds = Math.ceil(remaining / 1000);
    buttonText.textContent = `AGUARDE ${seconds}s`;

    cooldownTimer = window.setTimeout(
        updateCooldown,
        Math.min(1000, remaining)
    );
}

/* =====================================================
   7. REGISTROS GREEN / RED
   ===================================================== */

function showFeedback(type) {
    const isGreen = type === "green";

    clearTimeout(feedbackTimer);
    clearTimeout(effectTimer);

    panel.classList.remove("effect-green", "effect-red");
    feedbackOverlay.classList.remove("red-feedback");

    if (isGreen) {
        greenCount++;
        $("#greenCount").textContent = greenCount;

        panel.classList.add("effect-green");

        $("#feedbackSymbol").textContent = "✓";
        $("#feedbackTitle").textContent = "GREEN!";
        $("#feedbackMessage").textContent =
            "Registro GREEN adicionado.";
    } else {
        redCount++;
        $("#redCount").textContent = redCount;

        panel.classList.add("effect-red");
        feedbackOverlay.classList.add("red-feedback");

        $("#feedbackSymbol").textContent = "×";
        $("#feedbackTitle").textContent = "RED!";
        $("#feedbackMessage").textContent =
            "Registro RED adicionado.";
    }

    feedbackOverlay.classList.add("show");

    // Um único som por clique.
    playTone(isGreen ? 780 : 300, 0.15, 0.035);

    feedbackTimer = window.setTimeout(() => {
        feedbackOverlay.classList.remove("show");
    }, 2000);

    effectTimer = window.setTimeout(() => {
        panel.classList.remove("effect-green", "effect-red");
    }, 2000);
}

/* =====================================================
   8. EVENTOS DOS BOTÕES
   ===================================================== */

analyzeBtn.addEventListener("click", runAnalysis);

$("#greenBtn").addEventListener("click", () => {
    showFeedback("green");
});

$("#redBtn").addEventListener("click", () => {
    showFeedback("red");
});

/* =====================================================
   PLATAFORMA INTEGRADA - IFRAME
   ===================================================== */

const platformUrl = $("#platformUrl");
const platformFrame = $("#platformFrame");
const platformStatus = $("#platformStatus");

$("#loadPlatform").addEventListener("click", () => {
    let url = platformUrl.value.trim();

    if (!url) {
        platformStatus.textContent = "INFORME UM ENDEREÇO VÁLIDO";
        return;
    }

    if (!/^https?:\/\//i.test(url)) {
        url = "https://" + url;
    }

    try {
        const parsedUrl = new URL(url);

        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            throw new Error("Endereço inválido");
        }

        platformFrame.src = parsedUrl.href;

        platformStatus.textContent =
            "CARREGANDO PLATAFORMA: " + parsedUrl.hostname;

    } catch (error) {
        platformStatus.textContent = "URL INVÁLIDA";
    }
});

$("#reloadPlatform").addEventListener("click", () => {
    if (platformFrame.src !== "about:blank") {
        platformFrame.src = platformFrame.src;
        platformStatus.textContent = "ATUALIZANDO PLATAFORMA...";
    }
});

platformFrame.addEventListener("load", () => {
    if (platformFrame.src !== "about:blank") {
        platformStatus.textContent = "CARREGAMENTO DO IFRAME CONCLUÍDO";
    }
});
