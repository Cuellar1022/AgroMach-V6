// ================================================================
// PERFIL AGRICULTOR - JAVASCRIPT COMPLETO Y FUSIONADO
// ================================================================

// Variables globales
let currentViewingUserId = null;
let isOwnProfile = true;
let userData = null;

// ================================================================
// INICIALIZACIÓN
// ================================================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Iniciando sistema de perfil agricultor...');
    
    // Detectar si estamos viendo el perfil de otro usuario
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const isSelf = urlParams.get('self') === 'true';
    
    if (userId && !isSelf) {
        currentViewingUserId = parseInt(userId);
        isOwnProfile = false;
        console.log('👁️ Viendo perfil de usuario:', userId);
        hideEditOptions();
    } else {
        isOwnProfile = true;
        console.log('👤 Viendo perfil propio');
    }
    
    // Cargar datos
    await loadUserData();
    setupFormHandlers();
    setupPhotoUpload();
    setupTabListeners();
    loadFarms();
    loadReceivedRatings();
    loadDocuments();
    loadStatistics();
    
    // Ocultar loading
    setTimeout(() => {
        const loading = document.getElementById('loadingScreen');
        if (loading) loading.style.display = 'none';
    }, 1000);
    
    console.log('✅ Sistema de perfil agricultor completamente cargado');
});

// ================================================================
// CARGAR DATOS DEL USUARIO
// ================================================================

