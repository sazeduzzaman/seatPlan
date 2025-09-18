const container = document.getElementById("canvas-container");
const canvas = new fabric.Canvas("seatCanvas", {
  selection: true,
  preserveObjectStacking: true,
});
const gridSize = 20;

// Seat types
let seatTypes = {
  Standard: "#4caf50",
  VIP: "#FFD700",
  Hold: "#00BFFF",
  Disabled: "#aaa",
};

function refreshTypeSelect() {
  const sel = document.getElementById("typeInput");
  sel.innerHTML = "";
  Object.keys(seatTypes).forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    sel.appendChild(opt);
  });
}
refreshTypeSelect();

document.getElementById("addTypeBtn").onclick = () => {
  const name = document.getElementById("newTypeName").value.trim();
  const color = document.getElementById("newTypeColor").value;
  if (name) {
    seatTypes[name] = color;
    refreshTypeSelect();
    document.getElementById("newTypeName").value = "";
  }
};

// Grid background
function setGridBackground() {
  const gridCanvas = document.createElement("canvas");
  gridCanvas.width = canvas.getWidth();
  gridCanvas.height = canvas.getHeight();
  const ctx = gridCanvas.getContext("2d");
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(0, 0, gridCanvas.width, gridCanvas.height);
  ctx.strokeStyle = "#ddd";
  for (let i = 0; i < gridCanvas.width; i += gridSize) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, gridCanvas.height);
    ctx.stroke();
  }
  for (let j = 0; j < gridCanvas.height; j += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, j);
    ctx.lineTo(gridCanvas.width, j);
    ctx.stroke();
  }
  canvas.setBackgroundImage(
    gridCanvas.toDataURL(),
    canvas.renderAll.bind(canvas)
  );
}

