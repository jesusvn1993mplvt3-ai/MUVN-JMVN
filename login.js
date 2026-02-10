// login.js - Sistema de autenticación
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si ya hay sesión
    const usuario = conafeConfig.obtenerSesion();
    if (usuario) {
        redirigirSegunRol(usuario);
        return;
    }
    
    // Configurar formulario de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const tipoUsuario = document.getElementById('tipoUsuario').value;
            
            if (!email || !password) {
                conafeConfig.mostrarAlerta('Por favor completa todos los campos', 'warning');
                return;
            }
            
            iniciarSesion(email, password, tipoUsuario);
        });
    }
    
    // Botón de recuperar contraseña
    const btnRecuperar = document.getElementById('btnRecuperar');
    if (btnRecuperar) {
        btnRecuperar.addEventListener('click', function() {
            const email = prompt('Ingresa tu correo electrónico para recuperar contraseña:');
            if (email) {
                recuperarContrasena(email);
            }
        });
    }
});

async function iniciarSesion(email, password, tipoUsuario) {
    try {
        // Intentar autenticar con Firebase Auth
        const credenciales = await auth.signInWithEmailAndPassword(email, password);
        const user = credenciales.user;
        
        // Buscar usuario en la base de datos
        const snapshot = await db.usuarios.orderByChild('email').equalTo(email).once('value');
        
        if (!snapshot.exists()) {
            conafeConfig.mostrarAlerta('Usuario no encontrado en el sistema', 'danger');
            await auth.signOut();
            return;
        }
        
        // Obtener datos del usuario
        let usuarioData = null;
        snapshot.forEach(childSnapshot => {
            usuarioData = childSnapshot.val();
            usuarioData.id = childSnapshot.key;
        });
        
        // Verificar rol
        if (usuarioData.rol !== tipoUsuario) {
            conafeConfig.mostrarAlerta(`Este usuario no es un ${tipoUsuario === 'maestro' ? 'maestro' : 'responsable'}`, 'warning');
            await auth.signOut();
            return;
        }
        
        // Verificar si está activo
        if (usuarioData.activo === false) {
            conafeConfig.mostrarAlerta('Usuario inactivo. Contacta al administrador.', 'danger');
            await auth.signOut();
            return;
        }
        
        // Guardar sesión
        conafeConfig.guardarSesion(usuarioData);
        
        // Redirigir según rol
        redirigirSegunRol(usuarioData);
        
    } catch (error) {
        console.error('Error en login:', error);
        let mensaje = 'Error en la autenticación';
        