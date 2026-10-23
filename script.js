
"use strict";

/* =========================================================
   NEXORA AI — CONTROLE PRINCIPAL
   Versão corrigida


========================================================= */


/* 1. CONFIGURAÇÕES */

const CONFIG = Object.freeze({
    TIME_ZONE: "America/Sao_Paulo",
    ANALYSIS_DURATION: 15_000,
    CLICK_COOLDOWN: 24_000,
    REFRESH_INTERVAL: 1_000,
    MAX_URL_LENGTH: 2048,

    GAMES: {
        MEGA_SIC_BAC: "mega-sic-bac",
        FOOTBALL_BLITZ: "football-blitz"
    }
});


/* 2. HORÁRIOS DE FUNCIONAMENTO */

const SESSIONS = [
    {
        id: "morning",
        name: "Manhã",
        start: "09:00",
        end: "09:30"
    },
    {
        id: "afternoon",
        name: "Tarde",
        start: "17:30",
        end: "18:00"
    },
    {
        id: "night",
        name: "Noite",
        start: "23:00",
        end: "00:00"
    }
];


/* 3. ESTRATÉGIAS DO MEGA SIC BAC */

const MEGA_SIC_BAC_STRATEGIES = [
    "Banca ou empate",
    "Jogador ou empate",
    "Jogador",
    "Banca",
    "Duplos de 4-5-6"
];


/* 4. ESTRATÉGIAS DO FOOTBALL BLITZ */

const FOOTBALL_BLITZ_STRATEGIES = [
    "Mandante ou empate",
    "Visitante ou empate",
    "Mandante",
    "Visitante",
    "Visitante +1.5",
    "Mandante +1.5",
    "Visitante +1.5, +3.5",
    "Mandante +1.5, +3.5"
];


/* 5. CONFIGURAÇÃO DOS JOGOS */

const GAME_CONFIG = {
    [CONFIG.GAMES.MEGA_SIC_BAC]: {
        name: "Mega Sic Bac",
        strategies: MEGA_SIC_BAC_STRATEGIES,
        dataSource: null
    },

    [CONFIG.GAMES.FOOTBALL_BLITZ]: {
        name: "Football Blitz Top Card",
        strategies: FOOTBALL_BLITZ_STRATEGIES,
        dataSource: null
    }
};


/* 6. ELEMENTOS HTML */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
    introScreen: $("#introScreen"),
    authScreen: $("#authScreen"),
    appScreen: $("#appScreen"),

    loginForm: $("#loginForm"),
    email: $("#email"),
    password: $("#password"),
    togglePassword: $("#togglePassword"),
    loginButton: $("#loginButton"),
    loginMessage: $("#loginMessage"),
    forgotPassword: $("#forgotPassword"),
         registerForm: $("#registerForm"),
    registerEmail: $("#registerEmail"),
    registerPassword: $("#registerPassword"),
    confirmPassword: $("#confirmPassword"),
    registerButton: $("#registerButton"),
    registerMessage: $("#registerMessage"),
    showRegisterButton: $("#showRegisterButton"),
    showLoginButton: $("#showLoginButton"),
    loginSection: $("#loginSection"),
    registerSection: $("#registerSection"),
    logoutButton: $("#logoutButton"),
    mobileMenuButton: $("#mobileMenuButton"),
    sidebar: $("#sidebar"),

    navItems: $$(".nav-item[data-view]"),

    gameCards: $$(".game-card[data-game]"),
    selectedGameTitle: $("#selectedGameTitle"),
    analysisGameName: $("#analysisGameName"),

    urlForm: $("#urlForm"),
    gameUrl: $("#gameUrl"),
    openUrlButton: $("#openUrlButton"),
    urlMessage: $("#urlMessage"),

    frameAddress: $("#frameAddress"),
    gameFrameWrap: $("#gameFrameWrap"),
    gameFrame: $("#gameFrame"),
    framePlaceholder: $("#framePlaceholder"),
    frameLoading: $("#frameLoading"),
    frameStatus: $("#frameStatus"),
    reloadFrameButton: $("#reloadFrameButton"),
    openExternalButton: $("#openExternalButton"),

    liveHistoryStatus: $("#liveHistoryStatus"),

    analysisPanel: $("#analysisPanel"),
    analysisStatus: $("#analysisStatus"),
    analysisVisual: $("#analysisVisual"),
    analyzeButton: $("#analyzeButton"),
    analysisResult: $("#analysisResult"),
    dataSource: $("#dataSource"),
    lastAnalysis: $("#lastAnalysis"),

    historyStatus: $("#historyStatus"),
    historyEmpty: $("#historyEmpty"),
    historyList: $("#historyList"),
    historyUpdatedAt: $("#historyUpdatedAt")
};


/* 7. ESTADO DA APLICAÇÃO */

const state = {
    selectedGame: CONFIG.GAMES.MEGA_SIC_BAC,

    isAuthenticated: false,
    isAnalyzing: false,

    analysisStartedAt: null,
    analysisEndsAt: null,
    cooldownEndsAt: 0,

    analysisTimer: null,
    cooldownTimer: null,
    sessionTimer: null,

    currentFrameUrl: null,
    frameLoadTimer: null,
    frameLoadWarningTimer: null,
    frameOpenedAt: null,

    activeSession: null,
    nextSession: null,

    lastAnalysisByGame: {
        [CONFIG.GAMES.MEGA_SIC_BAC]: null,
        [CONFIG.GAMES.FOOTBALL_BLITZ]: null
    },

    historyByGame: {
        [CONFIG.GAMES.MEGA_SIC_BAC]: [],
        [CONFIG.GAMES.FOOTBALL_BLITZ]: []
    }
};


/* 8. FUNÇÕES AUXILIARES */

function formatClock(date) {
    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: CONFIG.TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).format(date);
}


function formatTime(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return "—";
    }

    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: CONFIG.TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).format(date);
}


function formatDateTime(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return "—";
    }

    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: CONFIG.TIME_ZONE,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).format(date);
}


function getBrasiliaMinutes(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: CONFIG.TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).formatToParts(date);

    const hour = Number(
        parts.find((part) => part.type === "hour")?.value
    );

    const minute = Number(
        parts.find((part) => part.type === "minute")?.value
    );

    return hour * 60 + minute;
}