function resizeCanvas() {
  canvas.setWidth(container.clientWidth);
  canvas.setHeight(container.clientHeight);
  setGridBackground();
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Zoom
canvas.on("mouse:wheel", function (opt) {
  if (!opt.e.ctrlKey) return;
  let zoom = canvas.getZoom();
  zoom *= 0.999 ** opt.e.deltaY;
  zoom = Math.min(Math.max(0.5, zoom), 3);
  canvas.setZoom(zoom);
  opt.e.preventDefault();
  opt.e.stopPropagation();
});

// Debounce
function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

// Sections
const sectionCountInput = document.getElementById("sectionCountInput");
const sectionTabs = document.getElementById("sectionTabs");
const sectionTabContent = document.getElementById("sectionTabContent");
let sections = [];

function renderSectionInputs() {
  sections = [];
  sectionTabs.innerHTML = "";
  sectionTabContent.innerHTML = "";
  const count = parseInt(sectionCountInput.value) || 1;
  for (let i = 0; i < count; i++) {
    const tabButton = document.createElement("li");
    tabButton.className = "nav-item";
    tabButton.innerHTML = `<button class="nav-link ${
      i === 0 ? "active" : ""
    }" data-bs-toggle="tab" data-bs-target="#sectionTab${i}">Section ${
      i + 1
    }</button>`;
    sectionTabs.appendChild(tabButton);

    const tabPane = document.createElement("div");
    tabPane.className = `tab-pane fade ${i === 0 ? "show active" : ""}`;
    tabPane.id = `sectionTab${i}`;
    tabPane.innerHTML = `
      <div class="section-inputs">
        <label>Section ${i + 1} Name</label>
        <input type="text" class="form-control sectionNameInput" value="Section ${
          i + 1
        }">
        <label>Rows</label>
        <input type="number" class="form-control sectionRows" value="5">
        <label>Columns</label>
        <input type="number" class="form-control sectionCols" value="10">
        <label>Start Column</label>
        <input type="number" class="form-control sectionColStart" value="1">
      </div>`;
    sectionTabContent.appendChild(tabPane);

    const nameInput = tabPane.querySelector(".sectionNameInput");
    const rowsInput = tabPane.querySelector(".sectionRows");
    const colsInput = tabPane.querySelector(".sectionCols");
    const colStartInput = tabPane.querySelector(".sectionColStart");

    [nameInput, rowsInput, colsInput, colStartInput].forEach((inp) =>
      inp.addEventListener("input", debounce(drawSeats, 300))
    );

    sections.push({
      name: nameInput.value,
      rows: parseInt(rowsInput.value),
      cols: parseInt(colsInput.value),
      colStart: parseInt(colStartInput.value),
      nameInput,
      rowsInput,
      colsInput,
      colStartInput,
    });
  }
}

sectionCountInput.addEventListener("input", renderSectionInputs);
renderSectionInputs();

// Create seat
function createSeat(
  x,
  y,
  row,
  col,
  type = "Standard",
  price = 0,
  floor = "",
  section = "",
  seatName = ""
) {
  const circle = new fabric.Circle({
    left: x,
    top: y,
    radius: 15,
    fill: seatTypes[type],
    stroke: "#333",
    strokeWidth: 1,
    originX: "center",
    originY: "center",
  });
  const labelText = seatName || row + col;
  const label = new fabric.Text(labelText, {
    fontSize: 12,
    originX: "center",
    originY: "center",
    top: y,
    left: x,
    selectable: false,
  });
  const group = new fabric.Group([circle, label], {
    left: x,
    top: y,
    hasControls: false,
    lockScalingFlip: true,
  });
  group.customProps = {
    row,
    col,
    type,
    price,
    floor,
    section,
    seatName: labelText,
  };
  return group;
}

// Draw seats
function drawSeats() {
  canvas.renderOnAddRemove = false;
  canvas.getObjects().forEach((o) => {
    if (o.customProps || o.sectionLabel) canvas.remove(o);
  });

  let startX = 50,
    startY = 50,
    gapX = 40,
    gapY = 40,
    sectionGap = 60;
  const floorVal = document.getElementById("floorInput").value;

  sections.forEach((sec) => {
    sec.name = sec.nameInput.value;
    sec.rows = parseInt(sec.rowsInput.value);
    sec.cols = parseInt(sec.colsInput.value);
    sec.colStart = parseInt(sec.colStartInput.value);
  });

  sections.forEach((sec) => {
    const sectionLabel = new fabric.Text(sec.name, {
      left: startX + (sec.cols * gapX) / 2,
      top: startY - 30,
      fontSize: 18,
      fontWeight: "bold",
      originX: "center",
      fill: "#333",
      selectable: true,
    });
    sectionLabel.sectionLabel = true;
    canvas.add(sectionLabel);

    for (let r = 0; r < sec.rows; r++) {
      for (let c = 0; c < sec.cols; c++) {
        const seatName = String.fromCharCode(65 + r) + (sec.colStart + c);
        const seat = createSeat(
          startX + c * gapX,
          startY + r * gapY,
          String.fromCharCode(65 + r),
          sec.colStart + c,
          "Standard",
          0,
          floorVal,
          sec.name,
          seatName
        );
        canvas.add(seat);
      }
    }

    startX += sec.cols * gapX + sectionGap;
  });

  canvas.renderOnAddRemove = true;
  canvas.renderAll();
}

document.getElementById("drawSeatsBtn").onclick = drawSeats;

// Single seat
document.getElementById("drawSeatBtn").onclick = () => {
  const seat = createSeat(
    100,
    100,
    document.getElementById("rowInput").value,
    document.getElementById("numInput").value,
    document.getElementById("typeInput").value,
    parseFloat(document.getElementById("priceInput").value) || 0,
    document.getElementById("floorInput").value,
    document.getElementById("sectionInputSidebar").value,
    document.getElementById("seatNameInput").value
  );
  canvas.add(seat);
  canvas.renderAll();
};

// Delete
document.getElementById("deleteBtn").onclick = () => {
  canvas.getActiveObjects().forEach((o) => canvas.remove(o));
  canvas.discardActiveObject();
  canvas.renderAll();
};
document.addEventListener("keydown", (e) => {
  if (e.key === "Delete" || e.key === "Backspace") {
    canvas.getActiveObjects().forEach((o) => canvas.remove(o));
    canvas.discardActiveObject();
    canvas.renderAll();
  }
});

// Update sidebar
canvas.on("selection:created", updateSidebar);
canvas.on("selection:updated", updateSidebar);
canvas.on("selection:cleared", () => {
  document.getElementById("sectionInputSidebar").value = "";
});

function updateSidebar() {
  const objs = canvas.getActiveObjects();
  if (objs.length > 0 && objs[0].customProps) {
    const seat = objs[0].customProps;
    document.getElementById("sectionInputSidebar").value = seat.section;
    document.getElementById("rowInput").value = seat.row;
    document.getElementById("numInput").value = seat.col;
    document.getElementById("seatNameInput").value = seat.seatName;
    document.getElementById("typeInput").value = seat.type;
    document.getElementById("priceInput").value = seat.price;
  }
}

// Apply type/color and price without overwriting seat names
["typeInput", "priceInput"].forEach((id) => {
  document.getElementById(id).addEventListener("input", () => {
    const objs = canvas.getActiveObjects();
    objs.forEach((obj) => {
      if (obj.customProps) {
        obj.customProps.type = document.getElementById("typeInput").value;
        obj.customProps.price =
          parseFloat(document.getElementById("priceInput").value) || 0;
        obj.item(0).set("fill", seatTypes[obj.customProps.type]);
      }
    });
    canvas.renderAll();
  });
});

// Export grouped JSON
// Export all seats as a flat array
document.getElementById("exportBtn").onclick = () => {
  const floors = {};

  canvas.getObjects().forEach((o, index) => {
    if (!o.customProps) return;

    const floorName = o.customProps.floor || "Unassigned Floor";
    const sectionName = o.customProps.section || "Unassigned Section";
    const rowName = o.customProps.row || "Unassigned Row";
    const shape = o.customProps.shape || "Rectangle"; // assume you store shape per seat or section

    if (!floors[floorName])
      floors[floorName] = {
        id: Object.keys(floors).length + 1,
        floor: floorName,
        sections: {},
      };
    if (!floors[floorName].sections[sectionName])
      floors[floorName].sections[sectionName] = {
        sectionName,
        shape,
        rows: {},
      };
    if (!floors[floorName].sections[sectionName].rows[rowName])
      floors[floorName].sections[sectionName].rows[rowName] = [];

    floors[floorName].sections[sectionName].rows[rowName].push({
      id: index + 1,
      seatName: o.customProps.seatName,
      type: o.customProps.type,
      price: o.customProps.price,
      status: o.customProps.status || "active",
      left: o.left,
      top: o.top,
    });
  });

  // Format output
  const exportData = Object.values(floors).map((floor) => {
    const sections = Object.values(floor.sections).map((section) => {
      const rows = Object.keys(section.rows).map((rowName) => ({
        row: rowName,
        seats: section.rows[rowName],
      }));
      return { sectionName: section.sectionName, shape: section.shape, rows };
    });
    return { id: floor.id, "Floor Name": floor.floor, sections };
  });

  console.log(JSON.stringify(exportData, null, 2));
  alert("Exported JSON logged to console!");
};

setGridBackground();
