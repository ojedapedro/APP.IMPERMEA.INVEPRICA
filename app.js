// app.js
// Requiere config.js con const API_BASE = "...";

(() => {
  // util
  const $ = id => document.getElementById(id);
  const q = (sel, ctx=document) => ctx.querySelector(sel);
  const qa = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  // elements
  const cedula = $('cedula');
  const nombre = $('nombre');
  const apellido = $('apellido');
  const direccion = $('direccion');
  const telefono = $('telefono');
  const observaciones = $('observaciones');
  const iva_input = $('iva_percent');

  const preview = $('preview');
  const fotos_input = $('fotos_input');
  const guardarBtn = $('guardar');
  const pdfBtn = $('generarPdf');

  let fotos = []; // {file, dataUrl}

  // inicial: agregar part-list containers
  const partLists = {
    materiales: document.querySelector('.part-list[data-type="materiales"]'),
    equipos: document.querySelector('.part-list[data-type="equipos"]'),
    mano_obra: document.querySelector('.part-list[data-type="mano_obra"]'),
  };

  // add partida
  document.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      const type = btn.getAttribute('data-add');
      addPartRow(type);
    });
  });

  function addPartRow(type, data={descripcion:"", cantidad:1, unidad:"u", precio_unitario:0}) {
    const container = partLists[type];
    const wrapper = document.createElement('div');
    wrapper.className = 'part-row';
    wrapper.innerHTML = `
      <input class="p-desc" placeholder="Descripción" value="${escapeHtml(data.descripcion)}" />
      <input class="p-cant" type="number" min="0" value="${data.cantidad}" />
      <input class="p-unid" placeholder="unidad" value="${escapeHtml(data.unidad)}" />
      <input class="p-pre" type="number" min="0" step="0.01" value="${data.precio_unitario}" />
      <button class="btn small remove">Eliminar</button>
    `;
    wrapper.style.display = 'grid';
    wrapper.style.gridTemplateColumns = '2fr 1fr 1fr 1fr 80px';
    wrapper.style.gap = '8px';
    container.appendChild(wrapper);
    wrapper.querySelector('.remove').addEventListener('click', () => {
      wrapper.remove(); calculateTotals();
    });
    wrapper.querySelectorAll('input').forEach(inp => inp.addEventListener('input', calculateTotals));
    calculateTotals();
  }

  // init with one row each
  addPartRow('materiales');
  addPartRow('equipos');
  addPartRow('mano_obra');

  // Fotos: preview y cargar
  fotos_input.addEventListener('change', (ev) => {
    const files = Array.from(ev.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = function(e) {
        fotos.push({ file, dataUrl: e.target.result });
        renderPreviews();
      };
      reader.readAsDataURL(file);
    });
    fotos_input.value = '';
  });

  function renderPreviews(){
    preview.innerHTML = '';
    fotos.forEach((f, idx) => {
      const div = document.createElement('div');
      div.className = 'preview-item';
      div.innerHTML = `<img src="${f.dataUrl}" /><div class="remove" data-idx="${idx}">✕</div>`;
      preview.appendChild(div);
    });
    qa('.preview-item .remove', preview).forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(btn.getAttribute('data-idx'));
        fotos.splice(idx,1); renderPreviews();
      });
    });
  }

  // calcular totales
  function getPartRows(type) {
    return qa('.part-list[data-type="'+type+'"] .part-row').map(row => {
      return {
        descripcion: row.querySelector('.p-desc').value.trim(),
        cantidad: Number(row.querySelector('.p-cant').value || 0),
        unidad: row.querySelector('.p-unid').value.trim(),
        precio_unitario: Number(row.querySelector('.p-pre').value || 0)
      };
    });
  }
  function sumPart(arr) {
    return arr.reduce((acc, it) => acc + (it.cantidad * it.precio_unitario), 0);
  }
  function calculateTotals() {
    const mat = getPartRows('materiales');
    const eq = getPartRows('equipos');
    const mano = getPartRows('mano_obra');
    const subMat = sumPart(mat);
    const subEq = sumPart(eq);
    const subMano = sumPart(mano);
    const iva = Number(iva_input.value || 0);
    const subtotal = subMat + subEq + subMano;
    const iva_total = +(subtotal * iva/100);
    const total = +(subtotal + iva_total);
    $('sub_materiales').innerText = subMat.toFixed(2);
    $('sub_equipos').innerText = subEq.toFixed(2);
    $('sub_mano').innerText = subMano.toFixed(2);
    $('iva_total').innerText = iva_total.toFixed(2);
    $('total_general').innerText = total.toFixed(2);
  }
  iva_input.addEventListener('input', calculateTotals);

  // Guardar en Google Sheets (llama al Apps Script)
  guardarBtn.addEventListener('click', async () => {
    guardarBtn.disabled = true;
    guardarBtn.innerText = 'Guardando...';

    try {
      // preparar fotos como base64 sin prefijo data:... ;js
      const fotosPayload = await Promise.all(fotos.map(async f => {
        const dataUrl = f.dataUrl;
        const parts = dataUrl.split(',');
        const meta = parts[0];
        const base64 = parts[1];
        const filename = f.file.name || ('foto-' + Date.now() + '.jpg');
        return { filename, data: base64 };
      }));

      const payload = {
        cedula_rif: cedula.value.trim(),
        nombre: nombre.value.trim(),
        apellido: apellido.value.trim(),
        direccion: direccion.value.trim(),
        telefono: telefono.value.trim(),
        observaciones: observaciones.value.trim(),
        desglose: {
          materiales: getPartRows('materiales'),
          equipos: getPartRows('equipos'),
          mano_obra: getPartRows('mano_obra')
        },
        iva_percent: Number(iva_input.value || 0),
        fotos: fotosPayload,
        usuario: "webapp",
        estado: "pendiente"
      };

      const resp = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await resp.json();
      if (data.ok) {
        alert('Guardado OK — ID: ' + data.inspeccion_id + '\nTotal: ' + data.total);
      } else {
        alert('Error guardando: ' + (data.error || 'Desconocido'));
      }
    } catch (err) {
      console.error(err);
      alert('Error en la petición: ' + err.message);
    } finally {
      guardarBtn.disabled = false;
      guardarBtn.innerText = 'Guardar en Google Sheets';
    }
  });

  // Generar PDF con jsPDF
  pdfBtn.addEventListener('click', async () => {
    pdfBtn.disabled = true;
    pdfBtn.innerText = 'Generando PDF...';
    try {
      // Build content
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      let y = 40;
      doc.setFontSize(16);
      doc.text("Informe de Inspección - Impermeabilización", 40, y);
      y += 22;
      doc.setFontSize(11);
      doc.text(`Cliente: ${cedula.value} — ${nombre.value} ${apellido.value}`, 40, y); y+=16;
      doc.text(`Tel: ${telefono.value}`, 40, y); y+=16;
      doc.text(`Dirección: ${direccion.value}`, 40, y); y+=20;
      doc.setFontSize(12);
      doc.text("Desglose:", 40, y); y += 14;

      const mat = getPartRows('materiales');
      const eq = getPartRows('equipos');
      const mano = getPartRows('mano_obra');

      function drawPart(title, arr) {
        doc.setFontSize(11);
        doc.text(title, 40, y); y+=14;
        if (arr.length===0) { doc.text("- (sin partidas)", 60, y); y+=12; }
        arr.forEach(it => {
          const line = `${it.descripcion} — ${it.cantidad} ${it.unidad} x ${Number(it.precio_unitario).toFixed(2)} = ${(it.cantidad*it.precio_unitario).toFixed(2)}`;
          doc.text(line, 60, y);
          y+=12;
          if (y > 740) { doc.addPage(); y=40; }
        });
        y+=8;
      }
      drawPart("Materiales", mat);
      drawPart("Equipos", eq);
      drawPart("Mano de obra", mano);

      // Totales
      const subMat = sumClientPart(mat);
      const subEq = sumClientPart(eq);
      const subMano = sumClientPart(mano);
      const iva = Number(iva_input.value || 0);
      const subtotal = subMat + subEq + subMano;
      const iva_total = +(subtotal * iva/100);
      const total = +(subtotal + iva_total);

      y += 4;
      doc.text(`Subtotal Materiales: ${subMat.toFixed(2)}`, 40, y); y+=12;
      doc.text(`Subtotal Equipos: ${subEq.toFixed(2)}`, 40, y); y+=12;
      doc.text(`Subtotal Mano de obra: ${subMano.toFixed(2)}`, 40, y); y+=12;
      doc.text(`IVA (${iva}%): ${iva_total.toFixed(2)}`, 40, y); y+=12;
      doc.setFontSize(13);
      doc.text(`TOTAL: ${total.toFixed(2)}`, 40, y); y+=20;

      // Observaciones
      doc.setFontSize(11);
      doc.text("Observaciones:", 40, y); y+=14;
      const obs = observaciones.value || "";
      const splitObs = doc.splitTextToSize(obs, 500);
      doc.text(splitObs, 60, y); y += (splitObs.length * 12) + 8;

      // Fotos: incrustar (scaled)
      for (let i=0;i<fotos.length;i++) {
        const img = fotos[i].dataUrl;
        // scale to fit page width
        const iw = 500; const ih = 300;
        if (y + ih > 760) { doc.addPage(); y = 40; }
        doc.addImage(img, 'JPEG', 60, y, iw, ih, undefined, 'FAST');
        y += ih + 10;
      }

      // Guardar PDF
      doc.save(`informe_inspeccion_${cedula.value || 'cliente'}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Error generando PDF: " + err.message);
    } finally {
      pdfBtn.disabled = false;
      pdfBtn.innerText = 'Generar PDF y Descargar';
    }
  });

  function sumClientPart(arr) {
    return arr.reduce((acc, it) => acc + (Number(it.cantidad||0)*Number(it.precio_unitario||0)), 0);
  }

  function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // recalc when any input changes inside part-lists
  qa('.part-list input').forEach(inp=>inp.addEventListener('input', calculateTotals));

})();