function getSessionMinutes(time) {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
}


function getCurrentSession() {
    const nowMinutes = getBrasiliaMinutes();

    return SESSIONS.find((session) => {
        const start = getSessionMinutes(session.start);
        const end = getSessionMinutes(session.end);

        return nowMinutes >= start && nowMinutes < end;
    }) || null;
}


function getNextSession() {
    const nowMinutes = getBrasiliaMinutes();

    return SESSIONS.find((session) => {
        return getSessionMinutes(session.start) > nowMinutes;
    }) || null;
}


function getSelectedGameConfig() {
    return GAME_CONFIG[state.selectedGame] || null;
}


function setMessage(element, message, type = "info") {
    if (!element) return;

    element.textContent = message;
    element.dataset.type = type;
}


function clearMessage(element) {
    if (!element) return;

    element.textContent = "";
    delete element.dataset.type;
}


function setButtonLoading(button, isLoading, normalText, loadingText) {
    if (!button) return;

    button.disabled = isLoading;

    const text = button.querySelector("span");

    if (text) {
        text.textContent = isLoading ? loadingText : normalText;
    }
}


function getRemainingSeconds(timestamp) {
    return Math.max(
        0,
        Math.ceil((timestamp - Date.now()) / 1000)
    );
}


/* 9. INDICADOR VISUAL DO HISTÓRICO */

function updateLiveHistoryStatus(show) {
    const status = elements.liveHistoryStatus;

    if (!status) return;

    status.hidden = !show;

    if (show) {
        status.setAttribute("aria-live", "polite");
    }
}


function resetLiveHistoryStatus() {
    updateLiveHistoryStatus(false);
}


/* 10. INTRODUÇÃO */

function initializeIntro() {
    if (!elements.introScreen) return;

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    const duration = reducedMotion ? 100 : 2800;

    window.setTimeout(() => {
        elements.introScreen?.classList.add("hidden");
    }, duration);
}






/* 11. AUTENTICAÇÃO REAL — SUPABASE */

function getSupabaseClient() {
    const client = window.nexoraSupabase;

    if (!client?.auth) {
        throw new Error(
            "Supabase não inicializado. Confira o supabase-config.js e a ordem dos scripts no HTML."
        );
    }

    return client;
}


async function verifyBrowserTrial() {
    const browserId = getBrowserTrialId();

    const response = await fetch(
        "https://qgtacmzjaomfalfowhtj.supabase.co/functions/v1/bright-endpoint",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_PUBLISHABLE_KEY
            },
            body: JSON.stringify({
                browser_id: browserId
            })
        }
    );

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error("A resposta da verificação de acesso é inválida.");
    }

    if (!response.ok) {
        throw new Error(
            data.error || "Não foi possível verificar o período de teste."
        );
    }

    if (data.allowed !== true) {
        throw new Error(
            "O período de teste gratuito deste navegador terminou."
        );
    }

    return data;
}


function enterApplication() {
    state.isAuthenticated = true;

    elements.authScreen?.classList.add("hidden");
    elements.appScreen?.classList.remove("hidden");

    if (elements.password) {
        elements.password.value = "";
    }

    if (elements.registerPassword) {
        elements.registerPassword.value = "";
    }

    if (elements.confirmPassword) {
        elements.confirmPassword.value = "";
    }

    updateSelectedGame();
    updateSessionStatus();
    updateAnalysisButton();
    updateHistoryView();
    resetLiveHistoryStatus();

    window.scrollTo({
        top: 0,
        behavior: "auto"
    });
}


function showAuthenticationScreen() {
    state.isAuthenticated = false;

    elements.appScreen?.classList.add("hidden");
    elements.authScreen?.classList.remove("hidden");

    window.scrollTo({
        top: 0,
        behavior: "auto"
    });
}


async function initializeLogin() {
    elements.loginForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearMessage(elements.loginMessage);

        const email = elements.email?.value.trim() || "";
        const password = elements.password?.value || "";

        if (!email || !elements.email?.validity.valid) {
            setMessage(
                elements.loginMessage,
                "Digite um endereço de e-mail válido.",
                "error"
            );
            elements.email?.focus();
            return;
        }

        if (!password) {
            setMessage(
                elements.loginMessage,
                "Digite sua senha para continuar.",
                "error"
            );
            elements.password?.focus();
            return;
        }

        setButtonLoading(
            elements.loginButton,
            true,
            "Entrar na plataforma",
            "Verificando acesso..."
        );

        try {
            const supabase = getSupabaseClient();

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                throw new Error(
                    "E-mail ou senha incorretos. Confira seus dados e tente novamente."
                );
            }

            if (!data.session || !data.user) {
                throw new Error(
                    "Não foi possível iniciar sua sessão. Tente novamente."
                );
            }

            try {
                await verifyBrowserTrial();
            } catch (trialError) {
                await supabase.auth.signOut();

                throw trialError;
            }

            enterApplication();

        } catch (error) {
            console.error("NEXORA AI — erro no login:", error);

            setMessage(
                elements.loginMessage,
                error.message || "Não foi possível entrar. Tente novamente.",
                "error"
            );

        } finally {
            setButtonLoading(
                elements.loginButton,
                false,
                "Entrar na plataforma",
                "Verificando acesso..."
            );
        }
    });

    elements.togglePassword?.addEventListener("click", () => {
        if (!elements.password) return;

        const show = elements.password.type === "password";

        elements.password.type = show ? "text" : "password";

        elements.togglePassword.setAttribute(
            "aria-label",
            show ? "Ocultar senha" : "Mostrar senha"
        );
    });

    elements.forgotPassword?.addEventListener("click", async (event) => {
        event.preventDefault();

        clearMessage(elements.loginMessage);

        const email = elements.email?.value.trim() || "";

        if (!email || !elements.email?.validity.valid) {
            setMessage(
                elements.loginMessage,
                "Digite seu e-mail no campo acima para receber o link de recuperação.",
                "info"
            );
            elements.email?.focus();
            return;
        }

        try {
            const supabase = getSupabaseClient();

            const { error } = await supabase.auth.resetPasswordForEmail(
                email,
                {
                    redirectTo: window.location.origin
                }
            );

            if (error) throw error;

            setMessage(
                elements.loginMessage,
                "Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.",
                "success"
            );

        } catch (error) {
            console.error("Erro na recuperação de senha:", error);

            setMessage(
                elements.loginMessage,
                "Não foi possível solicitar a recuperação. Confira a configuração de URLs no Supabase.",
                "error"
            );
        }
    });
}


