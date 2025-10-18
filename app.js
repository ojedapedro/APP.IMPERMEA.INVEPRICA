// ==========================
// ImpermeApp - app.js
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form");
  const presupuesto = document.getElementById("presupuesto");
  const agregarFila = document.getElementById("agregarFila");
  const totalSpan = document.getElementById("total");
  const fotosInput = document.getElementById("fotos");
  const preview = document.getElementById("preview");
  const guardar = document.getElementById("guardar");
  const generarPdf = document.getElementById("generarPdf");

  let total = 0;
  let filas = [];

  // ==========================
  // 🧮 AGREGAR ÍTEMS DE PRESUPUESTO
  // ==========================
  agregarFila.addEventListener("click", () => {
    const row = document.createElement("div");
    row.classList.add("fila");
    row.innerHTML = `
      <input type="text" placeholder="Descripción">
      <input type="number" placeholder="Cantidad" value="1" min="0">
      <input type="number" placeholder="Precio unitario" value="0" min="0">
      <span class="subtotal">0</span>
      <button class="eliminar">🗑️</button>
    `;
    row.querySelectorAll("input").forEach(inp =>
      inp.addEventListener("input", calcularTotal)
    );
    row.querySelector(".eliminar").addEventListener("click", () => {
      row.remove();
      calcularTotal();
    });
    presupuesto.appendChild(row);
  });

  // ==========================
  // 💰 CALCULAR TOTALES
  // ==========================
  function calcularTotal() {
    let suma = 0;
    filas = [];

    document.querySelectorAll("#presupuesto .fila").forEach(row => {
      const inputs = row.querySelectorAll("input");
      const descripcion = inputs[0].value.trim();
      const cantidad = parseFloat(inputs[1].value) || 0;
      const precio = parseFloat(inputs[2].value) || 0;
      const subtotal = cantidad * precio;

      row.querySelector(".subtotal").textContent = subtotal.toFixed(2);
      suma += subtotal;

      if (descripcion) {
        filas.push({
          tipo: "General",
          descripcion,
          cantidad,
          precio,
          subtotal
        });
      }
    });

    total = suma;
    totalSpan.textContent = total.toFixed(2);
  }

  // ==========================
  // 🖼️ PREVISUALIZAR FOTOS
  // ==========================
  fotosInput.addEventListener("change", () => {
    preview.innerHTML = "";
    Array.from(fotosInput.files).forEach(file => {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      preview.appendChild(img);
    });
  });

  // ==========================
  // 💾 GUARDAR EN GOOGLE SHEETS
  // ==========================
  guardar.addEventListener("click", async () => {
    if (!form.cedula.value || !form.nombre.value) {
      alert("Por favor, complete los datos del cliente.");
      return;
    }

    const ivaPorcentaje = 16;
    const totalGeneral = total * (1 + ivaPorcentaje / 100);

    const data = {
      cedula: form.cedula.value,
      nombre: form.nombre.value,
      apellido: form.apellido.value,
      telefono: form.telefono.value,
      direccion: form.direccion.value,
      total: total,
      iva: ivaPorcentaje,
      total_general: totalGeneral,
      fecha: new Date().toLocaleDateString(),
      observaciones: document.getElementById("observaciones")?.value || "",
      desglose: filas
    };

    try {
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors", // requerido por Google Apps Script
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      alert("✅ Informe guardado correctamente en Google Sheets");
      form.reset();
      presupuesto.innerHTML = "";
      totalSpan.textContent = "0";
      preview.innerHTML = "";
      filas = [];
    } catch (error) {
      alert("⚠️ Error en la petición: " + error.message);
    }
  });

  // ==========================
  // 🧾 GENERAR PDF LOCAL
  // ==========================
  generarPdf.addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Informe de Inspección - Impermeabilización", 10, 15);

    doc.setFontSize(12);
    doc.text(`Cliente: ${form.nombre.value} ${form.apellido.value}`, 10, 30);
    doc.text(`Cédula/RIF: ${form.cedula.value}`, 10, 38);
    doc.text(`Teléfono: ${form.telefono.value}`, 10, 46);
    doc.text(`Dirección: ${form.direccion.value}`, 10, 54);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 10, 62);

    let y = 75;
    doc.text("Desglose de presupuesto:", 10, y);
    y += 10;

    filas.forEach((f, i) => {
      doc.text(`${i + 1}. ${f.descripcion} - Cant: ${f.cantidad} - Precio: ${f.precio} - Subtotal: ${f.subtotal}`, 10, y);
      y += 8;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    y += 10;
    doc.text(`Subtotal: Bs ${total.toFixed(2)}`, 10, y);
    y += 8;
    doc.text(`IVA (16%): Bs ${(total * 0.16).toFixed(2)}`, 10, y);
    y += 8;
    doc.text(`Total General: Bs ${(total * 1.16).toFixed(2)}`, 10, y);

    y += 15;
    doc.text("Observaciones:", 10, y);
    y += 8;
    const obs = document.getElementById("observaciones")?.value || "Ninguna";
    doc.text(doc.splitTextToSize(obs, 180), 10, y);

    doc.save(`informe_${form.nombre.value || "cliente"}.pdf`);
  });
});

