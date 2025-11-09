// =================================================================================
// Módulo Común - Lógica de Configuración, Usuarios y Utilidades
// =================================================================================

const LS_KEYS = {
  USERS: 'app:users',
  CURRENT_USER: 'app:currentUser',
  AUTH: 'app:isAuthenticated'
};

// Función para inicializar la configuración de la aplicación
const CURRENT_CONFIG_VERSION = 1;
const DEFAULTS = {
    diasMes: 30,
    horasMes: 300,
    costoKwh: 0.01,
    costoKva: 1.30,
    ivaPorcentaje: 16,
    valorDolar: 65,
    version: CURRENT_CONFIG_VERSION,
    fpReferencia: 0.9 // Factor de potencia de referencia para estimaciones
};

function initConfig() {
    try {
        const savedConfig = localStorage.getItem('app:config'); // Esta clave no es de sesión, se mantiene
        if (savedConfig) {
            window.appConfig = JSON.parse(savedConfig);
            // Comprobar y migrar si es necesario
            if (!window.appConfig.version || window.appConfig.version < CURRENT_CONFIG_VERSION) {
                migrateConfig(window.appConfig.version || 0);
            }
        } else {
            window.appConfig = DEFAULTS;
            saveConfig(); // Guardar la configuración por defecto inicial
        }
    } catch (e) {
        console.error("Error al cargar la configuración, usando valores por defecto.", e);
        window.appConfig = DEFAULTS;
    }

    return window.appConfig;
}

function migrateConfig(fromVersion) {
    console.log(`Migrando configuración desde la versión ${fromVersion} a la ${CURRENT_CONFIG_VERSION}`);
    let config = window.appConfig;

    // Ejemplo de migración: si en la v2 se añade un nuevo campo
    // if (fromVersion < 2) {
    //     config.nuevoCampo = 'valorPorDefecto';
    // }

    // Actualizar la versión al final
    config.version = CURRENT_CONFIG_VERSION;
    window.appConfig = config;
    saveConfig();
    console.log("Migración de configuración completada.");
}
// Array global para almacenar los usuarios
// ¡ADVERTENCIA DE SEGURIDAD! Almacenar usuarios y contraseñas en localStorage no es seguro para producción.
// Esto es solo para fines de demostración del lado del cliente.
let users = [];

// Control de pestañas
document.querySelectorAll('.pestana-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        // Remover clase activa de todos los botones de pestaña y contenidos
        document.querySelectorAll('.pestana-btn, .contenido-pestana').forEach(el => {
            el.classList.remove('active');
        });

        // Activar el botón de pestaña clicado
        this.classList.add('active');

        // Obtener el ID de la pestaña a mostrar
        const pestanaId = this.dataset.pestana;

        // Verificar permisos antes de mostrar la pestaña
        if (checkModulePermission(pestanaId)) {
            document.getElementById(pestanaId).classList.add('active');
        } else {
            // Si no tiene permiso, redirigir a una página de "Acceso Denegado" o mostrar un mensaje
            alert('Acceso denegado a este módulo.');
            // Opcional: Volver a la pestaña de consumo o a una página de inicio
            document.getElementById('consumo').classList.add('active');
            document.querySelector('.pestana-btn[data-pestana="consumo"]').classList.add('active');
        }

        // Ocultar el menú desplegable del usuario si está abierto
        const userDropdownContent = document.getElementById('user-dropdown-content');
        if (userDropdownContent && userDropdownContent.classList.contains('show')) {
            userDropdownContent.classList.remove('show');
        }
    });
});

// Función para verificar si el usuario actual tiene permiso para un módulo
function checkModulePermission(moduleId) {
    const currentUser = localStorage.getItem(LS_KEYS.CURRENT_USER);
    if (!currentUser) {
        // Si no hay usuario logueado, permitir acceso solo a la página de login (que ya está manejada)
        // O denegar acceso a cualquier módulo de la app
        return false;
    }
    const parsedUser = JSON.parse(currentUser);

    // Si el usuario es 'admin', tiene acceso a todo
    if (parsedUser.username === 'admin') {
        return true;
    }

    // Si el módulo es 'configuracion', solo el admin tiene acceso
    if (moduleId === 'configuracion') {
        return parsedUser.username === 'admin';
    }

    // Para otros módulos, verificar los permisos específicos del usuario
    return parsedUser.permissions && parsedUser.permissions[moduleId];
}