/* CADASTRO DE CONTA */

function initializeRegistration() {
    elements.registerForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearMessage(elements.registerMessage);

        const email = elements.registerEmail?.value.trim() || "";
        const password = elements.registerPassword?.value || "";
        const confirmation = elements.confirmPassword?.value || "";

        if (!email || !elements.registerEmail?.validity.valid) {
            setMessage(
                elements.registerMessage,
                "Digite um endereço de e-mail válido.",
                "error"
            );
            return;
        }

        if (password.length < 8) {
            setMessage(
                elements.registerMessage,
                "A senha precisa ter pelo menos 8 caracteres.",
                "error"
            );
            return;
        }

        if (password !== confirmation) {
            setMessage(
                elements.registerMessage,
                "As senhas não são iguais.",
                "error"
            );
            elements.confirmPassword?.focus();
            return;
        }

        setButtonLoading(
            elements.registerButton,
            true,
            "Criar conta",
            "Criando conta..."
        );

        try {
            const supabase = getSupabaseClient();

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin
                }
            });

            if (error) throw error;

            if (data.session && data.user) {
                try {
                    await verifyBrowserTrial();
                } catch (trialError) {
                    await supabase.auth.signOut();
                    throw trialError;
                }

                enterApplication();

                return;
            }

            setMessage(
                elements.registerMessage,
                "Cadastro iniciado! Confira sua caixa de entrada e confirme seu e-mail antes de entrar.",
                "success"
            );

        } catch (error) {
            console.error("NEXORA AI — erro no cadastro:", error);

            setMessage(
                elements.registerMessage,
                error.message || "Não foi possível criar sua conta. Tente novamente.",
                "error"
            );

        } finally {
            setButtonLoading(
                elements.registerButton,
                false,
                "Criar conta",
                "Criando conta..."
            );
        }
    });
}


/* RESTAURAR SESSÃO AO RECARREGAR A PÁGINA */

async function restoreAuthenticationSession() {
    try {
        const supabase = getSupabaseClient();

        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (!data.session) {
            showAuthenticationScreen();
            return;
        }

        await verifyBrowserTrial();
        enterApplication();

    } catch (error) {
        console.error("NEXORA AI — erro ao restaurar sessão:", error);

        try {
            const supabase = getSupabaseClient();
            await supabase.auth.signOut();
        } catch (signOutError) {
            console.error("Erro ao encerrar sessão:", signOutError);
        }

        showAuthenticationScreen();

        if (elements.loginMessage) {
            setMessage(
                elements.loginMessage,
                error.message || "Não foi possível validar seu acesso. Entre novamente.",
                "error"
            );
        }
    }
}


/* ENCERRAR SESSÃO */

async function logout() {
    try {
        const supabase = getSupabaseClient();
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error("Erro ao encerrar sessão:", error);
        }
    } catch (error) {
        console.error("Erro no logout:", error);
    }

    state.isAuthenticated = false;

    stopAnalysis();
    stopCooldown();
    clearFrame();

    elements.sidebar?.classList.remove("is-open");
    elements.appScreen?.classList.add("hidden");
    elements.authScreen?.classList.remove("hidden");

    elements.loginForm?.reset();
    elements.registerForm?.reset();

    clearMessage(elements.loginMessage);
    clearMessage(elements.registerMessage);

    window.scrollTo({
        top: 0,
        behavior: "auto"
    });
}


/* 12. NAVEGAÇÃO */

function initializeNavigation() {
    elements.logoutButton?.addEventListener("click", logout);

    elements.mobileMenuButton?.addEventListener("click", () => {
        const isOpen = elements.sidebar?.classList.toggle("is-open");

        elements.mobileMenuButton?.setAttribute(
            "aria-expanded",
            String(Boolean(isOpen))
        );
    });

    elements.navItems.forEach((button) => {
        button.addEventListener("click", () => {
            elements.navItems.forEach((item) => {
                item.classList.toggle("active", item === button);
            });

            const view = button.dataset.view;

            if (view === "dashboard") {
                $("#dashboardView")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }

            if (view === "analysis") {
                elements.analysisPanel?.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }

            elements.sidebar?.classList.remove("is-open");

            elements.mobileMenuButton?.setAttribute(
                "aria-expanded",
                "false"
            );
        });
    });

    document.addEventListener("click", (event) => {
        if (
            !elements.sidebar ||
            !elements.sidebar.classList.contains("is-open")
        ) {
            return;
        }

        const clickedInsideSidebar =
            elements.sidebar.contains(event.target);

        const clickedMenuButton =
            elements.mobileMenuButton?.contains(event.target);

        if (!clickedInsideSidebar && !clickedMenuButton) {
            elements.sidebar.classList.remove("is-open");

            elements.mobileMenuButton?.setAttribute(
                "aria-expanded",
                "false"
            );
        }
    });
}


/* 13. SELETOR DE JOGOS */

function initializeGameSelector() {
    elements.gameCards.forEach((button) => {
        button.addEventListener("click", () => {
            const gameId = button.dataset.game;

            if (!GAME_CONFIG[gameId]) return;
            if (gameId === state.selectedGame) return;

            /*
             * Cancela uma análise em andamento antes de trocar
             * de jogo, evitando atribuir resultado ao jogo errado.
             */
            if (state.isAnalyzing) {
                stopAnalysis();
            }

            state.selectedGame = gameId;

            updateSelectedGame();
            updateAnalysisButton();
            updateHistoryView();

            clearMessage(elements.urlMessage);

            if (elements.gameUrl) {
                elements.gameUrl.value = "";
            }

            clearFrame();

            elements.analysisPanel?.animate(
                [
                    {
                        opacity: 0.65,
                        transform: "translateY(5px)"
                    },
                    {
                        opacity: 1,
                        transform: "translateY(0)"
                    }
                ],
                {
                    duration: 260,
                    easing: "ease-out"
                }
            );
        });
    });
}


