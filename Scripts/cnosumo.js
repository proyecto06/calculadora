// Variables globales
let aparatos = []; // Almacena los dispositivos del catálogo para el autocompletado
let aparatosMap = new Map(); // Índice para búsqueda eficiente por nombre
let aparatosSeleccionados = []; // Dispositivos seleccionados por el usuario
let estadoConsumo = {}; // Almacena los resultados del último cálculo para desacoplar la exportación del DOM

// Función para exportar a PDF
function exportarAPDF(datos) {
    console.log('Datos para PDF:', datos); // Para debug
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const diasMes = window.appConfig.diasMes;
    const currentUser = JSON.parse(localStorage.getItem('app:currentUser'));
    const fecha = new Date();
    const fechaFormateada = `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()}`;
    const nombreArchivo = `Consumo_${fecha.getFullYear()}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}-${fecha.getDate().toString().padStart(2, '0')}.pdf`;

    // Título del documento
    doc.setFontSize(20);
    doc.text('Reporte de Censo de Carga', 105, 20, { align: 'center' });

    // Información del usuario y fecha
    doc.setFontSize(10);
    doc.text(`Generado por: ${currentUser ? currentUser.username : 'N/A'}`, 14, 30);
    doc.text(`Fecha: ${fechaFormateada}`, 196, 30, { align: 'right' });


    // Lista de aparatos seleccionados
    doc.setFontSize(12);
    doc.text('Aparatos Seleccionados:', 14, 40);

    // Tabla de aparatos
    const aparatosData = aparatosSeleccionados.map(a => {
        // Usar el consumo mensual como base para los cálculos
        const consumoMensualTotal = (a.vatios * a.cantidad * a.horasDiarias * diasMes) / a.factorPotencia / 1000;
        const consumoDiarioTotal = consumoMensualTotal / diasMes;

        return [
            a.nombre,
            a.vatios * a.cantidad, // Potencia total por tipo de aparato
            a.factorPotencia.toFixed(2),
            a.cantidad,
            a.voltaje + 'V',
            a.horasDiarias.toFixed(1),
            consumoDiarioTotal,
            consumoMensualTotal
        ];
    });

    // Calcular totales
    const totalPotencia = aparatosData.reduce((sum, a) => sum + a[1], 0);
    const totalConsumoDiario = aparatosData.reduce((sum, a) => sum + a[6], 0);
    const totalConsumoMensual = aparatosData.reduce((sum, a) => sum + a[7], 0);

    // Formatear datos para la tabla
    const bodyData = aparatosData.map(a => [
        a[0],
        `${a[1]}W`,
        a[2],
        a[3],
        a[4],
        a[5],
        a[6].toFixed(2),
        a[7].toFixed(2)
    ]);

    const footerData = [
        ['TOTAL',
         `${totalPotencia}W`,
         '',
         aparatosSeleccionados.reduce((sum, a) => sum + a.cantidad, 0), // Suma total de cantidades
         '', // Columna de Voltaje vacía en el total
         '',
         totalConsumoDiario.toFixed(2),
         totalConsumoMensual.toFixed(2)
        ]
    ];

    doc.autoTable({
        head: [['Dispositivo', 'Potencia', 'FP', 'Cant.', 'Voltaje', 'H/D', 'Cons. Diario Total\n(kWh)', 'Cons. Mens. Total\n(kWh)']],
        body: bodyData,
        foot: footerData, // El pie de página con los totales
        startY: 45, // Ajustar la posición inicial de la tabla
        margin: { top: 35 },
        headStyles: { halign: 'center', valign: 'middle' },
        footStyles: { halign: 'center', fontStyle: 'bold' },
        columnStyles: {
            0: { fontStyle: 'bold' }, // 'TOTAL' en negrita
            1: { halign: 'center' }, // Potencia
            2: { halign: 'center' }, // FP
            3: { halign: 'center' }, // Cant.
            4: { halign: 'center' }, // Voltaje
            5: { halign: 'center' }, // H/D
            6: { halign: 'center' }, // Cons. Diario Total
            7: { halign: 'center' }  // Cons. Mens. Total
        }
    });

    // Parámetros técnicos
    const finalY = doc.lastAutoTable.finalY || 35;




    // Descargar el PDF con el nombre de archivo dinámico
    doc.save(nombreArchivo);
}

