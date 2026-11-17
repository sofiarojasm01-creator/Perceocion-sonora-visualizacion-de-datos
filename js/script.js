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
    hasStarted: false,
    showFullJourney: false,
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
    masterVolume: 0.95, // Nivel global suave y equilibrado para disfrute continuo
    hasUserStarted: false,

    tracks: {
      transito: {
        id: "audio-transito",
        src: "assets/sonidos/video transito.mp3",
        audio: null,
        baseWeight: 0.28, // Tránsito: micros, autos y rodado sobre adoquín
        currentVol: 0.28,
        targetVol: 0.28
      },
      personas: {
        id: "audio-personas",
        src: "assets/sonidos/video personas sonido.mp3",
        audio: null,
        baseWeight: 0.25, // Personas: charlas callejeras, pregones y voces
        currentVol: 0.25,
        targetVol: 0.25
      },
      maquinarias: {
        id: "audio-maquinarias",
        src: "assets/sonidos/video maquinarias.mp3",
        audio: null,
        baseWeight: 0.20, // Maquinarias: motores marinos y actividad portuaria
        currentVol: 0.20,
        targetVol: 0.20
      },
      naturaleza: {
        id: "audio-naturaleza",
        src: "assets/sonidos/video naturaleza.mp3",
        audio: null,
        baseWeight: 0.22, // Naturaleza: oleaje del mar Pacífico y viento costero más presente y claro
        currentVol: 0.22,
        targetVol: 0.22
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
        // Asignar volumen audible desde el inicio para que suenen todos al arrancar
        const initVol = Math.max(0, Math.min(1, item.baseWeight * this.masterVolume));
        try { el.volume = initVol; } catch (e) {}
        item.currentVol = item.baseWeight;
        item.targetVol = item.baseWeight;
        item.audio = el;

        // Reinicio automático en bucle continuo sin cortes
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

      // Iniciar reproducción simultánea de todas las pistas de audio
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

      categories.forEach(cat => {
        const item = this.tracks[cat];
        if (!item || !item.audio) return;

        // Si la categoría fue silenciada en el filtro superior o el botón general está silenciado:
        if (!activeCategories[cat] || this.isMasterMuted) {
          item.targetVol = 0.0;
        } else {
          // Cálculo exacto de la altura de la onda visual en este minuto (sincronía 1:1 con la cresta)
          const recs = (recordsByCategory && recordsByCategory[cat]) || [];
          let totalW = 0;
          let accumCrest = 0;
          let maxWeight = 0;
          const sigma = 34; // Idéntica dispersión gaussiana que la onda visual

          for (let i = 0; i < recs.length; i++) {
            const r = recs[i];
            const diff = currentMinute - r.minute;
            const w = Math.exp(-(diff * diff) / (2 * sigma * sigma));
            totalW += w;
            if (w > maxWeight) maxWeight = w;

            let c = 26;
            if (r.calibre === 95) c = 168;      // Cresta alta
            else if (r.calibre === 70) c = 84;  // Cresta media
            else c = 26;                        // Cresta baja

            accumCrest += c * w;
          }

          let waveHeight = 0;
          if (totalW > 0.0001) {
            const blend = Math.min(1, maxWeight * 1.6);
            waveHeight = (accumCrest / totalW) * blend;
          }

          // REGLA FUNDAMENTAL DE AUDIO:
          // Si la onda es alta (sonido alto), el volumen sube fuertemente (hasta 1.0)
          // Si la onda disminuye o es baja, el volumen baja proporcionalmente (hasta 0.05)
          let target = 0.05; // Fondo tenue / silencioso cuando la onda está en calma
          if (waveHeight > 3) {
            const normH = Math.min(1, waveHeight / 168);
            target = 0.05 + 0.95 * Math.pow(normH, 1.15);
          }

          item.targetVol = target;
        }

        // Interpolación fluida (fade orgánico entre frames para evitar clics)
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

      if (!this.isMasterMuted && state && state.isPlaying) {
        this.play();
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

  // Carga de Datos Inmediata y Resiliente (soporta file:/// sin CORS)
  function loadData() {
    if (typeof window !== "undefined" && window.EMBEDDED_DATASET) {
      PROJECT_DATA = window.EMBEDDED_DATASET;
      initApp();
      return;
    }
    fetch("assets/data/datos_paisaje_sonoro.json")
      .then(res => res.json())
      .then(data => {
        PROJECT_DATA = data;
        initApp();
      })
      .catch(() => {
        PROJECT_DATA = (typeof window !== "undefined" && window.EMBEDDED_DATASET) ? window.EMBEDDED_DATASET : null;
        initApp();
      });
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
      const w = rect.width || canvas.clientWidth || 1200;
      const h = rect.height || canvas.clientHeight || 560;
      if (w > 0 && h > 0) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        if (ctx.resetTransform) {
          ctx.resetTransform();
        } else {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
        ctx.scale(dpr, dpr);
      }
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
    // duplicado limpiado

    timeSlider.addEventListener("input", (e) => {
      state.hasStarted = true;
      // estado visual de recorrido mantenido
      // texto mantenido

      const val = parseInt(e.target.value, 10);
      state.currentMinute = val;
      currentTimeText.textContent = formatMinute(val);
      updateMomentChips(val);
    });

    document.querySelectorAll(".moment-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        state.hasStarted = true;
      // estado visual de recorrido mantenido
      // texto mantenido

        const val = timeToMinutes(chip.dataset.timeTarget);
        timeSlider.value = val;
        state.currentMinute = val;
        currentTimeText.textContent = formatMinute(val);
        updateMomentChips(val);
      });
    });

    document.querySelectorAll(".tick-mark").forEach(tick => {
      tick.addEventListener("click", () => {
        state.hasStarted = true;
      // estado visual de recorrido mantenido
      // texto mantenido

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

    if (btnToggleJourney) {
      if (state.showFullJourney) {
        btnToggleJourney.classList.add("active");
        btnToggleJourney.textContent = "Ver todo el recorrido";
      } else {
        btnToggleJourney.classList.remove("active");
        btnToggleJourney.textContent = "Ver todo el recorrido";
      }

      btnToggleJourney.addEventListener("click", () => {
        state.showFullJourney = !state.showFullJourney;
        if (state.showFullJourney) {
          btnToggleJourney.classList.add("active");
          btnToggleJourney.textContent = "Ver todo el recorrido";
        } else {
          btnToggleJourney.classList.remove("active");
          btnToggleJourney.textContent = "Ver todo el recorrido";
        }
      });
    }

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
    state.hasStarted = true;

    // Si ya había llegado al final, reiniciar desde el inicio al volver a dar play
    if (state.currentMinute >= TIME_MAX) {
      state.currentMinute = TIME_MIN;
      timeSlider.value = state.currentMinute;
      currentTimeText.textContent = formatMinute(state.currentMinute);
      updateMomentChips(state.currentMinute);
    }

    state.isPlaying = !state.isPlaying;
    if (state.isPlaying) {
      playIcon.style.display = "none";
      pauseIcon.style.display = "block";
      soundEngine.play(); // Iniciar todos los sonidos al dar play a la línea del tiempo

      state.playbackTimer = setInterval(() => {
        if (state.currentMinute >= TIME_MAX) {
          // AL LLEGAR AL FINAL QUEDA AHÍ QUIETO EN PANTALLA
          state.currentMinute = TIME_MAX;
          timeSlider.value = state.currentMinute;
          currentTimeText.textContent = formatMinute(state.currentMinute);
          updateMomentChips(state.currentMinute);

          if (state.playbackTimer) {
            clearInterval(state.playbackTimer);
            state.playbackTimer = null;
          }
          state.isPlaying = false;
          playIcon.style.display = "block";
          pauseIcon.style.display = "none";
          // EL SONIDO DE AMBIENTE SIGUE ANDANDO CONTINUAMENTE EN BUCLE
          return;
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
      if (state.playbackTimer) {
        clearInterval(state.playbackTimer);
        state.playbackTimer = null;
      }
      // El avance del cabezal se pausa, pero el sonido de ambiente sigue andando continuamente
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
    dbTooltipRange.textContent = `Rango sonómetro: [Mín: ${min} dB — Máx: ${max} dB]`;

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

    // Revelar progresivamente según avance de la onda temporal
    // Las ondas y puntos no aparecen antes de dar play a la línea del tiempo
    let revealMinute;
    if (state.showFullJourney) {
      revealMinute = TIME_MAX;
    } else if (!state.hasStarted) {
      revealMinute = TIME_MIN - 1; // Antes de dar play, aún no aparecen las ondas ni los puntos
    } else {
      revealMinute = Math.max(state.currentMinute, TIME_MIN);
    }

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

    // 5. MODULAR AUDIO PROCEDURAL DEL PAISAJE SONORO (SIGUE ANDANDO SIEMPRE QUE ESTÉ ACTIVO)
    if (soundEngine.hasUserStarted || state.isPlaying || soundEngine.isPlaying) {
      soundEngine.updateVolumes(state.currentMinute, state.activeCategories, categoryRecords);
    }
  }

  // =========================================================================
  // =========================================================================
  // GENERADOR DE ONDAS TOPOGRÁFICAS PARAMÉTRICAS — EJE SUPERIOR (PERCEPCIÓN)
  // (Estrictamente confinado sobre el eje medio midY, nunca cruza al eje inferior.
  //  Alta intensidad = ondas gigantes y abiertas; Baja intensidad = ondas pequeñas;
  //  Silencio/calma = hilos finos y ceñidos sobre la línea base)
  // =========================================================================
  function drawFluidSilkWave(ctx, cat, records, midY, padX, usableW, phase, catIdx, revealMinute) {
    if (revealMinute < TIME_MIN) return;
    const colorHex = getCategoryColor(cat);
    const rgb = hexToRgb(colorHex);

    // Separación vertical estratificada de las líneas base según categoría sonora
    // Tránsito fluye arriba (Morado), Personas en la franja media-alta (Amarillo Mostaza),
    // Maquinarias en franja media (Rosado), Naturaleza pegada a la línea base (Cian)
    const catBaseOffsets = {
      transito: -42,
      personas: -24,
      maquinarias: -14,
      naturaleza: -4
    };
    const baseOffset = catBaseOffsets[cat] || -20;
    const baseY = midY + baseOffset; // Siempre <= midY - 4

    // 36 filamentos de contorno topográfico para textura de relieve 3D
    const numStrands = 36;
    const numSamples = 200; // Muestreo denso para máxima fluidez orgánica continua

    // 1. Función de envolvente continua modulada estrictamente por la intensidad percibida
    function getFluidEnvelope(minute) {
      let totalW = 0;
      let accumCrest = 0;
      let accumBandW = 0;
      let accumOpenness = 0;
      let maxWeight = 0;
      const sigma = 34; // Dispersión orgánica ultra fluida

      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        const diff = minute - r.minute;
        const w = Math.exp(-(diff * diff) / (2 * sigma * sigma));
        totalW += w;
        if (w > maxWeight) maxWeight = w;

        // Modulación según intensidad percibida (calibre en mm):
        // Calibre 95 (Alta): onda GIGANTE (cresta 168px, abanico amplio de 84px)
        // Calibre 70 (Media): elevación moderada (cresta 84px, abanico de 42px)
        // Calibre 28 (Baja): onda pequeña y baja (cresta 26px, abanico ceñido de 12px)
        let crest = 26;
        let bandW = 12;
        let openness = 0.12;

        if (r.calibre === 95) {
          crest = 168;    // Alta = cresta gigante
          bandW = 84;     // Gran apertura de filamentos
          openness = 1.0;
        } else if (r.calibre === 70) {
          crest = 84;     // Media = elevación moderada
          bandW = 42;     // Apertura intermedia
          openness = 0.50;
        } else {
          crest = 26;     // Baja = onda pequeña
          bandW = 12;     // Se cierra ceñida
          openness = 0.12;
        }

        accumCrest += crest * w;
        accumBandW += bandW * w;
        accumOpenness += openness * w;
      }

      // Si no hay registros sonoros cercanos (calma / silencio):
      // Los filamentos se ciñen en un hilo finísimo (< 2px) sobre la línea base
      if (totalW < 0.0001) {
        return { crest: 3, bandW: 2, openness: 0, maxWeight: 0 };
      }

      const blend = Math.min(1, maxWeight * 1.6);
      const crest = (accumCrest / totalW) * blend + 3 * (1 - blend);
      const bandW = (accumBandW / totalW) * blend + 2 * (1 - blend);
      const openness = (accumOpenness / totalW) * blend;

      return { crest, bandW, openness, maxWeight };
    }

    // 2. Cálculo de la posición exacta de cada filamento s (u=0 es cresta superior, u=1 es base inferior)
    function getStrandPoint(s, minute, normT) {
      const env = getFluidEnvelope(minute);
      const u = s / (numStrands - 1); // 0 (cresta superior) a 1 (base inferior)
      const k = 1.0 - u;              // 1 (cresta) a 0 (base)

      // Elevación estratificada hacia arriba (hacia y menor)
      const dy = -env.crest * (0.22 * k + 0.78 * Math.pow(k, 1.15)) - (k - 0.5) * env.bandW * 0.35;

      // Relieve armónico topográfico 3D (terrazas y curvas de nivel interiores)
      // Se anula en la cresta superior (u=0) y en la base inferior (u=1) mediante Math.sin(u * PI)
      const envelopeFactor = Math.sin(u * Math.PI) * (env.crest / 160);
      const theta1 = normT * 22 + (1 - u) * 3.4 + phase * 0.75 + catIdx * 1.3;
      const theta2 = normT * 44 - (1 - u) * 2.0 + phase * 0.40;
      const theta3 = normT * 11 + (1 - u) * 1.5 + phase * 0.95;

      const ripple = envelopeFactor * (
        8.5 * Math.sin(theta1) +
        4.2 * Math.cos(theta2) +
        3.0 * Math.sin(theta3)
      );

      // REGLA FUNDAMENTAL: NUNCA PASAR AL EJE INFERIOR (y <= midY - 4)
      const rawY = baseY + dy + ripple;
      const y = Math.min(midY - 4, rawY);

      return { y, env };
    }

    // 3. Dibujar todos los filamentos topográficos con trazo fino, nítido y sedoso
    ctx.save();
    ctx.globalCompositeOperation = "multiply";

    for (let s = 0; s < numStrands; s++) {
      const u = s / (numStrands - 1);

      ctx.beginPath();
      let isFirst = true;

      for (let p = 0; p <= numSamples; p++) {
        const tNorm = p / numSamples;
        const minute = TIME_MIN + tNorm * (TIME_MAX - TIME_MIN);

        if (minute >= revealMinute) {
          // Conectar en punta afilada (needle pinch) exactamente en el cabezal temporal
          const tipTNorm = Math.min(1, Math.max(0, (revealMinute - TIME_MIN) / (TIME_MAX - TIME_MIN)));
          const tipX = padX + tipTNorm * usableW;
          const { y: tipY } = getStrandPoint(s, revealMinute, tipTNorm);
          if (isFirst) {
            ctx.moveTo(tipX, tipY);
            isFirst = false;
          } else {
            ctx.lineTo(tipX, tipY);
          }
          break;
        }

        const x = padX + tNorm * usableW;
        let { y } = getStrandPoint(s, minute, tNorm);


        // Seguridad absoluta de eje superior
        y = Math.min(midY - 4, y);

        if (isFirst) {
          ctx.moveTo(x, y);
          isFirst = false;
        } else {
          ctx.lineTo(x, y);
        }
      }

      // Definición nítida y vibrante en el color respectivo de la categoría
      const strandAlpha = 0.22 + 0.38 * Math.sin(u * Math.PI);
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${strandAlpha.toFixed(3)})`;
      ctx.lineWidth = 1.05;
      ctx.stroke();
    }

    ctx.restore();

    // 4. DIBUJAR LOS NODOS EN LAS CRESTAS DE LAS MONTAÑAS SONORAS (Apex u=0)
    records.forEach(rec => {
      if (rec.minute > revealMinute) return; // Aparecen de a poco con el avance temporal

      const normT = (rec.minute - TIME_MIN) / (TIME_MAX - TIME_MIN);
      const x = padX + normT * usableW;

      // Ubicar el nodo exactamente en la cresta superior (u = 0)
      const { y: apexY } = getStrandPoint(0, rec.minute, normT);

      let intensityLevel = "Baja";
      let nodeR = 4.6;
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
        y: apexY,
        radius: nodeR,
        data: rec.data,
        isEncuesta: rec.isEncuesta,
        intensityLevel,
        category: cat
      });

      drawFilamentNode(ctx, x, apexY, nodeR, colorHex, isHovered, isCurrent);
    });
  }

  // =========================================================================
  // ONDA INFERIOR DE DECIBELES MEDIDOS — EJE INFERIOR
  // (Estrictamente confinada bajo el eje medio midY, nunca cruza al eje superior.
  //  A mayor decibel registrado, la onda es proporcionalmente mucho más profunda y grande;
  //  a menor decibel, la onda es pequeña y superficial pegada a la línea base)
  // =========================================================================
  function drawDecibelFluidWave(ctx, midY, padX, usableW, phase, revealMinute) {
    if (!PROJECT_DATA || revealMinute < TIME_MIN) return;
    const records = PROJECT_DATA.fichas_campo;

    const numStrands = 36;
    const numSamples = 200;
    const rgb = { r: 220, g: 38, b: 38 }; // Rojo Acústico Decibeles (#DC2626)

    // 1. Función continua de profundidad de decibeles
    // Min registrado: 54 dB -> onda pequeña (profundidad 20px, abanico ceñido 8px)
    // Max registrado: 78 dB -> onda gigante (profundidad 165px, abanico amplio 65px)
    function getFluidDbDepth(minute) {
      let totalW = 0;
      let accumDb = 0;
      const sigma = 35;

      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        const diff = minute - timeToMinutes(r.hora);
        const w = Math.exp(-(diff * diff) / (2 * sigma * sigma));
        totalW += w;

        const db = r.db_prom || 62;
        accumDb += db * w;
      }

      const avgDb = (totalW > 0.0001) ? (accumDb / totalW) : 62;
      const clampedDb = Math.max(54, Math.min(78, avgDb));
      const normDb = (clampedDb - 54) / (78 - 54); // [0.0 (54 dB) a 1.0 (78 dB)]

      // A mayor decibel, profundidad y abanico aumentan exponencialmente
      const depth = 20 + Math.pow(normDb, 1.15) * 145;
      const bandW = 8 + normDb * 55;

      return { depth, bandW, normDb };
    }

    // 2. Posición de cada filamento s de decibeles (u=0 es base superior, u=1 es vértice inferior)
    function getDbStrandPoint(s, minute, normT) {
      const { depth, bandW } = getFluidDbDepth(minute);
      const u = s / (numStrands - 1); // 0 (base cerca del eje) a 1 (punta inferior)

      const dy = depth * (0.22 * u + 0.78 * Math.pow(u, 1.15)) + (u - 0.5) * bandW * 0.35;

      // Relieve armónico topográfico 3D hacia abajo
      const envelopeFactor = Math.sin(u * Math.PI) * (depth / 160);
      const theta1 = normT * 20 + u * 3.2 - phase * 0.8;
      const theta2 = normT * 40 - u * 2.1 + phase * 0.5;

      const ripple = envelopeFactor * (
        7.5 * Math.sin(theta1) +
        4.0 * Math.cos(theta2)
      );

      // REGLA FUNDAMENTAL: NUNCA PASAR AL EJE SUPERIOR (y >= midY + 4)
      const rawY = (midY + 6) + dy + ripple;
      const y = Math.max(midY + 4, rawY);

      return { y, depth, bandW };
    }

    // 3. Dibujar todos los filamentos de la onda de decibeles
    ctx.save();
    ctx.globalCompositeOperation = "multiply";

    for (let s = 0; s < numStrands; s++) {
      const u = s / (numStrands - 1);

      ctx.beginPath();
      let isFirst = true;

      for (let p = 0; p <= numSamples; p++) {
        const tNorm = p / numSamples;
        const minute = TIME_MIN + tNorm * (TIME_MAX - TIME_MIN);

        if (minute >= revealMinute) {
          // Conectar en punta hacia el cabezal temporal inferior
          const tipTNorm = Math.min(1, Math.max(0, (revealMinute - TIME_MIN) / (TIME_MAX - TIME_MIN)));
          const tipX = padX + tipTNorm * usableW;
          const { y: tipY } = getDbStrandPoint(s, revealMinute, tipTNorm);
          if (isFirst) {
            ctx.moveTo(tipX, tipY);
            isFirst = false;
          } else {
            ctx.lineTo(tipX, tipY);
          }
          break;
        }

        const x = padX + tNorm * usableW;
        let { y } = getDbStrandPoint(s, minute, tNorm);


        // Seguridad absoluta de eje inferior
        y = Math.max(midY + 4, y);

        if (isFirst) {
          ctx.moveTo(x, y);
          isFirst = false;
        } else {
          ctx.lineTo(x, y);
        }
      }

      const strandAlpha = 0.22 + 0.38 * Math.sin(u * Math.PI);
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${strandAlpha.toFixed(3)})`;
      ctx.lineWidth = 1.05;
      ctx.stroke();
    }

    ctx.restore();

    // 4. DIBUJAR NODOS Y ETIQUETAS DE DECIBELES EN LAS PUNTAS INFERIORES (u=1)
    // Filtrar 1 cada 3 registros por sector para evitar saturación y colisiones
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

    // Ordenar cronológicamente
    sampledRecords.sort((a, b) => timeToMinutes(a.hora) - timeToMinutes(b.hora));

    let lastLabelX = -999;
    let staggerToggle = false;

    sampledRecords.forEach(r => {
      const m = timeToMinutes(r.hora);
      if (m > revealMinute) return;

      const normT = (m - TIME_MIN) / (TIME_MAX - TIME_MIN);
      const x = padX + normT * usableW;

      // Vértice inferior de la onda en ese minuto (u = 1)
      const { y: tipY } = getDbStrandPoint(numStrands - 1, m, normT);

      // Separación horizontal mínima de 38px entre marcas
      if (x - lastLabelX < 38) {
        return;
      }
      lastLabelX = x;
      staggerToggle = !staggerToggle;

      const isHovered = state.hoveredDbNode && state.hoveredDbNode.data === r;
      const isCurrent = Math.abs(m - state.currentMinute) <= 10;

      renderedDbNodes.push({
        x,
        y: tipY,
        radius: 7,
        data: r
      });

      ctx.save();
      ctx.globalCompositeOperation = "source-over";

      // Halo acústico
      ctx.beginPath();
      ctx.arc(x, tipY, isHovered ? 13 : 8.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isHovered ? 0.38 : 0.16})`;
      ctx.fill();

      // Centro del nodo
      ctx.beginPath();
      ctx.arc(x, tipY, isHovered ? 6.5 : 4.8, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? "#991B1B" : "#DC2626";
      ctx.fill();

      // Anillo blanco
      ctx.beginPath();
      ctx.arc(x, tipY, isHovered ? 6.5 : 4.8, 0, Math.PI * 2);
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Posicionamiento intercalado vertical de las etiquetas de decibeles
      const isStaggered = staggerToggle;
      const labelYOffset = isStaggered ? 26 : 15;

      // Línea guía tenue para etiquetas intercaladas inferiores
      if (isStaggered) {
        ctx.beginPath();
        ctx.moveTo(x, tipY + 6);
        ctx.lineTo(x, tipY + labelYOffset - 8);
        ctx.strokeStyle = "rgba(220, 38, 38, 0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Pastilla de texto de decibeles medidos (limpia, nítida y legible)
      const dbVal = r.db_prom || 60;
      ctx.font = `800 10.5px 'Merriweather Sans', sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = isHovered ? "#7F1D1D" : (isStaggered ? "#991B1B" : "#DC2626");
      ctx.fillText(`${dbVal.toFixed(0)} dB`, x, tipY + labelYOffset);

      ctx.restore();
    });
  }

  // =========================================================================
  // NODOS DE INTERACCIÓN DE PERCEPCIÓN (IDÉNTICOS A LOS PUNTOS DE DECIBELES)
  // Sólidos con su color correspondiente, borde blanco delgado y halo suave (sin punto blanco central)
  // =========================================================================
  function drawFilamentNode(ctx, x, y, radius, hexColor, isHovered, isCurrent) {
    const rgb = hexToRgb(hexColor);
    const coreR = isHovered ? (radius + 1.8) : (isCurrent ? (radius + 0.8) : radius);
    const haloR = isHovered ? 13 : 8.5;

    ctx.save();
    ctx.globalCompositeOperation = "source-over";

    // 1. Halo exterior translúcido (exactamente como en decibeles)
    ctx.beginPath();
    ctx.arc(x, y, haloR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isHovered ? 0.38 : 0.16})`;
    ctx.fill();

    // 2. Núcleo sólido con su color oficial correspondiente (sin punto blanco)
    ctx.beginPath();
    ctx.arc(x, y, coreR, 0, Math.PI * 2);
    ctx.fillStyle = hexColor;
    ctx.fill();

    // 3. Borde blanco delgado y nítido (exactamente como el borde blanco de decibeles)
    ctx.beginPath();
    ctx.arc(x, y, coreR, 0, Math.PI * 2);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.restore();
  }
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
