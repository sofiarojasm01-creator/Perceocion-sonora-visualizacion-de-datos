/**
 * PAISAJE SONORO DEL BARRIO PUERTO — VALPARAÍSO
 * Ondas Fluidas de Filamentos Generativos (Seda / Guilloché / Moiré)
 * Paleta Oficial:
 * - Tránsito: Morado (#8B5CF6)
 * - Personas: Amarillo Mostaza (#D97706)
 * - Maquinarias: Rosado (#EC4899)
 * - Naturaleza: Cian (#06B6D4)
 * - Decibeles: Rojo Acústico (#DC2626)
 * Ondas fluidas orgánicas interpoladas con núcleos y comparación vertical
 */

document.addEventListener("DOMContentLoaded", () => {
  let PROJECT_DATA = null;

  const state = {
    currentMinute: 580, // 09:40 hrs
    isPlaying: false,
    showFullJourney: true,
    playbackTimer: null,
    activeCategories: {
      transito: true,
      personas: true,
      maquinarias: true,
      naturaleza: true
    },
    hoveredNode: null,
    hoveredDbNode: null,
    mouseX: null,
    mouseY: null,
    animPhase: 0
  };

  const TIME_MIN = 580;  // 09:40 hrs
  const TIME_MAX = 1130; // 18:50 hrs

  // Cantidades reales del Instrumento Participativo según calibre de percepción (N=32 participantes)
  const INTENSIDAD_CANTIDADES = {
    "Alta": { label: "Alta", count: "15", num: 15 },
    "Media": { label: "Media", count: "11", num: 11 },
    "Baja": { label: "Baja", count: "6", num: 6 }
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
  // MOTOR DE AUDIO DEL PAISAJE SONORO (BARRIO PUERTO VALPARAÍSO)
  // Reproduce simultáneamente las grabaciones de campo reales de Barrio Puerto:
  // - Tránsito: "assets/sonidos/video transito.mp3"
  // - Personas: "assets/sonidos/video personas sonido.mp3"
  // - Maquinarias: "assets/sonidos/video maquinarias.mp3"
  // - Naturaleza: "assets/sonidos/video naturaleza.mp3"
  //
  // Todas suenan al mismo tiempo en capas armónicas y suaves, moduladas
  // dinámicamente según la información de los datos y el slider de tiempo.
  // =========================================================================
  const soundEngine = {
    isInitialized: false,
    isMasterMuted: false,
    masterVolume: 0.92, // Nivel global claro y audible para que todos los sonidos se distingan con nitidez
    isPlaying: false,

    tracks: {
      transito: {
        id: "audio-transito",
        src: "assets/sonidos/video transito.mp3",
        audio: null,
        baseWeight: 0.65, // Tránsito: micros, aceleraciones, frenos y rodado sobre adoquín
        currentVol: 0.65,
        targetVol: 0.65
      },
      personas: {
        id: "audio-personas",
        src: "assets/sonidos/video personas sonido.mp3",
        audio: null,
        baseWeight: 0.62, // Personas: bullicio, charlas callejeras, pregones y voces
        currentVol: 0.62,
        targetVol: 0.62
      },
      maquinarias: {
        id: "audio-maquinarias",
        src: "assets/sonidos/video maquinarias.mp3",
        audio: null,
        baseWeight: 0.60, // Maquinarias: motores diésel marinos, grúas y actividad portuaria
        currentVol: 0.60,
        targetVol: 0.60
      },
      naturaleza: {
        id: "audio-naturaleza",
        src: "assets/sonidos/video naturaleza.mp3",
        audio: null,
        baseWeight: 0.58, // Naturaleza: oleaje del Pacífico, gaviotas y brisa marina
        currentVol: 0.58,
        targetVol: 0.58
      }
    },

    init() {
      if (this.isInitialized) return;

      for (const cat in this.tracks) {
        const item = this.tracks[cat];
        let el = document.getElementById(item.id);
        if (!el) {
          el = new Audio(item.src);
          el.id = item.id;
        }
        el.loop = true;
        el.preload = "auto";
        const initVol = Math.max(0, Math.min(1, item.baseWeight * this.masterVolume));
        el.volume = initVol;
        item.currentVol = item.baseWeight;
        item.targetVol = item.baseWeight;
        item.audio = el;

        el.addEventListener("ended", () => {
          el.currentTime = 0;
          el.play().catch(() => {});
        });
      }

      this.isInitialized = true;
    },

    play() {
      if (!this.isInitialized) {
        this.init();
      }
      this.isPlaying = true;

      for (const cat in this.tracks) {
        const item = this.tracks[cat];
        if (item.audio) {
          item.audio.play().catch(() => {});
        }
      }
    },

    pause() {
      this.isPlaying = false;
      for (const cat in this.tracks) {
        const item = this.tracks[cat];
        if (item.audio && !item.audio.paused) {
          item.audio.pause();
        }
      }
    },

    resume() {
      if (state && state.isPlaying) {
        this.play();
      }
    },

    updateVolumes(currentMinute, activeCategories, recordsByCategory) {
      if (!this.isInitialized) {
        this.init();
      }

      const categories = ["transito", "personas", "maquinarias", "naturaleza"];
      const amplitudes = {};
      let anyHighIntensity = false;
      const sigma = 34.0; // Coincide exactamente con la dispersión de las ondas visuales

      // 1. Calcular en tiempo real la altura de onda / intensidad de cada categoría
      categories.forEach(cat => {
        if (!activeCategories[cat] || this.isMasterMuted) {
          amplitudes[cat] = 0;
          return;
        }

        const recs = (recordsByCategory && recordsByCategory[cat]) || [];
        let totalW = 0;
        let accumCrest = 0;
        let maxW = 0;

        for (let i = 0; i < recs.length; i++) {
          const r = recs[i];
          const diff = currentMinute - r.minute;
          const w = Math.exp(-(diff * diff) / (2 * sigma * sigma));
          totalW += w;
          if (w > maxW) maxW = w;

          let crest = 26;
          if (r.calibre === 95) crest = 150;
          else if (r.calibre === 70) crest = 78;
          else crest = 26;

          accumCrest += crest * w;
        }

        if (totalW < 0.0001) {
          amplitudes[cat] = 0;
        } else {
          const blend = Math.min(1, maxW * 1.6);
          const h = (accumCrest / totalW) * blend;
          amplitudes[cat] = h;
          if (h >= 85) { // Onda grande (intensidad alta)
            anyHighIntensity = true;
          }
        }
      });

      // 2. Asignar volumen dinámico estrictamente vinculado al tamaño de la onda:
      // Si la onda disminuye, su volumen disminuye en proporción directa; si la onda cae a cero, el volumen se desvanece a 0.
      // Si la onda es grande (intensidad alta), se escucha MUCHO MÁS por encima de las demás.
      categories.forEach(cat => {
        const item = this.tracks[cat];
        if (!item || !item.audio) return;

        if (!activeCategories[cat] || this.isMasterMuted) {
          item.targetVol = 0.0;
        } else {
          const h = amplitudes[cat] || 0;
          const normH = Math.max(0, Math.min(1, h / 145.0)); // 0 (sin onda) a 1 (máxima onda)

          if (normH <= 0.005) {
            // La onda ha disminuido por completo al eje / calma: el sonido baja a cero
            // (Para naturaleza, una presencia submarina o costera sutilísima si está activa)
            item.targetVol = (cat === "naturaleza") ? 0.08 : 0.0;
          } else if (anyHighIntensity) {
            // Existe al menos una categoría con onda grande dominante (ej. Tránsito alto)
            if (h >= 85) {
              // Esta categoría tiene la onda grande: volumen MÁXIMO protagonista (0.98)
              item.targetVol = 0.98;
            } else {
              // Las otras categorías disminuyen su volumen proporcionalmente al tamaño reducido de su onda
              item.targetVol = Math.max(0.0, normH * 0.32);
            }
          } else {
            // Mezcla general: cada categoría tiene un volumen que sigue fielmente su tamaño de onda.
            // Si la onda disminuye, su sonido baja proporcionalmente.
            item.targetVol = Math.max(0.0, Math.min(1.0, normH * 0.92));
          }
        }

        // Interpolación fluida (fade orgánico entre frames para transiciones suaves)
        const ease = 0.12;
        item.currentVol += (item.targetVol - item.currentVol) * ease;
        const actualVol = Math.max(0, Math.min(1, item.currentVol * this.masterVolume));

        try {
          item.audio.volume = actualVol;
        } catch (e) {}
      });

    },

    toggleMasterMute() {
      if (!this.isInitialized) {
        this.init();
      }
      this.isMasterMuted = !this.isMasterMuted;

      if (!this.isMasterMuted) {
        this.play();
      } else {
        this.pause();
      }
      return !this.isMasterMuted;
    }
  };

  // Tooltip de Percepción (Nodos Superiores)
  const tooltip = document.getElementById("node-tooltip");
  const tooltipTime = document.getElementById("tooltip-time");
  const tooltipSector = document.getElementById("tooltip-sector");
  const tooltipCatDot = document.getElementById("tooltip-cat-dot");
  const tooltipCatName = document.getElementById("tooltip-cat-name");
  const tooltipFuenteName = document.getElementById("tooltip-fuente-name");
  const tooltipIntensityLevel = document.getElementById("tooltip-intensity-level");
  const tooltipQuantityVal = document.getElementById("tooltip-quantity-val");

  // Tooltip de Decibeles (Ondas Inferiores)
  const dbTooltip = document.getElementById("db-tooltip");
  const dbTooltipTime = document.getElementById("db-tooltip-time");
  const dbTooltipSector = document.getElementById("db-tooltip-sector");
  const dbTooltipVal = document.getElementById("db-tooltip-val");
  const dbTooltipRange = document.getElementById("db-tooltip-range");

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
    computeDecibelMetrics();
    initApp();
  }

  function initApp() {
    setupCanvas();
    setupSlider();
    setupEvents();
    soundEngine.init(); // Inicializa pistas, listas para reproducir cuando se presione Play
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

    // Cuando se desliza a la sección de visualización, asegurar redimensionado exacto
    const visApp = document.getElementById("visualization-app");
    if (visApp && "IntersectionObserver" in window) {
      const visObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            resize();
          }
        });
      }, { threshold: 0.1 });
      visObserver.observe(visApp);
    }
    resize();
  }

  function setupSlider() {
    timeSlider.value = state.currentMinute;
    currentTimeText.textContent = formatMinute(state.currentMinute);
    if (btnToggleJourney) {
      btnToggleJourney.classList.add('active');
      btnToggleJourney.textContent = 'Ver avance progresivo';
    }

    timeSlider.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      state.currentMinute = val;
      currentTimeText.textContent = formatMinute(val);
      updateMomentChips(val);
    });

    document.querySelectorAll(".moment-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const val = timeToMinutes(chip.dataset.timeTarget);
        timeSlider.value = val;
        state.currentMinute = val;
        currentTimeText.textContent = formatMinute(val);
        updateMomentChips(val);
      });
    });

    document.querySelectorAll(".tick-mark").forEach(tick => {
      tick.addEventListener("click", () => {
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
      togglePlayPause();
    });

    btnToggleJourney.addEventListener("click", () => {
      state.showFullJourney = !state.showFullJourney;
      if (state.showFullJourney) {
        btnToggleJourney.classList.add("active");
        btnToggleJourney.textContent = "Modo progresivo (Armar onda)";
        if (state.isPlaying) togglePlayPause();
        state.currentMinute = TIME_MAX;
        timeSlider.value = TIME_MAX;
        currentTimeText.textContent = "Recorrido Completo (Día)";
      } else {
      // estado visual de recorrido mantenido
      // texto mantenido
        state.currentMinute = TIME_MIN;
        timeSlider.value = TIME_MIN;
        currentTimeText.textContent = formatMinute(state.currentMinute);
      }
    });

    const activeSpeakerSvg = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
    const mutedSpeakerSvg = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';

    // Filtros de categorías y silenciadores individuales
    document.querySelectorAll(".cat-legend-item").forEach(item => {
      item.addEventListener("click", () => {
        const cat = item.dataset.category;
        state.activeCategories[cat] = !state.activeCategories[cat];
        item.classList.toggle("inactive", !state.activeCategories[cat]);

        const iconEl = item.querySelector(".cat-sound-icon");
        if (iconEl) {
          iconEl.innerHTML = state.activeCategories[cat] ? activeSpeakerSvg : mutedSpeakerSvg;
        }
      });
    });

    // Botón Master de Sonido
    if (btnToggleSound) {
      btnToggleSound.addEventListener("click", () => {
        const isActive = soundEngine.toggleMasterMute();
        btnToggleSound.classList.toggle("muted", !isActive);
        btnToggleSound.textContent = isActive ? "🔊 Sonido ambiental" : "🔇 Sonido silenciado";
      });
    }

    canvas.addEventListener("mousemove", handleCanvasMouseMove);
    canvas.addEventListener("mouseleave", handleCanvasMouseLeave);

    // Deslizar desde la pantalla introductoria hacia la visualización
    const btnScrollToVis = document.getElementById("btn-scroll-to-vis");
    if (btnScrollToVis) {
      btnScrollToVis.addEventListener("click", () => {
        const visApp = document.getElementById("visualization-app");
        if (visApp) {
          visApp.scrollIntoView({ behavior: "smooth" });
        }
      });
    }

    // Regresar a la pregunta inicial al presionar el título del proyecto
    const brandTitle = document.querySelector(".brand-title");
    if (brandTitle) {
      brandTitle.style.cursor = "pointer";
      brandTitle.title = "Volver a la pregunta inicial";
      brandTitle.addEventListener("click", () => {
        const introScreen = document.getElementById("intro-screen");
        if (introScreen) {
          introScreen.scrollIntoView({ behavior: "smooth" });
        }
      });
    }

    // Deslizar con tecla abajo o espacio cuando se está en la pantalla inicial
    window.addEventListener("keydown", (e) => {
      if ((e.key === "ArrowDown" || e.key === "PageDown") && window.scrollY < window.innerHeight * 0.4) {
        const visApp = document.getElementById("visualization-app");
        if (visApp) {
          e.preventDefault();
          visApp.scrollIntoView({ behavior: "smooth" });
        }
      }
    });
  }

  function updateMomentChips(min) {
    const chips = Array.from(document.querySelectorAll(".moment-chip"));
    if (chips.length === 0) return;

    let closestChip = null;
    let minDiff = Infinity;
    chips.forEach(chip => {
      const chipMin = timeToMinutes(chip.dataset.timeTarget);
      const diff = Math.abs(min - chipMin);
      if (diff < minDiff) {
        minDiff = diff;
        closestChip = chip;
      }
    });

    chips.forEach(chip => {
      chip.classList.toggle("active", chip === closestChip && minDiff <= 95);
    });
  }

  function togglePlayPause() {
    state.isPlaying = !state.isPlaying;
    if (state.isPlaying) {
      playIcon.style.display = "none";
      pauseIcon.style.display = "block";
      soundEngine.play(); // Iniciar todos los sonidos al dar play a la línea del tiempo

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
      soundEngine.pause(); // Si se pausa la línea de tiempo, el sonido para de inmediato
    }
  }

  // =========================================================================
  // HOVER SOBRE NODOS (PERCEPCIÓN ARRIBA Y DECIBELES ABAJO)
  // =========================================================================
  const renderedNodes = [];
  const renderedDbNodes = [];

  function handleCanvasMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    state.mouseX = mx;
    state.mouseY = my;

    let hit = null;
    let hitDb = null;

    // 1. Detectar nodos superiores de percepción
    for (const node of renderedNodes) {
      const dist = Math.hypot(mx - node.x, my - node.y);
      if (dist <= node.radius + 12) {
        hit = node;
        break;
      }
    }

    // 2. Detectar nodos inferiores de decibeles
    if (!hit) {
      for (const node of renderedDbNodes) {
        const dist = Math.hypot(mx - node.x, my - node.y);
        if (dist <= node.radius + 12) {
          hitDb = node;
          break;
        }
      }
    }

    state.hoveredNode = hit;
    state.hoveredDbNode = hitDb;

    if (hit) {
      if (dbTooltip) dbTooltip.classList.remove("visible");
      showNodeTooltip(hit);
    } else {
      if (tooltip) tooltip.classList.remove("visible");
    }

    if (hitDb) {
      if (tooltip) tooltip.classList.remove("visible");
      showDbTooltip(hitDb);
    } else if (!hit) {
      if (dbTooltip) dbTooltip.classList.remove("visible");
    }
  }

  function handleCanvasMouseLeave() {
    state.hoveredNode = null;
    state.hoveredDbNode = null;
    if (tooltip) tooltip.classList.remove("visible");
    if (dbTooltip) dbTooltip.classList.remove("visible");
  }

  // Tooltip Superior: Solo Percepción (Qué es, hora, lugar, e intensidad en cantidad)
  function showNodeTooltip(node) {
    const item = node.data;
    const isEnc = node.isEncuesta;

    // Hora y Lugar
    tooltipTime.textContent = `${item.hora} hrs`;
    tooltipSector.textContent = item.sector || "Barrio Puerto";

    // Qué sonido es (Categoría con punto de color)
    const cat = isEnc ? item.categoria_asignada : item.categoria;
    const color = getCategoryColor(cat);
    tooltipCatDot.style.backgroundColor = color;
    tooltipCatName.textContent = getCategoryName(cat);

    // Fuente sonora registrada
    const fuente = isEnc ? (item.fuente_dominante || "Sonido ambiental") : (item.fuente_predominante || "Sonido ambiental");
    tooltipFuenteName.textContent = fuente;

    // Intensidad percibida por las personas en CANTIDAD (con el color de cada tipo de sonido)
    const levelKey = node.intensityLevel || "Media";
    const info = INTENSIDAD_CANTIDADES[levelKey] || INTENSIDAD_CANTIDADES["Media"];
    tooltipIntensityLevel.textContent = info.label;
    tooltipIntensityLevel.style.color = color;
    tooltipQuantityVal.textContent = info.count;
    tooltipQuantityVal.style.color = color; // Color del tipo de sonido

    const intensityBox = document.getElementById("tooltip-intensity-box");
    if (intensityBox) {
      intensityBox.style.borderLeft = `3px solid ${color}`;
    }

    // Posicionamiento inteligente y compacto
    const stage = document.getElementById("stage-container");
    const stageRect = stage ? stage.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    let xOffset = node.x + 18;
    if (xOffset + 285 > stageRect.width) {
      xOffset = node.x - 290;
    }

    let yOffset = node.y - 75;
    if (yOffset < 15) yOffset = 15;
    if (yOffset + 220 > stageRect.height) yOffset = stageRect.height - 230;

    tooltip.style.left = `${Math.max(15, xOffset)}px`;
    tooltip.style.top = `${Math.max(15, yOffset)}px`;
    tooltip.classList.add("visible");
  }

  // Tooltip Inferior: Exclusivo para Decibeles Medidos
  function showDbTooltip(node) {
    const item = node.data;
    dbTooltipTime.textContent = `${item.hora} hrs`;
    dbTooltipSector.textContent = item.sector || "Barrio Puerto";

    const db = item.db_prom || 60.0;
    dbTooltipVal.textContent = `${db.toFixed(1)} dB`;
    const min = item.db_min || (db - 6).toFixed(1);
    const max = item.db_max || (db + 8).toFixed(1);
    dbTooltipRange.textContent = `Medición: ${db.toFixed(1)} dB (Mín: ${dbMetrics.min.toFixed(1)} dB · Promedio: ${dbMetrics.avg.toFixed(1)} dB · Máx: ${dbMetrics.max.toFixed(1)} dB)`;

    const stage = document.getElementById("stage-container");
    const stageRect = stage ? stage.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    let xOffset = node.x + 18;
    if (xOffset + 285 > stageRect.width) {
      xOffset = node.x - 290;
    }

    let yOffset = node.y - 65;
    if (yOffset < 15) yOffset = 15;
    if (yOffset + 180 > stageRect.height) yOffset = stageRect.height - 190;

    dbTooltip.style.left = `${Math.max(15, xOffset)}px`;
    dbTooltip.style.top = `${Math.max(15, yOffset)}px`;
    dbTooltip.classList.add("visible");
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
    renderedDbNodes.length = 0;

    const midY = h * 0.50;
    const padX = 75;
    const usableW = w - padX * 2;

    function minToX(m) {
      const norm = Math.max(0, Math.min(1, (m - TIME_MIN) / (TIME_MAX - TIME_MIN)));
      return padX + norm * usableW;
    }

    const currentCursorX = minToX(state.currentMinute);

    // 1. Línea Base Central Sutil
    drawCenterBaseline(ctx, w, midY, padX, minToX);

    // Las ondas sonoras se despliegan en el lienzo en todo momento
    const revealMinute = state.showFullJourney ? TIME_MAX : Math.max(state.currentMinute, TIME_MIN);

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
    drawDecibelFluidWave(ctx, midY, padX, usableW, state.animPhase, revealMinute);

    // 3. DIBUJAR UNA ONDA FLUIDA POR CADA TIPO DE SONIDO (Parte Superior)
    categoriesList.forEach((catKey, catIndex) => {
      if (!state.activeCategories[catKey]) return;
      const records = categoryRecords[catKey];
      if (records.length === 0) return;

      drawFluidSilkWave(ctx, catKey, records, midY, padX, usableW, state.animPhase, catIndex, revealMinute);
    });

    // 4. CABEZAL TEMPORAL DEL SLIDER (Conecta verticalmente Percepción y Decibeles)
    drawWeavingCursor(ctx, currentCursorX, midY, h);

    // 5. MODULAR AUDIO PROCEDURAL DEL PAISAJE SONORO
    if (state.isPlaying || soundEngine.isPlaying) {
      soundEngine.updateVolumes(state.currentMinute, state.activeCategories, categoryRecords);
    }
  }

  // Métricas del conjunto de datos calculadas empíricamente
  const dbMetrics = {
    min: 54.0,
    max: 78.0,
    avg: 67.05
  };

  function computeDecibelMetrics() {
    if (!PROJECT_DATA || !PROJECT_DATA.fichas_campo) return;
    const dbs = PROJECT_DATA.fichas_campo
      .map(f => Number(f.db_prom))
      .filter(v => !isNaN(v) && v > 0);
    if (dbs.length > 0) {
      dbMetrics.min = Math.min(...dbs);
      dbMetrics.max = Math.max(...dbs);
      dbMetrics.avg = dbs.reduce((a, b) => a + b, 0) / dbs.length;
    }
  }

  // =========================================================================
  // GENERADOR DE ONDAS TOPOGRÁFICAS PARAMÉTRICAS — EJE SUPERIOR (PERCEPCIÓN)
  // (Estrictamente confinado sobre el eje medio midY, nunca pasa al eje inferior.
  //  Si las personas lo perciben alto la onda es más pronunciada y abierta)
  // =========================================================================
  function drawFluidSilkWave(ctx, cat, records, midY, padX, usableW, phase, catIdx, revealMinute) {
    const colorHex = getCategoryColor(cat);
    const rgb = hexToRgb(colorHex);

    // Separación sutil de la línea base sobre el eje medio (siempre sobre midY)
    const catBaseOffsets = {
      transito: -10,
      personas: -8,
      maquinarias: -6,
      naturaleza: -4
    };
    const baseOffset = catBaseOffsets[cat] || -6;
    const baseY = midY + baseOffset; // Siempre <= midY - 4

    // 38 filamentos de contorno topográfico de alta definición
    const numStrands = 38;
    const numSamples = 240; // Muestreo denso para máxima fluidez orgánica

    // 1. Función de envolvente topográfica continua de percepción subjetiva
    function getTopographicProfile(minute) {
      let totalW = 0;
      let accumCrest = 0;
      let accumBandW = 0;
      let accumOpenness = 0;
      let maxWeight = 0;
      const sigma = 34; // Dispersión orgánica suave

      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        const diff = minute - r.minute;
        const w = Math.exp(-(diff * diff) / (2 * sigma * sigma));
        totalW += w;
        if (w > maxWeight) maxWeight = w;

        // Modulación según intensidad percibida (calibre en mm):
        // Alta (calibre 95): onda MUY PRONUNCIADA hacia arriba (cresta 150px, abanico amplio)
        // Media (calibre 70): pronunciación moderada (cresta 78px)
        // Baja (calibre 28/40): compacta y chica pegada a la base (cresta 26px)
        let crest = 26;
        let bandW = 12;
        let openness = 0.12;

        if (r.calibre === 95) {
          crest = 150;    // Muy pronunciada hacia arriba
          bandW = 72;     // Gran apertura de filamentos
          openness = 1.0;
        } else if (r.calibre === 70) {
          crest = 78;     // Pronunciación media
          bandW = 38;     // Apertura intermedia
          openness = 0.50;
        } else {
          crest = 26;     // Onda baja, compacta
          bandW = 12;
          openness = 0.12;
        }

        accumCrest += crest * w;
        accumBandW += bandW * w;
        accumOpenness += openness * w;
      }

      // Si no hay registros sonoros cercanos (calma / silencio):
      // Los filamentos se ciñen en un hilo finísimo (< 1.2px) sobre la base
      if (totalW < 0.0001) {
        return { crest: 0, bandW: 1.2, openness: 0, maxWeight: 0 };
      }

      const blend = Math.min(1, maxWeight * 1.6);
      const crest = (accumCrest / totalW) * blend;
      const bandW = (accumBandW / totalW) * blend + 1.2 * (1 - blend);
      const openness = (accumOpenness / totalW) * blend;

      return { crest, bandW, openness, maxWeight };
    }

    // 2. Punto exacto de cada filamento s en el minuto m
    // u = 0 (cresta superior más alta), u = 1 (filamento inferior sobre la línea base)
    function getStrandPoint(s, minute, normT) {
      const prof = getTopographicProfile(minute);
      const u = s / (numStrands - 1); // 0 (cresta superior) a 1 (base inferior)
      const w = 1.0 - u;              // 1 (cresta) a 0 (base)

      // Distribución estratificada hacia arriba (hacia y menor)
      const dy = -prof.crest * (0.25 * w + 0.75 * Math.pow(w, 0.85)) - (prof.bandW * 0.35) * w * (1.0 - w);

      // Relieve armónico topográfico 3D (terrazas interiores)
      // Se anula en los extremos superior (u=0) e inferior (u=1) mediante sin(u * PI)
      const envelopeFactor = Math.sin(u * Math.PI) * prof.openness;
      const theta1 = normT * 26 + (1 - u) * 3.6 + phase * 0.85 + catIdx * 1.4;
      const theta2 = normT * 52 - (1 - u) * 2.1 + phase * 0.45;
      const theta3 = normT * 13 + (1 - u) * 1.7 + phase * 1.1;

      const ripple = envelopeFactor * (
        8.5 * Math.sin(theta1) +
        4.2 * Math.cos(theta2) +
        5.5 * Math.sin(theta3)
      );

      // REGLA FUNDAMENTAL: NUNCA PASAR AL EJE INFERIOR (y <= midY - 3)
      const rawY = baseY + dy + ripple;
      const y = Math.min(midY - 3, rawY);

      return { y, prof };
    }

    // 3. Dibujar todos los filamentos topográficos con trazo definido y nítido
    ctx.save();
    ctx.globalCompositeOperation = "multiply";

    for (let s = 0; s < numStrands; s++) {
      const u = s / (numStrands - 1);

      ctx.beginPath();
      let isFirst = true;

      for (let p = 0; p <= numSamples; p++) {
        const tNorm = p / numSamples;
        const minute = TIME_MIN + tNorm * (TIME_MAX - TIME_MIN);

        if (revealMinute < TIME_MAX && minute >= revealMinute) {
          // Conectar en punta afilada (needle pinch) exactamente en el cabezal temporal
          const tipTNorm = Math.min(1, Math.max(0, (revealMinute - TIME_MIN) / (TIME_MAX - TIME_MIN)));
          const tipX = padX + tipTNorm * usableW;
          const spineTip = getStrandPoint(Math.floor(numStrands * 0.6), revealMinute, tipTNorm);
          if (isFirst) {
            ctx.moveTo(tipX, spineTip.y);
            isFirst = false;
          } else {
            ctx.lineTo(tipX, spineTip.y);
          }
          break;
        }

        const x = padX + tNorm * usableW;
        let { y } = getStrandPoint(s, minute, tNorm);

        // Aguzar la punta que avanza en los últimos minutos antes del cabezal
        if (revealMinute < TIME_MAX && revealMinute - minute < 12) {
          const spinePoint = getStrandPoint(Math.floor(numStrands * 0.6), minute, tNorm);
          const pinchFactor = Math.max(0, (revealMinute - minute) / 12);
          y = spinePoint.y + (y - spinePoint.y) * pinchFactor;
        }

        // Seguridad absoluta de eje superior
        y = Math.min(midY - 3, y);

        if (isFirst) {
          ctx.moveTo(x, y);
          isFirst = false;
        } else {
          ctx.lineTo(x, y);
        }
      }

      // Definición nítida y vibrante en el color respectivo de la categoría
      const strandAlpha = 0.50 + 0.36 * Math.sin(u * Math.PI);
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${strandAlpha.toFixed(3)})`;
      ctx.lineWidth = 1.15;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }

    ctx.restore();

    // 4. DIBUJAR LOS NODOS EN LAS CRESTAS DE LAS MONTAÑAS SONORAS (Apex superior)
    records.forEach(rec => {
      if (revealMinute < TIME_MAX && rec.minute > revealMinute) return;

      const normT = (rec.minute - TIME_MIN) / (TIME_MAX - TIME_MIN);
      const x = padX + normT * usableW;

      // Ubicar el nodo en la cresta superior (u = 0)
      const { y: nodeY } = getStrandPoint(0, rec.minute, normT);

      let intensityLevel = "Baja";
      let nodeR = 4.8;
      if (rec.calibre === 95) {
        intensityLevel = "Alta";
        nodeR = 5.8;
      } else if (rec.calibre === 70) {
        intensityLevel = "Media";
        nodeR = 5.2;
      }

      const isHovered = state.hoveredNode && state.hoveredNode.data === rec.data;
      const isCurrent = Math.abs(rec.minute - state.currentMinute) <= 12;

      renderedNodes.push({
        x,
        y: nodeY,
        radius: nodeR,
        data: rec.data,
        isEncuesta: rec.isEncuesta,
        intensityLevel,
        category: cat
      });

      drawFilamentNode(ctx, x, nodeY, nodeR, colorHex, isHovered, isCurrent);
    });
  }

  // =========================================================================
  // ONDA INFERIOR DE DECIBELES MEDIDOS — EJE INFERIOR
  // (Estrictamente confinada bajo midY, nunca pasa al eje superior.
  //  Escalada según el rango empírico [Mín: 54 dB, Promedio: 67 dB, Máx: 78 dB].
  //  Si el decibel registrado es el más bajo la onda es más chica;
  //  si es alto profundiza en un cañón acústico pronunciado)
  // =========================================================================
  function drawDecibelFluidWave(ctx, midY, padX, usableW, phase, revealMinute) {
    if (!PROJECT_DATA) return;
    const records = PROJECT_DATA.fichas_campo;

    const numStrands = 36;
    const numSamples = 240;
    const rgb = { r: 220, g: 38, b: 38 }; // Rojo Acústico Decibeles (#DC2626)
    const baseY = midY + 6; // Siempre >= midY + 4

    // Métricas del conjunto de datos: Mínimo 54 dB, Punto Medio / Promedio ~67 dB, Máximo 78 dB
    const minDbVal = dbMetrics.min || 54.0;
    const maxDbVal = dbMetrics.max || 78.0;

    // 1. Función de perfil de profundidad acústica continua
    function getDbTopographicProfile(minute) {
      let totalW = 0;
      let accumDepth = 0;
      let accumBandW = 0;
      let accumOpenness = 0;
      let maxWeight = 0;
      const sigma = 35;

      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        const diff = minute - timeToMinutes(r.hora);
        const w = Math.exp(-(diff * diff) / (2 * sigma * sigma));
        totalW += w;
        if (w > maxWeight) maxWeight = w;

        const db = r.db_prom || 60;
        // Normalización exacta contra el rango empírico [minDbVal (54 dB) a maxDbVal (78 dB)]
        const normDb = Math.max(0, Math.min(1, (db - minDbVal) / (maxDbVal - minDbVal)));

        // Si el decibel es el más bajo (54 dB, normDb = 0), la onda es MÁS CHICA (apenas 12px)
        // En el punto medio (67 dB, normDb ~ 0.54), profundidad moderada (~75px)
        // En el más alto (78 dB, normDb = 1.0), onda profunda y pronunciada (~150px)
        const depth = 12 + normDb * 138;
        const bandW = 8 + normDb * 70;
        const openness = 0.05 + normDb * 0.95;

        accumDepth += depth * w;
        accumBandW += bandW * w;
        accumOpenness += openness * w;
      }

      if (totalW < 0.0001) {
        return { depth: 10, bandW: 1.2, openness: 0, maxWeight: 0 };
      }

      const blend = Math.min(1, maxWeight * 1.5);
      const depth = (accumDepth / totalW) * blend + 10 * (1 - blend);
      const bandW = (accumBandW / totalW) * blend + 1.2 * (1 - blend);
      const openness = (accumOpenness / totalW) * blend;

      return { depth, bandW, openness, maxWeight };
    }

    // 2. Punto exacto de cada filamento acústico s
    // u = 0 (línea superior cerca de la base), u = 1 (fondo del cañón acústico hacia abajo)
    function getDbStrandPoint(s, minute, normT) {
      const prof = getDbTopographicProfile(minute);
      const u = s / (numStrands - 1); // 0 (arriba cerca de base) a 1 (abajo cañón)

      // Distribución estratificada hacia abajo (hacia y mayor)
      const dy = +prof.depth * (0.25 * u + 0.75 * Math.pow(u, 0.85)) + (prof.bandW * 0.35) * u * (1.0 - u);

      // Relieve armónico topográfico 3D
      const envelopeFactor = Math.sin(u * Math.PI) * prof.openness;
      const theta1 = normT * 24 + u * 3.4 - phase * 0.75;
      const theta2 = normT * 48 - u * 2.0 + phase * 0.45;

      const ripple = envelopeFactor * (
        8.0 * Math.sin(theta1) +
        4.5 * Math.cos(theta2)
      );

      // REGLA FUNDAMENTAL: NUNCA PASAR AL EJE SUPERIOR (y >= midY + 3)
      const rawY = baseY + dy + ripple;
      const y = Math.max(midY + 3, rawY);

      return { y, prof };
    }

    // 3. Dibujar todos los filamentos topográficos rojos nítidos
    ctx.save();
    ctx.globalCompositeOperation = "multiply";

    for (let s = 0; s < numStrands; s++) {
      const u = s / (numStrands - 1);

      ctx.beginPath();
      let isFirst = true;

      for (let p = 0; p <= numSamples; p++) {
        const tNorm = p / numSamples;
        const minute = TIME_MIN + tNorm * (TIME_MAX - TIME_MIN);

        if (revealMinute < TIME_MAX && minute >= revealMinute) {
          const tipTNorm = Math.min(1, Math.max(0, (revealMinute - TIME_MIN) / (TIME_MAX - TIME_MIN)));
          const tipX = padX + tipTNorm * usableW;
          const spineTip = getDbStrandPoint(Math.floor(numStrands * 0.4), revealMinute, tipTNorm);
          if (isFirst) {
            ctx.moveTo(tipX, spineTip.y);
            isFirst = false;
          } else {
            ctx.lineTo(tipX, spineTip.y);
          }
          break;
        }

        const x = padX + tNorm * usableW;
        let { y } = getDbStrandPoint(s, minute, tNorm);

        if (revealMinute < TIME_MAX && revealMinute - minute < 12) {
          const spinePoint = getDbStrandPoint(Math.floor(numStrands * 0.4), minute, tNorm);
          const pinchFactor = Math.max(0, (revealMinute - minute) / 12);
          y = spinePoint.y + (y - spinePoint.y) * pinchFactor;
        }

        // Seguridad absoluta de eje inferior
        y = Math.max(midY + 3, y);

        if (isFirst) {
          ctx.moveTo(x, y);
          isFirst = false;
        } else {
          ctx.lineTo(x, y);
        }
      }

      const strandAlpha = 0.50 + 0.36 * Math.sin(u * Math.PI);
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${strandAlpha.toFixed(3)})`;
      ctx.lineWidth = 1.15;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }

    ctx.restore();

    // 4. DIBUJAR NODOS Y ETIQUETAS DE DECIBELES (1 CADA 3 POR LUGAR E INTERCALADOS VERTICALMENTE)
    const sectorIndices = {};
    const sampledRecords = [];

    records.forEach(r => {
      const sec = r.sector || "General";
      if (!sectorIndices[sec]) sectorIndices[sec] = 0;
      if (sectorIndices[sec] % 3 === 0) {
        sampledRecords.push(r);
      }
      sectorIndices[sec]++;
    });

    sampledRecords.sort((a, b) => timeToMinutes(a.hora) - timeToMinutes(b.hora));

    let lastLabelX = -999;
    let staggerToggle = false;

    sampledRecords.forEach(r => {
      const m = timeToMinutes(r.hora);
      if (revealMinute < TIME_MAX && m > revealMinute) return;

      const normT = (m - TIME_MIN) / (TIME_MAX - TIME_MIN);
      const x = padX + normT * usableW;
      // Posición del nodo en el fondo del cañón acústico (u = 1)
      const { y } = getDbStrandPoint(numStrands - 1, m, normT);

      if (x - lastLabelX < 38) {
        return;
      }
      lastLabelX = x;
      staggerToggle = !staggerToggle;

      const isHovered = state.hoveredDbNode && state.hoveredDbNode.data === r;
      const isCurrent = Math.abs(m - state.currentMinute) <= 10;

      renderedDbNodes.push({
        x,
        y,
        radius: 7,
        data: r
      });

      ctx.save();
      ctx.globalCompositeOperation = "source-over";

      const r = isHovered ? 6.5 : (isCurrent ? 5.6 : 4.8);

      // Nodo sólido de decibeles (sin borde transparente ni halo)
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? "#991B1B" : "#DC2626";
      ctx.fill();

      // Borde blanco delgado
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Posicionamiento intercalado vertical de las etiquetas de decibeles
      const isStaggered = staggerToggle;
      const labelYOffset = isStaggered ? 26 : 15;

      if (isStaggered) {
        ctx.beginPath();
        ctx.moveTo(x, y + 6);
        ctx.lineTo(x, y + labelYOffset - 8);
        ctx.strokeStyle = "rgba(220, 38, 38, 0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const dbVal = r.db_prom || 60;
      ctx.font = `800 10.5px 'Merriweather Sans', sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = isHovered ? "#7F1D1D" : (isStaggered ? "#991B1B" : "#DC2626");
      ctx.fillText(`${dbVal.toFixed(0)} dB`, x, y + labelYOffset);

      ctx.restore();
    });
  }

  // NODOS DE INTERACCIÓN
  // =========================================================================
  function drawFilamentNode(ctx, x, y, radius, hexColor, isHovered, isCurrent) {
    const r = isHovered ? radius * 1.35 : (isCurrent ? radius * 1.18 : radius);

    ctx.save();
    ctx.globalCompositeOperation = "source-over";

    // Nodo sólido con el color de la categoría (sin borde transparente ni punto blanco al centro)
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = hexColor;
    ctx.fill();

    // Borde blanco delgado y nítido
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1.4;
    ctx.stroke();

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
      case "decibel":
      case "decibeles": return "#DC2626";
      default: return "#DC2626";
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