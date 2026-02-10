// registro-movil.js - Registro con Firebase Realtime Database
document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    const usuario = conafeConfig.verificarAutenticacion();
    if (!usuario) return;
    
    // Inicializar
    inicializarRegistroMovil();
});

let comunidadesList = [];

async function inicializarRegistroMovil() {
    // Configurar eventos
    configurarEventos();
    
    // Cargar comunidades
    await cargarComunidades();
    
    // Cargar usuarios existentes
    await cargarUsuariosRegistrados();
    
    // Configurar fecha por defecto
    document.getElementById('fechaInicio').valueAsDate = new Date();
    
    // Mostrar sección de registro por defecto
    mostrarTab('registro');
}

function configurarEventos() {
    // Cambio de tipo de usuario
    document.getElementById('tipoUsuario').addEventListener('change', cambiarTipoUsuario);
    
    // Validación de teléfono
    document.getElementById('telefono').addEventListener('input', function(e) {
        this.value = this.value.replace(/\D/g, '').substring(0, 10);
    });
    
    // Validación de teléfono rápido
    document.getElementById('telefonoRapido').addEventListener('input', function(e) {
        this.value = this.value.replace(/\D/g, '').substring(0, 10);
    });
    
    // Agregar comunidad (para responsables)
    const btnAgregarComunidad = document.querySelector('[onclick="agregarComunidad()"]');
    if (btnAgregarComunidad) {
        btnAgregarComunidad.addEventListener('click', agregarComunidad);
    }
    
    // Registro principal
    const btnRegistrar = document.querySelector('[onclick="registrarUsuario()"]');
    if (btnRegistrar) {
        btnRegistrar.addEventListener('click', registrarUsuario);
    }
    
    // Búsqueda
    const inputBusqueda = document.getElementById('inputBusqueda');
    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', buscarUsuarios);
    }
    
    // Filtros
    document.querySelectorAll('[onclick^="filtrarPorTipo"]').forEach(btn => {
        const tipo = btn.getAttribute('onclick').match(/'([^']+)'/)[1];
        btn.addEventListener('click', () => filtrarPorTipo(tipo));
    });
}

async function cargarComunidades() {
    try {
        const snapshot = await db.comunidades.orderByChild('activa').equalTo(true).once('value');
        
        comunidadesList = [];
        const selectMaestro = document.getElementById('comunidadMaestro');
        const selectRapido = document.getElementById('comunidadRapido');
        
        if (selectMaestro) selectMaestro.innerHTML = '<option value="">Seleccionar comunidad...</option>';
        if (selectRapido) selectRapido.innerHTML = '<option value="">Seleccionar...</option>';
        
        snapshot.forEach(childSnapshot => {
            const comunidad = childSnapshot.val();
            comunidad.id = childSnapshot.key;
            comunidadesList.push(comunidad);
            
            // Agregar a selects
            if (selectMaestro) {
                const option = document.createElement('option');
                option.value = comunidad.id;
                option.textContent = comunidad.nombre;
                selectMaestro.appendChild(option);
            }
            
            if (selectRapido) {
                const option = document.createElement('option');
                option.value = comunidad.id;
                option.textContent = comunidad.nombre;
                selectRapido.appendChild(option);
            }
        });
        
    } catch (error) {
        console.error('Error cargando comunidades:', error);
        conafeConfig.mostrarAlerta('Error al cargar comunidades', 'danger');
    }
}

function cambiarTipoUsuario() {
    const tipo = document.getElementById('tipoUsuario').value;
    const camposMaestro = document.getElementById('camposMaestro');
    const camposResponsable = document.getElementById('camposResponsable');
    
    if (tipo === 'maestro') {
        if (camposMaestro) camposMaestro.style.display = 'block';
        if (camposResponsable) camposResponsable.style.display = 'none';
        document.title = 'CONAFE - Registro de Maestro';
    } else {
        if (camposMaestro) camposMaestro.style.display = 'none';
        if (camposResponsable) camposResponsable.style.display = 'block';
        document.title = 'CONAFE - Registro de Responsable';
    }
}

function agregarComunidad() {
    const input = document.getElementById('nuevaComunidad');
    const nombre = input.value.trim();
    
    if (!nombre) {
        conafeConfig.mostrarAlerta('Ingresa el nombre de la comunidad', 'warning');
        return;
    }
    
    const lista = document.getElementById('listaComunidades');
    const comunidadId = 'temp_' + Date.now();
    
    const chip = document.createElement('div');
    chip.className = 'comunidad-chip';
    chip.innerHTML = `
        ${nombre}
        <button type="button" onclick="removerComunidad('${comunidadId}')" class="btn-remover">
            <i class="material-icons">close</i>
        </button>
        <input type="hidden" name="comunidad" value="${nombre}" data-id="${comunidadId}">
    `;
    
    lista.appendChild(chip);
    input.value = '';
    input.focus();
}

