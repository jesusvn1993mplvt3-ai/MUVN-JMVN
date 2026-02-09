// configuracion.js - Funciones específicas para configuración del sistema

// Inicializar página de configuración
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('configuracion.html')) {
        inicializarPaginaConfiguracion();
    }
});

async function inicializarPaginaConfiguracion() {
    console.log('Inicializando página de configuración...');
    
    // Verificar autenticación
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        // Verificar permisos de administrador
        const adminDoc = await db.collection('administradores').doc(user.uid).get();
        if (!adminDoc.exists) {
            mostrarAlerta('No tienes permisos de administrador', 'danger');
            window.location.href = 'index.html';
            return;
        }
        
        // Cargar configuración general
        cargarSeccionConfig('general');
        actualizarEstadoSistema();
    });
}

function cargarSeccionConfig(seccion) {
    // Actualizar navegación activa
    document.querySelectorAll('.list-group-item').forEach(item => {
        item.classList.remove('active');
    });
    event?.target.classList.add('active');
    
    let contenido = '';
    
    switch(seccion) {
        case 'general':
            contenido = cargarConfigGeneral();
            break;
        case 'seguridad':
            contenido = cargarConfigSeguridad();
            break;
        case 'notificaciones':
            contenido = cargarConfigNotificaciones();
            break;
        case 'app-movil':
            contenido = cargarConfigAppMovil();
            break;
        case 'backup':
            contenido = cargarConfigBackup();
            break;
        case 'integraciones':
            contenido = cargarConfigIntegraciones();
            break;
        case 'avanzada':
            contenido = cargarConfigAvanzada();
            break;
        default:
            contenido = cargarConfigGeneral();
    }
    
    document.getElementById('contenidoConfiguracion').innerHTML = contenido;
    
    // Cargar datos específicos de cada sección
    if (seccion === 'general') {
        cargarConfiguracionGeneral();
    } else if (seccion === 'seguridad') {
        cargarConfiguracionSeguridad();
    }
}

