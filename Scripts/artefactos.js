// =================================================================================
// Módulo de Administración de Artefactos (Dispositivos)
// =================================================================================

(function(window) {
    'use strict';

    const STORAGE_KEY = 'app:artefactos';
    let artifacts = [];

    // --- Modelo de Datos y Persistencia ---

    function loadArtifacts() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                let needsMigration = false;
                artifacts = JSON.parse(stored).map(artifact => {
                    // Detectar si es el formato antiguo (usando APARATOS)
                    if (artifact.hasOwnProperty('APARATOS')) {
                        needsMigration = true;
                        return {
                            id: artifact.id || crypto.randomUUID(),
                            nombre: artifact.APARATOS,
                            vatios: artifact.WATT,
                            factorPotencia: artifact.FP || 0.9,
                            horasDiarias: artifact.H_D || 1,
                            fase: artifact.FASE || 1,
                            voltaje: artifact.VOLTAJE || 115,
                            createdAt: artifact.createdAt || Date.now(),
                            updatedAt: Date.now()
                        };
                    }
                    return artifact;
                });
                if (needsMigration) saveArtifacts(); // Guardar los datos migrados
            } else {
                artifacts = [
                    { id: crypto.randomUUID(), nombre: "Bomba de Agua", vatios: 750, factorPotencia: 0.85, horasDiarias: 4, fase: 1, voltaje: 115, createdAt: Date.now(), updatedAt: Date.now() },
                    { id: crypto.randomUUID(), nombre: "Aire Acondicionado 12k BTU", vatios: 1100, factorPotencia: 0.92, horasDiarias: 8, fase: 1, voltaje: 115, createdAt: Date.now(), updatedAt: Date.now() },
                    { id: crypto.randomUUID(), nombre: "Motor Trifásico 3HP", vatios: 2200, factorPotencia: 0.88, horasDiarias: 6, fase: 3, voltaje: 220, createdAt: Date.now(), updatedAt: Date.now() }
                ];
                saveArtifacts();
            }
        } catch (error) {
            console.error("Error al cargar artefactos desde localStorage:", error);
            artifacts = [];
        }
        return artifacts;
    }

    function saveArtifacts() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(artifacts));
        } catch (error) {
            console.error("Error al guardar artefactos en localStorage:", error);
            alert("No se pudieron guardar los cambios. El almacenamiento podría estar lleno.");
        }
    }

    function normalize(obj) {
        return {
            nombre: obj.nombre.trim().replace(/\b\w/g, l => l.toUpperCase()),
            vatios: parseFloat(obj.vatios) || 0,
            factorPotencia: parseFloat(obj.factorPotencia) || 0.9,
            horasDiarias: parseFloat(obj.horasDiarias) || 1,
            fase: parseInt(obj.fase, 10) || 1,
            voltaje: parseInt(obj.voltaje, 10) || 115,
        };
    }

    // --- API Pública ---

    const ArtifactsAPI = {
        list() {
            return [...artifacts];
        },

        create(obj) {
            const normalized = normalize(obj);
            if (artifacts.some(a => a.nombre.toLowerCase() === normalized.nombre.toLowerCase())) {
                alert("Error: Ya existe un artefacto con ese nombre.");
                return null;
            }
            const newArtifact = {
                ...normalized,
                id: crypto.randomUUID(),
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            artifacts.push(newArtifact);
            saveArtifacts();
            this.syncWithAutocomplete();
            return newArtifact;
        },

        update(id, obj) {
            const index = artifacts.findIndex(a => a.id === id);
            if (index === -1) return null;

            const normalized = normalize(obj);
            if (artifacts.some(a => a.id !== id && a.nombre.toLowerCase() === normalized.nombre.toLowerCase())) {
                alert("Error: Ya existe otro artefacto con ese nombre.");
                return null;
            }

            artifacts[index] = { ...artifacts[index], ...normalized, updatedAt: Date.now() };
            saveArtifacts();
            this.syncWithAutocomplete();
            return artifacts[index];
        },

        remove(id) {
            artifacts = artifacts.filter(a => a.id !== id);
            saveArtifacts();
            this.syncWithAutocomplete();
        },

        syncWithAutocomplete() {
            if (window.refreshAutocompleteFromArtifacts) {
                const autocompleteData = artifacts.map(a => ({
                    label: `${a.nombre} (${a.vatios}W, ${a.voltaje}V)`,
                    value: a.nombre,
                    vatios: a.vatios,
                    factorPotencia: a.factorPotencia,
                    horasDiarias: a.horasDiarias,
                    fase: a.fase,
                    voltaje: a.voltaje
                }));
                window.refreshAutocompleteFromArtifacts(autocompleteData);
            }
        },

        openModal() {
            $('#modal-artefactos').fadeIn();
            document.addEventListener('keydown', handleFocusTrap); // Activar focus trap
            clearForm();
            $('#txtAparatos').focus();
            renderTable();
        },

        closeModal() {
            if (!$('#modal-artefactos').is(':visible')) return;

            document.removeEventListener('keydown', handleFocusTrap); // Desactivar focus trap
            $('#modal-artefactos').fadeOut();
            $('#menu-artefactos').focus();
        }
    };

    // --- Lógica del UI del Modal ---

    let currentEditId = null;

    function renderTable() {
        const tableBody = $('#tabla-artefactos tbody').empty();
        const items = ArtifactsAPI.list();
        if (items.length === 0) {
            tableBody.append('<tr><td colspan="7" style="text-align:center;">No hay artefactos registrados.</td></tr>');
            return;
        }
        items.forEach(a => {
            const row = `
                <tr data-id="${a.id}">
                    <td>${a.nombre}</td>
                    <td>${a.vatios}</td>
                    <td>${a.factorPotencia}</td>
                    <td>${a.horasDiarias}</td>
                    <td>${a.fase}</td>
                    <td>${a.voltaje}</td>
                    <td>
                        <button class="btn-edit">Editar</button>
                        <button class="btn-delete">Eliminar</button>
                    </td>
                </tr>
            `;
            tableBody.append(row);
        });
    }

    function clearForm() {
        $('#form-artefactos')[0].reset();
        $('#form-artefactos .error-msg').text('');
        currentEditId = null;
        $('#btn-guardar-artefacto').text('Guardar');
        handlePhaseChange(); // Aplicar lógica de voltaje
        $('#txtAparatos').focus();
    }

    function validateForm() {
        let isValid = true;
        $('.error-msg').text('');

        const fields = {
            nombre: { val: $('#txtAparatos').val().trim(), el: $('#txtAparatos'), msg: 'El nombre es requerido.' },
            vatios: { val: $('#numWatt').val(), el: $('#numWatt'), msg: 'Debe ser un número > 0.', test: v => v > 0 },
            factorPotencia: { val: $('#numFP').val(), el: $('#numFP'), msg: 'Debe estar entre 0.1 y 1.', test: v => v >= 0.1 && v <= 1 },
            horasDiarias: { val: $('#numHD').val(), el: $('#numHD'), msg: 'Debe estar entre 0 y 24.', test: v => v >= 0 && v <= 24 }
        };

        if (!fields.nombre.val) {
            isValid = false;
            fields.nombre.el.next('.error-msg').text(fields.nombre.msg);
        }

        for (const key in fields) {
            if (key !== 'nombre' && fields[key].val) {
                const numVal = parseFloat(fields[key].val);
                if (isNaN(numVal) || (fields[key].test && !fields[key].test(numVal))) {
                    isValid = false;
                    fields[key].el.next('.error-msg').text(fields[key].msg);
                }
            }
        }
        
        return isValid;
    }

    function handlePhaseChange() {
        const fase = $('#selFase').val();
        const voltajeSelect = $('#numVoltaje');
        if (fase === '1') {
            voltajeSelect.val('115');
        } else { // Fase 2 o 3
            voltajeSelect.val('220');
        }
    }

    function handleFocusTrap(e) {
        if (e.key !== 'Tab') return;

        const modal = $('#modal-artefactos');
        if (!modal.is(':visible')) return;

        const focusableElements = modal.find('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])').filter(':visible');
        const firstElement = focusableElements.first();
        const lastElement = focusableElements.last();

        if (e.shiftKey) { // Shift + Tab
            if (document.activeElement === firstElement[0]) {
                lastElement.focus();
                e.preventDefault();
            }
        } else { // Tab
            if (document.activeElement === lastElement[0]) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    }


    // --- Event Handlers ---

    $(document).ready(function() {
        loadArtifacts();
        ArtifactsAPI.syncWithAutocomplete();

        $('#selFase').on('change', handlePhaseChange);

        $('#btn-guardar-artefacto').on('click', function() {
            if (!validateForm()) return;

            const artifactData = {
                nombre: $('#txtAparatos').val(),
                vatios: $('#numWatt').val(),
                factorPotencia: $('#numFP').val(),
                horasDiarias: $('#numHD').val(),
                fase: $('#selFase').val(),
                voltaje: $('#numVoltaje').val()
            };

            let result;
            if (currentEditId) {
                result = ArtifactsAPI.update(currentEditId, artifactData);
            } else {
                result = ArtifactsAPI.create(artifactData);
            }

            if (result) {
                clearForm();
                renderTable();
            }
        });

        $('#btn-nuevo-artefacto').on('click', clearForm);

        $('#btn-cancelar-artefacto').on('click', ArtifactsAPI.closeModal);
        $('.modal-overlay, .modal-close').on('click', ArtifactsAPI.closeModal);

        $('#tabla-artefactos').on('click', '.btn-edit', function() {
            const id = $(this).closest('tr').data('id');
            const artifact = artifacts.find(a => a.id === id);
            if (artifact) {
                currentEditId = id;
                $('#txtAparatos').val(artifact.nombre);
                $('#numWatt').val(artifact.vatios);
                $('#numFP').val(artifact.factorPotencia);
                $('#numHD').val(artifact.horasDiarias);
                $('#selFase').val(artifact.fase);
                $('#numVoltaje').val(artifact.voltaje);
                $('#btn-guardar-artefacto').text('Actualizar');
                handlePhaseChange(); // Asegura que el voltaje sea correcto al editar
                $('#txtAparatos').focus();
            }
        });

        $('#tabla-artefactos').on('click', '.btn-delete', function() {
            const id = $(this).closest('tr').data('id');
            if (confirm('¿Seguro que quieres eliminar este artefacto?')) {
                ArtifactsAPI.remove(id);
                renderTable();
            }
        });
        
        $(document).on('keydown', function(e) {
            if (e.key === "Escape" && $('#modal-artefactos').is(':visible')) {
                ArtifactsAPI.closeModal();
            }
        });
    });

    window.Artifacts = ArtifactsAPI;

})(window);