// Configuración inicial de eventos
document.addEventListener('DOMContentLoaded', function() {
    // Evento para exportar a PDF.
    // El botón #exportar-pdf se crea dinámicamente en la función calcularConsumo().
    $(document).on('click', '#exportar-pdf', function() {
        if (aparatosSeleccionados.length === 0) {
            alert('Por favor, seleccione al menos un aparato antes de exportar.');
            return;
        }

        // Ya no se leen los valores del DOM. Se usa el objeto 'estadoConsumo' que se guarda al calcular.
        console.log('Exportando con datos de estadoConsumo:', estadoConsumo);
        exportarAPDF(estadoConsumo);
    });

    document.getElementById('boton-limpiar').addEventListener('click', limpiarTodo);
    // El evento 'change' en 'dias-mes' ya no es necesario aquí, se gestiona desde la configuración
    document.getElementById('boton-calcular').addEventListener('click', calcularConsumo);
});

// Función para refrescar el autocompletado desde el módulo de artefactos
window.refreshAutocompleteFromArtifacts = function(artifactsData) {
    // Mapear datos del catálogo al formato de `aparatos`
    aparatos = artifactsData.map(a => ({
        nombre: a.value,
        vatios: a.vatios,
        factorPotencia: a.factorPotencia,
        horasDiarias: a.horasDiarias,
        fase: a.fase,
        voltaje: a.voltaje
    }));

    // Actualizar el índice para búsqueda eficiente
    aparatosMap = new Map(aparatos.map(a => [a.nombre, a]));

    // Reconfigurar el autocompletado con la nueva fuente de datos
    configurarAutocompletado();
};

// Función de utilidad para debounce
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Configurar autocompletado de dispositivos
function configurarAutocompletado() {
    $("#lista-aparatos").autocomplete({
        source: aparatos.map(a => ({
            label: `${a.nombre} (${a.vatios}W, ${a.voltaje}V)`,
            value: a.nombre
        })),
        minLength: 2, // Empezar a buscar después de 2 caracteres
        delay: 250, // Debounce de 250ms incorporado en jQuery UI Autocomplete
        focus: (e, ui) => {
            e.preventDefault();
            $(this).val(ui.item.label);
        },
        select: (e, ui) => {
            e.preventDefault();
            // La lista de artefactos ya está "memoizada" en la variable `aparatosMap` para un acceso rápido.
            // No se lee de localStorage en cada búsqueda.
            const dispositivo = aparatosMap.get(ui.item.value);
            if (dispositivo) agregarDispositivo(dispositivo);
            $(this).val('');
        }
    });
}

// Agregar dispositivo a la lista seleccionada
function agregarDispositivo(dispositivo) {
    const existente = aparatosSeleccionados.find(a => a.nombre === dispositivo.nombre);
    if (existente) {
        existente.cantidad++; // Incrementar cantidad si ya existe
    } else {
        aparatosSeleccionados.push({ ...dispositivo, cantidad: 1 }); // Agregar nuevo
    }
    actualizarInterfaz();
}

// Función para limpiar toda la selección
function limpiarTodo() {
    aparatosSeleccionados = [];
    actualizarInterfaz();
    $('#lista-aparatos').val('');
    estadoConsumo = {}; // Limpiar el estado de los resultados
    $('#exportar-pdf').addClass('oculto'); // Ocultar el botón de exportar
    $('#resultado').empty();
    document.getElementById('boton-limpiar').style.display = 'none';
}