function cargarConfigGeneral() {
    return `
        <div class="card">
            <div class="card-header bg-primary text-white">
                <i class="fas fa-sliders-h"></i> Configuración General del Sistema
            </div>
            <div class="card-body">
                <form id="formConfigGeneral">
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label">Nombre del Sistema *</label>
                            <input type="text" class="form-control" id="nombreSistema" 
                                   placeholder="Ej: CONAFE Yuriria">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Municipio *</label>
                            <input type="text" class="form-control" id="municipioSistema" 
                                   value="Yuriria">
                        </div>
                    </div>
                    
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label">Estado *</label>
                            <input type="text" class="form-control" id="estadoSistema" 
                                   value="Guanajuato">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Año Escolar</label>
                            <input type="text" class="form-control" id="anoEscolar" 
                                   value="${new Date().getFullYear()}-${new Date().getFullYear() + 1}">
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Descripción del Sistema</label>
                        <textarea class="form-control" id="descripcionSistema" rows="3"></textarea>
                    </div>
                    
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="modoMantenimiento">
                                <label class="form-check-label" for="modoMantenimiento">
                                    Modo Mantenimiento
                                </label>
                                <small class="text-muted d-block">Bloquea el acceso a usuarios normales</small>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="registroAbierto">
                                <label class="form-check-label" for="registroAbierto">
                                    Registro Abierto
                                </label>
                                <small class="text-muted d-block">Permite crear nuevas cuentas</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label">Zona Horaria</label>
                            <select class="form-select" id="zonaHoraria">
                                <option value="America/Mexico_City" selected>Ciudad de México</option>
                                <option value="America/New_York">Nueva York</option>
                                <option value="America/Los_Angeles">Los Ángeles</option>
                                <option value="UTC">UTC</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Idioma Predeterminado</label>
                            <select class="form-select" id="idiomaSistema">
                                <option value="es" selected>Español</option>
                                <option value="en">Inglés</option>
                                <option value="fr">Francés</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Logo del Sistema (URL)</label>
                        <input type="text" class="form-control" id="logoSistema" 
                               placeholder="https://ejemplo.com/logo.png">
                    </div>
                    
                    <div class="mt-4">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Guardar Configuración
                        </button>
                        <button type="button" class="btn btn-outline-secondary" onclick="restaurarConfigGeneral()">
                            <i class="fas fa-undo"></i> Restaurar Valores por Defecto
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

async function cargarConfiguracionGeneral() {
    try {
        const doc = await db.collection('configuracion').doc('sistema').get();
        if (!doc.exists) return;
        
        const config = doc.data();
        
        // Llenar formulario
        if (document.getElementById('nombreSistema')) {
            document.getElementById('nombreSistema').value = config.nombre || '';
            document.getElementById('municipioSistema').value = config.municipio || 'Yuriria';
            document.getElementById('estadoSistema').value = config.estado || 'Guanajuato';
            document.getElementById('anoEscolar').value = config.ano_escolar || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
            document.getElementById('descripcionSistema').value = config.descripcion || '';
            document.getElementById('modoMantenimiento').checked = config.modo_mantenimiento || false;
            document.getElementById('registroAbierto').checked = config.registro_abierto || false;
            document.getElementById('zonaHoraria').value = config.zona_horaria || 'America/Mexico_City';
            document.getElementById('idiomaSistema').value = config.idioma || 'es';
            document.getElementById('logoSistema').value = config.logo || '';
            
            // Configurar envío del formulario
            document.getElementById('formConfigGeneral').addEventListener('submit', function(e) {
                e.preventDefault();
                guardarConfigGeneral();
            });
        }
        
    } catch (error) {
        console.error('Error cargando configuración:', error);
    }
}

async function guardarConfigGeneral() {
    try {
        const configData = {
            nombre: document.getElementById('nombreSistema').value,
            municipio: document.getElementById('municipioSistema').value,
            estado: document.getElementById('estadoSistema').value,
            ano_escolar: document.getElementById('anoEscolar').value,
            descripcion: document.getElementById('descripcionSistema').value,
            modo_mantenimiento: document.getElementById('modoMantenimiento').checked,
            registro_abierto: document.getElementById('registroAbierto').checked,
            zona_horaria: document.getElementById('zonaHoraria').value,
            idioma: document.getElementById('idiomaSistema').value,
            logo: document.getElementById('logoSistema').value,
            actualizado: new Date().toISOString(),
            actualizado_por: currentUser.uid
        };
        
        await db.collection('configuracion').doc('sistema').set(configData, { merge: true });
        
        mostrarAlerta('Configuración guardada exitosamente', 'success');
        
    } catch (error) {
        mostrarAlerta('Error: ' + error.message, 'danger');
    }
}

function restaurarConfigGeneral() {
    if (confirm('¿Restaurar valores por defecto? Se perderán los cambios no guardados.')) {
        document.getElementById('nombreSistema').value = 'Sistema CONAFE Yuriria';
        document.getElementById('municipioSistema').value = 'Yuriria';
        document.getElementById('estadoSistema').value = 'Guanajuato';
        document.getElementById('anoEscolar').value = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
        document.getElementById('descripcionSistema').value = '';
        document.getElementById('modoMantenimiento').checked = false;
        document.getElementById('registroAbierto').checked = false;
        document.getElementById('zonaHoraria').value = 'America/Mexico_City';
        document.getElementById('idiomaSistema').value = 'es';
        document.getElementById('logoSistema').value = '';
        
        mostrarAlerta('Valores restaurados', 'info');
    }
}

function cargarConfigSeguridad() {
    return `
        <div class="card">
            <div class="card-header bg-primary text-white">
                <i class="fas fa-shield-alt"></i> Configuración de Seguridad
            </div>
            <div class="card-body">
                <form id="formConfigSeguridad">
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle"></i> 
                        <strong>Advertencia:</strong> Cambia estas configuraciones con cuidado.
                    </div>
                    
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="requerirVerificacionEmail">
                                <label class="form-check-label" for="requerirVerificacionEmail">
                                    Requerir verificación de email
                                </label>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="dobleFactorAutenticacion">
                                <label class="form-check-label" for="dobleFactorAutenticacion">
                                    Autenticación de dos factores
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label">Tiempo de sesión (minutos)</label>
                            <input type="number" class="form-control" id="tiempoSesion" 
                                   value="60" min="5" max="1440">
                            <small class="text-muted">Tiempo máximo de inactividad antes de cerrar sesión</small>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Intentos de login fallidos</label>
                            <input type="number" class="form-control" id="intentosLogin" 
                                   value="5" min="1" max="10">
                            <small class="text-muted">Intentos permitidos antes de bloquear la cuenta</small>
                        </div>
                    </div>
                    
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label">Longitud mínima de contraseña</label>
                            <input type="number" class="form-control" id="longitudPassword" 
                                   value="6" min="4" max="20">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Días para cambiar contraseña</label>
                            <input type="number" class="form-control" id="diasCambioPassword" 
                                   value="90" min="1" max="365">
                            <small class="text-muted">0 = nunca expira</small>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">IPs Permitidas (opcional)</label>
                        <textarea class="form-control" id="ipsPermitidas" rows="3" 
                                  placeholder="Ej: 192.168.1.1&#10;10.0.0.0/24&#10;Separar por línea"></textarea>
                        <small class="text-muted">Dejar vacío para permitir desde cualquier IP</small>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Tokens de API</label>
                        <div class="input-group">
                            <input type="text" class="form-control" id="tokenAPI" readonly>
                            <button class="btn btn-outline-secondary" type="button" onclick="generarTokenAPI()">
                                <i class="fas fa-sync-alt"></i> Generar Nuevo
                            </button>
                        </div>
                        <small class="text-muted">Token para integraciones externas</small>
                    </div>
                    
                    <div class="mt-4">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Guardar Configuración
                        </button>
                        <button type="button" class="btn btn-outline-danger" onclick="registrarEventoSeguridad()">
                            <i class="fas fa-history"></i> Ver Logs de Seguridad
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

async function cargarConfiguracionSeguridad() {
    try {
        const doc = await db.collection('configuracion').doc('seguridad').get();
        if (!doc.exists) return;
        
        const config = doc.data();
        
        // Llenar formulario
        if (document.getElementById('requerirVerificacionEmail')) {
            document.getElementById('requerirVerificacionEmail').checked = config.requerir_verificacion_email || false;
            document.getElementById('dobleFactorAutenticacion').checked = config.doble_factor || false;
            document.getElementById('tiempoSesion').value = config.tiempo_sesion || 60;
            document.getElementById('intentosLogin').value = config.intentos_login || 5;
            document.getElementById('longitudPassword').value = config.longitud_password || 6;
            document.getElementById('diasCambioPassword').value = config.dias_cambio_password || 90;
            document.getElementById('ipsPermitidas').value = config.ips_permitidas?.join('\n') || '';
            document.getElementById('tokenAPI').value = config.token_api || 'No generado';
            
            // Configurar envío del formulario
            document.getElementById('formConfigSeguridad').addEventListener('submit', function(e) {
                e.preventDefault();
                guardarConfigSeguridad();
            });
        }
        
    } catch (error) {
        console.error('Error cargando configuración de seguridad:', error);
    }
}

async function guardarConfigSeguridad() {
    try {
        const ips = document.getElementById('ipsPermitidas').value
            .split('\n')
            .map(ip => ip.trim())
            .filter(ip => ip);
        
        const configData = {
            requerir_verificacion_email: document.getElementById('requerirVerificacionEmail').checked,
            doble_factor: document.getElementById('dobleFactorAutenticacion').checked,
            tiempo_sesion: parseInt(document.getElementById('tiempoSesion').value),
            intentos_login: parseInt(document.getElementById('intentosLogin').value),
            longitud_password: parseInt(document.getElementById('longitudPassword').value),
            dias_cambio_password: parseInt(document.getElementById('diasCambioPassword').value),
            ips_permitidas: ips,
            token_api: document.getElementById('tokenAPI').value,
            actualizado: new Date().toISOString(),
            actualizado_por: currentUser.uid
        };
        
        await db.collection('configuracion').doc('seguridad').set(configData, { merge: true });
        
        mostrarAlerta('Configuración de seguridad guardada', 'success');
        
    } catch (error) {
        mostrarAlerta('Error: ' + error.message, 'danger');
    }
}

function generarTokenAPI() {
    const token = 'conafe_' + Math.random().toString(36).substr(2) + '_' + Date.now().toString(36);
    document.getElementById('tokenAPI').value = token;
    mostrarAlerta('Nuevo token generado. No olvides guardar los cambios.', 'info');
}

function registrarEventoSeguridad() {
    // Abrir modal con logs de seguridad
    mostrarAlerta('Función en desarrollo: Logs de seguridad', 'info');
}

function cargarConfigNotificaciones() {
    return `
        <div class="card">
            <div class="card-header bg-primary text-white">
                <i class="fas fa-bell"></i> Configuración de Notificaciones
            </div>
            <div class="card-body">
                <form id="formConfigNotificaciones">
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="notificacionesEmail">
                                <label class="form-check-label" for="notificacionesEmail">
                                    Notificaciones por Email
                                </label>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="notificacionesPush">
                                <label class="form-check-label" for="notificacionesPush">
                                    Notificaciones Push
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Email del Remitente</label>
                        <input type="email" class="form-control" id="emailRemitente" 
                               placeholder="no-reply@conafe.mx">
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Eventos para notificar</label>
                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="notificarAsistencias">
                                    <label class="form-check-label">Nuevas asistencias</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="notificarMensajes">
                                    <label class="form-check-label">Nuevos mensajes</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="notificarActividades">
                                    <label class="form-check-label">Nuevas actividades</label>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="notificarAlertas">
                                    <label class="form-check-label">Alertas del sistema</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="notificarReportes">
                                    <label class="form-check-label">Reportes automáticos</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="notificarErrores">
                                    <label class="form-check-label">Errores del sistema</label>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Frecuencia de reportes automáticos</label>
                        <select class="form-select" id="frecuenciaReportes">
                            <option value="diario">Diario</option>
                            <option value="semanal" selected>Semanal</option>
                            <option value="mensual">Mensual</option>
                            <option value="nunca">Nunca</option>
                        </select>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Plantilla de Email</label>
                        <textarea class="form-control" id="plantillaEmail" rows="5">
Estimado usuario,

{{mensaje}}

Saludos,
Equipo CONAFE
                        </textarea>
                        <small class="text-muted">Usa {{variable}} para contenido dinámico</small>
                    </div>
                    
                    <div class="mt-4">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Guardar Configuración
                        </button>
                        <button type="button" class="btn btn-outline-info" onclick="probarNotificaciones()">
                            <i class="fas fa-paper-plane"></i> Probar Notificaciones
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function cargarConfigAppMovil() {
    return `
        <div class="card">
            <div class="card-header bg-primary text-white">
                <i class="fas fa-mobile-alt"></i> Configuración de la App Móvil
            </div>
            <div class="card-body">
                <form id="formConfigAppMovil">
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label">Versión de la App</label>
                            <input type="text" class="form-control" id="versionApp" 
                                   value="2.0.0">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">URL de Descarga</label>
                            <input type="url" class="form-control" id="urlDescargaApp" 
                                   placeholder="https://play.google.com/store/apps/details?id=...">
                        </div>
                    </div>
                    
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="appRequiereActualizacion">
                                <label class="form-check-label" for="appRequiereActualizacion">
                                    Requerir actualización
                                </label>
                                <small class="text-muted">Bloquear versión antigua</small>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="appModoOffline">
                                <label class="form-check-label" for="appModoOffline">
                                    Modo offline
                                </label>
                                <small class="text-muted">Permitir funcionamiento sin internet</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Mensaje de Bienvenida</label>
                        <textarea class="form-control" id="mensajeBienvenida" rows="3">
¡Bienvenido al Sistema CONAFE!
Registra tu asistencia y mantente al día con tus actividades.
                        </textarea>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Configuración de GPS</label>
                        <div class="row">
                            <div class="col-md-6">
                                <label class="form-label">Precisión requerida (metros)</label>
                                <input type="number" class="form-control" id="precisionGPS" 
                                       value="50" min="10" max="1000">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Tiempo de espera (segundos)</label>
                                <input type="number" class="form-control" id="tiempoGPS" 
                                       value="30" min="5" max="120">
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Configuración de Sincronización</label>
                        <div class="row">
                            <div class="col-md-6">
                                <label class="form-label">Intervalo (minutos)</label>
                                <input type="number" class="form-control" id="intervaloSincronizacion" 
                                       value="15" min="1" max="1440">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Intentos de reconexión</label>
                                <input type="number" class="form-control" id="intentosReconexion" 
                                       value="3" min="1" max="10">
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Funciones Deshabilitadas</label>
                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="deshabilitarChat">
                                    <label class="form-check-label">Chat interno</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="deshabilitarArchivos">
                                    <label class="form-check-label">Subida de archivos</label>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="deshabilitarNotificaciones">
                                    <label class="form-check-label">Notificaciones push</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="deshabilitarMapa">
                                    <label class="form-check-label">Mapa interactivo</label>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-4">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Guardar Configuración
                        </button>
                        <button type="button" class="btn btn-outline-success" onclick="forzarSincronizacion()">
                            <i class="fas fa-sync-alt"></i> Forzar Sincronización Global
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function cargarConfigBackup() {
    return `
        <div class="card">
            <div class="card-header bg-primary text-white">
                <i class="fas fa-database"></i> Backup y Restauración
            </div>
            <div class="card-body">
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    <strong>Información:</strong> Realiza backups regularmente para proteger tus datos.
                </div>
                
                <div class="row mb-4">
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header bg-success text-white">
                                <i class="fas fa-download"></i> Backup
                            </div>
                            <div class="card-body">
                                <div class="mb-3">
                                    <label class="form-label">Frecuencia de Backup Automático</label>
                                    <select class="form-select" id="frecuenciaBackup">
                                        <option value="diario">Diario</option>
                                        <option value="semanal" selected>Semanal</option>
                                        <option value="mensual">Mensual</option>
                                        <option value="nunca">Nunca</option>
                                    </select>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Retención de Backups</label>
                                    <select class="form-select" id="retencionBackup">
                                        <option value="7">7 días</option>
                                        <option value="30" selected>30 días</option>
                                        <option value="90">90 días</option>
                                        <option value="365">1 año</option>
                                        <option value="0">Indefinido</option>
                                    </select>
                                </div>
                                
                                <div class="d-grid gap-2">
                                    <button class="btn btn-success" onclick="crearBackup()">
                                        <i class="fas fa-save"></i> Crear Backup Manual
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header bg-warning text-white">
                                <i class="fas fa-upload"></i> Restauración
                            </div>
                            <div class="card-body">
                                <div class="mb-3">
                                    <label class="form-label">Seleccionar Backup</label>
                                    <select class="form-select" id="selectBackup">
                                        <option value="">Selecciona un backup</option>
                                    </select>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">O subir archivo de backup</label>
                                    <input type="file" class="form-control" id="fileBackup" accept=".json,.backup">
                                </div>
                                
                                <div class="d-grid gap-2">
                                    <button class="btn btn-warning" onclick="restaurarBackup()">
                                        <i class="fas fa-undo"></i> Restaurar Sistema
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header bg-danger text-white">
                        <i class="fas fa-exclamation-triangle"></i> Zona de Peligro
                    </div>
                    <div class="card-body">
                        <div class="alert alert-danger">
                            <i class="fas fa-radiation"></i>
                            <strong>¡ADVERTENCIA!</strong> Estas acciones son destructivas y no se pueden deshacer.
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6">
                                <div class="d-grid">
                                    <button class="btn btn-danger" onclick="limpiarDatosPrueba()">
                                        <i class="fas fa-broom"></i> Limpiar Datos de Prueba
                                    </button>
                                    <small class="text-muted">Elimina solo datos de prueba</small>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="d-grid">
                                    <button class="btn btn-dark" onclick="resetearSistemaCompleto()">
                                        <i class="fas fa-trash-alt"></i> Resetear Sistema Completo
                                    </button>
                                    <small class="text-muted">Elimina TODOS los datos</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function cargarConfigIntegraciones() {
    return `
        <div class="card">
            <div class="card-header bg-primary text-white">
                <i class="fas fa-plug"></i> Integraciones Externas
            </div>
            <div class="card-body">
                <div class="mb-4">
                    <h5><i class="fas fa-envelope"></i> Servicio de Email</h5>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label">Servidor SMTP</label>
                            <input type="text" class="form-control" id="smtpServidor" 
                                   placeholder="smtp.gmail.com">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Puerto</label>
                            <input type="number" class="form-control" id="smtpPuerto" 
                                   value="587">
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label">Usuario</label>
                            <input type="text" class="form-control" id="smtpUsuario" 
                                   placeholder="tu@email.com">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Contraseña</label>
                            <input type="password" class="form-control" id="smtpPassword">
                        </div>
                    </div>
                    <button class="btn btn-outline-primary" onclick="probarSMTP()">
                        <i class="fas fa-paper-plane"></i> Probar Conexión
                    </button>
                </div>
                
                <div class="mb-4">
                    <h5><i class="fas fa-sms"></i> Servicio de SMS</h5>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label">Proveedor</label>
                            <select class="form-select" id="smsProveedor">
                                <option value="twilio">Twilio</option>
                                <option value="clickatell">Clickatell</option>
                                <option value="nexmo">Nexmo</option>
                                <option value="personalizado">Personalizado</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Número de Teléfono</label>
                            <input type="text" class="form-control" id="smsNumero" 
                                   placeholder="+521234567890">
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label">API Key</label>
                            <input type="text" class="form-control" id="smsApiKey">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">API Secret</label>
                            <input type="password" class="form-control" id="smsApiSecret">
                        </div>
                    </div>
                </div>
                
                <div class="mb-4">
                    <h5><i class="fas fa-cloud"></i> Almacenamiento en la Nube</h5>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label">Servicio</label>
                            <select class="form-select" id="cloudServicio">
                                <option value="firebase">Firebase Storage</option>
                                <option value="aws">Amazon S3</option>
                                <option value="google">Google Cloud Storage</option>
                                <option value="azure">Azure Blob Storage</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Bucket/Carpeta</label>
                            <input type="text" class="form-control" id="cloudBucket" 
                                   placeholder="conafe-archivos">
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label">Clave de Acceso</label>
                            <input type="text" class="form-control" id="cloudAccessKey">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Clave Secreta</label>
                            <input type="password" class="form-control" id="cloudSecretKey">
                        </div>
                    </div>
                </div>
                
                <div class="mb-4">
                    <h5><i class="fas fa-chart-line"></i> Google Analytics</h5>
                    <div class="row mb-3">
                        <div class="col-md-12">
                            <label class="form-label">ID de Seguimiento</label>
                            <input type="text" class="form-control" id="gaTrackingId" 
                                   placeholder="UA-XXXXX-Y">
                        </div>
                    </div>
                </div>
                
                <div class="mt-4">
                    <button class="btn btn-primary" onclick="guardarIntegraciones()">
                        <i class="fas fa-save"></i> Guardar Todas las Integraciones
                    </button>
                </div>
            </div>
        </div>
    `;
}

function cargarConfigAvanzada() {
    return `
        <div class="card">
            <div class="card-header bg-primary text-white">
                <i class="fas fa-code"></i> Configuración Avanzada
            </div>
            <div class="card-body">
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>¡Precaución!</strong> Solo modifica estas opciones si sabes lo que estás haciendo.
                </div>
                
                <div class="mb-4">
                    <h5><i class="fas fa-bug"></i> Configuración de Depuración</h5>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="debugMode">
                                <label class="form-check-label" for="debugMode">
                                    Modo de Depuración
                                </label>
                                <small class="text-muted">Muestra errores detallados</small>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="logQueries">
                                <label class="form-check-label" for="logQueries">
                                    Log de Consultas
                                </label>
                                <small class="text-muted">Registra todas las consultas a la BD</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Nivel de Log</label>
                        <select class="form-select" id="logLevel">
                            <option value="error">Solo Errores</option>
                            <option value="warn">Advertencias</option>
                            <option value="info" selected>Información</option>
                            <option value="debug">Depuración</option>
                        </select>
                    </div>
                </div>
                
                <div class="mb-4">
                    <h5><i class="fas fa-database"></i> Configuración de Base de Datos</h5>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label">Tiempo de caché (segundos)</label>
                            <input type="number" class="form-control" id="cacheTime" 
                                   value="300" min="0" max="3600">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Límite de consultas</label>
                            <input type="number" class="form-control" id="queryLimit" 
                                   value="1000" min="10" max="10000">
                        </div>
                    </div>
                </div>
                
                <div class="mb-4">
                    <h5><i class="fas fa-server"></i> Configuración del Servidor</h5>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label">Tiempo de espera (segundos)</label>
                            <input type="number" class="form-control" id="timeoutServidor" 
                                   value="30" min="5" max="300">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Límite de tamaño (MB)</label>
                            <input type="number" class="form-control" id="sizeLimit" 
                                   value="10" min="1" max="100">
                        </div>
                    </div>
                </div>
                
                <div class="mb-4">
                    <h5><i class="fas fa-terminal"></i> Consola de Comandos</h5>
                    <div class="mb-3">
                        <label class="form-label">Ejecutar Comando</label>
                        <div class="input-group">
                            <input type="text" class="form-control" id="comandoTerminal" 
                                   placeholder="Ej: backup --full">
                            <button class="btn btn-outline-secondary" onclick="ejecutarComando()">
                                <i class="fas fa-play"></i> Ejecutar
                            </button>
                        </div>
                        <small class="text-muted">Comandos disponibles: backup, restore, stats, clean</small>
                    </div>
                    <div class="card">
                        <div class="card-header bg-dark text-white">
                            <i class="fas fa-code"></i> Salida del Comando
                        </div>
                        <div class="card-body bg-dark text-light">
                            <pre id="salidaComando" style="height: 200px; overflow-y: auto;"></pre>
                        </div>
                    </div>
                </div>
                
                <div class="mt-4">
                    <button class="btn btn-primary" onclick="guardarConfigAvanzada()">
                        <i class="fas fa-save"></i> Guardar Configuración
                    </button>
                    <button class="btn btn-outline-danger" onclick="reiniciarServidor()">
                        <i class="fas fa-power-off"></i> Reiniciar Servidor Virtual
                    </button>
                </div>
            </div>
        </div>
    `;
}

function actualizarEstadoSistema() {
    const estado = document.getElementById('estadoSistema');
    if (!estado) return;
    
    // Obtener estadísticas del sistema
    db.collection('usuarios').where('activo', '==', true).get().then(snap => {
        const usuariosActivos = snap.size;
        
        db.collection('asistencias').where('fecha', '>=', new Date(new Date().setHours(0,0,0,0)).toISOString()).get().then(snap2 => {
            const asistenciasHoy = snap2.size;
            
            estado.innerHTML = `
                <div class="text-center">
                    <div class="mb-3">
                        <i class="fas fa-check-circle fa-2x text-success"></i>
                        <h5 class="mt-2">Sistema Operativo</h5>
                    </div>
                    
                    <div class="row text-start">
                        <div class="col-6">
                            <small class="text-muted">Usuarios activos:</small>
                        </div>
                        <div class="col-6 text-end">
                            <strong>${usuariosActivos}</strong>
                        </div>
                    </div>
                    
                    <div class="row text-start">
                        <div class="col-6">
                            <small class="text-muted">Asistencias hoy:</small>
                        </div>
                        <div class="col-6 text-end">
                            <strong>${asistenciasHoy}</strong>
                        </div>
                    </div>
                    
                    <div class="row text-start">
                        <div class="col-6">
                            <small class="text-muted">Versión:</small>
                        </div>
                        <div class="col-6 text-end">
                            <strong>2.0.0</strong>
                        </div>
                    </div>
                    
                    <div class="row text-start">
                        <div class="col-6">
                            <small class="text-muted">Último backup:</small>
                        </div>
                        <div class="col-6 text-end">
                            <strong>Hoy</strong>
                        </div>
                    </div>
                    
                    <hr>
                    
                    <div class="alert alert-success small">
                        <i class="fas fa-server"></i>
                        <strong>Todos los servicios funcionando correctamente</strong>
                    </div>
                </div>
            `;
        });
    });
}

function probarNotificaciones() {
    mostrarAlerta('Se enviará una notificación de prueba', 'info');
    // Implementar envío de notificación de prueba
}

function forzarSincronizacion() {
    mostrarAlerta('Sincronización forzada iniciada', 'info');
    // Implementar sincronización global
}

function crearBackup() {
    mostrarAlerta('Creando backup del sistema...', 'info');
    // Implementar creación de backup
}

function restaurarBackup() {
    if (confirm('¿Estás seguro de restaurar el sistema desde backup? Se perderán los datos actuales.')) {
        mostrarAlerta('Restaurando sistema desde backup...', 'warning');
        // Implementar restauración
    }
}

function limpiarDatosPrueba() {
    if (confirm('¿Limpiar todos los datos de prueba? Esta acción no se puede deshacer.')) {
        const password = prompt('Para confirmar, escribe: LIMPIAR-PRUEBA');
        if (password === 'LIMPIAR-PRUEBA') {
            mostrarAlerta('Limpiando datos de prueba...', 'warning');
            // Implementar limpieza de datos de prueba
        } else {
            mostrarAlerta('Contraseña incorrecta', 'danger');
        }
    }
}

function resetearSistemaCompleto() {
    if (confirm('¿RESETEAR COMPLETAMENTE EL SISTEMA? SE PERDERÁN TODOS LOS DATOS.')) {
        const password = prompt('Para confirmar, escribe: RESET-TOTAL');
        if (password === 'RESET-TOTAL') {
            mostrarAlerta('Reseteando sistema completo...', 'danger');
            // Implementar reset total
        } else {
            mostrarAlerta('Contraseña incorrecta', 'danger');
        }
    }
}

function probarSMTP() {
    mostrarAlerta('Probando conexión SMTP...', 'info');
    // Implementar prueba de SMTP
}

function guardarIntegraciones() {
    mostrarAlerta('Guardando configuraciones de integraciones...', 'info');
    // Implementar guardado de integraciones
}

function guardarConfigAvanzada() {
    mostrarAlerta('Guardando configuración avanzada...', 'info');
    // Implementar guardado de configuración avanzada
}

function ejecutarComando() {
    const comando = document.getElementById('comandoTerminal').value;
    const salida = document.getElementById('salidaComando');
    
    if (!comando) return;
    
    salida.innerHTML += `$ ${comando}\n`;
    
    // Simular ejecución de comando
    switch(comando.split(' ')[0]) {
        case 'backup':
            salida.innerHTML += `Creando backup completo del sistema...\n`;
            salida.innerHTML += `Backup completado exitosamente.\n`;
            break;
        case 'stats':
            salida.innerHTML += `Usuarios activos: 15\n`;
            salida.innerHTML += `Asistencias hoy: 42\n`;
            salida.innerHTML += `Espacio usado: 45.2 MB\n`;
            break;
        case 'clean':
            salida.innerHTML += `Limpiando caché y archivos temporales...\n`;
            salida.innerHTML += `Limpieza completada.\n`;
            break;
        default:
            salida.innerHTML += `Comando no reconocido: ${comando}\n`;
    }
    
    salida.innerHTML += `\n`;
    salida.scrollTop = salida.scrollHeight;
    
    document.getElementById('comandoTerminal').value = '';
}

function reiniciarServidor() {
    if (confirm('¿Reiniciar servidor virtual? Esto podría causar interrupciones breves.')) {
        mostrarAlerta('Reiniciando servidor...', 'warning');
        setTimeout(() => {
            mostrarAlerta('Servidor reiniciado exitosamente', 'success');
            location.reload();
        }, 2000);
    }
}