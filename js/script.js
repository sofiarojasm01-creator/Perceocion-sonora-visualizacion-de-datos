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
    hoveredDbNode: null,
    mouseX: null,
    mouseY: null,
    animPhase: 0
  };

  const TIME_MIN = 580;  // 09:40 hrs
  const TIME_MAX = 1130; // 18:50 hrs

  // Cantidades reales del Instrumento Participativo según calibre de percepción (N=32 participantes)
  const INTENSIDAD_CANTIDADES = {
    "Alta": { label: "Alta", count: "15 personas", num: 15 },
    "Media": { label: "Media", count: "11 personas", num: 11 },
    "Baja": { label: "Baja", count: "6 personas", num: 6 }
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
    masterVolume: 0.38, // Nivel global suave y equilibrado para disfrute continuo
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
        el.volume = initVol;
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
          // Modulación guiada por la presencia e intensidad de datos en ese horario
          const recs = (recordsByCategory && recordsByCategory[cat]) || [];
          let maxCalibre = 0;
          let nearbyCount = 0;

          for (const r of recs) {
            const diff = Math.abs(currentMinute - r.minute);
            if (diff <= 40) {
              nearbyCount++;
              if (r.calibre > maxCalibre) maxCalibre = r.calibre;
            }
          }

          // Factor de intensidad según el calibre de percepción ciudadana
          let intensityFactor = 0.90; // Presencia basal viva
          if (nearbyCount > 0) {
            if (maxCalibre === 95) {
              intensityFactor = 1.30; // Nivel Alto (picos de flujo vial o encuentros masivos)
            } else if (maxCalibre === 70) {
              intensityFactor = 1.10; // Nivel Medio
            } else {
              intensityFactor = 0.95; // Nivel Bajo
            }
          }

          // Naturaleza con mayor presencia y protagonismo auditivo costero
          if (cat === "naturaleza") {
            const oceanPresence = nearbyCount > 0 ? 0.26 : 0.20;
            item.targetVol = oceanPresence;
          } else {
            item.targetVol = Math.min(0.38, Math.max(0.10, item.baseWeight * intensityFactor));
          }
        }

        // Interpolación fluida (fade orgánico entre frames)
        const ease = 0.08;
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
  }

  function setupSlider() {
    timeSlider.value = state.currentMinute;
    currentTimeText.textContent = formatMinute(state.currentMinute);

    timeSlider.addEventListener("input", (e) => {
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
        const isActive = soundEngine.toggleMasterMute();
        btnToggleSound.classList.toggle("muted", !isActive);
        btnToggleSound.textContent = isActive ? "🔊 Sonido ambiental" : "🔇 Sonido silenciado";
      });
    }

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

    // Intensidad percibida por las personas en CANTIDAD (no porcentaje)
    const levelKey = node.intensityLevel || "Media";
    const info = INTENSIDAD_CANTIDADES[levelKey] || INTENSIDAD_CANTIDADES["Media"];
    tooltipIntensityLevel.textContent = info.label;
    tooltipQuantityVal.textContent = info.count;

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

    // DIBUJAR NODOS Y ETIQUETAS DE DECIBELES (1 CADA 3 POR LUGAR E INTERCALADOS VERTICALMENTE)
    // 1. Filtrar 1 cada 3 registros por sector para evitar saturación y superposición
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
      const depth = getFluidDbDepth(m);
      const y = midY + depth;

      // Garantizar que no colisionen horizontalmente (mínimo 38px entre marcas)
      if (x - lastLabelX < 38) {
        return; // Omitir si queda demasiado pegado a otra medición
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

      // Halo acústico
      ctx.beginPath();
      ctx.arc(x, y, isHovered ? 13 : 8.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isHovered ? 0.38 : 0.16})`;
      ctx.fill();

      // Centro del nodo
      ctx.beginPath();
      ctx.arc(x, y, isHovered ? 6.5 : 4.8, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? "#EA580C" : "#F97316";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, isHovered ? 6.5 : 4.8, 0, Math.PI * 2);
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Posicionamiento intercalado vertical de las etiquetas de decibeles
      const isStaggered = staggerToggle;
      const labelYOffset = isStaggered ? 26 : 15;

      // Línea guía tenue para etiquetas intercaladas inferiores
      if (isStaggered) {
        ctx.beginPath();
        ctx.moveTo(x, y + 6);
        ctx.lineTo(x, y + labelYOffset - 8);
        ctx.strokeStyle = "rgba(249, 115, 22, 0.35)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Pastilla de texto de decibeles medidos (limpia, nítida y legible)
      const dbVal = r.db_prom || 60;
      ctx.font = `800 10.5px 'Merriweather Sans', sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = isHovered ? "#9A3412" : (isStaggered ? "#9A3412" : "#C2410C");
      ctx.fillText(`${dbVal.toFixed(0)} dB`, x, y + labelYOffset);

      ctx.restore();
    });
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