// Actualizar interfaz con dispositivos seleccionados
function actualizarInterfaz() {
    console.time('actualizarInterfaz'); // Medir rendimiento
    const contenedor = $('#items-seleccionados').empty();
    // Obtener días por mes desde la configuración global
    const diasMes = appConfig.diasMes;

    aparatosSeleccionados.forEach((aparato, indice) => {
        // Calcular consumo mensual por dispositivo
        const consumo = (aparato.vatios * aparato.cantidad * aparato.horasDiarias * diasMes) /
                       aparato.factorPotencia / 1000;

        // Crear HTML para cada dispositivo
        const fila = $(`
            <div class="fila-item" data-indice="${indice}">
                <div><strong>${aparato.nombre}</strong></div>
                <div class="consumo-detalle">
                    ${aparato.vatios}W × ${aparato.cantidad} und ×
                    ${aparato.horasDiarias}h/día × FP ${aparato.factorPotencia}
                </div>
                <div style="margin-top: 10px;">
                    <label for="cantidad-${indice}">Cantidad:</label>
                    <input type="number" value="${aparato.cantidad}"
                           id="cantidad-${indice}" class="input-cantidad" min="1">

                    <label for="horas-${indice}">Horas/Día:</label>
                    <input type="number" value="${aparato.horasDiarias.toFixed(1)}"
                           id="horas-${indice}" class="input-horas" step="0.1" min="0">

                    <button class="boton-remover" style="background: #dc3545;">Eliminar</button>
                </div>
                <div style="margin-top: 5px; color: #d63384;">
                    Consumo mensual: <strong class="consumo-item">${consumo.toFixed(2)} kWh</strong>
                </div>
            </div>
        `);

        contenedor.append(fila);
    });

    // Configurar eventos para modificar valores
    // Usamos 'input' para una respuesta más rápida y lo combinamos con debounce para optimizar.
    const debouncedUpdate = debounce(function(inputElement) {
        const indice = $(this).closest('.fila-item').data('indice');
        const fila = $(this).closest('.fila-item');
        const esCantidad = $(this).hasClass('input-cantidad');

        if (esCantidad) {
            aparatosSeleccionados[indice].cantidad = Math.max(parseInt(this.value) || 1, 1);
        } else {
            const valor = parseFloat(this.value) || 0;
            aparatosSeleccionados[indice].horasDiarias = Math.max(valor, 0);
        }

        // Recalcular y actualizar solo el consumo del item modificado, sin redibujar todo.
        const aparato = aparatosSeleccionados[indice];
        const nuevoConsumo = (aparato.vatios * aparato.cantidad * aparato.horasDiarias * diasMes) / aparato.factorPotencia / 1000;
        fila.find('.consumo-item').text(`${nuevoConsumo.toFixed(2)} kWh`);
        
        // Actualizar el detalle visual
        fila.find('.consumo-detalle').html(`
            ${aparato.vatios}W × ${aparato.cantidad} und ×
            ${aparato.horasDiarias}h/día × FP ${aparato.factorPotencia}
        `);

    }, 250);

    $('.input-cantidad, .input-horas').off('input').on('input', debouncedUpdate);

    $('.boton-remover').off('click').on('click', function() {
        const indice = $(this).closest('.fila-item').data('indice');
        aparatosSeleccionados.splice(indice, 1);
        actualizarInterfaz();
    });

    $('#boton-calcular').toggleClass('oculto', aparatosSeleccionados.length === 0);
    document.getElementById('boton-limpiar').style.display = aparatosSeleccionados.length > 0 ? 'inline-block' : 'none';
    console.timeEnd('actualizarInterfaz');
}