function updateSelectedGame() {
    const game = getSelectedGameConfig();

    if (!game) return;

    elements.gameCards.forEach((button) => {
        const isSelected =
            button.dataset.game === state.selectedGame;

        button.classList.toggle("active", isSelected);

        button.setAttribute(
            "aria-pressed",
            String(isSelected)
        );
    });

    if (elements.selectedGameTitle) {
        elements.selectedGameTitle.textContent = game.name;
    }

    if (elements.analysisGameName) {
        elements.analysisGameName.textContent = game.name;
    }

    const previousAnalysis =
        state.lastAnalysisByGame[state.selectedGame];

    if (elements.lastAnalysis) {
        elements.lastAnalysis.textContent = previousAnalysis
            ? formatTime(previousAnalysis.date)
            : "—";
    }

    if (elements.dataSource) {
        elements.dataSource.textContent = game.dataSource
            ? game.dataSource
            : "NEXORA AI";
    }

    renderPreviousAnalysis();
}


function renderPreviousAnalysis() {
    const previous = state.lastAnalysisByGame[state.selectedGame];

    if (!elements.analysisResult) return;

    if (!previous) {
        showDefaultAnalysisResult();
        return;
    }

    if (previous.strategy) {
        renderAnalysisResult(
            "Última estratégia selecionada",
            previous.strategy
        );

        return;
    }

    renderAnalysisResult(
        "Dados insuficientes para análise",
        previous.message,
        "Nenhuma entrada calculada"
    );
}


/* 14. HORÁRIOS DE FUNCIONAMENTO */

function updateSessionStatus() {
    const current = getCurrentSession();
    const next = getNextSession();

    state.activeSession = current;
    state.nextSession = next;

    updateAnalysisButton();

    if (!elements.analysisStatus || state.isAnalyzing) return;

    if (current) {
        elements.analysisStatus.classList.remove("is-running");

        elements.analysisStatus.innerHTML =
            '<span class="status-dot"></span> Sessão ' +
            current.name;

        if (elements.analysisVisual) {
            const title =
                elements.analysisVisual.querySelector("p");

            const subtitle =
                elements.analysisVisual.querySelector("span");

            if (title) {
                title.textContent = "ENGINE STANDBY";
            }

            if (subtitle) {
                subtitle.textContent =
                    `Sessão ${current.name}: ${current.start}–${current.end}`;
            }
        }

        return;
    }

    elements.analysisStatus.classList.remove("is-running");

    elements.analysisStatus.innerHTML =
        '<span class="status-dot"></span> Fora do horário';

    if (elements.analysisVisual) {
        const title =
            elements.analysisVisual.querySelector("p");

        const subtitle =
            elements.analysisVisual.querySelector("span");

        if (title) {
            title.textContent = "ENGINE STANDBY";
        }

        if (subtitle) {
            subtitle.textContent = next
                ? `Próxima sessão: ${next.name}, às ${next.start}`
                : "Próxima sessão: amanhã, às 09:00";
        }
    }
}


function updateAnalysisButton() {
    if (!elements.analyzeButton) return;

    const remaining = getRemainingSeconds(state.cooldownEndsAt);
    const session = getCurrentSession();

    const text = elements.analyzeButton.querySelector("span");

    if (state.isAnalyzing) {
        elements.analyzeButton.disabled = true;

        if (text) {
            text.textContent = "ANALISANDO...";
        }

        return;
    }

    if (remaining > 0) {
        elements.analyzeButton.disabled = true;

        if (text) {
            text.textContent = `AGUARDE ${remaining}s`;
        }

        return;
    }

    if (!session) {
        elements.analyzeButton.disabled = true;

        if (text) {
            text.textContent = "FORA DO HORÁRIO";
        }

        return;
    }

    elements.analyzeButton.disabled = false;

    if (text) {
        text.textContent = "ANALISAR ENTRADA";
    }

    if (Date.now() >= state.cooldownEndsAt) {
        state.cooldownEndsAt = 0;
    }
}

function createSessionCountdown() {
    if (state.sessionCountdownElement) return;

    const countdown = document.createElement("div");
    countdown.id = "sessionCountdown";
    countdown.className = "session-countdown";
    countdown.setAttribute("role", "status");
    countdown.setAttribute("aria-live", "polite");

    const anchor =
        elements.analysisStatus?.parentElement ||
        elements.analysisPanel;

    if (anchor) {
        anchor.append(countdown);
        state.sessionCountdownElement = countdown;
    }
}


function updateSessionCountdown() {
    createSessionCountdown();

    const element = state.sessionCountdownElement;
    if (!element) return;

    const session = getCurrentSession();

    if (!session) {
        element.classList.remove("is-warning");
        element.classList.add("is-closed");
        element.textContent = "Sessão encerrada — análises bloqueadas.";
        return;
    }

    const nowMinutes = getBrasiliaMinutes();
    const currentSeconds = Number(
        new Intl.DateTimeFormat("en-GB", {
            timeZone: CONFIG.TIME_ZONE,
            second: "2-digit",
            hour12: false
        }).format(new Date())
    );

    const endSeconds = getSessionMinutes(session.end) * 60;
    const nowSeconds = nowMinutes * 60 + currentSeconds;
    const remaining = Math.max(0, endSeconds - nowSeconds);

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const countdownText =
        `${String(minutes).padStart(2, "0")}:` +
        `${String(seconds).padStart(2, "0")}`;

    element.classList.remove("is-closed", "is-warning");

    if (remaining <= 60) {
        element.classList.add("is-warning");
        element.textContent =
            `Atenção: faltam ${countdownText} para a sessão terminar.`;

        if (state.sessionWarningId !== session.id) {
            state.sessionWarningId = session.id;

            renderAnalysisResult(
                "Atenção: sessão quase encerrada",
                `Restam ${countdownText}. A análise será bloqueada ao final da sessão.`,
                "Aviso de encerramento"
            );
        }
    } else {
        element.textContent =
            `Sessão ${session.name} termina em ${countdownText}.`;
    }
}



