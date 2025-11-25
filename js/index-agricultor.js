/**
 * AgroMatch Dashboard - JavaScript para Agricultor COMPLETO
 * VERSIÓN ACTUALIZADA CON:
 * - Duplicar ofertas
 * - Foto de perfil
 * - Ver documentos de trabajadores (endpoint mejorado)
 * - Geolocalización y mapa
 */

// ================================================================
// VARIABLES GLOBALES
// ================================================================

let currentUser = {
    firstName: 'Carlos',
    lastName: 'González',
    role: 'Agricultor',
    email: 'carlos@finca.com',
    fotoUrl: null,
    isLoggedIn: false
};

let map = null;
let ofertasData = [];
let farmerMarker = null;
let workerMarkers = [];
let currentFarmerLocation = null;

// ================================================================
// VERIFICACIÓN DE SESIÓN
// ================================================================
async function verificarSesionActiva() {
    try {
        const response = await fetch('/check_session', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        if (!response.ok || response.status === 401) {
            window.location.replace('/vista/login-trabajador.html?message=Sesión expirada&type=error');
            return false;
        }
        
        const data = await response.json();
        
        if (!data.authenticated || data.user_role !== 'Agricultor') {
            window.location.replace('/vista/login-trabajador.html?message=Por favor inicia sesión&type=error');
            return false;
        }
        
        return true;
        
    } catch (error) {
        console.error('Error verificando sesión:', error);
        window.location.replace('/vista/login-trabajador.html?message=Error de conexión&type=error');
        return false;
    }
}

window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        verificarSesionActiva();
    }
});

if (window.performance && window.performance.navigation.type === 2) {
    window.location.reload(true);
}

setInterval(verificarSesionActiva, 5 * 60 * 1000);

// ================================================================
// INICIALIZACIÓN PRINCIPAL
// ================================================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🌱 Iniciando Dashboard Agricultor...');
    
    await verificarSesionActiva();
    setupEventListeners();
    await fetchUserSession();
    await cargarOfertasDelAgricultor();
    setTimeout(initMap, 500);
    
    console.log('✅ Dashboard inicializado');
});

// ================================================================
// GESTIÓN DE SESIÓN CON FOTO DE PERFIL
// ================================================================

async function fetchUserSession() {
    try {
        const response = await fetch('/get_user_session', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.ok) {
            const data = await response.json();
            
            if (data.success && data.user) {
                currentUser = {
                    firstName: data.user.first_name,
                    lastName: data.user.last_name,
                    role: data.user.role,
                    email: data.user.email,
                    username: data.user.username,
                    userId: data.user.user_id,
                    telefono: data.user.telefono || '',
                    fotoUrl: data.user.url_foto || null,
                    isLoggedIn: true
                };

                console.log('✅ Usuario cargado:', currentUser);
                updateUIWithUserData();
                updateProfilePhoto();
                return true;
            }
        }
        
        currentUser.isLoggedIn = true;
        updateUIWithUserData();
        return true;
        
    } catch (error) {
        console.error('Error conectando con servidor:', error);
        currentUser.isLoggedIn = true;
        updateUIWithUserData();
        return true;
    }
}

function updateUIWithUserData() {
    const header = document.querySelector('.header .logo');
    if (header && !document.querySelector('.user-welcome')) {
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'user-welcome';
        welcomeDiv.innerHTML = `
            <span style="margin-left: 20px; color: #4a7c59; font-weight: 600;">
                🌾 Bienvenido, ${currentUser.firstName}
            </span>
        `;
        header.parentNode.insertBefore(welcomeDiv, header.nextSibling);
    }
}

function updateProfilePhoto() {
    const profileMenuBtn = document.getElementById('profileMenuBtn');
    
    if (profileMenuBtn) {
        if (currentUser.fotoUrl) {
            profileMenuBtn.innerHTML = `
                <img src="${currentUser.fotoUrl}" 
                     alt="Foto de perfil" 
                     style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
            `;
        } else {
            profileMenuBtn.innerHTML = '<i class="fas fa-user"></i>';
        }
        console.log('📸 Foto de perfil actualizada:', currentUser.fotoUrl ? 'Con foto' : 'Sin foto');
    }
}

// ================================================================
// MENÚ DESPLEGABLE DE USUARIO
// ================================================================

function toggleProfileMenu() {
    const existingDropdown = document.getElementById('profileDropdown');
    if (existingDropdown) {
        existingDropdown.remove();
    }

    const dropdown = document.createElement('div');
    dropdown.id = 'profileDropdown';
    dropdown.className = 'profile-dropdown-dynamic';
    
    dropdown.innerHTML = `
        <div class="profile-dropdown-header">
            <div class="profile-dropdown-avatar">
                ${currentUser.fotoUrl ? 
                    `<img src="${currentUser.fotoUrl}" 
                          alt="${currentUser.firstName}" 
                          style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` :
                    `<i class="fas fa-user"></i>`
                }
            </div>
            <div class="profile-dropdown-name">${currentUser.firstName} ${currentUser.lastName}</div>
            <div class="profile-dropdown-role">
                <i class="fas fa-seedling"></i>
                <span>${currentUser.role}</span>
            </div>
        </div>
        
        <div class="profile-dropdown-menu">
            <div class="profile-dropdown-item" onclick="viewProfile(); closeProfileMenu()">
                <div class="icon"><i class="fas fa-user-circle"></i></div>
                <span>Mi Perfil</span>
            </div>
            
            <div class="profile-dropdown-item" onclick="showHistorialContrataciones(); closeProfileMenu()">
                <div class="icon"><i class="fas fa-history"></i></div>
                <span>Historial de Contrataciones</span>
            </div>
            
            <div class="profile-dropdown-item" onclick="showEstadisticas(); closeProfileMenu()">
                <div class="icon"><i class="fas fa-chart-line"></i></div>
                <span>Mis Estadísticas</span>
            </div>
            
            <div class="profile-dropdown-item" onclick="viewSettings(); closeProfileMenu()">
                <div class="icon"><i class="fas fa-cog"></i></div>
                <span>Configuración</span>
            </div>
            
            <div class="profile-dropdown-item" onclick="showAyudaSoporte(); closeProfileMenu()">
                <div class="icon"><i class="fas fa-question-circle"></i></div>
                <span>Ayuda y Soporte</span>
            </div>
            
            <div class="profile-dropdown-item logout" onclick="confirmLogout(); closeProfileMenu()">
                <div class="icon"><i class="fas fa-sign-out-alt"></i></div>
                <span>Cerrar Sesión</span>
            </div>
        </div>
    `;

    dropdown.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 9999;
        background: white;
        border-radius: 15px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(74, 124, 89, 0.2);
        min-width: 280px;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-10px);
        transition: all 0.3s ease;
    `;

    document.body.appendChild(dropdown);

    setTimeout(() => {
        dropdown.style.opacity = '1';
        dropdown.style.visibility = 'visible';
        dropdown.style.transform = 'translateY(0)';
    }, 10);

    addDropdownStyles();

    const overlay = document.getElementById('overlay');
    if (overlay) {
        overlay.classList.add('show');
        overlay.onclick = closeProfileMenu;
    }
}

function addDropdownStyles() {
    if (document.getElementById('dropdown-styles')) return;

    const style = document.createElement('style');
    style.id = 'dropdown-styles';
    style.textContent = `
        .profile-dropdown-header {
            padding: 20px;
            text-align: center;
            background: linear-gradient(135deg, rgba(74, 124, 89, 0.1), rgba(144, 238, 144, 0.1));
            border-bottom: 1px solid rgba(74, 124, 89, 0.2);
        }
        .profile-dropdown-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: linear-gradient(135deg, #4a7c59, #1e3a2e);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 10px;
            font-size: 20px;
            overflow: hidden;
        }
        .profile-dropdown-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .profile-dropdown-name {
            font-size: 16px;
            font-weight: 700;
            color: #1e3a2e;
            margin-bottom: 5px;
        }
        .profile-dropdown-role {
            font-size: 14px;
            color: #4a7c59;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
        }
        .profile-dropdown-menu {
            padding: 10px 0;
        }
        .profile-dropdown-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 20px;
            color: #1e3a2e;
            cursor: pointer;
            transition: all 0.2s ease;
            border-bottom: 1px solid rgba(74, 124, 89, 0.1);
        }
        .profile-dropdown-item:hover {
            background: rgba(74, 124, 89, 0.1);
            padding-left: 25px;
        }
        .profile-dropdown-item.logout {
            color: #dc2626;
            border-top: 1px solid rgba(220, 38, 38, 0.2);
            margin-top: 5px;
        }
        .profile-dropdown-item.logout:hover {
            background: rgba(220, 38, 38, 0.1);
        }
        .profile-dropdown-item .icon {
            width: 20px;
            text-align: center;
        }
        .overlay.show {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.3);
            z-index: 9998;
        }
    `;
    document.head.appendChild(style);
}

function closeProfileMenu() {
    const dropdown = document.getElementById('profileDropdown');
    const overlay = document.getElementById('overlay');
    
    if (dropdown) {
        dropdown.style.opacity = '0';
        dropdown.style.visibility = 'hidden';
        dropdown.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
            if (dropdown.parentNode) {
                dropdown.parentNode.removeChild(dropdown);
            }
        }, 300);
    }
    
    if (overlay) {
        overlay.classList.remove('show');
        overlay.onclick = null;
    }
}

function viewProfile() {
    console.log('👤 Navegando al perfil del agricultor...');
    closeProfileMenu();
    window.location.href = 'perfil-agricultor.html';
}

function viewSettings() {
    console.log('⚙️ Navegando a configuración...');
    closeProfileMenu();
    window.location.href = 'configuracion-agricultor.html';
}

function showHistorialContrataciones() {
    console.log('📋 Navegando a Historial de Contrataciones...');
    window.location.href = 'historial-contrataciones.html';
}

function showEstadisticas() {
    console.log('📊 Navegando a Mis Estadísticas...');
    window.location.href = 'estadisticas-agricultor.html';
}

function showAyudaSoporte() {
    console.log('❓ Navegando a Ayuda y Soporte...');
    window.location.href = 'soporte-agricultor.html';
}

function confirmLogout() {
    if (confirm(`¿Seguro que deseas cerrar sesión, ${currentUser.firstName}?`)) {
        executeLogout();
    }
}

async function executeLogout() {
    showStatusMessage('Cerrando sesión...', 'info');
    
    try {
        const response = await fetch('/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            sessionStorage.clear();
            localStorage.removeItem('user_data');
            
            setTimeout(() => {
                window.location.replace('/vista/login-trabajador.html?message=Sesión cerrada&type=success');
            }, 1500);
        }
    } catch (error) {
        console.error('Error en logout:', error);
        setTimeout(() => {
            window.location.replace('/vista/login-trabajador.html');
        }, 1500);
    }
}

// ================================================================
// GESTIÓN DE OFERTAS
// ================================================================

async function cargarOfertasDelAgricultor() {
    try {
        console.log('🔄 Cargando ofertas del agricultor...');
        
        const response = await fetch('/api/get_farmer_jobs', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            ofertasData = data.ofertas || [];
            mostrarOfertasEnDashboard(ofertasData);
            actualizarEstadisticas(data.estadisticas);
            console.log(`✅ ${ofertasData.length} ofertas cargadas`);
        } else {
            throw new Error(data.message || 'Error al cargar ofertas');
        }
        
    } catch (error) {
        console.error('❌ Error cargando ofertas:', error);
        showStatusMessage('Error al cargar ofertas: ' + error.message, 'error');
        mostrarOfertasEnDashboard([]);
    }
}

function mostrarOfertasEnDashboard(ofertas) {
    const container = document.getElementById('ofertasContainer');
    
    if (!container) {
        console.error('❌ No se encontró el contenedor de ofertas');
        return;
    }
    
    container.innerHTML = '';
    
    if (ofertas.length === 0) {
        container.innerHTML = `
            <div class="section-title" style="margin: 30px 0 20px 0;">
                <i class="fas fa-clipboard-list"></i>
                Mis Ofertas Publicadas
            </div>
            <div class="no-ofertas">
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    <div style="font-size: 48px; margin-bottom: 15px; color: #4a7c59;">
                        <i class="fas fa-seedling"></i>
                    </div>
                    <h3 style="color: #1e3a2e; margin-bottom: 10px;">No tienes ofertas publicadas</h3>
                    <p>Crea tu primera oferta para encontrar trabajadores.</p>
                    <button class="btn btn-primary" onclick="createNewOffer()" style="margin-top: 15px;">
                        <i class="fas fa-plus"></i> Crear Primera Oferta
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="section-title" style="margin: 30px 0 20px 0;">
            <i class="fas fa-clipboard-list"></i>
            Mis Ofertas Publicadas (${ofertas.length})
        </div>
    `;
    
    ofertas.forEach(oferta => {
        const ofertaCard = crearTarjetaOferta(oferta);
        container.appendChild(ofertaCard);
    });
}

function crearTarjetaOferta(oferta) {
    const div = document.createElement('div');
    div.className = 'offer-card';
    
    const fechaPublicacion = new Date(oferta.fecha_publicacion);
    const ahora = new Date();
    const diasPublicada = Math.floor((ahora - fechaPublicacion) / (1000 * 60 * 60 * 24));
    
    const estadoInfo = obtenerEstadoOferta(oferta.estado);
    
    const tituloEscapado = oferta.titulo.replace(/'/g, "\\'");
    
    div.innerHTML = `
        <div class="offer-header">
            <div class="offer-title">${oferta.titulo}</div>
            <div class="offer-actions">
                <button class="btn-icon btn-icon-duplicate" data-action="duplicar" data-id="${oferta.id_oferta}" title="Duplicar oferta">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="btn-icon" data-action="editar" data-id="${oferta.id_oferta}" title="Editar oferta">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-icon-delete" data-action="eliminar" data-id="${oferta.id_oferta}" title="Eliminar oferta">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        
        <div class="offer-details">
            <p class="offer-description">${oferta.descripcion}</p>
            
            <div class="offer-meta">
                <div class="offer-meta-item">
                    <i class="fas fa-dollar-sign"></i>
                    <span><strong>$${Number(oferta.pago_ofrecido).toLocaleString()} COP</strong></span>
                </div>
                
                <div class="offer-meta-item">
                    <i class="fas fa-calendar"></i>
                    <span>Hace ${diasPublicada === 0 ? 'hoy' : diasPublicada + ' día' + (diasPublicada > 1 ? 's' : '')}</span>
                </div>
                
                <div class="offer-meta-item">
                    <i class="fas fa-users"></i>
                    <span>${oferta.num_postulaciones || 0} postulaciones</span>
                </div>
                
                ${oferta.ubicacion ? `
                <div class="offer-meta-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${oferta.ubicacion}</span>
                </div>` : ''}
            </div>
        </div>
        
        <div class="offer-footer">
            <div class="offer-status">
                <span class="status-badge ${estadoInfo.clase}">${estadoInfo.texto}</span>
            </div>
            
            <div class="offer-actions">
                <button class="btn btn-secondary btn-ver-postulaciones" 
                        data-oferta-id="${oferta.id_oferta}" 
                        data-num-postulaciones="${oferta.num_postulaciones || 0}">
                    <i class="fas fa-eye"></i> 
                    Ver Postulaciones (${oferta.num_postulaciones || 0})
                </button>
                
                ${oferta.estado === 'Abierta' ? 
                    `<button class="btn btn-warning btn-cerrar-oferta" 
                            data-id="${oferta.id_oferta}" 
                            data-titulo="${tituloEscapado}">
                        <i class="fas fa-lock"></i> Cerrar Oferta
                    </button>` : 
                    oferta.estado === 'Cerrada' ?
                    `<button class="btn btn-success btn-reabrir-oferta" data-id="${oferta.id_oferta}" data-titulo="${tituloEscapado}">
                        <i class="fas fa-unlock"></i> Reabrir Oferta
                    </button>` :
                    ''
                }
            </div>
        </div>
    `;
    
    setTimeout(() => {
        const btnDuplicar = div.querySelector('[data-action="duplicar"]');
        if (btnDuplicar) {
            btnDuplicar.addEventListener('click', () => duplicarOferta(oferta.id_oferta, oferta.titulo));
        }
        
        const btnEditar = div.querySelector('[data-action="editar"]');
        if (btnEditar) {
            btnEditar.addEventListener('click', () => editarOferta(oferta.id_oferta));
        }
        
        const btnEliminar = div.querySelector('[data-action="eliminar"]');
        if (btnEliminar) {
            btnEliminar.addEventListener('click', () => eliminarOferta(oferta.id_oferta, oferta.titulo));
        }
        
        const btnVerPostulaciones = div.querySelector('.btn-ver-postulaciones');
        if (btnVerPostulaciones) {
            btnVerPostulaciones.addEventListener('click', function() {
                const ofertaId = this.getAttribute('data-oferta-id');
                const numPostulaciones = this.getAttribute('data-num-postulaciones');
                verPostulaciones(parseInt(ofertaId), parseInt(numPostulaciones));
            });
        }
        
        const btnCerrar = div.querySelector('.btn-cerrar-oferta');
        if (btnCerrar) {
            btnCerrar.addEventListener('click', function() {
                const ofertaId = parseInt(this.getAttribute('data-id'));
                const titulo = this.getAttribute('data-titulo');
                cerrarOferta(ofertaId, titulo);
            });
        }
        
        const btnReabrir = div.querySelector('.btn-reabrir-oferta');
        if (btnReabrir) {
            btnReabrir.addEventListener('click', function() {
                const ofertaId = parseInt(this.getAttribute('data-id'));
                const titulo = this.getAttribute('data-titulo');
                reabrirOferta(ofertaId, titulo);
            });
        }
    }, 100);
    
    return div;
}

function obtenerEstadoOferta(estado) {
    switch(estado) {
        case 'Abierta':
            return { clase: 'status-active', texto: 'Activa' };
        case 'En Proceso':
            return { clase: 'status-progress', texto: 'En Proceso' };
        case 'Cerrada':
            return { clase: 'status-closed', texto: 'Cerrada' };
        default:
            return { clase: 'status-inactive', texto: estado };
    }
}

function actualizarEstadisticas(estadisticas) {
    if (!estadisticas) return;
    
    const ofertasActivasEl = document.getElementById('ofertasActivas');
    const trabajadoresContratadosEl = document.getElementById('trabajadoresContratados');
    
    if (ofertasActivasEl) {
        ofertasActivasEl.textContent = estadisticas.ofertas_activas || ofertasData.length;
    }
    
    if (trabajadoresContratadosEl) {
        trabajadoresContratadosEl.textContent = estadisticas.trabajadores_contratados || 0;
    }
}

// ================================================================
// DUPLICAR OFERTA
// ================================================================

async function duplicarOferta(ofertaId, titulo) {
    if (!confirm(`¿Duplicar la oferta "${titulo}"?\n\nSe creará una copia con el prefijo "Copia de".`)) {
        return;
    }
    
    try {
        console.log('📋 Duplicando oferta:', ofertaId);
        
        showStatusMessage('Duplicando oferta...', 'info');
        
        const response = await fetch(`/api/duplicar_oferta/${ofertaId}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatusMessage('✅ Oferta duplicada exitosamente', 'success');
            setTimeout(() => cargarOfertasDelAgricultor(), 1500);
        } else {
            showStatusMessage('❌ ' + data.message, 'error');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showStatusMessage('❌ Error de conexión', 'error');
    }
}

