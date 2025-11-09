﻿
function mostrarError(mensaje) {
    const resultadoFacturas = document.getElementById('resultado-facturas');
    resultadoFacturas.innerHTML = `<p class="error-message">${mensaje}</p>`;
    resultadoFacturas.classList.remove('oculto');
    return false;
}

// Función para mostrar errores de validación inline
function mostrarErrorInline(inputId, mensaje) {
    const errorEl = document.getElementById(`${inputId}-error`);
    if (errorEl) {
        errorEl.textContent = mensaje;
    }
}

function limpiarErroresInline() {
    document.querySelectorAll('.error-message-inline').forEach(el => el.textContent = '');
}
document.addEventListener('DOMContentLoaded', function() {
    const formularioFechaInstalacion = document.getElementById('formulario-fecha-instalacion');
    const formularioCtc = document.getElementById('formulario-ctc');
    const calcularCtcBtn = document.getElementById('calcular-ctc');
    const botonLimpiarFacturas = document.getElementById('boton-limpiar-facturas');
    const resultadoFacturas = document.getElementById('resultado-facturas');
    const calcularFechaInstalacionBtn = document.getElementById('calcular-fecha-instalacion');
    const fechaInstalacionInput = document.getElementById('fecha-instalacion');
    const fechaActualInput = document.getElementById('fecha-actual');

    // Manejo de pestañas de facturación
    const factTabBtns = document.querySelectorAll('.fact-tab-btn');
    const factTabContents = document.querySelectorAll('.fact-tab-content');

    factTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remover clase active de todos los botones y contenidos
            factTabBtns.forEach(b => b.classList.remove('active'));
            factTabContents.forEach(c => c.style.display = 'none');
            
            // Agregar clase active al botón clickeado
            btn.classList.add('active');
            
            // Mostrar el contenido correspondiente
            const tabId = btn.getAttribute('data-tab');
            if (tabId === 'fecha-instalacion') {
                formularioFechaInstalacion.style.display = 'block';
                formularioCtc.style.display = 'none';
            } else if (tabId === 'ctc') {
                formularioFechaInstalacion.style.display = 'none';
                formularioCtc.style.display = 'block';
            }

            // Ocultar el botón limpiar al cambiar de subpestaña
            botonLimpiarFacturas.style.display = 'none';
            // Limpiar resultados al cambiar de pestaña
            resultadoFacturas.innerHTML = '';
        });
    });

    // Activar la primera pestaña por defecto (si existe)
    if (factTabBtns.length > 0) {
        factTabBtns[0].click();
    }

    // Función para mostrar modal de confirmación (retorna Promise<boolean>)
    function showConfirmModal(mensaje) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirm-modal');
            const msgEl = document.getElementById('confirm-modal-message');
            const okBtn = document.getElementById('confirm-modal-accept');
            const cancelBtn = document.getElementById('confirm-modal-cancel');
            if (!modal || !msgEl || !okBtn || !cancelBtn) {
                // Fallback a confirm() si el modal no está presente
                const r = window.confirm(mensaje);
                resolve(r);
                return;
            }

            msgEl.textContent = mensaje;
            modal.style.display = 'flex';
            document.addEventListener('keydown', handleConfirmModalFocusTrap); // Activar focus trap
            document.body.classList.add('modal-open'); // Bloquear scroll

            function cleanup(result) {
                document.body.classList.remove('modal-open'); // Desbloquear scroll
                modal.style.display = 'none';
                document.removeEventListener('keydown', handleConfirmModalFocusTrap); // Desactivar focus trap
                okBtn.removeEventListener('click', onOk);
                cancelBtn.removeEventListener('click', onCancel);
                resolve(result);
            }

            function onOk() { cleanup(true); }
            function onCancel() { cleanup(false); }

            okBtn.addEventListener('click', onOk);
            cancelBtn.addEventListener('click', onCancel);
        });
    }

    function handleConfirmModalFocusTrap(e) {
        if (e.key !== 'Tab') return;

        const modal = document.getElementById('confirm-modal');
        if (modal.style.display === 'none') return;

        const focusableElements = Array.from(modal.querySelectorAll('button'));
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) { // Shift + Tab
            if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
            }
        } else { // Tab
            if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    }

    // Evento para calcular por Carga Total Conectada (CTC)
    if (calcularCtcBtn) {
        calcularCtcBtn.addEventListener('click', function() {
            resultadoFacturas.innerHTML = ''; // Limpiar resultados previos

            const ctcInput = document.getElementById('ctc-input').value;
            const ctc = parseFloat(ctcInput);

            // Validaciones básicas
            if (!ctcInput) {
                return mostrarError('Por favor, ingrese un valor para CTC.');
            }

            if (isNaN(ctc)) {
                return mostrarError('El valor de CTC debe ser un número válido.');
            }

            if (ctc <= 0) {
                return mostrarError('El valor de CTC debe ser mayor que cero.');
            }

            // Validar límites razonables para CTC
            const ctcMinimo = 0.1; // 0.1 kVA como mínimo razonable
            const ctcMaximo = 5000; // 5000 kVA como máximo razonable

            if (ctc < ctcMinimo) {
                return mostrarError(`El valor de CTC (${ctc} kVA) es demasiado bajo. Debe ser al menos ${ctcMinimo} kVA.`);
            }

            if (ctc > ctcMaximo) {
                return mostrarError(`El valor de CTC (${ctc} kVA) es demasiado alto. Debe ser menor a ${ctcMaximo} kVA.`);
            }

            // Si todas las validaciones pasan, proceder con el cálculo
            calcularPorCargaTotalConectada();
        });
    }

    // --- Validación de Fechas en Tiempo Real ---
    function validarRangoFechas() {
        limpiarErroresInline();
        let esValido = true;

        const fechaInstalacion = new Date(fechaInstalacionInput.value);
        const fechaActual = new Date(fechaActualInput.value);

        // Validar que la fecha de instalación no sea posterior a la fecha actual
        if (fechaInstalacionInput.value && fechaActualInput.value && fechaInstalacion > fechaActual) {
            mostrarErrorInline('fecha-instalacion', 'La fecha de instalación no puede ser posterior a la fecha actual.');
            esValido = false;
        }

        // Validar que no sea una fecha futura
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0); // Normalizar a medianoche para comparar solo fechas
        if (fechaActualInput.value && fechaActual > hoy) {
            mostrarErrorInline('fecha-actual', 'La fecha actual no puede ser una fecha futura.');
            esValido = false;
        }

        return esValido;
    }

    if (fechaInstalacionInput && fechaActualInput) {
        fechaInstalacionInput.addEventListener('input', validarRangoFechas);
        fechaActualInput.addEventListener('input', validarRangoFechas);
    }

    // Evento para calcular por Fecha de Instalación
    if (calcularFechaInstalacionBtn) {
        calcularFechaInstalacionBtn.addEventListener('click', async function() {
            resultadoFacturas.innerHTML = ''; // Limpiar resultados/mensajes previos
            limpiarErroresInline(); // Limpiar errores inline

            const fechaInstalacionInput = document.getElementById('fecha-instalacion').value;
            const fechaActualInput = document.getElementById('fecha-actual').value;
            const lecturaInstalacionInput = document.getElementById('lectura-instalacion').value;
            const lecturaContadorInput = document.getElementById('lectura-contador').value;

            // Validaciones de campos vacíos
            if (!fechaInstalacionInput || !fechaActualInput || !lecturaInstalacionInput || !lecturaContadorInput) {
                return mostrarError('Por favor, complete todos los campos para "Por Fecha de Instalación".');
            }

            // Re-validar el rango de fechas antes de calcular
            if (!validarRangoFechas()) {
                return; // Detener si hay errores de fecha
            }

            const fechaInstalacion = new Date(fechaInstalacionInput);
            const fechaActual = new Date(fechaActualInput);
            const lecturaInstalacion = parseFloat(lecturaInstalacionInput);
            const lecturaContador = parseFloat(lecturaContadorInput);

            // Validación de fechas
            if (isNaN(fechaInstalacion.getTime()) || isNaN(fechaActual.getTime())) {
                return mostrarError('Las fechas ingresadas no son válidas.');
            }

            // Validar que las fechas no sean iguales
            if (fechaInstalacion.getTime() === fechaActual.getTime()) {
                return mostrarError('Las fechas no pueden ser iguales.');
            }

            // Validar que la diferencia entre fechas no sea mayor a 5 años
            const cincoAnios = 5 * 365 * 24 * 60 * 60 * 1000; // 5 años en milisegundos
            if (fechaActual - fechaInstalacion > cincoAnios) {
                return mostrarError('El período entre fechas no puede ser mayor a 5 años.');
            }

            // Validaciones de lecturas
            if (isNaN(lecturaInstalacion) || lecturaInstalacion < 0) {
                return mostrarError('La lectura de instalación debe ser un número positivo o cero.');
            }

            if (isNaN(lecturaContador) || lecturaContador <= 0) {
                return mostrarError('La lectura del contador debe ser un número mayor que cero.');
            }

            if (lecturaContador <= lecturaInstalacion) {
                return mostrarError('La lectura del contador debe ser mayor que la lectura de instalación.');
            }

            // Validar que la diferencia de lecturas sea razonable
            const diferenciaDias = Math.ceil((fechaActual - fechaInstalacion) / (1000 * 60 * 60 * 24));
            const consumoDiario = (lecturaContador - lecturaInstalacion) / diferenciaDias;
            const consumoDiarioMaximo = 500; // 500 kWh por día como límite razonable
            
            if (consumoDiario > consumoDiarioMaximo) {
                // No bloquear automáticamente: pedir confirmación al usuario mediante modal
                const confirmar = await showConfirmModal(`El consumo diario calculado (${consumoDiario.toFixed(2)} kWh) parece muy alto. ¿Desea continuar con el cálculo?`);
                if (!confirmar) {
                    return mostrarError('Operación cancelada por el usuario. Verifique las lecturas ingresadas.');
                }
                // Si confirma, continuar con los cálculos
            }

            // Cálculos (ya se calcularon diferenciaDias y consumoDiario arriba)
            const consumoKwhMes = consumoDiario * window.appConfig.diasMes;
            const dacKva = consumoKwhMes / window.appConfig.horasMes; // Estimación
            const ctcKva = dacKva <= 5 ? dacKva : dacKva / 0.4;
            const potenciaAparenteKva = dacKva / window.appConfig.fpReferencia;

            // Calcular costos usando la configuración global
            const costos = calcularCostos({
                consumoKwhMes: consumoKwhMes,
                dacKva: dacKva,
                costoKwh: window.appConfig.costoKwh,
                costoKva: window.appConfig.costoKva,
                iva: window.appConfig.ivaPorcentaje,
                dolar: window.appConfig.valorDolar
            });

            // Mostrar resultados en formato estructurado
            resultadoFacturas.innerHTML = `
                <h3>Resultados de Facturación por Fecha de Instalación</h3>
                <div class="contenedor-resultados">
                <script>document.getElementById('boton-limpiar-facturas').style.display = 'inline-block';</script>
                    <div class="caja-resultado">
                        <h3 class="titulo-caja">Potencias y Tarifas</h3>
                        <div class="item-resultado">
                            <span class="etiqueta">Activa Total (DAC):</span>
                            <span class="valor">${dacKva.toFixed(2)} kW</span>
                        </div>
                        <div class="item-resultado">
                            <span class="etiqueta">Tarifa Residencial:</span>
                            <span class="valor valor-tarifa">${calcularTarifaResidencial(consumoKwhMes)}</span>
                        </div>
                        <div class="item-resultado">
                            <span class="etiqueta">Tarifa Comercial:</span>
                            <span class="valor valor-tarifa">${calcularTarifaComercial(ctcKva)}</span>
                        </div>
                    </div>

                    <div class="caja-resultado">
                        <h3 class="titulo-caja">Parámetros</h3>
                        <div class="item-resultado">
                            <span class="etiqueta">CTC Calculado:</span>
                            <span class="valor">${formatoNumero(ctcKva)} kVA</span>
                        </div>
                        <div class="item-resultado">
                            <span class="etiqueta">DAC Calculado:</span>
                            <span class="valor">${formatoNumero(dacKva)} kVA</span>
                        </div>
                        <p class="item-resultado">
                            <span class="etiqueta">Consumo Diario:</span>
                            <span class="valor-destacado">${consumoDiario.toFixed(2)} kWh</span>
                        </p>
                        <div class="item-resultado">
                            <span class="etiqueta">Consumo Mensual:</span>
                            <span class="valor-destacado">${consumoKwhMes.toFixed(2)} kWh</span>
                        </div>
                    </div>

                    <div class="caja-resultado">
                        <h3 class="titulo-caja">Costos</h3>
                        <div class="item-resultado">
                            <span class="etiqueta">Por Demanda DAC:</span>
                            <span class="valor">$${costos.costoPorDemandaUsd}</span>
                        </div>
                        <div class="item-resultado">
                            <span class="etiqueta">Por Consumo:</span>
                            <span class="valor">$${costos.costoPorConsumoUsd}</span>
                        </div>
                        <div class="item-resultado">
                            <span class="etiqueta">IVA (${window.appConfig.ivaPorcentaje}%):</span>
                            <span class="valor">$${costos.costoIvaUsd}</span>
                        </div>
                        <div class="item-resultado-total">
                            <span class="etiqueta-total">Total USD:</span>
                            <span class="valor-total">$${costos.costoTotalUsd}</span>
                        </div>
                        <div class="item-resultado-total">
                            <span class="etiqueta-total">Total Bs:</span>
                            <span class="valor-total">${costos.costoTotalBs} Bs</span>
                        </div>
                    </div>
                </div>
            `;
            resultadoFacturas.classList.remove('oculto');
            document.getElementById('boton-limpiar-facturas').style.display = 'inline-block';
        });
    }

    // Evento para limpiar todos los campos y resultados de la pestaña de facturación
    if (botonLimpiarFacturas) {
        botonLimpiarFacturas.addEventListener('click', limpiarFacturas);
    }

    function limpiarFacturas() {
        // Ocultar formularios
        formularioFechaInstalacion.style.display = 'none';
        formularioCtc.style.display = 'none';
        resultadoFacturas.innerHTML = '';
        botonLimpiarFacturas.style.display = 'none';

        // Limpiar clases de pestañas (si existen)
        const tabBtns = document.querySelectorAll('.fact-tab-btn');
        tabBtns.forEach(b => b.classList.remove('active'));
        const tabContents = document.querySelectorAll('.fact-tab-content');
        tabContents.forEach(c => c.style.display = 'none');

        // Limpiar campos específicos de cada formulario
        const fInst = document.getElementById('fecha-instalacion'); if (fInst) fInst.value = '';
        const fAct = document.getElementById('fecha-actual'); if (fAct) fAct.value = '';
        const lectInst = document.getElementById('lectura-instalacion'); if (lectInst) lectInst.value = '';
        const lectCont = document.getElementById('lectura-contador'); if (lectCont) lectCont.value = '';
        const ctcField = document.getElementById('ctc-input'); if (ctcField) ctcField.value = '';
    }

    // Función para calcular por Carga Total Conectada (CTC)
    function calcularPorCargaTotalConectada() {
        resultadoFacturas.innerHTML = ''; // Limpiar resultados/mensajes previos

        const ctcInput = document.getElementById('ctc-input').value;
        const ctc = parseFloat(ctcInput);

        console.log('CTC input:', ctcInput, 'Parsed CTC:', ctc);

        // Validación de campo vacío y valor numérico positivo
        if (!ctcInput || isNaN(ctc) || ctc <= 0) {
            console.log('Validation failed: Invalid CTC input.');
            resultadoFacturas.innerHTML = `<p class="error-message">Por favor, introduce un valor válido y positivo para CTC (kVA).</p>`;
            resultadoFacturas.classList.remove('oculto');
            return;
        }

        // Calcular DAC a partir de CTC (usando la lógica de corrientes.js o cnosumo.js)
        // Si CTC <= 5, DAC es CTC. Si CTC > 5, DAC = CTC * 0.4.
        const dacKva = ctc <= 5 ? ctc : Math.max(ctc * 0.4, 5);

        // Derivar Consumo Mensual a partir del DAC (inverso de la lógica de "Por Fecha de Instalación")
        // En "Por Fecha de Instalación": dac = consumoKwhMes / horasMes;
        // Por lo tanto: consumoMensual = dac * horasMes;
        const consumoKwhMes = dacKva * window.appConfig.horasMes;

        // Calcular Consumo Diario a partir del Consumo Mensual derivado
        const consumoKwhDia = consumoKwhMes / window.appConfig.diasMes;

        // Obtener los valores de configuración global
        const costoKwh = window.appConfig.costoKwh;
        const costoKva = window.appConfig.costoKva;
        const iva = window.appConfig.ivaPorcentaje;
        const valordolar = window.appConfig.valorDolar;

        // Calcular costos utilizando la función global
        const costos = calcularCostos({
            consumoKwhMes: consumoKwhMes,
            dacKva: dacKva,
            costoKwh: costoKwh,
            costoKva: costoKva,
            iva: iva,
            dolar: valordolar
        });

        // Calcular tarifas
        const tarifaResidencial = calcularTarifaResidencial(consumoKwhMes);
        const tarifaComercial = calcularTarifaComercial(ctc);

        // Mostrar resultados en formato estructurado
        resultadoFacturas.innerHTML = `
            <h3>Resultados de Facturación (CTC)</h3>
            <div class="contenedor-resultados">
                <!-- Caja 1 - Potencia y Tarifas -->
                <div class="caja-resultado">
                    <h4 class="titulo-caja">Potencias y Tarifas</h4>
                    <div class="consumo-detalle">
                        <p class="item-resultado">
                            <span class="etiqueta">Potencia Activa (DAC):</span>
                            <span class="valor">${formatoNumero(dacKva)} kW</span>
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
                            <span class="etiqueta">CTC Ingresado:</span>
                            <span class="valor">${formatoNumero(ctc)} kVA</span>
                        </p>
                        <p class="item-resultado">
                            <span class="etiqueta">DAC Calculado:</span>
                            <span class="valor">${formatoNumero(dacKva)} kVA</span>
                        </p>
                        <p class="item-resultado">
                            <span class="etiqueta">Consumo Mensual:</span>
                            <span class="valor-destacado">${formatoNumero(consumoKwhMes)} kWh</span>
                        </p>
                        <p class="item-resultado">
                            <span class="etiqueta">Consumo Diario:</span>
                            <span class="valor-destacado">${formatoNumero(consumoKwhDia)} kWh</span>
                        </p>
                    </div>
                </div>

                <!-- Caja 3 - Detalles de Costos -->
                <div class="caja-resultado">
                    <h4 class="titulo-caja">Detalles de Costos</h4>
                    <div class="consumo-detalle">
                        <p class="item-resultado">
                            <span class="etiqueta">Por Demanda DAC:</span>
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
        `;
        resultadoFacturas.classList.remove('oculto');
    document.getElementById('boton-limpiar-facturas').style.display = 'inline-block';
    }
});
