// plantillas.js - Funciones específicas para gestión de plantillas

let plantillaActual = null;

// Inicializar página de plantillas
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('plantillas.html')) {
        inicializarPaginaPlantillas();
    }
});

async function inicializarPaginaPlantillas() {
    console.log('Inicializando página de plantillas...');
    
    // Verificar autenticación
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        // Cargar plantillas
        await cargarPlantillas();
        
        // Configurar búsqueda
        document.getElementById('buscarPlantilla').addEventListener('keyup', buscarPlantillas);
    });
}

async function cargarPlantillas() {
    try {
        const snapshot = await db.collection('plantillas')
            .where('creador', '==', currentUser.uid)
            .orderBy('nombre')
            .get();
        
        const grid = document.getElementById('gridPlantillas');
        grid.innerHTML = '';
        
        let contador = 0;
        
        if (snapshot.empty) {
            grid.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle"></i> No tienes plantillas guardadas.
                        <p class="mt-2">Crea tu primera plantilla usando el formulario de la izquierda.</p>
                    </div>
                </div>
            `;
            return;
        }
        
        snapshot.forEach(doc => {
            const plantilla = doc.data();
            contador++;
            
            // Determinar icono según tipo
            let icono = 'fa-file-alt';
            let color = 'primary';
            
            switch(plantilla.tipo) {
                case 'checklist':
                    icono = 'fa-tasks';
                    color = 'success';
                    break;
                case 'cuestionario':
                    icono = 'fa-question-circle';
                    color = 'warning';
                    break;
                case 'documento':
                    icono = 'fa-file-pdf';
                    color = 'danger';
                    break;
                case 'encuesta':
                    icono = 'fa-poll';
                    color = 'info';
                    break;
            }
            
            // Determinar badge de categoría
            let categoriaColor = 'secondary';
            switch(plantilla.categoria) {
                case 'reportes': categoriaColor = 'primary'; break;
                case 'seguimiento': categoriaColor = 'success'; break;
                case 'evaluacion': categoriaColor = 'warning'; break;
                case 'administrativo': categoriaColor = 'danger'; break;
            }
            
            const card = `
                <div class="col-md-4 mb-3">
                    <div class="card h-100 plantilla-card" data-id="${doc.id}">
                        <div class="card-header bg-${color} text-white">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <i class="fas ${icono}"></i>
                                    <strong>${plantilla.nombre}</strong>
                                </div>
                                <span class="badge bg-light text-dark">${plantilla.tipo}</span>
                            </div>
                        </div>
                        <div class="card-body">
                            <p class="card-text">${plantilla.descripcion || 'Sin descripción'}</p>
                            <div class="mb-2">
                                <span class="badge bg-${categoriaColor}">${plantilla.categoria || 'general'}</span>
                                <small class="text-muted">
                                    <i class="fas fa-calendar"></i> ${new Date(plantilla.creado).toLocaleDateString()}
                                </small>
                            </div>
                        </div>
                        <div class="card-footer bg-white">
                            <div class="btn-group w-100">
                                <button class="btn btn-sm btn-outline-primary" onclick="cargarPlantillaEditor('${doc.id}')">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button class="btn btn-sm btn-outline-success" onclick="usarPlantillaId('${doc.id}')">
                                    <i class="fas fa-play"></i> Usar
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="eliminarPlantilla('${doc.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            grid.innerHTML += card;
        });
        
        // Actualizar contador
        document.getElementById('contadorPlantillas').textContent = contador;
        
    } catch (error) {
        console.error('Error cargando plantillas:', error);
        document.getElementById('gridPlantillas').innerHTML = `
            <div class="col-12 text-center text-danger">
                <i class="fas fa-exclamation-triangle fa-2x"></i>
                <p>Error cargando plantillas: ${error.message}</p>
            </div>
        `;
    }
}