function removerComunidad(id) {
    const chip = document.querySelector(`[data-id="${id}"]`).parentElement;
    if (chip) chip.remove();
}

function validarFormulario() {
    const nombre = document.getElementById('nombreCompleto').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const tipo = document.getElementById('tipoUsuario').value;
    const fechaInicio = document.getElementById('fechaInicio').value;
    
    if (!nombre) {
        conafeConfig.mostrarAlerta('El nombre es obligatorio', 'warning');
        return false;
    }
    
    if (!email) {
        conafeConfig.mostrarAlerta('El correo electrónico es obligatorio', 'warning');
        return false;
    }
    
    if (!/^\S+@\S+\.\S+$/.test(email)) {
        conafeConfig.mostrarAlerta('Ingresa un correo electrónico válido', 'warning');
        return false;
    }
    
    if (!telefono || telefono.length !== 10) {
        conafeConfig.mostrarAlerta('El teléfono debe tener 10 dígitos', 'warning');
        return false;
    }
    
    if (!fechaInicio) {
        conafeConfig.mostrarAlerta('La fecha de inicio es obligatoria', 'warning');
        return false;
    }
    
    if (tipo === 'maestro') {
        const comunidad = document.getElementById('comunidadMaestro').value;
        if (!comunidad) {
            conafeConfig.mostrarAlerta('Selecciona una comunidad para el maestro', 'warning');
            return false;
        }
    }
    
    return true;
}

