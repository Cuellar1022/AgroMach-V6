// ============================================================
// HISTORIAL-CONTRATACIONES.JS - VERSIÓN DEFINITIVA UNIFICADA
// Sistema completo de gestión de contrataciones con calificaciones
// ============================================================

// ============================================================
// VARIABLES GLOBALES
// ============================================================
let contratacionesData = [];
let currentPage = 1;
const itemsPerPage = 5;
let filteredData = [];
let calificacionSeleccionada = 0;

// ============================================================
// CARGAR HISTORIAL DESDE EL SERVIDOR (CON DIAGNÓSTICO)
// ============================================================
async function loadHistorialFromServer() {
    console.log('🔄 Cargando historial de contrataciones...');
    console.log('📍 URL actual:', window.location.href);
    
    // Lista de rutas posibles a intentar
    const rutasAPI = [
        '/api/historial_contrataciones_agricultor_v2',
        '/api/historial_contrataciones_agricultor',
        '/api/contrataciones/historial',
        '/api/agricultor/contrataciones'
    ];
    
    for (const ruta of rutasAPI) {
        try {
            console.log(`🔍 Intentando ruta: ${ruta}`);
            
            const response = await fetch(ruta, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            console.log(`📡 Response status para ${ruta}:`, response.status);
            
            if (!response.ok) {
                console.warn(`⚠️ Ruta ${ruta} falló con status ${response.status}`);
                continue;
            }
            
            const contentType = response.headers.get('content-type');
            console.log('📄 Content-Type:', contentType);
            
            if (!contentType || !contentType.includes('application/json')) {
                console.warn(`⚠️ Respuesta no es JSON en ${ruta}`);
                const text = await response.text();
                console.log('📝 Respuesta como texto:', text.substring(0, 200));
                continue;
            }
            
            const data = await response.json();
            console.log('📦 Datos JSON recibidos:', data);
            console.log('📊 Estructura de datos:', {
                hasSuccess: 'success' in data,
                successValue: data.success,
                hasContrataciones: 'contrataciones' in data,
                contratacionesType: typeof data.contrataciones,
                contratacionesLength: data.contrataciones?.length,
                firstItem: data.contrataciones?.[0]
            });
            
            if (data.success === true || data.success === 'true') {
                if (data.contrataciones && Array.isArray(data.contrataciones)) {
                    if (data.contrataciones.length > 0) {
                        contratacionesData = data.contrataciones;
                        filteredData = [...contratacionesData];
                        renderHistorial();
                        updateStats();
                        console.log(`✅ ${contratacionesData.length} contrataciones cargadas exitosamente desde ${ruta}`);
                        return; // Éxito - salir de la función
                    } else {
                        console.log('⚠️ Array de contrataciones está vacío');
                        showNoData();
                        updateStatsEmpty();
                        return; // Array vacío pero respuesta válida
                    }
                } else {
                    console.warn('⚠️ data.contrataciones no es un array válido:', data.contrataciones);
                }
            } else {
                console.warn('⚠️ success=false en respuesta:', data.message || data.error);
            }
            
        } catch (error) {
            console.error(`❌ Error con ruta ${ruta}:`, error);
            console.error('Stack trace:', error.stack);
        }
    }
    
    // Si llegamos aquí, ninguna ruta funcionó
    console.error('❌ NINGUNA RUTA API FUNCIONÓ');
    console.log('💡 Posibles soluciones:');
    console.log('   1. Verificar que el backend esté corriendo');
    console.log('   2. Verificar la sesión del usuario (¿estás autenticado?)');
    console.log('   3. Verificar las rutas del backend en el servidor');
    console.log('   4. Revisar los logs del servidor backend');
    
    showNoData();
    updateStatsEmpty();
}

// ============================================================
// RENDERIZAR HISTORIAL
// ============================================================
function renderHistorial() {
    const container = document.getElementById('historialList');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);

    if (pageData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users-cog"></i>
                <h3>No se encontraron contrataciones</h3>
                <p>No hay contrataciones que coincidan con los filtros seleccionados.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = pageData.map(contratacion => {
        // Normalizar campos (pueden venir con diferentes nombres)
        const idAcuerdo = contratacion.id_acuerdo || contratacion.ID_Acuerdo || null;
        const idTrabajador = contratacion.id_trabajador || contratacion.ID_Trabajador || null;
        const nombreTrabajador = (contratacion.nombre_trabajador || 'Sin nombre').replace(/'/g, "\\'");
        const tituloOferta = contratacion.titulo_oferta || 'Sin título';
        const estado = contratacion.estado || contratacion.Estado || 'Activo';
        const telefono = contratacion.telefono_trabajador || 'Sin teléfono';
        const pagoFinal = contratacion.pago_final || 0;
        const calificacionDada = contratacion.calificacion_dada || contratacion.Calificacion || null;
        const foto = contratacion.url_foto_trabajador || contratacion.foto_trabajador;
        
        // Determinar si puede calificar
        const esFinalizado = estado === 'Finalizado' || estado === 'Completado';
        const yaCalificado = calificacionDada !== null && calificacionDada !== undefined;
        const puedeCalificar = esFinalizado && !yaCalificado && idAcuerdo && idTrabajador;
        
        return `
        <div class="contratacion-card">
            <div class="contratacion-header">
                <div class="trabajador-info">
                    <div class="trabajador-avatar">
                        ${foto ? 
                            `<img src="${foto}" alt="${contratacion.nombre_trabajador || 'Trabajador'}" style="width: 100%; height: 100%; object-fit: cover;">` :
                            `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #4a7c59, #1e3a2e); color: white; font-weight: bold; font-size: 18px;">${getInitials(contratacion.nombre_trabajador || 'Sin nombre')}</div>`
                        }
                    </div>
                    <div class="trabajador-datos">
                        <h3>${contratacion.nombre_trabajador || 'Sin nombre'}</h3>
                        <p>
                            <i class="fas fa-briefcase"></i>
                            ${tituloOferta}
                        </p>
                    </div>
                </div>
                <div class="contratacion-status status-${estado.toLowerCase()}">
                    ${getStatusIcon(estado)}
                    ${estado}
                </div>
            </div>

            <div class="contratacion-details">
                <div class="detail-item">
                    <i class="fas fa-calendar-alt"></i>
                    <span>${formatDateRange(contratacion.fecha_inicio, contratacion.fecha_fin)}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span>${calculateDuration(contratacion.fecha_inicio, contratacion.fecha_fin)}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-dollar-sign"></i>
                    <span>${formatCurrency(pagoFinal)}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-phone"></i>
                    <span>${telefono}</span>
                </div>
            </div>

            ${yaCalificado ? `
                <div class="contratacion-rating">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div class="trabajador-mini-avatar" style="width: 50px; height: 50px; border-radius: 50%; overflow: hidden; border: 3px solid #ffc107; flex-shrink: 0;">
                            ${foto ? 
                                `<img src="${foto}" alt="${contratacion.nombre_trabajador || 'Trabajador'}" style="width: 100%; height: 100%; object-fit: cover;">` :
                                `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #4a7c59, #1e3a2e); color: white; font-weight: bold; font-size: 16px;">${getInitials(contratacion.nombre_trabajador || 'Sin nombre')}</div>`
                            }
                        </div>
                        <div style="flex: 1;">
                            <span style="color: #666; font-weight: 600; font-size: 13px;">Tu calificación a ${contratacion.nombre_trabajador || 'trabajador'}:</span>
                            <div class="rating-stars" style="margin-top: 5px;">
                                ${generateStars(calificacionDada)}
                            </div>
                        </div>
                        <span class="rating-value">${calificacionDada}.0</span>
                    </div>
                </div>
            ` : ''}

            <div class="contratacion-footer">
                <div class="contratacion-actions">
                    <button class="btn-detail" onclick="showContratacionDetails(${contratacion.id || contratacion.ID_Acuerdo || 0})">
                        <i class="fas fa-eye"></i> Ver Detalles
                    </button>
                    
                    ${puedeCalificar ? `
                        <button class="btn-calificar" onclick="abrirModalCalificarTrabajador(${idAcuerdo}, ${idTrabajador}, '${nombreTrabajador}')">
                            <i class="fas fa-star"></i> Calificar Trabajador
                        </button>
                    ` : ''}
                    
                    ${yaCalificado && esFinalizado ? `
                        <div style="padding: 10px 20px; background: #e8f5e9; color: #2e7d32; border-radius: 8px; font-weight: 600; display: inline-flex; align-items: center; gap: 8px;">
                            <i class="fas fa-check-circle"></i> Ya calificado
                        </div>
                    ` : ''}
                    
                    <button class="btn-contactar" onclick="contactarTrabajador('${telefono}', '${nombreTrabajador}')">
                        <i class="fas fa-phone"></i> Contactar
                    </button>
                </div>
            </div>
        </div>
    `;
    }).join('');

    updatePagination();
}

// ============================================================
// SISTEMA DE CALIFICACIONES - MODAL
// ============================================================
function abrirModalCalificarTrabajador(acuerdoId, trabajadorId, nombreTrabajador) {
    const modal = document.createElement('div');
    modal.id = 'modalCalificarTrabajador';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 20px; padding: 40px; max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: slideIn 0.3s; position: relative;">
            <button onclick="cerrarModalCalificarTrabajador()" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 28px; cursor: pointer; color: #999; transition: color 0.3s;" onmouseover="this.style.color='#333'" onmouseout="this.style.color='#999'">
                <i class="fas fa-times"></i>
            </button>
            
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, #ffc107, #ff9800); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-star" style="font-size: 40px; color: white;"></i>
                </div>
                <h2 style="color: #1e3a2e; margin: 0 0 10px 0; font-size: 24px;">Calificar a ${nombreTrabajador}</h2>
                <p style="color: #666; font-size: 15px;">¿Cómo fue el desempeño del trabajador?</p>
            </div>
            
            <div id="estrellasTrabajador" style="display: flex; justify-content: center; gap: 15px; font-size: 56px; margin: 30px 0; cursor: pointer;">
                ${[1,2,3,4,5].map(i => `
                    <i class="far fa-star" data-rating="${i}" 
                       onmouseover="pintarEstrellasTrabajador(${i})" 
                       onmouseout="restaurarEstrellasTrabajador()"
                       onclick="seleccionarCalificacionTrabajador(${i})"
                       style="color: #ddd; transition: all 0.2s; cursor: pointer;">
                    </i>
                `).join('')}
            </div>
            
            <div style="text-align: center; margin-bottom: 25px; min-height: 30px;">
                <span id="textoCalificacionTrabajador" style="font-size: 20px; font-weight: 600; color: #6c757d;">
                    Selecciona una calificación
                </span>
            </div>
            
            <textarea 
                id="comentarioCalificacionTrabajador" 
                placeholder="Cuéntanos sobre el desempeño del trabajador (opcional)..."
                style="width: 100%; min-height: 120px; padding: 15px; border: 2px solid #e9ecef; border-radius: 12px; font-size: 15px; resize: vertical; font-family: inherit; margin-bottom: 25px; transition: border-color 0.3s;"
                onfocus="this.style.borderColor='#ffc107'"
                onblur="this.style.borderColor='#e9ecef'">
            </textarea>
            
            <button 
                onclick="enviarCalificacionTrabajador(${acuerdoId}, ${trabajadorId})"
                style="width: 100%; padding: 18px; background: linear-gradient(135deg, #4a7c59, #1e3a2e); color: white; border: none; border-radius: 12px; font-weight: 700; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; transition: all 0.3s;"
                onmouseover="this.style.transform='scale(1.02)'"
                onmouseout="this.style.transform='scale(1)'">
                <i class="fas fa-paper-plane"></i> Enviar Calificación
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    calificacionSeleccionada = 0;
    
    // Cerrar con ESC
    document.addEventListener('keydown', cerrarConEscape);
    
    // Cerrar al hacer clic fuera
    modal.addEventListener('click', function(e) {
        if (e.target.id === 'modalCalificarTrabajador') {
            cerrarModalCalificarTrabajador();
        }
    });
}

function pintarEstrellasTrabajador(rating) {
    const estrellas = document.querySelectorAll('#estrellasTrabajador i');
    estrellas.forEach((estrella, idx) => {
        if (idx < rating) {
            estrella.style.color = '#ffc107';
            estrella.classList.remove('far');
            estrella.classList.add('fas');
        } else {
            if (!estrella.classList.contains('seleccionada')) {
                estrella.style.color = '#ddd';
                estrella.classList.remove('fas');
                estrella.classList.add('far');
            }
        }
    });
}

function restaurarEstrellasTrabajador() {
    if (calificacionSeleccionada === 0) {
        const estrellas = document.querySelectorAll('#estrellasTrabajador i');
        estrellas.forEach(estrella => {
            if (!estrella.classList.contains('seleccionada')) {
                estrella.style.color = '#ddd';
                estrella.classList.remove('fas');
                estrella.classList.add('far');
            }
        });
    }
}

function seleccionarCalificacionTrabajador(rating) {
    calificacionSeleccionada = rating;
    const estrellas = document.querySelectorAll('#estrellasTrabajador i');
    
    estrellas.forEach((estrella, idx) => {
        if (idx < rating) {
            estrella.classList.add('seleccionada');
            estrella.style.color = '#ffc107';
            estrella.classList.remove('far');
            estrella.classList.add('fas');
            estrella.style.transform = 'scale(1.2)';
            setTimeout(() => estrella.style.transform = 'scale(1)', 200);
        } else {
            estrella.classList.remove('seleccionada');
            estrella.style.color = '#ddd';
            estrella.classList.remove('fas');
            estrella.classList.add('far');
        }
    });
    
    const textos = {
        1: '😞 Muy insatisfecho',
        2: '😕 Insatisfecho',
        3: '😐 Normal',
        4: '😊 Satisfecho',
        5: '😄 Muy satisfecho'
    };
    
    const textoElement = document.getElementById('textoCalificacionTrabajador');
    textoElement.textContent = textos[rating];
    textoElement.style.color = '#1e3a2e';
    textoElement.style.fontSize = '22px';
}

async function enviarCalificacionTrabajador(acuerdoId, trabajadorId) {
    if (calificacionSeleccionada === 0) {
        alert('⚠️ Por favor selecciona una calificación');
        return;
    }
    
    const comentario = document.getElementById('comentarioCalificacionTrabajador').value.trim();
    
    try {
        const response = await fetch('/api/submit_new_rating', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                acuerdo_id: acuerdoId,
                receptor_id: trabajadorId,
                puntuacion: calificacionSeleccionada,
                comentario: comentario
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ ¡Calificación enviada exitosamente!');
            cerrarModalCalificarTrabajador();
            loadHistorialFromServer();
        } else {
            alert('❌ Error: ' + data.message);
        }
    } catch (error) {
        console.error('❌ Error:', error);
        alert('❌ Error al enviar la calificación');
    }
}

function cerrarModalCalificarTrabajador() {
    const modal = document.getElementById('modalCalificarTrabajador');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => modal.remove(), 300);
    }
    calificacionSeleccionada = 0;
    document.removeEventListener('keydown', cerrarConEscape);
}