function initializeSessionClock() {
    updateSessionStatus();

    state.sessionTimer = window.setInterval(() => {
        updateSessionStatus();
        updateAnalysisButton();
    }, CONFIG.REFRESH_INTERVAL);
}


/* 15. VALIDAÇÃO DA URL */

function validateGameUrl(rawValue) {
    const value = rawValue.trim();

    if (!value) {
        return {
            valid: false,
            message: "Cole o endereço da plataforma que deseja abrir."
        };
    }

    if (value.length > CONFIG.MAX_URL_LENGTH) {
        return {
            valid: false,
            message: "O endereço informado é muito longo."
        };
    }

    let url;

    try {
        url = new URL(value);
    } catch {
        return {
            valid: false,
            message: "Endereço inválido. Informe uma URL completa com HTTPS."
        };
    }

    if (url.protocol !== "https:") {
        return {
            valid: false,
            message: "Por segurança, utilize um endereço HTTPS."
        };
    }

    if (!url.hostname || !url.hostname.includes(".")) {
        return {
            valid: false,
            message: "O endereço informado não possui um domínio válido."
        };
    }

    if (url.username || url.password) {
        return {
            valid: false,
            message: "URLs com credenciais embutidas não são permitidas."
        };
    }

    if (
        url.hostname === "localhost" ||
        url.hostname.endsWith(".localhost")
    ) {
        return {
            valid: false,
            message: "Esse endereço local não pode ser aberto aqui."
        };
    }

    return {
        valid: true,
        url
    };
}


/* 16. IFRAME E INDICADOR VISUAL */

function initializeFrame() {
    resetLiveHistoryStatus();

    elements.urlForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        openGameUrl();
    });

    elements.reloadFrameButton?.addEventListener("click", () => {
        if (!state.currentFrameUrl || !elements.gameFrame) {
            setMessage(
                elements.urlMessage,
                "Nenhuma plataforma está aberta para recarregar.",
                "error"
            );

            return;
        }

        resetLiveHistoryStatus();

        startFrameLoading();

        elements.gameFrame.src = state.currentFrameUrl;

        setMessage(
            elements.urlMessage,
            "Solicitação de recarga enviada ao navegador.",
            "info"
        );
    });

    elements.openExternalButton?.addEventListener("click", () => {
        if (!state.currentFrameUrl) {
            setMessage(
                elements.urlMessage,
                "Insira e abra um endereço antes de usar esta opção.",
                "error"
            );

            return;
        }

        const openedWindow = window.open(
            state.currentFrameUrl,
            "_blank",
            "noopener,noreferrer"
        );

        if (!openedWindow) {
            setMessage(
                elements.urlMessage,
                "O navegador bloqueou a nova aba. Permita pop-ups para este site.",
                "error"
            );
        }
    });

    elements.gameFrame?.addEventListener("load", () => {
        if (!state.currentFrameUrl) return;

        clearTimeout(state.frameLoadTimer);

        elements.frameLoading?.classList.add("hidden");
        elements.framePlaceholder?.classList.add("hidden");

        if (elements.frameStatus) {
            elements.frameStatus.innerHTML =
                '<span class="status-dot"></span> Documento carregado';
        }

        /*
         * Este indicador sinaliza que o iframe disparou load.
         * Ele não confirma captura de resultados do jogo.
         */
        updateLiveHistoryStatus(true);

        clearTimeout(state.frameLoadWarningTimer);

        state.frameLoadWarningTimer = window.setTimeout(() => {
            if (!state.currentFrameUrl) return;

            setMessage(
                elements.urlMessage,
                
            );
        }, 2500);
    });
}


function openGameUrl() {
    clearMessage(elements.urlMessage);

    const validation = validateGameUrl(
        elements.gameUrl?.value || ""
    );

    if (!validation.valid) {
        setMessage(
            elements.urlMessage,
            validation.message,
            "error"
        );

        elements.gameUrl?.focus();
        return;
    }

    const url = validation.url.href;

    resetLiveHistoryStatus();

    clearTimeout(state.frameLoadTimer);
    clearTimeout(state.frameLoadWarningTimer);

    state.currentFrameUrl = url;
    state.frameOpenedAt = new Date();

    if (elements.frameAddress) {
        elements.frameAddress.textContent =
            validation.url.hostname;

        elements.frameAddress.title = url;
    }

    if (elements.frameStatus) {
        elements.frameStatus.innerHTML =
            '<span class="status-dot"></span> Solicitando carregamento';
    }

    startFrameLoading();

    if (elements.gameFrame) {
        elements.gameFrame.src = url;
    } else {
        setMessage(
            elements.urlMessage,
            "O elemento do iframe não foi encontrado no HTML.",
            "error"
        );

        return;
    }

    setMessage(
        elements.urlMessage,
        "Endereço enviado. Se o site não permitir incorporação, utilize Abrir em nova aba.",
        "info"
    );
}


function startFrameLoading() {
    clearTimeout(state.frameLoadTimer);
    clearTimeout(state.frameLoadWarningTimer);

    resetLiveHistoryStatus();

    elements.frameLoading?.classList.remove("hidden");
    elements.framePlaceholder?.classList.add("hidden");

    if (elements.frameStatus) {
        elements.frameStatus.innerHTML =
            '<span class="status-dot"></span> Carregando...';
    }

    state.frameLoadTimer = window.setTimeout(() => {
        elements.frameLoading?.classList.add("hidden");

        if (state.currentFrameUrl && elements.frameStatus) {
            elements.frameStatus.innerHTML =
                '<span class="status-dot"></span> Carregamento não confirmado';
        }

        if (state.currentFrameUrl) {
            resetLiveHistoryStatus();

            setMessage(
                elements.urlMessage,
                "Não foi possível confirmar o carregamento. O site pode estar lento ou bloquear a incorporação. Tente novamente ou abra em nova aba.",
                "info"
            );
        }
    }, 12_000);
}