async function registrarUsuario() {
    if (!validarFormulario()) return;
    
    const tipo = document.getElementById('tipoUsuario').value;
    const usuarioActual = conafeConfig.obtenerSesion();
    
    const datosUsuario = {
        nombre: document.getElementById('nombreCompleto').value.trim(),
        email: document.getElementById('email').value.trim().toLowerCase(),
        telefono: document.getElementById('telefono').value.trim(),
        rol: tipo === 'maestro' ? 'maestro' : 'responsable',
        fecha_inicio: document.getElementById('fechaInicio').value,
        observaciones: document.getElementById('observaciones').value.trim(),
        activo: true,
        creado_por: usuarioActual.id || usuarioActual.email,
        creado_en: firebase.database.ServerValue.TIMESTAMP,
        actualizado_en: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Campos específicos por tipo
    if (tipo === 'maestro') {
        datosUsuario.comunidad_id = document.getElementById('comunidadMaestro').value;
        datosUsuario.especialidad = document.getElementById('especialidad').value.trim();
        datosUsuario.grado = document.getElementById('grado').value;
        
        // Obtener nombre de la comunidad
        const comunidad = comunidadesList.find(c => c.id === datosUsuario.comunidad_id);
        if (comunidad) {
            datosUsuario.comunidad_nombre = comunidad.nombre;
        }
    } else {
        // Para responsables, obtener comunidades seleccionadas
        const comunidadesInputs = document.querySelectorAll('[name="comunidad"]');
        const comunidades = Array.from(comunidadesInputs).map(input => input.value.trim()).filter(val => val);
        datosUsuario.comunidades = comunidades;
        datosUsuario.zona = document.getElementById('zona').value.trim();
        datosUsuario.vehiculo = document.getElementById('vehiculo').value.trim();
    }
    
    try {
        // Deshabilitar botón durante el registro
        const btn = document.getElementById('btnRegistrar');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="loading"></span> Registrando...';
        btn.disabled = true;
        
        // 1. Crear usuario en Firebase Auth
        const password = generarPassword();
        const credenciales = await auth.createUserWithEmailAndPassword(datosUsuario.email, password);
        
        // 2. Guardar en Realtime Database
        const nuevoRef = db.usuarios.push();
        datosUsuario.id = nuevoRef.key;
        datosUsuario.auth_uid = credenciales.user.uid;
        datosUsuario.password_temporal = password;
        
        await nuevoRef.set(datosUsuario);
        
        // 3. Cerrar sesión del usuario temporal y reautenticar
        await auth.signOut();
        
        // Reautenticar usuario original si existe
        if (usuarioActual.email) {
            // Nota: Necesitaríamos la contraseña del usuario original
            // En un caso real, deberíamos manejarlo diferente
        }
        
        // 4. Mostrar éxito
        conafeConfig.mostrarAlerta(`Usuario registrado exitosamente! ID: ${datosUsuario.id.slice(0, 8)}`, 'success');
        
        // 5. Mostrar credenciales
        mostrarCredenciales(datosUsuario.email, password, datosUsuario.nombre);
        
        // 6. Limpiar formulario
        limpiarFormulario();
        
        // 7. Recargar lista
        await cargarUsuariosRegistrados();
        
    } catch (error) {
        console.error('Error registrando usuario:', error);
        
        let mensaje = 'Error al registrar usuario';
        if (error.code === 'auth/email-already-in-use') {
            mensaje = 'Este correo electrónico ya está registrado';
        } else if (error.code === 'auth/weak-password') {
            mensaje = 'La contraseña es muy débil';
        } else if (error.code === 'auth/invalid-email') {
            mensaje = 'Email inválido';
        }
        
        conafeConfig.mostrarAlerta(mensaje, 'danger');
        
    } finally {
        // Rehabilitar botón
        const btn = document.getElementById('btnRegistrar');
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

function generarPassword() {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return password;
}

function mostrarCredenciales(email, password, nombre) {
    const alerta = document.createElement('div');
    alerta.className = 'alert alert-info';
    alerta.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 10px;">
            <i class="material-icons">vpn_key</i>
            <div style="flex: 1;">
                <strong>Credenciales Generadas</strong>
                <div style="margin-top: 5px; font-size: 0.9rem;">
                    <div><strong>Nombre:</strong> ${nombre}</div>
                    <div><strong>Usuario:</strong> ${email}</div>
                    <div><strong>Contraseña:</strong> ${password}</div>
                    <div style="margin-top: 8px; color: #666; font-size: 0.85rem;">
                        <i class="material-icons" style="font-size: 14px; vertical-align: middle;">info</i>
                        Anota estas credenciales para compartirlas con el usuario
                    </div>
                </div>
            </div>
            <button onclick="copiarCredenciales('${email}', '${password}', '${nombre}')" 
                    class="btn-copiar">
                <i class="material-icons">content_copy</i>
            </button>
        </div>
    `;
    
    const container = document.getElementById('alertsContainer') || document.querySelector('.app-content');
    container.insertBefore(alerta, container.firstChild);
    
    // Auto-eliminar después de 30 segundos
    setTimeout(() => {
        if (alerta.parentNode) {
            alerta.remove();
        }
    }, 30000);
}

function copiarCredenciales(email, password, nombre) {
    const texto = `CONAFE - Credenciales de acceso\n\nNombre: ${nombre}\nUsuario: ${email}\nContraseña: ${password}\n\nGuarda esta información en un lugar seguro.`;
    
    navigator.clipboard.writeText(texto).then(() => {
        conafeConfig.mostrarAlerta('Credenciales copiadas al portapapeles', 'success');
    }).catch(err => {
        console.error('Error copiando:', err);
        // Fallback para navegadores antiguos
        const textarea = document.createElement('textarea');
        textarea.value = texto;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        conafeConfig.mostrarAlerta('Credenciales copiadas', 'success');
    });
}

async function cargarUsuariosRegistrados() {
    try {
        const snapshot = await db.usuarios.orderByChild('creado_en').limitToLast(50).once('value');
        
        const usuarios = [];
        snapshot.forEach(childSnapshot => {
            const usuario = childSnapshot.val();
            usuario.id = childSnapshot.key;
            usuarios.push(usuario);
        });
        
        // Ordenar por fecha más reciente
        usuarios.sort((a, b) => b.creado_en - a.creado_en);
        
        // Guardar globalmente
        window.usuariosRegistrados = usuarios;
        
        // Actualizar lista
        actualizarListaUsuarios(usuarios);
        
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        conafeConfig.mostrarAlerta('Error al cargar usuarios', 'danger');
    }
}

function actualizarListaUsuarios(usuarios) {
    const container = document.getElementById('listaUsuarios');
    if (!container) return;
    
    if (!usuarios || usuarios.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="material-icons">group</i>
                <h3>No hay usuarios registrados</h3>
                <p>Los usuarios que registres aparecerán aquí</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="registro-list">';
    
    usuarios.forEach(usuario => {
        const esMaestro = usuario.rol === 'maestro';
        const fecha = usuario.creado_en ? new Date(usuario.creado_en).toLocaleDateString('es-MX') : 'No especificada';
        const comunidad = esMaestro ? 
            (usuario.comunidad_nombre || 'Sin comunidad') : 
            (usuario.comunidades ? usuario.comunidades.join(', ') : 'Sin comunidades');
        
        html += `
            <div class="registro-item" onclick="verDetalleUsuario('${usuario.id}')">
                <div class="registro-avatar ${esMaestro ? 'avatar-maestro' : 'avatar-responsable'}">
                    <i class="material-icons">${esMaestro ? 'person' : 'supervisor_account'}</i>
                </div>
                <div class="registro-info">
                    <div class="registro-nombre">${usuario.nombre}</div>
                    <div class="registro-detalle">
                        <span><i class="material-icons">email</i> ${usuario.email || 'Sin email'}</span>
                        <span><i class="material-icons">phone</i> ${usuario.telefono || 'Sin teléfono'}</span>
                    </div>
                    <div class="registro-comunidad">
                        <i class="material-icons">location_on</i> ${comunidad}
                    </div>
                    <div class="registro-fecha">
                        <small>Registrado: ${fecha}</small>
                    </div>
                </div>
                <i class="material-icons">chevron_right</i>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function buscarUsuarios() {
    const termino = document.getElementById('inputBusqueda').value.toLowerCase().trim();
    const resultados = document.getElementById('resultadosBusqueda');
    
    if (!termino) {
        resultados.innerHTML = `
            <div class="empty-state">
                <i class="material-icons">search</i>
                <h3>Buscar usuarios</h3>
                <p>Escribe un nombre, email o teléfono para buscar</p>
            </div>
        `;
        return;
    }
    
    const usuarios = window.usuariosRegistrados || [];
    const encontrados = usuarios.filter(u => 
        (u.nombre && u.nombre.toLowerCase().includes(termino)) ||
        (u.email && u.email.toLowerCase().includes(termino)) ||
        (u.telefono && u.telefono.includes(termino))
    );
    
    if (encontrados.length === 0) {
        resultados.innerHTML = `
            <div class="empty-state">
                <i class="material-icons">search_off</i>
                <h3>No se encontraron resultados</h3>
                <p>Intenta con otros términos de búsqueda</p>
            </div>
        `;
        return;
    }
    
    actualizarListaUsuarios(encontrados);
}

function filtrarPorTipo(tipo) {
    const usuarios = window.usuariosRegistrados || [];
    
    if (tipo === 'todos') {
        actualizarListaUsuarios(usuarios);
    } else {
        const filtrados = usuarios.filter(u => u.rol === tipo);
        actualizarListaUsuarios(filtrados);
    }
}

function mostrarTab(tab) {
    // Ocultar todas las secciones
    document.getElementById('seccionRegistro').style.display = 'none';
    document.getElementById('seccionLista').style.display = 'none';
    document.getElementById('seccionBuscar').style.display = 'none';
    
    // Desactivar todas las tabs
    document.querySelectorAll('.nav-tab').forEach(tabEl => {
        tabEl.classList.remove('active');
    });
    
    // Mostrar sección seleccionada y activar tab
    const seccionId = `seccion${tab.charAt(0).toUpperCase() + tab.slice(1)}`;
    const tabId = `tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`;
    
    document.getElementById(seccionId).style.display = 'block';
    document.getElementById(tabId).classList.add('active');
}

function limpiarFormulario() {
    document.getElementById('nombreCompleto').value = '';
    document.getElementById('email').value = '';
    document.getElementById('telefono').value = '';
    document.getElementById('comunidadMaestro').value = '';
    document.getElementById('especialidad').value = '';
    document.getElementById('grado').value = '';
    document.getElementById('zona').value = '';
    document.getElementById('vehiculo').value = '';
    document.getElementById('observaciones').value = '';
    document.getElementById('listaComunidades').innerHTML = '';
    document.getElementById('fechaInicio').valueAsDate = new Date();
}

// Funciones para modales
function mostrarModalQR() {
    // Implementación de escaneo QR
    conafeConfig.mostrarAlerta('Función de escaneo QR en desarrollo', 'info');
}

function mostrarFormularioRapido() {
    // Implementación de registro rápido
    conafeConfig.mostrarAlerta('Función de registro rápido en desarrollo', 'info');
}

// Exportar funciones globales
window.registroMovil = {
    inicializarRegistroMovil,
    registrarUsuario,
    buscarUsuarios,
    filtrarPorTipo,
    mostrarTab,
    mostrarModalQR,
    mostrarFormularioRapido
};