async function loadUserData() {
    try {
        console.log('📥 Cargando datos del usuario...');
        
        let url = '/get_user_session';
        if (!isOwnProfile && currentViewingUserId) {
            url = `/api/get_user_profile/${currentViewingUserId}`;
        }
        
        const response = await fetch(url, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.user) {
            userData = data.user;
            console.log('✅ Datos cargados:', userData);
            
            // Información personal
            const fullName = `${userData.first_name || userData.nombre || ''} ${userData.last_name || userData.apellido || ''}`.trim();
            updateElement('profileName', fullName);
            updateElement('profileRole', userData.rol || 'Agricultor');
            
            updateElement('displayName', fullName);
            updateElement('displayEmail', userData.email || 'No especificado');
            updateElement('displayPhone', userData.telefono || 'No especificado');
            updateElement('displaySocial', userData.red_social || 'No especificado');
            
            // Información agrícola (desde JSON)
            updateElement('displayRole', userData.rol || 'Agricultor');
            updateElement('displayProductionType', userData.area_trabajo || 'No especificado');
            updateElement('displayMainCrops', userData.especializacion || 'No especificado');
            updateElement('displayFarmingExperience', userData.anos_experiencia ? `${userData.anos_experiencia} años` : 'No especificado');
            
            // Estadísticas
            updateElement('displayRating', generateStarsDisplay(userData.calificacion_promedio || 0), true);
            updateElement('displayStatus', userData.estado || 'Activo');
            updateElement('displayMemberSince', formatDate(userData.fecha_registro));
            
            // Formulario de edición
            if (isOwnProfile) {
                const names = fullName.split(' ');
                setInputValue('editFirstName', names[0] || '');
                setInputValue('editLastName', names.slice(1).join(' ') || '');
                setInputValue('editPhone', userData.telefono || '');
                setInputValue('editSocialMedia', userData.red_social || '');
                
                setSelectValue('editProductionType', userData.area_trabajo || '');
                setInputValue('editMainCrops', userData.especializacion || '');
                setInputValue('editFarmingExperience', userData.anos_experiencia || '');
                
                console.log('✅ Formulario llenado correctamente');
            }
            
            // Foto
            if (userData.url_foto) {
                updatePhotoDisplay(userData.url_foto);
            }
            
        } else {
            showMessage('Error cargando datos del usuario', 'error');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        showMessage('Error de conexión', 'error');
    }
}

// ================================================================
// OCULTAR OPCIONES DE EDICIÓN
// ================================================================

function hideEditOptions() {
    const editTab = document.getElementById('editTab');
    const documentsTab = document.getElementById('documentsTab');
    const addFarmSection = document.getElementById('addFarmSection');
    
    if (editTab) editTab.style.display = 'none';
    if (documentsTab) documentsTab.style.display = 'none';
    if (addFarmSection) addFarmSection.style.display = 'none';
}

// ================================================================
// ESTADÍSTICAS DEL AGRICULTOR
// ================================================================

async function loadStatistics() {
    try {
        const response = await fetch('/api/estadisticas_agricultor', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateElement('displayOffersCount', data.totalOfertas || 0);
            updateElement('displayWorkersHired', data.totalContrataciones || 0);
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// ================================================================
// FINCAS
// ================================================================

async function loadFarms() {
    try {
        const response = await fetch('/api/get_farms', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success && data.farms && data.farms.length > 0) {
            displayFarms(data.farms);
        } else {
            const container = document.getElementById('farmsList');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-tractor" style="font-size: 48px; color: #ddd;"></i>
                        <p>No hay fincas registradas</p>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error cargando fincas:', error);
    }
}

function displayFarms(farms) {
    const container = document.getElementById('farmsList');
    if (!container) return;
    
    let html = '<div class="farms-grid">';
    
    farms.forEach(farm => {
        html += `
            <div class="farm-card">
                <div class="farm-header">
                    <h4>${farm.nombre}</h4>
                    ${isOwnProfile ? `
                        <button class="btn-icon-delete" onclick="deleteFarm(${farm.id})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
                <div class="farm-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${farm.ubicacion}
                </div>
                ${farm.area ? `<p><strong>Área:</strong> ${farm.area} hectáreas</p>` : ''}
                ${farm.descripcion ? `<p class="farm-description">${farm.descripcion}</p>` : ''}
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// ================================================================
// CALIFICACIONES RECIBIDAS - VERSIÓN MEJORADA
// ================================================================

async function loadReceivedRatings() {
    try {
        console.log('🔄 Cargando calificaciones recibidas...');
        
        const userId = new URLSearchParams(window.location.search).get('userId');
        let url = userId 
            ? `/api/get_ratings_received?user_id=${userId}`
            : '/api/get_ratings_received';
        
        const response = await fetch(url, {
            credentials: 'include'
        });
        
        const data = await response.json();
        console.log('📊 Datos de calificaciones:', data);
        
        if (data.success && data.calificaciones && data.calificaciones.length > 0) {
            renderReceivedRatings(data.calificaciones, data.estadisticas);
        } else {
            showNoRatings();
        }
    } catch (error) {
        console.error('❌ Error cargando calificaciones:', error);
        showNoRatings();
    }
}

function renderReceivedRatings(calificaciones, stats) {
    const container = document.getElementById('receivedRatingsList');
    if (!container) return;
    
    container.innerHTML = `
        <!-- Resumen de Calificaciones -->
        <div class="info-card" style="margin-bottom: 25px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); text-align: center; padding: 40px;">
            <div style="font-size: 72px; font-weight: 800; color: #1e3a2e; line-height: 1; margin-bottom: 20px;">
                ${stats.promedio.toFixed(1)}
            </div>
            <div style="font-size: 48px; color: #ffc107; margin-bottom: 20px;">
                ${generateStars(Math.round(stats.promedio))}
            </div>
            <div style="color: #666; font-weight: 600; font-size: 20px;">
                ${stats.total} ${stats.total === 1 ? 'calificación' : 'calificaciones'}
            </div>
        </div>
        
        <!-- Distribución de Calificaciones -->
        <div class="info-card" style="margin-bottom: 25px;">
            <h3 style="margin-bottom: 20px; color: #495057;">
                <i class="fas fa-chart-bar"></i> Distribución de Calificaciones
            </h3>
            ${generateRatingDistribution(stats.distribucion, stats.total)}
        </div>
        
        <!-- Lista de Calificaciones -->
        <div class="info-card">
            <h3 style="margin-bottom: 20px; color: #495057;">
                <i class="fas fa-comments"></i> Comentarios de Trabajadores
            </h3>
            <div style="display: flex; flex-direction: column; gap: 20px;">
                ${calificaciones.map(cal => `
                    <div style="padding: 20px; background: #f8f9fa; border-radius: 12px; border-left: 4px solid #4a7c59; transition: all 0.3s;" onmouseover="this.style.transform='translateX(5px)'" onmouseout="this.style.transform='translateX(0)'">
                        <div style="display: flex; align-items: flex-start; gap: 15px; margin-bottom: 12px;">
                            ${cal.emisor.foto 
                                ? `<img src="/static/uploads/profile_photos/${cal.emisor.foto}" 
                                     style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 3px solid #90EE90;">` 
                                : `<div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #4a7c59, #1e3a2e); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px; border: 3px solid #90EE90;">
                                     ${getInitials(cal.emisor.nombre)}
                                   </div>`
                            }
                            <div style="flex: 1;">
                                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;">
                                    <div>
                                        <div style="font-weight: 700; color: #1e3a2e; font-size: 18px;">
                                            ${cal.emisor.nombre}
                                        </div>
                                        <div style="color: #6c757d; font-size: 14px; margin-top: 4px;">
                                            <span style="padding: 3px 10px; background: rgba(144, 238, 144, 0.2); border-radius: 4px; font-weight: 600;">
                                                ${cal.emisor.rol}
                                            </span>
                                            ${cal.trabajo.titulo ? ` • ${cal.trabajo.titulo}` : ''}
                                        </div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-size: 28px; color: #ffc107; margin-bottom: 5px;">
                                            ${generateStars(cal.puntuacion)}
                                        </div>
                                        <div style="color: #6c757d; font-size: 13px;">
                                            ${formatearFecha(cal.fecha)}
                                        </div>
                                    </div>
                                </div>
                                ${cal.comentario ? `
                                    <div style="margin-top: 15px; padding: 15px; background: white; border-radius: 10px; border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                        <i class="fas fa-quote-left" style="color: #90EE90; margin-right: 8px; font-size: 16px;"></i>
                                        <span style="color: #495057; line-height: 1.6; font-style: italic; font-size: 15px;">
                                            ${cal.comentario}
                                        </span>
                                        <i class="fas fa-quote-right" style="color: #90EE90; margin-left: 8px; font-size: 16px;"></i>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function generateRatingDistribution(distribucion, total) {
    let html = '';
    
    for (let i = 5; i >= 1; i--) {
        const count = distribucion[i.toString()] || 0;
        const percentage = total > 0 ? (count / total) * 100 : 0;
        
        html += `
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <div style="width: 80px; text-align: right; font-weight: 700; color: #495057; font-size: 14px;">
                    ${i} <i class="fas fa-star" style="color: #ffc107; font-size: 13px;"></i>
                </div>
                <div style="flex: 1; background: #e9ecef; height: 28px; border-radius: 14px; overflow: hidden; position: relative;">
                    <div style="width: ${percentage}%; height: 100%; background: linear-gradient(90deg, #4a7c59, #90EE90); transition: width 0.8s ease; display: flex; align-items: center; justify-content: flex-end; padding-right: 10px;">
                        ${percentage > 15 ? `<span style="color: white; font-size: 12px; font-weight: 700;">${count}</span>` : ''}
                    </div>
                    ${percentage <= 15 && count > 0 ? `<span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 12px; font-weight: 700; color: #495057;">${count}</span>` : ''}
                </div>
                <div style="width: 60px; text-align: left; font-weight: 700; color: #6c757d; font-size: 13px;">
                    ${percentage.toFixed(0)}%
                </div>
            </div>
        `;
    }
    
    return html;
}

function showNoRatings() {
    const container = document.getElementById('receivedRatingsList');
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 80px 20px;">
            <div style="width: 120px; height: 120px; margin: 0 auto 30px; background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-star" style="font-size: 64px; color: #ddd;"></i>
            </div>
            <h3 style="color: #6c757d; margin-bottom: 15px; font-size: 24px;">No tienes calificaciones aún</h3>
            <p style="color: #adb5bd; font-size: 16px; max-width: 400px; margin: 0 auto;">Cuando los trabajadores califiquen tu desempeño, aparecerán aquí</p>
        </div>
    `;
}

// ================================================================
// DOCUMENTOS
// ================================================================

async function loadDocuments() {
    if (!isOwnProfile) return;
    
    try {
        const response = await fetch('/api/user-documents', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success && data.documents) {
            displayDocuments(data.documents);
            updateDocumentCount(data.documents.length);
        }
    } catch (error) {
        console.error('Error cargando documentos:', error);
    }
}

function displayDocuments(documents) {
    const container = document.getElementById('filesList');
    if (!container) return;
    
    if (documents.length === 0) {
        container.innerHTML = '<p style="color: #6c757d; text-align: center;">No hay archivos subidos aún</p>';
        return;
    }
    
    let html = '';
    documents.forEach(doc => {
        html += `
            <div class="document-item">
                <div class="document-info">
                    <div class="document-type"><i class="fas fa-file"></i> ${doc.tipo_documento}</div>
                    <div class="document-name">${doc.nombre_archivo}</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function updateDocumentCount(count) {
    const countEl = document.getElementById('documentCount');
    const statusEl = document.getElementById('profileStatus');
    
    if (countEl) countEl.textContent = `${count}/3 documentos`;
    
    if (statusEl) {
        if (count >= 2) {
            statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Perfil completo';
            statusEl.style.color = '#28a745';
        } else {
            statusEl.innerHTML = '<i class="fas fa-clock"></i> Pendiente de verificación';
            statusEl.style.color = '#dc3545';
        }
    }
}

// ================================================================
// FORMULARIOS
// ================================================================

function setupFormHandlers() {
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSubmit);
        console.log('✅ Formulario de perfil configurado');
    }
    
    const farmForm = document.getElementById('addFarmForm');
    if (farmForm) {
        farmForm.addEventListener('submit', handleFarmSubmit);
        console.log('✅ Formulario de fincas configurado');
    }
}

async function handleProfileSubmit(e) {
    e.preventDefault();
    console.log('📝 Guardando perfil...');
    
    const firstName = document.getElementById('editFirstName').value.trim();
    const lastName = document.getElementById('editLastName').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const socialMedia = document.getElementById('editSocialMedia').value.trim();
    const productionType = document.getElementById('editProductionType').value;
    const mainCrops = document.getElementById('editMainCrops').value.trim();
    const farmingExperience = document.getElementById('editFarmingExperience').value;
    
    if (!firstName || !lastName) {
        showMessage('Nombre y apellido son requeridos', 'error');
        return;
    }
    
    const payload = {
        nombre: firstName,
        apellido: lastName,
        telefono: phone || null,
        red_social: socialMedia || null,
        area_trabajo: productionType || null,
        especializacion: mainCrops || null,
        anos_experiencia: farmingExperience ? parseInt(farmingExperience) : 0
    };
    
    console.log('📤 Enviando payload:', payload);
    
    try {
        showMessage('Guardando cambios...', 'info');
        
        const response = await fetch('/api/update-profile', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        console.log('📥 Respuesta del servidor:', data);
        
        if (data.success) {
            showMessage('✅ Perfil actualizado correctamente', 'success');
            await new Promise(r => setTimeout(r, 800));
            await loadUserData();
            showTab('info');
        } else {
            showMessage(data.message || 'Error al actualizar perfil', 'error');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        showMessage('Error de conexión con el servidor', 'error');
    }
}

async function handleFarmSubmit(e) {
    e.preventDefault();
    console.log('🚜 Agregando finca...');
    
    const name = document.getElementById('farmName').value.trim();
    const location = document.getElementById('farmLocation').value.trim();
    const area = document.getElementById('farmArea').value;
    const description = document.getElementById('farmDescription').value.trim();
    
    if (!name || !location) {
        showMessage('Nombre y ubicación son requeridos', 'error');
        return;
    }
    
    const payload = {
        nombre: name,
        ubicacion: location,
        area: area ? parseFloat(area) : null,
        descripcion: description || null
    };
    
    try {
        showMessage('Agregando finca...', 'info');
        
        const response = await fetch('/api/add_farm', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('Finca agregada correctamente', 'success');
            document.getElementById('addFarmForm').reset();
            await new Promise(r => setTimeout(r, 500));
            await loadFarms();
        } else {
            showMessage(data.message || 'Error al agregar finca', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error de conexión', 'error');
    }
}

async function deleteFarm(farmId) {
    if (!confirm('¿Estás seguro de eliminar esta finca?')) return;
    
    try {
        const response = await fetch(`/api/delete_farm/${farmId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('Finca eliminada', 'success');
            await loadFarms();
        } else {
            showMessage('Error al eliminar finca', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error de conexión', 'error');
    }
}

// ================================================================
// SUBIR FOTO
// ================================================================

function setupPhotoUpload() {
    const input = document.getElementById('profilePhotoInput');
    
    if (input) {
        input.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                showMessage('Formato no válido. Use JPG, PNG o GIF', 'error');
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) {
                showMessage('Archivo muy grande. Máximo 5MB', 'error');
                return;
            }
            
            const formData = new FormData();
            formData.append('profilePhoto', file);
            
            try {
                showMessage('Subiendo foto...', 'info');
                
                const response = await fetch('/api/upload-profile-photo', {
                    method: 'POST',
                    credentials: 'include',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showMessage('Foto actualizada', 'success');
                    updatePhotoDisplay(data.photoUrl);
                } else {
                    showMessage('Error al subir foto', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showMessage('Error de conexión', 'error');
            }
        });
    }
}

function changeProfilePhoto() {
    if (!isOwnProfile) return;
    const input = document.getElementById('profilePhotoInput');
    if (input) input.click();
}

function updatePhotoDisplay(url) {
    const photo = document.getElementById('profilePhoto');
    const preview = document.getElementById('editProfilePhotoPreview');
    
    if (photo) {
        photo.innerHTML = `<img src="${url}" alt="Foto" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    }
    
    if (preview) {
        preview.innerHTML = `<img src="${url}" alt="Foto" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    }
}

// ================================================================
// SUBIR DOCUMENTOS
// ================================================================

window.uploadDocument = async function(docType) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.png,.jpg,.jpeg';
    
    input.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.size > 5 * 1024 * 1024) {
            showMessage('Archivo muy grande. Máximo 5MB', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('document', file);
        formData.append('docType', docType);
        
        try {
            showMessage(`Subiendo ${docType}...`, 'info');
            
            const response = await fetch('/api/upload-document', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                showMessage(`${docType} subido correctamente`, 'success');
                await loadDocuments();
            } else {
                showMessage('Error al subir documento', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('Error de conexión', 'error');
        }
    };
    
    input.click();
};

// ================================================================
// NAVEGACIÓN Y TABS
// ================================================================

function setupTabListeners() {
    // Listener para la pestaña de calificaciones
    const ratingsTab = document.querySelector('[onclick="showTab(\'ratings\')"]');
    if (ratingsTab) {
        ratingsTab.addEventListener('click', () => {
            loadReceivedRatings();
        });
    }
}

function showTab(tabName) {
    // Ocultar todas las pestañas
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Desactivar todos los botones
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Mostrar la pestaña seleccionada
    const content = document.getElementById(tabName);
    if (content) content.classList.add('active');
    
    // Activar el botón correspondiente
    const tab = document.querySelector(`.tab[onclick="showTab('${tabName}')"]`);
    if (tab) tab.classList.add('active');
    
    // Cargar datos específicos según la pestaña
    if (tabName === 'ratings') {
        loadReceivedRatings();
    }
}

function cancelEdit() {
    loadUserData();
    showTab('info');
}

function goBackToDashboard() {
    window.location.href = '/vista/index-agricultor.html';
}

// ================================================================
// EXPORTAR PERFIL A PDF
// ================================================================

async function exportarPerfilPDF() {
    const btnExport = document.getElementById('btnExportPDF');
    const originalText = btnExport.innerHTML;
    
    btnExport.disabled = true;
    btnExport.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando PDF...';
    
    try {
        // Importar jsPDF desde el CDN
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Configuración
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        let yPos = margin;
        
        // ===== HEADER - Logo y título =====
        doc.setFillColor(74, 124, 89);
        doc.rect(0, 0, pageWidth, 35, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('AgroMatch', margin, 20);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Perfil de Agricultor', margin, 28);
        
        yPos = 50;
        
        // ===== INFORMACIÓN PERSONAL =====
        doc.setTextColor(74, 124, 89);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Información Personal', margin, yPos);
        
        yPos += 10;
        doc.setDrawColor(74, 124, 89);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        
        yPos += 8;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        
        const infoPersonal = [
            ['Nombre:', document.getElementById('displayName')?.textContent || 'N/A'],
            ['Email:', document.getElementById('displayEmail')?.textContent || 'N/A'],
            ['Teléfono:', document.getElementById('displayPhone')?.textContent || 'N/A'],
            ['Red Social:', document.getElementById('displaySocial')?.textContent || 'N/A']
        ];
        
        infoPersonal.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, margin, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(value, margin + 35, yPos);
            yPos += 7;
        });
        
        yPos += 5;
        
        // ===== INFORMACIÓN AGRÍCOLA =====
        doc.setTextColor(74, 124, 89);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Información Agrícola', margin, yPos);
        
        yPos += 10;
        doc.setDrawColor(74, 124, 89);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        
        yPos += 8;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        
        const infoAgricola = [
            ['Tipo de producción:', document.getElementById('displayProductionType')?.textContent || 'N/A'],
            ['Cultivos principales:', document.getElementById('displayMainCrops')?.textContent || 'N/A'],
            ['Años de experiencia:', document.getElementById('displayFarmingExperience')?.textContent || 'N/A']
        ];
        
        infoAgricola.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, margin, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(value, margin + 45, yPos);
            yPos += 7;
        });
        
        yPos += 5;
        
        // ===== FINCAS =====
        const farmsContainer = document.getElementById('farmsList');
        if (farmsContainer && !farmsContainer.querySelector('.empty-state')) {
            doc.setTextColor(74, 124, 89);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Fincas Registradas', margin, yPos);
            
            yPos += 10;
            doc.setDrawColor(74, 124, 89);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            
            yPos += 8;
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            
            const farmCards = farmsContainer.querySelectorAll('.farm-card');
            farmCards.forEach((card, index) => {
                if (yPos > pageHeight - 30) {
                    doc.addPage();
                    yPos = margin;
                }
                
                const farmName = card.querySelector('h4')?.textContent || 'N/A';
                const farmLocation = card.querySelector('.farm-location')?.textContent?.trim() || 'N/A';
                
                doc.setFont('helvetica', 'bold');
                doc.text(`• ${farmName}`, margin, yPos);
                yPos += 5;
                doc.setFont('helvetica', 'normal');
                doc.text(`  ${farmLocation}`, margin + 3, yPos);
                yPos += 8;
            });
            
            yPos += 5;
        }
        
        // ===== ESTADÍSTICAS =====
        if (yPos > pageHeight - 70) {
            doc.addPage();
            yPos = margin;
        }
        
        doc.setTextColor(74, 124, 89);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Estadísticas', margin, yPos);
        
        yPos += 10;
        doc.setDrawColor(74, 124, 89);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        
        yPos += 8;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        
        const estadisticas = [
            ['Ofertas publicadas:', document.getElementById('displayOffersCount')?.textContent || '0'],
            ['Trabajadores contratados:', document.getElementById('displayWorkersHired')?.textContent || '0'],
            ['Calificación promedio:', document.getElementById('displayRating')?.textContent?.match(/[\d.]+/)?.[0] || '0.0'],
            ['Estado:', document.getElementById('displayStatus')?.textContent || 'Activo'],
            ['Miembro desde:', document.getElementById('displayMemberSince')?.textContent || 'N/A']
        ];
        
        estadisticas.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, margin, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(value, margin + 55, yPos);
            yPos += 7;
        });
        
        // ===== FOOTER =====
        doc.setFontSize(9);
        doc.setTextColor(128, 128, 128);
        doc.setFont('helvetica', 'italic');
        const currentPage = doc.internal.getCurrentPageInfo().pageNumber;
        doc.text(
            `Generado el ${new Date().toLocaleDateString('es-ES')} por AgroMatch | Página ${currentPage}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );
        
        // ===== GUARDAR PDF =====
        const fileName = `Perfil_${document.getElementById('displayName')?.textContent.replace(/\s+/g, '_')}_Agricultor_AgroMatch.pdf`;
        doc.save(fileName);
        
        showMessage('✅ PDF descargado exitosamente', 'success');
        
    } catch (error) {
        console.error('❌ Error generando PDF:', error);
        showMessage('❌ Error al generar PDF: ' + error.message, 'error');
    } finally {
        btnExport.disabled = false;
        btnExport.innerHTML = originalText;
    }
}

// ================================================================
// UTILIDADES
// ================================================================

function updateElement(id, value, isHtml = false) {
    const el = document.getElementById(id);
    if (el) {
        if (isHtml) {
            el.innerHTML = value;
        } else {
            el.textContent = value;
        }
    }
}

function setInputValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
}

function setSelectValue(id, value) {
    const el = document.getElementById(id);
    if (el && value) {
        el.value = value;
    }
}

function generateStarsDisplay(rating) {
    const full = Math.floor(rating);
    const stars = '⭐'.repeat(full) + '☆'.repeat(5 - full);
    return `<span style="color: #ffc107;">${stars}</span> ${rating.toFixed(1)}`;
}

function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += i <= rating 
            ? '<i class="fas fa-star"></i>' 
            : '<i class="far fa-star"></i>';
    }
    return stars;
}

function getInitials(nombre) {
    if (!nombre) return '??';
    const words = nombre.trim().split(' ');
    return words.map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase();
}

function formatDate(dateString) {
    if (!dateString) return 'No especificado';
    return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatearFecha(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}

function showMessage(message, type = 'info') {
    const existing = document.querySelectorAll('.temp-message');
    existing.forEach(msg => msg.remove());
    
    const colors = {
        success: '#d4edda',
        error: '#f8d7da',
        warning: '#fff3cd',
        info: '#d1ecf1'
    };
    
    const textColors = {
        success: '#155724',
        error: '#721c24',
        warning: '#856404',
        info: '#0c5460'
    };
    
    const div = document.createElement('div');
    div.className = 'temp-message';
    div.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type]};
        color: ${textColors[type]};
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 350px;
        font-size: 14px;
        animation: slideInRight 0.3s ease;
    `;
    
    div.textContent = message;
    
    document.body.appendChild(div);
    
    setTimeout(() => {
        div.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (div.parentNode) {
                div.parentNode.removeChild(div);
            }
        }, 300);
    }, 3000);
}

// ================================================================
// ESTILOS CSS DINÁMICOS
// ================================================================

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
    
    .farms-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 20px;
        margin-top: 20px;
    }
    
    .farm-card {
        background: #f8f9fa;
        border: 2px solid #e9ecef;
        border-radius: 12px;
        padding: 20px;
        transition: all 0.3s ease;
    }
    
    .farm-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 20px rgba(0,0,0,0.1);
        border-color: #4a7c59;
    }
    
    .farm-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
    }
    
    .farm-header h4 {
        margin: 0;
        color: #1e3a2e;
        font-size: 18px;
        font-weight: 700;
    }
    
    .btn-icon-delete {
        background: none;
        border: none;
        color: #dc3545;
        cursor: pointer;
        font-size: 16px;
        padding: 5px 10px;
        border-radius: 5px;
        transition: all 0.3s ease;
    }
    
    .btn-icon-delete:hover {
        background: rgba(220, 53, 69, 0.1);
        transform: scale(1.1);
    }
    
    .farm-location {
        color: #6c757d;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
    }
    
    .farm-description {
        margin-top: 10px;
        color: #495057;
        font-size: 14px;
        line-height: 1.5;
    }
    
    .empty-state {
        text-align: center;
        padding: 60px 20px;
        color: #6c757d;
    }
    
    .empty-state p {
        margin-top: 15px;
        font-size: 16px;
    }
`;

if (!document.querySelector('style[data-perfil-agricultor-styles]')) {
    style.setAttribute('data-perfil-agricultor-styles', 'true');
    document.head.appendChild(style);
}

// ================================================================
// EXPONER FUNCIONES GLOBALES
// ================================================================

window.showTab = showTab;
window.cancelEdit = cancelEdit;
window.changeProfilePhoto = changeProfilePhoto;
window.deleteFarm = deleteFarm;
window.goBackToDashboard = goBackToDashboard;
window.uploadDocument = uploadDocument;
window.exportarPerfilPDF = exportarPerfilPDF;

console.log('✅ Sistema de perfil agricultor COMPLETAMENTE FUSIONADO y cargado');