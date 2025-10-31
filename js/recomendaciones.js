// ===================================================================
// VARIABLES GLOBALES
// ===================================================================
let recomendaciones = [];
let selectedJobId = null;
let userSkills = [];
let userJobHistory = [];

// ===================================================================
// VERIFICACIÓN DE SESIÓN
// ===================================================================
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
        
        if (!data.authenticated) {
            window.location.replace('/vista/login-trabajador.html?message=Por favor inicia sesión&type=info');
            return false;
        }
        
        return true;
        
    } catch (error) {
        console.error('Error verificando sesión:', error);
        window.location.replace('/vista/login-trabajador.html?message=Error de conexión&type=error');
        return false;
    }
}

// ===================================================================
// CARGAR RECOMENDACIONES
// ===================================================================
async function cargarRecomendaciones() {
    console.log('🔍 Cargando recomendaciones...');
    
    showLoading();
    
    try {
        // Primero verificar si el usuario tiene habilidades
        const skillsResponse = await fetch('/api/get_user_skills', {
            credentials: 'include'
        });
        
        if (skillsResponse.ok) {
            const skillsData = await skillsResponse.json();
            userSkills = skillsData.skills || [];
            
            // Actualizar contador de habilidades
            document.getElementById('skillCount').textContent = userSkills.length;
        }
        
        // Si no tiene habilidades, mostrar mensaje
        if (userSkills.length === 0) {
            showNoSkillsState();
            return;
        }
        
        // Cargar recomendaciones
        const response = await fetch('/api/recomendaciones-empleos', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar recomendaciones');
        }
        
        const data = await response.json();
        console.log('📊 Recomendaciones recibidas:', data);
        
        if (data.success) {
            recomendaciones = data.recomendaciones || [];
            
            // Actualizar estadísticas
            document.getElementById('recommendationsCount').textContent = recomendaciones.length;
            document.getElementById('jobsCompleted').textContent = data.trabajos_completados || 0;
            
            if (recomendaciones.length === 0) {
                showEmptyState();
            } else {
                displayRecomendaciones(recomendaciones);
            }
        } else {
            showEmptyState();
        }
        
    } catch (error) {
        console.error('❌ Error cargando recomendaciones:', error);
        showEmptyState();
        showToast('error', 'Error', 'No se pudieron cargar las recomendaciones. Intenta de nuevo.');
    }
}

// ===================================================================
// MOSTRAR RECOMENDACIONES
// ===================================================================
function displayRecomendaciones(recommendations) {
    const listContainer = document.getElementById('recommendationsList');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const noSkillsState = document.getElementById('noSkillsState');
    
    // Ocultar estados
    loadingState.style.display = 'none';
    emptyState.style.display = 'none';
    noSkillsState.style.display = 'none';
    
    // Mostrar lista
    listContainer.style.display = 'grid';
    listContainer.innerHTML = '';
    
    recommendations.forEach((rec, index) => {
        const card = createRecommendationCard(rec, index);
        listContainer.appendChild(card);
    });
    
    // Animación de entrada
    setTimeout(() => {
        const cards = listContainer.querySelectorAll('.recommendation-card');
        cards.forEach((card, idx) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, idx * 100);
        });
    }, 100);
}

