# Entre lo que suena y lo que sentimos — Paisaje Sonoro del Barrio Puerto
**Taller de Diseño de Servicios / Diseño de Interacción — Valparaíso, Chile**

---

## 🌊 Descripción del Proyecto
Plataforma web interactiva para explorar la pregunta central de investigación:
> *«¿Coincide la intensidad con que las personas perciben los sonidos del Barrio Puerto con la intensidad sonora registrada en decibeles?»*

Desarrollada sobre datos reales empíricos recolectados en terreno mediante:
- **40 Fichas de Observación y Medición Acústica (BP-01 a BP-40)** con sonómetros de precisión (Apple Watch, Decibel Meter, NIOSH).
- **20 Encuestas de Percepción Ciudadana** con citas textuales y valoración de confort.
- **32 Registros del Instrumento Participativo Físico** con calibres de intensidad (28 mm, 70 mm, 95 mm).

---

## 🚀 Cómo abrir y visualizar el proyecto en Visual Studio Code

1. Abre **Visual Studio Code (VSC)**.
2. Ve a **Archivo > Abrir carpeta...** y selecciona la carpeta:
   `base-visualizacion-web`
3. Para previsualizar:
   - **Opción A (Recomendada con Live Server):** Haz clic derecho sobre `index.html` y selecciona **"Open with Live Server"**.
   - **Opción B (Directa sin extensiones):** Haz doble clic sobre el archivo `index.html` en el explorador de archivos de Windows. Funcionará de inmediato gracias al motor de datos dual sin bloqueos de seguridad.

---

## 📂 Estructura de Archivos
- **`index.html`**:
  - **Pantalla 1 (Introducción):** Bienvenida inmersiva con ondas acuareladas armónicas generativas y botón «Comenzar».
  - **Pantalla 2 (Visualización Principal):**
    - **Filtros sonoros (esquina superior derecha):** 4 categorías (*Tránsito, Maquinarias, Personas, Naturaleza*) con colores oficiales, interruptores individuales y reproducción de textura ambiental (Web Audio API).
    - **Capa Superior (Intensidad Percibida):** Manchas orgánicas de acuarela y calibres del instrumento (28 mm, 70 mm, 95 mm) a lo largo del tiempo.
    - **Capa Inferior (Decibeles Medidos):** Puntos y rangos Leq reales medidos por sonómetros en el mismo eje temporal compartido.
    - **Guía sincronizada e Inspector de Momento:** Conexión vertical interactiva que compara en vivo lo percibido vs lo medido.
    - **Línea de tiempo de 3 Momentos del Día:** Mañana (09:40-12:35), Tarde (13:50-17:00) y Hora Punta Vespertina (17:10-18:50) con resúmenes metodológicos detallados.
- **`about.html`**: Documentación académica y proyectual completa: marco metodológico, rigor del cálculo no lineal de decibeles, síntesis de hallazgos (la paradoja restauradora de Muelle Prat vs la saturación de Plaza Sotomayor) y créditos.
- **`css/style.css`**: Dirección de arte editorial, orgánica y contemporánea, con tipografía unificada **Merriweather Sans** (con títulos en Negrita / Bold), paleta cromática oficial y variables CSS.
- **`js/script.js`**: Motor de visualización en Canvas, sincronización temporal milimétrica, generador de audio procedural para cada categoría y manejo de filtros.
- **`assets/data/`**:
  - `datos_paisaje_sonoro.json`: Dataset estructurado completo con los 40 registros de campo, 20 encuestas y 32 fichas participativas.
  - `data.js`: Versión embebida para navegación local libre de restricciones CORS.
