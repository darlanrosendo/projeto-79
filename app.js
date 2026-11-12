// ===================== Número 79 Interativo =====================
(function () {
  "use strict";

  // ----- Elementos -----
  const $ = (id) => document.getElementById(id);
  const cena       = $("cena");
  const pronuncia  = $("pronuncia");
  const btnIniciar = $("btnIniciar");
  const btnParar   = $("btnParar");
  const btnRepetir = $("btnRepetir");
  const btnSom     = $("btnSom");
  const txtSom     = $("txtSom");
  const chkAuto    = $("chkAuto");
  const aviso      = $("aviso");

  // ----- Configuração -----
  // Texto por extenso: se a voz lesse "79" diria "seventy-nine".
  const FRASE = "Seven Nine";
  const INTERVALO_MS = 1500;   // pausa entre uma fala e a próxima

  // ----- Estado -----
  let rodando   = false;
  let somLigado = true;
  let timerRepeticao = null;
  let timerSeguranca = null;
  let falaAtual = null;     // referência global: evita que o Chrome descarte a fala e não dispare onend
  let vozIngles = null;
  let avisouSemIngles = false;

  const temVoz = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  const synth  = temVoz ? window.speechSynthesis : null;

  // ----- Aviso rápido na tela -----
  let timerAviso = null;
  function mostrarAviso(texto, ms = 4000) {
    aviso.textContent = texto;
    aviso.hidden = false;
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => { aviso.hidden = true; }, ms);
  }

  // ----- Escolha da voz em inglês (prefere vozes naturais) -----
  const PREFERIDAS = /natural|neural|online|google us english|samantha|aria|jenny|guy|ava|allison|zira/i;

  function escolherVoz() {
    if (!temVoz) return;
    const vozes = synth.getVoices();
    if (!vozes.length) return;
    const norm = (l) => (l || "").replace("_", "-").toLowerCase();
    const us = vozes.filter((v) => norm(v.lang) === "en-us");
    const en = vozes.filter((v) => norm(v.lang).startsWith("en"));
    vozIngles =
      us.find((v) => PREFERIDAS.test(v.name)) ||
      us.find((v) => v.localService) ||
      us[0] ||
      en.find((v) => PREFERIDAS.test(v.name)) ||
      en[0] ||
      null;
  }

  if (temVoz) {
    escolherVoz();
    // Chrome/Android carregam a lista de vozes depois
    if ("onvoiceschanged" in synth) synth.addEventListener("voiceschanged", escolherVoz);
  }

  // ----- Falar "Seven Nine" (sem sobreposição) -----
  function falar() {
    clearTimeout(timerRepeticao);
    clearTimeout(timerSeguranca);
    if (!temVoz || !somLigado) return;

    if (!vozIngles) escolherVoz();
    if (!vozIngles && !avisouSemIngles) {
      avisouSemIngles = true;
      mostrarAviso("Voz em inglês não encontrada neste aparelho — usando a voz padrão.");
    }

    // corta qualquer fala anterior antes de começar outra
    synth.cancel();

    const fala = new SpeechSynthesisUtterance(FRASE);
    fala.lang = "en-US";
    if (vozIngles) fala.voice = vozIngles;
    fala.rate = 0.85;
    fala.pitch = 1.1;
    fala.volume = 1;

    fala.onstart = () => pronuncia.classList.add("falando");
    fala.onend = () => terminou(fala);
    fala.onerror = (e) => {
      // "interrupted"/"canceled" acontecem quando nós mesmos cancelamos: não é erro
      if (e.error === "not-allowed") {
        mostrarAviso("O navegador bloqueou o áudio. Toque em REPETIR VOZ para liberar o som.");
      } else if (e.error && e.error !== "interrupted" && e.error !== "canceled") {
        mostrarAviso("Não foi possível reproduzir a voz (" + e.error + ").");
      }
      terminou(fala);
    };

    falaAtual = fala;
    // pequeno atraso após cancel(): no Chrome, falar logo em seguida às vezes é ignorado
    setTimeout(() => {
      if (falaAtual !== fala || !somLigado) return;
      if (synth.paused) synth.resume();
      synth.speak(fala);
    }, 60);

    // segurança: se o navegador não disparar onend, segue mesmo assim
    timerSeguranca = setTimeout(() => terminou(fala), 4000);
  }

  function terminou(fala) {
    if (fala !== falaAtual) return;  // evento de uma fala antiga
    falaAtual = null;
    clearTimeout(timerSeguranca);
    pronuncia.classList.remove("falando");
    agendarProxima();
  }

  function agendarProxima() {
    clearTimeout(timerRepeticao);
    if (rodando && somLigado && chkAuto.checked) {
      timerRepeticao = setTimeout(falar, INTERVALO_MS);
    }
  }

  function calar() {
    clearTimeout(timerRepeticao);
    clearTimeout(timerSeguranca);
    falaAtual = null;
    if (temVoz) synth.cancel();
    pronuncia.classList.remove("falando");
  }

  // ----- Botões -----
  function iniciar() {
    rodando = true;
    cena.classList.add("ativa");
    btnIniciar.disabled = true;
    btnParar.disabled = false;
    if (!temVoz) mostrarAviso("Este navegador não tem síntese de voz. A animação funciona normalmente.");
    else if (!somLigado) mostrarAviso("O som está desligado.");
    falar();
  }

  function parar() {
    rodando = false;
    calar();
    cena.classList.remove("ativa");
    btnIniciar.disabled = false;
    btnParar.disabled = true;
    btnIniciar.focus({ preventScroll: true });
  }

  function repetirVoz() {
    if (!temVoz) { mostrarAviso("Este navegador não tem síntese de voz."); return; }
    if (!somLigado) { mostrarAviso("Ligue o som para ouvir a voz."); return; }
    falar();
  }

  function alternarSom() {
    somLigado = !somLigado;
    btnSom.setAttribute("aria-checked", String(somLigado));
    txtSom.textContent = somLigado ? "Ligado" : "Desligado";
    if (!somLigado) calar();
    else if (rodando) falar();
  }

  btnIniciar.addEventListener("click", iniciar);
  btnParar.addEventListener("click", parar);
  btnRepetir.addEventListener("click", repetirVoz);
  btnSom.addEventListener("click", alternarSom);
  chkAuto.addEventListener("change", () => {
    if (chkAuto.checked) { if (!falaAtual) agendarProxima(); }
    else clearTimeout(timerRepeticao);
  });

  // Ao sair da aba / bloquear a tela, para a voz para não acumular
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && rodando) calar();
    else if (!document.hidden && rodando) agendarProxima();
  });

  // ----- Verifica se a foto carregou -----
  const teste = new Image();
  teste.onerror = () => mostrarAviso("Foto não encontrada: verifique o arquivo img/casa.jpg.", 8000);
  teste.src = "img/casa.jpg";
})();