// Función principal de cálculo
function calcularConsumo() {
    // Obtener parámetros de entrada desde el objeto de configuración global
    const diasMes = window.appConfig.diasMes;
    const costoKwh = window.appConfig.costoKwh;
    const costoKva = window.appConfig.costoKva;
    const iva = window.appConfig.ivaPorcentaje;
    const valordolar = window.appConfig.valorDolar;

    // Variables de cálculo
    let potenciaActivaKwTotal = 0, consumoKwhMesTotal = 0, potenciaAparenteKvaTotal = 0;

    // Procesar cada dispositivo seleccionado
    aparatosSeleccionados.forEach(a => {
        const watts = a.vatios * a.cantidad;
        const horas = a.horasDiarias * diasMes;

        potenciaActivaKwTotal += watts / 1000;
        consumoKwhMesTotal += (watts * horas) / 1000 / a.factorPotencia;
        potenciaAparenteKvaTotal += (watts / a.factorPotencia) / 1000;
    });

    // Cálculo de parámetros concretos
    const ctcKva = Math.max(potenciaAparenteKvaTotal, 1);  // CTC mínimo 1 kVA
    const dacKva = ctcKva <= 5 ? ctcKva : Math.max(ctcKva * 0.4, 5);  // Cálculo de DAC

    // Cálculos financieros
    const costos = calcularCostos({
        consumoKwhMes: consumoKwhMesTotal,
        dacKva: dacKva,
        costoKwh,
        costoKva,
        iva,
        dolar: valordolar
    });

    // Calcular tarifas
    const tarifaResidencial = calcularTarifaResidencial(consumoKwhMesTotal);
    const tarifaComercial = calcularTarifaComercial(ctcKva);

    // Guardar los resultados en el objeto de estado global para la exportación
    estadoConsumo = {
        ctcKva: ctcKva,
        dacKva: dacKva,
        consumoKwhMes: consumoKwhMesTotal,
        consumoKwhDia: consumoKwhMesTotal / window.appConfig.diasMes
    };

    // Mostrar resultados en formato estructurado
    $('#resultado').html(`
        <div style="margin-bottom: 20px;">
            <h3>Resultados Finales</h3>
        </div>
        <div class="contenedor-resultados">
            <!-- Caja 1 - Potencia y Tarifas -->
            <div class="caja-resultado">
                <h4 class="titulo-caja">Potencia y Tarifas</h4>
                <div class="consumo-detalle">
                     <p class="item-resultado">
                        <span class="etiqueta">Aparente Total:</span>
                        <span class="valor">${potenciaAparenteKvaTotal.toFixed(2)} kVA</span>
                    </p>
                    <p class="item-resultado">
                        <span class="etiqueta">Activa Total:</span>
                        <span class="valor">${(potenciaActivaKwTotal * 1000).toLocaleString()} W</span>
                    </p>
                    <p class="item-resultado">
                        <span class="etiqueta">Tarifa Residencial:</span>
                        <span class="valor valor-tarifa">${tarifaResidencial}</span>
                    </p>
                    <p class="item-resultado">
                        <span class="etiqueta">Tarifa Comercial:</span>
                        <span class="valor valor-tarifa">${tarifaComercial}</span>
                    </p>
                </div>
            </div>

            <!-- Caja 2 - Parámetros Técnicos -->
            <div class="caja-resultado">
                <h4 class="titulo-caja">Parámetros Técnicos</h4>
                <div class="consumo-detalle">
                    <p class="item-resultado">
                        <span class="etiqueta">CTC:</span>
                        <span class="valor">${estadoConsumo.ctcKva.toFixed(2)} kVA</span>
                    </p>
                    <p class="item-resultado">
                        <span class="etiqueta">DAC:</span>
                        <span class="valor">${estadoConsumo.dacKva.toFixed(2)} kVA</span>
                    </p>
                    <p class="item-resultado">
                        <span class="etiqueta">Consumo Mensual:</span>
                        <span class="valor-destacado">${estadoConsumo.consumoKwhMes.toFixed(2)} kWh/mes</span>
                    </p>
                    <p class="item-resultado">
                        <span class="etiqueta">Consumo Diario:</span>
                        <span class="valor-destacado">${estadoConsumo.consumoKwhDia.toFixed(2)} kWh/día</span>
                    </p>
                </div>
            </div>


            <!-- Caja 3 - Costos -->
            <div class="caja-resultado">
                <h4 class="titulo-caja">Detalles de Costos</h4>
                <div class="consumo-detalle">
                     <p class="item-resultado">
                        <span class="etiqueta"> Por Demanda DAC:</span>
                        <span class="valor">$${costos.costoPorDemandaUsd}</span>
                    </p>
                      <p class="item-resultado">
                        <span class="etiqueta">Por Kwh:</span>
                        <span class="valor">$${costos.costoPorConsumoUsd}</span>
                    </p>
                    <p class="item-resultado">
                        <span class="etiqueta">IVA (${iva}%):</span>
                        <span class="valor">$${costos.costoIvaUsd}</span>
                    </p>
                    <p class="item-resultado-total">
                        <span class="etiqueta-total">Por mes $ (USD):</span>
                        <span class="valor-total">$${costos.costoTotalUsd}</span>
                    </p>
                    <p class="item-resultado-total">
                        <span class="etiqueta-total">Por mes (Bs):</span>
                        <span class="valor-total">${costos.costoTotalBs} Bs</span>
                    </p>
                </div>
            </div>
        </div>
    `);

    // Mostrar el botón de exportar ahora que hay resultados
    $('#exportar-pdf').removeClass('oculto');
}