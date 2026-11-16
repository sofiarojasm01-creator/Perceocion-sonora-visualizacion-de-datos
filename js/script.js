/**
 * PAISAJE SONORO DEL BARRIO PUERTO — VALPARAÍSO
 * Ondas Fluidas de Filamentos Generativos (Seda / Guilloché / Moiré)
 * Paleta Oficial:
 * - Tránsito: Morado (#8B5CF6)
 * - Personas: Amarillo Mostaza (#D97706)
 * - Maquinarias: Rosado (#EC4899)
 * - Naturaleza: Cian (#06B6D4)
 * - Decibeles: Naranja Acústico (#F97316)
 * Ondas fluidas orgánicas interpoladas con núcleos y comparación vertical
 */

document.addEventListener("DOMContentLoaded", () => {
  let PROJECT_DATA = null;

  const state = {
    currentMinute: 580, // 09:40 hrs
    isPlaying: false,
    showFullJourney: false,
    playbackTimer: null,
    activeCategories: {
      transito: true,
      personas: true,
      maquinarias: true,
      naturaleza: true
    },
    hoveredNode: null,
    mouseX: null,
    mouseY: null,
    animPhase: 0
  };

  const TIME_MIN = 580;  // 09:40 hrs
  const TIME_MAX = 1130; // 18:50 hrs

  // Porcentajes reales del Instrumento Participativo (N=32)
  const PERCENTAGES_INSTRUMENTO = {
    "Alta": { pct: 46.9, agrado: 58.4, label: "Alta (Gran Calibre, 95 mm)" },
    "Media": { pct: 31.3, agrado: 62.8, label: "Media (Calibre Medio, 70 mm)" },
    "Baja": { pct: 21.9, agrado: 68.1, label: "Baja (Fondo Acústico, 28 mm)" }
  };

  // Elementos del DOM
  const canvas = document.getElementById("watercolor-canvas");
  const ctx = canvas.getContext("2d");
  const timeSlider = document.getElementById("time-slider");
  const currentTimeText = document.getElementById("current-time-text");
  const btnPlayPause = document.getElementById("btn-play-pause");
  const btnToggleJourney = document.getElementById("btn-toggle-journey");
  const playIcon = document.getElementById("play-icon");
  const pauseIcon = document.getElementById("pause-icon");
  const btnToggleSound = document.getElementById("btn-toggle-sound");

  // =========================================================================
  // MOTOR DE AUDIO PROCEDURAL DEL PAISAJE SONORO (Web Audio API)
  // Genera en vivo las texturas sonoras reales de Barrio Puerto:
  // - Tránsito: Motores diésel, aceleraciones, rodado de micros sobre adoquines
  // - Personas: Murmullo de multitud, resonancias de formantes vocales, cantores
  // - Maquinarias: Motores diésel de lanchas en Muelle Prat, grúas portuarias
  // - Naturaleza: Oleaje del mar Pacífico, viento y brisa marina
  // =========================================================================
  const soundEngine = {
    ctx: null,
    isInitialized: false,
    isMasterMuted: false,
    masterGain: null,
    categoryGains: {
      transito: null,
      personas: null,
      maquinarias: null,
      naturaleza: null
    },
    sources: [],

    init() {
      if (this.isInitialized) return;
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.38, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.setupTransito();
        this.setupPersonas();
        this.setupMaquinarias();
        this.setupNaturaleza();

        this.isInitialized = true;
      } catch (err) {
        console.warn("AudioContext no disponible o bloqueado", err);
      }
    },

    resume() {
      if (!this.isInitialized) {
        this.init();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    },

    createNoiseBuffer(type = "pink", duration = 4) {
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      if (type === "pink") {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }
      } else if (type === "brown") {
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5;
        }
      } else {
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
      }
      return buffer;
    },

    setupTransito() {
      const catGain = this.ctx.createGain();
      catGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      catGain.connect(this.masterGain);
      this.categoryGains.transito = catGain;

      // 1. Rodado grave continuo de micros y camiones
      const brownBuf = this.createNoiseBuffer("brown", 5);
      const brownSrc = this.ctx.createBufferSource();
      brownSrc.buffer = brownBuf;
      brownSrc.loop = true;

      const lpFilter = this.ctx.createBiquadFilter();
      lpFilter.type = "lowpass";
      lpFilter.frequency.setValueAtTime(140, this.ctx.currentTime);

      const rumbleGain = this.ctx.createGain();
      rumbleGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

      brownSrc.connect(lpFilter);
      lpFilter.connect(rumbleGain);
      rumbleGain.connect(catGain);
      brownSrc.start(0);
      this.sources.push(brownSrc);

      // 2. Fricción de neumáticos sobre pavimento y adoquines
      const pinkBuf = this.createNoiseBuffer("pink", 4);
      const pinkSrc = this.ctx.createBufferSource();
      pinkSrc.buffer = pinkBuf;
      pinkSrc.loop = true;

      const bpFilter = this.ctx.createBiquadFilter();
      bpFilter.type = "bandpass";
      bpFilter.frequency.setValueAtTime(360, this.ctx.currentTime);
      bpFilter.Q.setValueAtTime(1.4, this.ctx.currentTime);

      const frictionGain = this.ctx.createGain();
      frictionGain.gain.setValueAtTime(0.4, this.ctx.currentTime);

      pinkSrc.connect(bpFilter);
      bpFilter.connect(frictionGain);
      frictionGain.connect(catGain);
      pinkSrc.start(0);
      this.sources.push(pinkSrc);

      // 3. Motor diésel grave de microbus porteño
      const osc = this.ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(54, this.ctx.currentTime);

      const engineFilter = this.ctx.createBiquadFilter();
      engineFilter.type = "lowpass";
      engineFilter.frequency.setValueAtTime(110, this.ctx.currentTime);

      const engineGain = this.ctx.createGain();
      engineGain.gain.setValueAtTime(0.28, this.ctx.currentTime);

      osc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(catGain);
      osc.start(0);
      this.sources.push(osc);
    },

    setupPersonas() {
      const catGain = this.ctx.createGain();
      catGain.gain.setValueAtTime(0.22, this.ctx.currentTime);
      catGain.connect(this.masterGain);
      this.categoryGains.personas = catGain;

      // Murmullo de multitud generado por ruido rosa a través de 3 formantes vocales humanos
      const pinkBuf = this.createNoiseBuffer("pink", 5);
      const pinkSrc = this.ctx.createBufferSource();
      pinkSrc.buffer = pinkBuf;
      pinkSrc.loop = true;

      // Formante 1 (F1 ~ 480Hz)
      const f1 = this.ctx.createBiquadFilter();
      f1.type = "bandpass";
      f1.frequency.setValueAtTime(480, this.ctx.currentTime);
      f1.Q.setValueAtTime(4.5, this.ctx.currentTime);

      // Formante 2 (F2 ~ 1250Hz)
      const f2 = this.ctx.createBiquadFilter();
      f2.type = "bandpass";
      f2.frequency.setValueAtTime(1250, this.ctx.currentTime);
      f2.Q.setValueAtTime(5.0, this.ctx.currentTime);

      // Formante 3 (F3 ~ 2300Hz)
      const f3 = this.ctx.createBiquadFilter();
      f3.type = "bandpass";
      f3.frequency.setValueAtTime(2300, this.ctx.currentTime);
      f3.Q.setValueAtTime(4.0, this.ctx.currentTime);

      const murmurGain = this.ctx.createGain();
      murmurGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

      pinkSrc.connect(f1);
      pinkSrc.connect(f2);
      pinkSrc.connect(f3);
      f1.connect(murmurGain);
      f2.connect(murmurGain);
      f3.connect(murmurGain);

      // LFO lento para simular la cadencia conversacional de la gente
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.45, this.ctx.currentTime);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      lfo.connect(lfoGain.gain);

      murmurGain.connect(catGain);
      pinkSrc.start(0);
      lfo.start(0);
      this.sources.push(pinkSrc, lfo);
    },

    setupMaquinarias() {
      const catGain = this.ctx.createGain();
      catGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      catGain.connect(this.masterGain);
      this.categoryGains.maquinarias = catGain;

      // 1. Motor diésel naval de lanchas de paseo en Muelle Prat (Chug rítmico)
      const boatOsc = this.ctx.createOscillator();
      boatOsc.type = "triangle";
      boatOsc.frequency.setValueAtTime(36, this.ctx.currentTime);

      const boatFilter = this.ctx.createBiquadFilter();
      boatFilter.type = "lowpass";
      boatFilter.frequency.setValueAtTime(160, this.ctx.currentTime);

      const pulseLfo = this.ctx.createOscillator();
      pulseLfo.type = "square";
      pulseLfo.frequency.setValueAtTime(3.4, this.ctx.currentTime); // 3.4 pulsos/segundo

      const pulseGain = this.ctx.createGain();
      pulseGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      pulseLfo.connect(pulseGain.gain);

      boatOsc.connect(boatFilter);
      boatFilter.connect(pulseGain);
      pulseGain.connect(catGain);
      boatOsc.start(0);
      pulseLfo.start(0);
      this.sources.push(boatOsc, pulseLfo);

      // 2. Resonancia metálica de grúas portuarias y cables navales
      const noiseBuf = this.createNoiseBuffer("pink", 4);
      const noiseSrc = this.ctx.createBufferSource();
      noiseSrc.buffer = noiseBuf;
      noiseSrc.loop = true;

      const metalFilter = this.ctx.createBiquadFilter();
      metalFilter.type = "bandpass";
      metalFilter.frequency.setValueAtTime(780, this.ctx.currentTime);
      metalFilter.Q.setValueAtTime(7.0, this.ctx.currentTime);

      const metalGain = this.ctx.createGain();
      metalGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

      noiseSrc.connect(metalFilter);
      metalFilter.connect(metalGain);
      metalGain.connect(catGain);
      noiseSrc.start(0);
      this.sources.push(noiseSrc);
    },

    setupNaturaleza() {
      const catGain = this.ctx.createGain();
      catGain.gain.setValueAtTime(0.24, this.ctx.currentTime);
      catGain.connect(this.masterGain);
      this.categoryGains.naturaleza = catGain;

      // Oleaje continuo del mar Pacífico y brisa marina
      const pinkBuf = this.createNoiseBuffer("pink", 6);
      const pinkSrc = this.ctx.createBufferSource();
      pinkSrc.buffer = pinkBuf;
      pinkSrc.loop = true;

      // Filtro que barre suavemente simulando el ir y venir de las olas
      const waveFilter = this.ctx.createBiquadFilter();
      waveFilter.type = "lowpass";
      waveFilter.frequency.setValueAtTime(350, this.ctx.currentTime);

      // LFO para el vaivén del oleaje (ciclo de 5.8 segundos)
      const waveLfo = this.ctx.createOscillator();
      waveLfo.frequency.setValueAtTime(1 / 5.8, this.ctx.currentTime);

      const waveLfoGain = this.ctx.createGain();
      waveLfoGain.gain.setValueAtTime(260, this.ctx.currentTime);
      waveLfo.connect(waveLfoGain);
      waveLfoGain.connect(waveFilter.frequency);

      const surfGain = this.ctx.createGain();
      surfGain.gain.setValueAtTime(0.65, this.ctx.currentTime);

      pinkSrc.connect(waveFilter);
      waveFilter.connect(surfGain);
      surfGain.connect(catGain);

      // Brisa marina en altas frecuencias
      const breezeFilter = this.ctx.createBiquadFilter();
      breezeFilter.type = "highpass";
      breezeFilter.frequency.setValueAtTime(2800, this.ctx.currentTime);
      const breezeGain = this.ctx.createGain();
      breezeGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

      pinkSrc.connect(breezeFilter);
      breezeFilter.connect(breezeGain);
      breezeGain.connect(catGain);

      pinkSrc.start(0);
      waveLfo.start(0);
      this.sources.push(pinkSrc, waveLfo);
    },

    updateVolumes(currentMinute, activeCategories, recordsByCategory) {
      if (!this.isInitialized || !this.ctx) return;
      const now = this.ctx.currentTime;

      const categories = ["transito", "personas", "maquinarias", "naturaleza"];
      categories.forEach(cat => {
        const gainNode = this.categoryGains[cat];
        if (!gainNode) return;

        if (!activeCategories[cat] || this.isMasterMuted) {
          gainNode.gain.setTargetAtTime(0.0001, now, 0.15);
          return;
        }

        const recs = (recordsByCategory && recordsByCategory[cat]) || [];
        let maxCalibre = 0;
        let count = 0;

        for (const r of recs) {
          const diff = Math.abs(currentMinute - r.minute);
          if (diff <= 35) {
            if (r.calibre > maxCalibre) maxCalibre = r.calibre;
            count++;
          }
        }

        let targetVol = 0.16;
        if (cat === "transito") {
          targetVol = maxCalibre === 95 ? 0.55 : (maxCalibre === 70 ? 0.35 : 0.18);
        } else if (cat === "personas") {
          targetVol = maxCalibre === 95 ? 0.48 : (maxCalibre === 70 ? 0.32 : 0.16);
        } else if (cat === "maquinarias") {
          targetVol = maxCalibre === 95 ? 0.50 : (maxCalibre === 70 ? 0.28 : 0.12);
        } else if (cat === "naturaleza") {
          targetVol = 0.26;
        }

        gainNode.gain.setTargetAtTime(targetVol, now, 0.2);
      });
    },

    toggleMasterMute() {
      if (!this.isInitialized) {
        this.init();
      }
      this.isMasterMuted = !this.isMasterMuted;
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(this.isMasterMuted ? 0.0001 : 0.38, now, 0.15);
      return !this.isMasterMuted;
    }
  };

  // Tooltip
  const tooltip = document.getElementById("node-tooltip");
  const tooltipIdBadge = document.getElementById("tooltip-id-badge");
  const tooltipTime = document.getElementById("tooltip-time");
  const tooltipSector = document.getElementById("tooltip-sector");
  const tooltipCatDot = document.getElementById("tooltip-cat-dot");
  const tooltipCatName = document.getElementById("tooltip-cat-name");
  const tooltipSecondaryTag = document.getElementById("tooltip-secondary-tag");
  const tooltipFuenteName = document.getElementById("tooltip-fuente-name");
  const tooltipIntensityLevel = document.getElementById("tooltip-intensity-level");
  const tooltipPercentageText = document.getElementById("tooltip-percentage-text");
  const tooltipQuote = document.getElementById("tooltip-quote");
  const tooltipFlujoVal = document.getElementById("tooltip-flujo-val");
  const tooltipInstrumentoVal = document.getElementById("tooltip-instrumento-val");
  const tooltipDbRange = document.getElementById("tooltip-db-range");
  const tooltipDbVal = document.getElementById("tooltip-db-val");

  // Carga de Datos
  async function loadData() {
    try {
      const res = await fetch("assets/data/datos_paisaje_sonoro.json");
      if (res.ok) {
        PROJECT_DATA = await res.json();
      } else {
        throw new Error("Local fallback");
      }
    } catch (e) {
      PROJECT_DATA = window.EMBEDDED_DATASET;
    }
    initApp();
  }

  function initApp() {
    setupCanvas();
    setupSlider();
    setupEvents();
    renderLoop();
  }

  // =========================================================================
  // SETUP CANVAS & RESPONSIVE
  // =========================================================================
  function setupCanvas() {
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }
    window.addEventListener("resize", resize);
    resize();
  }

  function setupSlider() {
    timeSlider.value = state.currentMinute;
    currentTimeText.textContent = formatMinute(state.currentMinute);

    timeSlider.addEventListener("input", (e) => {
      soundEngine.resume();
      state.showFullJourney = false;
      btnToggleJourney.classList.remove("active");
      btnToggleJourney.textContent = "Ver todo el recorrido";

      const val = parseInt(e.target.value, 10);
      state.currentMinute = val;
      currentTimeText.textContent = formatMinute(val);
      updateMomentChips(val);
    });

    document.querySelectorAll(".moment-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        soundEngine.resume();
        state.showFullJourney = false;
        btnToggleJourney.classList.remove("active");
        btnToggleJourney.textContent = "Ver todo el recorrido";

        const val = timeToMinutes(chip.dataset.timeTarget);
        timeSlider.value = val;
        state.currentMinute = val;
        currentTimeText.textContent = formatMinute(val);
        updateMomentChips(val);
      });
    });

    document.querySelectorAll(".tick-mark").forEach(tick => {
      tick.addEventListener("click", () => {
        soundEngine.resume();
        state.showFullJourney = false;
        btnToggleJourney.classList.remove("active");
        btnToggleJourney.textContent = "Ver todo el recorrido";

        const val = parseInt(tick.dataset.val, 10);
        timeSlider.value = val;
        state.currentMinute = val;
        currentTimeText.textContent = formatMinute(val);
        updateMomentChips(val);
      });
    });
  }

  function setupEvents() {
    btnPlayPause.addEventListener("click", () => {
      soundEngine.resume();
      togglePlayPause();
    });

    btnToggleJourney.addEventListener("click", () => {
      soundEngine.resume();
      state.showFullJourney = !state.showFullJourney;
      if (state.showFullJourney) {
        btnToggleJourney.classList.add("active");
        btnToggleJourney.textContent = "Modo progresivo (Armar onda)";
        if (state.isPlaying) togglePlayPause();
        state.currentMinute = TIME_MAX;
        timeSlider.value = TIME_MAX;
        currentTimeText.textContent = "Recorrido Completo (Día)";
      } else {
        btnToggleJourney.classList.remove("active");
        btnToggleJourney.textContent = "Ver todo el recorrido";
        state.currentMinute = TIME_MIN;
        timeSlider.value = TIME_MIN;
        currentTimeText.textContent = formatMinute(state.currentMinute);
      }
    });

    // Filtros de categorías y silenciadores individuales
    document.querySelectorAll(".cat-legend-item").forEach(item => {
      item.addEventListener("click", () => {
        soundEngine.resume();
        const cat = item.dataset.category;
        state.activeCategories[cat] = !state.activeCategories[cat];
        item.classList.toggle("inactive", !state.activeCategories[cat]);

        const iconEl = item.querySelector(".cat-sound-icon");
        if (iconEl) {
          iconEl.textContent = state.activeCategories[cat] ? "🔊" : "🔇";
        }
      });
    });

    // Botón Master de Sonido
    if (btnToggleSound) {
      btnToggleSound.addEventListener("click", () => {
        soundEngine.resume();
        const isActive = soundEngine.toggleMasterMute();
        btnToggleSound.classList.toggle("muted", !isActive);
        btnToggleSound.textContent = isActive ? "🔊 Sonido ambiental" : "🔇 Sonido silenciado";
      });
    }

    canvas.addEventListener("click", () => {
      soundEngine.resume();
    });

    canvas.addEventListener("mousemove", handleCanvasMouseMove);
    canvas.addEventListener("mouseleave", handleCanvasMouseLeave);
  }

  function updateMomentChips(min) {
    document.querySelectorAll(".moment-chip").forEach(chip => {
      const chipMin = timeToMinutes(chip.dataset.timeTarget);
      chip.classList.toggle("active", Math.abs(min - chipMin) < 45);
    });
  }

  function togglePlayPause() {
    state.isPlaying = !state.isPlaying;
    if (state.isPlaying) {
      state.showFullJourney = false;
      btnToggleJourney.classList.remove("active");
      btnToggleJourney.textContent = "Ver todo el recorrido";

      playIcon.style.display = "none";
      pauseIcon.style.display = "block";
      state.playbackTimer = setInterval(() => {
        if (state.currentMinute >= TIME_MAX) {
          state.currentMinute = TIME_MIN;
        } else {
          state.currentMinute += 2;
        }
        timeSlider.value = state.currentMinute;
        currentTimeText.textContent = formatMinute(state.currentMinute);
        updateMomentChips(state.currentMinute);
      }, 70);
    } else {
      playIcon.style.display = "block";
      pauseIcon.style.display = "none";
      if (state.playbackTimer) clearInterval(state.playbackTimer);
    }
  }

  // =========================================================================
  // HOVER SOBRE NODOS
  // =========================================================================
  const renderedNodes = [];

  function handleCanvasMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    state.mouseX = mx;
    state.mouseY = my;

    let hit = null;
    for (const node of renderedNodes) {
      const dist = Math.hypot(mx - node.x, my - node.y);
      if (dist <= node.radius + 12) {
        hit = node;
        break;
      }
    }

    state.hoveredNode = hit;

    if (hit) {
      showNodeTooltip(hit, e.clientX, e.clientY);
    } else {
      tooltip.classList.remove("visible");
    }
  }

  function handleCanvasMouseLeave() {
    state.hoveredNode = null;
    tooltip.classList.remove("visible");
  }

  function showNodeTooltip(node, clientX, clientY) {
    const item = node.data;
    const isEnc = node.isEncuesta;

    // Identificador oficial de la tabla
    if (isEnc) {
      tooltipIdBadge.textContent = item.codigo ? `Encuesta ${item.codigo}` : "Encuesta";
      tooltipIdBadge.style.background = "#0F172A";
    } else {
      tooltipIdBadge.textContent = item.ficha ? `Ficha ${item.ficha}` : "Ficha de Campo";
      tooltipIdBadge.style.background = "#1E293B";
    }

    tooltipTime.textContent = `${item.hora} hrs`;
    tooltipSector.textContent = item.sector || "Barrio Puerto";

    // Categoría
    const cat = isEnc ? item.categoria_asignada : item.categoria;
    const color = getCategoryColor(cat);
    tooltipCatDot.style.backgroundColor = color;
    tooltipCatName.textContent = getCategoryName(cat);

    if (!isEnc && item.categoria_secundaria && item.categoria_secundaria !== "ninguna" && item.categoria_secundaria !== cat) {
      tooltipSecondaryTag.style.display = "inline-block";
      tooltipSecondaryTag.textContent = `+ ${getCategoryName(item.categoria_secundaria)}`;
    } else {
      tooltipSecondaryTag.style.display = "none";
    }

    // Fuente sonora registrada en las tablas
    const fuente = isEnc ? (item.fuente_dominante || "Sonido ambiental") : (item.fuente_predominante || "Sonido ambiental");
    tooltipFuenteName.textContent = fuente;

    // Calibre e intensidad del instrumento participativo
    const levelKey = node.intensityLevel;
    const info = PERCENTAGES_INSTRUMENTO[levelKey] || PERCENTAGES_INSTRUMENTO["Media"];
    tooltipIntensityLevel.textContent = info.label;
    tooltipPercentageText.textContent = `${info.pct}% de participantes registraron este nivel (Confort prom: ${info.agrado}%)`;

    // Cita textual ciudadana o fenómeno observado
    if (isEnc && item.cita) {
      tooltipQuote.textContent = `«${item.cita}»`;
      tooltipQuote.style.borderLeftColor = color;
      tooltipQuote.style.display = "block";
    } else if (item.fenomeno) {
      tooltipQuote.textContent = `«${item.fenomeno}»`;
      tooltipQuote.style.borderLeftColor = color;
      tooltipQuote.style.display = "block";
    } else if (item.razon) {
      tooltipQuote.textContent = `«${item.razon}»`;
      tooltipQuote.style.borderLeftColor = color;
      tooltipQuote.style.display = "block";
    } else {
      tooltipQuote.style.display = "none";
    }

    // Datos de la tabla: Flujo y Sonómetro
    if (isEnc) {
      const agrado = item.sensacion_agrado ? `Sensación: ${item.sensacion_agrado}` : "Confort evaluado";
      const enc = item.encuestador ? `Encuestador: ${item.encuestador}` : "Entrevista en terreno";
      tooltipFlujoVal.textContent = agrado;
      tooltipInstrumentoVal.textContent = enc;
    } else {
      const flPeat = item.flujo_peatonal ? `Peat: ${item.flujo_peatonal}` : "";
      const flVeh = item.flujo_vehicular ? `Veh: ${item.flujo_vehicular}` : "";
      tooltipFlujoVal.textContent = (flPeat && flVeh) ? `${flPeat} • ${flVeh}` : "Flujo registrado";
      tooltipInstrumentoVal.textContent = item.instrumento || "Decibel Meter";
    }

    // Decibeles medidos y rango
    if (isEnc) {
      const db = item.db_medido || 65.0;
      tooltipDbVal.textContent = `${db.toFixed(1)} dB`;
      tooltipDbRange.textContent = "Nivel continuo medido";
    } else {
      const db = item.db_prom || 60.0;
      tooltipDbVal.textContent = `${db.toFixed(1)} dB`;
      const min = item.db_min || (db - 6).toFixed(1);
      const max = item.db_max || (db + 8).toFixed(1);
      tooltipDbRange.textContent = `Rango: [Mín: ${min} dB — Máx: ${max} dB]`;
    }

    // Posicionamiento inteligente
    const stage = document.getElementById("stage-container");
    const stageRect = stage ? stage.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    let xOffset = node.x + 22;
    if (xOffset + 360 > stageRect.width) {
      xOffset = node.x - 365;
    }

    let yOffset = node.y - 110;
    if (yOffset < 15) yOffset = 15;
    if (yOffset + 350 > stageRect.height) yOffset = stageRect.height - 360;

    tooltip.style.left = `${Math.max(15, xOffset)}px`;
    tooltip.style.top = `${Math.max(15, yOffset)}px`;
    tooltip.classList.add("visible");
  }

  // =========================================================================
  // RENDER LOOP DE ONDAS FLUIDAS GENERATIVAS
  // =========================================================================
  function renderLoop() {
    state.animPhase += 0.018; // Flujo orgánico continuo
    renderFluidSoundwaves();
    requestAnimationFrame(renderLoop);
  }

  function renderFluidSoundwaves() {
    if (!PROJECT_DATA) return;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);
    renderedNodes.length = 0;

    const midY = h * 0.50;
    const padX = 75;
    const usableW = w - padX * 2;

    function minToX(m) {
      const norm = Math.max(0, Math.min(1, (m - TIME_MIN) / (TIME_MAX - TIME_MIN)));
      return padX + norm * usableW;
    }

    const currentCursorX = minToX(state.currentMinute);
    // Límite temporal progresivo: las ondas se van armando a medida que avanza el slider
    const revealMinute = state.showFullJourney ? TIME_MAX : Math.max(TIME_MIN + 25, state.currentMinute);

    // 1. Línea Base Central Sutil
    drawCenterBaseline(ctx, w, midY, padX, minToX);

    // Clasificar registros por categoría
    const categoriesList = ["transito", "personas", "maquinarias", "naturaleza"];
    const categoryRecords = {
      transito: [],
      personas: [],
      maquinarias: [],
      naturaleza: []
    };

    PROJECT_DATA.fichas_campo.forEach(f => {
      const m = timeToMinutes(f.hora);
      if (categoryRecords[f.categoria]) {
        categoryRecords[f.categoria].push({
          minute: m,
          data: f,
          isEncuesta: false,
          category: f.categoria,
          db: f.db_prom,
          calibre: f.calibre_percibido_mm
        });
      }
    });

    PROJECT_DATA.encuestas_percepcion.forEach(enc => {
      const m = timeToMinutes(enc.hora);
      if (categoryRecords[enc.categoria_asignada]) {
        categoryRecords[enc.categoria_asignada].push({
          minute: m,
          data: enc,
          isEncuesta: true,
          category: enc.categoria_asignada,
          db: enc.db_medido || 65.0,
          calibre: enc.calibre_percibido_mm
        });
      }
    });

    categoriesList.forEach(c => {
      categoryRecords[c].sort((a, b) => a.minute - b.minute);
    });

    // 2. DIBUJAR ONDA INFERIOR FLUIDA DE DECIBELES MEDIDOS (Abajo)
    // Se arma progresivamente a través del movimiento temporal
    drawDecibelFluidWave(ctx, midY, padX, usableW, state.animPhase, revealMinute);

    // 3. DIBUJAR UNA ONDA FLUIDA POR CADA TIPO DE SONIDO (Parte Superior)
    // Se arman progresivamente según avanza el slider, envolviendo sus nodos
    categoriesList.forEach((catKey, catIndex) => {
      if (!state.activeCategories[catKey]) return;
      const records = categoryRecords[catKey];
      if (records.length === 0) return;

      drawFluidSilkWave(ctx, catKey, records, midY, padX, usableW, state.animPhase, catIndex, revealMinute);
    });

    // 4. CABEZAL TEMPORAL DEL SLIDER (Conecta verticalmente Percepción y Decibeles)
    drawWeavingCursor(ctx, currentCursorX, midY, h);

    // 5. MODULAR AUDIO PROCEDURAL DEL PAISAJE SONORO
    soundEngine.updateVolumes(state.currentMinute, state.activeCategories, categoryRecords);
  }

  // =========================================================================
  // GENERADOR DE ONDAS FLUIDAS CONTINUAS Y NODOS EMBEBIDOS
  // (Las ondas siguen los nodos, suben a sus crestas y se van armando progresivamente)
  // =========================================================================
  function drawFluidSilkWave(ctx, cat, records, midY, padX, usableW, phase, catIdx, revealMinute) {
    const colorHex = getCategoryColor(cat);
    const rgb = hexToRgb(colorHex);

    // Separación vertical de las líneas base según categoría sonora
    // Tránsito fluye arriba (Morado), Personas en la franja media-alta (Amarillo Mostaza)
    const catBaseOffsets = {
      transito: -42,
      personas: -24,
      maquinarias: -14,
      naturaleza: -4
    };
    const baseOffset = catBaseOffsets[cat] || -20;

    // 36 filamentos finos como seda líquida
    const numStrands = 36;
    const numSamples = 160; // Alta densidad de muestreo para máxima fluidez

    // 1. Función unificada de envolvente que calcula la cresta y el grosor del listón
    function getFluidEnvelope(minute) {
      let maxWeight = 0;
      let totalW = 0;
      let accumElev = 0;
      let accumWidth = 0;
      const sigma = 34; // Dispersión orgánica de onda

      for (const r of records) {
        const diff = minute - r.minute;
        const w = Math.exp(-(diff * diff) / (2 * sigma * sigma));
        totalW += w;
        if (w > maxWeight) maxWeight = w;

        // Elevación según percepción registrada (Alta: 155px, Media: 85px, Baja: 38px)
        let elev = 38;
        let bandW = 34;
        if (r.calibre === 95) {
          elev = 155; // Alta = onda grande
          bandW = 76;
        } else if (r.calibre === 70) {
          elev = 85;  // Media = sube un poco
          bandW = 50;
        } else {
          elev = 38;  // Baja = se mantiene cerca del medio
          bandW = 34;
        }

        accumElev += elev * w;
        accumWidth += bandW * w;
      }

      if (totalW < 0.001) {
        return { elevation: 22, width: 24, maxWeight: 0 };
      }

      const avgElev = accumElev / totalW;
      const avgWidth = accumWidth / totalW;

      // Fuera de los momentos observados, la onda descansa suavemente en un curso calmo
      const blend = Math.min(1, maxWeight * 1.6);
      const elevation = avgElev * blend + 22 * (1 - blend);
      const width = Math.max(26, avgWidth * blend + 24 * (1 - blend));

      return { elevation, width, maxWeight };
    }

    // 2. Función unificada para calcular la posición exacta del espinazo central de la onda
    function getSpineAt(normT, minute, strandPhaseOffset = 0) {
      const env = getFluidEnvelope(minute);
      // Ondulación armónica líquida continua
      const harmonicMotion = Math.sin(normT * 12 - phase * 1.1 + catIdx * 1.3 + strandPhaseOffset) * 10 +
                             Math.cos(normT * 24 + strandPhaseOffset * 0.6) * 5;
      const spineY = midY + baseOffset - env.elevation + harmonicMotion;
      return { spineY, env };
    }

    // 3. Dibujar todos los filamentos de seda que componen la onda fluida progresiva
    ctx.save();
    ctx.globalCompositeOperation = "multiply";

    for (let s = 0; s < numStrands; s++) {
      const strandNorm = (s / (numStrands - 1)) - 0.5; // [-0.5 (arriba), +0.5 (abajo)]
      const strandPhase = s * 0.16 + phase * 0.7 + catIdx * 1.2;

      ctx.beginPath();
      let isFirst = true;

      for (let p = 0; p <= numSamples; p++) {
        const tNorm = p / numSamples;
        const minute = TIME_MIN + tNorm * (TIME_MAX - TIME_MIN);
        if (minute > revealMinute) break; // Se arma progresivamente

        const x = padX + tNorm * usableW;
        const { spineY, env } = getSpineAt(tNorm, minute, strandPhase);

        // Cada filamento se ubica dentro del ancho del listón
        const strandY = spineY + (strandNorm * env.width);

        if (isFirst) {
          ctx.moveTo(x, strandY);
          isFirst = false;
        } else {
          ctx.lineTo(x, strandY);
        }
      }

      // Densidad y transparencia rica de acuarela visible
      const alpha = 0.22 + (1 - Math.abs(strandNorm * 2)) * 0.38;
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
      ctx.lineWidth = 1.05;
      ctx.stroke();
    }

    ctx.restore();

    // 4. DIBUJAR LOS NODOS EN LAS CRESTAS
    // Los nodos aparecen a medida que la onda los alcanza cronológicamente
    records.forEach(rec => {
      if (rec.minute > revealMinute) return; // Aparecen de a poco con el avance temporal

      const normT = (rec.minute - TIME_MIN) / (TIME_MAX - TIME_MIN);
      const x = padX + normT * usableW;

      // Calcular el espinazo usando exactamente la misma función de la onda
      const { spineY } = getSpineAt(normT, rec.minute, 0);

      let intensityLevel = "Baja";
      let nodeR = 6;
      if (rec.calibre === 95) {
        intensityLevel = "Alta";
        nodeR = 9.5;
      } else if (rec.calibre === 70) {
        intensityLevel = "Media";
        nodeR = 7.5;
      }

      const isHovered = state.hoveredNode && state.hoveredNode.data === rec.data;
      const isCurrent = Math.abs(rec.minute - state.currentMinute) <= 12;

      renderedNodes.push({
        x,
        y: spineY,
        radius: nodeR,
        data: rec.data,
        isEncuesta: rec.isEncuesta,
        intensityLevel,
        category: cat
      });

      drawFilamentNode(ctx, x, spineY, nodeR, colorHex, isHovered, isCurrent);
    });
  }

  // =========================================================================
  // ONDA INFERIOR DE DECIBELES MEDIDOS (Fluida hacia abajo)
  // =========================================================================
  function drawDecibelFluidWave(ctx, midY, padX, usableW, phase, revealMinute) {
    if (!PROJECT_DATA) return;
    const records = PROJECT_DATA.fichas_campo;

    const numStrands = 32;
    const numSamples = 160;
    const rgb = { r: 249, g: 115, b: 22 }; // Naranja Acústico

    function getFluidDbDepth(minute) {
      let totalW = 0;
      let accumDepth = 0;
      const sigma = 35;

      for (const r of records) {
        const diff = minute - timeToMinutes(r.hora);
        const w = Math.exp(-(diff * diff) / (2 * sigma * sigma));
        totalW += w;

        const db = r.db_prom || 60;
        const clamped = Math.max(48, Math.min(122, db));
        const depth = 28 + ((clamped - 48) / (122 - 48)) * 165;
        accumDepth += depth * w;
      }

      if (totalW < 0.04) return 30;
      return accumDepth / totalW;
    }

    ctx.save();
    ctx.globalCompositeOperation = "multiply";

    for (let s = 0; s < numStrands; s++) {
      const strandNorm = (s / (numStrands - 1)) - 0.5;
      const strandPhase = s * 0.18 + phase * 0.7;

      ctx.beginPath();
      let isFirst = true;

      for (let p = 0; p <= numSamples; p++) {
        const tNorm = p / numSamples;
        const minute = TIME_MIN + tNorm * (TIME_MAX - TIME_MIN);
        if (minute > revealMinute) break; // Se arma progresivamente

        const x = padX + tNorm * usableW;
        const depth = getFluidDbDepth(minute);

        const fluidWave = Math.sin(tNorm * 12 - phase + strandPhase) * 10 +
                          Math.cos(tNorm * 22 + strandPhase * 0.6) * 5;

        const y = midY + depth + (strandNorm * (depth * 0.35)) + fluidWave;

        if (isFirst) {
          ctx.moveTo(x, y);
          isFirst = false;
        } else {
          ctx.lineTo(x, y);
        }
      }

      const alpha = 0.20 + (1 - Math.abs(strandNorm * 2)) * 0.35;
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
      ctx.lineWidth = 1.05;
      ctx.stroke();
    }

    ctx.restore();
  }

  // =========================================================================
  // NODOS DE INTERACCIÓN
  // =========================================================================
  function drawFilamentNode(ctx, x, y, radius, hexColor, isHovered, isCurrent) {
    const rgb = hexToRgb(hexColor);
    const r = isHovered ? radius * 1.4 : (isCurrent ? radius * 1.2 : radius);

    ctx.save();
    ctx.globalCompositeOperation = "source-over";

    // Halo
    ctx.beginPath();
    ctx.arc(x, y, r * 2.1, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isHovered ? 0.35 : 0.15})`;
    ctx.fill();

    // Núcleo
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = hexColor;
    if (isHovered || isCurrent) {
      ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`;
      ctx.shadowBlur = 10;
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    // Anillo de brillo
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Reflejo líquido
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.3, Math.max(1.2, r * 0.28), 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    ctx.restore();
  }

  // =========================================================================
  // LÍNEA BASE CENTRAL Y MARCADORES
  // =========================================================================
  function drawCenterBaseline(ctx, w, midY, padX, minToX) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(padX - 20, midY);
    ctx.lineTo(w - padX + 20, midY);
    ctx.strokeStyle = "rgba(15, 23, 42, 0.18)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const marks = [600, 660, 720, 780, 840, 900, 960, 1020, 1080, 1130];
    marks.forEach(m => {
      const mx = minToX(m);
      ctx.beginPath();
      ctx.moveTo(mx, midY - 3);
      ctx.lineTo(mx, midY + 3);
      ctx.strokeStyle = "rgba(15, 23, 42, 0.25)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawWeavingCursor(ctx, x, midY, h) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, 75);
    ctx.lineTo(x, h - 115);
    ctx.strokeStyle = "rgba(15, 23, 42, 0.25)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, midY, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#0F172A";
    ctx.fill();
    ctx.restore();
  }

  // =========================================================================
  // COLORES Y FORMATO
  // =========================================================================
  function getCategoryColor(cat) {
    switch (cat) {
      case "transito": return "#8B5CF6";    // Morado Tránsito
      case "personas": return "#D97706";    // Amarillo Mostaza Personas
      case "maquinarias": return "#EC4899"; // Rosado Maquinarias
      case "naturaleza": return "#06B6D4";  // Cian Naturaleza
      default: return "#F97316";
    }
  }

  function getCategoryName(cat) {
    switch (cat) {
      case "transito": return "Tránsito";
      case "personas": return "Personas";
      case "maquinarias": return "Maquinarias";
      case "naturaleza": return "Naturaleza";
      default: return "Ambiente General";
    }
  }

  function timeToMinutes(str) {
    if (!str) return 0;
    const [h, m] = str.split(":").map(Number);
    return h * 60 + m;
  }

  function formatMinute(totalMin) {
    const h = Math.floor(totalMin / 60).toString().padStart(2, "0");
    const m = (totalMin % 60).toString().padStart(2, "0");
    return `${h}:${m} hrs`;
  }

  function hexToRgb(hex) {
    if (!hex) return { r: 139, g: 92, b: 246 };
    const clean = hex.replace("#", "");
    const bigint = parseInt(clean, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255
    };
  }

  loadData();
});
