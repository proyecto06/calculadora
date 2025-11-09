document.addEventListener('DOMContentLoaded', function() {
    // Agregar evento al botón limpiar
    document.getElementById('boton-limpiar-corrientes').addEventListener('click', limpiarCamposCorrientes);

    // Agregar evento al botón calcular
    document.getElementById('boton-calcular-corrientes').addEventListener('click', calcularPorCorrientes);
});

function limpiarCamposCorrientes() {
    // Restablecer valores de voltaje
    document.getElementById('voltaje-r').value = 120;
    document.getElementById('voltaje-s').value = 120;
    document.getElementById('voltaje-t').value = 120;

    // Limpiar campos de corriente
    document.getElementById('corriente-r').value = '';
    document.getElementById('corriente-s').value = '';
    document.getElementById('corriente-t').value = '';

    // Restablecer otros campos a sus valores predeterminados o los de la configuración global
    // Los parámetros globales (horas, días, costos) se manejan desde Configuración General (appConfig)

    // Ocultar y limpiar resultados
    document.getElementById('resultado-corrientes').classList.add('oculto');
    document.getElementById('resultado-corrientes').innerHTML = '';
    document.getElementById('boton-limpiar-corrientes').style.display = 'none';
}

function calcularPorCorrientes() {
    const resultadoCorrientes = document.getElementById('resultado-corrientes');
    resultadoCorrientes.innerHTML = ''; // Limpiar resultados previos

    const config = {
        vr: parseFloat(document.getElementById('voltaje-r').value) || 0,
        vs: parseFloat(document.getElementById('voltaje-s').value) || 0,
        vt: parseFloat(document.getElementById('voltaje-t').value) || 0,
        ir: parseFloat(document.getElementById('corriente-r').value) || 0,
        is: parseFloat(document.getElementById('corriente-s').value) || 0,
        it: parseFloat(document.getElementById('corriente-t').value) || 0,
        // Tomar valores globales desde appConfig (configuración general)
        horas: window.appConfig.horasMes,
        dias: window.appConfig.diasMes,
        costoKva: window.appConfig.costoKva,
        costoKwh: window.appConfig.costoKwh,
        // Obtener IVA y Dólar de la configuración global
        iva: window.appConfig.ivaPorcentaje,
        dolar: window.appConfig.valorDolar
    };

    // Validación: al menos un campo de corriente debe tener datos
    if (config.ir === 0 && config.is === 0 && config.it === 0) {
        resultadoCorrientes.innerHTML = `<p class="error-message">Debe ingresar un valor en al menos uno de los campos de corriente para poder calcular.</p>`;
        resultadoCorrientes.classList.remove('oculto');
        return; // Detener la ejecución si la validación falla
    }

    // Cálculos técnicos
    const potenciaAparenteKva = (config.vr * config.ir + config.vs * config.is + config.vt * config.it) / 1000;
    const potenciaActivaKw = potenciaAparenteKva * 0.9; // Asumiendo un FP de 0.9
    const dacKva = Math.max(potenciaActivaKw, 1); // DAC se basa en kW pero se factura como kVA
    const ctcKva = dacKva <= 5 ? dacKva : dacKva / 0.4;
    const consumoKwhMes = potenciaActivaKw * config.horas;
    const consumoKwhDia = consumoKwhMes / config.dias;

    // Cálculo de tarifas
    const tarifaResidencial = calcularTarifaResidencial(consumoKwhMes);
    const tarifaComercial = calcularTarifaComercial(dacKva);

    // Cálculos financieros
    const costos = calcularCostos({
        consumoKwhMes: consumoKwhMes,
        dacKva: dacKva,
        costoKwh: config.costoKwh,
        costoKva: config.costoKva,
        iva: config.iva,
        dolar: config.dolar
    });

    // Mostrar resultados
    const resultados = `
    <div class="contenedor-resultados">
        <!-- Caja 1 - Potencia -->
        <div class="caja-resultado">
            <h3 class="titulo-caja">Potencia</h3>
            <div class="item-resultado">
                <span class="etiqueta">Aparente Total (DAC):</span>
                <span class="valor">${formatoNumero(potenciaAparenteKva)} kVA</span>
            </div>
            <div class="item-resultado">
                <span class="etiqueta">Activa Total:</span>
                <span class="valor">${formatoNumero(potenciaActivaKw)} kW</span>
            </div>
            <div class="item-resultado">
                <span class="etiqueta">Tarifa Residencial:</span>
                <span class="valor valor-tarifa">${tarifaResidencial}</span>
            </div>
            <div class="item-resultado">
                <span class="etiqueta">Tarifa Comercial:</span>
                <span class="valor valor-tarifa">${tarifaComercial}</span>
            </div>
        </div>

        <!-- Caja 2 - Parámetros -->
        <div class="caja-resultado">
            <h3 class="titulo-caja">Parámetros</h3>
            <div class="item-resultado">
                <span class="etiqueta">CTC:</span>
                <span class="valor">${ctcKva.toFixed()} kVA</span>
            </div>
            <div class="item-resultado">
                <span class="etiqueta">DAC:</span>
                <span class="valor">${dacKva.toFixed()} kVA</span>
            </div>
            <div class="item-resultado">
                <span class="etiqueta">Consumo Mensual:</span>
                <span class="valor-destacado">${consumoKwhMes.toFixed()} kWh/mes</span>
            </div>
            <div class="item-resultado">
                <span class="etiqueta">Consumo Diario:</span>
                <span class="valor-destacado">${formatoNumero(consumoKwhDia)} kWh/dia</span>
            </div>
        </div>

        <!-- Caja 3 - Costos -->
        <div class="caja-resultado">
            <h3 class="titulo-caja">Costos</h3>
            <div class="item-resultado">
                <span class="etiqueta">Por Demanda DAC:</span>
                <span class="valor">$${costos.costoPorDemandaUsd}</span>
            </div>
            <div class="item-resultado">
                <span class="etiqueta">Por Kwh:</span>
                <span class="valor">$${costos.costoPorConsumoUsd}</span>
            </div>
            <div class="item-resultado">
                <span class="etiqueta">IVA (${config.iva}%):</span>
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

    document.getElementById('resultado-corrientes').innerHTML = resultados;
    document.getElementById('resultado-corrientes').classList.remove('oculto');
    document.getElementById('boton-limpiar-corrientes').style.display = 'inline-block';
}