// ===================================================================
// CREAR TARJETA DE RECOMENDACIÓN
// ===================================================================
function createRecommendationCard(rec, index) {
    const card = document.createElement('div');
    card.className = 'recommendation-card';
    card.setAttribute('data-match', getMatchLevel(rec.porcentaje_match));
    
    // Determinar clase de badge según porcentaje
    let matchClass = 'match-moderate';
    let matchText = 'Moderada';
    
    if (rec.porcentaje_match >= 90) {
        matchClass = 'match-excellent';
        matchText = 'Excelente';
    } else if (rec.porcentaje_match >= 70) {
        matchClass = 'match-good';
        matchText = 'Buena';
    }
    
    // Razones de recomendación
    const reasonsHTML = rec.razones_match && rec.razones_match.length > 0
        ? rec.razones_match.map(razon => `<span class="reason-tag">${razon}</span>`).join('')
        : '<span class="reason-tag">Coincide con tu perfil</span>';
    
    card.innerHTML = `
        <div class="recommendation-header">
            <div class="recommendation-title-section">
                <div class="recommendation-title">${rec.titulo}</div>
                <div class="recommendation-employer">
                    <i class="fas fa-user"></i>
                    ${rec.nombre_agricultor || 'Agricultor'}
                </div>
            </div>
            <div class="match-badge ${matchClass}">
                <div class="match-percentage">${rec.porcentaje_match}%</div>
                <div class="match-label">${matchText}</div>
            </div>
        </div>
        
        <div class="recommendation-details">
            <div class="detail-row">
                <div class="detail-icon">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="detail-content">
                    <div class="detail-label">Pago Ofrecido</div>
                    <div class="detail-value">$${Number(rec.pago_ofrecido).toLocaleString()} COP/día</div>
                </div>
            </div>
            
            <div class="detail-row">
                <div class="detail-icon">
                    <i class="fas fa-map-marker-alt"></i>
                </div>
                <div class="detail-content">
                    <div class="detail-label">Ubicación</div>
                    <div class="detail-value">${rec.ubicacion || 'No especificada'}</div>
                </div>
            </div>
            
            <div class="detail-row">
                <div class="detail-icon">
                    <i class="fas fa-calendar"></i>
                </div>
                <div class="detail-content">
                    <div class="detail-label">Publicado</div>
                    <div class="detail-value">${formatDate(rec.fecha_publicacion)}</div>
                </div>
            </div>
        </div>
        
        <div class="recommendation-reasons">
            <h4><i class="fas fa-lightbulb"></i> ¿Por qué te recomendamos esto?</h4>
            ${reasonsHTML}
        </div>
        
        <div class="recommendation-actions">
            <button class="btn btn-info" onclick="showRecommendationDetail(${index})">
                <i class="fas fa-info-circle"></i> Ver Detalles
            </button>
            <button class="btn btn-primary" onclick="applyToRecommendation(${rec.id_oferta}, '${rec.titulo.replace(/'/g, "\\'")}')">
                <i class="fas fa-paper-plane"></i> Postularme
            </button>
        </div>
    `;
    
    return card;
}

// ===================================================================
// FUNCIONES DE UTILIDAD
// ===================================================================
function getMatchLevel(percentage) {
    if (percentage >= 90) return 'excellent';
    if (percentage >= 70) return 'good';
    return 'moderate';
}

function formatDate(dateString) {
    if (!dateString) return 'Fecha no disponible';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    
    return date.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
    });
}

