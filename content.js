(() => {
  let canvas = null;
  let ctx = null;
  let highlightCanvas = null;
  let highlightCtx = null;
  let statusEl = null;
  let isActive = false;
  let currentTool = "pencil";
  let isDrawing = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let imageData = null;
  let history = [];
  let historyIndex = -1;
  let highlightPath = [];

  const STROKE_COLOR = "#ff0000";
  const STROKE_WIDTH = 3;
  const HIGHLIGHT_COLOR = "#ffff00";
  const HIGHLIGHT_WIDTH = 20;

  function init() {
    if (canvas) return;

    highlightCanvas = document.createElement("canvas");
    highlightCanvas.id = "annotator-highlight-canvas";
    document.body.appendChild(highlightCanvas);

    highlightCtx = highlightCanvas.getContext("2d");
    highlightCtx.strokeStyle = HIGHLIGHT_COLOR;
    highlightCtx.lineWidth = HIGHLIGHT_WIDTH;
    highlightCtx.lineCap = "round";
    highlightCtx.lineJoin = "round";

    canvas = document.createElement("canvas");
    canvas.id = "annotator-canvas";
    document.body.appendChild(canvas);

    ctx = canvas.getContext("2d");
    ctx.strokeStyle = STROKE_COLOR;
    ctx.lineWidth = STROKE_WIDTH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    statusEl = document.createElement("div");
    statusEl.id = "annotator-status";
    statusEl.style.display = "none";
    document.body.appendChild(statusEl);

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("scroll", resizeCanvas);

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseUp);
    document.addEventListener("keydown", onKeyDown, true);
  }

  function resizeCanvas() {
    if (!canvas) return;

    // Temporarily hide canvases to get true document size
    canvas.style.display = "none";
    highlightCanvas.style.display = "none";
    const scrollWidth = Math.max(
      document.body.scrollWidth,
      document.documentElement.scrollWidth,
      document.body.offsetWidth,
      document.documentElement.clientWidth
    );
    const scrollHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight
    );
    canvas.style.display = "";
    highlightCanvas.style.display = "";

    if (canvas.width === scrollWidth && canvas.height === scrollHeight) return;

    const oldData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const oldHighlightData = highlightCtx.getImageData(0, 0, highlightCanvas.width, highlightCanvas.height);

    canvas.width = scrollWidth;
    canvas.height = scrollHeight;
    highlightCanvas.width = scrollWidth;
    highlightCanvas.height = scrollHeight;

    ctx.putImageData(oldData, 0, 0);
    ctx.strokeStyle = STROKE_COLOR;
    ctx.lineWidth = STROKE_WIDTH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    highlightCtx.putImageData(oldHighlightData, 0, 0);
    highlightCtx.strokeStyle = HIGHLIGHT_COLOR;
    highlightCtx.lineWidth = HIGHLIGHT_WIDTH;
    highlightCtx.lineCap = "round";
    highlightCtx.lineJoin = "round";
  }

  function toggle() {
    isActive = !isActive;
    if (isActive) {
      init();
      canvas.classList.add("active");
      highlightCanvas.classList.add("active");
      statusEl.style.display = "block";
      updateStatus();
    } else if (canvas) {
      canvas.classList.remove("active");
      highlightCanvas.classList.remove("active");
      statusEl.style.display = "none";
      clearCanvas();
    }
  }

  function updateStatus() {
    const toolNames = {
      pencil: "Pencil (d)",
      line: "Line (f)",
      arrow: "Arrow (a)",
      square: "Square (s)",
      highlighter: "Highlighter (h)",
    };
    statusEl.textContent = `Tool: ${toolNames[currentTool]} | u: undo | r: redo | c: clear | Esc: exit`;
  }

  function saveState() {
    history = history.slice(0, historyIndex + 1);
    history.push({
      main: ctx.getImageData(0, 0, canvas.width, canvas.height),
      highlight: highlightCtx.getImageData(0, 0, highlightCanvas.width, highlightCanvas.height),
    });
    historyIndex++;
    if (history.length > 50) {
      history.shift();
      historyIndex--;
    }
  }

  function undo() {
    if (historyIndex > 0) {
      historyIndex--;
      ctx.putImageData(history[historyIndex].main, 0, 0);
      highlightCtx.putImageData(history[historyIndex].highlight, 0, 0);
    } else if (historyIndex === 0) {
      historyIndex = -1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      highlightCtx.clearRect(0, 0, highlightCanvas.width, highlightCanvas.height);
    }
  }

  function redo() {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      ctx.putImageData(history[historyIndex].main, 0, 0);
      highlightCtx.putImageData(history[historyIndex].highlight, 0, 0);
    }
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    highlightCtx.clearRect(0, 0, highlightCanvas.width, highlightCanvas.height);
    history = [];
    historyIndex = -1;
  }

  function getPos(e) {
    return {
      x: e.pageX,
      y: e.pageY,
    };
  }

  function onMouseDown(e) {
    if (!isActive) return;
    isDrawing = true;
    const pos = getPos(e);
    startX = pos.x;
    startY = pos.y;
    lastX = pos.x;
    lastY = pos.y;
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (currentTool === "pencil") {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
    } else if (currentTool === "highlighter") {
      highlightPath = [{ x: startX, y: startY }];
      imageData = highlightCtx.getImageData(0, 0, highlightCanvas.width, highlightCanvas.height);
    }
  }

  function onMouseMove(e) {
    if (!isActive || !isDrawing) return;
    const pos = getPos(e);

    if (currentTool === "pencil") {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else if (currentTool === "highlighter") {
      highlightPath.push({ x: pos.x, y: pos.y });
      highlightCtx.putImageData(imageData, 0, 0);
      highlightCtx.beginPath();
      highlightCtx.moveTo(highlightPath[0].x, highlightPath[0].y);
      for (let i = 1; i < highlightPath.length; i++) {
        highlightCtx.lineTo(highlightPath[i].x, highlightPath[i].y);
      }
      highlightCtx.stroke();
    } else {
      ctx.putImageData(imageData, 0, 0);
      ctx.beginPath();
      if (currentTool === "line") {
        ctx.moveTo(startX, startY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else if (currentTool === "arrow") {
        const headLength = 15;
        const angle = Math.atan2(pos.y - startY, pos.x - startX);
        // Main line
        ctx.moveTo(startX, startY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(
          pos.x - headLength * Math.cos(angle - Math.PI / 6),
          pos.y - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(
          pos.x - headLength * Math.cos(angle + Math.PI / 6),
          pos.y - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      } else if (currentTool === "square") {
        const width = pos.x - startX;
        const height = pos.y - startY;
        ctx.strokeRect(startX, startY, width, height);
      }
    }

    lastX = pos.x;
    lastY = pos.y;
  }

  function onMouseUp() {
    if (!isDrawing) return;
    isDrawing = false;
    imageData = null;
    highlightPath = [];
    ctx.strokeStyle = STROKE_COLOR;
    ctx.lineWidth = STROKE_WIDTH;
    saveState();
  }

  function onKeyDown(e) {
    if (!isActive) return;

    const handled = true;
    if (e.key === "d") {
      currentTool = "pencil";
      updateStatus();
    } else if (e.key === "f") {
      currentTool = "line";
      updateStatus();
    } else if (e.key === "a") {
      currentTool = "arrow";
      updateStatus();
    } else if (e.key === "s") {
      currentTool = "square";
      updateStatus();
    } else if (e.key === "h") {
      currentTool = "highlighter";
      updateStatus();
    } else if (e.key === "c") {
      clearCanvas();
    } else if (e.key === "u") {
      undo();
    } else if (e.key === "r") {
      redo();
    } else if (e.key === "Escape") {
      toggle();
    } else {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "toggle") {
      toggle();
    }
  });
})();