function cerrarConEscape(e) {
    if (e.key === 'Escape') {
        cerrarModalCalificarTrabajador();
    }
}

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================
function getInitials(nombre) {
    if (!nombre) return '??';
    const words = nombre.trim().split(' ');
    return words.map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase();
}

function getStatusIcon(estado) {
    const icons = {
        'Activo': '<i class="fas fa-clock"></i>',
        'Finalizado': '<i class="fas fa-check-circle"></i>',
        'Completado': '<i class="fas fa-check-circle"></i>',
        'Cancelado': '<i class="fas fa-times-circle"></i>'
    };
    return icons[estado] || '<i class="fas fa-question-circle"></i>';
}

function formatDateRange(inicio, fin) {
    if (!inicio) return 'Sin fecha';
    
    const fechaInicio = new Date(inicio).toLocaleDateString('es-ES', { 
        year: 'numeric', month: 'short', day: 'numeric' 
    });
    
    if (!fin) return `${fechaInicio} - Activo`;
    
    const fechaFin = new Date(fin).toLocaleDateString('es-ES', { 
        year: 'numeric', month: 'short', day: 'numeric' 
    });
    return `${fechaInicio} - ${fechaFin}`;
}

function calculateDuration(inicio, fin) {
    if (!inicio) return 'Sin duración';
    
    const start = new Date(inicio);
    const end = fin ? new Date(fin) : new Date();
    const days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} días` : '1 día';
}

function formatCurrency(amount) {
    if (!amount || amount === 0) return 'Por definir';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(amount);
}

function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += i <= rating ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
    }
    return stars;
}

// ============================================================
// ESTADÍSTICAS
// ============================================================
function updateStats() {
    const total = contratacionesData.length;
    const activas = contratacionesData.filter(c => c.estado === 'Activo').length;
    
    const calificaciones = contratacionesData.filter(c => c.calificacion_dada);
    const promedio = calificaciones.length > 0 
        ? calificaciones.reduce((sum, c) => sum + c.calificacion_dada, 0) / calificaciones.length 
        : 0;
    
    const totalInvertido = contratacionesData
        .filter(c => c.pago_final)
        .reduce((total, c) => total + (c.pago_final || 0), 0);

    document.getElementById('totalContrataciones').textContent = total;
    document.getElementById('contratacionesActivas').textContent = activas;
    document.getElementById('calificacionPromedio').textContent = promedio.toFixed(1);
    document.getElementById('totalInvertido').textContent = formatCurrency(totalInvertido);
}

function updateStatsEmpty() {
    document.getElementById('totalContrataciones').textContent = '0';
    document.getElementById('contratacionesActivas').textContent = '0';
    document.getElementById('calificacionPromedio').textContent = '0.0';
    document.getElementById('totalInvertido').textContent = '$0';
}

// ============================================================
// MODAL DE DETALLES
// ============================================================
function showContratacionDetails(contratacionId) {
    const contratacion = contratacionesData.find(c => 
        (c.id || c.ID_Acuerdo) === contratacionId
    );
    
    if (!contratacion) {
        alert('No se encontró la contratación');
        return;
    }

    const modal = document.getElementById('detalleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.textContent = `Contratación: ${contratacion.nombre_trabajador || 'Sin nombre'}`;
    
    modalBody.innerHTML = `
        <div style="padding: 20px;">
            <!-- Información del Trabajador -->
            <div style="margin-bottom: 25px;">
                <h4 style="color: var(--primary-dark); margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-user"></i> Información del Trabajador
                </h4>
                <div style="display: grid; gap: 12px;">
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(144, 238, 144, 0.1); border-radius: 8px;">
                        <span style="color: #666; font-weight: 600;">Nombre:</span>
                        <span style="color: var(--primary-dark); font-weight: 700;">${contratacion.nombre_trabajador || 'N/A'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(144, 238, 144, 0.1); border-radius: 8px;">
                        <span style="color: #666; font-weight: 600;">Teléfono:</span>
                        <span style="color: var(--primary-dark); font-weight: 700;">${contratacion.telefono_trabajador || 'N/A'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(144, 238, 144, 0.1); border-radius: 8px;">
                        <span style="color: #666; font-weight: 600;">Email:</span>
                        <span style="color: var(--primary-dark); font-weight: 700;">${contratacion.email_trabajador || 'N/A'}</span>
                    </div>
                </div>
            </div>

            <!-- Información del Trabajo -->
            <div style="margin-bottom: 25px;">
                <h4 style="color: var(--primary-dark); margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-briefcase"></i> Detalles del Trabajo
                </h4>
                <div style="display: grid; gap: 12px;">
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(144, 238, 144, 0.1); border-radius: 8px;">
                        <span style="color: #666; font-weight: 600;">Oferta:</span>
                        <span style="color: var(--primary-dark); font-weight: 700;">${contratacion.titulo_oferta || 'N/A'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(144, 238, 144, 0.1); border-radius: 8px;">
                        <span style="color: #666; font-weight: 600;">Estado:</span>
                        <span class="contratacion-status status-${(contratacion.estado || 'activo').toLowerCase()}">${contratacion.estado || 'Activo'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(144, 238, 144, 0.1); border-radius: 8px;">
                        <span style="color: #666; font-weight: 600;">Duración:</span>
                        <span style="color: var(--primary-dark); font-weight: 700;">${calculateDuration(contratacion.fecha_inicio, contratacion.fecha_fin)}</span>
                    </div>
                </div>
            </div>

            <!-- Fechas -->
            <div style="margin-bottom: 25px;">
                <h4 style="color: var(--primary-dark); margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-calendar-alt"></i> Fechas
                </h4>
                <div style="display: grid; gap: 12px;">
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(144, 238, 144, 0.1); border-radius: 8px;">
                        <span style="color: #666; font-weight: 600;">Inicio:</span>
                        <span style="color: var(--primary-dark); font-weight: 700;">${contratacion.fecha_inicio ? new Date(contratacion.fecha_inicio).toLocaleDateString('es-ES', {year: 'numeric', month: 'long', day: 'numeric'}) : 'N/A'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(144, 238, 144, 0.1); border-radius: 8px;">
                        <span style="color: #666; font-weight: 600;">Finalización:</span>
                        <span style="color: var(--primary-dark); font-weight: 700;">${contratacion.fecha_fin ? new Date(contratacion.fecha_fin).toLocaleDateString('es-ES', {year: 'numeric', month: 'long', day: 'numeric'}) : 'En curso'}</span>
                    </div>
                </div>
            </div>

            <!-- Pago -->
            <div style="margin-bottom: 25px;">
                <h4 style="color: var(--primary-dark); margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-dollar-sign"></i> Información de Pago
                </h4>
                <div style="padding: 20px; background: linear-gradient(135deg, #4a7c59, #1e3a2e); border-radius: 12px; text-align: center;">
                    <div style="font-size: 32px; font-weight: 800; color: white;">${formatCurrency(contratacion.pago_final)}</div>
                    <div style="color: rgba(255,255,255,0.8); margin-top: 5px;">Pago acordado</div>
                </div>
            </div>

            ${contratacion.calificacion_dada ? `
                <div style="margin-bottom: 25px;">
                    <h4 style="color: var(--primary-dark); margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-star"></i> Tu Calificación
                    </h4>
                    <div style="padding: 20px; background: rgba(144, 238, 144, 0.1); border-radius: 12px;">
                        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                            <div style="width: 60px; height: 60px; border-radius: 50%; overflow: hidden; border: 3px solid #ffc107; flex-shrink: 0;">
                                ${contratacion.foto_trabajador ? 
                                    `<img src="${contratacion.foto_trabajador}" alt="${contratacion.nombre_trabajador}" style="width: 100%; height: 100%; object-fit: cover;">` :
                                    `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #4a7c59, #1e3a2e); color: white; font-weight: bold; font-size: 20px;">${getInitials(contratacion.nombre_trabajador)}</div>`
                                }
                            </div>
                            <div>
                                <div style="color: #666; font-size: 14px; margin-bottom: 5px;">Calificaste a</div>
                                <div style="color: var(--primary-dark); font-weight: 700; font-size: 16px;">${contratacion.nombre_trabajador}</div>
                            </div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 10px;">
                                ${generateStars(contratacion.calificacion_dada)}
                            </div>
                            <div style="font-size: 24px; font-weight: 700; color: var(--primary-dark); margin-bottom: 10px;">
                                ${contratacion.calificacion_dada}.0/5.0
                            </div>
                            ${contratacion.comentario_calificacion ? `
                                <div style="padding: 15px; background: white; border-radius: 8px; margin-top: 15px; text-align: left;">
                                    <p style="color: #666; font-style: italic;">"${contratacion.comentario_calificacion}"</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    modal.classList.add('show');
}

function closeModal() {
    const modal = document.getElementById('detalleModal');
    modal.classList.remove('show');
}

// ============================================================
// CONTACTAR TRABAJADOR
// ============================================================
function contactarTrabajador(telefono, nombre) {
    if (confirm(`¿Deseas contactar a ${nombre}?\n\nTeléfono: ${telefono}`)) {
        const telefonoLimpio = telefono.replace(/\D/g, '');
        window.open(`https://wa.me/57${telefonoLimpio}`, '_blank');
    }
}

// ============================================================
// FILTROS Y BÚSQUEDA
// ============================================================
function setupFilters() {
    document.getElementById('searchHistorial').addEventListener('input', applyFilters);
    document.getElementById('estadoFilter').addEventListener('change', applyFilters);
    document.getElementById('fechaFilter').addEventListener('change', applyFilters);
    document.getElementById('calificacionFilter').addEventListener('change', applyFilters);
}

function applyFilters() {
    const searchTerm = document.getElementById('searchHistorial').value.toLowerCase();
    const estadoFilter = document.getElementById('estadoFilter').value;
    const fechaFilter = document.getElementById('fechaFilter').value;
    const calificacionFilter = document.getElementById('calificacionFilter').value;

    filteredData = contratacionesData.filter(contratacion => {
        const matchesSearch = !searchTerm || 
            (contratacion.nombre_trabajador && contratacion.nombre_trabajador.toLowerCase().includes(searchTerm)) ||
            (contratacion.titulo_oferta && contratacion.titulo_oferta.toLowerCase().includes(searchTerm));

        const matchesEstado = !estadoFilter || contratacion.estado === estadoFilter;
        const matchesCalificacion = !calificacionFilter || contratacion.calificacion_dada == calificacionFilter;

        return matchesSearch && matchesEstado && matchesCalificacion;
    });

    if (fechaFilter) {
        filteredData.sort((a, b) => {
            const fechaA = new Date(a.fecha_inicio || 0);
            const fechaB = new Date(b.fecha_inicio || 0);
            return fechaFilter === 'desc' ? fechaB - fechaA : fechaA - fechaB;
        });
    }

    currentPage = 1;
    renderHistorial();
}

// ============================================================
// PAGINACIÓN
// ============================================================
function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
    const paginationInfo = document.querySelector('.pagination-info');
    const prevBtn = document.querySelectorAll('.pagination-btn')[0];
    const nextBtn = document.querySelectorAll('.pagination-btn')[1];

    if (paginationInfo) paginationInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    
    if (prevBtn) {
        prevBtn.style.opacity = currentPage === 1 ? '0.5' : '1';
        prevBtn.style.pointerEvents = currentPage === 1 ? 'none' : 'auto';
    }
    
    if (nextBtn) {
        nextBtn.style.opacity = currentPage === totalPages ? '0.5' : '1';
        nextBtn.style.pointerEvents = currentPage === totalPages ? 'none' : 'auto';
    }
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        renderHistorial();
        window.scrollTo(0, 0);
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderHistorial();
        window.scrollTo(0, 0);
    }
}

// ============================================================
// EXPORTAR A PDF
// ============================================================
function exportToPDF() {
    if (contratacionesData.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    const total = contratacionesData.length;
    const activas = contratacionesData.filter(c => c.estado === 'Activo').length;
    
    const calificaciones = contratacionesData.filter(c => c.calificacion_dada);
    const promedio = calificaciones.length > 0 
        ? (calificaciones.reduce((sum, c) => sum + c.calificacion_dada, 0) / calificaciones.length).toFixed(1)
        : '0.0';
    
    const totalInvertido = contratacionesData
        .filter(c => c.pago_final)
        .reduce((total, c) => total + (c.pago_final || 0), 0);

    const printWindow = window.open('', '_blank');
    
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Historial de Contrataciones - AgroMatch</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #4a7c59; padding-bottom: 20px; }
                .header h1 { color: #1e3a2e; font-size: 28px; margin-bottom: 10px; }
                .fecha-generacion { color: #666; font-size: 14px; }
                .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
                .stat-box { background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; border: 2px solid #90EE90; }
                .stat-number { font-size: 24px; font-weight: bold; color: #1e3a2e; margin-bottom: 5px; }
                .stat-label { font-size: 12px; color: #666; }
                .contrataciones-list { margin-top: 30px; }
                .contratacion-item { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px; page-break-inside: avoid; }
                .contratacion-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #90EE90; }
                .trabajador-name { font-size: 18px; font-weight: bold; color: #1e3a2e; }
                .contratacion-status { padding: 5px 15px; border-radius: 15px; font-size: 12px; font-weight: bold; }
                .status-activo { background: #90EE90; color: #1e3a2e; }
                .status-finalizado, .status-completado { background: #4a7c59; color: #fff; }
                .status-cancelado { background: #F44336; color: #fff; }
                .contratacion-details { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px; }
                .detail-row { font-size: 14px; color: #666; }
                .detail-label { font-weight: bold; color: #333; }
                .contratacion-rating { background: #f9f9f9; padding: 10px; border-radius: 5px; text-align: center; margin-top: 10px; }
                .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ddd; text-align: center; color: #666; font-size: 12px; }
                @media print { body { padding: 20px; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>👥 HISTORIAL DE CONTRATACIONES - AGROMATCH</h1>
                <p class="fecha-generacion">Generado el: ${new Date().toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}</p>
            </div>
            
            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-number">${total}</div>
                    <div class="stat-label">Total Contrataciones</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">${activas}</div>
                    <div class="stat-label">Contrataciones Activas</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">${promedio}</div>
                    <div class="stat-label">Calificación Promedio</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">${formatCurrency(totalInvertido)}</div>
                    <div class="stat-label">Total Invertido</div>
                </div>
            </div>
            
            <div class="contrataciones-list">
                <h2 style="margin-bottom: 20px; color: #1e3a2e;">Listado de Contrataciones</h2>
                ${contratacionesData.map((contratacion, index) => `
                    <div class="contratacion-item">
                        <div class="contratacion-header">
                            <div>
                                <div class="trabajador-name">${index + 1}. ${contratacion.nombre_trabajador || 'Sin nombre'}</div>
                                <div style="color: #666; font-size: 14px; margin-top: 5px;">
                                    📋 ${contratacion.titulo_oferta || 'Sin título'}
                                </div>
                            </div>
                            <div class="contratacion-status status-${(contratacion.estado || 'activo').toLowerCase()}">
                                ${contratacion.estado || 'Activo'}
                            </div>
                        </div>
                        
                        <div class="contratacion-details">
                            <div class="detail-row">
                                <span class="detail-label">📧 Email:</span> 
                                ${contratacion.email_trabajador || 'N/A'}
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">📱 Teléfono:</span> 
                                ${contratacion.telefono_trabajador || 'N/A'}
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">📅 Fecha inicio:</span> 
                                ${contratacion.fecha_inicio ? new Date(contratacion.fecha_inicio).toLocaleDateString('es-ES') : 'N/A'}
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">📅 Fecha fin:</span> 
                                ${contratacion.fecha_fin ? new Date(contratacion.fecha_fin).toLocaleDateString('es-ES') : 'En curso'}
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">⏱️ Duración:</span> 
                                ${calculateDuration(contratacion.fecha_inicio, contratacion.fecha_fin)}
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">💰 Pago:</span> 
                                ${formatCurrency(contratacion.pago_final)}
                            </div>
                        </div>
                        
                        ${contratacion.calificacion_dada ? `
                            <div class="contratacion-rating">
                                <strong>Tu Calificación:</strong> ${'⭐'.repeat(contratacion.calificacion_dada)} (${contratacion.calificacion_dada}/5)
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            
            <div class="footer">
                <p><strong>AgroMatch</strong> - Plataforma de Conexión Laboral Agrícola</p>
                <p>Reporte de Contrataciones - Este documento fue generado automáticamente</p>
            </div>
            
            <script>
                window.onload = function() {
                    setTimeout(() => {
                        window.print();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
}

// ============================================================
// HERRAMIENTA DE DIAGNÓSTICO
// ============================================================
async function runDiagnostico() {
    alert('Abriendo consola de diagnóstico. Revisa la consola del navegador (F12) para ver los detalles.');
    console.clear();
    console.log('🔬 DIAGNÓSTICO DEL SISTEMA - HISTORIAL DE CONTRATACIONES');
    console.log('═'.repeat(60));
    
    // 1. Verificar sesión
    console.log('\n1️⃣ VERIFICANDO SESIÓN DE USUARIO...');
    try {
        const sessionCheck = await fetch('/api/check_session', { credentials: 'include' });
        const sessionData = await sessionCheck.json();
        console.log('✓ Sesión:', sessionData);
    } catch (e) {
        console.error('✗ Error verificando sesión:', e);
    }
    
    // 2. Intentar todas las rutas posibles
    console.log('\n2️⃣ PROBANDO TODAS LAS RUTAS API...');
    const rutas = [
        '/api/historial_contrataciones_agricultor_v2',
        '/api/historial_contrataciones_agricultor',
        '/api/contrataciones/historial',
        '/api/agricultor/contrataciones',
        '/api/ofertas/mis_contrataciones'
    ];
    
    for (const ruta of rutas) {
        try {
            console.log(`\n   Probando: ${ruta}`);
            const res = await fetch(ruta, { credentials: 'include' });
            console.log(`   Status: ${res.status}`);
            
            if (res.ok) {
                const data = await res.json();
                console.log(`   ✓ Respuesta:`, data);
            } else {
                const text = await res.text();
                console.log(`   ✗ Error: ${text.substring(0, 100)}`);
            }
        } catch (e) {
            console.log(`   ✗ Excepción:`, e.message);
        }
    }
    
    // 3. Verificar ofertas activas
    console.log('\n3️⃣ VERIFICANDO OFERTAS ACTIVAS...');
    try {
        const ofertasRes = await fetch('/api/mis_ofertas', { credentials: 'include' });
        if (ofertasRes.ok) {
            const ofertasData = await ofertasRes.json();
            console.log('✓ Ofertas:', ofertasData);
        }
    } catch (e) {
        console.error('✗ Error:', e);
    }
    
    console.log('\n═'.repeat(60));
    console.log('🔬 DIAGNÓSTICO COMPLETADO');
    console.log('Copia esta información y compártela para recibir ayuda');
    console.log('═'.repeat(60));
}

// ============================================================
// FUNCIONES DE NAVEGACIÓN Y UTILIDAD
// ============================================================
function goBack() {
    window.location.href = 'index-agricultor.html';
}

function showNoData() {
    const container = document.getElementById('historialList');
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users-cog"></i>
                <h3>No tienes contrataciones registradas</h3>
                <p>Cuando contrates trabajadores, aparecerán aquí.</p>
                <button onclick="runDiagnostico()" style="margin-top: 20px; padding: 12px 24px; background: linear-gradient(135deg, #4a7c59, #1e3a2e); color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 600;">
                    🔍 Ejecutar Diagnóstico
                </button>
            </div>
        `;
    }
}

// ============================================================
// EVENT LISTENERS GLOBALES
// ============================================================

// Cerrar modal con ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Cerrar modal al hacer clic fuera
document.getElementById('detalleModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'detalleModal') closeModal();
});

// ============================================================
// ESTILOS DINÁMICOS
// ============================================================
if (!document.getElementById('calificacion-animations')) {
    const style = document.createElement('style');
    style.id = 'calificacion-animations';
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideIn {
            from { transform: scale(0.9) translateY(-30px); opacity: 0; }
            to { transform: scale(1) translateY(0); opacity: 1; }
        }
        
        .btn-calificar {
            background: #ffc107 !important;
            color: #1e3a2e !important;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 700;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s;
        }
        
        .btn-calificar:hover {
            background: #ffb300 !important;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(255, 193, 7, 0.4);
        }
        
        #estrellasTrabajador i:hover {
            transform: scale(1.15);
        }
    `;
    document.head.appendChild(style);
}

// ============================================================
// INICIALIZACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌱 Iniciando Historial de Contrataciones (Agricultor)...');
    loadHistorialFromServer();
    setupFilters();
});

console.log('✅ Historial de contrataciones cargado - Versión Definitiva Unificada');