async function crearPlantilla() {
    const nombre = document.getElementById('nombrePlantilla').value.trim();
    const tipo = document.getElementById('tipoPlantilla').value;
    const categoria = document.getElementById('categoriaPlantilla').value;
    const descripcion = document.getElementById('descripcionPlantilla').value.trim();
    
    if (!nombre) {
        mostrarAlerta('Ingresa un nombre para la plantilla', 'warning');
        return;
    }
    
    try {
        const plantillaData = {
            nombre: nombre,
            tipo: tipo,
            categoria: categoria,
            descripcion: descripcion,
            creador: currentUser.uid,
            creador_nombre: currentUser.email,
            creado: new Date().toISOString(),
            contenido: {} // Estructura vacía que se llenará en el editor
        };
        
        // Crear estructura básica según el tipo
        switch(tipo) {
            case 'nota':
                plantillaData.contenido = {
                    titulo: nombre,
                    contenido: 'Contenido de la nota...',
                    importante: false
                };
                break;
                
            case 'checklist':
                plantillaData.contenido = {
                    titulo: nombre,
                    items: [
                        { id: 1, texto: 'Item 1', completado: false },
                        { id: 2, texto: 'Item 2', completado: false }
                    ]
                };
                break;
                
            case 'cuestionario':
                plantillaData.contenido = {
                    titulo: nombre,
                    preguntas: [
                        { id: 1, pregunta: 'Pregunta 1', tipo: 'texto', opciones: [] }
                    ]
                };
                break;
        }
        
        await db.collection('plantillas').add(plantillaData);
        
        // Limpiar formulario y recargar
        document.getElementById('nombrePlantilla').value = '';
        document.getElementById('descripcionPlantilla').value = '';
        
        mostrarAlerta('Plantilla creada exitosamente', 'success');
        await cargarPlantillas();
        
        // Cargar la nueva plantilla en el editor
        // Necesitaríamos obtener el ID de la plantilla recién creada
        // Por simplicidad, recargamos la última plantilla creada
        const snapshot = await db.collection('plantillas')
            .where('creador', '==', currentUser.uid)
            .orderBy('creado', 'desc')
            .limit(1)
            .get();
        
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            cargarPlantillaEditor(doc.id);
        }
        
    } catch (error) {
        mostrarAlerta('Error: ' + error.message, 'danger');
    }
}

async function cargarPlantillaEditor(plantillaId) {
    try {
        const doc = await db.collection('plantillas').doc(plantillaId).get();
        if (!doc.exists) {
            mostrarAlerta('Plantilla no encontrada', 'warning');
            return;
        }
        
        const plantilla = doc.data();
        plantillaActual = { id: plantillaId, ...plantilla };
        
        // Mostrar en el editor
        const editor = document.getElementById('editorPlantilla');
        let editorHtml = '';
        
        switch(plantilla.tipo) {
            case 'nota':
                editorHtml = crearEditorNota(plantilla.contenido);
                break;
            case 'checklist':
                editorHtml = crearEditorChecklist(plantilla.contenido);
                break;
            case 'cuestionario':
                editorHtml = crearEditorCuestionario(plantilla.contenido);
                break;
            default:
                editorHtml = `<p class="text-muted">Editor no disponible para este tipo de plantilla</p>`;
        }
        
        editor.innerHTML = `
            <div class="mb-3">
                <h5>Editando: ${plantilla.nombre}</h5>
                <small class="text-muted">Tipo: ${plantilla.tipo} | Categoría: ${plantilla.categoria}</small>
            </div>
            ${editorHtml}
            <div class="mt-3">
                <button class="btn btn-primary" onclick="guardarPlantilla()">
                    <i class="fas fa-save"></i> Guardar Cambios
                </button>
                <button class="btn btn-outline-secondary" onclick="actualizarVistaPrevia()">
                    <i class="fas fa-eye"></i> Actualizar Vista Previa
                </button>
            </div>
        `;
        
        // Actualizar vista previa
        actualizarVistaPrevia();
        
    } catch (error) {
        mostrarAlerta('Error: ' + error.message, 'danger');
    }
}

function crearEditorNota(contenido) {
    return `
        <div class="mb-3">
            <label class="form-label">Título de la Nota</label>
            <input type="text" class="form-control" id="editorTitulo" 
                   value="${contenido.titulo || ''}">
        </div>
        <div class="mb-3">
            <label class="form-label">Contenido</label>
            <textarea class="form-control" id="editorContenido" rows="6">${contenido.contenido || ''}</textarea>
        </div>
        <div class="mb-3 form-check">
            <input type="checkbox" class="form-check-input" id="editorImportante" 
                   ${contenido.importante ? 'checked' : ''}>
            <label class="form-check-label">Marcar como importante</label>
        </div>
    `;
}