// Funciones comunes
function formatoNumero(num, decimales = 2) {
    return num.toLocaleString(undefined, {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    });
}

// Función global para calcular tarifa residencial
function calcularTarifaResidencial(totalkWh) {
    if (totalkWh < 200) return 'TR1';
    if (totalkWh >= 200 && totalkWh < 500) return 'TR2';
    return 'TR3';
}

// Función global para calcular tarifa comercial
function calcularTarifaComercial(ctc) {
    if (ctc <= 10) return 'G01';
    if (ctc > 10 && ctc < 30) return 'G02';
    return 'G03';
}

// Función global para calcular costos
function calcularCostos({ consumoKwhMes, dacKva, costoKwh, costoKva, iva, dolar }) {
    const costoPorConsumoUsd = consumoKwhMes * costoKwh;
    const costoIvaUsd = costoPorConsumoUsd * (iva / 100);
    const costoPorDemandaUsd = dacKva * costoKva;
    const costoTotalUsd = costoPorConsumoUsd + costoIvaUsd + costoPorDemandaUsd;
    const costoTotalBs = costoTotalUsd * dolar;

    return {
        costoPorConsumoUsd: costoPorConsumoUsd.toFixed(2),
        costoIvaUsd: costoIvaUsd.toFixed(2),
        costoPorDemandaUsd: costoPorDemandaUsd.toFixed(2),
        costoTotalUsd: costoTotalUsd.toFixed(2),
        costoTotalBs: costoTotalBs.toFixed(2)
    };
}

// Funciones para cargar y guardar la configuración
function cargarConfiguracion() {
    // Inicializa window.appConfig desde localStorage o con valores por defecto
    initConfig();

    // Actualizar los campos del formulario de configuración con los valores cargados
    document.getElementById('horas-mes-config').value = appConfig.horasMes;
    document.getElementById('dias-mes-config').value = appConfig.diasMes;
    document.getElementById('costo-kva-config').value = appConfig.costoKva;
    document.getElementById('iva-porcentaje-config').value = appConfig.ivaPorcentaje;
    document.getElementById('valor-dolar-config').value = appConfig.valorDolar;
    document.getElementById('costo-kwh-config').value = appConfig.costoKwh;
}

function saveConfig() {
    localStorage.setItem('app:config', JSON.stringify(window.appConfig)); // Clave de config se mantiene
}

function guardarConfiguracion() {
    appConfig.horasMes = parseFloat(document.getElementById('horas-mes-config').value) || DEFAULTS.horasMes;
    appConfig.diasMes = parseFloat(document.getElementById('dias-mes-config').value) || DEFAULTS.diasMes;
    appConfig.costoKva = parseFloat(document.getElementById('costo-kva-config').value) || DEFAULTS.costoKva;
    appConfig.ivaPorcentaje = parseFloat(document.getElementById('iva-porcentaje-config').value) || DEFAULTS.ivaPorcentaje;
    appConfig.valorDolar = parseFloat(document.getElementById('valor-dolar-config').value) || DEFAULTS.valorDolar;
    appConfig.costoKwh = parseFloat(document.getElementById('costo-kwh-config').value) || DEFAULTS.costoKwh;
    saveConfig();
    const mensaje = document.getElementById('mensaje-configuracion');
    mensaje.textContent = 'Configuración guardada exitosamente.';
    mensaje.style.color = 'green';
    setTimeout(() => mensaje.textContent = '', 3000); // Borra el mensaje después de 3 segundos
}

// Funciones para cargar y guardar usuarios
function loadUsers() {
  const raw = localStorage.getItem(LS_KEYS.USERS);
  if (raw) {
    users = JSON.parse(raw);
    return;
  }
  users = [{
    username: 'admin',
    password: 'admin123',    // DEMO únicamente
    isActive: true,
    permissions: {
      consumo: true, corrientes: true, facturas: true, configuracion: true
    }
  }];
  localStorage.setItem(LS_KEYS.USERS, JSON.stringify(users));
}

function saveUsers() {
    localStorage.setItem(LS_KEYS.USERS, JSON.stringify(users));
}

// Función para verificar si el usuario actual es admin
function isAdmin() {
    const currentUser = localStorage.getItem(LS_KEYS.CURRENT_USER);
    if (!currentUser) return false;
    return JSON.parse(currentUser).username === 'admin';
}