function clearFrame() {
    clearTimeout(state.frameLoadTimer);
    clearTimeout(state.frameLoadWarningTimer);

    state.currentFrameUrl = null;
    state.frameOpenedAt = null;

    resetLiveHistoryStatus();

    elements.frameLoading?.classList.add("hidden");
    elements.framePlaceholder?.classList.remove("hidden");

    if (elements.gameFrame) {
        elements.gameFrame.src = "about:blank";
    }

    if (elements.frameAddress) {
        elements.frameAddress.textContent =
            "Nenhuma plataforma aberta";

        elements.frameAddress.removeAttribute("title");
    }

    if (elements.frameStatus) {
        elements.frameStatus.innerHTML =
            '<span class="status-dot"></span> Aguardando conexão';
    }
}


/* 17. CENTRAL DE ANÁLISE */

function initializeAnalysis() {
    elements.analyzeButton?.addEventListener(
        "click",
        startAnalysis
    );
}


function startAnalysis() {
    if (state.isAnalyzing) return;

    if (!state.isAuthenticated) {
        setAnalysisStatus("Faça login para continuar", false);
        return;
    }

    const now = Date.now();

    if (now < state.cooldownEndsAt) {
        updateAnalysisButton();
        return;
    }

    const session = getCurrentSession();

    if (!session) {
        updateSessionStatus();

        setAnalysisStatus(
            "Fora do horário de funcionamento",
            false
        );

        renderAnalysisResult(
            "Análise indisponível",
            "A central funciona das 09:00 às 09:30, das 17:30 às 18:00 e das 23:00 às 23:30, no horário de Brasília.",
            "Fora do horário"
        );

        updateAnalysisButton();
        return;
    }

    const game = getSelectedGameConfig();

    if (!game || !Array.isArray(game.strategies) ||
        game.strategies.length === 0) {
        renderAnalysisResult(
            "Estratégias indisponíveis",
            "Não existem estratégias cadastradas para o jogo selecionado.",
            "Análise não iniciada"
        );

        return;
    }

    /*
     * Guarda o jogo da análise para impedir que uma troca
     * de seleção durante o processamento misture os jogos.
     */
    state.analysisGameId = state.selectedGame;

    state.cooldownEndsAt = now + CONFIG.CLICK_COOLDOWN;

    state.isAnalyzing = true;
    state.analysisStartedAt = now;
    state.analysisEndsAt = now + CONFIG.ANALYSIS_DURATION;

    updateAnalysisButton();

    setAnalysisStatus("Analisando...", true);

    renderAnalysisProgress();

    state.analysisTimer = window.setTimeout(() => {
        finishAnalysis();
    }, CONFIG.ANALYSIS_DURATION);

    stopCooldown();

    state.cooldownTimer = window.setInterval(() => {
        updateAnalysisButton();

        if (Date.now() >= state.cooldownEndsAt) {
            stopCooldown();
            updateAnalysisButton();
        }
    }, 200);
}


function finishAnalysis() {
    if (!state.isAnalyzing) return;

    clearTimeout(state.analysisTimer);

    state.analysisTimer = null;
    state.isAnalyzing = false;
    state.analysisStartedAt = null;
    state.analysisEndsAt = null;

    /*
     * Usa o jogo que iniciou a análise.
     * Assim, a estratégia não será atribuída a outro jogo.
     */
    const gameId = state.analysisGameId || state.selectedGame;
    const game = GAME_CONFIG[gameId];
    const finishedAt = new Date();

    if (!game || !game.strategies.length) {
        setAnalysisStatus("Concluída", false);

        renderAnalysisResult(
            "Estratégias indisponíveis",
            "Não foi encontrada uma estratégia para o jogo analisado.",
            "Nenhuma entrada calculada"
        );

        updateAnalysisButton();
        updateSessionStatus();

        return;
    }

    /*
     * Seleção demonstrativa aleatória.
     * Não é uma análise estatística nem uma previsão real.
     */
    const index = Math.floor(
        Math.random() * game.strategies.length
    );

    const selectedStrategy = game.strategies[index];

    const result = {
        date: finishedAt,
        gameId,
        strategy: selectedStrategy,
        message:
            `Estratégia selecionada: ${selectedStrategy}. ` +
            "",
        status: "demonstration"
    };

    state.lastAnalysisByGame[gameId] = result;

    setAnalysisStatus("Concluída", false);

    /*
     * Atualiza a interface somente se o jogo exibido
     * ainda for aquele que iniciou a análise.
     */
    if (state.selectedGame === gameId) {
        if (elements.analysisVisual) {
            const title =
                elements.analysisVisual.querySelector("p");

            const subtitle =
                elements.analysisVisual.querySelector("span");

            if (title) {
                title.textContent = "ANÁLISE FINALIZADA";
            }

            if (subtitle) {
                subtitle.textContent = "Estratégia selecionada";
            }
        }

        renderAnalysisResult(
            "Estratégia selecionada",
            selectedStrategy
        );

        if (elements.lastAnalysis) {
            elements.lastAnalysis.textContent =
                formatTime(finishedAt);
        }
    }

    updateAnalysisButton();
    updateSessionStatus();
}


function stopAnalysis() {
    clearTimeout(state.analysisTimer);

    state.analysisTimer = null;
    state.isAnalyzing = false;
    state.analysisStartedAt = null;
    state.analysisEndsAt = null;
    state.analysisGameId = null;

    setAnalysisStatus("Aguardando", false);

    updateAnalysisButton();
}


function stopCooldown() {
    if (state.cooldownTimer !== null) {
        clearInterval(state.cooldownTimer);
    }

    state.cooldownTimer = null;
}


function setAnalysisStatus(label, running) {
    if (!elements.analysisStatus) return;

    elements.analysisStatus.classList.toggle(
        "is-running",
        running
    );

    const dot = document.createElement("span");
    dot.className = "status-dot";

    elements.analysisStatus.replaceChildren(
        dot,
        document.createTextNode(` ${label}`)
    );
}


function renderAnalysisProgress() {
    if (elements.analysisVisual) {
        const title =
            elements.analysisVisual.querySelector("p");

        const subtitle =
            elements.analysisVisual.querySelector("span");

        if (title) {
            title.textContent = "ANALISANDO";
        }

        if (subtitle) {
            subtitle.textContent =
                "Preparando a seleção da estratégia...";
        }
    }

    renderAnalysisResult(
        "Análise em andamento",
        "Análise em andamento"
    );
}


