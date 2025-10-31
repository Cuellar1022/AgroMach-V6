// ============================================================
// HISTORIAL-EMPLEOS.JS - VERSIÓN DEFINITIVA UNIFICADA
// Sistema completo de gestión de historial con calificaciones
// ============================================================

// ============================================================
// VARIABLES GLOBALES
// ============================================================
let historialData = [];
let currentPage = 1;
const itemsPerPage = 5;
let filteredData = [];
let calificacionSeleccionada = 0;

// ============================================================
// CARGAR HISTORIAL DESDE EL SERVIDOR
// ============================================================
async function loadHistorialFromServer() {
    try {
        console.log('🔄 Cargando historial de empleos...');
        
        const response = await fetch('/api/historial_empleos_v2', {
            credentials: 'include'
        });
        
        console.log('📡 Response status:', response.status);
        
        const data = await response.json();
        console.log('📦 Datos recibidos:', data);
        
        if (data.success) {
            historialData = data.empleos || [];
            filteredData = [...historialData];
            renderHistorial();
            updateStats();
            console.log(`✅ ${historialData.length} empleos cargados`);
        } else {
            console.log('⚠️ No se encontraron empleos');
            showNoData();
        }
    } catch (error) {
        console.error('❌ Error cargando historial:', error);
        showNoData();
    }
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
                <i class="fas fa-clipboard-list"></i>
                <h3>No se encontraron empleos</h3>
                <p>No hay empleos que coincidan con los filtros seleccionados.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = pageData.map(empleo => {
        // Normalizar campos (pueden venir con diferentes nombres)
        const idAcuerdo = empleo.id_acuerdo || empleo.ID_Acuerdo || null;
        const idEmpleador = empleo.id_empleador || empleo.ID_Empleador || null;
        const estado = empleo.estado || empleo.Estado || '';
        const calificacion = empleo.calificacion || empleo.Calificacion || null;
        const nombreEmpleador = (empleo.empleador || 'Empleador').replace(/'/g, "\\'");
        
        // Determinar si puede calificar
        const esCompletado = estado === 'Completado' || estado === 'Finalizado';
        const yaCalificado = calificacion !== null && calificacion !== undefined;
        const puedeCalificar = esCompletado && !yaCalificado && idAcuerdo && idEmpleador;

        return `
        <div class="empleo-card">
            <div class="empleo-header">
                <div>
                    <div class="empleo-title">${empleo.titulo || 'Sin título'}</div>
                    <div class="empleador-info">
                        <i class="fas fa-user-tie"></i>
                        ${empleo.empleador || 'Empleador'}
                    </div>
                </div>
                <div class="empleo-status status-${estado.toLowerCase().replace(' ', '-')}">
                    ${getStatusIcon(estado)}
                    ${estado}
                </div>
            </div>

            <div class="empleo-details">
                <div class="detail-item">
                    <i class="fas fa-calendar-alt"></i>
                    <span>${formatDateRange(empleo.fecha_inicio, empleo.fecha_fin)}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span>${empleo.duracion || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${empleo.ubicacion || 'Sin ubicación'}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-dollar-sign"></i>
                    <span>${formatCurrency(empleo.pago)}</span>
                </div>
            </div>

            ${yaCalificado ? `
                <div class="empleo-rating">
                    <div class="rating-stars">
                        ${generateStars(calificacion)}
                    </div>
                    <span class="rating-value">${calificacion}.0</span>
                    ${empleo.comentario ? `<span class="rating-comment">"${empleo.comentario}"</span>` : ''}
                </div>
            ` : ''}

            <div class="empleo-footer">
                <div class="empleo-tags">
                    <span class="empleo-tag">${empleo.tipo || 'Trabajo'}</span>
                    ${esCompletado ? '<span class="empleo-tag">Finalizado</span>' : ''}
                </div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="detail-btn" onclick="showEmpleoDetails(${empleo.id || empleo.ID_Oferta})">
                        <i class="fas fa-eye"></i> Ver Detalles
                    </button>
                    
                    ${puedeCalificar ? `
                        <button 
                            class="btn-calificar" 
                            onclick="abrirModalCalificar(${idAcuerdo}, ${idEmpleador}, '${nombreEmpleador}')"
                            style="background: #ffc107; color: #1e3a2e; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.3s;">
                            <i class="fas fa-star"></i> Calificar Empleador
                        </button>
                    ` : ''}
                    
                    ${yaCalificado && esCompletado ? `
                        <div style="padding: 10px 20px; background: #e8f5e9; color: #2e7d32; border-radius: 8px; font-weight: 600; display: inline-flex; align-items: center; gap: 8px;">
                            <i class="fas fa-check-circle"></i> Ya calificado
                        </div>
                    ` : ''}
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
function abrirModalCalificar(acuerdoId, empleadorId, nombreEmpleador) {
    const modal = document.createElement('div');
    modal.id = 'modalCalificar';
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
            <button onclick="cerrarModalCalificar()" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 28px; cursor: pointer; color: #999; transition: color 0.3s;" onmouseover="this.style.color='#333'" onmouseout="this.style.color='#999'">
                <i class="fas fa-times"></i>
            </button>
            
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, #ffc107, #ff9800); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-star" style="font-size: 40px; color: white;"></i>
                </div>
                <h2 style="color: #1e3a2e; margin: 0 0 10px 0; font-size: 24px;">Calificar a ${nombreEmpleador}</h2>
                <p style="color: #666; font-size: 15px;">¿Cómo fue tu experiencia trabajando?</p>
            </div>
            
            <div id="estrellas" style="display: flex; justify-content: center; gap: 15px; font-size: 56px; margin: 30px 0; cursor: pointer;">
                ${[1,2,3,4,5].map(i => `
                    <i class="far fa-star" data-rating="${i}" 
                       onmouseover="pintarEstrellas(${i})" 
                       onmouseout="restaurarEstrellas()"
                       onclick="seleccionarCalificacion(${i})"
                       style="color: #ddd; transition: all 0.2s; cursor: pointer;">
                    </i>
                `).join('')}
            </div>
            
            <div style="text-align: center; margin-bottom: 25px; min-height: 30px;">
                <span id="textoCalificacion" style="font-size: 20px; font-weight: 600; color: #6c757d;">
                    Selecciona una calificación
                </span>
            </div>
            
            <textarea 
                id="comentarioCalificacion" 
                placeholder="Cuéntanos sobre tu experiencia (opcional)..."
                style="width: 100%; min-height: 120px; padding: 15px; border: 2px solid #e9ecef; border-radius: 12px; font-size: 15px; resize: vertical; font-family: inherit; margin-bottom: 25px; transition: border-color 0.3s;"
                onfocus="this.style.borderColor='#ffc107'"
                onblur="this.style.borderColor='#e9ecef'">
            </textarea>
            
            <button 
                onclick="enviarCalificacion(${acuerdoId}, ${empleadorId})"
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
        if (e.target.id === 'modalCalificar') {
            cerrarModalCalificar();
        }
    });
}

function pintarEstrellas(rating) {
    const estrellas = document.querySelectorAll('#estrellas i');
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

function restaurarEstrellas() {
    if (calificacionSeleccionada === 0) {
        const estrellas = document.querySelectorAll('#estrellas i');
        estrellas.forEach(estrella => {
            if (!estrella.classList.contains('seleccionada')) {
                estrella.style.color = '#ddd';
                estrella.classList.remove('fas');
                estrella.classList.add('far');
            }
        });
    }
}

function seleccionarCalificacion(rating) {
    calificacionSeleccionada = rating;
    const estrellas = document.querySelectorAll('#estrellas i');
    
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
    
    const textoElement = document.getElementById('textoCalificacion');
    textoElement.textContent = textos[rating];
    textoElement.style.color = '#1e3a2e';
    textoElement.style.fontSize = '22px';
}

async function enviarCalificacion(acuerdoId, empleadorId) {
    if (calificacionSeleccionada === 0) {
        alert('⚠️ Por favor selecciona una calificación');
        return;
    }
    
    const comentario = document.getElementById('comentarioCalificacion').value.trim();
    
    try {
        const response = await fetch('/api/submit_new_rating', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                acuerdo_id: acuerdoId,
                receptor_id: empleadorId,
                puntuacion: calificacionSeleccionada,
                comentario: comentario
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ ¡Calificación enviada exitosamente!');
            cerrarModalCalificar();
            loadHistorialFromServer();
        } else {
            alert('❌ Error: ' + data.message);
        }
    } catch (error) {
        console.error('❌ Error:', error);
        alert('❌ Error al enviar la calificación');
    }
}

function cerrarModalCalificar() {
    const modal = document.getElementById('modalCalificar');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => modal.remove(), 300);
    }
    calificacionSeleccionada = 0;
    document.removeEventListener('keydown', cerrarConEscape);
}

function cerrarConEscape(e) {
    if (e.key === 'Escape') {
        cerrarModalCalificar();
    }
}

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================
function getStatusIcon(estado) {
    const icons = {
        'Completado': '<i class="fas fa-check-circle"></i>',
        'Finalizado': '<i class="fas fa-check-circle"></i>',
        'En curso': '<i class="fas fa-clock"></i>',
        'Cancelado': '<i class="fas fa-times-circle"></i>'
    };
    return icons[estado] || '<i class="fas fa-question-circle"></i>';
}

function formatDateRange(inicio, fin) {
    if (!inicio) return 'Sin fecha';
    
    const fechaInicio = new Date(inicio).toLocaleDateString('es-ES', { 
        year: 'numeric', month: 'short', day: 'numeric' 
    });
    
    if (!fin) return `${fechaInicio} - En curso`;
    
    const fechaFin = new Date(fin).toLocaleDateString('es-ES', { 
        year: 'numeric', month: 'short', day: 'numeric' 
    });
    return `${fechaInicio} - ${fechaFin}`;
}

function formatCurrency(amount) {
    if (!amount || amount === 0) return 'Sin pago';
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
    const completados = historialData.filter(e => 
        e.estado === 'Completado' || e.estado === 'Finalizado'
    ).length;
    
    const horasTotal = historialData.reduce((total, empleo) => {
        if (empleo.estado === 'Completado' || empleo.estado === 'Finalizado') {
            const dias = parseInt(empleo.duracion) || 1;
            return total + (dias * 8);
        }
        return total;
    }, 0);
    
    const calificaciones = historialData.filter(e => e.calificacion);
    const calificacionPromedio = calificaciones.length > 0 
        ? calificaciones.reduce((sum, e) => sum + e.calificacion, 0) / calificaciones.length 
        : 0;
    
    const ingresoTotal = historialData
        .filter(e => e.estado === 'Completado' || e.estado === 'Finalizado')
        .reduce((total, e) => total + (e.pago || 0), 0);

    document.getElementById('totalEmpleos').textContent = completados;
    document.getElementById('totalHoras').textContent = `${horasTotal}h`;
    document.getElementById('calificacionPromedio').textContent = calificacionPromedio.toFixed(1);
    document.getElementById('ingresoTotal').textContent = formatCurrency(ingresoTotal);
}

// ============================================================
// FILTROS Y BÚSQUEDA
// ============================================================
function setupFilters() {
    document.getElementById('searchHistorial').addEventListener('input', applyFilters);
    document.getElementById('estadoFilter').addEventListener('change', applyFilters);
    document.getElementById('fechaFilter').addEventListener('change', applyFilters);
    document.getElementById('tipoFilter').addEventListener('change', applyFilters);
}

function applyFilters() {
    const searchTerm = document.getElementById('searchHistorial').value.toLowerCase();
    const estadoFilter = document.getElementById('estadoFilter').value;
    const fechaFilter = document.getElementById('fechaFilter').value;
    const tipoFilter = document.getElementById('tipoFilter').value;

    filteredData = historialData.filter(empleo => {
        const matchesSearch = !searchTerm || 
            (empleo.titulo && empleo.titulo.toLowerCase().includes(searchTerm)) ||
            (empleo.empleador && empleo.empleador.toLowerCase().includes(searchTerm)) ||
            (empleo.ubicacion && empleo.ubicacion.toLowerCase().includes(searchTerm));

        const matchesEstado = !estadoFilter || empleo.estado === estadoFilter;
        const matchesTipo = !tipoFilter || empleo.tipo === tipoFilter;

        return matchesSearch && matchesEstado && matchesTipo;
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
// MODAL DE DETALLES
// ============================================================
function showEmpleoDetails(empleoId) {
    const empleo = historialData.find(e => (e.id || e.ID_Oferta) === empleoId);
    if (!empleo) return;

    const modal = document.getElementById('detalleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.textContent = `Detalles: ${empleo.titulo}`;
    
    modalBody.innerHTML = `
        <div style="padding: 20px;">
            <div style="margin-bottom: 25px;">
                <h4 style="color: var(--primary-dark); margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-briefcase"></i> Información del Empleo
                </h4>
                <div style="display: grid; gap: 12px;">
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(144, 238, 144, 0.1); border-radius: 8px;">
                        <span style="color: #666; font-weight: 600;">Empleador:</span>
                        <span style="color: var(--primary-dark); font-weight: 700;">${empleo.empleador}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(144, 238, 144, 0.1); border-radius: 8px;">
                        <span style="color: #666; font-weight: 600;">Tipo de trabajo:</span>
                        <span style="color: var(--primary-dark); font-weight: 700;">${empleo.tipo}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(144, 238, 144, 0.1); border-radius: 8px;">
                        <span style="color: #666; font-weight: 600;">Ubicación:</span>
                        <span style="color: var(--primary-dark); font-weight: 700;">${empleo.ubicacion}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(144, 238, 144, 0.1); border-radius: 8px;">
                        <span style="color: #666; font-weight: 600;">Estado:</span>
                        <span class="empleo-status status-${empleo.estado.toLowerCase().replace(' ', '-')}">${empleo.estado}</span>
                    </div>
                </div>
            </div>

            <div style="margin-bottom: 25px;">
                <h4 style="color: var(--primary-dark); margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-calendar-alt"></i> Fechas y Duración
                </h4>
                <div style="display: grid; gap: 12px;">
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(144, 238, 144, 0.1); border-radius: 8px;">
                        <span style="color: #666; font-weight: 600;">Fecha de inicio:</span>
                        <span style="color: var(--primary-dark); font-weight: 700;">${new Date(empleo.fecha_inicio).toLocaleDateString('es-ES', {year: 'numeric', month: 'long', day: 'numeric'})}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(144, 238, 144, 0.1); border-radius: 8px;">
                        <span style="color: #666; font-weight: 600;">Fecha de finalización:</span>
                        <span style="color: var(--primary-dark); font-weight: 700;">${empleo.fecha_fin ? new Date(empleo.fecha_fin).toLocaleDateString('es-ES', {year: 'numeric', month: 'long', day: 'numeric'}) : 'En curso'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(144, 238, 144, 0.1); border-radius: 8px;">
                        <span style="color: #666; font-weight: 600;">Duración:</span>
                        <span style="color: var(--primary-dark); font-weight: 700;">${empleo.duracion}</span>
                    </div>
                </div>
            </div>

            <div style="margin-bottom: 25px;">
                <h4 style="color: var(--primary-dark); margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-file-alt"></i> Descripción
                </h4>
                <p style="color: #666; line-height: 1.6; padding: 15px; background: rgba(144, 238, 144, 0.1); border-radius: 8px;">${empleo.descripcion || 'Sin descripción'}</p>
            </div>

            <div style="margin-bottom: 25px;">
                <h4 style="color: var(--primary-dark); margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-dollar-sign"></i> Pago
                </h4>
                <div style="padding: 20px; background: linear-gradient(135deg, #4a7c59, #1e3a2e); border-radius: 12px; text-align: center;">
                    <div style="font-size: 32px; font-weight: 800; color: white;">${formatCurrency(empleo.pago)}</div>
                    <div style="color: rgba(255,255,255,0.8); margin-top: 5px;">Pago total</div>
                </div>
            </div>

            ${empleo.calificacion ? `
                <div style="margin-bottom: 25px;">
                    <h4 style="color: var(--primary-dark); margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-star"></i> Valoración Recibida
                    </h4>
                    <div style="padding: 20px; background: rgba(144, 238, 144, 0.1); border-radius: 12px; text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 10px;">
                            ${generateStars(empleo.calificacion)}
                        </div>
                        <div style="font-size: 24px; font-weight: 700; color: var(--primary-dark); margin-bottom: 10px;">
                            ${empleo.calificacion}.0/5.0
                        </div>
                        ${empleo.comentario ? `
                            <div style="padding: 15px; background: white; border-radius: 8px; margin-top: 15px;">
                                <p style="color: #666; font-style: italic;">"${empleo.comentario}"</p>
                            </div>
                        ` : ''}
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
// EXPORTAR A PDF
// ============================================================
function exportToPDF() {
    if (historialData.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    // Calcular estadísticas
    const completados = historialData.filter(e => 
        e.estado === 'Completado' || e.estado === 'Finalizado'
    ).length;
    
    const horasTotal = historialData.reduce((total, empleo) => {
        if (empleo.estado === 'Completado' || empleo.estado === 'Finalizado') {
            const dias = parseInt(empleo.duracion) || 1;
            return total + (dias * 8);
        }
        return total;
    }, 0);
    
    const calificaciones = historialData.filter(e => e.calificacion);
    const calificacionPromedio = calificaciones.length > 0 
        ? (calificaciones.reduce((sum, e) => sum + e.calificacion, 0) / calificaciones.length).toFixed(1)
        : '0.0';
    
    const ingresoTotal = historialData
        .filter(e => e.estado === 'Completado' || e.estado === 'Finalizado')
        .reduce((total, e) => total + (e.pago || 0), 0);

    // Crear ventana de impresión
    const printWindow = window.open('', '_blank');
    
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Historial de Empleos - AgroMatch</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: Arial, sans-serif;
                    padding: 30px;
                    color: #333;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 3px solid #4a7c59;
                    padding-bottom: 20px;
                }
                
                .header h1 {
                    color: #1e3a2e;
                    font-size: 28px;
                    margin-bottom: 10px;
                }
                
                .fecha-generacion {
                    color: #666;
                    font-size: 14px;
                }
                
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 15px;
                    margin-bottom: 30px;
                }
                
                .stat-box {
                    background: #f5f5f5;
                    padding: 15px;
                    border-radius: 8px;
                    text-align: center;
                    border: 2px solid #90EE90;
                }
                
                .stat-number {
                    font-size: 24px;
                    font-weight: bold;
                    color: #1e3a2e;
                    margin-bottom: 5px;
                }
                
                .stat-label {
                    font-size: 12px;
                    color: #666;
                }
                
                .empleos-list {
                    margin-top: 30px;
                }
                
                .empleo-item {
                    background: #fff;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 20px;
                    page-break-inside: avoid;
                }
                
                .empleo-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #90EE90;
                }
                
                .empleo-title {
                    font-size: 18px;
                    font-weight: bold;
                    color: #1e3a2e;
                }
                
                .empleo-status {
                    padding: 5px 15px;
                    border-radius: 15px;
                    font-size: 12px;
                    font-weight: bold;
                }
                
                .status-completado, .status-finalizado {
                    background: #90EE90;
                    color: #1e3a2e;
                }
                
                .status-en-curso {
                    background: #FFC107;
                    color: #fff;
                }
                
                .status-cancelado {
                    background: #F44336;
                    color: #fff;
                }
                
                .empleo-details {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 10px;
                    margin-bottom: 15px;
                }
                
                .detail-row {
                    font-size: 14px;
                    color: #666;
                }
                
                .detail-label {
                    font-weight: bold;
                    color: #333;
                }
                
                .empleo-rating {
                    background: #f9f9f9;
                    padding: 10px;
                    border-radius: 5px;
                    text-align: center;
                }
                
                .footer {
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 2px solid #ddd;
                    text-align: center;
                    color: #666;
                    font-size: 12px;
                }
                
                @media print {
                    body {
                        padding: 20px;
                    }
                    
                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📋 HISTORIAL DE EMPLEOS - AGROMATCH</h1>
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
                    <div class="stat-number">${completados}</div>
                    <div class="stat-label">Empleos Completados</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">${horasTotal}h</div>
                    <div class="stat-label">Horas Trabajadas</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">${calificacionPromedio}</div>
                    <div class="stat-label">Calificación Promedio</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">${formatCurrency(ingresoTotal)}</div>
                    <div class="stat-label">Ingresos Totales</div>
                </div>
            </div>
            
            <div class="empleos-list">
                <h2 style="margin-bottom: 20px; color: #1e3a2e;">Listado de Empleos</h2>
                ${historialData.map((empleo, index) => `
                    <div class="empleo-item">
                        <div class="empleo-header">
                            <div>
                                <div class="empleo-title">${index + 1}. ${empleo.titulo || 'Sin título'}</div>
                                <div style="color: #666; font-size: 14px; margin-top: 5px;">
                                    Empleador: ${empleo.empleador || 'Empleador'}
                                </div>
                            </div>
                            <div class="empleo-status status-${(empleo.estado || '').toLowerCase().replace(' ', '-')}">
                                ${empleo.estado || 'Sin estado'}
                            </div>
                        </div>
                        
                        <div class="empleo-details">
                            <div class="detail-row">
                                <span class="detail-label">📅 Fecha inicio:</span> 
                                ${empleo.fecha_inicio ? new Date(empleo.fecha_inicio).toLocaleDateString('es-ES') : 'N/A'}
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">📅 Fecha fin:</span> 
                                ${empleo.fecha_fin ? new Date(empleo.fecha_fin).toLocaleDateString('es-ES') : 'En curso'}
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">⏱️ Duración:</span> ${empleo.duracion || 'N/A'}
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">📍 Ubicación:</span> ${empleo.ubicacion || 'Sin ubicación'}
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">🏷️ Tipo:</span> ${empleo.tipo || 'Trabajo'}
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">💰 Pago:</span> ${formatCurrency(empleo.pago)}
                            </div>
                        </div>
                        
                        ${empleo.descripcion ? `
                            <div style="margin-top: 10px; padding: 10px; background: #f9f9f9; border-radius: 5px;">
                                <strong>Descripción:</strong> ${empleo.descripcion}
                            </div>
                        ` : ''}
                        
                        ${empleo.calificacion ? `
                            <div class="empleo-rating">
                                <strong>Calificación:</strong> ${'⭐'.repeat(empleo.calificacion)} (${empleo.calificacion}/5)
                                ${empleo.comentario ? `<br><em>"${empleo.comentario}"</em>` : ''}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            
            <div class="footer">
                <p><strong>AgroMatch</strong> - Plataforma de Conexión Laboral Agrícola</p>
                <p>Este documento fue generado automáticamente por el sistema</p>
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
// FUNCIONES DE NAVEGACIÓN Y UTILIDAD
// ============================================================
function goBack() {
    window.location.href = 'index-trabajador.html';
}

function showNoData() {
    const container = document.getElementById('historialList');
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-clipboard-list"></i>
            <h3>No tienes historial de empleos</h3>
            <p>Cuando completes trabajos, aparecerán aquí.</p>
        </div>
    `;
}

// ============================================================
// EVENT LISTENERS GLOBALES
// ============================================================

// Cerrar modal con ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
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
        
        .btn-calificar:hover {
            background: #ffb300 !important;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(255, 193, 7, 0.4);
        }
        
        #estrellas i:hover {
            transform: scale(1.15);
        }
    `;
    document.head.appendChild(style);
}

// ============================================================
// INICIALIZACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌱 Iniciando Historial de Empleos (Trabajador)...');
    loadHistorialFromServer();
    setupFilters();
});

console.log('✅ Historial de empleos cargado - Versión Definitiva Unificada');