// Event listeners para la configuración
document.addEventListener('DOMContentLoaded', function() {
    migrateStorage(); // Ejecutar la migración del almacenamiento al iniciar
    cargarConfiguracion(); // Cargar la configuración al inicio
    loadUsers(); // Cargar usuarios al inicio

    $('#btn-exportar-datos').on('click', exportAppData);
    $('#import-file-input').on('change', importAppData);

    // Manejador para el menú de Artefactos
    $('#menu-artefactos').on('click', function(e) {
        e.preventDefault();
        if (isAdmin()) {
            // Si es admin, cierra el dropdown y abre el modal
            $('#user-dropdown-content').removeClass('show');
            if (window.Artifacts && typeof window.Artifacts.openModal === 'function') {
                window.Artifacts.openModal();
            } else {
                console.error("El módulo de artefactos no está disponible.");
            }
        } else {
            // Si no es admin, muestra un mensaje
            alert('Acceso restringido. Solo los administradores pueden gestionar artefactos.');
        }
    });

    const guardarConfigBtn = document.getElementById('guardar-configuracion');
    if (guardarConfigBtn) {
        guardarConfigBtn.addEventListener('click', guardarConfiguracion);
    }

    // Establecer la fecha actual en el campo de fecha actual (en la pestaña de facturas)
    const fechaActualInput = document.getElementById('fecha-actual');
    if (fechaActualInput) {
        const hoy = new Date().toISOString().split('T')[0];
        fechaActualInput.value = hoy;
    }
});

function migrateStorage() {
    const MIGRATION_FLAG = 'app:storageMigrated:v1';

    if (localStorage.getItem(MIGRATION_FLAG)) {
        // La migración ya se realizó, no hacer nada.
        return;
    }

    console.log("Ejecutando migración de localStorage...");

    // 1. Renombrar claves antiguas al nuevo formato con prefijo "app:"
    const keysToRename = {
        'appConfig': 'app:config',
        'appUsers': LS_KEYS.USERS,
        'currentUser': LS_KEYS.CURRENT_USER,
        'isAuthenticated': LS_KEYS.AUTH,
        'artefactosCatalog': 'app:artefactos' // Clave antigua del módulo de artefactos
    };

    for (const oldKey in keysToRename) {
        const newKey = keysToRename[oldKey];
        const value = localStorage.getItem(oldKey);
        if (value) {
            console.log(`Migrando clave: ${oldKey} -> ${newKey}`);
            localStorage.setItem(newKey, value);
            localStorage.removeItem(oldKey);
        }
    }

    // 2. Borrar claves obsoletas que ya no se usan (ej. relacionadas con Excel)
    const keysToDelete = ['app:excelData', 'archivoExcel', 'app:archivoExcel'];
    keysToDelete.forEach(key => localStorage.removeItem(key));

    // 3. Marcar la migración como completada para no volver a ejecutarla.
    localStorage.setItem(MIGRATION_FLAG, 'true');
    console.log("Migración de localStorage completada.");
}

// --- Funciones de Exportación e Importación ---

function exportAppData() {
    try {
        const appData = {
            config: JSON.parse(localStorage.getItem('app:config') || '{}'),
            artifacts: JSON.parse(localStorage.getItem('app:artefactos') || '[]')
        };

        const jsonString = JSON.stringify(appData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        const fecha = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `app-data-export-${fecha}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        $('#mensaje-import-export').text('Datos exportados con éxito.').css('color', 'green');
    } catch (error) {
        console.error("Error al exportar datos:", error);
        $('#mensaje-import-export').text('Error al exportar los datos.').css('color', 'red');
    }
}

function importAppData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const appData = JSON.parse(e.target.result);

            if (!appData.config || !appData.artifacts) {
                throw new Error("El archivo no tiene el formato esperado (faltan 'config' o 'artifacts').");
            }

            if (confirm("¿Estás seguro de que quieres importar estos datos? Se sobrescribirá la configuración y el catálogo de artefactos actuales.")) {
                localStorage.setItem('app:config', JSON.stringify(appData.config));
                localStorage.setItem('app:artefactos', JSON.stringify(appData.artifacts));

                $('#mensaje-import-export').text('Datos importados con éxito. La página se recargará.').css('color', 'green');
                setTimeout(() => window.location.reload(), 2000);
            }
        } catch (error) {
            console.error("Error al importar datos:", error);
            $('#mensaje-import-export').text(`Error al importar: ${error.message}`).css('color', 'red');
        } finally {
            // Resetear el input para poder cargar el mismo archivo de nuevo
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}