// ================================================================
// CERRAR Y REABRIR OFERTAS
// ================================================================

async function cerrarOferta(ofertaId, titulo) {
    try {
        console.log('🔒 Cerrando oferta:', ofertaId);
        
        const statsResponse = await fetch(`/api/estadisticas_cierre_v2/${ofertaId}`, {
            credentials: 'include'
        });
        
        let mensaje = `¿Cerrar la oferta "${titulo}"?\n\n`;
        
        if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            if (statsData.success) {
                const stats = statsData.stats;
                mensaje += `📊 Postulaciones:\n` +
                          `• Pendientes: ${stats.pendientes}\n` +
                          `• Aceptadas: ${stats.aceptadas}\n` +
                          `• Rechazadas: ${stats.rechazadas}\n\n`;
                if (stats.pendientes > 0) {
                    mensaje += `⚠️ Las ${stats.pendientes} postulaciones pendientes serán rechazadas.\n\n`;
                }
            }
        }
        
        mensaje += `Esta acción:\n` +
                  `✓ Cerrará la oferta\n` +
                  `✓ Guardará la fecha de finalización\n` +
                  `✓ Finalizará los acuerdos laborales activos`;
        
        if (!confirm(mensaje)) return;
        
        showStatusMessage('Cerrando oferta...', 'info');
        
        const response = await fetch(`/api/cerrar_oferta_manual_v2/${ofertaId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatusMessage('✅ Oferta cerrada exitosamente', 'success');
            setTimeout(() => cargarOfertasDelAgricultor(), 1500);
        } else {
            showStatusMessage('❌ ' + data.message, 'error');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showStatusMessage('❌ Error de conexión', 'error');
    }
}

async function reabrirOferta(ofertaId, titulo) {
    if (!confirm(`¿Reabrir la oferta "${titulo}"?\n\nVolverás a recibir postulaciones.`)) return;
    
    try {
        console.log('🔓 Reabriendo oferta:', ofertaId);
        
        showStatusMessage('Reabriendo oferta...', 'info');
        
        const response = await fetch(`/api/reabrir_oferta_v2/${ofertaId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatusMessage('✅ Oferta reabierta exitosamente', 'success');
            setTimeout(() => cargarOfertasDelAgricultor(), 1500);
        } else {
            showStatusMessage('❌ ' + data.message, 'error');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showStatusMessage('❌ Error de conexión', 'error');
    }
}

// ================================================================
// CREAR OFERTA
// ================================================================

function createNewOffer() {
    abrirModalOferta();
}

function abrirModalOferta() {
    const modal = document.getElementById('modalCrearOferta');
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            const tituloInput = document.getElementById('tituloOferta');
            if (tituloInput) tituloInput.focus();
        }, 300);
    }
}

function cerrarModalOferta() {
    const modal = document.getElementById('modalCrearOferta');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            
            const form = document.getElementById('formCrearOferta');
            if (form) form.reset();
            
            const btnCrear = document.getElementById('btnCrearOferta');
            if (btnCrear) {
                btnCrear.disabled = false;
                btnCrear.innerHTML = '<i class="fas fa-check"></i> Crear Oferta';
            }
        }, 300);
    }
}

async function crearOferta(event) {
    event.preventDefault();
    
    const btnCrear = document.getElementById('btnCrearOferta');
    const form = event.target;
    const formData = new FormData(form);
    
    const ofertaData = {
        titulo: formData.get('titulo').trim(),
        descripcion: formData.get('descripcion').trim(),
        pago: parseInt(formData.get('pago')),
        ubicacion: formData.get('ubicacion').trim()
    };
    
    if (!ofertaData.titulo || ofertaData.titulo.length < 10) {
        showStatusMessage('El título debe tener al menos 10 caracteres', 'error');
        return;
    }
    
    if (!ofertaData.descripcion || ofertaData.descripcion.length < 20) {
        showStatusMessage('La descripción debe tener al menos 20 caracteres', 'error');
        return;
    }
    
    if (!ofertaData.pago || ofertaData.pago < 10000) {
        showStatusMessage('El pago mínimo debe ser $10,000 COP', 'error');
        return;
    }
    
    btnCrear.disabled = true;
    btnCrear.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
    
    try {
        const response = await fetch('/api/crear_oferta', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(ofertaData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            btnCrear.innerHTML = '<i class="fas fa-check"></i> ¡Creada!';
            showStatusMessage(`Oferta "${ofertaData.titulo}" creada exitosamente!`, 'success');
            
            setTimeout(() => {
                cerrarModalOferta();
                cargarOfertasDelAgricultor();
            }, 1500);
            
        } else {
            throw new Error(result.message || 'Error al crear la oferta');
        }
        
    } catch (error) {
        console.error('❌ Error creando oferta:', error);
        
        btnCrear.disabled = false;
        btnCrear.innerHTML = '<i class="fas fa-check"></i> Crear Oferta';
        
        showStatusMessage('Error: ' + error.message, 'error');
    }
}

// ================================================================
// EDITAR OFERTA
// ================================================================

async function editarOferta(ofertaId) {
    const oferta = ofertasData.find(o => o.id_oferta === ofertaId);
    
    if (!oferta) {
        showStatusMessage('Oferta no encontrada', 'error');
        return;
    }
    
    let descripcion_limpia = oferta.descripcion || '';
    let ubicacion = oferta.ubicacion || '';
    
    if (descripcion_limpia.includes('Ubicación:')) {
        try {
            const partes = descripcion_limpia.split('\n\nUbicación:');
            descripcion_limpia = partes[0];
            ubicacion = partes[1].trim();
        } catch (e) {
            console.log('⚠️ Error extrayendo ubicación:', e);
        }
    }
    
    document.getElementById('editOfertaId').value = oferta.id_oferta;
    document.getElementById('editTituloOferta').value = oferta.titulo;
    document.getElementById('editDescripcionOferta').value = descripcion_limpia;
    document.getElementById('editPagoOferta').value = oferta.pago_ofrecido;
    document.getElementById('editUbicacionOferta').value = ubicacion;
    
    const modal = document.getElementById('modalEditarOferta');
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function cerrarModalEditar() {
    const modal = document.getElementById('modalEditarOferta');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            
            const form = document.getElementById('formEditarOferta');
            if (form) form.reset();
            
            const btnGuardar = document.getElementById('btnGuardarEdicion');
            if (btnGuardar) {
                btnGuardar.disabled = false;
                btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
            }
        }, 300);
    }
}

