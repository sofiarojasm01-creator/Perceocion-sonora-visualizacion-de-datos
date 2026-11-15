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
    btnPlayPause.addEventListener("click", togglePlayPause);

    btnToggleJourney.addEventListener("click", () => {
      state.showFullJourney = !state.showFullJourney;
      if (state.showFullJourney) {
        btnToggleJourney.classList.add("active");
        btnToggleJourney.textContent = "Modo temporal progresivo";
        if (state.isPlaying) togglePlayPause();
        state.currentMinute = TIME_MAX;
        timeSlider.value = TIME_MAX;
        currentTimeText.textContent = "Recorrido Completo (Día)";
      } else {
        btnToggleJourney.classList.remove("active");
        btnToggleJourney.textContent = "Ver todo el recorrido";
        currentTimeText.textContent = formatMinute(state.currentMinute);
      }
    });

    // Filtros de categorías
    document.querySelectorAll(".cat-legend-item").forEach(item => {
      item.addEventListener("click", () => {
        const cat = item.dataset.category;
        state.activeCategories[cat] = !state.activeCategories[cat];
        item.classList.toggle("inactive", !state.activeCategories[cat]);
      });
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

    const limitMinute = state.showFullJourney ? TIME_MAX : state.currentMinute;
    const limitX = minToX(limitMinute);

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
    // Siempre visible a lo largo de toda la jornada (09:40 a 18:50)
    drawDecibelFluidWave(ctx, midY, padX, usableW, state.animPhase);

    // 3. DIBUJAR UNA ONDA FLUIDA POR CADA TIPO DE SONIDO (Parte Superior)
    // Cada onda se dibuja completa a lo largo del tiempo, envolviendo sus nodos
    categoriesList.forEach((catKey, catIndex) => {
      if (!state.activeCategories[catKey]) return;
      const records = categoryRecords[catKey];
      if (records.length === 0) return;

      drawFluidSilkWave(ctx, catKey, records, midY, padX, usableW, state.animPhase, catIndex);
    });

    // 4. CABEZAL TEMPORAL DEL SLIDER (Conecta verticalmente Percepción y Decibeles)
    drawWeavingCursor(ctx, currentCursorX, midY, h);
  }

  // =========================================================================
  // GENERADOR DE ONDAS FLUIDAS CONTINUAS Y NODOS EMBEBIDOS
  // (Las ondas siguen los nodos, suben a sus crestas y los envuelven sin que
  //  ningún nodo quede por encima de la onda)
  // =========================================================================
  function drawFluidSilkWave(ctx, cat, records, midY, padX, usableW, phase, catIdx) {
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

    // 3. Dibujar todos los filamentos de seda que componen la onda fluida a lo largo de todo el día
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
    // Los nodos se ubican en el centro exacto del espinazo de la onda (spineY),
    // garantizando que las hebras superiores del listón pasen SIEMPRE por encima de ellos
    // y que la onda siga milimétricamente cada nodo sin que queden flotando arriba.
    records.forEach(rec => {
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
  function drawDecibelFluidWave(ctx, midY, padX, usableW, phase) {
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