function showDefaultAnalysisResult() {
    const game = getSelectedGameConfig();

    const count = game?.strategies?.length || 0;

    
}



function renderAnalysisResult(title, description, status) {
    if (!elements.analysisResult) return;

    const gameId = state.selectedGame;
    const strategy = String(description || "");

    let dotColor = "";
    let resultClass = "";

    if (gameId === CONFIG.GAMES.MEGA_SIC_BAC) {
        if (/jogador/i.test(strategy)) {
            dotColor = "blue";
            resultClass = "result-player";
        } else if (/banca/i.test(strategy)) {
            dotColor = "red";
            resultClass = "result-banker";
        }
    }

    if (gameId === CONFIG.GAMES.FOOTBALL_BLITZ) {
        if (/mandante/i.test(strategy)) {
            dotColor = "yellow";
            resultClass = "result-home";
        } else if (/visitante/i.test(strategy)) {
            dotColor = "blue";
            resultClass = "result-away";
        }
    }

    const heading = document.createElement("h4");
    heading.className = "analysis-result-title";
    heading.textContent = title;

    const strategyBox = document.createElement("div");
    strategyBox.className = `analysis-strategy-highlight ${resultClass}`;

    if (dotColor) {
        const ball = document.createElement("span");
        ball.className = `strategy-ball ball-${dotColor}`;
        ball.setAttribute("aria-hidden", "true");
        strategyBox.append(ball);
    }

    const strategyText = document.createElement("span");
    strategyText.className = "analysis-strategy-text";
    strategyText.textContent = strategy;

    strategyBox.append(strategyText);

    const topline = document.createElement("div");
    topline.className = "result-topline";

    const label = document.createElement("span");
    label.className = "section-label";
    label.textContent = "RESULTADO DA ANÁLISE";

    const icon = document.createElement("span");
    icon.className = "result-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "•";

    topline.append(label, icon);

    const disclaimer = document.createElement("div");
    disclaimer.className = "result-disclaimer";

    const dot = document.createElement("span");
    dot.className = "status-dot";

    const disclaimerText = document.createElement("span");
    disclaimerText.textContent = status;

    disclaimer.append(dot, disclaimerText);

    elements.analysisResult.replaceChildren(
        topline,
        heading,
        strategyBox,
        disclaimer
    );
}


/* 18. HISTÓRICO POR JOGO */

function updateHistoryView() {
    const records =
        state.historyByGame[state.selectedGame] || [];

    if (elements.historyList) {
        elements.historyList.replaceChildren();
    }

    if (!records.length) {
        elements.historyEmpty?.classList.remove("hidden");
        elements.historyList?.classList.add("hidden");

        if (elements.historyStatus) {
            elements.historyStatus.classList.remove("is-loading");

            elements.historyStatus.innerHTML =
                '<span class="status-dot"></span> Aguardando fonte';
        }

        if (elements.historyUpdatedAt) {
            elements.historyUpdatedAt.textContent =
                "Nenhuma atualização";
        }

        return;
    }

    elements.historyEmpty?.classList.add("hidden");
    elements.historyList?.classList.remove("hidden");

    records.forEach((record) => {
        const entry = document.createElement("div");
        entry.className = "history-entry";

        const value = document.createElement("strong");
        value.textContent = String(record.value);

        const time = document.createElement("span");

        time.textContent = record.date instanceof Date
            ? formatDateTime(record.date)
            : "Horário não informado";

        entry.append(value, time);

        elements.historyList?.append(entry);
    });
}


/*
 * Integração futura com uma fonte de dados autorizada.
 * Esta função não consulta uma API nem cria resultados falsos.
 */

function setGameHistory(gameId, records, sourceName) {
    if (!GAME_CONFIG[gameId] || !Array.isArray(records)) {
        throw new TypeError(
            "Jogo ou formato de histórico inválido."
        );
    }

    const validRecords = records.filter((record) => {
        return (
            record &&
            record.value !== undefined &&
            record.value !== null &&
            String(record.value).trim() !== ""
        );
    });

    state.historyByGame[gameId] = validRecords.map((record) => ({
        value: String(record.value),
        date: record.date instanceof Date
            ? record.date
            : null
    }));

    GAME_CONFIG[gameId].dataSource = sourceName || null;

    if (state.selectedGame === gameId) {
        updateHistoryView();

        if (elements.dataSource) {
            elements.dataSource.textContent =
                sourceName || "Não identificada";
        }

        if (elements.historyStatus) {
            elements.historyStatus.innerHTML = validRecords.length
                ? '<span class="status-dot"></span> Dados recebidos'
                : '<span class="status-dot"></span> Sem registros';
        }

        if (elements.historyUpdatedAt) {
            elements.historyUpdatedAt.textContent =
                validRecords.length
                    ? formatDateTime(new Date())
                    : "Nenhuma atualização";
        }
    }
}


/* 19. INICIALIZAÇÃO */

function initializeApplication() {
    initializeIntro();
    initializeLogin();
    initializeRegistration();
    initializeNavigation();
    initializeGameSelector();
    initializeSessionClock();
    initializeFrame();
    initializeAnalysis();

    updateSelectedGame();
    updateHistoryView();
    updateAnalysisButton();

    resetLiveHistoryStatus();

    restoreAuthenticationSession();

    console.info("NEXORA AI inicializada.");
    console.info("Fuso horário:", CONFIG.TIME_ZONE);

    console.info(
        "Duração da análise:",
        CONFIG.ANALYSIS_DURATION / 1000,
        "segundos"
    );

    console.info(
        "Intervalo entre cliques:",
        CONFIG.CLICK_COOLDOWN / 1000,
        "segundos"
    );

    console.info(
        "Estratégias Mega Sic Bac:",
        MEGA_SIC_BAC_STRATEGIES.length,
        MEGA_SIC_BAC_STRATEGIES
    );

    console.info(
        "Estratégias Football Blitz:",
        FOOTBALL_BLITZ_STRATEGIES.length,
        FOOTBALL_BLITZ_STRATEGIES
    );
}