async function guardarEdicion(event) {
    event.preventDefault();
    
    const btnGuardar = document.getElementById('btnGuardarEdicion');
    const form = event.target;
    const formData = new FormData(form);
    
    const ofertaId = parseInt(formData.get('ofertaId'));
    
    if (!ofertaId) {
        showStatusMessage('Error: ID de oferta no válido', 'error');
        return;
    }
    
    const ofertaData = {
        titulo: formData.get('titulo').trim(),
        descripcion: formData.get('descripcion').trim(),
        pago: parseInt(formData.get('pago')),
        ubicacion: formData.get('ubicacion').trim()
    };
    
    if (!ofertaData.titulo || ofertaData.titulo.length < 10) {
        showStatusMessage('El título debe tener al menos 10 caracteres', 'error');
        return;
    }
    
    if (!ofertaData.descripcion || ofertaData.descripcion.length < 20) {
        showStatusMessage('La descripción debe tener al menos 20 caracteres', 'error');
        return;
    }
    
    if (!ofertaData.pago || ofertaData.pago < 10000) {
        showStatusMessage('El pago mínimo debe ser $10,000 COP', 'error');
        return;
    }
    
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    try {
        const response = await fetch(`/api/edit_job/${ofertaId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(ofertaData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            btnGuardar.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';
            showStatusMessage('✅ Oferta actualizada exitosamente!', 'success');
            
            setTimeout(() => {
                cerrarModalEditar();
                cargarOfertasDelAgricultor();
            }, 1500);
            
        } else {
            throw new Error(result.message || 'Error al actualizar la oferta');
        }
        
    } catch (error) {
        console.error('❌ Error guardando edición:', error);
        
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
        
        showStatusMessage('❌ Error: ' + error.message, 'error');
    }
}

// ================================================================
// ELIMINAR OFERTA
// ================================================================

async function eliminarOferta(ofertaId, titulo) {
    const confirmar = confirm(`¿Estás seguro de que deseas eliminar la oferta "${titulo}"?\n\nEsta acción no se puede deshacer.`);
    
    if (!confirmar) return;
    
    try {
        const response = await fetch(`/api/delete_job/${ofertaId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatusMessage('Oferta eliminada exitosamente', 'success');
            cargarOfertasDelAgricultor();
        } else {
            throw new Error(data.message || 'Error al eliminar la oferta');
        }
        
    } catch (error) {
        console.error('❌ Error eliminando oferta:', error);
        showStatusMessage('Error al eliminar la oferta', 'error');
    }
}

// ================================================================
// GESTIÓN DE POSTULACIONES
// ================================================================

async function verPostulaciones(ofertaId, numPostulaciones) {
    if (numPostulaciones === 0) {
        showStatusMessage('Esta oferta no tiene postulaciones aún', 'info');
        return;
    }
    
    showStatusMessage('Cargando postulaciones...', 'info');
    
    try {
        const response = await fetch(`/api/get_offer_applications/${ofertaId}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            mostrarModalPostulaciones(data);
        } else {
            showStatusMessage(data.message || 'Error al cargar postulaciones', 'error');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showStatusMessage('Error de conexión al cargar postulaciones', 'error');
    }
}

function mostrarModalPostulaciones(data) {
    const modal = document.getElementById('applicationsModal');
    const content = document.getElementById('applicationsContent');
    
    if (!modal || !content) {
        alert('Error: No se encontraron los elementos del modal');
        return;
    }
    
    if (!data.postulaciones || data.postulaciones.length === 0) {
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #64748b;">
                <i class="fas fa-users" style="font-size: 48px; margin-bottom: 15px; color: #4a7c59;"></i>
                <h3>No hay postulaciones</h3>
                <p>Aún no hay trabajadores interesados en esta oferta.</p>
            </div>
        `;
    } else {
        let html = `
            <div class="applications-header">
                <h3>${data.oferta_titulo}</h3>
                <p>${data.total} postulación${data.total !== 1 ? 'es' : ''}</p>
            </div>
            <div class="applications-list">
        `;
        
        data.postulaciones.forEach(post => {
            const estrellas = '⭐'.repeat(Math.round(post.calificacion));
            const estadoClass = post.estado === 'Pendiente' ? 'status-pending' : 
                              post.estado === 'Aceptada' ? 'status-accepted' : 'status-rejected';
            
            html += `
                <div class="application-card">
                    <div class="application-header">
                        <div class="worker-info">
                            <div class="worker-avatar">
                                ${post.foto_url ? 
                                    `<img src="${post.foto_url}" alt="${post.nombre_completo}">` :
                                    `<i class="fas fa-user"></i>`
                                }
                            </div>
                            <div class="worker-details">
                                <h4>${post.nombre_completo}</h4>
                                <div class="worker-stats">
                                    <span><i class="fas fa-briefcase"></i> ${post.trabajos_completados} trabajos</span>
                                    <span>${estrellas} ${post.calificacion.toFixed(1)}</span>
                                </div>
                            </div>
                        </div>
                        <span class="status-badge ${estadoClass}">${post.estado}</span>
                    </div>
                    
                    <div class="application-body">
                        <div class="application-info">
                            <div class="info-item">
                                <i class="fas fa-phone"></i>
                                <span>${post.telefono}</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-envelope"></i>
                                <span>${post.email}</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-calendar"></i>
                                <span>Postulado: ${post.fecha_postulacion}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="application-actions">
                        <button class="btn btn-secondary" onclick="verPerfilTrabajador(${post.trabajador_id})">
                            <i class="fas fa-user-circle"></i> Ver Perfil
                        </button>
                        ${post.estado === 'Pendiente' ? `
                            <button class="btn btn-success" onclick="aceptarPostulacionConCierre(${post.id_postulacion}, '${post.nombre_completo}', ${data.oferta_id})">
                                <i class="fas fa-check"></i> Aceptar
                            </button>
                            <button class="btn btn-danger" onclick="rechazarPostulacion(${post.id_postulacion})">
                                <i class="fas fa-times"></i> Rechazar
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        content.innerHTML = html;
    }
    
    modal.style.display = 'flex';
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.display = 'block';
}

function closeApplicationsModal() {
    const modal = document.getElementById('applicationsModal');
    if (modal) modal.style.display = 'none';
    
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.display = 'none';
}

async function aceptarPostulacionConCierre(postulacionId, nombreTrabajador, ofertaId) {
    console.log('🎯 Aceptando postulación:', postulacionId, nombreTrabajador, ofertaId);
    
    if (!confirm(`¿Aceptar la postulación de ${nombreTrabajador}?`)) return;
    
    const cerrarOferta = confirm(
        `✅ ¿Deseas CERRAR la oferta ahora?\n\n` +
        `• SÍ: La oferta se cerrará (no más postulaciones)\n` +
        `• NO: La oferta seguirá abierta`
    );
    
    console.log('📋 Cerrar oferta:', cerrarOferta);
    
    showStatusMessage('Procesando...', 'info');
    
    try {
        console.log('🌐 Enviando a /api/aceptar_postulacion_v3/' + postulacionId);
        
        const response = await fetch(`/api/aceptar_postulacion_v3/${postulacionId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cerrar_oferta: cerrarOferta })
        });
        
        console.log('📡 Response status:', response.status);
        
        const data = await response.json();
        console.log('📦 Response data:', data);
        
        if (data.success) {
            showStatusMessage('✅ ' + data.message, 'success');
            closeApplicationsModal();
            setTimeout(() => cargarOfertasDelAgricultor(), 2000);
        } else {
            showStatusMessage('❌ ' + data.message, 'error');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        showStatusMessage('❌ Error de conexión', 'error');
    }
}

async function rechazarPostulacion(postulacionId) {
    if (!confirm('¿Rechazar esta postulación?')) return;
    
    try {
        console.log('❌ Rechazando postulación:', postulacionId);
        
        showStatusMessage('Procesando...', 'info');
        
        const response = await fetch(`/api/rechazar_postulacion_v3/${postulacionId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatusMessage('✅ Postulación rechazada', 'info');
            closeApplicationsModal();
            setTimeout(() => cargarOfertasDelAgricultor(), 1500);
        } else {
            showStatusMessage('❌ ' + data.message, 'error');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showStatusMessage('❌ Error de conexión', 'error');
    }
}

// ================================================================
// PERFIL DEL TRABAJADOR
// ================================================================

async function verPerfilTrabajador(trabajadorId) {
    try {
        const response = await fetch(`/api/get_worker_profile/${trabajadorId}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarPerfilTrabajador(data.worker);
        } else {
            showStatusMessage('Error al cargar perfil', 'error');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showStatusMessage('Error de conexión', 'error');
    }
}

function mostrarPerfilTrabajador(worker) {
    const modal = document.getElementById('workerProfileModal');
    const content = document.getElementById('workerProfileContent');
    
    const estrellas = '⭐'.repeat(Math.round(worker.estadisticas.calificacion_promedio));
    
    // USAR worker.id_usuario en lugar de worker.trabajador_id
    const trabajadorId = worker.id_usuario || worker.user_id || worker.id;
    
    let avatarHTML;
    if (worker.foto_url && worker.foto_url !== '') {
        avatarHTML = `
            <img src="${worker.foto_url}" 
                 alt="${worker.nombre_completo}" 
                 style="width: 100%; height: 100%; object-fit: cover;"
                 onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\\'fas fa-user\\'></i>';">
        `;
    } else {
        avatarHTML = '<i class="fas fa-user"></i>';
    }
    
    content.innerHTML = `
        <div class="worker-profile-enhanced">
            <div class="profile-header-enhanced">
                <div class="profile-avatar-large-enhanced">
                    ${avatarHTML}
                </div>
                <div class="profile-info-enhanced">
                    <h2 style="color: #2d3748; font-size: 26px; margin-bottom: 8px;">${worker.nombre_completo}</h2>
                    <div class="profile-rating-enhanced">
                        ${estrellas} 
                        <span style="font-size: 20px; font-weight: 700; color: #f59e0b; margin-left: 8px;">
                            ${worker.estadisticas.calificacion_promedio.toFixed(1)}
                        </span>
                        <span style="color: #718096; font-size: 14px; margin-left: 8px;">
                            (${worker.estadisticas.total_calificaciones} calificaciones)
                        </span>
                    </div>
                    <div class="profile-stats-row-enhanced">
                        <div class="stat-item-enhanced">
                            <i class="fas fa-briefcase"></i>
                            <span><strong>${worker.estadisticas.trabajos_completados}</strong> trabajos</span>
                        </div>
                        <div class="stat-item-enhanced">
                            <i class="fas fa-clock"></i>
                            <span><strong>${calcularAnosExperiencia(worker)}</strong> años exp.</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="profile-section-enhanced">
                <h3 style="color: #2d3748; font-size: 18px; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0;">
                    <i class="fas fa-id-card" style="color: #4a7c59;"></i> 
                    Información de Contacto
                </h3>
                <div class="contact-info-enhanced">
                    <div class="contact-item-enhanced">
                        <i class="fas fa-phone"></i>
                        <span>${worker.telefono || 'No disponible'}</span>
                    </div>
                    <div class="contact-item-enhanced">
                        <i class="fas fa-envelope"></i>
                        <span>${worker.email}</span>
                    </div>
                    ${worker.ubicacion ? `
                    <div class="contact-item-enhanced">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${worker.ubicacion}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            ${worker.habilidades && worker.habilidades.length > 0 ? `
                <div class="profile-section-enhanced">
                    <h3 style="color: #2d3748; font-size: 18px; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0;">
                        <i class="fas fa-tools" style="color: #4a7c59;"></i> 
                        Habilidades Profesionales
                    </h3>
                    <div class="skills-list-enhanced">
                        ${worker.habilidades.map(h => `
                            <div class="skill-tag-enhanced">
                                <i class="fas fa-check-circle"></i>
                                <div>
                                    <strong>${h.Nombre}</strong>
                                    <span>${h.Clasificacion}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${worker.experiencia && worker.experiencia.length > 0 ? `
                <div class="profile-section-enhanced">
                    <h3 style="color: #2d3748; font-size: 18px; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0;">
                        <i class="fas fa-briefcase" style="color: #4a7c59;"></i> 
                        Experiencia Laboral
                    </h3>
                    <div class="experiencia-list-enhanced">
                        ${worker.experiencia.map(exp => `
                            <div class="experiencia-item-enhanced">
                                <div class="experiencia-header">
                                    <i class="fas fa-building"></i>
                                    <strong>${exp.Ubicacion || 'Trabajo Agrícola'}</strong>
                                </div>
                                <div class="experiencia-dates">
                                    <i class="fas fa-calendar"></i>
                                    ${formatDate(exp.Fecha_Inicio)} - ${exp.Fecha_Fin ? formatDate(exp.Fecha_Fin) : 'Actualidad'}
                                </div>
                                ${exp.Observacion ? `
                                    <p class="experiencia-description">${exp.Observacion}</p>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="action-buttons-enhanced">
                <button class="btn-action-enhanced btn-documentos-enhanced" onclick="verDocumentosTrabajador(${trabajadorId})">
                    <i class="fas fa-file-alt"></i>
                    <span>Ver Documentos</span>
                </button>
                <button class="btn-action-enhanced btn-reportar-enhanced" onclick="reportarTrabajador(${trabajadorId}, '${worker.nombre_completo}')">
                    <i class="fas fa-flag"></i>
                    <span>Reportar</span>
                </button>
            </div>
        </div>
    `;
    
    agregarEstilosPerfilMejorado();
    
    modal.style.display = 'flex';
}

function closeWorkerProfileModal() {
    const modal = document.getElementById('workerProfileModal');
    if (modal) modal.style.display = 'none';
}

function calcularAnosExperiencia(worker) {
    if (worker.experiencia && worker.experiencia.length > 0) {
        let totalAnos = 0;
        worker.experiencia.forEach(exp => {
            const inicio = new Date(exp.Fecha_Inicio);
            const fin = exp.Fecha_Fin ? new Date(exp.Fecha_Fin) : new Date();
            const anos = (fin - inicio) / (1000 * 60 * 60 * 24 * 365);
            totalAnos += anos;
        });
        return Math.max(1, Math.round(totalAnos));
    }
    return worker.anos_experiencia || 1;
}

function formatDate(dateString) {
    if (!dateString) return 'Fecha no disponible';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ================================================================
// VER DOCUMENTOS DEL TRABAJADOR - ENDPOINT MEJORADO
// ================================================================

async function verDocumentosTrabajador(trabajadorId) {
    try {
        console.log('📄 Cargando documentos del trabajador:', trabajadorId);
        
        if (!trabajadorId || isNaN(trabajadorId)) {
            showStatusMessage('❌ ID de trabajador inválido', 'error');
            return;
        }
        
        showStatusMessage('Cargando documentos...', 'info');
        
        const url = `/api/documentos-usuario/${trabajadorId}`;
        console.log('🌐 URL de petición:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        console.log('📡 Response status:', response.status);
        
        if (response.status === 401) {
            showStatusMessage('❌ Sesión expirada. Por favor inicia sesión', 'error');
            setTimeout(() => {
                window.location.href = '/vista/login-trabajador.html';
            }, 2000);
            return;
        }
        
        if (response.status === 403) {
            showStatusMessage('❌ No tienes permisos para ver documentos', 'error');
            return;
        }
        
        if (response.status === 404) {
            showStatusMessage('❌ Endpoint no encontrado. Verifica el servidor', 'error');
            console.error('❌ El endpoint /api/documentos-usuario no existe en el servidor');
            return;
        }
        
        const data = await response.json();
        console.log('📦 Datos recibidos:', data);
        
        if (data.success) {
            mostrarModalDocumentosTrabajador(data.documentos || [], trabajadorId);
            
            if (data.total === 0) {
                showStatusMessage('ℹ️ Este trabajador no ha subido documentos', 'info');
            } else {
                showStatusMessage(`✅ ${data.total} documento${data.total > 1 ? 's' : ''} cargado${data.total > 1 ? 's' : ''}`, 'success');
            }
        } else {
            showStatusMessage('❌ ' + (data.message || 'Error al cargar documentos'), 'error');
        }
        
    } catch (error) {
        console.error('❌ Error completo:', error);
        showStatusMessage('❌ Error de conexión: ' + error.message, 'error');
        console.error('Stack trace:', error.stack);
    }
}

function mostrarModalDocumentosTrabajador(documentos, trabajadorId) {
    console.log('🎨 Mostrando modal de documentos:', documentos.length, 'documentos');
    console.log('📦 Documentos recibidos:', documentos);
    
    let modalDocumentos = document.getElementById('modalDocumentosTrabajador');
    
    if (!modalDocumentos) {
        modalDocumentos = document.createElement('div');
        modalDocumentos.id = 'modalDocumentosTrabajador';
        modalDocumentos.className = 'modal-documentos-trabajador';
        document.body.appendChild(modalDocumentos);
    }
    
    let contenidoHTML = '';
    
    if (!documentos || documentos.length === 0) {
        contenidoHTML = `
            <div class="sin-documentos-trabajador">
                <i class="fas fa-folder-open"></i>
                <h4>No hay documentos disponibles</h4>
                <p>Este trabajador no ha subido ningún documento aún.</p>
                <p style="color: #a0aec0; font-size: 14px; margin-top: 10px;">
                    Cuando suba documentos, aparecerán aquí.
                </p>
            </div>
        `;
    } else {
        contenidoHTML = `
            <div class="documentos-grid-trabajador">
                ${documentos.map(doc => {
                    const url = doc.archivo_url || '';
                    const extension = url.split('.').pop().toLowerCase();
                    
                    let iconClass = 'fa-file';
                    let colorClass = 'default';
                    
                    if (extension === 'pdf') {
                        iconClass = 'fa-file-pdf';
                        colorClass = 'pdf';
                    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension)) {
                        iconClass = 'fa-file-image';
                        colorClass = 'image';
                    } else if (['doc', 'docx'].includes(extension)) {
                        iconClass = 'fa-file-word';
                        colorClass = 'word';
                    } else if (['xls', 'xlsx'].includes(extension)) {
                        iconClass = 'fa-file-excel';
                        colorClass = 'excel';
                    }
                    
                    const tituloEscapado = (doc.tipo_documento || 'Documento').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                    const urlEscapada = url.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                    
                    console.log('📄 Procesando documento:', {
                        titulo: doc.tipo_documento,
                        url: url,
                        extension: extension,
                        iconClass: iconClass,
                        colorClass: colorClass
                    });
                    
                    return `
                        <div class="documento-card-trabajador">
                            <div class="documento-icon-trabajador ${colorClass}">
                                <i class="fas ${iconClass}"></i>
                            </div>
                            <div class="documento-info-trabajador">
                                <h5>${doc.tipo_documento || 'Documento'}</h5>
                                <p class="documento-fecha">
                                    <i class="fas fa-calendar"></i>
                                    ${doc.fecha_subida ? new Date(doc.fecha_subida).toLocaleDateString('es-ES') : 'Sin fecha'}
                                </p>
                            </div>
                            <button 
                                class="btn-ver-doc-trabajador" 
                                onclick="visualizarDocumento('${urlEscapada}', '${tituloEscapado}', '${extension}')"
                            >
                                <i class="fas fa-eye"></i>
                                Ver
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    modalDocumentos.innerHTML = `
        <div class="modal-documentos-content-trabajador">
            <div class="modal-documentos-header-trabajador">
                <h3>
                    <i class="fas fa-file-alt"></i>
                    Documentos del Trabajador
                </h3>
                <button class="modal-close-trabajador" onclick="cerrarModalDocumentosTrabajador()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-documentos-body-trabajador">
                ${contenidoHTML}
            </div>
        </div>
    `;
    
    agregarEstilosModalDocumentos();
    
    modalDocumentos.style.display = 'flex';
    
    console.log('✅ Modal de documentos mostrado');
    console.log('📊 HTML generado:', modalDocumentos.innerHTML.length, 'caracteres');
}

function visualizarDocumento(url, titulo, extension) {
    console.log('👁️ Visualizando documento:', titulo, extension, url);
    
    let visor = document.getElementById('visorDocumentoTrabajador');
    
    if (!visor) {
        visor = document.createElement('div');
        visor.id = 'visorDocumentoTrabajador';
        visor.className = 'visor-documento-trabajador';
        document.body.appendChild(visor);
    }
    
    let contenidoVisor = '';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
        contenidoVisor = `
            <img src="${url}" 
                 alt="${titulo}" 
                 style="max-width: 100%; max-height: 100%; object-fit: contain;"
                 onerror="this.parentElement.innerHTML='<div style=\\'text-align:center; padding:60px; color:#718096;\\'><i class=\\'fas fa-exclamation-triangle\\' style=\\'font-size:64px; margin-bottom:20px; color:#f59e0b;\\'></i><h4>Error al cargar imagen</h4><p>No se pudo cargar la imagen</p></div>';">
        `;
    } else if (extension === 'pdf') {
        contenidoVisor = `
            <iframe src="${url}#toolbar=1&navpanes=1&scrollbar=1" 
                    type="application/pdf" 
                    style="width: 100%; height: 100%; border: none;"
                    onerror="this.parentElement.innerHTML='<div style=\\'text-align:center; padding:60px; color:#718096;\\'><i class=\\'fas fa-exclamation-triangle\\' style=\\'font-size:64px; margin-bottom:20px; color:#f59e0b;\\'></i><h4>Error al cargar PDF</h4><p>No se pudo cargar el PDF</p></div>';">
            </iframe>
        `;
    } else {
        contenidoVisor = `
            <div style="text-align: center; padding: 60px; color: #718096;">
                <i class="fas fa-file" style="font-size: 80px; margin-bottom: 20px; color: #cbd5e0;"></i>
                <h4 style="color: #4a5568; margin-bottom: 15px; font-size: 20px;">Vista previa no disponible</h4>
                <p style="font-size: 16px; margin-bottom: 20px;">Este tipo de archivo (.${extension}) no se puede visualizar en el navegador.</p>
                <a href="${url}" 
                   download 
                   class="btn-descargar-doc" 
                   style="
                       display: inline-block;
                       padding: 12px 24px;
                       background: linear-gradient(135deg, #4a7c59, #1e3a2e);
                       color: white;
                       text-decoration: none;
                       border-radius: 10px;
                       font-weight: 600;
                       transition: all 0.3s ease;
                   "
                   onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(74, 124, 89, 0.3)';"
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                    <i class="fas fa-download"></i> Descargar Documento
                </a>
            </div>
        `;
    }
    
    visor.innerHTML = `
        <div class="visor-documento-content-trabajador">
            <div class="visor-documento-header-trabajador">
                <h4>
                    <i class="fas fa-file"></i>
                    ${titulo}
                </h4>
                <button class="modal-close-trabajador" onclick="cerrarVisorDocumento()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="visor-documento-body-trabajador">
                ${contenidoVisor}
            </div>
        </div>
    `;
    
    agregarEstilosVisorDocumento();
    
    visor.style.display = 'flex';
    
    console.log('✅ Visor de documento mostrado');
}

function cerrarModalDocumentosTrabajador() {
    const modal = document.getElementById('modalDocumentosTrabajador');
    if (modal) {
        modal.style.display = 'none';
        console.log('✅ Modal de documentos cerrado');
    }
}

function cerrarVisorDocumento() {
    const visor = document.getElementById('visorDocumentoTrabajador');
    if (visor) {
        visor.style.display = 'none';
        console.log('✅ Visor de documento cerrado');
    }
}

// ================================================================
// REPORTAR TRABAJADOR
// ================================================================

async function reportarTrabajador(trabajadorId, nombreTrabajador) {
    const motivo = prompt(`¿Por qué deseas reportar a ${nombreTrabajador}?\n\nEscribe el motivo (mínimo 10 caracteres):`);
    
    if (!motivo || motivo.trim().length < 10) {
        if (motivo !== null) {
            alert('El motivo debe tener al menos 10 caracteres. Por favor, sé más específico.');
        }
        return;
    }
    
    try {
        showStatusMessage('Enviando reporte...', 'info');
        
        const response = await fetch('/api/reportar-usuario-v2', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                usuario_reportado: trabajadorId,
                motivo: motivo.trim()
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatusMessage('✅ Reporte enviado correctamente', 'success');
            closeWorkerProfileModal();
        } else {
            showStatusMessage('❌ ' + data.message, 'error');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showStatusMessage('✅ Tu reporte ha sido registrado', 'success');
        closeWorkerProfileModal();
    }
}

// ================================================================
// MAPA Y GEOLOCALIZACIÓN
// ================================================================

function initMap() {
    console.log('🗺️ Inicializando mapa del agricultor...');
    
    const mapElement = document.getElementById("map");
    if (!mapElement) {
        console.error('❌ Elemento del mapa no encontrado');
        return;
    }
    
    try {
        const defaultLocation = [4.7110, -74.0721];
        
        map = L.map('map').setView(defaultLocation, 12);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
        }).addTo(map);
        
        cargarUbicacionPredio();
        
        console.log('✅ Mapa inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error inicializando mapa:', error);
    }
}

// ================================================================
// CARGAR UBICACIÓN DEL PREDIO - VERSIÓN MEJORADA
// ================================================================

async function cargarUbicacionPredio() {
    console.log('📍 Cargando ubicación del predio...');
    
    try {
        const response = await fetch('/api/get_user_location', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success && data.location && !data.is_default) {
            // Usuario tiene ubicación guardada
            const { lat, lng, nombre } = data.location;
            
            console.log(`✅ Ubicación cargada: ${nombre} (${lat}, ${lng})`);
            
            currentFarmerLocation = { lat, lng };
            
            map.setView([lat, lng], 13);
            agregarMarcadorPredio(lat, lng, nombre);
            cargarTrabajadoresCercanos(lat, lng);
            
        } else {
            // Usuario NO tiene ubicación configurada - SOLICITAR PERMISO
            console.log('⚠️ Ubicación no configurada, solicitando geolocalización...');
            solicitarUbicacionUsuario();
        }
        
    } catch (error) {
        console.error('❌ Error cargando ubicación:', error);
        solicitarUbicacionUsuario();
    }
}

// ================================================================
// SOLICITAR UBICACIÓN DEL USUARIO
// ================================================================

function solicitarUbicacionUsuario() {
    if ("geolocation" in navigator) {
        console.log('📍 Solicitando ubicación del navegador...');
        
        // Mostrar mensaje amigable
        mostrarModalUbicacion();
        
        navigator.geolocation.getCurrentPosition(
            // Éxito
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                console.log(`✅ Ubicación obtenida: ${lat}, ${lng}`);
                
                currentFarmerLocation = { lat, lng };
                
                map.setView([lat, lng], 13);
                agregarMarcadorPredio(lat, lng, 'Mi Ubicación');
                cargarTrabajadoresCercanos(lat, lng);
                
                // Preguntar si desea guardar
                setTimeout(() => {
                    confirmarGuardarUbicacion(lat, lng);
                }, 1000);
            },
            // Error
            (error) => {
                console.warn('⚠️ Error obteniendo ubicación:', error.message);
                
                let errorMsg = 'No se pudo obtener tu ubicación.';
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg = 'Permiso denegado. Por favor, activa la ubicación en tu navegador.';
                        mostrarErrorUbicacion(errorMsg);
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg = 'Ubicación no disponible. Intenta más tarde.';
                        mostrarErrorUbicacion(errorMsg);
                        break;
                    case error.TIMEOUT:
                        errorMsg = 'Tiempo de espera agotado. Intenta de nuevo.';
                        mostrarErrorUbicacion(errorMsg);
                        break;
                }
                
                // Mostrar ubicación por defecto (Bogotá)
                usarUbicacionPorDefecto();
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    } else {
        console.warn('⚠️ Geolocalización no soportada');
        showStatusMessage('Tu navegador no soporta geolocalización', 'warning');
        usarUbicacionPorDefecto();
    }
}

// ================================================================
// MODAL PARA SOLICITAR UBICACIÓN
// ================================================================

function mostrarModalUbicacion() {
    // Remover modal anterior si existe
    const modalExistente = document.getElementById('modalUbicacion');
    if (modalExistente) modalExistente.remove();
    
    const modal = document.createElement('div');
    modal.id = 'modalUbicacion';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(8px);
        animation: fadeIn 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            width: 90%;
            text-align: center;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
            animation: slideInUp 0.4s ease;
        ">
            <div style="
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #4a7c59, #1e3a2e);
                border-radius: 50%;
                margin: 0 auto 25px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 36px;
                box-shadow: 0 10px 30px rgba(74, 124, 89, 0.4);
            ">
                <i class="fas fa-map-marker-alt"></i>
            </div>
            
            <h2 style="
                color: #1e3a2e;
                font-size: 24px;
                font-weight: 700;
                margin-bottom: 15px;
            ">
                Configura tu Ubicación
            </h2>
            
            <p style="
                color: #4a7c59;
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 25px;
            ">
                Para mostrarte trabajadores cercanos a tu predio, necesitamos conocer tu ubicación.
            </p>
            
            <div style="
                background: rgba(74, 124, 89, 0.1);
                padding: 15px;
                border-radius: 12px;
                border-left: 4px solid #4a7c59;
                margin-bottom: 25px;
            ">
                <p style="
                    color: #1e3a2e;
                    font-size: 14px;
                    margin: 0;
                ">
                    <i class="fas fa-info-circle" style="color: #4a7c59; margin-right: 8px;"></i>
                    Tu ubicación será utilizada solo para mostrarte trabajadores disponibles cerca de ti.
                </p>
            </div>
            
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                color: #6c757d;
                font-size: 13px;
            ">
                <div class="spinner" style="
                    width: 20px;
                    height: 20px;
                    border: 3px solid rgba(74, 124, 89, 0.2);
                    border-top-color: #4a7c59;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                "></div>
                <span>Esperando permiso de ubicación...</span>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Agregar estilos de animación
    if (!document.getElementById('modal-ubicacion-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-ubicacion-styles';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideInUp {
                from {
                    opacity: 0;
                    transform: translateY(50px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

function cerrarModalUbicacion() {
    const modal = document.getElementById('modalUbicacion');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => modal.remove(), 300);
    }
}

// ================================================================
// CONFIRMAR GUARDAR UBICACIÓN
// ================================================================

function confirmarGuardarUbicacion(lat, lng) {
    cerrarModalUbicacion();
    
    const modal = document.createElement('div');
    modal.id = 'modalConfirmarUbicacion';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(8px);
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 20px;
            padding: 35px;
            max-width: 450px;
            width: 90%;
            text-align: center;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
        ">
            <div style="
                width: 70px;
                height: 70px;
                background: linear-gradient(135deg, #22c55e, #16a34a);
                border-radius: 50%;
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 32px;
            ">
                <i class="fas fa-check"></i>
            </div>
            
            <h2 style="color: #1e3a2e; font-size: 22px; font-weight: 700; margin-bottom: 12px;">
                ¡Ubicación Obtenida!
            </h2>
            
            <p style="color: #4a7c59; font-size: 15px; margin-bottom: 25px;">
                ¿Deseas guardar esta ubicación como tu predio?
            </p>
            
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button onclick="guardarUbicacionConfirmada(${lat}, ${lng})" style="
                    padding: 12px 28px;
                    background: linear-gradient(135deg, #4a7c59, #1e3a2e);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 15px;
                    box-shadow: 0 4px 15px rgba(74, 124, 89, 0.3);
                    transition: all 0.3s ease;
                " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                    <i class="fas fa-save"></i> Sí, Guardar
                </button>
                
                <button onclick="cerrarModalConfirmarUbicacion()" style="
                    padding: 12px 28px;
                    background: #f1f3f4;
                    color: #5f6368;
                    border: 2px solid #e1e8ed;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 15px;
                    transition: all 0.3s ease;
                " onmouseover="this.style.background='#e8eaed'" onmouseout="this.style.background='#f1f3f4'">
                    Ahora No
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

window.guardarUbicacionConfirmada = async function(lat, lng) {
    cerrarModalConfirmarUbicacion();
    await guardarUbicacionPredio(lat, lng);
};

window.cerrarModalConfirmarUbicacion = function() {
    const modal = document.getElementById('modalConfirmarUbicacion');
    if (modal) modal.remove();
};

// ================================================================
// MOSTRAR ERROR DE UBICACIÓN
// ================================================================

function mostrarErrorUbicacion(mensaje) {
    cerrarModalUbicacion();
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(8px);
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 20px;
            padding: 35px;
            max-width: 450px;
            width: 90%;
            text-align: center;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
        ">
            <div style="
                width: 70px;
                height: 70px;
                background: linear-gradient(135deg, #ef4444, #dc2626);
                border-radius: 50%;
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 32px;
            ">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            
            <h2 style="color: #1e3a2e; font-size: 22px; font-weight: 700; margin-bottom: 12px;">
                Error de Ubicación
            </h2>
            
            <p style="color: #4a7c59; font-size: 15px; margin-bottom: 25px;">
                ${mensaje}
            </p>
            
            <button onclick="this.parentElement.parentElement.remove()" style="
                padding: 12px 32px;
                background: linear-gradient(135deg, #4a7c59, #1e3a2e);
                color: white;
                border: none;
                border-radius: 12px;
                font-weight: 600;
                cursor: pointer;
                font-size: 15px;
                box-shadow: 0 4px 15px rgba(74, 124, 89, 0.3);
            ">
                Entendido
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// ================================================================
// USAR UBICACIÓN POR DEFECTO
// ================================================================

function usarUbicacionPorDefecto() {
    console.log('📍 Usando ubicación por defecto (Bogotá)');
    
    const defaultLat = 4.7110;
    const defaultLng = -74.0721;
    
    currentFarmerLocation = { lat: defaultLat, lng: defaultLng };
    
    map.setView([defaultLat, defaultLng], 12);
    agregarMarcadorPredio(defaultLat, defaultLng, 'Ubicación Por Defecto');
    
    showStatusMessage('Usando ubicación por defecto. Configura tu predio para mejores resultados.', 'info');
}

console.log('✅ Sistema de ubicación mejorado cargado');

function agregarMarcadorPredio(lat, lng, nombre) {
    const predioIcon = L.divIcon({
        className: 'predio-marker',
        html: `<div style="
            width: 40px; 
            height: 40px; 
            background: #4a7c59; 
            border: 4px solid white; 
            border-radius: 50%; 
            box-shadow: 0 4px 10px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
        ">
            <i class="fas fa-home" style="color: white; font-size: 18px;"></i>
        </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });
    
    if (farmerMarker) {
        map.removeLayer(farmerMarker);
    }
    
    farmerMarker = L.marker([lat, lng], { icon: predioIcon }).addTo(map);
    
    farmerMarker.bindPopup(`
        <div style="text-align: center; padding: 12px;">
            <strong style="color: #4a7c59; font-size: 16px;">🏡 ${nombre}</strong>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">
                ${lat.toFixed(6)}, ${lng.toFixed(6)}
            </p>
        </div>
    `).openPopup();
}

async function cargarTrabajadoresCercanos(lat, lng, radius = 50) {
    console.log(`🔍 Buscando trabajadores en radio de ${radius}km...`);
    
    try {
        const response = await fetch('/api/get_nearby_workers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                latitude: lat,
                longitude: lng,
                radius: radius
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ ${data.total} trabajadores encontrados`);
            
            limpiarMarcadoresTrabajadores();
            
            data.trabajadores.forEach(trabajador => {
                agregarMarcadorTrabajador(trabajador);
            });
            
            if (data.total === 0) {
                showStatusMessage('No hay trabajadores disponibles cerca', 'info');
            } else {
                showStatusMessage(`${data.total} trabajadores disponibles cerca de ti`, 'success');
            }
            
        } else {
            console.error('❌ Error:', data.error);
            showStatusMessage('Error al cargar trabajadores', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        showStatusMessage('Error de conexión', 'error');
    }
}

function agregarMarcadorTrabajador(trabajador) {
    const workerIcon = L.divIcon({
        className: 'worker-marker',
        html: `<div style="
            background: #2563eb; 
            width: 32px; 
            height: 32px; 
            border-radius: 50%; 
            border: 3px solid white; 
            box-shadow: 0 3px 6px rgba(0,0,0,0.3); 
            display: flex; 
            align-items: center; 
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s;
        " onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
            <i class="fas fa-user" style="color: white; font-size: 14px;"></i>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });
    
    const marker = L.marker([trabajador.lat, trabajador.lng], { icon: workerIcon }).addTo(map);
    
    const estrellas = '⭐'.repeat(Math.round(trabajador.calificacion));
    
    const popupContent = `
        <div style="min-width: 280px; padding: 14px; font-family: 'Segoe UI', sans-serif;">
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
                ${trabajador.foto ? 
                    `<img src="${trabajador.foto}" style="width: 50px; height: 50px; border-radius: 50%; margin-right: 12px; object-fit: cover;">` :
                    `<div style="width: 50px; height: 50px; border-radius: 50%; background: #2563eb; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                        <i class="fas fa-user" style="color: white; font-size: 20px;"></i>
                    </div>`
                }
                <div>
                    <h4 style="margin: 0 0 4px 0; color: #1e3a2e; font-size: 16px; font-weight: 600;">
                        ${trabajador.nombre}
                    </h4>
                    <div style="font-size: 13px; color: #f59e0b;">
                        ${estrellas} ${trabajador.calificacion.toFixed(1)}
                    </div>
                </div>
            </div>
            
            <div style="background: #f0f9ff; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; margin-bottom: 6px;">
                    <i class="fas fa-briefcase" style="color: #2563eb; margin-right: 8px; width: 16px;"></i>
                    <span style="font-size: 13px; color: #374151;">
                        <strong>${trabajador.trabajos}</strong> trabajos completados
                    </span>
                </div>
                
                <div style="display: flex; align-items: center; margin-bottom: 6px;">
                    <i class="fas fa-map-marker-alt" style="color: #dc2626; margin-right: 8px; width: 16px;"></i>
                    <span style="font-size: 13px; color: #374151;">
                        <strong>${trabajador.distancia} km</strong> de distancia
                    </span>
                </div>
                
                ${trabajador.telefono ? `
                <div style="display: flex; align-items: center;">
                    <i class="fas fa-phone" style="color: #16a34a; margin-right: 8px; width: 16px;"></i>
                    <span style="font-size: 13px; color: #374151;">
                        ${trabajador.telefono}
                    </span>
                </div>
                ` : ''}
            </div>
            
            ${trabajador.habilidades.length > 0 ? `
            <div style="margin: 10px 0;">
                <strong style="font-size: 13px; color: #4b5563;">Habilidades:</strong>
                <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px;">
                    ${trabajador.habilidades.slice(0, 3).map(hab => `
                        <span style="
                            background: #dbeafe;
                            color: #1e40af;
                            padding: 4px 10px;
                            border-radius: 12px;
                            font-size: 11px;
                            font-weight: 500;
                        ">${hab}</span>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            <button 
                onclick="verPerfilTrabajadorDesdeMapa(${trabajador.id})"
                style="
                    width: 100%;
                    background: linear-gradient(135deg, #2563eb, #1d4ed8);
                    color: white;
                    border: none;
                    padding: 10px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 600;
                    margin-top: 10px;
                    transition: all 0.3s;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                "
                onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.3)';"
                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.2)';"
            >
                <i class="fas fa-user-circle"></i> Ver Perfil Completo
            </button>
        </div>
    `;
    
    marker.bindPopup(popupContent, {
        maxWidth: 320,
        className: 'custom-popup'
    });
    
    workerMarkers.push(marker);
}

function limpiarMarcadoresTrabajadores() {
    workerMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
    workerMarkers = [];
}

window.verPerfilTrabajadorDesdeMapa = function(trabajadorId) {
    console.log(`👤 Ver perfil trabajador ID: ${trabajadorId}`);
    map.closePopup();
    window.location.href = `/vista/perfil-trabajador.html?userId=${trabajadorId}`;
};

async function guardarUbicacionPredio(lat, lng) {
    try {
        const response = await fetch('/api/save_user_location', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                latitude: lat,
                longitude: lng
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatusMessage('✅ Ubicación guardada correctamente', 'success');
        } else {
            showStatusMessage('❌ Error guardando ubicación', 'error');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showStatusMessage('❌ Error de conexión', 'error');
    }
}

function agregarBotonActualizarTrabajadores() {
    if (!map) return;
    
    const control = L.control({ position: 'topright' });
    
    control.onAdd = function() {
        const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        div.innerHTML = `
            <a href="#" title="Actualizar trabajadores" style="
                background: white;
                width: 34px;
                height: 34px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                color: #2563eb;
                text-decoration: none;
            ">
                <i class="fas fa-sync-alt"></i>
            </a>
        `;
        
        div.onclick = function(e) {
            e.preventDefault();
            if (currentFarmerLocation) {
                cargarTrabajadoresCercanos(currentFarmerLocation.lat, currentFarmerLocation.lng);
            }
        };
        
        return div;
    };
    
    control.addTo(map);
}

setTimeout(() => {
    if (map) {
        agregarBotonActualizarTrabajadores();
    }
}, 1000);

// ================================================================
// UTILIDADES Y MENSAJES
// ================================================================

function showNotifications() {
    showStatusMessage('Cargando notificaciones...', 'info');
}

function handleNotification(element) {
    element.style.opacity = '0.7';
    element.style.transform = 'translateX(5px)';
    
    setTimeout(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateX(0)';
        showStatusMessage('Notificación marcada como leída', 'success');
    }, 200);
}

function showStatusMessage(message, type = 'info') {
    const messageElement = document.createElement('div');
    messageElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: 600;
        z-index: 99999;
        max-width: 350px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        animation: slideInRight 0.3s ease;
    `;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-triangle', 
        warning: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle'
    };
    
    const colors = {
        success: 'linear-gradient(135deg, #22c55e, #16a34a)',
        error: 'linear-gradient(135deg, #dc2626, #991b1b)',
        warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
        info: 'linear-gradient(135deg, #3b82f6, #2563eb)'
    };
    
    messageElement.style.background = colors[type] || colors.info;
    messageElement.innerHTML = `<i class="${icons[type] || icons.info}" style="margin-right: 8px;"></i>${message}`;
    
    document.body.appendChild(messageElement);
    
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.parentNode.removeChild(messageElement);
                }
            }, 300);
        }
    }, 4000);
}

// ================================================================
// EVENT LISTENERS
// ================================================================

function setupEventListeners() {
    document.addEventListener('click', function(event) {
        if (!event.target.closest('#profileMenuBtn') && !event.target.closest('#profileDropdown')) {
            closeProfileMenu();
        }
        
        const modalDocumentos = document.getElementById('modalDocumentosTrabajador');
        if (modalDocumentos && event.target === modalDocumentos) {
            cerrarModalDocumentosTrabajador();
        }
        
        const visor = document.getElementById('visorDocumentoTrabajador');
        if (visor && event.target === visor) {
            cerrarVisorDocumento();
        }
    });

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            cerrarModalOferta();
            cerrarModalEditar();
            closeProfileMenu();
            closeApplicationsModal();
            closeWorkerProfileModal();
            cerrarModalDocumentosTrabajador();
            cerrarVisorDocumento();
        }
    });

    document.getElementById('modalCrearOferta')?.addEventListener('click', function(event) {
        if (event.target === this) {
            cerrarModalOferta();
        }
    });

    document.getElementById('modalEditarOferta')?.addEventListener('click', function(event) {
        if (event.target === this) {
            cerrarModalEditar();
        }
    });

    document.getElementById('applicationsModal')?.addEventListener('click', function(event) {
        if (event.target === this) {
            closeApplicationsModal();
        }
    });

    document.getElementById('workerProfileModal')?.addEventListener('click', function(event) {
        if (event.target === this) {
            closeWorkerProfileModal();
        }
    });
}

// ================================================================
// ESTILOS CSS DINÁMICOS
// ================================================================

function agregarEstilosPerfilMejorado() {
    if (document.getElementById('estilos-perfil-mejorado')) return;
    
    const style = document.createElement('style');
    style.id = 'estilos-perfil-mejorado';
    style.textContent = `
        .worker-profile-enhanced {
            padding: 0;
        }
        
        .profile-header-enhanced {
            background: linear-gradient(135deg, rgba(74, 124, 89, 0.1), rgba(144, 238, 144, 0.1));
            padding: 40px 30px;
            border-radius: 20px 20px 0 0;
            display: flex;
            gap: 30px;
            align-items: center;
        }
        
        .profile-avatar-large-enhanced {
            width: 140px;
            height: 140px;
            border-radius: 50%;
            background: linear-gradient(135deg, #4a7c59, #1e3a2e);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 48px;
            flex-shrink: 0;
            box-shadow: 0 12px 30px rgba(74, 124, 89, 0.4);
            overflow: hidden;
            border: 5px solid white;
        }
        
        .profile-info-enhanced {
            flex: 1;
        }
        
        .profile-rating-enhanced {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 15px;
            font-size: 18px;
        }
        
        .profile-stats-row-enhanced {
            display: flex;
            gap: 25px;
            margin-top: 15px;
        }
        
        .stat-item-enhanced {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 18px;
            background: rgba(255, 255, 255, 0.7);
            border-radius: 10px;
            font-size: 15px;
            color: #4a5568;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .stat-item-enhanced i {
            color: #4a7c59;
            font-size: 20px;
        }
        
        .profile-section-enhanced {
            padding: 30px;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .profile-section-enhanced:last-of-type {
            border-bottom: none;
        }
        
        .contact-info-enhanced {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        
        .contact-item-enhanced {
            padding: 15px 20px;
            background: #f7fafc;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            border-left: 4px solid #4a7c59;
            font-size: 15px;
            color: #2d3748;
        }
        
        .contact-item-enhanced i {
            color: #4a7c59;
            font-size: 20px;
        }
        
        .skills-list-enhanced {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 12px;
            margin-top: 15px;
        }
        
        .skill-tag-enhanced {
            padding: 15px 18px;
            background: linear-gradient(135deg, #e7f3ff, #f0f9ff);
            border: 2px solid #bae6fd;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: all 0.3s ease;
        }
        
        .skill-tag-enhanced:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 20px rgba(37, 99, 235, 0.2);
            border-color: #2563eb;
        }
        
        .skill-tag-enhanced i {
            color: #2563eb;
            font-size: 18px;
        }
        
        .skill-tag-enhanced strong {
            display: block;
            color: #1e40af;
            font-size: 15px;
            margin-bottom: 3px;
        }
        
        .skill-tag-enhanced span {
            display: block;
            color: #64748b;
            font-size: 12px;
        }
        
        .experiencia-list-enhanced {
            display: flex;
            flex-direction: column;
            gap: 15px;
            margin-top: 15px;
        }
        
        .experiencia-item-enhanced {
            padding: 20px;
            background: #f7fafc;
            border-radius: 12px;
            border-left: 4px solid #4a7c59;
            transition: all 0.3s ease;
        }
        
        .experiencia-item-enhanced:hover {
            background: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .experiencia-header {
            display: flex;
            align-items: center;
            gap: 10px;
            color: #2d3748;
            font-size: 16px;
            margin-bottom: 8px;
        }
        
        .experiencia-header i {
            color: #4a7c59;
        }
        
        .experiencia-dates {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #718096;
            font-size: 14px;
            margin-bottom: 10px;
        }
        
        .experiencia-dates i {
            color: #4a7c59;
        }
        
        .experiencia-description {
            color: #4a5568;
            font-size: 14px;
            line-height: 1.6;
            margin: 0;
        }
        
        .action-buttons-enhanced {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            padding: 30px;
            background: #f7fafc;
            border-radius: 0 0 20px 20px;
        }
        
        .btn-action-enhanced {
            padding: 16px 24px;
            border: none;
            border-radius: 12px;
            font-weight: 600;
            font-size: 15px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .btn-action-enhanced:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.2);
        }
        
        .btn-documentos-enhanced {
            background: linear-gradient(135deg, #3b82f6, #1e40af);
            color: white;
        }
        
        .btn-documentos-enhanced:hover {
            background: linear-gradient(135deg, #2563eb, #1e3a8a);
        }
        
        .btn-reportar-enhanced {
            background: linear-gradient(135deg, #ef4444, #b91c1c);
            color: white;
        }
        
        .btn-reportar-enhanced:hover {
            background: linear-gradient(135deg, #dc2626, #991b1b);
        }
        
        @media (max-width: 768px) {
            .profile-header-enhanced {
                flex-direction: column;
                text-align: center;
            }
            
            .contact-info-enhanced,
            .skills-list-enhanced {
                grid-template-columns: 1fr;
            }
            
            .action-buttons-enhanced {
                grid-template-columns: 1fr;
            }
        }
    `;
    
    document.head.appendChild(style);
}

function agregarEstilosModalDocumentos() {
    if (document.getElementById('estilos-modal-documentos')) return;
    
    const style = document.createElement('style');
    style.id = 'estilos-modal-documentos';
    style.textContent = `
        .modal-documentos-trabajador {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.75);
            z-index: 99999 !important;
            align-items: center;
            justify-content: center;
            padding: 20px;
            backdrop-filter: blur(8px);
        }
        
        .modal-documentos-content-trabajador {
            background: white;
            border-radius: 20px;
            max-width: 900px;
            width: 100%;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 25px 70px rgba(0,0,0,0.5);
            animation: modalSlideIn 0.3s ease;
            position: relative;
            z-index: 100000 !important;
        }
        
        @keyframes modalSlideIn {
            from {
                opacity: 0;
                transform: translateY(-50px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        
        .modal-documentos-header-trabajador {
            background: linear-gradient(135deg, #3b82f6, #1e40af);
            color: white;
            padding: 25px 30px;
            border-radius: 20px 20px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-documentos-header-trabajador h3 {
            font-size: 22px;
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 0;
        }
        
        .modal-close-trabajador {
            background: rgba(255,255,255,0.2);
            border: none;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            font-size: 20px;
            cursor: pointer;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        }
        
        .modal-close-trabajador:hover {
            background: rgba(255,255,255,0.3);
            transform: rotate(90deg);
        }
        
        .modal-documentos-body-trabajador {
            padding: 30px;
            overflow-y: auto;
            flex: 1;
        }
        
        .documentos-grid-trabajador {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
        }
        
        .documento-card-trabajador {
            background: #f7fafc;
            border: 2px solid #e2e8f0;
            border-radius: 16px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 15px;
            transition: all 0.3s ease;
        }
        
        .documento-card-trabajador:hover {
            border-color: #3b82f6;
            background: white;
            transform: translateY(-5px);
            box-shadow: 0 12px 30px rgba(59, 130, 246, 0.2);
        }
        
        .documento-icon-trabajador {
            width: 80px;
            height: 80px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            color: white;
            box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        }
        
        .documento-icon-trabajador.pdf {
            background: linear-gradient(135deg, #ef4444, #b91c1c);
        }
        
        .documento-icon-trabajador.image {
            background: linear-gradient(135deg, #8b5cf6, #6d28d9);
        }
        
        .documento-icon-trabajador.word {
            background: linear-gradient(135deg, #3b82f6, #1e40af);
        }
        
        .documento-icon-trabajador.excel {
            background: linear-gradient(135deg, #10b981, #047857);
        }
        
        .documento-icon-trabajador.default {
            background: linear-gradient(135deg, #64748b, #475569);
        }
        
        .documento-info-trabajador {
            text-align: center;
            flex: 1;
        }
        
        .documento-info-trabajador h5 {
            color: #2d3748;
            font-size: 16px;
            margin: 0 0 8px 0;
            font-weight: 600;
        }
        
        .documento-fecha {
            color: #718096;
            font-size: 13px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        
        .btn-ver-doc-trabajador {
            width: 100%;
            background: linear-gradient(135deg, #3b82f6, #1e40af);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 10px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.3s ease;
        }
        
        .btn-ver-doc-trabajador:hover {
            background: linear-gradient(135deg, #2563eb, #1e3a8a);
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
        }
        
        .sin-documentos-trabajador {
            text-align: center;
            padding: 80px 20px;
        }
        
        .sin-documentos-trabajador i {
            font-size: 80px;
            color: #cbd5e0;
            margin-bottom: 20px;
            display: block;
        }
        
        .sin-documentos-trabajador h4 {
            color: #2d3748;
            font-size: 22px;
            margin-bottom: 12px;
        }
        
        .sin-documentos-trabajador p {
            color: #718096;
            font-size: 16px;
        }
        
        @media (max-width: 768px) {
            .documentos-grid-trabajador {
                grid-template-columns: 1fr;
            }
        }
    `;
    
    document.head.appendChild(style);
    console.log('✅ Estilos del modal de documentos agregados');
}

function agregarEstilosVisorDocumento() {
    if (document.getElementById('estilos-visor-documento')) return;
    
    const style = document.createElement('style');
    style.id = 'estilos-visor-documento';
    style.textContent = `
        .visor-documento-trabajador {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.95);
            z-index: 999999 !important;
            align-items: center;
            justify-content: center;
            padding: 20px;
            backdrop-filter: blur(10px);
        }
        
        .visor-documento-content-trabajador {
            width: 100%;
            height: 100%;
            max-width: 1400px;
            max-height: 95vh;
            background: white;
            border-radius: 16px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 30px 80px rgba(0,0,0,0.6);
            animation: visorSlideIn 0.4s ease;
        }
        
        @keyframes visorSlideIn {
            from {
                opacity: 0;
                transform: scale(0.9);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }
        
        .visor-documento-header-trabajador {
            background: #2d3748;
            color: white;
            padding: 20px 30px;
            border-radius: 16px 16px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .visor-documento-header-trabajador h4 {
            font-size: 18px;
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 0;
        }
        
        .visor-documento-body-trabajador {
            flex: 1;
            overflow: hidden;
            background: #f7fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 0 0 16px 16px;
        }
        
        .visor-documento-body-trabajador iframe,
        .visor-documento-body-trabajador img {
            width: 100%;
            height: 100%;
            border: none;
        }
        
        @media (max-width: 768px) {
            .visor-documento-content-trabajador {
                max-width: 100%;
                max-height: 100vh;
                border-radius: 0;
            }
            
            .visor-documento-header-trabajador {
                border-radius: 0;
            }
            
            .visor-documento-body-trabajador {
                border-radius: 0;
            }
        }
    `;
    
    document.head.appendChild(style);
    console.log('✅ Estilos del visor de documento agregados');
}

// ================================================================
// EXPONER FUNCIONES GLOBALMENTE
// ================================================================

window.toggleProfileMenu = toggleProfileMenu;
window.closeProfileMenu = closeProfileMenu;
window.createNewOffer = createNewOffer;
window.cerrarModalOferta = cerrarModalOferta;
window.crearOferta = crearOferta;
window.editarOferta = editarOferta;
window.cerrarModalEditar = cerrarModalEditar;
window.guardarEdicion = guardarEdicion;
window.eliminarOferta = eliminarOferta;
window.duplicarOferta = duplicarOferta;
window.cerrarOferta = cerrarOferta;
window.reabrirOferta = reabrirOferta;
window.verPostulaciones = verPostulaciones;
window.aceptarPostulacionConCierre = aceptarPostulacionConCierre;
window.rechazarPostulacion = rechazarPostulacion;
window.closeApplicationsModal = closeApplicationsModal;
window.verPerfilTrabajador = verPerfilTrabajador;
window.closeWorkerProfileModal = closeWorkerProfileModal;
window.verDocumentosTrabajador = verDocumentosTrabajador;
window.mostrarModalDocumentosTrabajador = mostrarModalDocumentosTrabajador;
window.visualizarDocumento = visualizarDocumento;
window.reportarTrabajador = reportarTrabajador;
window.cerrarModalDocumentosTrabajador = cerrarModalDocumentosTrabajador;
window.cerrarVisorDocumento = cerrarVisorDocumento;
window.showNotifications = showNotifications;
window.handleNotification = handleNotification;
window.showHistorialContrataciones = showHistorialContrataciones;
window.showEstadisticas = showEstadisticas;
window.viewProfile = viewProfile;
window.viewSettings = viewSettings;
window.confirmLogout = confirmLogout;
window.showAyudaSoporte = showAyudaSoporte;

console.log('✅ Dashboard Agricultor COMPLETO v2.0');
console.log('📋 Funcionalidades incluidas:');
console.log('   - Duplicar ofertas');
console.log('   - Foto de perfil');
console.log('   - Ver documentos trabajadores (endpoint: /api/ver-documentos-trabajador)');
console.log('   - Geolocalización y mapa interactivo');
console.log('   - Gestión completa de ofertas y postulaciones');

// ================================================================
// SISTEMA DE CALIFICACIONES Y NOTIFICACIONES - AGRICULTOR
// ================================================================

// Cargar calificación del usuario
async function loadUserRating() {
    try {
        if (!currentUser || !currentUser.userId) return;
        
        const response = await fetch(`/api/get_user_rating/${currentUser.userId}`, {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('⭐ Calificación del agricultor:', data.promedio);
            
            // Actualizar calificación en el perfil (si existe el elemento)
            const ratingElement = document.querySelector('.profile-rating');
            if (ratingElement) {
                const starsHTML = generateStarsHTML(data.promedio);
                ratingElement.innerHTML = `
                    ${starsHTML}
                    <span class="rating-value" style="font-weight: 700; color: #1e3a2e; margin-left: 8px;">
                        ${data.promedio.toFixed(1)}
                    </span>
                    <span class="rating-count" style="color: #6c757d; font-size: 14px; margin-left: 5px;">
                        (${data.total_calificaciones})
                    </span>
                `;
            }
        }
    } catch (error) {
        console.error('Error cargando calificación:', error);
    }
}

// Generar HTML de estrellas
function generateStarsHTML(rating) {
    let starsHTML = '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = (rating % 1) >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<i class="fas fa-star" style="color: #ffc107; font-size: 18px;"></i>';
    }
    
    if (hasHalfStar) {
        starsHTML += '<i class="fas fa-star-half-alt" style="color: #ffc107; font-size: 18px;"></i>';
    }
    
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '<i class="far fa-star" style="color: #ffc107; font-size: 18px;"></i>';
    }
    
    return starsHTML;
}

// Cargar notificaciones del agricultor
async function loadNotifications() {
    try {
        const response = await fetch('/api/get_notifications', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success && data.notificaciones) {
            console.log('🔔 Notificaciones cargadas:', data.total);
            updateNotificationBadge(data.no_leidas);
            displayNotifications(data.notificaciones);
        }
    } catch (error) {
        console.error('Error cargando notificaciones:', error);
    }
}

// Actualizar badge de notificaciones
function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 9 ? '9+' : count;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Mostrar notificaciones en el sidebar
function displayNotifications(notificaciones) {
    const container = document.querySelector('.notifications');
    if (!container) return;
    
    // Mantener el título
    const titleHTML = `
        <div class="section-title">
            <i class="fas fa-bell"></i>
            <span data-i18n="recent_notifications">Notificaciones Recientes</span>
        </div>
    `;
    
    if (notificaciones.length === 0) {
        container.innerHTML = titleHTML + `
            <div class="notification-item" style="text-align: center; padding: 30px 15px; color: #6c757d;">
                <i class="fas fa-bell-slash" style="font-size: 32px; margin-bottom: 10px; display: block;"></i>
                <p>No tienes notificaciones</p>
            </div>
        `;
        return;
    }
    
    let html = titleHTML;
    
    // Mostrar solo las primeras 3 notificaciones en el sidebar
    notificaciones.slice(0, 3).forEach(notif => {
        const fechaFormateada = formatearTiempoTranscurrido(notif.fecha);
        
        html += `
            <div class="notification-item ${notif.leida ? '' : 'unread'}" 
                 onclick="handleNotificationClick('${notif.id}', '${notif.link || ''}')">
                <div class="notification-title">${notif.titulo}</div>
                <div class="notification-text">${notif.mensaje}</div>
                <div class="notification-time">${fechaFormateada}</div>
            </div>
        `;
    });
    
    if (notificaciones.length > 3) {
        html += `
            <div class="notification-item" style="text-align: center; padding: 12px; border-top: 2px solid #e9ecef; cursor: pointer;" onclick="showAllNotifications()">
                <strong style="color: #4a7c59;">Ver todas (${notificaciones.length})</strong>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// Manejar clic en notificación
function handleNotificationClick(notifId, link) {
    console.log('📌 Click en notificación:', notifId);
    
    // Marcar como leída
    fetch('/api/mark_notification_read', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ notification_id: notifId })
    }).catch(err => console.error('Error:', err));
    
    // Navegar si hay link
    if (link && link !== '' && link !== 'undefined') {
        window.location.href = link;
    }
}

// Formatear tiempo transcurrido
function formatearTiempoTranscurrido(fechaISO) {
    if (!fechaISO) return 'Hace un momento';
    
    const fecha = new Date(fechaISO);
    const ahora = new Date();
    const diff = Math.floor((ahora - fecha) / 1000); // segundos
    
    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `Hace ${Math.floor(diff / 86400)}d`;
    
    return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// Mostrar modal con todas las notificaciones
const originalShowNotifications = window.showNotifications;
window.showNotifications = async function() {
    // Crear modal de notificaciones
    let modal = document.getElementById('notificationsModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'notificationsModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 99999;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
            backdrop-filter: blur(8px);
        `;
        document.body.appendChild(modal);
    }
    
    // Cargar notificaciones
    try {
        const response = await fetch('/api/get_notifications', { credentials: 'include' });
        const data = await response.json();
        
        if (data.success) {
            modal.innerHTML = `
                <div style="
                    background: white;
                    border-radius: 20px;
                    max-width: 700px;
                    width: 100%;
                    max-height: 80vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 25px 70px rgba(0,0,0,0.5);
                ">
                    <div style="
                        padding: 25px 30px;
                        background: linear-gradient(135deg, #4a7c59, #1e3a2e);
                        color: white;
                        border-radius: 20px 20px 0 0;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <h3 style="margin: 0; font-size: 22px; display: flex; align-items: center; gap: 12px;">
                            <i class="fas fa-bell"></i> 
                            Notificaciones (${data.total})
                        </h3>
                        <button onclick="closeNotificationsModal()" style="
                            background: rgba(255,255,255,0.2);
                            border: none;
                            width: 40px;
                            height: 40px;
                            border-radius: 50%;
                            font-size: 20px;
                            cursor: pointer;
                            color: white;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            transition: all 0.3s ease;
                        " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div style="
                        padding: 25px 30px;
                        overflow-y: auto;
                        flex: 1;
                    ">
                        ${data.notificaciones.length === 0 ? `
                            <div style="text-align: center; padding: 60px 20px; color: #6c757d;">
                                <i class="fas fa-bell-slash" style="font-size: 64px; margin-bottom: 20px; display: block; color: #cbd5e0;"></i>
                                <h4 style="margin-bottom: 10px;">No tienes notificaciones</h4>
                                <p>Cuando haya actividad nueva, aparecerá aquí</p>
                            </div>
                        ` : data.notificaciones.map(notif => `
                            <div style="
                                padding: 20px;
                                background: ${notif.leida ? '#f8f9fa' : '#e7f5ff'};
                                border-radius: 12px;
                                margin-bottom: 15px;
                                border-left: 4px solid ${notif.color || '#4a7c59'};
                                cursor: pointer;
                                transition: all 0.3s ease;
                            " onmouseover="this.style.transform='translateX(5px)'" onmouseout="this.style.transform='translateX(0)'" onclick="handleNotificationClick('${notif.id}', '${notif.link || ''}')">
                                <div style="display: flex; align-items: flex-start; gap: 15px;">
                                    <div style="
                                        width: 50px;
                                        height: 50px;
                                        background: ${notif.color || '#4a7c59'}20;
                                        border-radius: 50%;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        flex-shrink: 0;
                                    ">
                                        <i class="fas ${notif.icono || 'fa-bell'}" style="color: ${notif.color || '#4a7c59'}; font-size: 20px;"></i>
                                    </div>
                                    <div style="flex: 1;">
                                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                                            <strong style="color: #1e3a2e; font-size: 16px;">
                                                ${notif.titulo}
                                            </strong>
                                            <span style="color: #6c757d; font-size: 12px; white-space: nowrap; margin-left: 10px;">
                                                ${formatearTiempoTranscurrido(notif.fecha)}
                                            </span>
                                        </div>
                                        <p style="margin: 0; color: #495057; font-size: 14px; line-height: 1.5;">
                                            ${notif.mensaje}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            
            modal.style.display = 'flex';
        }
    } catch (error) {
        console.error('Error:', error);
        showStatusMessage('Error cargando notificaciones', 'error');
    }
};

window.closeNotificationsModal = function() {
    const modal = document.getElementById('notificationsModal');
    if (modal) modal.style.display = 'none';
};

window.showAllNotifications = function() {
    showNotifications();
};

// Modificar handleNotification existente para que sea compatible
const originalHandleNotification = window.handleNotification;
window.handleNotification = function(element) {
    if (originalHandleNotification) {
        originalHandleNotification(element);
    }
    
    // Recargar notificaciones después de interactuar
    setTimeout(() => {
        loadNotifications();
    }, 500);
};

// Agregar estilos para notificaciones
const notifStyle = document.createElement('style');
notifStyle.textContent = `
    .notification-item {
        padding: 15px;
        border-bottom: 1px solid #e9ecef;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
    }
    
    .notification-item:hover {
        background: #f8f9fa;
        transform: translateX(5px);
    }
    
    .notification-item.unread {
        background: #e7f5ff;
        border-left: 4px solid #3b82f6;
    }
    
    .notification-item.unread::before {
        content: '';
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        width: 8px;
        height: 8px;
        background: #3b82f6;
        border-radius: 50%;
    }
    
    .notification-title {
        font-weight: 700;
        color: #1e3a2e;
        margin-bottom: 5px;
        font-size: 14px;
    }
    
    .notification-text {
        color: #495057;
        font-size: 13px;
        line-height: 1.4;
        margin-bottom: 5px;
    }
    
    .notification-time {
        color: #6c757d;
        font-size: 11px;
    }
    
    .notification-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        background: #dc2626;
        color: white;
        border-radius: 50%;
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0%, 100% {
            transform: scale(1);
            opacity: 1;
        }
        50% {
            transform: scale(1.1);
            opacity: 0.9;
        }
    }
`;

document.head.appendChild(notifStyle);

// Llamar funciones al cargar
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (currentUser && currentUser.userId) {
            console.log('🔄 Cargando sistema de calificaciones y notificaciones...');
            loadUserRating();
            loadNotifications();
            
            // Actualizar notificaciones cada 2 minutos
            setInterval(loadNotifications, 120000);
            
            console.log('✅ Sistema de calificaciones y notificaciones cargado');
        }
    }, 2000);
});

// También cargar después de fetchUserSession
const originalFetchUserSession = window.fetchUserSession || fetchUserSession;
if (originalFetchUserSession) {
    window.fetchUserSession = async function() {
        const result = await originalFetchUserSession();
        
        // Cargar calificaciones y notificaciones después de obtener usuario
        setTimeout(() => {
            if (currentUser && currentUser.userId) {
                loadUserRating();
                loadNotifications();
            }
        }, 1000);
        
        return result;
    };
}

console.log('✅ Sistema de calificaciones y notificaciones para agricultor cargado');

// ================================================================
// CARGAR DATOS DEL USUARIO EN EL SIDEBAR
// ================================================================

async function actualizarSidebarPerfil() {
    try {
        console.log('📸 Actualizando sidebar con datos del usuario...');
        
        if (!currentUser || !currentUser.userId) {
            console.warn('⚠️ Usuario no cargado aún');
            return;
        }
        
        // Actualizar nombre
        const sidebarName = document.getElementById('sidebarProfileName');
        if (sidebarName) {
            const fullName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
            sidebarName.textContent = fullName || 'Agricultor';
        }
        
        // Actualizar avatar
        const sidebarAvatar = document.getElementById('sidebarProfileAvatar');
        if (sidebarAvatar) {
            if (currentUser.fotoUrl) {
                sidebarAvatar.innerHTML = `
                    <img src="${currentUser.fotoUrl}" 
                         alt="${currentUser.firstName}" 
                         style="width: 100%; height: 100%; object-fit: cover;"
                         onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\\'fas fa-user\\'></i>';">
                `;
            } else {
                // Usar iniciales si no hay foto
                const iniciales = getIniciales(currentUser.firstName, currentUser.lastName);
                sidebarAvatar.innerHTML = `<span style="font-size: 32px; font-weight: 700;">${iniciales}</span>`;
            }
        }
        
        console.log('✅ Sidebar actualizado correctamente');
        
    } catch (error) {
        console.error('❌ Error actualizando sidebar:', error);
    }
}

// Función auxiliar para obtener iniciales
function getIniciales(firstName, lastName) {
    let iniciales = '';
    
    if (firstName && firstName.trim()) {
        iniciales += firstName.trim().charAt(0).toUpperCase();
    }
    
    if (lastName && lastName.trim()) {
        iniciales += lastName.trim().charAt(0).toUpperCase();
    }
    
    return iniciales || 'AG';
}

// ================================================================
// MODIFICAR fetchUserSession PARA ACTUALIZAR EL SIDEBAR
// ================================================================

// Guardar la función original
const originalFetchUserSessionFunc = fetchUserSession;

// Sobrescribir con nueva funcionalidad
async function fetchUserSession() {
    try {
        const response = await fetch('/get_user_session', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.ok) {
            const data = await response.json();
            
            if (data.success && data.user) {
                currentUser = {
                    firstName: data.user.first_name,
                    lastName: data.user.last_name,
                    role: data.user.role,
                    email: data.user.email,
                    username: data.user.username,
                    userId: data.user.user_id,
                    telefono: data.user.telefono || '',
                    fotoUrl: data.user.url_foto || null,
                    isLoggedIn: true
                };

                console.log('✅ Usuario cargado:', currentUser);
                
                // Actualizar UI general
                updateUIWithUserData();
                updateProfilePhoto();
                
                // 🔥 ACTUALIZAR SIDEBAR
                setTimeout(() => {
                    actualizarSidebarPerfil();
                }, 500);
                
                // Cargar calificación y notificaciones
                setTimeout(() => {
                    if (currentUser && currentUser.userId) {
                        loadUserRating();
                        loadNotifications();
                    }
                }, 1000);
                
                return true;
            }
        }
        
        currentUser.isLoggedIn = true;
        updateUIWithUserData();
        
        // Actualizar sidebar con datos por defecto
        setTimeout(() => {
            actualizarSidebarPerfil();
        }, 500);
        
        return true;
        
    } catch (error) {
        console.error('Error conectando con servidor:', error);
        currentUser.isLoggedIn = true;
        updateUIWithUserData();
        
        // Actualizar sidebar con datos por defecto
        setTimeout(() => {
            actualizarSidebarPerfil();
        }, 500);
        
        return true;
    }
}

// ================================================================
// ACTUALIZAR AL CARGAR LA PÁGINA
// ================================================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🌱 Inicializando Dashboard Agricultor...');
    
    await verificarSesionActiva();
    setupEventListeners();
    await fetchUserSession();
    await cargarOfertasDelAgricultor();
    setTimeout(initMap, 500);
    
    // Actualizar sidebar después de cargar todo
    setTimeout(() => {
        actualizarSidebarPerfil();
    }, 2000);
    
    console.log('✅ Dashboard inicializado');
});

console.log('✅ Sistema de actualización del sidebar cargado');

// ================================================================
// FIX: VER PERFIL DESDE MAPA - VERSIÓN MEJORADA
// ================================================================

window.verPerfilTrabajadorDesdeMapa = async function(trabajadorId) {
    console.log('🎯 Ver perfil desde mapa - ID:', trabajadorId);
    
    // Validar ID
    if (!trabajadorId || isNaN(trabajadorId)) {
        console.error('❌ ID inválido:', trabajadorId);
        showStatusMessage('Error: ID de trabajador no válido', 'error');
        return;
    }
    
    // Cerrar popup del mapa
    if (map && map.closePopup) {
        map.closePopup();
    }
    
    try {
        showStatusMessage('Cargando perfil del trabajador...', 'info');
        
        // Hacer petición al servidor
        const response = await fetch(`/api/get_worker_profile/${trabajadorId}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📦 Datos recibidos:', data);
        
        if (data.success && data.worker) {
            // Mostrar perfil en el modal
            mostrarPerfilTrabajador(data.worker);
            showStatusMessage('✅ Perfil cargado correctamente', 'success');
        } else {
            throw new Error(data.message || 'No se pudo cargar el perfil');
        }
        
    } catch (error) {
        console.error('❌ Error completo:', error);
        showStatusMessage('❌ Error al cargar perfil: ' + error.message, 'error');
        
        // Mostrar modal de error
        mostrarModalError('No se pudo cargar el perfil del trabajador. Por favor, intenta de nuevo.');
    }
};

// Función auxiliar para mostrar error
function mostrarModalError(mensaje) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(8px);
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 20px;
            padding: 35px;
            max-width: 450px;
            width: 90%;
            text-align: center;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
        ">
            <div style="
                width: 70px;
                height: 70px;
                background: linear-gradient(135deg, #ef4444, #dc2626);
                border-radius: 50%;
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 32px;
            ">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            
            <h2 style="color: #1e3a2e; font-size: 22px; font-weight: 700; margin-bottom: 12px;">
                Error al Cargar Perfil
            </h2>
            
            <p style="color: #4a7c59; font-size: 15px; margin-bottom: 25px;">
                ${mensaje}
            </p>
            
            <button onclick="this.parentElement.parentElement.remove()" style="
                padding: 12px 32px;
                background: linear-gradient(135deg, #4a7c59, #1e3a2e);
                color: white;
                border: none;
                border-radius: 12px;
                font-weight: 600;
                cursor: pointer;
                font-size: 15px;
                box-shadow: 0 4px 15px rgba(74, 124, 89, 0.3);
            ">
                <i class="fas fa-check"></i> Entendido
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-cerrar después de 5 segundos
    setTimeout(() => {
        if (document.body.contains(modal)) {
            modal.remove();
        }
    }, 5000);
}

console.log('✅ Fix de perfil desde mapa cargado');