// ===================================================================
// FILTROS
// ===================================================================
function filterByMatch(button, level) {
    // Actualizar botones activos
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');
    
    const cards = document.querySelectorAll('.recommendation-card');
    
    cards.forEach(card => {
        const matchLevel = card.getAttribute('data-match');
        
        if (level === 'all' || matchLevel === level) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// ===================================================================
// POSTULACIÓN
// ===================================================================
function applyToRecommendation(jobId, jobTitle) {
    selectedJobId = jobId;
    
    const jobDetails = document.getElementById('jobDetailsForApplication');
    if (jobDetails) {
        jobDetails.innerHTML = `<strong>Trabajo:</strong> ${jobTitle}`;
    }
    
    const modal = document.getElementById('applyJobModal');
    const overlay = document.getElementById('overlay');
    
    if (modal) modal.style.display = 'flex';
    if (overlay) overlay.style.display = 'block';
}

function closeApplyModal() {
    const modal = document.getElementById('applyJobModal');
    const overlay = document.getElementById('overlay');
    
    if (modal) modal.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
    
    selectedJobId = null;
}

async function confirmApplication() {
    if (!selectedJobId) return;
    
    const btnConfirm = document.getElementById('confirmApplyBtn');
    const originalText = btnConfirm.innerHTML;
    
    btnConfirm.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    btnConfirm.disabled = true;
    
    try {
        const response = await fetch('/api/apply_job', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                job_id: selectedJobId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            btnConfirm.innerHTML = '<i class="fas fa-check"></i> ¡Enviado!';
            btnConfirm.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
            
            showToast('success', 'Postulación enviada', 'Tu postulación ha sido enviada exitosamente');
            
            setTimeout(() => {
                closeApplyModal();
                // Recargar recomendaciones
                cargarRecomendaciones();
            }, 1500);
            
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('error', 'Error', error.message || 'Error de conexión. Intenta de nuevo.');
        
        btnConfirm.innerHTML = originalText;
        btnConfirm.disabled = false;
        btnConfirm.style.background = '';
    }
}

// ===================================================================
// DETALLE DE RECOMENDACIÓN
// ===================================================================
function showRecommendationDetail(index) {
    const rec = recomendaciones[index];
    
    const detailsContainer = document.getElementById('recommendationDetails');
    
    let habilidadesHTML = '';
    if (rec.habilidades_requeridas && rec.habilidades_requeridas.length > 0) {
        habilidadesHTML = `
            <div style="margin-top: 20px;">
                <h4 style="color: #1e3a2e; margin-bottom: 10px;">
                    <i class="fas fa-tools"></i> Habilidades que coinciden:
                </h4>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${rec.habilidades_requeridas.map(h => 
                        `<span class="reason-tag">${h}</span>`
                    ).join('')}
                </div>
            </div>
        `;
    }
    
    detailsContainer.innerHTML = `
        <div style="line-height: 1.8; color: #64748b;">
            <p style="margin-bottom: 15px;">
                Este trabajo ha sido recomendado para ti porque:
            </p>
            <ul style="list-style: none; padding: 0;">
                ${rec.razones_match && rec.razones_match.length > 0 
                    ? rec.razones_match.map(razon => 
                        `<li style="padding: 10px 0; border-bottom: 1px solid rgba(144, 238, 144, 0.2);">
                            <i class="fas fa-check-circle" style="color: #22c55e; margin-right: 10px;"></i>
                            ${razon}
                        </li>`
                    ).join('')
                    : `<li style="padding: 10px 0;">
                            <i class="fas fa-info-circle" style="color: #3b82f6; margin-right: 10px;"></i>
                            Este trabajo coincide con tu perfil general
                        </li>`
                }
            </ul>
            ${habilidadesHTML}
            <div style="margin-top: 20px; padding: 15px; background: rgba(74, 124, 89, 0.08); border-radius: 10px;">
                <strong style="color: #1e3a2e;">Nivel de compatibilidad: ${rec.porcentaje_match}%</strong>
                <p style="margin-top: 8px; font-size: 14px;">
                    Tu perfil es altamente compatible con este trabajo. ¡Te animamos a postularte!
                </p>
            </div>
        </div>
    `;
    
    const modal = document.getElementById('detailModal');
    const overlay = document.getElementById('overlay');
    
    if (modal) modal.style.display = 'flex';
    if (overlay) overlay.style.display = 'block';
}

function closeDetailModal() {
    const modal = document.getElementById('detailModal');
    const overlay = document.getElementById('overlay');
    
    if (modal) modal.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
}

// ===================================================================
// ESTADOS DE UI
// ===================================================================
function showLoading() {
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('recommendationsList').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('noSkillsState').style.display = 'none';
}

function showEmptyState() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('recommendationsList').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('noSkillsState').style.display = 'none';
}

function showNoSkillsState() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('recommendationsList').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('noSkillsState').style.display = 'block';
}

// ===================================================================
// NAVEGACIÓN
// ===================================================================
function goBack() {
    window.location.href = 'index-trabajador.html';
}

function updateProfile() {
    window.location.href = 'perfil-trabajador.html?edit=true';
}

function viewAllJobs() {
    window.location.href = 'index-trabajador.html';
}

function goToProfile() {
    window.location.href = 'perfil-trabajador.html?edit=true';
}

function showNotifications() {
    showToast('info', 'Notificaciones', 'No tienes nuevas notificaciones');
}

// ===================================================================
// TOAST NOTIFICATIONS
// ===================================================================
function showToast(tipo, titulo, mensaje) {
    const toastAnterior = document.querySelector('.toast');
    if (toastAnterior) {
        toastAnterior.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    
    const iconos = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-triangle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-circle'
    };
    
    const colores = {
        success: '#22c55e',
        error: '#ef4444',
        info: '#3b82f6',
        warning: '#f59e0b'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${iconos[tipo]}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${titulo}</div>
            <div class="toast-message">${mensaje}</div>
        </div>
    `;
    
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        padding: 20px 24px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10001;
        transform: translateX(400px);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        border-left: 5px solid ${colores[tipo]};
        max-width: 400px;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.style.transform = 'translateX(0)', 100);
    
    setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 400);
    }, 4000);
}

// ===================================================================
// FUNCIONES GLOBALES PARA WINDOW
// ===================================================================
window.filterByMatch = filterByMatch;
window.applyToRecommendation = applyToRecommendation;
window.closeApplyModal = closeApplyModal;
window.confirmApplication = confirmApplication;
window.showRecommendationDetail = showRecommendationDetail;
window.closeDetailModal = closeDetailModal;
window.goBack = goBack;
window.updateProfile = updateProfile;
window.viewAllJobs = viewAllJobs;
window.goToProfile = goToProfile;
window.showNotifications = showNotifications;

// ===================================================================
// INICIALIZACIÓN
// ===================================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🌱 Inicializando página de recomendaciones...');
    
    // Verificar sesión
    verificarSesionActiva().then(isValid => {
        if (isValid) {
            // Cargar recomendaciones
            cargarRecomendaciones();
        }
    });
});

console.log('✅ JavaScript de recomendaciones cargado correctamente');