if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeApplication,
        { once: true }
    );
} else {
    initializeApplication();
}

/* TESTE TEMPORÁRIO DA CONEXÃO SUPABASE */



/* NEXORA AI — IDENTIFICADOR DO NAVEGADOR */

function getBrowserTrialId() {
    const storageKey = "nexora_browser_trial_id_v1";

    let browserId = localStorage.getItem(storageKey);

    if (
        !browserId ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(browserId)
    ) {
        browserId = crypto.randomUUID();
        localStorage.setItem(storageKey, browserId);
    }

    return browserId;
}

/* TESTE TEMPORÁRIO DA FUNÇÃO NEXORA AI */

async function testarBrowserTrial() {
    const browserId = getBrowserTrialId();

    try {
        const response = await fetch(
            "https://qgtacmzjaomfalfowhtj.supabase.co/functions/v1/bright-endpoint",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": SUPABASE_PUBLISHABLE_KEY
                },
                body: JSON.stringify({
                    browser_id: browserId
                })
            }
        );

        const data = await response.json();

        console.log("Status HTTP:", response.status);
        console.log("Resposta da função:", data);
    } catch (error) {
        console.error("Erro ao testar a função:", error);
    }
}

testarBrowserTrial();


/* =========================================================
   NEXORA AI — CONTADOR GREEN / RED
   Persistência local por jogo
   Registro manual, sem integração com a análise
========================================================= */

(() => {
    "use strict";

    const STORAGE_KEY = "nexora_green_red_v1";

    const GAME_IDS = [
        "mega-sic-bac",
        "football-blitz"
    ];

    const GAME_NAMES = {
        "mega-sic-bac": "Mega Sic Bac",
        "football-blitz": "Football Blitz Top Card"
    };

    function createDefaultData() {
        return {
            "mega-sic-bac": {
                green: 0,
                red: 0
            },
            "football-blitz": {
                green: 0,
                red: 0
            }
        };
    }

    function normalizeCount(value) {
        const number = Number(value);

        if (!Number.isSafeInteger(number) || number < 0) {
            return 0;
        }

        return number;
    }

    function normalizeData(data) {
        const defaults = createDefaultData();

        if (!data || typeof data !== "object" || Array.isArray(data)) {
            return defaults;
        }

        for (const gameId of GAME_IDS) {
            const gameData = data[gameId];

            if (
                !gameData ||
                typeof gameData !== "object" ||
                Array.isArray(gameData)
            ) {
                continue;
            }

            defaults[gameId] = {
                green: normalizeCount(gameData.green),
                red: normalizeCount(gameData.red)
            };
        }

        return defaults;
    }

    function loadData() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);

            if (!stored) {
                return createDefaultData();
            }

            return normalizeData(JSON.parse(stored));
        } catch (error) {
            console.error(
                "NEXORA AI: não foi possível ler os contadores salvos.",
                error
            );

            return createDefaultData();
        }
    }

    let counters = loadData();

    function getCurrentGameId() {
        const selectedCard = document.querySelector(
            '.game-card.active[data-game]'
        );

        const selectedId =
            selectedCard?.dataset.game ||
            state.selectedGame;

        return GAME_IDS.includes(selectedId)
            ? selectedId
            : "mega-sic-bac";
    }

    function saveData() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(counters)
            );

            return true;
        } catch (error) {
            console.error(
                "NEXORA AI: não foi possível salvar os contadores.",
                error
            );

            return false;
        }
    }

    function renderCounters() {
        const gameId = getCurrentGameId();
        const gameData = counters[gameId];

        const greenElement = document.getElementById("greenCount");
        const redElement = document.getElementById("redCount");
        const gameNameElement = document.getElementById("counterGameName");

        if (greenElement) {
            greenElement.textContent = String(gameData.green);
        }

        if (redElement) {
            redElement.textContent = String(gameData.red);
        }

        if (gameNameElement) {
            gameNameElement.textContent = GAME_NAMES[gameId];
        }

        const counter = document.getElementById("resultsCounter");

        if (counter) {
            counter.dataset.currentGame = gameId;
        }
    }

    function changeCounter(type, operation) {
        const gameId = getCurrentGameId();
        const previousValue = counters[gameId][type];

        let nextValue = previousValue;

        if (operation === "increase") {
            if (previousValue >= Number.MAX_SAFE_INTEGER) {
                return;
            }

            nextValue = previousValue + 1;
        }

        if (operation === "decrease") {
            nextValue = Math.max(0, previousValue - 1);
        }

        if (nextValue === previousValue) {
            renderCounters();
            return;
        }

        counters[gameId][type] = nextValue;

        if (!saveData()) {
            counters[gameId][type] = previousValue;

            renderCounters();

            return;
        }

        renderCounters();
    }

    function initializeCounter() {
        const counter = document.getElementById("resultsCounter");

        if (!counter) {
            console.warn(
                "NEXORA AI: painel GREEN / RED não encontrado no HTML."
            );

            return;
        }

        counter.addEventListener("click", (event) => {
            const button = event.target.closest(
                "button[data-counter-action]"
            );

            if (!button || !counter.contains(button)) {
                return;
            }

            const action = button.dataset.counterAction;

            switch (action) {
                case "green-increase":
                    changeCounter("green", "increase");
                    break;

                case "green-decrease":
                    changeCounter("green", "decrease");
                    break;

                case "red-increase":
                    /*
                     * Registre RED somente depois de confirmar
                     * manualmente que ocorreu 1 gale.
                     */
                    changeCounter("red", "increase");
                    break;

                case "red-decrease":
                    changeCounter("red", "decrease");
                    break;
            }
        });

        /*
         * Atualiza os números quando o usuário troca de jogo.
         * Os valores de cada jogo permanecem independentes.
         */
        document.querySelectorAll(".game-card[data-game]").forEach(
            (button) => {
                button.addEventListener("click", () => {
                    window.requestAnimationFrame(renderCounters);
                });
            }
        );

        renderCounters();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializeCounter,
            { once: true }
        );
    } else {
        initializeCounter();
    }
})();