function crearEditorChecklist(contenido) {
    let itemsHtml = '';
    
    if (contenido.items && Array.isArray(contenido.items)) {
        contenido.items.forEach((item, index) => {
            itemsHtml += `
                <div class="input-group mb-2">
                    <input type="text" class="form-control" value="${item.texto || ''}" 
                           id="editorItem${index}">
                    <button class="btn btn-outline-danger" type="button" onclick="eliminarItemChecklist(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        });
    }
    
    return `
        <div class="mb-3">
            <label class="form-label">Título del Checklist</label>
            <input type="text" class="form-control" id="editorTitulo" 
                   value="${contenido.titulo || ''}">
        </div>
        <div class="mb-3">
            <label class="form-label">Items</label>
            <div id="editorItemsContainer">
                ${itemsHtml}
            </div>
            <button class="btn btn-sm btn-outline-primary mt-2" onclick="agregarItemChecklist()">
                <i class="fas fa-plus"></i> Agregar Item
            </button>
        </div>
    `;
}

function crearEditorCuestionario(contenido) {
    let preguntasHtml = '';
    
    if (contenido.preguntas && Array.isArray(contenido.preguntas)) {
        contenido.preguntas.forEach((pregunta, index) => {
            let opcionesHtml = '';
            if (pregunta.opciones && Array.isArray(pregunta.opciones)) {
                pregunta.opciones.forEach((opcion, opcIndex) => {
                    opcionesHtml += `
                        <div class="input-group mb-1">
                            <input type="text" class="form-control" value="${opcion}" 
                                   id="editorPregunta${index}Opcion${opcIndex}">
                            <button class="btn btn-outline-danger" type="button" 
                                    onclick="eliminarOpcion(${index}, ${opcIndex})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                });
            }
            
            preguntasHtml += `
                <div class="card mb-3">
                    <div class="card-header">
                        <strong>Pregunta ${index + 1}</strong>
                        <button class="btn btn-sm btn-outline-danger float-end" 
                                onclick="eliminarPregunta(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <label class="form-label">Texto de la pregunta</label>
                            <input type="text" class="form-control" 
                                   value="${pregunta.pregunta || ''}" 
                                   id="editorPreguntaTexto${index}">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Tipo de respuesta</label>
                            <select class="form-select" id="editorPreguntaTipo${index}">
                                <option value="texto" ${pregunta.tipo === 'texto' ? 'selected' : ''}>Texto</option>
                                <option value="numero" ${pregunta.tipo === 'numero' ? 'selected' : ''}>Número</option>
                                <option value="opciones" ${pregunta.tipo === 'opciones' ? 'selected' : ''}>Opciones múltiples</option>
                                <option value="si_no" ${pregunta.tipo === 'si_no' ? 'selected' : ''}>Sí/No</option>
                            </select>
                        </div>
                        <div id="opcionesContainer${index}" class="${pregunta.tipo === 'opciones' ? '' : 'd-none'}">
                            <label class="form-label">Opciones</label>
                            ${opcionesHtml}
                            <button class="btn btn-sm btn-outline-primary" 
                                    onclick="agregarOpcion(${index})">
                                <i class="fas fa-plus"></i> Agregar Opción
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    return `
        <div class="mb-3">
            <label class="form-label">Título del Cuestionario</label>
            <input type="text" class="form-control" id="editorTitulo" 
                   value="${contenido.titulo || ''}">
        </div>
        <div class="mb-3">
            <label class="form-label">Preguntas</label>
            <div id="editorPreguntasContainer">
                ${preguntasHtml}
            </div>
            <button class="btn btn-sm btn-outline-primary mt-2" onclick="agregarPregunta()">
                <i class="fas fa-plus"></i> Agregar Pregunta
            </button>
        </div>
    `;
}

function agregarItemChecklist() {
    const container = document.getElementById('editorItemsContainer');
    const index = container.children.length;
    
    const div = document.createElement('div');
    div.className = 'input-group mb-2';
    div.innerHTML = `
        <input type="text" class="form-control" placeholder="Nuevo item..." id="editorItem${index}">
        <button class="btn btn-outline-danger" type="button" onclick="eliminarItemChecklist(${index})">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    container.appendChild(div);
}

function eliminarItemChecklist(index) {
    const container = document.getElementById('editorItemsContainer');
    if (container.children[index]) {
        container.removeChild(container.children[index]);
    }
}

function agregarPregunta() {
    // Esta función sería más compleja, requiere actualizar el DOM y los índices
    // Por simplicidad, recargamos la plantilla con una pregunta nueva
    if (!plantillaActual) return;
    
    if (!plantillaActual.contenido.preguntas) {
        plantillaActual.contenido.preguntas = [];
    }
    
    plantillaActual.contenido.preguntas.push({
        id: plantillaActual.contenido.preguntas.length + 1,
        pregunta: 'Nueva pregunta',
        tipo: 'texto',
        opciones: []
    });
    
    cargarPlantillaEditor(plantillaActual.id);
}

function eliminarPregunta(index) {
    if (!plantillaActual || !plantillaActual.contenido.preguntas) return;
    
    plantillaActual.contenido.preguntas.splice(index, 1);
    cargarPlantillaEditor(plantillaActual.id);
}

function agregarOpcion(preguntaIndex) {
    if (!plantillaActual || !plantillaActual.contenido.preguntas) return;
    
    if (!plantillaActual.contenido.preguntas[preguntaIndex].opciones) {
        plantillaActual.contenido.preguntas[preguntaIndex].opciones = [];
    }
    
    plantillaActual.contenido.preguntas[preguntaIndex].opciones.push('Nueva opción');
    cargarPlantillaEditor(plantillaActual.id);
}

function eliminarOpcion(preguntaIndex, opcionIndex) {
    if (!plantillaActual || !plantillaActual.contenido.preguntas) return;
    
    if (plantillaActual.contenido.preguntas[preguntaIndex].opciones) {
        plantillaActual.contenido.preguntas[preguntaIndex].opciones.splice(opcionIndex, 1);
        cargarPlantillaEditor(plantillaActual.id);
    }
}

async function guardarPlantilla() {
    if (!plantillaActual) return;
    
    try {
        // Recopilar datos del editor según el tipo
        let contenidoActualizado = {};
        
        switch(plantillaActual.tipo) {
            case 'nota':
                contenidoActualizado = {
                    titulo: document.getElementById('editorTitulo').value,
                    contenido: document.getElementById('editorContenido').value,
                    importante: document.getElementById('editorImportante').checked
                };
                break;
                
            case 'checklist':
                const items = [];
                const container = document.getElementById('editorItemsContainer');
                for (let i = 0; i < container.children.length; i++) {
                    const input = container.children[i].querySelector('input');
                    if (input && input.value.trim()) {
                        items.push({
                            id: i + 1,
                            texto: input.value.trim(),
                            completado: false
                        });
                    }
                }
                
                contenidoActualizado = {
                    titulo: document.getElementById('editorTitulo').value,
                    items: items
                };
                break;
                
            case 'cuestionario':
                // Esta sería más compleja de implementar completamente
                // Por ahora, mantenemos el contenido original
                contenidoActualizado = plantillaActual.contenido;
                break;
        }
        
        // Actualizar en Firestore
        await db.collection('plantillas').doc(plantillaActual.id).update({
            contenido: contenidoActualizado,
            actualizado: new Date().toISOString()
        });
        
        mostrarAlerta('Plantilla actualizada exitosamente', 'success');
        actualizarVistaPrevia();
        
    } catch (error) {
        mostrarAlerta('Error: ' + error.message, 'danger');
    }
}

function actualizarVistaPrevia() {
    if (!plantillaActual) return;
    
    const preview = document.getElementById('previewPlantilla');
    let previewHtml = '';
    
    switch(plantillaActual.tipo) {
        case 'nota':
            previewHtml = crearPreviewNota(plantillaActual.contenido);
            break;
        case 'checklist':
            previewHtml = crearPreviewChecklist(plantillaActual.contenido);
            break;
        case 'cuestionario':
            previewHtml = crearPreviewCuestionario(plantillaActual.contenido);
            break;
        default:
            previewHtml = `<p class="text-muted">Vista previa no disponible</p>`;
    }
    
    preview.innerHTML = previewHtml;
}

function crearPreviewNota(contenido) {
    return `
        <div class="card border-primary">
            <div class="card-header bg-primary text-white">
                <i class="fas fa-sticky-note"></i> ${contenido.titulo || 'Nota'}
                ${contenido.importante ? '<span class="badge bg-warning float-end">IMPORTANTE</span>' : ''}
            </div>
            <div class="card-body">
                <p>${contenido.contenido || 'Contenido de la nota...'}</p>
            </div>
            <div class="card-footer text-muted">
                <small>Plantilla: Nota/Aviso</small>
            </div>
        </div>
    `;
}

function crearPreviewChecklist(contenido) {
    let itemsHtml = '';
    
    if (contenido.items && Array.isArray(contenido.items)) {
        contenido.items.forEach(item => {
            itemsHtml += `
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="check${item.id}">
                    <label class="form-check-label" for="check${item.id}">
                        ${item.texto}
                    </label>
                </div>
            `;
        });
    }
    
    return `
        <div class="card border-success">
            <div class="card-header bg-success text-white">
                <i class="fas fa-tasks"></i> ${contenido.titulo || 'Checklist'}
            </div>
            <div class="card-body">
                ${itemsHtml || '<p class="text-muted">No hay items definidos</p>'}
            </div>
            <div class="card-footer text-muted">
                <small>Plantilla: Checklist</small>
            </div>
        </div>
    `;
}

function crearPreviewCuestionario(contenido) {
    let preguntasHtml = '';
    
    if (contenido.preguntas && Array.isArray(contenido.preguntas)) {
        contenido.preguntas.forEach((pregunta, index) => {
            let respuestaHtml = '';
            
            switch(pregunta.tipo) {
                case 'texto':
                    respuestaHtml = `<textarea class="form-control" rows="2" placeholder="Tu respuesta..."></textarea>`;
                    break;
                case 'numero':
                    respuestaHtml = `<input type="number" class="form-control" placeholder="Número">`;
                    break;
                case 'opciones':
                    let opcionesHtml = '';
                    if (pregunta.opciones && Array.isArray(pregunta.opciones)) {
                        pregunta.opciones.forEach(opcion => {
                            opcionesHtml += `
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="pregunta${index}">
                                    <label class="form-check-label">${opcion}</label>
                                </div>
                            `;
                        });
                    }
                    respuestaHtml = `<div>${opcionesHtml}</div>`;
                    break;
                case 'si_no':
                    respuestaHtml = `
                        <div class="btn-group" role="group">
                            <input type="radio" class="btn-check" name="pregunta${index}" id="si${index}">
                            <label class="btn btn-outline-success" for="si${index}">Sí</label>
                            
                            <input type="radio" class="btn-check" name="pregunta${index}" id="no${index}">
                            <label class="btn btn-outline-danger" for="no${index}">No</label>
                        </div>
                    `;
                    break;
            }
            
            preguntasHtml += `
                <div class="mb-3">
                    <label class="form-label">${index + 1}. ${pregunta.pregunta || 'Pregunta'}</label>
                    ${respuestaHtml}
                </div>
            `;
        });
    }
    
    return `
        <div class="card border-warning">
            <div class="card-header bg-warning text-white">
                <i class="fas fa-question-circle"></i> ${contenido.titulo || 'Cuestionario'}
            </div>
            <div class="card-body">
                ${preguntasHtml || '<p class="text-muted">No hay preguntas definidas</p>'}
            </div>
            <div class="card-footer text-muted">
                <small>Plantilla: Cuestionario</small>
            </div>
        </div>
    `;
}

function usarPlantilla() {
    if (!plantillaActual) {
        mostrarAlerta('No hay plantilla seleccionada', 'warning');
        return;
    }
    
    // Abrir la página de actividades con esta plantilla pre-cargada
    localStorage.setItem('plantilla_seleccionada', JSON.stringify(plantillaActual));
    window.open('actividades.html', '_blank');
}

function usarPlantillaId(plantillaId) {
    cargarPlantillaEditor(plantillaId).then(() => {
        usarPlantilla();
    });
}

function cargarPlantillaSugerida(tipo) {
    let plantillaSugerida = null;
    
    switch(tipo) {
        case 'reporte_semanal':
            plantillaSugerida = {
                nombre: 'Reporte Semanal de Actividades',
                tipo: 'cuestionario',
                categoria: 'reportes',
                descripcion: 'Plantilla para reporte semanal de actividades realizadas',
                contenido: {
                    titulo: 'Reporte Semanal de Actividades',
                    preguntas: [
                        {
                            id: 1,
                            pregunta: '¿Qué actividades realizaste esta semana?',
                            tipo: 'texto',
                            opciones: []
                        },
                        {
                            id: 2,
                            pregunta: '¿Cuántos alumnos asistieron regularmente?',
                            tipo: 'numero',
                            opciones: []
                        },
                        {
                            id: 3,
                            pregunta: '¿Tuviste algún problema o dificultad?',
                            tipo: 'texto',
                            opciones: []
                        },
                        {
                            id: 4,
                            pregunta: '¿Necesitas algún material o recurso para la próxima semana?',
                            tipo: 'texto',
                            opciones: []
                        }
                    ]
                }
            };
            break;
            
        case 'checklist_limpieza':
            plantillaSugerida = {
                nombre: 'Checklist de Limpieza del Aula',
                tipo: 'checklist',
                categoria: 'general',
                descripcion: 'Checklist para el mantenimiento y limpieza del salón de clases',
                contenido: {
                    titulo: 'Checklist de Limpieza del Aula',
                    items: [
                        { id: 1, texto: 'Barrer el salón', completado: false },
                        { id: 2, texto: 'Trapear el piso', completado: false },
                        { id: 3, texto: 'Limpiar pizarrones', completado: false },
                        { id: 4, texto: 'Organizar materiales', completado: false },
                        { id: 5, texto: 'Verificar iluminación', completado: false },
                        { id: 6, texto: 'Revisar ventilación', completado: false }
                    ]
                }
            };
            break;
    }
    
    if (plantillaSugerida) {
        // Cargar en el editor
        plantillaActual = plantillaSugerida;
        const editor = document.getElementById('editorPlantilla');
        
        let editorHtml = '';
        switch(plantillaSugerida.tipo) {
            case 'nota':
                editorHtml = crearEditorNota(plantillaSugerida.contenido);
                break;
            case 'checklist':
                editorHtml = crearEditorChecklist(plantillaSugerida.contenido);
                break;
            case 'cuestionario':
                editorHtml = crearEditorCuestionario(plantillaSugerida.contenido);
                break;
        }
        
        editor.innerHTML = `
            <div class="mb-3">
                <h5>Plantilla Sugerida: ${plantillaSugerida.nombre}</h5>
                <small class="text-muted">Puedes modificarla y guardarla como tu propia plantilla</small>
            </div>
            ${editorHtml}
            <div class="mt-3">
                <button class="btn btn-primary" onclick="guardarPlantillaSugerida()">
                    <i class="fas fa-save"></i> Guardar como Mi Plantilla
                </button>
                <button class="btn btn-outline-secondary" onclick="actualizarVistaPrevia()">
                    <i class="fas fa-eye"></i> Vista Previa
                </button>
            </div>
        `;
        
        actualizarVistaPrevia();
    }
}

async function guardarPlantillaSugerida() {
    if (!plantillaActual) return;
    
    const nombre = prompt('Nombre para tu plantilla:', plantillaActual.nombre);
    if (!nombre) return;
    
    try {
        const plantillaData = {
            nombre: nombre,
            tipo: plantillaActual.tipo,
            categoria: plantillaActual.categoria || 'general',
            descripcion: plantillaActual.descripcion || '',
            contenido: plantillaActual.contenido,
            creador: currentUser.uid,
            creador_nombre: currentUser.email,
            creado: new Date().toISOString()
        };
        
        await db.collection('plantillas').add(plantillaData);
        
        mostrarAlerta('Plantilla guardada exitosamente', 'success');
        await cargarPlantillas();
        
    } catch (error) {
        mostrarAlerta('Error: ' + error.message, 'danger');
    }
}

async function eliminarPlantilla(plantillaId) {
    if (!confirm('¿Estás seguro de eliminar esta plantilla?')) return;
    
    try {
        await db.collection('plantillas').doc(plantillaId).delete();
        mostrarAlerta('Plantilla eliminada exitosamente', 'success');
        await cargarPlantillas();
        
        // Limpiar editor si estaba editando esta plantilla
        if (plantillaActual && plantillaActual.id === plantillaId) {
            plantillaActual = null;
            document.getElementById('editorPlantilla').innerHTML = 
                '<p class="text-muted">Selecciona una plantilla para editarla</p>';
            document.getElementById('previewPlantilla').innerHTML = 
                '<p class="text-muted">La vista previa aparecerá aquí</p>';
        }
        
    } catch (error) {
        mostrarAlerta('Error: ' + error.message, 'danger');
    }
}

function buscarPlantillas() {
    const termino = document.getElementById('buscarPlantilla').value.toLowerCase();
    const cards = document.querySelectorAll('.plantilla-card');
    
    cards.forEach(card => {
        const texto = card.textContent.toLowerCase();
        if (texto.includes(termino)) {
            card.parentElement.style.display = 'block';
        } else {
            card.parentElement.style.display = 'none';
        }
    });
}

function importarPlantilla() {
    mostrarAlerta('Función de importación en desarrollo', 'info');
}

function exportarPlantilla() {
    if (!plantillaActual) {
        mostrarAlerta('No hay plantilla seleccionada', 'warning');
        return;
    }
    
    const json = JSON.stringify(plantillaActual, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `plantilla_${plantillaActual.nombre.replace(/\s+/g, '_')}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    mostrarAlerta('Plantilla exportada exitosamente', 'success');
}