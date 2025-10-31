# ================================================================
# APLICACIÓN PRINCIPAL FLASK - AGROMATCH PYTHON MODIFICADO
# Ruta: conexion/app.py
# ================================================================

from flask import Flask, request, redirect, url_for, session, jsonify, render_template, send_from_directory
from flask import Flask, request, redirect, url_for, session, jsonify
from flask import Flask, request, jsonify, session
import hashlib
from urllib.parse import quote
import uuid
import bcrypt
from conexion import execute_query
import re
from urllib.parse import quote, unquote
import os
from flask import Flask, render_template, send_from_directory
import uuid  
from werkzeug.utils import secure_filename
from datetime import datetime
from flask import request, jsonify, session
from conexion import execute_query
from datetime import datetime, timedelta
import json
import mysql.connector
import logging
from flask import Flask, request, redirect, url_for, session, jsonify, make_response
from functools import wraps
from datetime import timedelta, datetime
import secrets
from flask import jsonify, request, session
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_mysqldb import MySQL
from werkzeug.security import generate_password_hash, check_password_hash
import traceback
from conexion import execute_query, get_db_connection


app = Flask(__name__)

# ================================================================
# CONFIGURACIÓN DE SESIONES CON CLAVE AUTOMÁTICA
# ================================================================
app.secret_key = secrets.token_hex(32)
app.config['SESSION_COOKIE_SECURE'] = False
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=12)

print(f"✅ Clave secreta generada: {len(app.secret_key)} caracteres")

# ================================================================
# DECORADOR PARA PREVENIR CACHÉ
# ================================================================
def no_cache(view):
    """Decorador para prevenir caché del navegador"""
    @wraps(view)
    def no_cache_view(*args, **kwargs):
        response = make_response(view(*args, **kwargs))
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '-1'
        return response
    return no_cache_view

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ================================================================
# CONEXIÓN A BASE DE DATOS
# ================================================================
def get_db_connection():
    """Crear conexión a la base de datos MySQL"""
    try:
        connection = mysql.connector.connect(
            host='localhost',
            database='Agromach_V2',
            user='root',
            password='123456',
            charset='utf8mb4',
            collation='utf8mb4_unicode_ci'
        )
        return connection
    except mysql.connector.Error as e:
        logger.error(f"Error conectando a la base de datos: {e}")
        raise

# Crear alias para compatibilidad con código existente
create_connection = get_db_connection

@app.route('/api/crear_oferta', methods=['POST'])
def crear_oferta():
    """Crear una nueva oferta de trabajo"""
    try:
        # Verificar sesión
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'message': 'Sesión no válida'
            }), 401
        
        # Verificar que el usuario sea agricultor
        user_role = session.get('user_role') or session.get('role')
        if user_role != 'Agricultor':
            return jsonify({
                'success': False,
                'message': 'Solo los agricultores pueden crear ofertas'
            }), 403
        
        data = request.get_json()
        print(f"Datos recibidos: {data}")  # Para debug
        
        # Validación de datos básicos
        if not data.get('titulo') or len(data['titulo']) < 10:
            return jsonify({
                'success': False,
                'message': 'El título debe tener al menos 10 caracteres'
            }), 400
        
        if not data.get('descripcion') or len(data['descripcion']) < 20:
            return jsonify({
                'success': False,
                'message': 'La descripción debe tener al menos 20 caracteres'
            }), 400
        
        if not data.get('pago') or int(data['pago']) < 10000:
            return jsonify({
                'success': False,
                'message': 'El pago mínimo debe ser $10,000 COP'
            }), 400
        
        # Descripción con ubicación incluida
        descripcion_completa = data['descripcion']
        if data.get('ubicacion'):
            descripcion_completa += f"\n\nUbicación: {data['ubicacion']}"
        
        # Insertar en la base de datos usando execute_query
        user_id = execute_query(
            """INSERT INTO Oferta_Trabajo (ID_Agricultor, Titulo, Descripcion, Pago_Ofrecido, Estado) 
               VALUES (%s, %s, %s, %s, 'Abierta')""",
            (session['user_id'], data['titulo'], descripcion_completa, int(data['pago']))
        )
        
        print(f"Oferta creada con ID: {user_id}")
        
        return jsonify({
            'success': True,
            'message': 'Oferta creada exitosamente',
            'oferta_id': user_id
        }), 201
        
    except Exception as e:
        print(f"❌ Error en crear_oferta: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Error interno: {str(e)}'
        }), 500

# ================================================================
# DUPLICAR OFERTA - VERSIÓN CORREGIDA
# ================================================================

@app.route('/api/duplicar_oferta/<int:oferta_id>', methods=['POST'])
def duplicar_oferta(oferta_id):
    """Duplicar una oferta existente"""
    try:
        # Verificar sesión manualmente
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'message': 'Sesión no válida'
            }), 401
        
        user_id = session['user_id']
        user_role = session.get('user_role', session.get('role'))
        
        print(f"🔍 Duplicando oferta {oferta_id} - Usuario: {user_id}, Rol: {user_role}")
        
        if user_role != 'Agricultor':
            return jsonify({
                'success': False,
                'message': 'Solo los agricultores pueden duplicar ofertas'
            }), 403
        
        # Obtener la oferta original
        oferta = execute_query("""
            SELECT Titulo, Descripcion, Pago_Ofrecido, ID_Agricultor
            FROM Oferta_Trabajo
            WHERE ID_Oferta = %s
        """, (oferta_id,), fetch_one=True)
        
        if not oferta:
            return jsonify({
                'success': False,
                'message': 'Oferta no encontrada'
            }), 404
        
        if oferta['ID_Agricultor'] != user_id:
            return jsonify({
                'success': False,
                'message': 'No tienes permisos para duplicar esta oferta'
            }), 403
        
        # Crear nueva oferta con el prefijo "Copia de"
        titulo_nuevo = f"Copia de {oferta['Titulo']}"
        
        # Insertar la copia
        nueva_oferta_id = execute_query("""
            INSERT INTO Oferta_Trabajo (ID_Agricultor, Titulo, Descripcion, Pago_Ofrecido, Estado, Fecha_Publicacion)
            VALUES (%s, %s, %s, %s, 'Abierta', NOW())
        """, (user_id, titulo_nuevo, oferta['Descripcion'], oferta['Pago_Ofrecido']))
        
        print(f"✅ Oferta {oferta_id} duplicada. Nueva ID: {nueva_oferta_id}")
        
        return jsonify({
            'success': True,
            'message': f'Oferta duplicada exitosamente',
            'nueva_oferta_id': nueva_oferta_id
        })
        
    except Exception as e:
        print(f"❌ Error duplicando oferta: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500

print("✅ Endpoint de duplicar oferta cargado correctamente")

@app.route('/api/get_jobs', methods=['GET'])
def get_jobs():
    """Obtener todas las ofertas disponibles para trabajadores - MEJORADO"""
    try:
        # Obtener ID del usuario si está logueado (para filtrar)
        user_id = session.get('user_id')
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Si hay usuario logueado, excluir ofertas a las que ya se postuló
        if user_id:
            query = """
            SELECT 
                ot.ID_Oferta as id_oferta,
                ot.Titulo as titulo,
                ot.Descripcion as descripcion,
                ot.Pago_Ofrecido as pago_ofrecido,
                ot.Fecha_Publicacion as fecha_publicacion,
                ot.Estado as estado,
                CONCAT(u.Nombre, ' ', u.Apellido) as nombre_agricultor,
                COUNT(p.ID_Postulacion) as num_postulaciones
            FROM Oferta_Trabajo ot
            INNER JOIN Usuario u ON ot.ID_Agricultor = u.ID_Usuario
            LEFT JOIN Postulacion p ON ot.ID_Oferta = p.ID_Oferta
            WHERE ot.Estado = 'Abierta'
              AND ot.Fecha_Publicacion >= DATE_SUB(NOW(), INTERVAL 30 DAY)
              AND ot.ID_Oferta NOT IN (
                  SELECT ID_Oferta 
                  FROM Postulacion 
                  WHERE ID_Trabajador = %s
              )
            GROUP BY ot.ID_Oferta, ot.Titulo, ot.Descripcion, ot.Pago_Ofrecido, 
                     ot.Fecha_Publicacion, ot.Estado, u.Nombre, u.Apellido
            ORDER BY ot.Fecha_Publicacion DESC
            LIMIT 50
            """
            cursor.execute(query, (user_id,))
        else:
            # Si no hay usuario logueado, mostrar todas
            query = """
            SELECT 
                ot.ID_Oferta as id_oferta,
                ot.Titulo as titulo,
                ot.Descripcion as descripcion,
                ot.Pago_Ofrecido as pago_ofrecido,
                ot.Fecha_Publicacion as fecha_publicacion,
                ot.Estado as estado,
                CONCAT(u.Nombre, ' ', u.Apellido) as nombre_agricultor,
                COUNT(p.ID_Postulacion) as num_postulaciones
            FROM Oferta_Trabajo ot
            INNER JOIN Usuario u ON ot.ID_Agricultor = u.ID_Usuario
            LEFT JOIN Postulacion p ON ot.ID_Oferta = p.ID_Oferta
            WHERE ot.Estado = 'Abierta'
              AND ot.Fecha_Publicacion >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY ot.ID_Oferta, ot.Titulo, ot.Descripcion, ot.Pago_Ofrecido, 
                     ot.Fecha_Publicacion, ot.Estado, u.Nombre, u.Apellido
            ORDER BY ot.Fecha_Publicacion DESC
            LIMIT 50
            """
            cursor.execute(query)
        
        jobs = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        print(f"Ofertas encontradas: {len(jobs)}")
        
        return jsonify({
            'success': True,
            'jobs': jobs,
            'total': len(jobs)
        })
        
    except Exception as e:
        print(f"Error al obtener trabajos: {e}")
        import traceback
        traceback.print_exc()
        
        return jsonify({
            'success': False,
            'message': f'Error interno del servidor: {str(e)}'
        }), 500

@app.route('/api/apply_job', methods=['POST'])
def apply_job():
    """Postularse a un trabajo - CORREGIDO"""
    try:
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'message': 'Sesión no válida'
            }), 401
        
        # IMPORTANTE: Usar ambos nombres posibles para el rol
        user_role = session.get('user_role') or session.get('role')
        
        print(f"🔍 DEBUG - User ID: {session['user_id']}")
        print(f"🔍 DEBUG - User Role: {user_role}")
        print(f"🔍 DEBUG - Session completa: {dict(session)}")
        
        if user_role != 'Trabajador':
            return jsonify({
                'success': False,
                'message': f'Solo los trabajadores pueden postularse. Tu rol actual: {user_role}'
            }), 403
        
        data = request.get_json()
        job_id = data.get('job_id')
        
        if not job_id:
            return jsonify({
                'success': False,
                'message': 'ID de trabajo requerido'
            }), 400
        
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Verificar que el trabajo existe y está abierto
        check_job_query = "SELECT Estado FROM Oferta_Trabajo WHERE ID_Oferta = %s"
        cursor.execute(check_job_query, (job_id,))
        result = cursor.fetchone()
        
        if not result:
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'Trabajo no encontrado'
            }), 404
        
        if result[0] != 'Abierta':
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'Este trabajo ya no está disponible'
            }), 400
        
        # Verificar si ya se postuló
        check_application_query = """
        SELECT ID_Postulacion FROM Postulacion 
        WHERE ID_Oferta = %s AND ID_Trabajador = %s
        """
        cursor.execute(check_application_query, (job_id, session['user_id']))
        existing_application = cursor.fetchone()
        
        if existing_application:
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'Ya te has postulado a este trabajo'
            }), 400
        
        # Crear postulación
        insert_query = """
        INSERT INTO Postulacion (ID_Oferta, ID_Trabajador, Fecha_Postulacion, Estado)
        VALUES (%s, %s, %s, %s)
        """
        cursor.execute(insert_query, (job_id, session['user_id'], datetime.now(), 'Pendiente'))
        
        connection.commit()
        cursor.close()
        connection.close()
        
        print(f"✅ Postulación creada exitosamente para user {session['user_id']} en oferta {job_id}")
        
        return jsonify({
            'success': True,
            'message': 'Postulación enviada exitosamente'
        }), 201
        
    except Exception as e:
        print(f"❌ Error al postularse: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Error interno del servidor: {str(e)}'
        }), 500

# ================================================================
# CONFIGURACIÓN DE RUTAS ESTÁTICAS MODIFICADAS PARA TU ESTRUCTURA
# ================================================================

@app.route('/vista/<path:filename>')
def serve_vista(filename):
    """Sirve archivos HTML desde la carpeta vista"""
    try:
        # Obtener la ruta absoluta del directorio actual
        base_dir = os.path.dirname(os.path.abspath(__file__))
        vista_path = os.path.join(base_dir, '..', 'vista')
        vista_path = os.path.abspath(vista_path)
        
        # Verificar que el archivo existe
        file_path = os.path.join(vista_path, filename)
        if not os.path.exists(file_path):
            print(f"❌ Archivo no encontrado: {file_path}")
            return f"Archivo no encontrado: {filename}", 404
            
        print(f"✅ Sirviendo archivo: {file_path}")
        return send_from_directory(vista_path, filename)
    except Exception as e:
        print(f"❌ Error sirviendo vista {filename}: {str(e)}")
        return f"Error sirviendo archivo: {filename}", 500

# NUEVAS RUTAS PARA DASHBOARD DE TRABAJADOR
@app.route('/dashboard-trabajador.css')
def serve_dashboard_trabajador_css():
    """Sirve el archivo dashboard-trabajador.css"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        vista_path = os.path.join(base_dir, '..', 'vista')
        vista_path = os.path.abspath(vista_path)
        
        response = send_from_directory(vista_path, 'index-trabajador.css')
        response.headers['Content-Type'] = 'text/css'
        return response
    except Exception as e:
        return f"Error sirviendo CSS: {str(e)}", 500

@app.route('/dashboard-trabajador.js')
def serve_dashboard_trabajador_js():
    """Sirve el archivo dashboard-trabajador.js"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        vista_path = os.path.join(base_dir, '..', 'vista')
        vista_path = os.path.abspath(vista_path)
        
        response = send_from_directory(vista_path, 'index-trabajador.js')
        response.headers['Content-Type'] = 'application/javascript'
        return response
    except Exception as e:
        return f"Error sirviendo JS: {str(e)}", 500

@app.route('/script.js')
def serve_script():
    """Sirve el archivo script.js desde la carpeta vista"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        vista_path = os.path.join(base_dir, '..', 'vista')
        vista_path = os.path.abspath(vista_path)
        
        file_path = os.path.join(vista_path, 'script.js')
        if not os.path.exists(file_path):
            print(f"❌ script.js no encontrado: {file_path}")
            return "script.js no encontrado", 404
            
        print(f"✅ Sirviendo script.js: {file_path}")
        response = send_from_directory(vista_path, 'script.js')
        response.headers['Content-Type'] = 'application/javascript'
        return response
    except Exception as e:
        print(f"❌ Error sirviendo script.js: {str(e)}")
        return f"Error sirviendo script.js: {str(e)}", 500

@app.route('/css/<path:filename>')
def serve_css(filename):
    """Sirve archivos CSS desde assent/css"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        css_path = os.path.join(base_dir, '..', 'assent', 'css')
        css_path = os.path.abspath(css_path)
        
        if not os.path.exists(os.path.join(css_path, filename)):
            print(f"❌ CSS no encontrado: {filename}")
            return f"CSS no encontrado: {filename}", 404
            
        response = send_from_directory(css_path, filename)
        response.headers['Content-Type'] = 'text/css'
        return response
    except Exception as e:
        print(f"❌ Error sirviendo CSS {filename}: {str(e)}")
        return f"Error sirviendo CSS: {filename}", 500

@app.route('/js/<path:filename>')
def serve_js(filename):
    """Sirve archivos JavaScript desde js/"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        js_path = os.path.join(base_dir, '..', 'js')
        js_path = os.path.abspath(js_path)
        
        if not os.path.exists(os.path.join(js_path, filename)):
            print(f"❌ JS no encontrado: {filename}")
            return f"JS no encontrado: {filename}", 404
            
        response = send_from_directory(js_path, filename)
        response.headers['Content-Type'] = 'application/javascript'
        return response
    except Exception as e:
        print(f"❌ Error sirviendo JS {filename}: {str(e)}")
        return f"Error sirviendo JS: {filename}", 500

@app.route('/assent/css/<path:filename>')
def serve_assent_css(filename):
    """Sirve archivos CSS desde assent/css"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        assent_css_path = os.path.join(base_dir, '..', 'assent', 'css')
        assent_css_path = os.path.abspath(assent_css_path)
        
        if not os.path.exists(os.path.join(assent_css_path, filename)):
            print(f"❌ Assent CSS no encontrado: {filename}")
            return f"Assent CSS no encontrado: {filename}", 404
            
        response = send_from_directory(assent_css_path, filename)
        response.headers['Content-Type'] = 'text/css'
        return response
    except Exception as e:
        print(f"❌ Error sirviendo Assent CSS {filename}: {str(e)}")
        return f"Error sirviendo Assent CSS: {filename}", 500

@app.route('/img/<path:filename>')
def serve_img(filename):
    """Sirve archivos de imágenes"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        img_path = os.path.join(base_dir, '..', 'img')
        img_path = os.path.abspath(img_path)
        
        if not os.path.exists(os.path.join(img_path, filename)):
            print(f"❌ Imagen no encontrada: {filename}")
            return f"Imagen no encontrada: {filename}", 404
            
        return send_from_directory(img_path, filename)
    except Exception as e:
        print(f"❌ Error sirviendo imagen {filename}: {str(e)}")
        return f"Error sirviendo imagen: {filename}", 500

@app.route('/assent/img/<path:filename>')
def serve_assent_img(filename):
    """Sirve archivos de imágenes desde assent/img"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        assent_img_path = os.path.join(base_dir, '..', 'assent', 'img')
        assent_img_path = os.path.abspath(assent_img_path)
        
        if not os.path.exists(os.path.join(assent_img_path, filename)):
            print(f"❌ Assent imagen no encontrada: {filename}")
            return f"Assent imagen no encontrada: {filename}", 404
            
        return send_from_directory(assent_img_path, filename)
    except Exception as e:
        print(f"❌ Error sirviendo Assent imagen {filename}: {str(e)}")
        return f"Error sirviendo Assent imagen: {filename}", 500

@app.route('/assent/js/<path:filename>')
def serve_assent_js(filename):
    """Sirve archivos JavaScript desde assent/js"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        assent_js_path = os.path.join(base_dir, '..', 'assent', 'js')
        assent_js_path = os.path.abspath(assent_js_path)
        
        if not os.path.exists(os.path.join(assent_js_path, filename)):
            print(f"❌ Assent JS no encontrado: {filename}")
            return f"Assent JS no encontrado: {filename}", 404
            
        response = send_from_directory(assent_js_path, filename)
        response.headers['Content-Type'] = 'application/javascript'
        return response
    except Exception as e:
        print(f"❌ Error sirviendo Assent JS {filename}: {str(e)}")
        return f"Error sirviendo Assent JS: {filename}", 500

# RUTA ESPECIAL PARA EL DASHBOARD DE AGRICULTOR
@app.route('/vista/dashboard-agricultor.html')
def serve_dashboard_agricultor():
    """Sirve el dashboard del agricultor con archivos separados"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        vista_path = os.path.join(base_dir, '..', 'vista')
        vista_path = os.path.abspath(vista_path)
        
        # Verificar que existen los archivos necesarios
        html_file = os.path.join(vista_path, 'dashboard-agricultor.html')
        css_file = os.path.join(vista_path, 'styles.css')
        js_file = os.path.join(vista_path, 'script.js')
        
        if not os.path.exists(html_file):
            print(f"❌ dashboard-agricultor.html no encontrado: {html_file}")
            return "Dashboard de agricultor no encontrado", 404
            
        print(f"✅ Sirviendo dashboard del agricultor")
        print(f"   HTML: {'✅' if os.path.exists(html_file) else '❌'}")
        print(f"   CSS:  {'✅' if os.path.exists(css_file) else '❌'}")
        print(f"   JS:   {'✅' if os.path.exists(js_file) else '❌'}")
        
        return send_from_directory(vista_path, 'dashboard-agricultor.html')
        
    except Exception as e:
        print(f"❌ Error sirviendo dashboard del agricultor: {str(e)}")
        return f"Error sirviendo dashboard: {str(e)}", 500
    
# ================================================================
# RUTA DE ESTADISTICAS DEL TRABAJADOR
# ================================================================    
    
# Ruta para la página de estadísticas
import os

@app.route('/estadisticas-trabajador')
def estadisticas_trabajador():
    file_path = os.path.join('vista', 'estadisticas-trabajador.html')
    
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    else:
        return f"Archivo no encontrado en: {os.path.abspath(file_path)}", 404

# Ruta para servir archivos de la carpeta js
@app.route('/js/<path:filename>')
def serve_js_files(filename):
    return send_from_directory('js', filename)

@app.route('/index-trabajador.html')
def serve_index_trabajador():
    return send_from_directory('vista', 'index-trabajador.html')

# Ruta para obtener estadísticas (sin API separada)
    try:
        from conexion.get_estadisticas_trabajador import obtener_estadisticas_trabajador
        
        data = request.get_json()
        id_usuario = data.get('idUsuario')
        periodo = data.get('periodo', 'all')
        
        if not id_usuario:
            return jsonify({'success': False, 'error': 'ID de usuario requerido'})
        
        estadisticas = obtener_estadisticas_trabajador(id_usuario, periodo)
        return jsonify({'success': True, 'estadisticas': estadisticas})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# ================================================================
# RUTA PARA VERIFICAR ARCHIVOS (DEBUGGING MEJORADO)
# ================================================================

# ...existing code...
@app.route('/check_files')
def check_files():
    """Verifica qué archivos existen en las carpetas"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Verificar carpetas
        folders_to_check = ['vista', 'css', 'js', 'img', 'assent/css', 'assent/js', 'assent/img']
        result = {
            'base_dir': base_dir,
            'folders': {},
            'dashboard_files': {}
        }
        
        for folder in folders_to_check:
            folder_path = os.path.join(base_dir, '..', folder)
            folder_path = os.path.abspath(folder_path)
            
            if os.path.exists(folder_path):
                files = os.listdir(folder_path)
                result['folders'][folder] = {
                    'exists': True,
                    'path': folder_path,
                    'files': files
                }
            else:
                result['folders'][folder] = {
                    'exists': False,
                    'path': folder_path,
                    'files': []
                }
        
        # Verificar específicamente los archivos del dashboard de agricultor
        vista_path = os.path.join(base_dir, '..', 'vista')
        dashboard_files = {
            'dashboard-agricultor.html': os.path.join(vista_path, 'dashboard-agricultor.html'),
            'styles.css': os.path.join(vista_path, 'styles.css'),
            'script.js': os.path.join(vista_path, 'script.js')
        }
        
        for file_name, file_path in dashboard_files.items():
            result['dashboard_files'][file_name] = {
                'exists': os.path.exists(file_path),
                'path': file_path
            }
        
        # Verificar archivos del dashboard de trabajador
        trabajador_files = {
            'index-trabajador.html': os.path.join(vista_path, 'index-trabajador.html'),
            'dashboard-trabajador.css': os.path.join(vista_path, 'index-trabajador.css'),
            'dashboard-trabajador.js': os.path.join(vista_path, 'index-trabajador.js')
        }

        result['trabajador_files'] = {}
        for file_name, file_path in trabajador_files.items():
            result['trabajador_files'][file_name] = {
                'exists': os.path.exists(file_path),
                'path': file_path
            }

        return jsonify(result)
# ...existing code...
        
        # Verificar específicamente los archivos del dashboard
        vista_path = os.path.join(base_dir, '..', 'vista')
        dashboard_files = {
            'dashboard-agricultor.html': os.path.join(vista_path, 'dashboard-agricultor.html'),
            'styles.css': os.path.join(vista_path, 'styles.css'),
            'script.js': os.path.join(vista_path, 'script.js')
        }
        
        for file_name, file_path in dashboard_files.items():
            result['dashboard_files'][file_name] = {
                'exists': os.path.exists(file_path),
                'path': file_path
            }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'base_dir': os.path.dirname(os.path.abspath(__file__))
        })
        
# ================================================================
# FUNCIONES AUXILIARES
# ================================================================

def validate_email(email):
    """Valida formato de email"""
    pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return re.match(pattern, email) is not None

def validate_name(name):
    """Valida que el nombre solo contenga letras y espacios"""
    pattern = r'^[A-Za-zÀ-ÿ\s]+$'
    return re.match(pattern, name) is not None

def hash_password(password):
    """Hashea la contraseña usando bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password, hashed):
    """Verifica una contraseña contra su hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

# ================================================================
# RUTA DE REGISTRO MEJORADA
# ================================================================

@app.route('/registro.py', methods=['POST'])
def registro():
    """Procesa el registro de usuarios (Trabajador o Agricultor)"""
    
    try:
        # Obtener y limpiar datos del formulario
        nombre = request.form.get('nombre', '').strip()
        apellido = request.form.get('apellido', '').strip()
        correo = request.form.get('correo', '').strip()
        telefono = request.form.get('telefono', '').strip() if request.form.get('telefono') else None
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        rol = request.form.get('rol', '').strip()
        
        # Debug: Imprimir información del registro
        print(f"=== NUEVO REGISTRO ===")
        print(f"Nombre: {nombre}")
        print(f"Apellido: {apellido}")
        print(f"Correo: {correo}")
        print(f"Rol recibido: '{rol}'")
        print(f"Tipo de rol: {type(rol)}")
        
        # Validación de campos obligatorios
        errores = []
        
        if not nombre:
            errores.append('El nombre es obligatorio')
        elif not validate_name(nombre):
            errores.append('El nombre solo puede contener letras y espacios')
        
        if not apellido:
            errores.append('El apellido es obligatorio')
        elif not validate_name(apellido):
            errores.append('El apellido solo puede contener letras y espacios')
        
        if not correo:
            errores.append('El correo es obligatorio')
        elif not validate_email(correo):
            errores.append('El formato del correo electrónico no es válido')
        
        if not password:
            errores.append('La contraseña es obligatoria')
        elif len(password) < 8:
            errores.append('La contraseña debe tener mínimo 8 caracteres')
        
        if not confirm_password:
            errores.append('Debe confirmar la contraseña')
        elif password != confirm_password:
            errores.append('Las contraseñas no coinciden')
        
        if not rol:
            errores.append('No se pudo determinar el tipo de usuario')
        elif rol not in ['Trabajador', 'Agricultor']:
            errores.append('Tipo de usuario no válido')
        
        # Validar términos y condiciones
        if not request.form.get('terminos'):
            errores.append('Debe aceptar los términos y condiciones')
        
        # Si hay errores, mostrarlos
        if errores:
            print(f"Errores encontrados: {errores}")
            raise Exception('<br>'.join(errores))
        
        # Verificar si el email ya existe
        existing_user = execute_query(
            "SELECT ID_Usuario FROM Usuario WHERE Correo = %s",
            (correo,),
            fetch_one=True
        )
        
        if existing_user:
            # Determinar el enlace de login según el rol
            login_link = '/vista/login-trabajador.html' if rol == 'Agricultor' else '/vista/login-trabajador.html'
            raise Exception(f'El correo electrónico ya está registrado. <a href="{login_link}">¿Ya tienes cuenta? Inicia sesión aquí</a>')
        
        # Encriptar contraseña
        hashed_password = hash_password(password)
        
        # Insertar usuario en la base de datos
        user_id = execute_query(
            "INSERT INTO Usuario (Nombre, Apellido, Correo, Contrasena, Telefono, Rol) VALUES (%s, %s, %s, %s, %s, %s)",
            (nombre, apellido, correo, hashed_password, telefono, rol)
        )
        
        print(f"Usuario registrado exitosamente con ID: {user_id}")
        
        # VERIFICAR QUE EL ARCHIVO DE LOGIN EXISTE ANTES DE REDIRIGIR
        base_dir = os.path.dirname(os.path.abspath(__file__))
        
        if rol == 'Trabajador':
            login_file = 'login-trabajador.html'
            tipo_usuario = 'trabajador'
            print("🔄 Preparando redirección a login de TRABAJADOR")
        elif rol == 'Agricultor':
            login_file = 'login-trabajador.html'
            tipo_usuario = 'agricultor'
            print("🔄 Preparando redirección a login de AGRICULTOR")
        else:
            print(f"❌ Rol no reconocido: '{rol}'")
            login_file = 'login-trabajador.html'
            tipo_usuario = 'trabajador'
        
        # Verificar que el archivo existe
        login_file_path = os.path.join(base_dir, '..', 'vista', login_file)
        login_file_path = os.path.abspath(login_file_path)
        
        if not os.path.exists(login_file_path):
            print(f"❌ ARCHIVO DE LOGIN NO EXISTE: {login_file_path}")
            # Si no existe el archivo específico, usar el genérico
            login_file = 'login-trabajador.html'
            tipo_usuario = 'trabajador'
        else:
            print(f"✅ Archivo de login encontrado: {login_file_path}")
        
        redirect_url = f'/vista/{login_file}'
        
        mensaje_exito = f"¡Registro exitoso {nombre}! Tu cuenta como {tipo_usuario} fue creada. Ahora puedes iniciar sesión con tu correo y contraseña."
        
        print(f"✅ Mensaje: {mensaje_exito}")
        print(f"🎯 Redirigiendo a: {redirect_url}")
        
        # Redireccionar con mensaje de éxito
        return redirect(f"{redirect_url}?message={quote(mensaje_exito)}&type=success")
        
    except Exception as e:
        print(f"❌ Error en registro: {str(e)}")
        
        # Determinar la URL de retorno según el rol
        return_url = '/vista/registro-trabajador.html'  # Por defecto
        
        if rol:
            if rol == 'Agricultor':
                # Verificar que existe el archivo de registro de agricultor
                base_dir = os.path.dirname(os.path.abspath(__file__))
                reg_file_path = os.path.join(base_dir, '..', 'vista', 'registro-agricultor.html')
                if os.path.exists(reg_file_path):
                    return_url = '/vista/registro-agricultor.html'
                else:
                    print(f"❌ Archivo de registro de agricultor no existe: {reg_file_path}")
                    return_url = '/vista/registro-trabajador.html'
            else:
                return_url = '/vista/registro-trabajador.html'
        else:
            # Si no hay rol, usar el referer para determinar dónde regresar
            referer = request.headers.get('Referer', '')
            if 'registro-agricultor.html' in referer:
                return_url = '/vista/registro-agricultor.html'
        
        print(f"🔙 Redirigiendo con error a: {return_url}")
        
        # Redireccionar de vuelta al formulario con el mensaje de error
        error_message = quote(str(e))
        return redirect(f"{return_url}?message={error_message}&type=error")

# ================================================================
# RUTA DE LOGIN MEJORADA
# ================================================================

@app.route('/login.py', methods=['POST'])
def login():
    """Procesa el login de usuarios"""
    
    try:
        # Recoger datos del formulario
        email = request.form.get('email', '').strip()
        password = request.form.get('contrasena', '')
        
        print(f"🔐 Intento de login para: {email}")
        
        # Validaciones básicas
        if not email or not password:
            raise Exception('Por favor completa todos los campos.')
        
        # Buscar usuario en la base de datos
        user = execute_query(
            """SELECT u.ID_Usuario, u.Nombre, u.Apellido, u.Correo, u.Contrasena, u.Rol, u.Estado, u.Telefono
               FROM Usuario u 
               WHERE u.Correo = %s OR u.Telefono = %s""",
            (email, email),
            fetch_one=True
        )
        
        if not user:
            raise Exception('Credenciales incorrectas.')
        
        # Verificar contraseña
        if not verify_password(password, user['Contrasena']):
            raise Exception('Credenciales incorrectas.')
        
        # Verificar que el usuario esté activo
        if user['Estado'] != 'Activo':
            raise Exception('Tu cuenta está inactiva. Contacta al administrador.')
        
        # Crear sesión con todos los datos necesarios
        session['user_id'] = user['ID_Usuario']
        session['username'] = user['Correo']  # Usamos el email como username
        session['first_name'] = user['Nombre']
        session['last_name'] = user['Apellido']
        session['email'] = user['Correo']
        session['user_role'] = user['Rol']
        session['user_name'] = f"{user['Nombre']} {user['Apellido']}"
        session['telefono'] = user.get('Telefono', '')
        
        print(f"✅ Login exitoso para: {user['Nombre']} {user['Apellido']} - Rol: {user['Rol']}")
        print(f"📊 Datos de sesión guardados: ID={user['ID_Usuario']}, Role={user['Rol']}")
        
        # Redireccionar según el rol - ACTUALIZADO PARA USAR LOS NUEVOS DASHBOARDS
        base_dir = os.path.dirname(os.path.abspath(__file__))
        
        if user['Rol'] == 'Agricultor':
            # Para agricultor, usar el nuevo dashboard separado
            dashboard_file = 'index-agricultor.html'
            redirect_url = '/vista/index-agricultor.html'
            
            dashboard_path = os.path.join(base_dir, '..', 'vista', dashboard_file)
            if not os.path.exists(dashboard_path):
                print(f"❌ Dashboard de agricultor no existe: {dashboard_path}")
                redirect_url = '/vista/index-agricultor.html'
            
        elif user['Rol'] == 'Trabajador':
            redirect_url = '/vista/index-trabajador.html'
            
        elif user['Rol'] == 'Administrador':
            redirect_url = '/vista/index-administrador.html'
            
        else:
            raise Exception('Rol de usuario no válido.')
        
        print(f"🎯 Redirigiendo a: {redirect_url}")
        return redirect(redirect_url)
        
    except Exception as e:
        print(f"❌ Error en login: {str(e)}")
        
        # Redireccionar con error - determinar la página de login correcta
        referer = request.headers.get('Referer', '')
        if 'login-trabajador.html' in referer:
            login_page = '/vista/login-trabajador.html'
        else:
            login_page = '/vista/login-trabajador.html'
        
        error_message = quote(str(e))
        return redirect(f"{login_page}?message={error_message}&type=error")



@app.route('/get_user_data.py', methods=['GET'])
def get_user_data():
    """API para obtener datos del usuario logueado (mantener compatibilidad)"""
    
    # Verificar que el usuario esté logueado
    if 'user_id' not in session:
        return jsonify({
            'error': True,
            'message': 'Usuario no autenticado'
        }), 401
    
    # Devolver datos del usuario
    return jsonify({
        'error': False,
        'data': {
            'user_id': session['user_id'],
            'user_name': session['user_name'],
            'user_email': session['email'],
            'user_role': session['user_role'],
            'first_name': session['first_name'],
            'last_name': session['last_name'],
            'username': session['username'],
            'telefono': session.get('telefono', '')
        }
    })

# ================================================================
# RUTAS DE DASHBOARD ACTUALIZADAS
# ================================================================

@app.route('/dashboard-agricultor')
def dashboard_agricultor():
    """Ruta para el dashboard del agricultor"""
    if 'user_id' not in session:
        print("❌ Usuario no autenticado, redirigiendo a login")
        return redirect('/vista/login-trabajador.html')
    
    # Verificar que el usuario sea agricultor
    if session.get('user_role') != 'Agricultor':
        print(f"❌ Usuario no es agricultor: {session.get('user_role')}")
        return redirect('/vista/index-trabajador.html')
    
    print(f"✅ Acceso autorizado al dashboard de agricultor: {session.get('user_name')}")
    return redirect('/vista/dashboard-agricultor.html')

@app.route('/dashboard-trabajador')
def dashboard_trabajador():
    """Ruta para el dashboard del trabajador"""
    if 'user_id' not in session:
        print("❌ Usuario no autenticado, redirigiendo a login")
        return redirect('/vista/login-trabajador.html')
    
    # Verificar que el usuario sea trabajador
    if session.get('user_role') != 'Trabajador':
        print(f"❌ Usuario no es trabajador: {session.get('user_role')}")
        return redirect('/vista/index-agricultor.html')
    
    print(f"✅ Acceso autorizado al dashboard de trabajador: {session.get('user_name')}")
    return redirect('/vista/index-trabajador.html')

@app.route('/dashboard-admin')
def dashboard_admin():
    """Ruta para el dashboard del administrador"""
    if 'user_id' not in session:
        print("❌ Usuario no autenticado, redirigiendo a login")
        return redirect('/vista/login-trabajador.html')
    
    # Verificar que el usuario sea administrador
    if session.get('user_role') != 'Administrador':
        print(f"❌ Usuario no es administrador: {session.get('user_role')}")
        return redirect('/vista/index-trabajador.html')
    
    print(f"✅ Acceso autorizado al dashboard de administrador: {session.get('user_name')}")
    return redirect('/vista/index-administrador.html')


# ================================================================
# RUTA DE LOGOUT MEJORADA
# ================================================================

@app.route('/logout', methods=['POST'])
def logout():
    """Cierra la sesión del usuario (nueva ruta)"""
    try:
        user_name = session.get('user_name', 'Desconocido')
        print(f"👋 Cerrando sesión para usuario: {user_name}")
        
        # Limpiar toda la sesión
        session.clear()
        
        return jsonify({
            'success': True, 
            'message': 'Sesión cerrada correctamente'
        })
        
    except Exception as e:
        print(f"❌ Error cerrando sesión: {str(e)}")
        return jsonify({
            'success': False, 
            'error': str(e)
        }), 500

@app.route('/logout.py', methods=['POST', 'GET'])
def logout_legacy():
    """Cierra la sesión del usuario (ruta legacy para compatibilidad)"""
    
    print(f"👋 Cerrando sesión para usuario: {session.get('user_name', 'Desconocido')}")
    
    # Limpiar sesión
    session.clear()
    
    # Devolver respuesta JSON
    return jsonify({
        'success': True,
        'message': 'Sesión cerrada correctamente'
    })

# ================================================================
# VERIFICACIÓN DE SESIÓN
# ================================================================

@app.route('/check_session', methods=['GET'])
def check_session():
    """Verifica si hay una sesión activa"""
    try:
        if 'user_id' in session:
            return jsonify({
                'authenticated': True,
                'user_id': session['user_id'],
                'user_role': session.get('user_role'),
                'user_name': session.get('user_name')
            })
        else:
            return jsonify({
                'authenticated': False
            })
    except Exception as e:
        return jsonify({
            'authenticated': False,
            'error': str(e)
        }), 500

@app.route('/validate_session', methods=['GET'])
def validate_session():
    """Valida que la sesión sea válida y el usuario exista"""
    try:
        if 'user_id' not in session:
            return jsonify({
                'valid': False,
                'message': 'No hay sesión activa'
            }), 401
        
        # Verificar que el usuario aún existe en la base de datos
        user = execute_query(
            "SELECT ID_Usuario, Nombre, Apellido, Rol, Estado FROM Usuario WHERE ID_Usuario = %s",
            (session['user_id'],),
            fetch_one=True
        )
        
        if not user:
            # Usuario no existe, limpiar sesión
            session.clear()
            return jsonify({
                'valid': False,
                'message': 'Usuario no encontrado'
            }), 401
        
        if user['Estado'] != 'Activo':
            # Usuario inactivo, limpiar sesión
            session.clear()
            return jsonify({
                'valid': False,
                'message': 'Usuario inactivo'
            }), 401
        
        return jsonify({
            'valid': True,
            'user': {
                'id': user['ID_Usuario'],
                'nombre': user['Nombre'],
                'apellido': user['Apellido'],
                'rol': user['Rol']
            }
        })
        
    except Exception as e:
        print(f"❌ Error validando sesión: {str(e)}")
        return jsonify({
            'valid': False,
            'error': str(e)
        }), 500

# ================================================================
# RUTAS ADICIONALES PARA REDIRECCIONES
# ================================================================

@app.route('/')
def index():
    """Ruta principal - redirige al login de trabajador"""
    return redirect('/vista/login-trabajador.html')

@app.route('/registro-trabajador')
def registro_trabajador():
    """Redirige al registro de trabajador"""
    return redirect('/vista/registro-trabajador.html')

@app.route('/registro-agricultor')
def registro_agricultor():
    """Redirige al registro de agricultor"""
    return redirect('/vista/registro-agricultor.html')

@app.route('/login-trabajador')
def login_trabajador():
    """Redirige al login de trabajador"""
    return redirect('/vista/login-trabajador.html')

@app.route('/login-agricultor')
def login_agricultor():
    """Redirige al login de agricultor"""
    return redirect('/vista/login-trabajador.html')

# ================================================================
# RUTA DE PRUEBA MEJORADA
# ================================================================

@app.route('/test', methods=['GET'])
def test():
    """Ruta de prueba para verificar que el servidor funciona"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        
        return jsonify({
            'message': 'Servidor Flask funcionando correctamente',
            'status': 'OK',
            'base_directory': base_dir,
            'session_active': 'user_id' in session,
            'session_user': session.get('user_name', 'No logueado'),
            'rutas_disponibles': [
                '/test',
                '/check_files',
                '/check_session',
                '/validate_session',
                '/get_user_session',
                '/get_user_data.py',
                '/registro.py',
                '/login.py',
                '/logout',
                '/logout.py',
                '/dashboard-agricultor',
                '/dashboard-trabajador', 
                '/dashboard-admin',
                '/vista/<archivo>',
                '/css/<archivo>',
                '/assent/css/<archivo>',
                '/img/<archivo>',
                '/assent/img/<archivo>',
                '/js/<archivo>',
                '/assent/js/<archivo>',
                '/styles.css',
                '/script.js'
            ],
            'dashboard_files': {
                'html': '/vista/dashboard-agricultor.html',
                'css': '/styles.css',
                'js': '/script.js'
            }
        })
    except Exception as e:
        return jsonify({
            'message': 'Error en el servidor',
            'status': 'ERROR',
            'error': str(e)
        }), 500

# ================================================================
# MANEJO DE ERRORES MEJORADO
# ================================================================

@app.errorhandler(404)
def not_found(error):
    """Maneja errores 404 con más información"""
    requested_url = request.url
    print(f"❌ Error 404: Página no encontrada - {requested_url}")
    
    # Si es una solicitud de archivo HTML, intentar sugerir alternativas
    if '.html' in requested_url:
        print(f"🔍 Intentando encontrar alternativas para: {requested_url}")
        
        # Obtener información de archivos disponibles
        try:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            vista_path = os.path.join(base_dir, '..', 'vista')
            
            if os.path.exists(vista_path):
                available_files = os.listdir(vista_path)
                html_files = [f for f in available_files if f.endswith('.html')]
                
                return jsonify({
                    'error': True,
                    'message': 'Página no encontrada',
                    'status': 404,
                    'requested_url': requested_url,
                    'suggestion': 'Verifica que el archivo exists en la carpeta vista/',
                    'available_html_files': html_files,
                    'vista_path': vista_path
                }), 404
        except:
            pass
    
    return jsonify({
        'error': True,
        'message': 'Página no encontrada',
        'status': 404,
        'requested_url': requested_url
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """Maneja errores 500"""
    print(f"❌ Error interno del servidor: {error}")
    return jsonify({
        'error': True,
        'message': 'Error interno del servidor',
        'status': 500,
        'details': str(error)
    }), 500

# ================================================================
# MIDDLEWARE PARA LOGS DE SESIÓN
# ================================================================

@app.before_request
def log_request_info():
    """Log información de cada request (solo para debugging)"""
    # Solo loguear requests importantes, no archivos estáticos
    if request.endpoint and not any(static in request.path for static in ['/css/', '/js/', '/img/', '/assent/']):
        print(f"🔍 Request: {request.method} {request.path} | Session: {'✅' if 'user_id' in session else '❌'} | User: {session.get('user_name', 'Anónimo')}")

# ================================================================
# FUNCIONES ADICIONALES DE UTILIDAD
# ================================================================

def require_login(f):
    """Decorador para rutas que requieren autenticación"""
    from functools import wraps
    
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.is_json:
                return jsonify({'error': True, 'message': 'Autenticación requerida'}), 401
            else:
                return redirect('/vista/login-trabajador.html')
        return f(*args, **kwargs)
    return decorated_function

def require_role(required_role):
    """Decorador para rutas que requieren un rol específico"""
    from functools import wraps
    
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                if request.is_json:
                    return jsonify({'error': True, 'message': 'Autenticación requerida'}), 401
                else:
                    return redirect('/vista/login-trabajador.html')
            
            if session.get('user_role') != required_role:
                if request.is_json:
                    return jsonify({'error': True, 'message': 'Permisos insuficientes'}), 403
                else:
                    # Redireccionar a la página apropiada según el rol actual
                    current_role = session.get('user_role', 'Trabajador')
                    if current_role == 'Agricultor':
                        return redirect('/vista/dashboard-agricultor.html')
                    elif current_role == 'Administrador':
                        return redirect('/vista/index-administrador.html')
                    else:
                        return redirect('/vista/index-trabajador.html')
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# ================================================================
# RUTAS PROTEGIDAS DE EJEMPLO (usar los decoradores)
# ================================================================

@app.route('/api/user/profile', methods=['GET'])
@require_login
def get_user_profile():
    """Obtiene el perfil completo del usuario"""
    try:
        user_id = session['user_id']
        
        # Obtener datos completos del usuario desde la base de datos
        user = execute_query(
            """SELECT ID_Usuario, Nombre, Apellido, Correo, Telefono, Rol, 
                      Estado, Fecha_Registro 
               FROM Usuario WHERE ID_Usuario = %s""",
            (user_id,),
            fetch_one=True
        )
        
        if not user:
            return jsonify({'error': True, 'message': 'Usuario no encontrado'}), 404
        
        return jsonify({
            'error': False,
            'user': {
                'id': user['ID_Usuario'],
                'nombre': user['Nombre'],
                'apellido': user['Apellido'],
                'correo': user['Correo'],
                'telefono': user.get('Telefono', ''),
                'rol': user['Rol'],
                'estado': user['Estado'],
                'fecha_registro': user['Fecha_Registro'].isoformat() if user['Fecha_Registro'] else None
            }
        })
        
    except Exception as e:
        print(f"❌ Error obteniendo perfil: {str(e)}")
        return jsonify({'error': True, 'message': str(e)}), 500

@app.route('/api/admin/users', methods=['GET'])
@require_role('Administrador')
def get_all_users():
    """Obtiene todos los usuarios (solo administradores)"""
    try:
        users = execute_query(
            """SELECT ID_Usuario, Nombre, Apellido, Correo, Telefono, Rol, 
                      Estado, Fecha_Registro 
               FROM Usuario ORDER BY Fecha_Registro DESC"""
        )
        
        return jsonify({
            'error': False,
            'users': users
        })
        
    except Exception as e:
        print(f"❌ Error obteniendo usuarios: {str(e)}")
        return jsonify({'error': True, 'message': str(e)}), 500

# ================================================================
# RUTAS ADICIONALES PARA PERFIL - AGREGAR AL FINAL DE TU APP.PY
# ================================================================

# Configuración para subida de archivos (agregar después de app.secret_key)
# Configuración para subida de archivos
base_dir = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(base_dir, '..', 'static', 'uploads')
PROFILE_PHOTOS_FOLDER = os.path.join(UPLOAD_FOLDER, 'profile_photos')
DOCUMENTS_FOLDER = os.path.join(UPLOAD_FOLDER, 'documents')
ALLOWED_EXTENSIONS_IMAGES = {'png', 'jpg', 'jpeg', 'gif'}
ALLOWED_EXTENSIONS_DOCS = {'pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

# Crear la estructura completa de carpetas
try:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    static_dir = os.path.join(base_dir, '..', 'static')
    uploads_dir = os.path.join(static_dir, 'uploads')
    profile_dir = os.path.join(uploads_dir, 'profile_photos')
    docs_dir = os.path.join(uploads_dir, 'documents')
    
    # Crear todas las carpetas
    os.makedirs(static_dir, exist_ok=True)
    os.makedirs(uploads_dir, exist_ok=True)
    os.makedirs(profile_dir, exist_ok=True)
    os.makedirs(docs_dir, exist_ok=True)
    
    print(f"✅ Estructura de carpetas creada:")
    print(f"   📁 {static_dir}")
    print(f"   📁 {uploads_dir}")
    print(f"   📸 {profile_dir}")
    print(f"   📄 {docs_dir}")
    
except Exception as e:
    print(f"❌ Error creando estructura: {e}")

# ⭐ CREAR DIRECTORIOS SI NO EXISTEN - AGREGAR ESTAS LÍNEAS ⭐
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROFILE_PHOTOS_FOLDER, exist_ok=True)
os.makedirs(DOCUMENTS_FOLDER, exist_ok=True)

print(f"✅ Directorios de upload creados:")
print(f"   📁 {UPLOAD_FOLDER}")
print(f"   📸 {PROFILE_PHOTOS_FOLDER}")
print(f"   📄 {DOCUMENTS_FOLDER}")

# Función auxiliar para validar archivos
def allowed_file(filename, allowed_extensions=ALLOWED_EXTENSIONS_IMAGES):
    """Valida si un archivo tiene una extensión permitida"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

def generate_unique_filename(filename):
    """Generar nombre de archivo único"""
    file_extension = filename.rsplit('.', 1)[1].lower()
    unique_name = str(uuid.uuid4()) + '.' + file_extension
    return unique_name

# ================================================================
# RUTAS PARA PERFIL DE TRABAJADOR
# ================================================================

@app.route('/perfil-trabajador')
@app.route('/perfil-trabajador.html')
def perfil_trabajador():
    """Mostrar página de perfil del trabajador"""
    if 'user_id' not in session:
        return redirect('/vista/login-trabajador.html')
    return redirect('/vista/perfil-trabajador.html')

@app.route('/static/<path:filename>')
def serve_static_file(filename):
    """Servir archivos estáticos incluyendo uploads"""
    try:
        # Crear directorio static si no existe
        static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'static')
        static_dir = os.path.abspath(static_dir)
        
        if not os.path.exists(static_dir):
            os.makedirs(static_dir, exist_ok=True)
        
        return send_from_directory(static_dir, filename)
    except Exception as e:
        print(f"Error sirviendo archivo estático: {str(e)}")
        return "Archivo no encontrado", 404

# ================================================================
# RUTAS PARA MANEJO DE FOTOS DE PERFIL
# ================================================================

@app.route('/api/upload-profile-photo', methods=['POST'])
@require_login
def upload_profile_photo():
    """Subir foto de perfil del usuario"""
    try:
        user_id = session['user_id']
        
        if 'profilePhoto' not in request.files:
            return jsonify({'success': False, 'message': 'No se seleccionó ningún archivo'}), 400
        
        file = request.files['profilePhoto']
        
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No se seleccionó ningún archivo'}), 400
        
        # Usar la nueva función allowed_file
        if not allowed_file(file.filename, ALLOWED_EXTENSIONS_IMAGES):
            return jsonify({
                'success': False, 
                'message': 'Formato de archivo no válido. Use PNG, JPG, JPEG o GIF'
            }), 400
        
        # Validar tamaño
        file.seek(0, 2)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({
                'success': False, 
                'message': 'El archivo es muy grande. Tamaño máximo: 5MB'
            }), 400
        
        # Generar nombre único para el archivo
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        unique_filename = f"profile_{user_id}_{uuid.uuid4().hex[:8]}.{file_extension}"
        
        # Guardar en la carpeta correcta
        file_path = os.path.join(PROFILE_PHOTOS_FOLDER, unique_filename)
        file.save(file_path)
        
        # URL relativa para la base de datos
        photo_url = f"/static/uploads/profile_photos/{unique_filename}"
        
        # Actualizar URL_Foto en la tabla Usuario (tu tabla existente)
        execute_query(
            "UPDATE Usuario SET URL_Foto = %s WHERE ID_Usuario = %s",
            (photo_url, user_id)
        )
        
        # Registrar en tabla Anexo para historial (tu tabla existente)
        execute_query(
            """INSERT INTO Anexo (ID_Usuario, Tipo_Archivo, URL_Archivo, Descripcion) 
               VALUES (%s, 'Imagen', %s, 'Foto de perfil')""",
            (user_id, photo_url)
        )
        
        print(f"Foto de perfil actualizada para usuario {user_id}: {photo_url}")
        
        return jsonify({
            'success': True,
            'message': 'Foto de perfil actualizada correctamente',
            'photoUrl': photo_url
        })
        
    except Exception as e:
        print(f"Error subiendo foto de perfil: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# ================================================================
# RUTAS PARA CONFIGURACIÓN DEL TRABAJADOR
# ================================================================

@app.route('/static/uploads/<path:filename>')
def serve_uploaded_file(filename):
    """Servir archivos subidos desde la carpeta de uploads"""
    try:
        # Obtener la ruta absoluta de la carpeta de uploads
        base_dir = os.path.dirname(os.path.abspath(__file__))
        uploads_path = os.path.join(base_dir, '..', 'static', 'uploads')
        uploads_path = os.path.abspath(uploads_path)
        
        # Verificar que el archivo existe
        file_path = os.path.join(uploads_path, filename)
        if not os.path.exists(file_path):
            print(f"❌ Archivo no encontrado: {file_path}")
            return "Archivo no encontrado", 404
        
        print(f"✅ Sirviendo archivo: {file_path}")
        return send_from_directory(uploads_path, filename)
        
    except Exception as e:
        print(f"❌ Error sirviendo archivo: {str(e)}")
        return f"Error sirviendo archivo: {str(e)}", 500

# ================================================================
# la función para subir documentos usando tu tabla Anexo
# ================================================================

@app.route('/api/upload-document', methods=['POST'])
@require_login
def upload_document():
    """Subir documento usando tabla Anexo existente"""
    try:
        user_id = session['user_id']
        
        if 'document' not in request.files:
            return jsonify({'success': False, 'message': 'No se seleccionó ningún archivo'}), 400
        
        file = request.files['document']
        doc_type = request.form.get('docType', 'Documento')
        
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No se seleccionó ningún archivo'}), 400
        
        # Verificar tipo de archivo
        if not allowed_file(file.filename, ALLOWED_EXTENSIONS_DOCS):
            return jsonify({'success': False, 'message': 'Formato de archivo no válido'}), 400
        
        # Verificar tamaño
        file.seek(0, 2)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({'success': False, 'message': 'Archivo muy grande. Máximo 5MB'}), 400
        
        # Generar nombre único
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        unique_filename = f"doc_{user_id}_{uuid.uuid4().hex[:8]}.{file_extension}"
        
        # Guardar archivo
        file_path = os.path.abspath(os.path.join(DOCUMENTS_FOLDER, unique_filename))
        file.save(file_path)
        
        # URL relativa
        doc_url = f"/static/uploads/documents/{unique_filename}"
        
        # Guardar en tabla Anexo (tu tabla existente)
        execute_query(
            """INSERT INTO Anexo (ID_Usuario, Tipo_Archivo, URL_Archivo, Descripcion) 
               VALUES (%s, 'Documento', %s, %s)""",
            (user_id, doc_url, f"{doc_type} - {file.filename}")
        )
        
        print(f"Documento subido: {doc_url}")
        
        return jsonify({
            'success': True,
            'message': 'Documento subido correctamente',
            'documentUrl': doc_url,
            'fileName': file.filename
        })
        
    except Exception as e:
        print(f"Error subiendo documento: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# ================================================================
#  función para obtener documentos subidos
# ================================================================

@app.route('/api/get-documents', methods=['GET'])
@require_login
def get_documents():
    """Obtener documentos del usuario desde tabla Anexo"""
    try:
        user_id = session['user_id']
        
        documents = execute_query(
            """SELECT ID_Anexo, Tipo_Archivo, URL_Archivo, Descripcion, Fecha_Subida
               FROM Anexo 
               WHERE ID_Usuario = %s AND Tipo_Archivo = 'Documento'
               ORDER BY Fecha_Subida DESC""",
            (user_id,)
        )
        
        return jsonify({
            'success': True,
            'documents': documents or []
        })
        
    except Exception as e:
        print(f"Error obteniendo documentos: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# ================================================================
# RUTA PARA OBTENER PERFIL COMPLETO DE OTRO USUARIO
# ================================================================

@app.route('/api/get-user-profile/<int:user_id>')
def get_user_profile_complete(user_id):
    """Obtener perfil completo de un usuario (para visualización)"""
    try:
        # Verificar que el usuario solicitado existe y está activo
        user = execute_query(
            """SELECT ID_Usuario, Nombre, Apellido, Correo, Telefono, URL_Foto, 
                      Red_Social, Rol, Estado, Fecha_Registro
               FROM Usuario 
               WHERE ID_Usuario = %s AND Estado = 'Activo'""",
            (user_id,),
            fetch_one=True
        )
        
        if not user:
            return jsonify({
                'success': False, 
                'message': 'Usuario no encontrado o inactivo'
            }), 404
        
        # Información adicional según el rol
        additional_info = {}
        
        if user['Rol'] == 'Trabajador':
            # Obtener habilidades
            habilidades = execute_query(
                "SELECT Nombre, Clasificacion FROM Habilidad WHERE ID_Trabajador = %s",
                (user_id,)
            ) or []
            
            # Obtener experiencias
            experiencias = execute_query(
                """SELECT Fecha_Inicio, Fecha_Fin, Ubicacion, Observacion 
                   FROM Experiencia WHERE ID_Trabajador = %s 
                   ORDER BY Fecha_Inicio DESC""",
                (user_id,)
            ) or []
            
            additional_info = {
                'habilidades': habilidades,
                'experiencias': experiencias
            }
            
        elif user['Rol'] == 'Agricultor':
            # Obtener predios
            predios = execute_query(
                """SELECT Nombre_Finca, Ubicacion_Latitud, Ubicacion_Longitud, 
                          Descripcion FROM Predio WHERE ID_Usuario = %s""",
                (user_id,)
            ) or []
            
            # Obtener ofertas activas
            ofertas = execute_query(
                """SELECT Titulo, Descripcion, Pago_Ofrecido, Fecha_Publicacion 
                   FROM Oferta_Trabajo 
                   WHERE ID_Agricultor = %s AND Estado = 'Abierta' 
                   ORDER BY Fecha_Publicacion DESC LIMIT 5""",
                (user_id,)
            ) or []
            
            additional_info = {
                'predios': predios,
                'ofertas_activas': ofertas
            }
        
        # Calcular calificación promedio
        calificacion_info = execute_query(
            """SELECT AVG(CAST(Puntuacion AS UNSIGNED)) as promedio, 
                      COUNT(*) as total_calificaciones
               FROM Calificacion 
               WHERE ID_Usuario_Receptor = %s""",
            (user_id,),
            fetch_one=True
        )
        
        calificacion_promedio = 0
        total_calificaciones = 0
        
        if calificacion_info:
            calificacion_promedio = float(calificacion_info['promedio']) if calificacion_info['promedio'] else 0
            total_calificaciones = calificacion_info['total_calificaciones'] or 0
        
        return jsonify({
            'success': True,
            'user': {
                'id': user['ID_Usuario'],
                'nombre_completo': f"{user['Nombre']} {user['Apellido']}",
                'nombre': user['Nombre'],
                'apellido': user['Apellido'],
                'correo': user['Correo'],
                'telefono': user.get('Telefono', ''),
                'rol': user['Rol'],
                'foto_url': user.get('URL_Foto'),
                'red_social': user.get('Red_Social', ''),
                'fecha_registro': user['Fecha_Registro'].isoformat() if user['Fecha_Registro'] else None,
                'calificacion_promedio': calificacion_promedio,
                'total_calificaciones': total_calificaciones,
                **additional_info
            }
        })
        
    except Exception as e:
        print(f"Error obteniendo perfil de usuario: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# ================================================================
# RUTA DE PRUEBA PARA CREAR SESIÓN (TEMPORAL - PARA TESTING)
# ================================================================

@app.route('/test-session')
def test_session():
    """Crear sesión de prueba - ELIMINAR EN PRODUCCIÓN"""
    # Buscar el primer usuario activo en la base de datos
    user = execute_query(
        "SELECT * FROM Usuario WHERE Estado = 'Activo' LIMIT 1",
        fetch_one=True
    )
    
    if user:
        session['user_id'] = user['ID_Usuario']
        session['username'] = user['Correo']
        session['first_name'] = user['Nombre']
        session['last_name'] = user['Apellido']
        session['email'] = user['Correo']
        session['user_role'] = user['Rol']
        session['user_name'] = f"{user['Nombre']} {user['Apellido']}"
        session['telefono'] = user.get('Telefono', '')
        
        return f"""
        <h2>Sesión de prueba creada</h2>
        <p><strong>Usuario:</strong> {user['Nombre']} {user['Apellido']}</p>
        <p><strong>Email:</strong> {user['Correo']}</p>
        <p><strong>Rol:</strong> {user['Rol']}</p>
        <p><strong>ID:</strong> {user['ID_Usuario']}</p>
        <br>
        <a href="/vista/perfil-trabajador.html" style="background: #28a745; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">
            Ir al Perfil
        </a>
        """
    else:
        return "No hay usuarios en la base de datos. Registra un usuario primero."

# ================================================================
# RUTAS PARA CONFIGURACIÓN DEL TRABAJADOR - SIN TABLA ADICIONAL
# ================================================================

@app.route('/api/change-password', methods=['POST'])
@require_login
def change_password():
   """Cambiar contraseña del usuario"""
   try:
       data = request.get_json()
       current_password = data.get('currentPassword')
       new_password = data.get('newPassword')
       
       if not current_password or not new_password:
           return jsonify({'success': False, 'message': 'Faltan datos requeridos'}), 400
       
       # Obtener usuario actual
       user = execute_query(
           "SELECT Contrasena FROM Usuario WHERE ID_Usuario = %s",
           (session['user_id'],),
           fetch_one=True
       )
       
       if not user:
           return jsonify({'success': False, 'message': 'Usuario no encontrado'}), 404
       
       # Verificar contraseña actual
       if not verify_password(current_password, user['Contrasena']):
           return jsonify({'success': False, 'message': 'Contraseña actual incorrecta'}), 400
       
       # Hashear nueva contraseña
       hashed_new_password = hash_password(new_password)
       
       # Actualizar en base de datos
       execute_query(
           "UPDATE Usuario SET Contrasena = %s WHERE ID_Usuario = %s",
           (hashed_new_password, session['user_id'])
       )
       
       print(f"Contraseña actualizada para usuario ID: {session['user_id']}")
       
       return jsonify({
           'success': True,
           'message': 'Contraseña actualizada correctamente'
       })
       
   except Exception as e:
       print(f"Error cambiando contraseña: {str(e)}")
       return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/update-notification-settings', methods=['POST'])
@require_login
def update_notification_settings():
   """Actualizar configuración de notificaciones usando tabla Usuario"""
   try:
       import json
       
       data = request.get_json()
       user_id = session['user_id']
       
       # Obtener configuraciones actuales
       current_user = execute_query(
           "SELECT Configuraciones FROM Usuario WHERE ID_Usuario = %s",
           (user_id,),
           fetch_one=True
       )
       
       # Parsear configuraciones existentes o crear nuevas
       if current_user and current_user.get('Configuraciones'):
           try:
               configuraciones = json.loads(current_user['Configuraciones'])
           except:
               configuraciones = {}
       else:
           configuraciones = {}
       
       # Actualizar configuración de notificaciones
       configuraciones['notificaciones'] = {
           'emailNotifications': data.get('emailNotifications', True),
           'emailUpdates': data.get('emailUpdates', True),
           'whatsappNotifications': data.get('whatsappNotifications', False),
           'whatsappUrgent': data.get('whatsappUrgent', False)
       }
       
       # Actualizar teléfono y configuraciones
       whatsapp_number = data.get('whatsappNumber', '').strip()
       
       execute_query(
           """UPDATE Usuario 
              SET Telefono = %s, Configuraciones = %s
              WHERE ID_Usuario = %s""",
           (whatsapp_number if whatsapp_number else None, 
            json.dumps(configuraciones), 
            user_id)
       )
       
       print(f"Configuración de notificaciones actualizada para usuario ID: {user_id}")
       
       return jsonify({
           'success': True,
           'message': 'Configuración de notificaciones guardada'
       })
       
   except Exception as e:
       print(f"Error actualizando notificaciones: {str(e)}")
       return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/update-preferences', methods=['POST'])
@require_login
def update_preferences():
   """Actualizar preferencias del usuario usando tabla Usuario"""
   try:
       import json
       
       data = request.get_json()
       user_id = session['user_id']
       
       # Obtener configuraciones actuales
       current_user = execute_query(
           "SELECT Configuraciones FROM Usuario WHERE ID_Usuario = %s",
           (user_id,),
           fetch_one=True
       )
       
       # Parsear configuraciones existentes o crear nuevas
       if current_user and current_user.get('Configuraciones'):
           try:
               configuraciones = json.loads(current_user['Configuraciones'])
           except:
               configuraciones = {}
       else:
           configuraciones = {}
       
       # Actualizar preferencias
       configuraciones['preferencias'] = {
           'language': data.get('language', 'es'),
           'theme': data.get('theme', 'light'),
           'timezone': data.get('timezone', 'America/Bogota')
       }
       
       # Guardar en base de datos
       execute_query(
           """UPDATE Usuario 
              SET Configuraciones = %s
              WHERE ID_Usuario = %s""",
           (json.dumps(configuraciones), user_id)
       )
       
       print(f"Preferencias actualizadas para usuario ID: {user_id}")
       
       return jsonify({
           'success': True,
           'message': 'Preferencias guardadas correctamente'
       })
       
   except Exception as e:
       print(f"Error actualizando preferencias: {str(e)}")
       return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/delete-account', methods=['DELETE'])
@require_login
def delete_account():
   """Eliminar cuenta del usuario"""
   try:
       data = request.get_json()
       password = data.get('password')
       user_id = session['user_id']
       
       if not password:
           return jsonify({'success': False, 'message': 'Contraseña requerida'}), 400
       
       # Verificar contraseña
       user = execute_query(
           "SELECT Contrasena FROM Usuario WHERE ID_Usuario = %s",
           (user_id,),
           fetch_one=True
       )
       
       if not user or not verify_password(password, user['Contrasena']):
           return jsonify({'success': False, 'message': 'Contraseña incorrecta'}), 400
       
       # Eliminar registros relacionados (en orden de dependencias)
       tables_to_clean = [
           ('Calificacion', ['ID_Usuario_Emisor', 'ID_Usuario_Receptor']),
           ('Mensaje', ['ID_Emisor', 'ID_Receptor']),
           ('Acuerdo_Laboral', ['ID_Trabajador']),
           ('Postulacion', ['ID_Trabajador']),
           ('Anexo', ['ID_Usuario']),
           ('Habilidad', ['ID_Trabajador']),
           ('Experiencia', ['ID_Trabajador']),
           ('Oferta_Trabajo', ['ID_Agricultor']),
           ('Predio', ['ID_Usuario'])
       ]
       
       for table_name, columns in tables_to_clean:
           try:
               if len(columns) == 1:
                   # Una sola columna de referencia
                   execute_query(f"DELETE FROM {table_name} WHERE {columns[0]} = %s", (user_id,))
               else:
                   # Múltiples columnas de referencia
                   conditions = ' OR '.join([f"{col} = %s" for col in columns])
                   params = [user_id] * len(columns)
                   execute_query(f"DELETE FROM {table_name} WHERE {conditions}", params)
                   
           except Exception as table_error:
               print(f"Error eliminando de {table_name}: {str(table_error)}")
               # Continuar con las otras tablas aunque falle una
               continue
       
       # Finalmente, eliminar el usuario
       execute_query("DELETE FROM Usuario WHERE ID_Usuario = %s", (user_id,))
       
       # Limpiar sesión
       session.clear()
       
       print(f"Cuenta eliminada completamente para usuario ID: {user_id}")
       
       return jsonify({
           'success': True,
           'message': 'Cuenta eliminada correctamente'
       })
       
   except Exception as e:
       print(f"Error eliminando cuenta: {str(e)}")
       return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/get-user-settings', methods=['GET'])
@require_login
def get_user_settings():
   """Obtener configuraciones del usuario desde tabla Usuario"""
   try:
       import json
       
       user_id = session['user_id']
       
       # Obtener configuraciones del usuario
       user = execute_query(
           "SELECT Configuraciones, Telefono FROM Usuario WHERE ID_Usuario = %s",
           (user_id,),
           fetch_one=True
       )
       
       if user and user.get('Configuraciones'):
           try:
               configuraciones = json.loads(user['Configuraciones'])
               
               return jsonify({
                   'success': True,
                   'settings': {
                       'notifications': configuraciones.get('notificaciones', {
                           'emailNotifications': True,
                           'emailUpdates': True,
                           'whatsappNotifications': False,
                           'whatsappUrgent': False
                       }),
                       'preferences': configuraciones.get('preferencias', {
                           'language': 'es',
                           'theme': 'light',
                           'timezone': 'America/Bogota'
                       }),
                       'whatsappNumber': user.get('Telefono', '')
                   }
               })
           except:
               # Si hay error parseando JSON, devolver configuración por defecto
               pass
       
       # Devolver configuración por defecto
       return jsonify({
           'success': True,
           'settings': {
               'notifications': {
                   'emailNotifications': True,
                   'emailUpdates': True,
                   'whatsappNotifications': False,
                   'whatsappUrgent': False
               },
               'preferences': {
                   'language': 'es',
                   'theme': 'light',
                   'timezone': 'America/Bogota'
               },
               'whatsappNumber': user.get('Telefono', '') if user else ''
           }
       })
           
   except Exception as e:
       print(f"Error obteniendo configuraciones: {str(e)}")
       return jsonify({'success': False, 'message': str(e)}), 500

# ================================================================
# SIMULACIÓN DE DATOS DE REDES SOCIALES
# ================================================================

# Usuarios simulados de Google (para demostración)
GOOGLE_USERS_DEMO = {
    "demo1": {
        "id": "google_123456",
        "email": "usuario.demo1@gmail.com",
        "given_name": "Juan",
        "family_name": "Pérez",
        "picture": "/static/uploads/profile_photos/default_google.jpg"
    },
    "demo2": {
        "id": "google_789012",
        "email": "maria.demo2@gmail.com",
        "given_name": "María",
        "family_name": "García",
        "picture": "/static/uploads/profile_photos/default_google2.jpg"
    }
}

# Usuarios simulados de Facebook (para demostración)
FACEBOOK_USERS_DEMO = {
    "demo1": {
        "id": "facebook_345678",
        "email": "usuario.demo1@outlook.com",
        "first_name": "Carlos",
        "last_name": "López",
        "picture": "/static/uploads/profile_photos/default_facebook.jpg"
    },
    "demo2": {
        "id": "facebook_901234",
        "email": "ana.demo2@hotmail.com",
        "first_name": "Ana",
        "last_name": "Martínez",
        "picture": "/static/uploads/profile_photos/default_facebook2.jpg"
    }
}

# ================================================================
# FUNCIONES AUXILIARES
# ================================================================

def generate_demo_password(email, provider):
    """Genera contraseña para usuarios demo"""
    combined = f"{email}_{provider}_{uuid.uuid4()}"
    return hashlib.sha256(combined.encode()).hexdigest()[:50]

def create_demo_user(user_data, provider, rol='Trabajador'):
    """Crea un usuario desde datos simulados"""
    try:
        # Hash de contraseña temporal
        from app import hash_password
        temp_password = hash_password(f"{user_data['email']}_social_{provider}")
        
        # Obtener nombres según el proveedor
        if provider == 'google':
            nombre = user_data.get('given_name', '')
            apellido = user_data.get('family_name', '')
        else:  # facebook
            nombre = user_data.get('first_name', '')
            apellido = user_data.get('last_name', '')
        
        # URL de foto por defecto
        foto_url = user_data.get('picture', f'/static/uploads/profile_photos/default_{provider}.jpg')
        
        # Insertar en base de datos
        user_id = execute_query(
            """INSERT INTO Usuario (Nombre, Apellido, Correo, Contrasena, URL_Foto, 
                                   Red_Social, Rol, Estado) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, 'Activo')""",
            (
                nombre,
                apellido,
                user_data['email'],
                temp_password,
                foto_url,
                f"{provider}:{user_data['id']}",
                rol
            )
        )
        
        print(f"Usuario demo creado desde {provider}: {user_data['email']}")
        return user_id
        
    except Exception as e:
        print(f"Error creando usuario demo: {str(e)}")
        return None

# ================================================================
# RUTAS PARA SIMULACIÓN DE GOOGLE
# ================================================================

@app.route('/auth/google/demo')
def google_demo():
    """Página de selección de usuario demo de Google"""
    try:
        rol = request.args.get('rol', 'Trabajador')
        session['oauth_rol'] = rol
        
        # Generar página HTML simple para seleccionar usuario demo
        html_content = f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Demo Google - AgroMatch</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0;
                }}
                .demo-container {{
                    background: white;
                    padding: 40px;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    max-width: 500px;
                    width: 90%;
                    text-align: center;
                }}
                .demo-header {{
                    margin-bottom: 30px;
                }}
                .demo-header h2 {{
                    color: #333;
                    margin-bottom: 10px;
                }}
                .demo-header p {{
                    color: #666;
                    margin-bottom: 5px;
                }}
                .role-badge {{
                    background: #4CAF50;
                    color: white;
                    padding: 5px 15px;
                    border-radius: 20px;
                    font-size: 14px;
                    font-weight: 600;
                }}
                .user-list {{
                    margin: 30px 0;
                }}
                .demo-user {{
                    display: flex;
                    align-items: center;
                    padding: 15px;
                    margin: 10px 0;
                    background: #f8f9fa;
                    border-radius: 10px;
                    border: 2px solid transparent;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }}
                .demo-user:hover {{
                    border-color: #4285f4;
                    background: #e3f2fd;
                }}
                .user-avatar {{
                    width: 50px;
                    height: 50px;
                    background: #4285f4;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 18px;
                    margin-right: 15px;
                }}
                .user-info {{
                    flex: 1;
                    text-align: left;
                }}
                .user-name {{
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 3px;
                }}
                .user-email {{
                    color: #666;
                    font-size: 14px;
                }}
                .cancel-btn {{
                    background: #6c757d;
                    color: white;
                    border: none;
                    padding: 12px 25px;
                    border-radius: 8px;
                    cursor: pointer;
                    text-decoration: none;
                    display: inline-block;
                    margin-top: 20px;
                    transition: background 0.3s ease;
                }}
                .cancel-btn:hover {{
                    background: #5a6268;
                }}
                .google-logo {{
                    color: #4285f4;
                    font-size: 24px;
                    margin-right: 10px;
                }}
            </style>
        </head>
        <body>
            <div class="demo-container">
                <div class="demo-header">
                    <h2><i class="fab fa-google google-logo"></i>Simulación Google OAuth</h2>
                    <p>Registro como: <span class="role-badge">{rol}</span></p>
                    <p>Selecciona un usuario demo para continuar</p>
                </div>
                
                <div class="user-list">
        """
        
        # Agregar usuarios demo
        for demo_id, user_data in GOOGLE_USERS_DEMO.items():
            initials = f"{user_data['given_name'][0]}{user_data['family_name'][0]}"
            html_content += f"""
                    <div class="demo-user" onclick="selectGoogleUser('{demo_id}')">
                        <div class="user-avatar">{initials}</div>
                        <div class="user-info">
                            <div class="user-name">{user_data['given_name']} {user_data['family_name']}</div>
                            <div class="user-email">{user_data['email']}</div>
                        </div>
                    </div>
            """
        
        html_content += """
                </div>
                
                <a href="javascript:history.back()" class="cancel-btn">Cancelar</a>
            </div>
            
            <script>
                function selectGoogleUser(demoId) {
                    window.location.href = `/auth/google/demo/callback?demo_user=${demoId}`;
                }
            </script>
        </body>
        </html>
        """
        
        return html_content
        
    except Exception as e:
        print(f"Error en Google demo: {str(e)}")
        return redirect('/vista/registro-trabajador.html?message=Error en simulación de Google&type=error')

@app.route('/auth/google/demo/callback')
def google_demo_callback():
    """Procesar selección de usuario demo de Google"""
    try:
        demo_user_id = request.args.get('demo_user')
        rol = session.get('oauth_rol', 'Trabajador')
        
        if not demo_user_id or demo_user_id not in GOOGLE_USERS_DEMO:
            return redirect('/vista/registro-trabajador.html?message=Usuario demo no válido&type=error')
        
        user_data = GOOGLE_USERS_DEMO[demo_user_id]
        
        # Verificar si el usuario ya existe
        existing_user = execute_query(
            "SELECT * FROM Usuario WHERE Correo = %s",
            (user_data['email'],),
            fetch_one=True
        )
        
        if existing_user:
            user_id = existing_user['ID_Usuario']
            print(f"Usuario demo existente: {existing_user['Nombre']}")
        else:
            user_id = create_demo_user(user_data, 'google', rol)
            if not user_id:
                return redirect('/vista/registro-trabajador.html?message=Error creando usuario demo&type=error')
        
        # Obtener datos actualizados del usuario
        user = execute_query(
            "SELECT * FROM Usuario WHERE ID_Usuario = %s",
            (user_id,),
            fetch_one=True
        )
        
        # Crear sesión
        session['user_id'] = user['ID_Usuario']
        session['username'] = user['Correo']
        session['first_name'] = user['Nombre']
        session['last_name'] = user['Apellido']
        session['email'] = user['Correo']
        session['user_role'] = user['Rol']
        session['user_name'] = f"{user['Nombre']} {user['Apellido']}"
        session['telefono'] = user.get('Telefono', '')
        
        session.pop('oauth_rol', None)
        
        # Redireccionar según el rol
        if user['Rol'] == 'Agricultor':
            redirect_url = '/vista/index-agricultor.html'
        else:
            redirect_url = '/vista/index-trabajador.html'
        
        return redirect(redirect_url)
        
    except Exception as e:
        print(f"Error en Google demo callback: {str(e)}")
        return redirect('/vista/registro-trabajador.html?message=Error procesando usuario demo&type=error')

# ================================================================
# RUTAS PARA SIMULACIÓN DE FACEBOOK
# ================================================================

@app.route('/auth/facebook/demo')
def facebook_demo():
    """Página de selección de usuario demo de Facebook"""
    try:
        rol = request.args.get('rol', 'Trabajador')
        session['oauth_rol'] = rol
        
        # Similar al de Google pero con estilo de Facebook
        html_content = f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Demo Facebook - AgroMatch</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #4267B2 0%, #365899 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0;
                }}
                .demo-container {{
                    background: white;
                    padding: 40px;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    max-width: 500px;
                    width: 90%;
                    text-align: center;
                }}
                .demo-header {{
                    margin-bottom: 30px;
                }}
                .demo-header h2 {{
                    color: #333;
                    margin-bottom: 10px;
                }}
                .demo-header p {{
                    color: #666;
                    margin-bottom: 5px;
                }}
                .role-badge {{
                    background: #4CAF50;
                    color: white;
                    padding: 5px 15px;
                    border-radius: 20px;
                    font-size: 14px;
                    font-weight: 600;
                }}
                .user-list {{
                    margin: 30px 0;
                }}
                .demo-user {{
                    display: flex;
                    align-items: center;
                    padding: 15px;
                    margin: 10px 0;
                    background: #f8f9fa;
                    border-radius: 10px;
                    border: 2px solid transparent;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }}
                .demo-user:hover {{
                    border-color: #4267B2;
                    background: #e3f2fd;
                }}
                .user-avatar {{
                    width: 50px;
                    height: 50px;
                    background: #4267B2;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 18px;
                    margin-right: 15px;
                }}
                .user-info {{
                    flex: 1;
                    text-align: left;
                }}
                .user-name {{
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 3px;
                }}
                .user-email {{
                    color: #666;
                    font-size: 14px;
                }}
                .cancel-btn {{
                    background: #6c757d;
                    color: white;
                    border: none;
                    padding: 12px 25px;
                    border-radius: 8px;
                    cursor: pointer;
                    text-decoration: none;
                    display: inline-block;
                    margin-top: 20px;
                    transition: background 0.3s ease;
                }}
                .cancel-btn:hover {{
                    background: #5a6268;
                }}
                .facebook-logo {{
                    color: #4267B2;
                    font-size: 24px;
                    margin-right: 10px;
                }}
            </style>
        </head>
        <body>
            <div class="demo-container">
                <div class="demo-header">
                    <h2><i class="fab fa-facebook facebook-logo"></i>Simulación Facebook OAuth</h2>
                    <p>Registro como: <span class="role-badge">{rol}</span></p>
                    <p>Selecciona un usuario demo para continuar</p>
                </div>
                
                <div class="user-list">
        """
        
        # Agregar usuarios demo
        for demo_id, user_data in FACEBOOK_USERS_DEMO.items():
            initials = f"{user_data['first_name'][0]}{user_data['last_name'][0]}"
            html_content += f"""
                    <div class="demo-user" onclick="selectFacebookUser('{demo_id}')">
                        <div class="user-avatar">{initials}</div>
                        <div class="user-info">
                            <div class="user-name">{user_data['first_name']} {user_data['last_name']}</div>
                            <div class="user-email">{user_data['email']}</div>
                        </div>
                    </div>
            """
        
        html_content += """
                </div>
                
                <a href="javascript:history.back()" class="cancel-btn">Cancelar</a>
            </div>
            
            <script>
                function selectFacebookUser(demoId) {
                    window.location.href = `/auth/facebook/demo/callback?demo_user=${demoId}`;
                }
            </script>
        </body>
        </html>
        """
        
        return html_content
        
    except Exception as e:
        print(f"Error en Facebook demo: {str(e)}")
        return redirect('/vista/registro-trabajador.html?message=Error en simulación de Facebook&type=error')

@app.route('/auth/facebook/demo/callback')
def facebook_demo_callback():
    """Procesar selección de usuario demo de Facebook"""
    try:
        demo_user_id = request.args.get('demo_user')
        rol = session.get('oauth_rol', 'Trabajador')
        
        if not demo_user_id or demo_user_id not in FACEBOOK_USERS_DEMO:
            return redirect('/vista/registro-trabajador.html?message=Usuario demo no válido&type=error')
        
        user_data = FACEBOOK_USERS_DEMO[demo_user_id]
        
        # Verificar si el usuario ya existe
        existing_user = execute_query(
            "SELECT * FROM Usuario WHERE Correo = %s",
            (user_data['email'],),
            fetch_one=True
        )
        
        if existing_user:
            user_id = existing_user['ID_Usuario']
            print(f"Usuario demo existente: {existing_user['Nombre']}")
        else:
            user_id = create_demo_user(user_data, 'facebook', rol)
            if not user_id:
                return redirect('/vista/registro-trabajador.html?message=Error creando usuario demo&type=error')
        
        # Obtener datos actualizados del usuario
        user = execute_query(
            "SELECT * FROM Usuario WHERE ID_Usuario = %s",
            (user_id,),
            fetch_one=True
        )
        
        # Crear sesión
        session['user_id'] = user['ID_Usuario']
        session['username'] = user['Correo']
        session['first_name'] = user['Nombre']
        session['last_name'] = user['Apellido']
        session['email'] = user['Correo']
        session['user_role'] = user['Rol']
        session['user_name'] = f"{user['Nombre']} {user['Apellido']}"
        session['telefono'] = user.get('Telefono', '')
        
        session.pop('oauth_rol', None)
        
        # Redireccionar según el rol
        if user['Rol'] == 'Agricultor':
            redirect_url = '/vista/index-agricultor.html'
        else:
            redirect_url = '/vista/index-trabajador.html'
        
        return redirect(redirect_url)
        
    except Exception as e:
        print(f"Error en Facebook demo callback: {str(e)}")
        return redirect('/vista/registro-trabajador.html?message=Error procesando usuario demo&type=error')

# ================================================================
# SIMULACIÓN DE AUTENTICACIÓN REAL
# ================================================================

def extract_info_from_email(email, provider):
    """Extrae información básica del email para crear el usuario"""
    try:
        # Extraer nombre del email (parte antes del @)
        username = email.split('@')[0]
        
        # Limpiar números y caracteres especiales
        clean_name = re.sub(r'[0-9._-]', ' ', username).strip()
        
        # Dividir en nombre y apellido
        name_parts = clean_name.split()
        
        if len(name_parts) >= 2:
            nombre = name_parts[0].capitalize()
            apellido = ' '.join(name_parts[1:]).title()
        elif len(name_parts) == 1:
            nombre = name_parts[0].capitalize()
            apellido = "Usuario"
        else:
            nombre = "Usuario"
            apellido = provider.capitalize()
        
        return {
            'nombre': nombre,
            'apellido': apellido,
            'email': email,
            'username': username,
            'provider': provider
        }
        
    except Exception as e:
        print(f"Error extrayendo info del email: {str(e)}")
        return None

def create_social_user_real(email, provider, rol='Trabajador'):
    """Crea un usuario real desde email de red social"""
    try:
        # Extraer información del email
        user_info = extract_info_from_email(email, provider)
        if not user_info:
            return None
        
        # Generar contraseña temporal hasheada
        from app import hash_password
        temp_password = hash_password(f"{email}_social_{provider}_{uuid.uuid4()}")
        
        # URL de foto por defecto según el proveedor
        if provider == 'google':
            foto_url = "/static/uploads/profile_photos/default_google_user.jpg"
        else:
            foto_url = "/static/uploads/profile_photos/default_facebook_user.jpg"
        
        # Insertar en base de datos
        user_id = execute_query(
            """INSERT INTO Usuario (Nombre, Apellido, Correo, Contrasena, URL_Foto, 
                                   Red_Social, Rol, Estado) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, 'Activo')""",
            (
                user_info['nombre'],
                user_info['apellido'], 
                email,
                temp_password,
                foto_url,
                f"{provider}:{user_info['username']}",
                rol
            )
        )
        
        print(f"Usuario real creado desde {provider}: {email}")
        return user_id
        
    except Exception as e:
        print(f"Error creando usuario social real: {str(e)}")
        return None

# ================================================================
# FORMULARIO PARA INGRESO CON GOOGLE
# ================================================================

@app.route('/auth/google/login')
def google_auth_form():
    """Formulario para ingresar email de Google - VERSIÓN CORREGIDA"""
    try:
        # Obtener rol si viene desde registro, si no, es login
        rol = request.args.get('rol', None)
        
        if rol:
            # Es registro con rol específico
            session['oauth_rol'] = rol
            action_text = f"Registro como {rol}"
            process_url = "/auth/google/process"
            info_text = "Se creará tu cuenta automáticamente"
        else:
            # Es login sin rol específico
            action_text = "Iniciar Sesión"
            process_url = "/auth/google/login-process"
            info_text = "Si no tienes cuenta, te ayudaremos a crearla"
        
        html_content = f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Google - AgroMatch</title>
            <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0;
                    padding: 20px;
                }}
                .auth-container {{
                    background: white;
                    padding: 40px;
                    border-radius: 20px;
                    box-shadow: 0 15px 35px rgba(0,0,0,0.1);
                    max-width: 450px;
                    width: 100%;
                    text-align: center;
                }}
                .google-logo {{
                    font-size: 48px;
                    background: linear-gradient(45deg, #4285f4, #34a853, #fbbc05, #ea4335);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin-bottom: 20px;
                }}
                .auth-header h2 {{
                    color: #202124;
                    font-size: 24px;
                    margin-bottom: 10px;
                }}
                .auth-header p {{
                    color: #5f6368;
                    font-size: 16px;
                    margin-bottom: 30px;
                }}
                .form-group {{
                    margin-bottom: 20px;
                    text-align: left;
                }}
                .form-group label {{
                    display: block;
                    color: #3c4043;
                    font-size: 14px;
                    font-weight: 500;
                    margin-bottom: 8px;
                }}
                .form-group input {{
                    width: 100%;
                    padding: 16px;
                    border: 1px solid #dadce0;
                    border-radius: 8px;
                    font-size: 16px;
                    box-sizing: border-box;
                    transition: border-color 0.3s ease;
                }}
                .form-group input:focus {{
                    outline: none;
                    border-color: #1a73e8;
                    box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
                }}
                .btn-continue {{
                    width: 100%;
                    background: #1a73e8;
                    color: white;
                    border: none;
                    padding: 16px;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 500;
                    cursor: pointer;
                    margin-bottom: 16px;
                    transition: background 0.3s ease;
                }}
                .btn-continue:hover {{
                    background: #1557b0;
                }}
                .btn-continue:disabled {{
                    background: #dadce0;
                    cursor: not-allowed;
                }}
                .btn-cancel {{
                    width: 100%;
                    background: transparent;
                    color: #1a73e8;
                    border: 1px solid #dadce0;
                    padding: 16px;
                    border-radius: 8px;
                    text-decoration: none;
                    display: inline-block;
                    transition: background 0.3s ease;
                }}
                .btn-cancel:hover {{
                    background: #f8f9fa;
                }}
                .info-note {{
                    background: #e3f2fd;
                    border: 1px solid #1976d2;
                    border-radius: 8px;
                    padding: 12px;
                    margin: 20px 0;
                    font-size: 13px;
                    color: #0d47a1;
                }}
                .help-text {{
                    font-size: 12px;
                    color: #5f6368;
                    margin-top: 5px;
                }}
            </style>
        </head>
        <body>
            <div class="auth-container">
                <div class="auth-header">
                    <div class="google-logo">
                        <i class="fab fa-google"></i>
                    </div>
                    <h2>Continuar con Google</h2>
                    <p>{action_text}</p>
                </div>

                <form id="googleForm" action="{process_url}" method="POST">
                    {"<input type='hidden' name='rol' value='" + str(rol) + "'>" if rol else ""}
                    
                    <div class="form-group">
                        <label for="google_email">Tu correo de Gmail</label>
                        <input 
                            type="email" 
                            id="google_email" 
                            name="google_email" 
                            placeholder="ejemplo@gmail.com"
                            required>
                        <div class="help-text">Ingresa tu dirección de Gmail real</div>
                    </div>

                    <div class="info-note">
                        <i class="fas fa-info-circle"></i> 
                        {info_text}
                    </div>

                    <button type="submit" class="btn-continue" id="continueBtn">
                        <i class="fas fa-arrow-right"></i> Continuar
                    </button>
                </form>

                <a href="javascript:history.back()" class="btn-cancel">
                    <i class="fas fa-arrow-left"></i> Volver
                </a>
            </div>

            <script>
                // Validación en tiempo real
                document.getElementById('google_email').addEventListener('input', function() {{
                    const email = this.value;
                    const btn = document.getElementById('continueBtn');
                    
                    if (email.includes('@gmail.com') || email.includes('@googlemail.com')) {{
                        this.style.borderColor = '#34a853';
                        btn.disabled = false;
                    }} else if (email.includes('@')) {{
                        this.style.borderColor = '#ea4335';
                        btn.disabled = true;
                    }} else {{
                        this.style.borderColor = '#dadce0';
                        btn.disabled = email.length === 0;
                    }}
                }});

                // Validación del formulario
                document.getElementById('googleForm').addEventListener('submit', function(e) {{
                    const email = document.getElementById('google_email').value;
                    
                    if (!email.includes('@gmail.com') && !email.includes('@googlemail.com')) {{
                        e.preventDefault();
                        alert('Por favor ingresa un correo válido de Gmail (@gmail.com)');
                        return false;
                    }}
                }});
            </script>
        </body>
        </html>
        """
        
        return html_content
        
    except Exception as e:
        print(f"Error en formulario de Google: {str(e)}")
        return redirect('/vista/login-trabajador.html?message=Error cargando Google&type=error')

@app.route('/auth/facebook/login')
def facebook_auth_form():
    """Formulario para ingresar email de Facebook - VERSIÓN CORREGIDA"""
    try:
        # Obtener rol si viene desde registro, si no, es login
        rol = request.args.get('rol', None)
        
        if rol:
            # Es registro con rol específico
            session['oauth_rol'] = rol
            action_text = f"Registro como {rol}"
            process_url = "/auth/facebook/process"
            info_text = "Se creará tu cuenta automáticamente"
        else:
            # Es login sin rol específico
            action_text = "Iniciar Sesión"
            process_url = "/auth/facebook/login-process"
            info_text = "Si no tienes cuenta, te ayudaremos a crearla"
        
        html_content = f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Facebook - AgroMatch</title>
            <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #4267B2 0%, #365899 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0;
                    padding: 20px;
                }}
                .auth-container {{
                    background: white;
                    padding: 40px;
                    border-radius: 20px;
                    box-shadow: 0 15px 35px rgba(0,0,0,0.1);
                    max-width: 450px;
                    width: 100%;
                    text-align: center;
                }}
                .facebook-logo {{
                    font-size: 48px;
                    color: #4267B2;
                    margin-bottom: 20px;
                }}
                .auth-header h2 {{
                    color: #1c1e21;
                    font-size: 24px;
                    margin-bottom: 10px;
                }}
                .auth-header p {{
                    color: #606770;
                    font-size: 16px;
                    margin-bottom: 30px;
                }}
                .form-group {{
                    margin-bottom: 20px;
                    text-align: left;
                }}
                .form-group label {{
                    display: block;
                    color: #1c1e21;
                    font-size: 14px;
                    font-weight: 500;
                    margin-bottom: 8px;
                }}
                .form-group input {{
                    width: 100%;
                    padding: 16px;
                    border: 1px solid #dddfe2;
                    border-radius: 8px;
                    font-size: 16px;
                    box-sizing: border-box;
                    transition: border-color 0.3s ease;
                }}
                .form-group input:focus {{
                    outline: none;
                    border-color: #4267B2;
                    box-shadow: 0 0 0 2px rgba(66, 103, 178, 0.2);
                }}
                .btn-continue {{
                    width: 100%;
                    background: #4267B2;
                    color: white;
                    border: none;
                    padding: 16px;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    margin-bottom: 16px;
                    transition: background 0.3s ease;
                }}
                .btn-continue:hover {{
                    background: #365899;
                }}
                .btn-continue:disabled {{
                    background: #e4e6ea;
                    cursor: not-allowed;
                }}
                .btn-cancel {{
                    width: 100%;
                    background: transparent;
                    color: #4267B2;
                    border: 1px solid #dddfe2;
                    padding: 16px;
                    border-radius: 8px;
                    text-decoration: none;
                    display: inline-block;
                    transition: background 0.3s ease;
                }}
                .btn-cancel:hover {{
                    background: #f5f6f7;
                }}
                .info-note {{
                    background: #e7f3ff;
                    border: 1px solid #4267B2;
                    border-radius: 8px;
                    padding: 12px;
                    margin: 20px 0;
                    font-size: 13px;
                    color: #4267B2;
                }}
                .help-text {{
                    font-size: 12px;
                    color: #606770;
                    margin-top: 5px;
                }}
            </style>
        </head>
        <body>
            <div class="auth-container">
                <div class="auth-header">
                    <div class="facebook-logo">
                        <i class="fab fa-facebook"></i>
                    </div>
                    <h2>Continuar con Facebook</h2>
                    <p>{action_text}</p>
                </div>

                <form id="facebookForm" action="{process_url}" method="POST">
                    {"<input type='hidden' name='rol' value='" + str(rol) + "'>" if rol else ""}
                    
                    <div class="form-group">
                        <label for="facebook_email">Tu correo asociado a Facebook</label>
                        <input 
                            type="email" 
                            id="facebook_email" 
                            name="facebook_email" 
                            placeholder="ejemplo@hotmail.com o @outlook.com"
                            required>
                        <div class="help-text">Hotmail, Outlook, Live o MSN</div>
                    </div>

                    <div class="info-note">
                        <i class="fas fa-info-circle"></i> 
                        {info_text}
                    </div>

                    <button type="submit" class="btn-continue" id="continueBtn">
                        <i class="fas fa-arrow-right"></i> Continuar
                    </button>
                </form>

                <a href="javascript:history.back()" class="btn-cancel">
                    <i class="fas fa-arrow-left"></i> Volver
                </a>
            </div>

            <script>
                // Validación en tiempo real
                document.getElementById('facebook_email').addEventListener('input', function() {{
                    const email = this.value;
                    const btn = document.getElementById('continueBtn');
                    const validDomains = ['@hotmail.com', '@outlook.com', '@live.com', '@msn.com'];
                    
                    if (validDomains.some(domain => email.includes(domain))) {{
                        this.style.borderColor = '#42b883';
                        btn.disabled = false;
                    }} else if (email.includes('@')) {{
                        this.style.borderColor = '#e74c3c';
                        btn.disabled = true;
                    }} else {{
                        this.style.borderColor = '#dddfe2';
                        btn.disabled = email.length === 0;
                    }}
                }});

                // Validación del formulario
                document.getElementById('facebookForm').addEventListener('submit', function(e) {{
                    const email = document.getElementById('facebook_email').value;
                    const validDomains = ['@hotmail.com', '@outlook.com', '@live.com', '@msn.com'];
                    
                    if (!validDomains.some(domain => email.includes(domain))) {{
                        e.preventDefault();
                        alert('Por favor ingresa un correo válido asociado a Facebook (Hotmail, Outlook, Live, MSN)');
                        return false;
                    }}
                }});
            </script>
        </body>
        </html>
        """
        
        return html_content
        
    except Exception as e:
        print(f"Error en formulario de Facebook: {str(e)}")
        return redirect('/vista/login-trabajador.html?message=Error cargando Facebook&type=error')

# ================================================================
# RUTAS DE PROCESAMIENTO (MANTENER LAS EXISTENTES)
# ================================================================

print("✅ Rutas de Google y Facebook corregidas y cargadas")


# ================================================================
# RUTAS PARA ELIMINACIÓN DE CUENTA CON REDES SOCIALES
# ================================================================

@app.route('/auth/google/delete-account', methods=['POST'])
@require_login
def delete_account_with_google():
    """Eliminar cuenta verificando que fue creada con Google"""
    try:
        user_id = session['user_id']
        
        # Verificar que el usuario actual existe y tiene Google asociado
        user = execute_query(
            "SELECT * FROM Usuario WHERE ID_Usuario = %s",
            (user_id,),
            fetch_one=True
        )
        
        if not user:
            return jsonify({'success': False, 'message': 'Usuario no encontrado'}), 404
        
        # Verificar que la cuenta fue creada con Google
        red_social = user.get('Red_Social', '')
        if not red_social or not red_social.startswith('google:'):
            return jsonify({
                'success': False, 
                'message': 'Esta cuenta no fue creada con Google'
            }), 400
        
        print(f"Eliminando cuenta con Google para usuario: {user['Nombre']} {user['Apellido']}")
        
        # Eliminar registros relacionados (en orden de dependencias)
        tables_to_clean = [
            ('Calificacion', ['ID_Usuario_Emisor', 'ID_Usuario_Receptor']),
            ('Mensaje', ['ID_Emisor', 'ID_Receptor']),
            ('Acuerdo_Laboral', ['ID_Trabajador']),
            ('Postulacion', ['ID_Trabajador']),
            ('Anexo', ['ID_Usuario']),
            ('Habilidad', ['ID_Trabajador']),
            ('Experiencia', ['ID_Trabajador']),
            ('Oferta_Trabajo', ['ID_Agricultor']),
            ('Predio', ['ID_Usuario'])
        ]
        
        for table_name, columns in tables_to_clean:
            try:
                if len(columns) == 1:
                    execute_query(f"DELETE FROM {table_name} WHERE {columns[0]} = %s", (user_id,))
                else:
                    conditions = ' OR '.join([f"{col} = %s" for col in columns])
                    params = [user_id] * len(columns)
                    execute_query(f"DELETE FROM {table_name} WHERE {conditions}", params)
                    
            except Exception as table_error:
                print(f"Error eliminando de {table_name}: {str(table_error)}")
                continue
        
        # Eliminar el usuario
        execute_query("DELETE FROM Usuario WHERE ID_Usuario = %s", (user_id,))
        
        # Limpiar sesión
        session.clear()
        
        print(f"Cuenta eliminada exitosamente con Google para usuario ID: {user_id}")
        
        return jsonify({
            'success': True,
            'message': 'Cuenta eliminada correctamente con Google'
        })
        
    except Exception as e:
        print(f"Error eliminando cuenta con Google: {str(e)}")
        return jsonify({'success': False, 'message': 'Error interno del servidor'}), 500

@app.route('/auth/facebook/delete-account', methods=['POST'])
@require_login
def delete_account_with_facebook():
    """Eliminar cuenta verificando que fue creada con Facebook"""
    try:
        user_id = session['user_id']
        
        # Verificar que el usuario actual existe y tiene Facebook asociado
        user = execute_query(
            "SELECT * FROM Usuario WHERE ID_Usuario = %s",
            (user_id,),
            fetch_one=True
        )
        
        if not user:
            return jsonify({'success': False, 'message': 'Usuario no encontrado'}), 404
        
        # Verificar que la cuenta fue creada con Facebook
        red_social = user.get('Red_Social', '')
        if not red_social or not red_social.startswith('facebook:'):
            return jsonify({
                'success': False, 
                'message': 'Esta cuenta no fue creada con Facebook'
            }), 400
        
        print(f"Eliminando cuenta con Facebook para usuario: {user['Nombre']} {user['Apellido']}")
        
        # Eliminar registros relacionados (mismo proceso que Google)
        tables_to_clean = [
            ('Calificacion', ['ID_Usuario_Emisor', 'ID_Usuario_Receptor']),
            ('Mensaje', ['ID_Emisor', 'ID_Receptor']),
            ('Acuerdo_Laboral', ['ID_Trabajador']),
            ('Postulacion', ['ID_Trabajador']),
            ('Anexo', ['ID_Usuario']),
            ('Habilidad', ['ID_Trabajador']),
            ('Experiencia', ['ID_Trabajador']),
            ('Oferta_Trabajo', ['ID_Agricultor']),
            ('Predio', ['ID_Usuario'])
        ]
        
        for table_name, columns in tables_to_clean:
            try:
                if len(columns) == 1:
                    execute_query(f"DELETE FROM {table_name} WHERE {columns[0]} = %s", (user_id,))
                else:
                    conditions = ' OR '.join([f"{col} = %s" for col in columns])
                    params = [user_id] * len(columns)
                    execute_query(f"DELETE FROM {table_name} WHERE {conditions}", params)
                    
            except Exception as table_error:
                print(f"Error eliminando de {table_name}: {str(table_error)}")
                continue
        
        # Eliminar el usuario
        execute_query("DELETE FROM Usuario WHERE ID_Usuario = %s", (user_id,))
        
        # Limpiar sesión
        session.clear()
        
        print(f"Cuenta eliminada exitosamente con Facebook para usuario ID: {user_id}")
        
        return jsonify({
            'success': True,
            'message': 'Cuenta eliminada correctamente con Facebook'
        })
        
    except Exception as e:
        print(f"Error eliminando cuenta con Facebook: {str(e)}")
        return jsonify({'success': False, 'message': 'Error interno del servidor'}), 500

print("✅ Rutas de eliminación social cargadas correctamente")


# ENDPOINTS FALTANTES 

# 1. Endpoint para obtener documentos del usuario
@app.route('/api/user-documents', methods=['GET'])
@require_login
def get_user_documents():
    try:
        user_id = session['user_id']
        
        # Usar tu tabla Anexo existente
        documentos = execute_query(
            """SELECT ID_Anexo, Tipo_Archivo, URL_Archivo, Descripcion, Fecha_Subida
               FROM Anexo 
               WHERE ID_Usuario = %s 
               ORDER BY Fecha_Subida DESC""",
            (user_id,)
        )
        
        documents_list = []
        if documentos:
            for doc in documentos:
                # Extraer nombre del archivo de la URL
                archivo_nombre = os.path.basename(doc['URL_Archivo']) if doc['URL_Archivo'] else 'Sin nombre'
                
                documents_list.append({
                    'id': doc['ID_Anexo'],
                    'tipo_documento': doc['Tipo_Archivo'],
                    'nombre_archivo': archivo_nombre,
                    'url_documento': doc['URL_Archivo'],
                    'fecha_subida': doc['Fecha_Subida'].strftime('%Y-%m-%d %H:%M:%S') if doc['Fecha_Subida'] else None,
                    'estado': 'Subido',
                    'descripcion': doc['Descripcion']
                })
        
        return jsonify({
            'success': True,
            'documents': documents_list
        })
        
    except Exception as e:
        print(f"Error al obtener documentos: {e}")
        return jsonify({'success': False, 'message': 'Error interno del servidor'}), 500

# 2. Endpoint para obtener empleadores disponibles para calificar
@app.route('/api/user-employers', methods=['GET'])
@require_login
def get_user_employers():
    try:
        user_id = session['user_id']
        
        # Obtener agricultores con los que ha trabajado
        empleadores = execute_query("""
            SELECT DISTINCT u.ID_Usuario, u.Nombre, u.Apellido, u.Correo
            FROM Usuario u
            INNER JOIN Oferta_Trabajo ot ON u.ID_Usuario = ot.ID_Agricultor
            INNER JOIN Acuerdo_Laboral al ON ot.ID_Oferta = al.ID_Oferta
            WHERE al.ID_Trabajador = %s 
            AND al.Estado = 'Finalizado'
            AND u.Rol = 'Agricultor'
            ORDER BY u.Nombre, u.Apellido
        """, (user_id,))
        
        employers_list = []
        if empleadores:
            for emp in empleadores:
                employers_list.append({
                    'id': emp['ID_Usuario'],
                    'nombre': f"{emp['Nombre']} {emp['Apellido']}",
                    'empresa': emp['Nombre'],
                    'email': emp['Correo']
                })
        
        return jsonify({
            'success': True,
            'employers': employers_list
        })
        
    except Exception as e:
        print(f"Error al obtener empleadores: {e}")
        return jsonify({'success': False, 'message': 'Error interno del servidor'}), 500

# 3. Endpoint para enviar calificación
@app.route('/api/submit-rating', methods=['POST'])
@require_login
def submit_rating():
    try:
        data = request.get_json()
        user_id = session['user_id']
        employer_id = data.get('employerId')
        rating = data.get('rating')
        comment = data.get('comment')
        
        # Validar datos
        if not employer_id or not rating or not comment:
            return jsonify({'success': False, 'message': 'Todos los campos son requeridos'})
        
        if not (1 <= int(rating) <= 5):
            return jsonify({'success': False, 'message': 'La calificación debe ser entre 1 y 5'})
        
        # Buscar acuerdo laboral finalizado
        acuerdo = execute_query("""
            SELECT al.ID_Acuerdo
            FROM Acuerdo_Laboral al
            INNER JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
            WHERE al.ID_Trabajador = %s 
            AND ot.ID_Agricultor = %s
            AND al.Estado = 'Finalizado'
            ORDER BY al.ID_Acuerdo DESC
            LIMIT 1
        """, (user_id, employer_id), fetch_one=True)
        
        if not acuerdo:
            return jsonify({'success': False, 'message': 'No se encontró un trabajo finalizado con este empleador'})
        
        # Verificar que no haya calificado ya
        existing = execute_query("""
            SELECT ID_Calificacion FROM Calificacion 
            WHERE ID_Usuario_Emisor = %s AND ID_Usuario_Receptor = %s AND ID_Acuerdo = %s
        """, (user_id, employer_id, acuerdo['ID_Acuerdo']), fetch_one=True)
        
        if existing:
            return jsonify({'success': False, 'message': 'Ya has calificado a este empleador'})
        
        # Insertar calificación
        execute_query("""
            INSERT INTO Calificacion 
            (ID_Acuerdo, ID_Usuario_Emisor, ID_Usuario_Receptor, Puntuacion, Comentario)
            VALUES (%s, %s, %s, %s, %s)
        """, (acuerdo['ID_Acuerdo'], user_id, employer_id, str(rating), comment))
        
        return jsonify({'success': True, 'message': 'Calificación enviada correctamente'})
        
    except Exception as e:
        print(f"Error al enviar calificación: {e}")
        return jsonify({'success': False, 'message': 'Error interno del servidor'}), 500

# 4. Endpoint para obtener calificaciones enviadas
@app.route('/api/user-ratings', methods=['GET'])
@require_login
def get_user_ratings():
    try:
        user_id = session['user_id']
        
        calificaciones = execute_query("""
            SELECT c.Puntuacion, c.Comentario, c.Fecha,
                   u.Nombre, u.Apellido
            FROM Calificacion c
            INNER JOIN Usuario u ON c.ID_Usuario_Receptor = u.ID_Usuario
            WHERE c.ID_Usuario_Emisor = %s
            ORDER BY c.Fecha DESC
        """, (user_id,))
        
        ratings_list = []
        if calificaciones:
            for rating in calificaciones:
                ratings_list.append({
                    'calificacion': int(rating['Puntuacion']),
                    'comentario': rating['Comentario'],
                    'fecha': rating['Fecha'].strftime('%Y-%m-%d %H:%M:%S') if rating['Fecha'] else None,
                    'empleador_nombre': f"{rating['Nombre']} {rating['Apellido']}",
                    'empresa': rating['Nombre']
                })
        
        return jsonify({
            'success': True,
            'ratings': ratings_list
        })
        
    except Exception as e:
        print(f"Error al obtener calificaciones: {e}")
        return jsonify({'success': False, 'message': 'Error interno del servidor'}), 500

# ================================================================
# RUTAS DE PROCESAMIENTO FALTANTES - AGREGAR A APP.PY
# Estas son las rutas que procesan el login sin rol específico
# ================================================================

@app.route('/auth/google/login-process', methods=['POST'])
def google_login_process():
    """Procesar login con Google (desde página de login - sin rol específico)"""
    try:
        google_email = request.form.get('google_email', '').strip().lower()
        
        print(f"Procesando login con Google para: {google_email}")
        
        # Validar email de Google
        if not google_email or not (google_email.endswith('@gmail.com') or google_email.endswith('@googlemail.com')):
            return redirect('/vista/login-trabajador.html?message=Por favor ingresa un correo válido de Gmail&type=error')
        
        # Buscar si el usuario ya existe
        existing_user = execute_query(
            "SELECT * FROM Usuario WHERE Correo = %s",
            (google_email,),
            fetch_one=True
        )
        
        if not existing_user:
            # Usuario no existe, redirigir a selección de rol para registro
            return redirect(f'/vista/seleccion-rol.html?email={quote(google_email)}&provider=google&message=Cuenta no encontrada. Selecciona tu rol para registrarte&type=info')
        
        # Usuario existe, crear sesión
        user = existing_user
        session['user_id'] = user['ID_Usuario']
        session['username'] = user['Correo']
        session['first_name'] = user['Nombre']
        session['last_name'] = user['Apellido']
        session['email'] = user['Correo']
        session['user_role'] = user['Rol']
        session['user_name'] = f"{user['Nombre']} {user['Apellido']}"
        session['telefono'] = user.get('Telefono', '')
        
        print(f"Login exitoso con Google: {user['Nombre']} - Rol: {user['Rol']}")
        
        # Redireccionar según el rol
        if user['Rol'] == 'Agricultor':
            return redirect('/vista/index-agricultor.html')
        else:
            return redirect('/vista/index-trabajador.html')
        
    except Exception as e:
        print(f"Error en login Google: {str(e)}")
        return redirect('/vista/login-trabajador.html?message=Error procesando Google&type=error')

@app.route('/auth/facebook/login-process', methods=['POST'])
def facebook_login_process():
    """Procesar login con Facebook (desde página de login - sin rol específico)"""
    try:
        facebook_email = request.form.get('facebook_email', '').strip().lower()
        
        print(f"Procesando login con Facebook para: {facebook_email}")
        
        # Validar email de Facebook
        valid_domains = ['@hotmail.com', '@outlook.com', '@live.com', '@msn.com']
        if not facebook_email or not any(facebook_email.endswith(domain) for domain in valid_domains):
            return redirect('/vista/login-trabajador.html?message=Por favor ingresa un correo válido asociado a Facebook&type=error')
        
        # Buscar si el usuario ya existe
        existing_user = execute_query(
            "SELECT * FROM Usuario WHERE Correo = %s",
            (facebook_email,),
            fetch_one=True
        )
        
        if not existing_user:
            # Usuario no existe, redirigir a selección de rol para registro
            return redirect(f'/vista/seleccion-rol.html?email={quote(facebook_email)}&provider=facebook&message=Cuenta no encontrada. Selecciona tu rol para registrarte&type=info')
        
        # Usuario existe, crear sesión
        user = existing_user
        session['user_id'] = user['ID_Usuario']
        session['username'] = user['Correo']
        session['first_name'] = user['Nombre']
        session['last_name'] = user['Apellido']
        session['email'] = user['Correo']
        session['user_role'] = user['Rol']
        session['user_name'] = f"{user['Nombre']} {user['Apellido']}"
        session['telefono'] = user.get('Telefono', '')
        
        print(f"Login exitoso con Facebook: {user['Nombre']} - Rol: {user['Rol']}")
        
        # Redireccionar según el rol
        if user['Rol'] == 'Agricultor':
            return redirect('/vista/index-agricultor.html')
        else:
            return redirect('/vista/index-trabajador.html')
        
    except Exception as e:
        print(f"Error en login Facebook: {str(e)}")
        return redirect('/vista/login-trabajador.html?message=Error procesando Facebook&type=error')

@app.route('/auth/google/process', methods=['POST'])
def google_register_process():
    """Procesar registro con Google (desde páginas de registro - con rol específico)"""
    try:
        google_email = request.form.get('google_email', '').strip().lower()
        rol = request.form.get('rol', 'Trabajador')
        
        print(f"Procesando registro con Google para: {google_email} como {rol}")
        
        # Validar email de Google
        if not google_email or not (google_email.endswith('@gmail.com') or google_email.endswith('@googlemail.com')):
            redirect_url = '/vista/registro-agricultor.html' if rol == 'Agricultor' else '/vista/registro-trabajador.html'
            return redirect(f'{redirect_url}?message=Por favor ingresa un correo válido de Gmail&type=error')
        
        # Verificar si el usuario ya existe
        existing_user = execute_query(
            "SELECT * FROM Usuario WHERE Correo = %s",
            (google_email,),
            fetch_one=True
        )
        
        if existing_user:
            # Usuario existe, iniciar sesión
            user = existing_user
            print(f"Usuario existente encontrado: {existing_user['Nombre']}")
        else:
            # Crear nuevo usuario
            user_id = create_social_user_real(google_email, 'google', rol)
            if not user_id:
                redirect_url = '/vista/registro-agricultor.html' if rol == 'Agricultor' else '/vista/registro-trabajador.html'
                return redirect(f'{redirect_url}?message=Error creando usuario con Google&type=error')
            
            user = execute_query(
                "SELECT * FROM Usuario WHERE ID_Usuario = %s",
                (user_id,),
                fetch_one=True
            )
        
        # Crear sesión
        session['user_id'] = user['ID_Usuario']
        session['username'] = user['Correo']
        session['first_name'] = user['Nombre']
        session['last_name'] = user['Apellido']
        session['email'] = user['Correo']
        session['user_role'] = user['Rol']
        session['user_name'] = f"{user['Nombre']} {user['Apellido']}"
        session['telefono'] = user.get('Telefono', '')
        
        session.pop('oauth_rol', None)
        
        print(f"Registro/Login exitoso con Google: {user['Nombre']} - Rol: {user['Rol']}")
        
        # Redireccionar según el rol
        if user['Rol'] == 'Agricultor':
            return redirect('/vista/index-agricultor.html')
        else:
            return redirect('/vista/index-trabajador.html')
        
    except Exception as e:
        print(f"Error procesando registro Google: {str(e)}")
        return redirect('/vista/registro-trabajador.html?message=Error con Google&type=error')

@app.route('/auth/facebook/process', methods=['POST'])
def facebook_register_process():
    """Procesar registro con Facebook (desde páginas de registro - con rol específico)"""
    try:
        facebook_email = request.form.get('facebook_email', '').strip().lower()
        rol = request.form.get('rol', 'Trabajador')
        
        print(f"Procesando registro con Facebook para: {facebook_email} como {rol}")
        
        # Validar email de Facebook
        valid_domains = ['@hotmail.com', '@outlook.com', '@live.com', '@msn.com']
        if not facebook_email or not any(facebook_email.endswith(domain) for domain in valid_domains):
            redirect_url = '/vista/registro-agricultor.html' if rol == 'Agricultor' else '/vista/registro-trabajador.html'
            return redirect(f'{redirect_url}?message=Por favor ingresa un correo válido asociado a Facebook&type=error')
        
        # Verificar si el usuario ya existe
        existing_user = execute_query(
            "SELECT * FROM Usuario WHERE Correo = %s",
            (facebook_email,),
            fetch_one=True
        )
        
        if existing_user:
            # Usuario existe, iniciar sesión
            user = existing_user
            print(f"Usuario existente encontrado: {existing_user['Nombre']}")
        else:
            # Crear nuevo usuario
            user_id = create_social_user_real(facebook_email, 'facebook', rol)
            if not user_id:
                redirect_url = '/vista/registro-agricultor.html' if rol == 'Agricultor' else '/vista/registro-trabajador.html'
                return redirect(f'{redirect_url}?message=Error creando usuario con Facebook&type=error')
            
            user = execute_query(
                "SELECT * FROM Usuario WHERE ID_Usuario = %s",
                (user_id,),
                fetch_one=True
            )
        
        # Crear sesión
        session['user_id'] = user['ID_Usuario']
        session['username'] = user['Correo']
        session['first_name'] = user['Nombre']
        session['last_name'] = user['Apellido']
        session['email'] = user['Correo']
        session['user_role'] = user['Rol']
        session['user_name'] = f"{user['Nombre']} {user['Apellido']}"
        session['telefono'] = user.get('Telefono', '')
        
        session.pop('oauth_rol', None)
        
        print(f"Registro/Login exitoso con Facebook: {user['Nombre']} - Rol: {user['Rol']}")
        
        # Redireccionar según el rol
        if user['Rol'] == 'Agricultor':
            return redirect('/vista/index-agricultor.html')
        else:
            return redirect('/vista/index-trabajador.html')
        
    except Exception as e:
        print(f"Error procesando registro Facebook: {str(e)}")
        return redirect('/vista/registro-trabajador.html?message=Error con Facebook&type=error')

# También necesitas la función auxiliar si no la tienes:
def create_social_user_real(email, provider, rol='Trabajador'):
    """Crea un usuario real desde email de red social"""
    try:
        # Extraer información del email
        user_info = extract_info_from_email(email, provider)
        if not user_info:
            return None
        
        # Generar contraseña temporal hasheada
        temp_password = hash_password(f"{email}_social_{provider}_{uuid.uuid4()}")
        
        # URL de foto por defecto según el proveedor
        if provider == 'google':
            foto_url = "/static/uploads/profile_photos/default_google_user.jpg"
        else:
            foto_url = "/static/uploads/profile_photos/default_facebook_user.jpg"
        
        # Insertar en base de datos
        user_id = execute_query(
            """INSERT INTO Usuario (Nombre, Apellido, Correo, Contrasena, URL_Foto, 
                                   Red_Social, Rol, Estado) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, 'Activo')""",
            (
                user_info['nombre'],
                user_info['apellido'], 
                email,
                temp_password,
                foto_url,
                f"{provider}:{user_info['username']}",
                rol
            )
        )
        
        print(f"Usuario real creado desde {provider}: {email} - Rol: {rol}")
        return user_id
        
    except Exception as e:
        print(f"Error creando usuario social real: {str(e)}")
        return None

def extract_info_from_email(email, provider):
    """Extrae información básica del email para crear el usuario"""
    try:
        import re
        # Extraer nombre del email (parte antes del @)
        username = email.split('@')[0]
        
        # Limpiar números y caracteres especiales
        clean_name = re.sub(r'[0-9._-]', ' ', username).strip()
        
        # Dividir en nombre y apellido
        name_parts = clean_name.split()
        
        if len(name_parts) >= 2:
            nombre = name_parts[0].capitalize()
            apellido = ' '.join(name_parts[1:]).title()
        elif len(name_parts) == 1:
            nombre = name_parts[0].capitalize()
            apellido = "Usuario"
        else:
            nombre = "Usuario"
            apellido = provider.capitalize()
        
        return {
            'nombre': nombre,
            'apellido': apellido,
            'email': email,
            'username': username,
            'provider': provider
        }
        
    except Exception as e:
        print(f"Error extrayendo info del email: {str(e)}")
        return None

print("✅ Rutas de procesamiento social agregadas correctamente")


# ================================================================
# RUTAS PARA ARCHIVOS HTML DE LA CARPETA VISTA
# ================================================================

@app.route('/vista/favoritos.html')
def favoritos_html():
    """Página de favoritos"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        vista_path = os.path.join(base_dir, '..', 'vista')
        vista_path = os.path.abspath(vista_path)
        return send_from_directory(vista_path, 'favoritos.html')
    except Exception as e:
        print(f"Error sirviendo favoritos.html: {e}")
        return "Archivo no encontrado", 404

@app.route('/vista/historial-empleos.html')
def historial_empleos_html():
    """Página de historial de empleos"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        vista_path = os.path.join(base_dir, '..', 'vista')
        vista_path = os.path.abspath(vista_path)
        return send_from_directory(vista_path, 'historial-empleos.html')
    except Exception as e:
        print(f"Error sirviendo historial-empleos.html: {e}")
        return "Archivo no encontrado", 404

@app.route('/vista/postulaciones.html')
def postulaciones_html():
    """Página de postulaciones"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        vista_path = os.path.join(base_dir, '..', 'vista')
        vista_path = os.path.abspath(vista_path)
        return send_from_directory(vista_path, 'postulaciones.html')
    except Exception as e:
        print(f"Error sirviendo postulaciones.html: {e}")
        return "Archivo no encontrado", 404

@app.route('/vista/configuracion-trabajador.html')
def configuracion_trabajador_html():
    """Página de configuración del trabajador"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        vista_path = os.path.join(base_dir, '..', 'vista')
        vista_path = os.path.abspath(vista_path)
        return send_from_directory(vista_path, 'configuracion-trabajador.html')
    except Exception as e:
        print(f"Error sirviendo configuracion-trabajador.html: {e}")
        return "Archivo no encontrado", 404

@app.route('/vista/estadisticas-trabajador.html')
def estadisticas_trabajador_html():
    """Página de estadísticas del trabajador"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        vista_path = os.path.join(base_dir, '..', 'vista')
        vista_path = os.path.abspath(vista_path)
        return send_from_directory(vista_path, 'estadisticas-trabajador.html')
    except Exception as e:
        print(f"Error sirviendo estadisticas-trabajador.html: {e}")
        return "Archivo no encontrado", 404

@app.route('/vista/index-agricultor.html')
def index_agricultor_html():
    """Dashboard principal del agricultor"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        vista_path = os.path.join(base_dir, '..', 'vista')
        vista_path = os.path.abspath(vista_path)
        return send_from_directory(vista_path, 'index-agricultor.html')
    except Exception as e:
        print(f"Error sirviendo index-agricultor.html: {e}")
        return "Archivo no encontrado", 404

@app.route('/vista/index-trabajador.html')
def index_trabajador_html():
    """Dashboard principal del trabajador"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        vista_path = os.path.join(base_dir, '..', 'vista')
        vista_path = os.path.abspath(vista_path)
        return send_from_directory(vista_path, 'index-trabajador.html')
    except Exception as e:
        print(f"Error sirviendo index-trabajador.html: {e}")
        return "Archivo no encontrado", 404

@app.route('/vista/login-trabajador.html')
def login_trabajador_html():
    """Página de login"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        vista_path = os.path.join(base_dir, '..', 'vista')
        vista_path = os.path.abspath(vista_path)
        return send_from_directory(vista_path, 'login-trabajador.html')
    except Exception as e:
        print(f"Error sirviendo login-trabajador.html: {e}")
        return "Archivo no encontrado", 404

@app.route('/vista/perfil-trabajador.html')
def perfil_trabajador_html():
    """Página de perfil del trabajador"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        vista_path = os.path.join(base_dir, '..', 'vista')
        vista_path = os.path.abspath(vista_path)
        return send_from_directory(vista_path, 'perfil-trabajador.html')
    except Exception as e:
        print(f"Error sirviendo perfil-trabajador.html: {e}")
        return "Archivo no encontrado", 404

@app.route('/vista/registro-trabajador.html')
def registro_trabajador_html():
    """Página de registro del trabajador"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        vista_path = os.path.join(base_dir, '..', 'vista')
        vista_path = os.path.abspath(vista_path)
        return send_from_directory(vista_path, 'registro-trabajador.html')
    except Exception as e:
        print(f"Error sirviendo registro-trabajador.html: {e}")
        return "Archivo no encontrado", 404

@app.route('/vista/seleccion-rol.html')
def seleccion_rol_html():
    """Página de selección de rol"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        vista_path = os.path.join(base_dir, '..', 'vista')
        vista_path = os.path.abspath(vista_path)
        return send_from_directory(vista_path, 'seleccion-rol.html')
    except Exception as e:
        print(f"Error sirviendo seleccion-rol.html: {e}")
        return "Archivo no encontrado", 404

# ================================================================
# RUTAS PARA ARCHIVOS CSS DE ASSENT/CSS
# ================================================================

@app.route('/assent/css/favoritos.css')
def favoritos_css():
    """CSS para página de favoritos"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        css_path = os.path.join(base_dir, '..', 'assent', 'css')
        css_path = os.path.abspath(css_path)
        response = send_from_directory(css_path, 'favoritos.css')
        response.headers['Content-Type'] = 'text/css'
        return response
    except Exception as e:
        print(f"Error sirviendo favoritos.css: {e}")
        return "CSS no encontrado", 404

@app.route('/assent/css/historial-empleos.css')
def historial_empleos_css():
    """CSS para página de historial de empleos"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        css_path = os.path.join(base_dir, '..', 'assent', 'css')
        css_path = os.path.abspath(css_path)
        response = send_from_directory(css_path, 'historial-empleos.css')
        response.headers['Content-Type'] = 'text/css'
        return response
    except Exception as e:
        print(f"Error sirviendo historial-empleos.css: {e}")
        return "CSS no encontrado", 404

@app.route('/assent/css/postulaciones.css')
def postulaciones_css():
    """CSS para página de postulaciones"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        css_path = os.path.join(base_dir, '..', 'assent', 'css')
        css_path = os.path.abspath(css_path)
        response = send_from_directory(css_path, 'postulaciones.css')
        response.headers['Content-Type'] = 'text/css'
        return response
    except Exception as e:
        print(f"Error sirviendo postulaciones.css: {e}")
        return "CSS no encontrado", 404

# ================================================================
# RUTAS PARA ARCHIVOS JAVASCRIPT DE JS/
# ================================================================

@app.route('/js/favoritos.js')
def favoritos_js():
    """JavaScript para página de favoritos"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        js_path = os.path.join(base_dir, '..', 'js')
        js_path = os.path.abspath(js_path)
        response = send_from_directory(js_path, 'favoritos.js')
        response.headers['Content-Type'] = 'application/javascript'
        return response
    except Exception as e:
        print(f"Error sirviendo favoritos.js: {e}")
        return "JS no encontrado", 404

@app.route('/js/historial-empleos.js')
def historial_empleos_js():
    """JavaScript para página de historial de empleos"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        js_path = os.path.join(base_dir, '..', 'js')
        js_path = os.path.abspath(js_path)
        response = send_from_directory(js_path, 'historial-empleos.js')
        response.headers['Content-Type'] = 'application/javascript'
        return response
    except Exception as e:
        print(f"Error sirviendo historial-empleos.js: {e}")
        return "JS no encontrado", 404

@app.route('/js/postulaciones.js')
def postulaciones_js():
    """JavaScript para página de postulaciones"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        js_path = os.path.join(base_dir, '..', 'js')
        js_path = os.path.abspath(js_path)
        response = send_from_directory(js_path, 'postulaciones.js')
        response.headers['Content-Type'] = 'application/javascript'
        return response
    except Exception as e:
        print(f"Error sirviendo postulaciones.js: {e}")
        return "JS no encontrado", 404

# ================================================================
# APIS PARA FAVORITOS, HISTORIAL Y POSTULACIONES
# ================================================================

@app.route('/api/favoritos', methods=['GET', 'POST'])
@require_login
def handle_favoritos():
    """API para manejar trabajos favoritos usando tabla Postulacion"""
    user_id = session['user_id']
    
    if request.method == 'GET':
        try:
            favoritos = execute_query("""
                SELECT p.ID_Oferta, ot.Titulo, p.Fecha_Postulacion,
                       ot.Descripcion, ot.Pago_Ofrecido, ot.Estado,
                       CONCAT(u.Nombre, ' ', u.Apellido) as Agricultor,
                       pr.Nombre_Finca as Ubicacion
                FROM Postulacion p
                JOIN Oferta_Trabajo ot ON p.ID_Oferta = ot.ID_Oferta
                JOIN Usuario u ON ot.ID_Agricultor = u.ID_Usuario
                LEFT JOIN Predio pr ON u.ID_Usuario = pr.ID_Usuario
                WHERE p.ID_Trabajador = %s AND p.Estado = 'Favorito'
                ORDER BY p.Fecha_Postulacion DESC
            """, (user_id,))
            
            favoritos_list = []
            if favoritos:
                for fav in favoritos:
                    favoritos_list.append({
                        'job_id': fav['ID_Oferta'],
                        'titulo': fav['Titulo'],
                        'descripcion': fav['Descripcion'],
                        'pago': float(fav['Pago_Ofrecido']),
                        'agricultor': fav['Agricultor'],
                        'ubicacion': fav['Ubicacion'] if fav['Ubicacion'] else 'No especificada',
                        'estado': fav['Estado'],
                        'fecha_agregado': fav['Fecha_Postulacion'].isoformat() if fav['Fecha_Postulacion'] else None
                    })
            
            return jsonify({
                'success': True,
                'favoritos': favoritos_list
            })
            
        except Exception as e:
            print(f"Error obteniendo favoritos: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            job_id = data.get('job_id')
            action = data.get('action')
            
            if not job_id or not action:
                return jsonify({'success': False, 'error': 'Datos incompletos'}), 400
            
            if action == 'add':
                # Verificar si ya existe postulación para esta oferta
                existing = execute_query("""
                    SELECT ID_Postulacion, Estado FROM Postulacion 
                    WHERE ID_Trabajador = %s AND ID_Oferta = %s
                """, (user_id, job_id), fetch_one=True)
                
                if existing:
                    # Actualizar estado a Favorito
                    execute_query("""
                        UPDATE Postulacion 
                        SET Estado = 'Favorito', Fecha_Postulacion = CURRENT_TIMESTAMP
                        WHERE ID_Postulacion = %s
                    """, (existing['ID_Postulacion'],))
                else:
                    # Crear nueva entrada como favorito
                    execute_query("""
                        INSERT INTO Postulacion (ID_Oferta, ID_Trabajador, Estado, Fecha_Postulacion)
                        VALUES (%s, %s, 'Favorito', CURRENT_TIMESTAMP)
                    """, (job_id, user_id))
                
                message = "Trabajo agregado a favoritos"
                    
            elif action == 'remove':
                # Eliminar favorito
                execute_query("""
                    DELETE FROM Postulacion 
                    WHERE ID_Trabajador = %s AND ID_Oferta = %s AND Estado = 'Favorito'
                """, (user_id, job_id))
                
                message = "Trabajo removido de favoritos"
            
            return jsonify({
                'success': True,
                'message': message
            })
            
        except Exception as e:
            print(f"Error manejando favoritos: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/historial-empleos', methods=['GET'])
@require_login
def get_historial_empleos():
    """API para obtener historial de empleos del trabajador"""
    try:
        user_id = session['user_id']
        user_role = session.get('user_role')
        
        if user_role != 'Trabajador':
            return jsonify({'success': False, 'error': 'Acceso denegado'}), 403
        
        # Consulta para obtener historial de empleos
        empleos = execute_query("""
            SELECT 
                al.ID_Acuerdo,
                ot.Titulo,
                CONCAT(u.Nombre, ' ', u.Apellido) as Empleador,
                u.ID_Usuario as Empleador_ID,
                al.Fecha_Inicio,
                al.Fecha_Fin,
                al.Pago_Final,
                al.Estado,
                ot.Descripcion,
                c.Puntuacion,
                c.Comentario,
                ot.Pago_Ofrecido,
                p.Nombre_Finca as Ubicacion
            FROM Acuerdo_Laboral al
            JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
            JOIN Usuario u ON ot.ID_Agricultor = u.ID_Usuario
            LEFT JOIN Predio p ON u.ID_Usuario = p.ID_Usuario
            LEFT JOIN Calificacion c ON al.ID_Acuerdo = c.ID_Acuerdo AND c.ID_Usuario_Receptor = %s
            WHERE al.ID_Trabajador = %s
            ORDER BY al.Fecha_Inicio DESC
        """, (user_id, user_id))
        
        empleos_list = []
        if empleos:
            for empleo in empleos:
                # Calcular duración
                if empleo['Fecha_Fin']:
                    duracion_dias = (empleo['Fecha_Fin'] - empleo['Fecha_Inicio']).days + 1
                    duracion = f"{duracion_dias} días"
                else:
                    duracion = "En curso"
                
                # Determinar tipo de trabajo
                descripcion = empleo['Descripcion'].lower()
                if 'cosecha' in descripcion or 'recolección' in descripcion:
                    tipo = 'Cosecha'
                elif 'siembra' in descripcion:
                    tipo = 'Siembra'
                elif 'mantenimiento' in descripcion or 'poda' in descripcion:
                    tipo = 'Mantenimiento'
                else:
                    tipo = 'Otro'
                
                empleo_data = {
                    'id': empleo['ID_Acuerdo'],
                    'titulo': empleo['Titulo'],
                    'empleador': empleo['Empleador'],
                    'empleadorId': empleo['Empleador_ID'],
                    'fechaInicio': empleo['Fecha_Inicio'].strftime('%Y-%m-%d') if empleo['Fecha_Inicio'] else None,
                    'fechaFin': empleo['Fecha_Fin'].strftime('%Y-%m-%d') if empleo['Fecha_Fin'] else None,
                    'duracion': duracion,
                    'estado': empleo['Estado'],
                    'pago': float(empleo['Pago_Final']) if empleo['Pago_Final'] else float(empleo['Pago_Ofrecido']),
                    'ubicacion': empleo['Ubicacion'] if empleo['Ubicacion'] else 'Colombia',
                    'calificacion': empleo['Puntuacion'],
                    'comentario': empleo['Comentario'],
                    'descripcion': empleo['Descripcion'],
                    'tipo': tipo
                }
                empleos_list.append(empleo_data)
        
        return jsonify({
            'success': True,
            'empleos': empleos_list
        })
        
    except Exception as e:
        print(f"Error obteniendo historial: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/postulaciones', methods=['GET'])
@require_login
def get_postulaciones():
    """API para obtener postulaciones del trabajador"""
    try:
        user_id = session['user_id']
        user_role = session.get('user_role')
        
        if user_role != 'Trabajador':
            return jsonify({'success': False, 'error': 'Acceso denegado'}), 403
        
        # Consulta para obtener postulaciones
        postulaciones = execute_query("""
            SELECT 
                p.ID_Postulacion,
                ot.Titulo,
                CONCAT(u.Nombre, ' ', u.Apellido) as Agricultor,
                u.ID_Usuario as Agricultor_ID,
                p.Fecha_Postulacion,
                p.Estado,
                ot.Pago_Ofrecido,
                pr.Nombre_Finca as Ubicacion,
                ot.Descripcion,
                ot.Fecha_Publicacion,
                ot.ID_Oferta,
                (SELECT COUNT(*) FROM Mensaje m 
                 WHERE (m.ID_Emisor = %s AND m.ID_Receptor = u.ID_Usuario) 
                    OR (m.ID_Emisor = u.ID_Usuario AND m.ID_Receptor = %s)) as Mensajes
            FROM Postulacion p
            JOIN Oferta_Trabajo ot ON p.ID_Oferta = ot.ID_Oferta
            JOIN Usuario u ON ot.ID_Agricultor = u.ID_Usuario
            LEFT JOIN Predio pr ON u.ID_Usuario = pr.ID_Usuario
            WHERE p.ID_Trabajador = %s
            ORDER BY p.Fecha_Postulacion DESC
        """, (user_id, user_id, user_id))
        
        postulaciones_list = []
        if postulaciones:
            for post in postulaciones:
                # Simular duración basada en tipo de trabajo
                descripcion = post['Descripcion'].lower()
                if 'cosecha' in descripcion:
                    duracion = "3-5 días"
                elif 'siembra' in descripcion:
                    duracion = "2-4 días"
                elif 'mantenimiento' in descripcion:
                    duracion = "1-2 días"
                else:
                    duracion = "1-3 días"
                
                # Fecha de inicio estimada
                fecha_inicio = post['Fecha_Publicacion'] + timedelta(days=7)
                
                postulacion_data = {
                    'id': post['ID_Postulacion'],
                    'titulo': post['Titulo'],
                    'agricultor': post['Agricultor'],
                    'agricultorId': post['Agricultor_ID'],
                    'fechaPostulacion': post['Fecha_Postulacion'].isoformat(),
                    'estado': post['Estado'],
                    'pago': float(post['Pago_Ofrecido']),
                    'ubicacion': post['Ubicacion'] if post['Ubicacion'] else 'Colombia',
                    'descripcion': post['Descripcion'],
                    'duracion': duracion,
                    'fechaInicio': fecha_inicio.strftime('%Y-%m-%d'),
                    'ultimaActualizacion': post['Fecha_Postulacion'].isoformat(),
                    'mensajes': post['Mensajes'],
                    'prioridad': 'alta' if post['Pago_Ofrecido'] > 50000 else 'media' if post['Pago_Ofrecido'] > 40000 else 'baja',
                    'oferta_id': post['ID_Oferta']
                }
                
                # Información adicional según estado
                if post['Estado'] == 'Rechazada':
                    postulacion_data['motivoRechazo'] = 'Perfil no coincide con los requisitos'
                
                postulaciones_list.append(postulacion_data)
        
        return jsonify({
            'success': True,
            'postulaciones': postulaciones_list
        })
        
    except Exception as e:
        print(f"Error obteniendo postulaciones: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

print("✅ Todas las rutas para favoritos, historial, postulaciones y archivos estáticos cargadas correctamente")

# ================================================================
# RUTA PARA CANCELAR POSTULACIONES
# ================================================================

@app.route('/api/postulaciones/<int:postulacion_id>/cancelar', methods=['POST'])
@require_login
def cancelar_postulacion(postulacion_id):
    """API para cancelar una postulación específica"""
    try:
        user_id = session['user_id']
        user_role = session.get('user_role')
        
        if user_role != 'Trabajador':
            return jsonify({'success': False, 'error': 'Acceso denegado'}), 403
        
        # Verificar que la postulación existe y pertenece al trabajador
        postulacion = execute_query("""
            SELECT p.ID_Postulacion, p.Estado, ot.Titulo
            FROM Postulacion p
            JOIN Oferta_Trabajo ot ON p.ID_Oferta = ot.ID_Oferta
            WHERE p.ID_Postulacion = %s AND p.ID_Trabajador = %s
        """, (postulacion_id, user_id), fetch_one=True)
        
        if not postulacion:
            return jsonify({
                'success': False, 
                'error': 'Postulación no encontrada o no tienes permisos para cancelarla'
            }), 404
        
        # Verificar que se puede cancelar (solo las pendientes)
        if postulacion['Estado'] != 'Pendiente':
            return jsonify({
                'success': False,
                'error': f'No se puede cancelar una postulación con estado: {postulacion["Estado"]}'
            }), 400
        
        # Eliminar la postulación de la base de datos
        execute_query("""
            DELETE FROM Postulacion 
            WHERE ID_Postulacion = %s AND ID_Trabajador = %s
        """, (postulacion_id, user_id))
        
        return jsonify({
            'success': True,
            'message': f'Postulación para "{postulacion["Titulo"]}" cancelada exitosamente'
        })
        
    except Exception as e:
        print(f"Error cancelando postulación: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
    
@app.route('/api/debug_postulaciones', methods=['GET'])
@require_login
def debug_postulaciones():
    """Debug para ver qué hay en la BD"""
    try:
        user_id = session['user_id']
        
        # Ver TODAS las postulaciones sin filtros
        todas = execute_query("""
            SELECT 
                p.ID_Postulacion,
                p.ID_Oferta,
                p.ID_Trabajador,
                p.Estado,
                p.Fecha_Postulacion,
                ot.Titulo
            FROM Postulacion p
            LEFT JOIN Oferta_Trabajo ot ON p.ID_Oferta = ot.ID_Oferta
            WHERE p.ID_Trabajador = %s
        """, (user_id,))
        
        # Ver favoritos específicamente
        favoritos = execute_query("""
            SELECT COUNT(*) as total
            FROM Postulacion 
            WHERE ID_Trabajador = %s AND Estado = 'Favorito'
        """, (user_id,), fetch_one=True)
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'total_postulaciones': len(todas) if todas else 0,
            'total_favoritos': favoritos['total'] if favoritos else 0,
            'postulaciones': todas or [],
            'session_data': {
                'user_role': session.get('user_role'),
                'user_name': session.get('user_name')
            }
        })
        
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })


# ================================================================
# MEJORA EN LA API DE POSTULACIONES EXISTENTE
# ================================================================

@app.route('/api/postulaciones', methods=['GET'])
@require_login
def get_postulaciones_mejorada():
    """API para obtener postulaciones del trabajador (versión mejorada con favoritos)"""
    try:
        user_id = session['user_id']
        user_role = session.get('user_role')
        
        if user_role != 'Trabajador':
            return jsonify({'success': False, 'error': 'Acceso denegado'}), 403
        
        # CAMBIO IMPORTANTE: Incluir TODOS los estados, incluyendo Favorito
        postulaciones = execute_query("""
            SELECT 
                p.ID_Postulacion,
                p.ID_Oferta,
                ot.Titulo,
                CONCAT(u.Nombre, ' ', u.Apellido) as Agricultor,
                u.ID_Usuario as Agricultor_ID,
                p.Fecha_Postulacion,
                p.Estado,
                ot.Pago_Ofrecido,
                COALESCE(pr.Nombre_Finca, CONCAT(u.Nombre, ' - ', SUBSTRING(u.Correo, 1, LOCATE('@', u.Correo) - 1))) as Ubicacion,
                ot.Descripcion,
                ot.Fecha_Publicacion,
                (SELECT COUNT(*) FROM Mensaje m 
                 WHERE (m.ID_Emisor = %s AND m.ID_Receptor = u.ID_Usuario) 
                    OR (m.ID_Emisor = u.ID_Usuario AND m.ID_Receptor = %s)) as Mensajes,
                CASE 
                    WHEN LOWER(ot.Descripcion) LIKE '%%cosecha%%' OR LOWER(ot.Descripcion) LIKE '%%recolección%%' THEN '3-5 días'
                    WHEN LOWER(ot.Descripcion) LIKE '%%siembra%%' THEN '2-4 días'
                    WHEN LOWER(ot.Descripcion) LIKE '%%mantenimiento%%' OR LOWER(ot.Descripcion) LIKE '%%poda%%' THEN '1-2 días'
                    WHEN LOWER(ot.Descripcion) LIKE '%%fumigación%%' THEN '1-3 días'
                    ELSE '1-3 días'
                END as Duracion_Estimada,
                CASE 
                    WHEN ot.Pago_Ofrecido >= 50000 THEN 'alta'
                    WHEN ot.Pago_Ofrecido >= 40000 THEN 'media'
                    ELSE 'baja'
                END as Prioridad
            FROM Postulacion p
            JOIN Oferta_Trabajo ot ON p.ID_Oferta = ot.ID_Oferta
            JOIN Usuario u ON ot.ID_Agricultor = u.ID_Usuario
            LEFT JOIN Predio pr ON u.ID_Usuario = pr.ID_Usuario
            WHERE p.ID_Trabajador = %s
            ORDER BY 
                CASE p.Estado
                    WHEN 'Pendiente' THEN 1
                    WHEN 'Aceptada' THEN 2
                    WHEN 'Favorito' THEN 3
                    WHEN 'Rechazada' THEN 4
                    ELSE 5
                END,
                p.Fecha_Postulacion DESC
        """, (user_id, user_id, user_id))
        
        postulaciones_list = []
        if postulaciones:
            for post in postulaciones:
                fecha_inicio = None
                if post['Fecha_Publicacion']:
                    fecha_inicio_dt = post['Fecha_Publicacion'] + timedelta(days=7)
                    fecha_inicio = fecha_inicio_dt.strftime('%Y-%m-%d')
                
                postulacion_data = {
                    'id': post['ID_Postulacion'],
                    'titulo': post['Titulo'],
                    'agricultor': post['Agricultor'],
                    'agricultorId': post['Agricultor_ID'],
                    'fechaPostulacion': post['Fecha_Postulacion'].isoformat() if post['Fecha_Postulacion'] else None,
                    'estado': post['Estado'],
                    'pago': float(post['Pago_Ofrecido']) if post['Pago_Ofrecido'] else 0,
                    'ubicacion': post['Ubicacion'],
                    'descripcion': post['Descripcion'] or 'Descripción no disponible',
                    'duracion': post['Duracion_Estimada'],
                    'fechaInicio': fecha_inicio,
                    'ultimaActualizacion': post['Fecha_Postulacion'].isoformat() if post['Fecha_Postulacion'] else None,
                    'mensajes': post['Mensajes'] or 0,
                    'prioridad': post['Prioridad'],
                    'oferta_id': post['ID_Oferta']
                }
                
                if post['Estado'] == 'Rechazada':
                    postulacion_data['motivoRechazo'] = 'El agricultor seleccionó otro candidato'
                
                postulaciones_list.append(postulacion_data)
        
        return jsonify({
            'success': True,
            'postulaciones': postulaciones_list,
            'total': len(postulaciones_list)
        })
        
    except Exception as e:
        print(f"Error obteniendo postulaciones: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ================================================================
# RUTA PARA CREAR NUEVA POSTULACIÓN
# ================================================================

@app.route('/api/postulaciones', methods=['POST'])
@require_login
def crear_postulacion():
    """API para crear una nueva postulación a un trabajo"""
    try:
        user_id = session['user_id']
        user_role = session.get('user_role')
        
        if user_role != 'Trabajador':
            return jsonify({'success': False, 'error': 'Solo los trabajadores pueden postularse'}), 403
        
        data = request.get_json()
        oferta_id = data.get('oferta_id')
        
        if not oferta_id:
            return jsonify({'success': False, 'error': 'ID de oferta requerido'}), 400
        
        # Verificar que la oferta existe y está abierta
        oferta = execute_query("""
            SELECT ID_Oferta, Titulo, Estado, ID_Agricultor 
            FROM Oferta_Trabajo 
            WHERE ID_Oferta = %s
        """, (oferta_id,), fetch_one=True)
        
        if not oferta:
            return jsonify({'success': False, 'error': 'Oferta de trabajo no encontrada'}), 404
        
        if oferta['Estado'] != 'Abierta':
            return jsonify({'success': False, 'error': 'Esta oferta ya no está disponible'}), 400
        
        # Verificar que el trabajador no se postule a su propia oferta (en caso de que sea agricultor también)
        if oferta['ID_Agricultor'] == user_id:
            return jsonify({'success': False, 'error': 'No puedes postularte a tu propia oferta'}), 400
        
        # Verificar que no existe ya una postulación
        postulacion_existente = execute_query("""
            SELECT ID_Postulacion FROM Postulacion 
            WHERE ID_Oferta = %s AND ID_Trabajador = %s
        """, (oferta_id, user_id), fetch_one=True)
        
        if postulacion_existente:
            return jsonify({'success': False, 'error': 'Ya te has postulado a esta oferta'}), 400
        
        # Crear la postulación
        execute_query("""
            INSERT INTO Postulacion (ID_Oferta, ID_Trabajador, Estado, Fecha_Postulacion)
            VALUES (%s, %s, 'Pendiente', CURRENT_TIMESTAMP)
        """, (oferta_id, user_id))
        
        return jsonify({
            'success': True,
            'message': f'Te has postulado exitosamente para "{oferta["Titulo"]}"'
        })
        
    except Exception as e:
        print(f"Error creando postulación: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

print("✅ Rutas para cancelar postulaciones y API mejorada agregadas correctamente")

# ================================================================
# RUTAS PARA POSTULACIONES Y FAVORITOS DESDE EL DASHBOARD
# ================================================================

@app.route('/api/trabajos-disponibles', methods=['GET'])
@require_login
def get_trabajos_disponibles():
    """API para obtener trabajos disponibles en el dashboard"""
    try:
        user_id = session['user_id']
        user_role = session.get('user_role')
        
        if user_role != 'Trabajador':
            return jsonify({'success': False, 'error': 'Acceso denegado'}), 403
        
        # Obtener trabajos disponibles que no sean del propio usuario y que estén abiertos
        trabajos = execute_query("""
            SELECT 
                ot.ID_Oferta,
                ot.Titulo,
                ot.Descripcion,
                ot.Pago_Ofrecido,
                ot.Estado as Estado_Oferta,
                ot.Fecha_Publicacion,
                CONCAT(u.Nombre, ' ', u.Apellido) as Empleador,
                COALESCE(pr.Nombre_Finca, CONCAT(u.Nombre, ' - Finca')) as Ubicacion,
                u.ID_Usuario as Empleador_ID,
                -- Verificar si el trabajador ya se postuló
                (SELECT COUNT(*) FROM Postulacion p 
                 WHERE p.ID_Oferta = ot.ID_Oferta AND p.ID_Trabajador = %s) as Ya_Postulado,
                -- Verificar si está en favoritos
                (SELECT COUNT(*) FROM Postulacion p 
                 WHERE p.ID_Oferta = ot.ID_Oferta AND p.ID_Trabajador = %s AND p.Estado = 'Favorito') as Es_Favorito
            FROM Oferta_Trabajo ot
            JOIN Usuario u ON ot.ID_Agricultor = u.ID_Usuario
            LEFT JOIN Predio pr ON u.ID_Usuario = pr.ID_Usuario
            WHERE ot.ID_Agricultor != %s 
              AND ot.Estado = 'Abierta'
              AND ot.Fecha_Publicacion >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ORDER BY ot.Fecha_Publicacion DESC
            LIMIT 20
        """, (user_id, user_id, user_id))
        
        trabajos_list = []
        if trabajos:
            for trabajo in trabajos:
                # Determinar el tipo basado en la descripción
                descripcion_lower = trabajo['Descripcion'].lower()
                if 'cosecha' in descripcion_lower or 'recolección' in descripcion_lower:
                    tipo = 'cosecha'
                elif 'siembra' in descripcion_lower:
                    tipo = 'siembra'
                elif 'mantenimiento' in descripcion_lower or 'poda' in descripcion_lower:
                    tipo = 'mantenimiento'
                elif 'recolección' in descripcion_lower:
                    tipo = 'recoleccion'
                else:
                    tipo = 'otros'
                
                # Calcular duración estimada
                if 'cosecha' in descripcion_lower or 'café' in descripcion_lower:
                    duracion = '3-5 días'
                elif 'siembra' in descripcion_lower:
                    duracion = '2-4 días'
                elif 'mantenimiento' in descripcion_lower:
                    duracion = '1-2 días'
                else:
                    duracion = '1-3 días'
                
                trabajo_data = {
                    'id': trabajo['ID_Oferta'],
                    'titulo': trabajo['Titulo'],
                    'descripcion': trabajo['Descripcion'],
                    'pago': float(trabajo['Pago_Ofrecido']) if trabajo['Pago_Ofrecido'] else 0,
                    'empleador': trabajo['Empleador'],
                    'empleador_id': trabajo['Empleador_ID'],
                    'ubicacion': trabajo['Ubicacion'],
                    'fecha_publicacion': trabajo['Fecha_Publicacion'].isoformat() if trabajo['Fecha_Publicacion'] else None,
                    'tipo': tipo,
                    'duracion': duracion,
                    'ya_postulado': bool(trabajo['Ya_Postulado']),
                    'es_favorito': bool(trabajo['Es_Favorito'])
                }
                trabajos_list.append(trabajo_data)
        
        return jsonify({
            'success': True,
            'trabajos': trabajos_list,
            'total': len(trabajos_list)
        })
        
    except Exception as e:
        print(f"Error obteniendo trabajos disponibles: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/postular-trabajo', methods=['POST'])
@require_login
def postular_trabajo():
    """API para postularse a un trabajo desde el dashboard"""
    try:
        user_id = session['user_id']
        user_role = session.get('user_role')
        
        if user_role != 'Trabajador':
            return jsonify({'success': False, 'error': 'Solo los trabajadores pueden postularse'}), 403
        
        data = request.get_json()
        oferta_id = data.get('oferta_id')
        
        if not oferta_id:
            return jsonify({'success': False, 'error': 'ID de oferta requerido'}), 400
        
        # Verificar que la oferta existe y está disponible
        oferta = execute_query("""
            SELECT 
                ot.ID_Oferta, 
                ot.Titulo, 
                ot.Estado, 
                ot.ID_Agricultor,
                CONCAT(u.Nombre, ' ', u.Apellido) as Empleador
            FROM Oferta_Trabajo ot
            JOIN Usuario u ON ot.ID_Agricultor = u.ID_Usuario
            WHERE ot.ID_Oferta = %s
        """, (oferta_id,), fetch_one=True)
        
        if not oferta:
            return jsonify({'success': False, 'error': 'Oferta de trabajo no encontrada'}), 404
        
        if oferta['Estado'] != 'Abierta':
            return jsonify({'success': False, 'error': 'Esta oferta ya no está disponible'}), 400
        
        # Verificar que no se postule a su propia oferta
        if oferta['ID_Agricultor'] == user_id:
            return jsonify({'success': False, 'error': 'No puedes postularte a tu propia oferta'}), 400
        
        # Verificar si ya existe una postulación (no favorito)
        postulacion_existente = execute_query("""
            SELECT ID_Postulacion FROM Postulacion 
            WHERE ID_Oferta = %s AND ID_Trabajador = %s AND Estado != 'Favorito'
        """, (oferta_id, user_id), fetch_one=True)
        
        if postulacion_existente:
            return jsonify({'success': False, 'error': 'Ya te has postulado a esta oferta'}), 400
        
        # Verificar si existe como favorito, en ese caso actualizar el estado
        favorito_existente = execute_query("""
            SELECT ID_Postulacion FROM Postulacion 
            WHERE ID_Oferta = %s AND ID_Trabajador = %s AND Estado = 'Favorito'
        """, (oferta_id, user_id), fetch_one=True)
        
        if favorito_existente:
            # Actualizar de favorito a postulación pendiente
            execute_query("""
                UPDATE Postulacion 
                SET Estado = 'Pendiente', Fecha_Postulacion = CURRENT_TIMESTAMP
                WHERE ID_Postulacion = %s
            """, (favorito_existente['ID_Postulacion'],))
        else:
            # Crear nueva postulación
            execute_query("""
                INSERT INTO Postulacion (ID_Oferta, ID_Trabajador, Estado, Fecha_Postulacion)
                VALUES (%s, %s, 'Pendiente', CURRENT_TIMESTAMP)
            """, (oferta_id, user_id))
        
        return jsonify({
            'success': True,
            'message': f'Te has postulado exitosamente para "{oferta["Titulo"]}" con {oferta["Empleador"]}',
            'oferta_titulo': oferta['Titulo'],
            'empleador': oferta['Empleador']
        })
        
    except Exception as e:
        print(f"Error creando postulación: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/toggle-favorito', methods=['POST'])
@require_login
def toggle_favorito():
    """API para agregar/quitar favoritos desde el dashboard"""
    try:
        user_id = session['user_id']
        user_role = session.get('user_role')
        
        if user_role != 'Trabajador':
            return jsonify({'success': False, 'error': 'Acceso denegado'}), 403
        
        data = request.get_json()
        oferta_id = data.get('job_id')  # Mantener compatibilidad con el frontend
        action = data.get('action')
        
        if not oferta_id or not action:
            return jsonify({'success': False, 'error': 'Datos incompletos'}), 400
        
        # Verificar que la oferta existe
        oferta = execute_query("""
            SELECT 
                ot.ID_Oferta, 
                ot.Titulo, 
                ot.Estado,
                CONCAT(u.Nombre, ' ', u.Apellido) as Empleador
            FROM Oferta_Trabajo ot
            JOIN Usuario u ON ot.ID_Agricultor = u.ID_Usuario
            WHERE ot.ID_Oferta = %s
        """, (oferta_id,), fetch_one=True)
        
        if not oferta:
            return jsonify({'success': False, 'error': 'Oferta no encontrada'}), 404
        
        # Verificar si ya existe algún tipo de postulación
        postulacion_existente = execute_query("""
            SELECT ID_Postulacion, Estado FROM Postulacion 
            WHERE ID_Oferta = %s AND ID_Trabajador = %s
        """, (oferta_id, user_id), fetch_one=True)
        
        if action == 'add':
            if postulacion_existente:
                if postulacion_existente['Estado'] == 'Favorito':
                    # Ya es favorito
                    return jsonify({'success': False, 'error': 'Ya está en favoritos'}), 400
                else:
                    # Ya hay postulación activa, no se puede agregar como favorito
                    return jsonify({'success': False, 'error': 'Ya tienes una postulación activa para este trabajo'}), 400
            else:
                # Crear nueva entrada como favorito
                execute_query("""
                    INSERT INTO Postulacion (ID_Oferta, ID_Trabajador, Estado, Fecha_Postulacion)
                    VALUES (%s, %s, 'Favorito', CURRENT_TIMESTAMP)
                """, (oferta_id, user_id))
                
                message = f'"{oferta["Titulo"]}" agregado a favoritos'
        
        elif action == 'remove':
            if postulacion_existente and postulacion_existente['Estado'] == 'Favorito':
                # Eliminar favorito
                execute_query("""
                    DELETE FROM Postulacion 
                    WHERE ID_Postulacion = %s
                """, (postulacion_existente['ID_Postulacion'],))
                
                message = f'"{oferta["Titulo"]}" removido de favoritos'
            else:
                return jsonify({'success': False, 'error': 'No está en favoritos'}), 400
        
        else:
            return jsonify({'success': False, 'error': 'Acción no válida'}), 400
        
        return jsonify({
            'success': True,
            'message': message,
            'oferta_titulo': oferta['Titulo']
        })
        
    except Exception as e:
        print(f"Error manejando favorito: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/dashboard-stats', methods=['GET'])
@require_login
def get_dashboard_stats():
    """API para obtener estadísticas del dashboard"""
    try:
        user_id = session['user_id']
        user_role = session.get('user_role')
        
        if user_role != 'Trabajador':
            return jsonify({'success': False, 'error': 'Acceso denegado'}), 403
        
        # Contar trabajos cercanos (ofertas disponibles)
        trabajos_cercanos = execute_query("""
            SELECT COUNT(*) as total
            FROM Oferta_Trabajo ot
            WHERE ot.ID_Agricultor != %s 
              AND ot.Estado = 'Abierta'
              AND ot.Fecha_Publicacion >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        """, (user_id,), fetch_one=True)
        
        # Contar postulaciones pendientes
        postulaciones_pendientes = execute_query("""
            SELECT COUNT(*) as total
            FROM Postulacion p
            WHERE p.ID_Trabajador = %s 
              AND p.Estado = 'Pendiente'
        """, (user_id,), fetch_one=True)
        
        # Contar trabajos en progreso (acuerdos activos)
        trabajos_progreso = execute_query("""
            SELECT COUNT(*) as total
            FROM Acuerdo_Laboral al
            WHERE al.ID_Trabajador = %s 
              AND al.Estado = 'Activo'
        """, (user_id,), fetch_one=True)
        
        # Contar favoritos
        favoritos = execute_query("""
            SELECT COUNT(*) as total
            FROM Postulacion p
            WHERE p.ID_Trabajador = %s 
              AND p.Estado = 'Favorito'
        """, (user_id,), fetch_one=True)
        
        return jsonify({
            'success': True,
            'stats': {
                'trabajos_cercanos': trabajos_cercanos['total'] if trabajos_cercanos else 0,
                'postulaciones': postulaciones_pendientes['total'] if postulaciones_pendientes else 0,
                'en_progreso': trabajos_progreso['total'] if trabajos_progreso else 0,
                'favoritos': favoritos['total'] if favoritos else 0
            }
        })
        
    except Exception as e:
        print(f"Error obteniendo estadísticas: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

print("✅ Rutas para postulaciones y favoritos desde dashboard agregadas correctamente")

# ================================================================
# RUTAS ESPECÍFICAS PARA EL ADMINISTRADOR
# Agregar estas rutas a tu app.py existente
# ================================================================

# ================================================================
# RUTAS PARA ARCHIVOS DEL ADMINISTRADOR
# ================================================================

@app.route('/vista/index-administrador.html')
def index_administrador_html():
    """Dashboard principal del administrador"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        vista_path = os.path.join(base_dir, '..', 'vista')
        vista_path = os.path.abspath(vista_path)
        return send_from_directory(vista_path, 'index-administrador.html')
    except Exception as e:
        print(f"Error sirviendo index-administrador.html: {e}")
        return "Archivo no encontrado", 404

@app.route('/assent/css/index-administrador.css')
def administrador_css():
    """CSS para el dashboard del administrador"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        css_path = os.path.join(base_dir, '..', 'assent', 'css')
        css_path = os.path.abspath(css_path)
        response = send_from_directory(css_path, 'index-administrador.css')
        response.headers['Content-Type'] = 'text/css'
        return response
    except Exception as e:
        print(f"Error sirviendo index-administrador.css: {e}")
        return "CSS no encontrado", 404

@app.route('/js/index-administrador.js')
def administrador_js():
    """JavaScript para el dashboard del administrador"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        js_path = os.path.join(base_dir, '..', 'js')
        js_path = os.path.abspath(js_path)
        response = send_from_directory(js_path, 'index-administrador.js')
        response.headers['Content-Type'] = 'application/javascript'
        return response
    except Exception as e:
        print(f"Error sirviendo index-administrador.js: {e}")
        return "JS no encontrado", 404

# ================================================================
# MODIFICAR LA FUNCIÓN DE LOGIN EXISTENTE
# Reemplaza tu función login() existente con esta versión actualizada
# ================================================================

@app.route('/login.py', methods=['POST'])
def login_actualizado():
    """Procesa el login de usuarios - VERSIÓN ACTUALIZADA CON ADMINISTRADOR"""
    
    try:
        # Recoger datos del formulario
        email = request.form.get('email', '').strip()
        password = request.form.get('contrasena', '')
        
        print(f"🔐 Intento de login para: {email}")
        
        # Validaciones básicas
        if not email or not password:
            raise Exception('Por favor completa todos los campos.')
        
        # Buscar usuario en la base de datos
        user = execute_query(
            """SELECT u.ID_Usuario, u.Nombre, u.Apellido, u.Correo, u.Contrasena, u.Rol, u.Estado, u.Telefono
               FROM Usuario u 
               WHERE u.Correo = %s OR u.Telefono = %s""",
            (email, email),
            fetch_one=True
        )
        
        if not user:
            raise Exception('Credenciales incorrectas.')
        
        # Verificar contraseña
        if not verify_password(password, user['Contrasena']):
            raise Exception('Credenciales incorrectas.')
        
        # Verificar que el usuario esté activo
        if user['Estado'] != 'Activo':
            raise Exception('Tu cuenta está inactiva. Contacta al administrador.')
        
        # Crear sesión con todos los datos necesarios
        session['user_id'] = user['ID_Usuario']
        session['username'] = user['Correo']
        session['first_name'] = user['Nombre']
        session['last_name'] = user['Apellido']
        session['email'] = user['Correo']
        session['user_role'] = user['Rol']
        session['role'] = user['Rol']
        session['user_name'] = f"{user['Nombre']} {user['Apellido']}"
        session['telefono'] = user.get('Telefono', '')
        
        print(f"✅ Login exitoso para: {user['Nombre']} {user['Apellido']} - Rol: {user['Rol']}")
        print(f"📊 Datos de sesión guardados: ID={user['ID_Usuario']}, Role={user['Rol']}")
        
        # Redireccionar según el rol - ACTUALIZADO PARA INCLUIR ADMINISTRADOR
        base_dir = os.path.dirname(os.path.abspath(__file__))
        
        if user['Rol'] == 'Agricultor':
            redirect_url = '/vista/index-agricultor.html'
            dashboard_path = os.path.join(base_dir, '..', 'vista', 'index-agricultor.html')
            
        elif user['Rol'] == 'Trabajador':
            redirect_url = '/vista/index-trabajador.html'
            dashboard_path = os.path.join(base_dir, '..', 'vista', 'index-trabajador.html')
            
        elif user['Rol'] == 'Administrador':
            redirect_url = '/vista/index-administrador.html'
            dashboard_path = os.path.join(base_dir, '..', 'vista', 'index-administrador.html')
            print("🔄 Preparando redirección a dashboard de ADMINISTRADOR")
            
        else:
            raise Exception('Rol de usuario no válido.')
        
        # Verificar que el archivo existe
        if not os.path.exists(dashboard_path):
            print(f"❌ DASHBOARD NO EXISTE: {dashboard_path}")
            # Fallback a un dashboard genérico
            redirect_url = '/vista/index-trabajador.html'
        else:
            print(f"✅ Dashboard encontrado: {dashboard_path}")
        
        print(f"🎯 Redirigiendo a: {redirect_url}")
        return redirect(redirect_url)
        
    except Exception as e:
        print(f"❌ Error en login: {str(e)}")
        
        # Redireccionar con error
        referer = request.headers.get('Referer', '')
        if 'login-trabajador.html' in referer:
            login_page = '/vista/login-trabajador.html'
        else:
            login_page = '/vista/login-trabajador.html'
        
        error_message = quote(str(e))
        return redirect(f"{login_page}?message={error_message}&type=error")

# ================================================================
# ACTUALIZAR LA FUNCIÓN dashboard_admin EXISTENTE
# ================================================================

@app.route('/dashboard-admin')
def dashboard_admin_actualizado():
    """Ruta para el dashboard del administrador - VERSIÓN ACTUALIZADA"""
    if 'user_id' not in session:
        print("❌ Usuario no autenticado, redirigiendo a login")
        return redirect('/vista/login-trabajador.html')
    
    # Verificar que el usuario sea administrador
    if session.get('user_role') != 'Administrador':
        print(f"❌ Usuario no es administrador: {session.get('user_role')}")
        # Redireccionar según su rol actual
        if session.get('user_role') == 'Agricultor':
            return redirect('/vista/index-agricultor.html')
        else:
            return redirect('/vista/index-trabajador.html')
    
    print(f"✅ Acceso autorizado al dashboard de administrador: {session.get('user_name')}")
    return redirect('/vista/index-administrador.html')

# ================================================================
# APIS PARA EL DASHBOARD DEL ADMINISTRADOR
# ================================================================

@app.route('/api/admin/users', methods=['GET'])
@require_role('Administrador')
def get_all_users_admin():
    """Obtiene todos los usuarios para el dashboard del administrador"""
    try:
        # Filtros opcionales
        tipo_filter = request.args.get('tipo', '')
        estado_filter = request.args.get('estado', '')
        region_filter = request.args.get('region', '')
        
        # Base query
        base_query = """
            SELECT 
                u.ID_Usuario,
                u.Nombre,
                u.Apellido,
                u.Correo,
                u.Telefono,
                u.Rol,
                u.Estado,
                u.Fecha_Registro,
                u.Red_Social,
                -- Información adicional según el rol
                CASE 
                    WHEN u.Rol = 'Agricultor' THEN (
                        SELECT COUNT(*) FROM Oferta_Trabajo ot WHERE ot.ID_Agricultor = u.ID_Usuario
                    )
                    WHEN u.Rol = 'Trabajador' THEN (
                        SELECT COUNT(*) FROM Postulacion p WHERE p.ID_Trabajador = u.ID_Usuario
                    )
                    ELSE 0
                END as Actividad_Total,
                -- Región aproximada (extraer de información disponible)
                COALESCE(
                    (SELECT pr.Nombre_Finca FROM Predio pr WHERE pr.ID_Usuario = u.ID_Usuario LIMIT 1),
                    'Sin especificar'
                ) as Region_Info
            FROM Usuario u
            WHERE 1=1
        """
        
        params = []
        
        # Aplicar filtros
        if tipo_filter and tipo_filter in ['Agricultor', 'Trabajador', 'Administrador']:
            base_query += " AND u.Rol = %s"
            params.append(tipo_filter)
        
        if estado_filter and estado_filter in ['Activo', 'Inactivo', 'Suspendido']:
            base_query += " AND u.Estado = %s"
            params.append(estado_filter)
        
        # El filtro de región es más complejo, por simplicidad lo omitimos o lo implementamos básico
        if region_filter:
            base_query += " AND (u.Correo LIKE %s OR EXISTS (SELECT 1 FROM Predio p WHERE p.ID_Usuario = u.ID_Usuario AND p.Nombre_Finca LIKE %s))"
            region_like = f"%{region_filter}%"
            params.extend([region_like, region_like])
        
        base_query += " ORDER BY u.Fecha_Registro DESC"
        
        users = execute_query(base_query, params)
        
        users_list = []
        if users:
            for user in users:
                user_data = {
                    'id': user['ID_Usuario'],
                    'nombre': user['Nombre'],
                    'apellido': user['Apellido'],
                    'email': user['Correo'],
                    'telefono': user.get('Telefono', ''),
                    'tipo': user['Rol'],
                    'estado': user['Estado'],
                    'registro': user['Fecha_Registro'].strftime('%Y-%m-%d') if user['Fecha_Registro'] else '',
                    'red_social': user.get('Red_Social', ''),
                    'actividad_total': user.get('Actividad_Total', 0),
                    'region': user.get('Region_Info', 'Sin especificar')
                }
                users_list.append(user_data)
        
        return jsonify({
            'success': True,
            'users': users_list,
            'total': len(users_list)
        })
        
    except Exception as e:
        print(f"❌ Error obteniendo usuarios para admin: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/user/<int:user_id>', methods=['GET'])
@require_role('Administrador')
def get_user_details_admin(user_id):
    """Obtiene detalles completos de un usuario específico"""
    try:
        # Información básica del usuario
        user = execute_query("""
            SELECT 
                u.ID_Usuario,
                u.Nombre,
                u.Apellido,
                u.Correo,
                u.Telefono,
                u.Rol,
                u.Estado,
                u.Fecha_Registro,
                u.Red_Social,
                u.URL_Foto,
                u.Configuraciones
            FROM Usuario u
            WHERE u.ID_Usuario = %s
        """, (user_id,), fetch_one=True)
        
        if not user:
            return jsonify({'success': False, 'error': 'Usuario no encontrado'}), 404
        
        user_details = {
            'info_basica': {
                'id': user['ID_Usuario'],
                'nombre': user['Nombre'],
                'apellido': user['Apellido'],
                'email': user['Correo'],
                'telefono': user.get('Telefono', ''),
                'rol': user['Rol'],
                'estado': user['Estado'],
                'fecha_registro': user['Fecha_Registro'].isoformat() if user['Fecha_Registro'] else None,
                'red_social': user.get('Red_Social', ''),
                'foto_url': user.get('URL_Foto', '')
            }
        }
        
        # Información específica según el rol
        if user['Rol'] == 'Trabajador':
            # Estadísticas del trabajador
            stats_trabajador = execute_query("""
                SELECT 
                    COUNT(DISTINCT p.ID_Postulacion) as total_postulaciones,
                    COUNT(DISTINCT al.ID_Acuerdo) as trabajos_completados,
                    AVG(CAST(c.Puntuacion AS DECIMAL)) as calificacion_promedio
                FROM Usuario u
                LEFT JOIN Postulacion p ON u.ID_Usuario = p.ID_Trabajador
                LEFT JOIN Acuerdo_Laboral al ON u.ID_Usuario = al.ID_Trabajador AND al.Estado = 'Finalizado'
                LEFT JOIN Calificacion c ON u.ID_Usuario = c.ID_Usuario_Receptor
                WHERE u.ID_Usuario = %s
            """, (user_id,), fetch_one=True)
            
            # Habilidades
            habilidades = execute_query("""
                SELECT Nombre, Clasificacion 
                FROM Habilidad 
                WHERE ID_Trabajador = %s
            """, (user_id,))
            
            user_details['estadisticas_trabajador'] = {
                'total_postulaciones': stats_trabajador['total_postulaciones'] if stats_trabajador else 0,
                'trabajos_completados': stats_trabajador['trabajos_completados'] if stats_trabajador else 0,
                'calificacion_promedio': float(stats_trabajador['calificacion_promedio']) if stats_trabajador and stats_trabajador['calificacion_promedio'] else 0.0,
                'habilidades': habilidades or []
            }
            
        elif user['Rol'] == 'Agricultor':
            # Estadísticas del agricultor
            stats_agricultor = execute_query("""
                SELECT 
                    COUNT(DISTINCT ot.ID_Oferta) as ofertas_publicadas,
                    COUNT(DISTINCT al.ID_Acuerdo) as contratos_completados,
                    AVG(CAST(c.Puntuacion AS DECIMAL)) as calificacion_promedio
                FROM Usuario u
                LEFT JOIN Oferta_Trabajo ot ON u.ID_Usuario = ot.ID_Agricultor
                LEFT JOIN Acuerdo_Laboral al ON ot.ID_Oferta = al.ID_Oferta AND al.Estado = 'Finalizado'
                LEFT JOIN Calificacion c ON u.ID_Usuario = c.ID_Usuario_Receptor
                WHERE u.ID_Usuario = %s
            """, (user_id,), fetch_one=True)
            
            # Predios
            predios = execute_query("""
                SELECT Nombre_Finca, Ubicacion_Latitud, Ubicacion_Longitud
                FROM Predio 
                WHERE ID_Usuario = %s
            """, (user_id,))
            
            user_details['estadisticas_agricultor'] = {
                'ofertas_publicadas': stats_agricultor['ofertas_publicadas'] if stats_agricultor else 0,
                'contratos_completados': stats_agricultor['contratos_completados'] if stats_agricultor else 0,
                'calificacion_promedio': float(stats_agricultor['calificacion_promedio']) if stats_agricultor and stats_agricultor['calificacion_promedio'] else 0.0,
                'predios': predios or []
            }
        
        # Actividad reciente
        actividad_reciente = execute_query("""
            SELECT 
                'postulacion' as tipo,
                p.Fecha_Postulacion as fecha,
                ot.Titulo as descripcion
            FROM Postulacion p
            JOIN Oferta_Trabajo ot ON p.ID_Oferta = ot.ID_Oferta
            WHERE p.ID_Trabajador = %s
            
            UNION ALL
            
            SELECT 
                'oferta' as tipo,
                ot.Fecha_Publicacion as fecha,
                ot.Titulo as descripcion
            FROM Oferta_Trabajo ot
            WHERE ot.ID_Agricultor = %s
            
            ORDER BY fecha DESC
            LIMIT 10
        """, (user_id, user_id))
        
        user_details['actividad_reciente'] = actividad_reciente or []
        
        return jsonify({
            'success': True,
            'user_details': user_details
        })
        
    except Exception as e:
        print(f"❌ Error obteniendo detalles del usuario: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/user/<int:user_id>', methods=['PUT'])
@require_role('Administrador')
def update_user_admin(user_id):
    """Actualiza información de un usuario (solo para administradores)"""
    try:
        data = request.get_json()
        
        # Campos que se pueden actualizar
        allowed_fields = ['Nombre', 'Apellido', 'Correo', 'Telefono', 'Estado']
        update_fields = []
        update_values = []
        
        for field in allowed_fields:
            if field.lower() in data:
                if field == 'Estado' and data[field.lower()] not in ['Activo', 'Inactivo', 'Suspendido']:
                    return jsonify({'success': False, 'error': 'Estado no válido'}), 400
                
                update_fields.append(f"{field} = %s")
                update_values.append(data[field.lower()])
        
        if not update_fields:
            return jsonify({'success': False, 'error': 'No hay campos para actualizar'}), 400
        
        update_values.append(user_id)
        
        # Construir query de actualización
        update_query = f"""
            UPDATE Usuario 
            SET {', '.join(update_fields)}
            WHERE ID_Usuario = %s
        """
        
        execute_query(update_query, update_values)
        
        # Log de auditoría
        admin_user = session.get('user_name', 'Admin')
        print(f"📝 {admin_user} actualizó usuario ID {user_id}: {data}")
        
        return jsonify({
            'success': True,
            'message': 'Usuario actualizado correctamente'
        })
        
    except Exception as e:
        print(f"❌ Error actualizando usuario: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/user/<int:user_id>', methods=['DELETE'])
@require_role('Administrador')
def delete_user_admin(user_id):
    """Elimina un usuario (solo para administradores)"""
    try:
        # Verificar que el usuario no sea el administrador actual
        if user_id == session.get('user_id'):
            return jsonify({'success': False, 'error': 'No puedes eliminarte a ti mismo'}), 400
        
        # Obtener información del usuario antes de eliminar
        user_info = execute_query("""
            SELECT Nombre, Apellido, Correo, Rol 
            FROM Usuario 
            WHERE ID_Usuario = %s
        """, (user_id,), fetch_one=True)
        
        if not user_info:
            return jsonify({'success': False, 'error': 'Usuario no encontrado'}), 404
        
        # Eliminar registros relacionados (similar a la función existente)
        tables_to_clean = [
            ('Calificacion', ['ID_Usuario_Emisor', 'ID_Usuario_Receptor']),
            ('Mensaje', ['ID_Emisor', 'ID_Receptor']),
            ('Acuerdo_Laboral', ['ID_Trabajador']),
            ('Postulacion', ['ID_Trabajador']),
            ('Anexo', ['ID_Usuario']),
            ('Habilidad', ['ID_Trabajador']),
            ('Experiencia', ['ID_Trabajador']),
            ('Oferta_Trabajo', ['ID_Agricultor']),
            ('Predio', ['ID_Usuario'])
        ]
        
        for table_name, columns in tables_to_clean:
            try:
                if len(columns) == 1:
                    execute_query(f"DELETE FROM {table_name} WHERE {columns[0]} = %s", (user_id,))
                else:
                    conditions = ' OR '.join([f"{col} = %s" for col in columns])
                    params = [user_id] * len(columns)
                    execute_query(f"DELETE FROM {table_name} WHERE {conditions}", params)
            except Exception as table_error:
                print(f"Error eliminando de {table_name}: {str(table_error)}")
                continue
        
        # Eliminar el usuario
        execute_query("DELETE FROM Usuario WHERE ID_Usuario = %s", (user_id,))
        
        # Log de auditoría
        admin_user = session.get('user_name', 'Admin')
        print(f"🗑️ {admin_user} eliminó usuario: {user_info['Nombre']} {user_info['Apellido']} ({user_info['Correo']})")
        
        return jsonify({
            'success': True,
            'message': f'Usuario {user_info["Nombre"]} {user_info["Apellido"]} eliminado correctamente'
        })
        
    except Exception as e:
        print(f"❌ Error eliminando usuario: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/stats', methods=['GET'])
@require_role('Administrador')
def get_admin_stats():
    """Obtiene estadísticas generales para el dashboard del administrador"""
    try:
        # Estadísticas básicas
        stats = execute_query("""
            SELECT 
                COUNT(CASE WHEN Rol = 'Trabajador' AND Estado = 'Activo' THEN 1 END) as trabajadores_activos,
                COUNT(CASE WHEN Rol = 'Agricultor' AND Estado = 'Activo' THEN 1 END) as agricultores_activos,
                COUNT(CASE WHEN Estado = 'Activo' THEN 1 END) as usuarios_activos_total,
                COUNT(*) as usuarios_total
            FROM Usuario
        """, fetch_one=True)
        
        # Ofertas y postulaciones
        ofertas_stats = execute_query("""
            SELECT 
                COUNT(CASE WHEN Estado = 'Abierta' THEN 1 END) as ofertas_activas,
                COUNT(*) as ofertas_total
            FROM Oferta_Trabajo
        """, fetch_one=True)
        
        postulaciones_stats = execute_query("""
            SELECT 
                COUNT(*) as postulaciones_total,
                COUNT(CASE WHEN Estado = 'Pendiente' THEN 1 END) as postulaciones_pendientes
            FROM Postulacion
        """, fetch_one=True)
        
        # Acuerdos laborales
        acuerdos_stats = execute_query("""
            SELECT 
                COUNT(CASE WHEN Estado = 'Finalizado' THEN 1 END) as contratos_completados,
                COUNT(CASE WHEN Estado = 'Activo' THEN 1 END) as contratos_activos
            FROM Acuerdo_Laboral
        """, fetch_one=True)
        
        return jsonify({
            'success': True,
            'stats': {
                'usuarios_activos': stats['usuarios_activos_total'] if stats else 0,
                'trabajadores_activos': stats['trabajadores_activos'] if stats else 0,
                'agricultores_activos': stats['agricultores_activos'] if stats else 0,
                'ofertas_activas': ofertas_stats['ofertas_activas'] if ofertas_stats else 0,
                'postulaciones_pendientes': postulaciones_stats['postulaciones_pendientes'] if postulaciones_stats else 0,
                'contratos_completados': acuerdos_stats['contratos_completados'] if acuerdos_stats else 0,
                'contratos_activos': acuerdos_stats['contratos_activos'] if acuerdos_stats else 0
            }
        })
        
    except Exception as e:
        print(f"❌ Error obteniendo estadísticas de admin: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ================================================================
# RUTA PARA ACTIVIDAD RECIENTE DEL ADMINISTRADOR
# ================================================================

@app.route('/api/admin/recent-activity', methods=['GET'])
@require_role('Administrador')
def get_recent_activity():
    """Obtiene actividad reciente para el dashboard del administrador"""
    try:
        # Actividades recientes simuladas basadas en datos reales
        recent_users = execute_query("""
            SELECT 
                CONCAT(Nombre, ' ', Apellido) as nombre_completo,
                Rol,
                Fecha_Registro,
                'new-user' as tipo
            FROM Usuario 
            WHERE Fecha_Registro >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ORDER BY Fecha_Registro DESC 
            LIMIT 5
        """)
        
        recent_jobs = execute_query("""
            SELECT 
                ot.Titulo,
                ot.Fecha_Publicacion,
                CONCAT(u.Nombre, ' ', u.Apellido) as agricultor,
                'new-job' as tipo
            FROM Oferta_Trabajo ot
            JOIN Usuario u ON ot.ID_Agricultor = u.ID_Usuario
            WHERE ot.Fecha_Publicacion >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ORDER BY ot.Fecha_Publicacion DESC 
            LIMIT 5
        """)
        
        activities = []
        
        # Procesar nuevos usuarios
        if recent_users:
            for user in recent_users:
                activities.append({
                    'type': 'new-user',
                    'icon': 'fas fa-user-plus',
                    'message': f'<strong>Nuevo usuario registrado:</strong> {user["nombre_completo"]} ({user["Rol"]})',
                    'time': f'Hace {(datetime.now() - user["Fecha_Registro"]).days} días'
                })
        
        # Procesar nuevos trabajos
        if recent_jobs:
            for job in recent_jobs:
                activities.append({
                    'type': 'new-job',
                    'icon': 'fas fa-briefcase',
                    'message': f'<strong>Nueva oferta publicada:</strong> {job["Titulo"]} por {job["agricultor"]}',
                    'time': f'Hace {(datetime.now() - job["Fecha_Publicacion"]).days} días'
                })
        
        # Ordenar por fecha y limitar
        activities = sorted(activities, key=lambda x: x['time'])[:10]
        
        return jsonify({
            'success': True,
            'activities': activities
        })
        
    except Exception as e:
        print(f"❌ Error obteniendo actividad reciente: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

print("✅ Rutas del administrador cargadas correctamente")

@app.route('/api/get_farmer_jobs', methods=['GET'])
@require_login
def get_farmer_jobs():
    """Obtener ofertas publicadas por el agricultor - CON DEBUG"""
    try:
        user_id = session['user_id']
        user_role = session.get('user_role', session.get('role'))
        
        # DEBUGGING
        print(f"🔍 DEBUG - User ID: {user_id}")
        print(f"🔍 DEBUG - User Role: {user_role}")
        print(f"🔍 DEBUG - Session data: {dict(session)}")
        
        if user_role != 'Agricultor':
            print(f"❌ DEBUG - Usuario no es agricultor: {user_role}")
            return jsonify({
                'success': False,
                'message': f'Solo los agricultores pueden ver sus ofertas. Tu rol: {user_role}'
            }), 403
        
        # Primero, verificar cuántas ofertas hay en total para este usuario
        total_ofertas = execute_query("""
            SELECT COUNT(*) as total
            FROM Oferta_Trabajo 
            WHERE ID_Agricultor = %s
        """, (user_id,), fetch_one=True)
        
        print(f"🔍 DEBUG - Total ofertas en BD para user {user_id}: {total_ofertas['total'] if total_ofertas else 0}")
        
        # Consulta con debugging
        ofertas = execute_query("""
            SELECT 
                ot.ID_Oferta as id_oferta,
                ot.Titulo as titulo,
                ot.Descripcion as descripcion,
                ot.Pago_Ofrecido as pago_ofrecido,
                ot.Fecha_Publicacion as fecha_publicacion,
                ot.Estado as estado,
                COUNT(p.ID_Postulacion) as num_postulaciones
            FROM Oferta_Trabajo ot
            LEFT JOIN Postulacion p ON ot.ID_Oferta = p.ID_Oferta 
            WHERE ot.ID_Agricultor = %s
            GROUP BY ot.ID_Oferta, ot.Titulo, ot.Descripcion, ot.Pago_Ofrecido, ot.Fecha_Publicacion, ot.Estado
            ORDER BY ot.Fecha_Publicacion DESC
        """, (user_id,))
        
        print(f"🔍 DEBUG - Ofertas encontradas: {len(ofertas) if ofertas else 0}")
        if ofertas:
            for i, oferta in enumerate(ofertas):
                print(f"🔍 DEBUG - Oferta {i+1}: {oferta['titulo']} - Estado: {oferta['estado']}")
        
        # Procesar ofertas
        ofertas_procesadas = []
        if ofertas:
            for oferta in ofertas:
                ubicacion = None
                if oferta['descripcion']:
                    desc_text = str(oferta['descripcion'])
                    if 'Ubicación:' in desc_text:
                        try:
                            ubicacion_parte = desc_text.split('Ubicación:')[-1].strip()
                            ubicacion = ubicacion_parte.split('\n')[0].strip()
                        except:
                            ubicacion = None
                
                ofertas_procesadas.append({
                    'id_oferta': oferta['id_oferta'],
                    'titulo': oferta['titulo'],
                    'descripcion': oferta['descripcion'],
                    'pago_ofrecido': float(oferta['pago_ofrecido']) if oferta['pago_ofrecido'] else 0,
                    'fecha_publicacion': oferta['fecha_publicacion'].strftime('%Y-%m-%d') if oferta['fecha_publicacion'] else None,
                    'estado': oferta['estado'],
                    'num_postulaciones': oferta['num_postulaciones'] or 0,
                    'ubicacion': ubicacion
                })
        
        print(f"🔍 DEBUG - Ofertas procesadas: {len(ofertas_procesadas)}")
        
        # Estadísticas
        estadisticas = execute_query("""
            SELECT 
                COUNT(CASE WHEN ot.Estado = 'Abierta' THEN 1 END) as ofertas_activas,
                COUNT(DISTINCT p.ID_Trabajador) as trabajadores_postulados
            FROM Oferta_Trabajo ot
            LEFT JOIN Postulacion p ON ot.ID_Oferta = p.ID_Oferta
            WHERE ot.ID_Agricultor = %s
        """, (user_id,), fetch_one=True)
        
        response_data = {
            'success': True,
            'ofertas': ofertas_procesadas,
            'estadisticas': {
                'ofertas_activas': estadisticas['ofertas_activas'] if estadisticas else 0,
                'trabajadores_contratados': estadisticas['trabajadores_postulados'] if estadisticas else 0
            }
        }
        
        print(f"🔍 DEBUG - Response final: {response_data}")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"❌ Error al obtener ofertas del agricultor: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Error interno: {str(e)}'
        }), 500


# ================================================================
# API PARA OBTENER TODOS LOS USUARIOS
# ================================================================
@app.route('/api/admin/get-users', methods=['GET'])
@require_role('Administrador')
def admin_get_users():
    """API para obtener todos los usuarios con filtros para el panel admin"""
    try:
        print("🔍 Ejecutando admin_get_users...")
        
        # Obtener filtros de la query string
        tipo_filter = request.args.get('tipo', '')
        estado_filter = request.args.get('estado', '')
        region_filter = request.args.get('region', '')
        search_term = request.args.get('search', '')
        
        print(f"Filtros recibidos: tipo={tipo_filter}, estado={estado_filter}, region={region_filter}, search={search_term}")
        
        # Query base más simple para empezar
        base_query = """
            SELECT 
                u.ID_Usuario as id,
                u.Nombre as nombre,
                u.Apellido as apellido,
                u.Correo as email,
                u.Telefono as telefono,
                u.Rol as tipo,
                u.Estado as estado,
                DATE(u.Fecha_Registro) as registro
            FROM Usuario u
            WHERE u.Rol != 'Administrador'
        """
        
        params = []
        
        # Aplicar filtros básicos
        if tipo_filter and tipo_filter in ['agricultor', 'trabajador']:
            base_query += " AND LOWER(u.Rol) = %s"
            params.append(tipo_filter.lower())
        
        if estado_filter and estado_filter in ['activo', 'inactivo']:
            base_query += " AND LOWER(u.Estado) = %s"
            params.append(estado_filter.lower())
        
        if search_term:
            base_query += """ AND (
                LOWER(u.Nombre) LIKE %s OR 
                LOWER(u.Apellido) LIKE %s OR 
                LOWER(u.Correo) LIKE %s
            )"""
            search_like = f"%{search_term.lower()}%"
            params.extend([search_like, search_like, search_like])
        
        base_query += " ORDER BY u.Fecha_Registro DESC LIMIT 100"
        
        print(f"Ejecutando query: {base_query}")
        print(f"Con parámetros: {params}")
        
        # Ejecutar query
        if params:
            users = execute_query(base_query, tuple(params))
        else:
            users = execute_query(base_query)
        
        print(f"Usuarios obtenidos: {len(users) if users else 0}")
        
        users_list = []
        if users:
            for user in users:
                print(f"Procesando usuario: {user}")
                user_data = {
                    'id': user['id'],
                    'nombre': f"{user['nombre']} {user['apellido']}",
                    'email': user['email'],
                    'telefono': user.get('telefono', ''),
                    'tipo': user['tipo'].lower(),
                    'estado': user['estado'].lower(),
                    'registro': user['registro'].strftime('%Y-%m-%d') if user['registro'] else '',
                    'region': 'bogota'  # Valor por defecto por ahora
                }
                users_list.append(user_data)
        
        print(f"Lista final de usuarios: {len(users_list)}")
        
        return jsonify({
            'success': True,
            'users': users_list,
            'total': len(users_list)
        })
        
    except Exception as e:
        print(f"❌ Error en admin_get_users: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False, 
            'error': f'Error interno: {str(e)}'
        }), 500

# ================================================================
# API PARA ACCIONES CON USUARIOS INDIVIDUALES
# ================================================================
@app.route('/api/admin/user/<int:user_id>/details', methods=['GET'])
@require_role('Administrador')
def admin_get_user_details(user_id):
    """Obtener detalles completos de un usuario"""
    try:
        # Información básica del usuario
        user = execute_query("""
            SELECT 
                u.ID_Usuario,
                u.Nombre,
                u.Apellido,
                u.Correo,
                u.Telefono,
                u.Rol,
                u.Estado,
                u.Fecha_Registro,
                u.Red_Social,
                u.URL_Foto
            FROM Usuario u
            WHERE u.ID_Usuario = %s
        """, (user_id,), fetch_one=True)
        
        if not user:
            return jsonify({'success': False, 'error': 'Usuario no encontrado'}), 404
        
        # Información adicional según el rol
        additional_info = {}
        
        if user['Rol'] == 'Trabajador':
            # Estadísticas del trabajador
            stats = execute_query("""
                SELECT 
                    COUNT(DISTINCT p.ID_Postulacion) as total_postulaciones,
                    COUNT(DISTINCT al.ID_Acuerdo) as trabajos_completados,
                    COALESCE(AVG(CAST(c.Puntuacion AS DECIMAL)), 0) as calificacion_promedio,
                    COUNT(DISTINCT h.ID_Habilidad) as total_habilidades
                FROM Usuario u
                LEFT JOIN Postulacion p ON u.ID_Usuario = p.ID_Trabajador
                LEFT JOIN Acuerdo_Laboral al ON u.ID_Usuario = al.ID_Trabajador AND al.Estado = 'Finalizado'
                LEFT JOIN Calificacion c ON u.ID_Usuario = c.ID_Usuario_Receptor
                LEFT JOIN Habilidad h ON u.ID_Usuario = h.ID_Trabajador
                WHERE u.ID_Usuario = %s
            """, (user_id,), fetch_one=True)
            
            # Habilidades
            habilidades = execute_query("""
                SELECT Nombre, Clasificacion 
                FROM Habilidad 
                WHERE ID_Trabajador = %s
            """, (user_id,))
            
            additional_info = {
                'estadisticas': {
                    'postulaciones': stats['total_postulaciones'] or 0,
                    'trabajos_completados': stats['trabajos_completados'] or 0,
                    'calificacion': float(stats['calificacion_promedio']) if stats['calificacion_promedio'] else 0,
                    'habilidades_count': stats['total_habilidades'] or 0
                },
                'habilidades': [{'nombre': h['Nombre'], 'tipo': h['Clasificacion']} for h in habilidades] if habilidades else []
            }
            
        elif user['Rol'] == 'Agricultor':
            # Estadísticas del agricultor
            stats = execute_query("""
                SELECT 
                    COUNT(DISTINCT ot.ID_Oferta) as ofertas_publicadas,
                    COUNT(DISTINCT al.ID_Acuerdo) as contratos_completados,
                    COALESCE(AVG(CAST(c.Puntuacion AS DECIMAL)), 0) as calificacion_promedio,
                    COUNT(DISTINCT pr.ID_Predio) as total_predios
                FROM Usuario u
                LEFT JOIN Oferta_Trabajo ot ON u.ID_Usuario = ot.ID_Agricultor
                LEFT JOIN Acuerdo_Laboral al ON ot.ID_Oferta = al.ID_Oferta AND al.Estado = 'Finalizado'
                LEFT JOIN Calificacion c ON u.ID_Usuario = c.ID_Usuario_Receptor
                LEFT JOIN Predio pr ON u.ID_Usuario = pr.ID_Usuario
                WHERE u.ID_Usuario = %s
            """, (user_id,), fetch_one=True)
            
            # Predios
            predios = execute_query("""
                SELECT Nombre_Finca, Descripcion 
                FROM Predio 
                WHERE ID_Usuario = %s
            """, (user_id,))
            
            additional_info = {
                'estadisticas': {
                    'ofertas_publicadas': stats['ofertas_publicadas'] or 0,
                    'contratos_completados': stats['contratos_completados'] or 0,
                    'calificacion': float(stats['calificacion_promedio']) if stats['calificacion_promedio'] else 0,
                    'predios_count': stats['total_predios'] or 0
                },
                'predios': [{'nombre': p['Nombre_Finca'], 'descripcion': p.get('Descripcion', '')} for p in predios] if predios else []
            }
        
        response_data = {
            'success': True,
            'user': {
                'id': user['ID_Usuario'],
                'nombre': user['Nombre'],
                'apellido': user['Apellido'],
                'email': user['Correo'],
                'telefono': user.get('Telefono', ''),
                'rol': user['Rol'],
                'estado': user['Estado'],
                'fecha_registro': user['Fecha_Registro'].strftime('%Y-%m-%d %H:%M:%S') if user['Fecha_Registro'] else '',
                'red_social': user.get('Red_Social', ''),
                'foto_url': user.get('URL_Foto', ''),
                **additional_info
            }
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error obteniendo detalles del usuario: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/admin/user/<int:user_id>/update', methods=['PUT'])
@require_role('Administrador')
def admin_update_user(user_id):
    """Actualizar información de un usuario"""
    try:
        data = request.get_json()
        
        # Verificar que no se esté intentando actualizar al propio administrador
        if user_id == session.get('user_id'):
            return jsonify({'success': False, 'error': 'No puedes modificar tu propia cuenta'}), 400
        
        # Campos permitidos para actualización
        allowed_fields = {
            'nombre': 'Nombre',
            'apellido': 'Apellido',
            'email': 'Correo',
            'telefono': 'Telefono',
            'estado': 'Estado'
        }
        
        update_fields = []
        update_values = []
        
        for field_key, db_field in allowed_fields.items():
            if field_key in data and data[field_key] is not None:
                # Validaciones específicas
                if field_key == 'estado':
                    if data[field_key] not in ['Activo', 'Inactivo', 'Bloqueado']:
                        return jsonify({'success': False, 'error': 'Estado no válido'}), 400
                elif field_key == 'email':
                    if not validate_email(data[field_key]):
                        return jsonify({'success': False, 'error': 'Email no válido'}), 400
                
                update_fields.append(f"{db_field} = %s")
                update_values.append(data[field_key])
        
        if not update_fields:
            return jsonify({'success': False, 'error': 'No hay campos válidos para actualizar'}), 400
        
        update_values.append(user_id)
        
        # Ejecutar actualización
        update_query = f"""
            UPDATE Usuario 
            SET {', '.join(update_fields)}
            WHERE ID_Usuario = %s
        """
        
        execute_query(update_query, update_values)
        
        # Log de auditoría
        admin_name = session.get('user_name', 'Admin')
        print(f"📝 Admin {admin_name} actualizó usuario ID {user_id}: {data}")
        
        return jsonify({
            'success': True,
            'message': 'Usuario actualizado correctamente'
        })
        
    except Exception as e:
        print(f"Error actualizando usuario: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/admin/user/<int:user_id>/delete', methods=['DELETE'])
@require_role('Administrador')
def admin_delete_user(user_id):
    """Eliminar un usuario del sistema"""
    try:
        # Verificar que no se esté intentando eliminar al propio administrador
        if user_id == session.get('user_id'):
            return jsonify({'success': False, 'error': 'No puedes eliminar tu propia cuenta'}), 400
        
        # Obtener información del usuario antes de eliminar
        user_info = execute_query("""
            SELECT Nombre, Apellido, Correo, Rol 
            FROM Usuario 
            WHERE ID_Usuario = %s
        """, (user_id,), fetch_one=True)
        
        if not user_info:
            return jsonify({'success': False, 'error': 'Usuario no encontrado'}), 404
        
        # Eliminar registros relacionados en orden de dependencias
        tables_to_clean = [
            ('Calificacion', ['ID_Usuario_Emisor', 'ID_Usuario_Receptor']),
            ('Mensaje', ['ID_Emisor', 'ID_Receptor']),
            ('Acuerdo_Laboral', ['ID_Trabajador']),
            ('Postulacion', ['ID_Trabajador']),
            ('Anexo', ['ID_Usuario']),
            ('Habilidad', ['ID_Trabajador']),
            ('Experiencia', ['ID_Trabajador']),
            ('Oferta_Trabajo', ['ID_Agricultor']),
            ('Predio', ['ID_Usuario'])
        ]
        
        for table_name, columns in tables_to_clean:
            try:
                if len(columns) == 1:
                    execute_query(f"DELETE FROM {table_name} WHERE {columns[0]} = %s", (user_id,))
                else:
                    conditions = ' OR '.join([f"{col} = %s" for col in columns])
                    params = [user_id] * len(columns)
                    execute_query(f"DELETE FROM {table_name} WHERE {conditions}", params)
            except Exception as table_error:
                print(f"Advertencia: Error eliminando de {table_name}: {table_error}")
                continue
        
        # Eliminar el usuario principal
        execute_query("DELETE FROM Usuario WHERE ID_Usuario = %s", (user_id,))
        
        # Log de auditoría
        admin_name = session.get('user_name', 'Admin')
        print(f"🗑️ Admin {admin_name} eliminó usuario: {user_info['Nombre']} {user_info['Apellido']} ({user_info['Correo']})")
        
        return jsonify({
            'success': True,
            'message': f'Usuario {user_info["Nombre"]} {user_info["Apellido"]} eliminado correctamente'
        })
        
    except Exception as e:
        print(f"Error eliminando usuario: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ================================================================
# API PARA ESTADÍSTICAS DEL DASHBOARD
# ================================================================
@app.route('/api/admin/dashboard-stats', methods=['GET'])
@require_role('Administrador')
def admin_dashboard_stats():
    """Obtener estadísticas generales para el dashboard del administrador"""
    try:
        # Estadísticas de usuarios
        user_stats = execute_query("""
            SELECT 
                COUNT(CASE WHEN Rol = 'Trabajador' AND Estado = 'Activo' THEN 1 END) as trabajadores_activos,
                COUNT(CASE WHEN Rol = 'Agricultor' AND Estado = 'Activo' THEN 1 END) as agricultores_activos,
                COUNT(CASE WHEN Estado = 'Activo' THEN 1 END) as usuarios_activos,
                COUNT(*) as total_usuarios
            FROM Usuario 
            WHERE Rol != 'Administrador'
        """, fetch_one=True)
        
        # Estadísticas de ofertas
        job_stats = execute_query("""
            SELECT 
                COUNT(CASE WHEN Estado = 'Abierta' THEN 1 END) as ofertas_activas,
                COUNT(*) as total_ofertas
            FROM Oferta_Trabajo
        """, fetch_one=True)
        
        # Estadísticas de postulaciones
        application_stats = execute_query("""
            SELECT 
                COUNT(*) as total_postulaciones,
                COUNT(CASE WHEN Estado = 'Pendiente' THEN 1 END) as postulaciones_pendientes,
                COUNT(CASE WHEN Estado = 'Aceptada' THEN 1 END) as postulaciones_aceptadas
            FROM Postulacion
        """, fetch_one=True)
        
        # Estadísticas de contrataciones
        contract_stats = execute_query("""
            SELECT 
                COUNT(CASE WHEN Estado = 'Finalizado' THEN 1 END) as contratos_finalizados,
                COUNT(CASE WHEN Estado = 'Activo' THEN 1 END) as contratos_activos
            FROM Acuerdo_Laboral
        """, fetch_one=True)
        
        # Calcular tasas de crecimiento (simuladas para demo)
        import random
        growth_rates = {
            'usuarios': random.randint(8, 15),
            'ofertas': random.randint(5, 12),
            'postulaciones': random.randint(10, 20),
            'contratos': random.randint(15, 25)
        }
        
        stats_data = {
            'usuarios_activos': user_stats['usuarios_activos'] if user_stats else 0,
            'ofertas_activas': job_stats['ofertas_activas'] if job_stats else 0,
            'total_postulaciones': application_stats['total_postulaciones'] if application_stats else 0,
            'contratos_exitosos': contract_stats['contratos_finalizados'] if contract_stats else 0,
            
            # Datos adicionales para el frontend
            'trabajadores_activos': user_stats['trabajadores_activos'] if user_stats else 0,
            'agricultores_activos': user_stats['agricultores_activos'] if user_stats else 0,
            'postulaciones_pendientes': application_stats['postulaciones_pendientes'] if application_stats else 0,
            'contratos_activos': contract_stats['contratos_activos'] if contract_stats else 0,
            
            # Tasas de crecimiento
            'crecimiento': growth_rates
        }
        
        return jsonify({
            'success': True,
            'stats': stats_data
        })
        
    except Exception as e:
        print(f"Error obteniendo estadísticas del admin: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ================================================================
# API PARA ACTIVIDAD RECIENTE
# ================================================================
@app.route('/api/admin/recent-activity', methods=['GET'])
@require_role('Administrador')
def admin_recent_activity():
    """Obtener actividad reciente del sistema"""
    try:
        activities = []
        
        # Usuarios registrados recientemente
        recent_users = execute_query("""
            SELECT 
                CONCAT(Nombre, ' ', Apellido) as nombre_completo,
                Rol,
                Fecha_Registro
            FROM Usuario 
            WHERE Fecha_Registro >= DATE_SUB(NOW(), INTERVAL 7 DAY)
              AND Rol != 'Administrador'
            ORDER BY Fecha_Registro DESC 
            LIMIT 5
        """)
        
        if recent_users:
            for user in recent_users:
                days_ago = (datetime.now() - user['Fecha_Registro']).days
                time_text = f"Hace {days_ago} días" if days_ago > 0 else "Hoy"
                
                activities.append({
                    'type': 'new-user',
                    'icon': 'fas fa-user-plus',
                    'message': f'<strong>Nuevo usuario registrado:</strong> {user["nombre_completo"]} ({user["Rol"]})',
                    'time': time_text,
                    'timestamp': user['Fecha_Registro'].isoformat()
                })
        
        # Ofertas publicadas recientemente
        recent_jobs = execute_query("""
            SELECT 
                ot.Titulo,
                ot.Fecha_Publicacion,
                CONCAT(u.Nombre, ' ', u.Apellido) as agricultor_nombre
            FROM Oferta_Trabajo ot
            JOIN Usuario u ON ot.ID_Agricultor = u.ID_Usuario
            WHERE ot.Fecha_Publicacion >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ORDER BY ot.Fecha_Publicacion DESC 
            LIMIT 5
        """)
        
        if recent_jobs:
            for job in recent_jobs:
                days_ago = (datetime.now() - job['Fecha_Publicacion']).days
                time_text = f"Hace {days_ago} días" if days_ago > 0 else "Hoy"
                
                activities.append({
                    'type': 'new-job',
                    'icon': 'fas fa-briefcase',
                    'message': f'<strong>Nueva oferta publicada:</strong> {job["Titulo"]} por {job["agricultor_nombre"]}',
                    'time': time_text,
                    'timestamp': job['Fecha_Publicacion'].isoformat()
                })
        
        # Postulaciones recientes
        recent_applications = execute_query("""
            SELECT 
                ot.Titulo,
                CONCAT(u.Nombre, ' ', u.Apellido) as trabajador_nombre,
                p.Fecha_Postulacion
            FROM Postulacion p
            JOIN Oferta_Trabajo ot ON p.ID_Oferta = ot.ID_Oferta
            JOIN Usuario u ON p.ID_Trabajador = u.ID_Usuario
            WHERE p.Fecha_Postulacion >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ORDER BY p.Fecha_Postulacion DESC 
            LIMIT 3
        """)
        
        if recent_applications:
            for app in recent_applications:
                days_ago = (datetime.now() - app['Fecha_Postulacion']).days
                time_text = f"Hace {days_ago} días" if days_ago > 0 else "Hoy"
                
                activities.append({
                    'type': 'new-application',
                    'icon': 'fas fa-file-alt',
                    'message': f'<strong>Nueva postulación:</strong> {app["trabajador_nombre"]} se postuló para "{app["Titulo"]}"',
                    'time': time_text,
                    'timestamp': app['Fecha_Postulacion'].isoformat()
                })
        
        # Ordenar por timestamp y limitar resultados
        activities.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        activities = activities[:10]
        
        # Remover timestamp del response final
        for activity in activities:
            activity.pop('timestamp', None)
        
        return jsonify({
            'success': True,
            'activities': activities
        })
        
    except Exception as e:
        print(f"Error obteniendo actividad reciente: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ================================================================
# API PARA CREAR NUEVO USUARIO DESDE EL ADMIN
# ================================================================
@app.route('/api/admin/create-user', methods=['POST'])
@require_role('Administrador')
def admin_create_user():
    """Crear nuevo usuario desde el panel de administrador"""
    try:
        data = request.get_json()
        
        # Validar datos requeridos
        required_fields = ['nombre', 'apellido', 'email', 'tipo', 'region']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'Campo {field} es requerido'}), 400
        
        nombre = data['nombre'].strip()
        apellido = data['apellido'].strip()
        email = data['email'].strip().lower()
        tipo = data['tipo'].capitalize()
        region = data['region']
        
        # Validaciones
        if not validate_email(email):
            return jsonify({'success': False, 'error': 'Email no válido'}), 400
        
        if tipo not in ['Trabajador', 'Agricultor']:
            return jsonify({'success': False, 'error': 'Tipo de usuario no válido'}), 400
        
        # Verificar que el email no exista
        existing_user = execute_query(
            "SELECT ID_Usuario FROM Usuario WHERE Correo = %s",
            (email,),
            fetch_one=True
        )
        
        if existing_user:
            return jsonify({'success': False, 'error': 'El email ya está registrado'}), 400
        
        # Generar contraseña temporal
        import secrets
        import string
        temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
        hashed_password = hash_password(temp_password)
        
        # Insertar usuario
        user_id = execute_query("""
            INSERT INTO Usuario (Nombre, Apellido, Correo, Contrasena, Rol, Estado)
            VALUES (%s, %s, %s, %s, %s, 'Activo')
        """, (nombre, apellido, email, hashed_password, tipo))
        
        # Si es agricultor y se especificó región, crear un predio básico
        if tipo == 'Agricultor' and region != 'otra':
            region_names = {
                'bogota': 'Finca en Bogotá',
                'antioquia': 'Finca en Antioquia', 
                'valle': 'Finca en Valle del Cauca'
            }
            
            if region in region_names:
                execute_query("""
                    INSERT INTO Predio (ID_Usuario, Nombre_Finca, Ubicacion_Latitud, Ubicacion_Longitud, Descripcion)
                    VALUES (%s, %s, 4.6097, -74.0817, %s)
                """, (user_id, region_names[region], f'Predio creado desde panel admin - Región: {region}'))
        
        # Log de auditoría
        admin_name = session.get('user_name', 'Admin')
        print(f"👤 Admin {admin_name} creó nuevo usuario: {nombre} {apellido} ({email}) como {tipo}")
        
        return jsonify({
            'success': True,
            'message': f'Usuario {nombre} {apellido} creado correctamente',
            'user_id': user_id,
            'temp_password': temp_password,  # Solo para demo, en producción enviar por email
            'user_data': {
                'nombre': nombre,
                'apellido': apellido,
                'email': email,
                'tipo': tipo.lower(),
                'region': region
            }
        })
        
    except Exception as e:
        print(f"Error creando usuario: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ================================================================
# API PARA ACCIONES MASIVAS
# ================================================================
@app.route('/api/admin/bulk-action', methods=['POST'])
@require_role('Administrador')
def admin_bulk_action():
    """Realizar acciones masivas sobre usuarios seleccionados"""
    try:
        data = request.get_json()
        action = data.get('action')
        user_ids = data.get('user_ids', [])
        
        if not action or not user_ids:
            return jsonify({'success': False, 'error': 'Acción y IDs de usuario son requeridos'}), 400
        
        # Verificar que no incluya al administrador actual
        current_admin_id = session.get('user_id')
        if current_admin_id in user_ids:
            return jsonify({'success': False, 'error': 'No puedes realizar acciones sobre tu propia cuenta'}), 400
        
        affected_count = 0
        
        if action == 'suspend':
            # Suspender usuarios (cambiar estado a Inactivo)
            placeholders = ','.join(['%s'] * len(user_ids))
            query = f"UPDATE Usuario SET Estado = 'Inactivo' WHERE ID_Usuario IN ({placeholders}) AND Rol != 'Administrador'"
            execute_query(query, user_ids)
            affected_count = len(user_ids)
            message = f'{affected_count} usuarios suspendidos correctamente'
            
        elif action == 'activate':
            # Activar usuarios
            placeholders = ','.join(['%s'] * len(user_ids))
            query = f"UPDATE Usuario SET Estado = 'Activo' WHERE ID_Usuario IN ({placeholders}) AND Rol != 'Administrador'"
            execute_query(query, user_ids)
            affected_count = len(user_ids)
            message = f'{affected_count} usuarios activados correctamente'
            
        elif action == 'delete':
            # Eliminar usuarios (más complejo por las dependencias)
            for user_id in user_ids:
                if user_id == current_admin_id:
                    continue
                    
                # Eliminar dependencias para cada usuario
                tables_to_clean = [
                    ('Calificacion', ['ID_Usuario_Emisor', 'ID_Usuario_Receptor']),
                    ('Mensaje', ['ID_Emisor', 'ID_Receptor']),
                    ('Acuerdo_Laboral', ['ID_Trabajador']),
                    ('Postulacion', ['ID_Trabajador']),
                    ('Anexo', ['ID_Usuario']),
                    ('Habilidad', ['ID_Trabajador']),
                    ('Experiencia', ['ID_Trabajador']),
                    ('Oferta_Trabajo', ['ID_Agricultor']),
                    ('Predio', ['ID_Usuario'])
                ]
                
                for table_name, columns in tables_to_clean:
                    try:
                        if len(columns) == 1:
                            execute_query(f"DELETE FROM {table_name} WHERE {columns[0]} = %s", (user_id,))
                        else:
                            conditions = ' OR '.join([f"{col} = %s" for col in columns])
                            params = [user_id] * len(columns)
                            execute_query(f"DELETE FROM {table_name} WHERE {conditions}", params)
                    except Exception as table_error:
                        print(f"Advertencia: Error eliminando de {table_name}: {table_error}")
                        continue
                
                # Eliminar usuario principal
                execute_query("DELETE FROM Usuario WHERE ID_Usuario = %s AND Rol != 'Administrador'", (user_id,))
                affected_count += 1
            
            message = f'{affected_count} usuarios eliminados correctamente'
            
        else:
            return jsonify({'success': False, 'error': 'Acción no válida'}), 400
        
        # Log de auditoría
        admin_name = session.get('user_name', 'Admin')
        print(f"📋 Admin {admin_name} realizó acción masiva '{action}' en {affected_count} usuarios")
        
        return jsonify({
            'success': True,
            'message': message,
            'affected_count': affected_count
        })
        
    except Exception as e:
        print(f"Error en acción masiva: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ================================================================
# API PARA ESTADO DEL SISTEMA
# ================================================================
@app.route('/api/admin/system-status', methods=['GET'])
@require_role('Administrador')
def admin_system_status():
    """Obtener estado del sistema para el dashboard"""
    try:
        # Estado de la base de datos
        db_status = 'online'
        try:
            execute_query("SELECT 1", fetch_one=True)
        except:
            db_status = 'offline'
        
        # Estado de servicios
        services_status = [
            {
                'name': 'Servidor Principal',
                'status': 'online',
                'label': 'Online'
            },
            {
                'name': 'Base de Datos',
                'status': db_status,
                'label': 'Operativo' if db_status == 'online' else 'Sin conexión'
            },
            {
                'name': 'Sistema de Notificaciones',
                'status': 'online',
                'label': 'Activo'
            },
            {
                'name': 'Almacenamiento',
                'status': 'online',
                'label': 'Normal'
            }
        ]
        
        return jsonify({
            'success': True,
            'system_status': services_status
        })
        
    except Exception as e:
        print(f"Error obteniendo estado del sistema: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ================================================================
# ACTUALIZAR LA FUNCIÓN get_user_session PARA ADMINISTRADORES
# ================================================================
@app.route('/api/admin/session', methods=['GET'])
@require_role('Administrador')
def admin_get_session():
    """Obtener información de sesión específica para administradores"""
    try:
        user_id = session['user_id']
        
        # Obtener datos del administrador
        admin_data = execute_query("""
            SELECT ID_Usuario, Nombre, Apellido, Correo, Telefono, 
                   URL_Foto, Fecha_Registro, Rol
            FROM Usuario WHERE ID_Usuario = %s AND Rol = 'Administrador'
        """, (user_id,), fetch_one=True)
        
        if not admin_data:
            return jsonify({'success': False, 'message': 'Administrador no encontrado'}), 404
        
        # Estadísticas rápidas para el admin
        quick_stats = execute_query("""
            SELECT 
                (SELECT COUNT(*) FROM Usuario WHERE Rol != 'Administrador' AND Estado = 'Activo') as usuarios_activos,
                (SELECT COUNT(*) FROM Oferta_Trabajo WHERE Estado = 'Abierta') as ofertas_activas,
                (SELECT COUNT(*) FROM Postulacion WHERE Estado = 'Pendiente') as postulaciones_pendientes
        """, fetch_one=True)
        
        return jsonify({
            'success': True,
            'admin': {
                'id': admin_data['ID_Usuario'],
                'nombre': admin_data['Nombre'],
                'apellido': admin_data['Apellido'],
                'nombre_completo': f"{admin_data['Nombre']} {admin_data['Apellido']}",
                'email': admin_data['Correo'],
                'telefono': admin_data.get('Telefono', ''),
                'foto_url': admin_data.get('URL_Foto'),
                'fecha_registro': admin_data['Fecha_Registro'].isoformat() if admin_data['Fecha_Registro'] else None,
                'rol': admin_data['Rol']
            },
            'quick_stats': {
                'usuarios_activos': quick_stats['usuarios_activos'] if quick_stats else 0,
                'ofertas_activas': quick_stats['ofertas_activas'] if quick_stats else 0,
                'postulaciones_pendientes': quick_stats['postulaciones_pendientes'] if quick_stats else 0
            }
        })
        
    except Exception as e:
        print(f"Error obteniendo sesión de admin: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ================================================================
# APIS ADICIONALES PARA FUNCIONALIDADES ESPECÍFICAS DEL ADMIN
# ================================================================
@app.route('/api/admin/export-users', methods=['GET'])
@require_role('Administrador')
def admin_export_users():
    """Simular exportación de usuarios (retorna datos para generar archivo)"""
    try:
        export_format = request.args.get('format', 'csv')
        
        # Obtener todos los usuarios
        users = execute_query("""
            SELECT 
                u.ID_Usuario as id,
                u.Nombre as nombre,
                u.Apellido as apellido,
                u.Correo as email,
                u.Telefono as telefono,
                u.Rol as tipo,
                u.Estado as estado,
                DATE(u.Fecha_Registro) as fecha_registro
            FROM Usuario u
            WHERE u.Rol != 'Administrador'
            ORDER BY u.Fecha_Registro DESC
        """)
        
        if not users:
            return jsonify({'success': False, 'error': 'No hay usuarios para exportar'}), 404
        
        # Log de auditoría
        admin_name = session.get('user_name', 'Admin')
        print(f"📄 Admin {admin_name} exportó {len(users)} usuarios en formato {export_format}")
        
        return jsonify({
            'success': True,
            'message': f'Datos de {len(users)} usuarios preparados para exportación',
            'format': export_format,
            'users': users,
            'total': len(users)
        })
        
    except Exception as e:
        print(f"Error exportando usuarios: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/admin/backup-data', methods=['POST'])
@require_role('Administrador')
def admin_backup_data():
    """Simular creación de backup de datos"""
    try:
        from datetime import datetime
        import uuid
        
        backup_id = str(uuid.uuid4())[:8]
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f"agromach_backup_{timestamp}_{backup_id}.sql"
        
        # Simular proceso de backup (en producción aquí irían los comandos reales)
        import time
        time.sleep(2)  # Simular procesamiento
        
        # Log de auditoría
        admin_name = session.get('user_name', 'Admin')
        print(f"💾 Admin {admin_name} creó backup: {backup_name}")
        
        return jsonify({
            'success': True,
            'message': 'Backup creado correctamente',
            'backup_info': {
                'id': backup_id,
                'filename': backup_name,
                'timestamp': timestamp,
                'size': '2.4 MB',  # Simulado
                'status': 'completed'
            }
        })
        
    except Exception as e:
        print(f"Error creando backup: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/admin/clear-cache', methods=['POST'])
@require_role('Administrador')
def admin_clear_cache():
    """Simular limpieza de cache del sistema"""
    try:
        import time
        time.sleep(1)  # Simular procesamiento
        
        # Log de auditoría
        admin_name = session.get('user_name', 'Admin')
        print(f"🧹 Admin {admin_name} limpió el cache del sistema")
        
        return jsonify({
            'success': True,
            'message': 'Cache del sistema limpiado correctamente',
            'cache_info': {
                'cleared_items': 1547,
                'space_freed': '45.2 MB',
                'time_taken': '0.8 segundos'
            }
        })
        
    except Exception as e:
        print(f"Error limpiando cache: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


print("✅ APIs completas del panel de administrador cargadas correctamente")
print("📋 Funcionalidades incluidas:")
print("   • Gestión completa de usuarios (CRUD)")
print("   • Filtros y búsqueda avanzada")
print("   • Estadísticas del dashboard")
print("   • Actividad reciente del sistema")
print("   • Acciones masivas (suspender, activar, eliminar)")
print("   • Estado del sistema en tiempo real")
print("   • Herramientas de administración (backup, cache)")
print("   • Logs de auditoría completos")
print("   • Validaciones de seguridad")

@app.route('/fix-admin-password', methods=['GET'])
def fix_admin_password():
    """Corregir contraseña del administrador"""
    try:
        hashed_password = hash_password('admin123')
        
        execute_query(
            "UPDATE Usuario SET Contrasena = %s WHERE Correo = %s",
            (hashed_password, 'admin@agromatch.com')
        )
        
        return "Contraseña del administrador actualizada correctamente"
        
    except Exception as e:
        return f"Error actualizando contraseña: {str(e)}"

@app.route('/debug-admin', methods=['GET'])
def debug_admin():
    """Debug para admin"""
    try:
        # Verificar sesión
        session_info = {
            'user_id': session.get('user_id'),
            'user_role': session.get('user_role'),
            'user_name': session.get('user_name')
        }
        
        # Contar usuarios
        users_count = execute_query("SELECT COUNT(*) as count FROM Usuario WHERE Rol != 'Administrador'", fetch_one=True)
        
        return jsonify({
            'session': session_info,
            'users_count': users_count['count'] if users_count else 0,
            'all_users': execute_query("SELECT ID_Usuario, Nombre, Apellido, Correo, Rol, Estado FROM Usuario WHERE Rol != 'Administrador'")
        })
    except Exception as e:
        return jsonify({'error': str(e)})

# ================================================================
# ENDPOINT PARA VER PERFIL DE TRABAJADOR (Para el Agricultor)
# ================================================================
@app.route('/api/get_worker_profile/<int:worker_id>', methods=['GET'])
@require_login
def get_worker_profile(worker_id):
    """Obtener perfil completo de un trabajador"""
    try:
        # Información básica del trabajador
        worker = execute_query("""
            SELECT 
                u.ID_Usuario,
                u.Nombre,
                u.Apellido,
                u.Correo,
                u.Telefono,
                u.URL_Foto,
                u.Fecha_Registro,
                u.Red_Social
            FROM Usuario u
            WHERE u.ID_Usuario = %s AND u.Rol = 'Trabajador'
        """, (worker_id,), fetch_one=True)
        
        if not worker:
            return jsonify({'success': False, 'message': 'Trabajador no encontrado'}), 404
        
        # Habilidades del trabajador
        habilidades = execute_query("""
            SELECT Nombre, Clasificacion 
            FROM Habilidad 
            WHERE ID_Trabajador = %s
        """, (worker_id,))
        
        # Experiencia laboral
        experiencias = execute_query("""
            SELECT 
                Fecha_Inicio,
                Fecha_Fin,
                Ubicacion,
                Observacion
            FROM Experiencia 
            WHERE ID_Trabajador = %s
            ORDER BY Fecha_Inicio DESC
            LIMIT 5
        """, (worker_id,))
        
        # Estadísticas del trabajador
        stats = execute_query("""
            SELECT 
                COUNT(DISTINCT al.ID_Acuerdo) as trabajos_completados,
                AVG(CAST(c.Puntuacion AS DECIMAL(3,2))) as calificacion_promedio,
                COUNT(DISTINCT c.ID_Calificacion) as total_calificaciones
            FROM Usuario u
            LEFT JOIN Acuerdo_Laboral al ON u.ID_Usuario = al.ID_Trabajador AND al.Estado = 'Finalizado'
            LEFT JOIN Calificacion c ON u.ID_Usuario = c.ID_Usuario_Receptor
            WHERE u.ID_Usuario = %s
        """, (worker_id,), fetch_one=True)
        
        # Calificaciones recientes
        calificaciones = execute_query("""
            SELECT 
                c.Puntuacion,
                c.Comentario,
                c.Fecha,
                CONCAT(u.Nombre, ' ', u.Apellido) as nombre_calificador
            FROM Calificacion c
            JOIN Usuario u ON c.ID_Usuario_Emisor = u.ID_Usuario
            WHERE c.ID_Usuario_Receptor = %s
            ORDER BY c.Fecha DESC
            LIMIT 5
        """, (worker_id,))
        
        return jsonify({
            'success': True,
            'worker': {
                'id': worker['ID_Usuario'],
                'nombre': worker['Nombre'],
                'apellido': worker['Apellido'],
                'nombre_completo': f"{worker['Nombre']} {worker['Apellido']}",
                'email': worker['Correo'],
                'telefono': worker.get('Telefono', 'No disponible'),
                'foto_url': worker.get('URL_Foto'),
                'fecha_registro': worker['Fecha_Registro'].strftime('%Y-%m-%d') if worker['Fecha_Registro'] else None,
                'red_social': worker.get('Red_Social', ''),
                'habilidades': habilidades or [],
                'experiencias': experiencias or [],
                'estadisticas': {
                    'trabajos_completados': stats['trabajos_completados'] if stats else 0,
                    'calificacion_promedio': float(stats['calificacion_promedio']) if stats and stats['calificacion_promedio'] else 0.0,
                    'total_calificaciones': stats['total_calificaciones'] if stats else 0
                },
                'calificaciones_recientes': calificaciones or []
            }
        })
        
    except Exception as e:
        print(f"Error obteniendo perfil de trabajador: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

# ================================================================
# ENDPOINT PARA VER POSTULACIONES DE UNA OFERTA (Para Agricultor)
# ================================================================
@app.route('/api/get_offer_applications/<int:offer_id>', methods=['GET'])
@require_login
def get_offer_applications(offer_id):
    """Obtener todas las postulaciones de una oferta específica"""
    try:
        user_id = session['user_id']
        user_role = session.get('user_role')
        
        if user_role != 'Agricultor':
            return jsonify({'success': False, 'message': 'Solo agricultores pueden ver postulaciones'}), 403
        
        # Verificar que la oferta pertenece al agricultor
        oferta = execute_query("""
            SELECT ID_Agricultor, Titulo 
            FROM Oferta_Trabajo 
            WHERE ID_Oferta = %s
        """, (offer_id,), fetch_one=True)
        
        if not oferta or oferta['ID_Agricultor'] != user_id:
            return jsonify({'success': False, 'message': 'Oferta no encontrada o sin permisos'}), 404
        
        # Obtener postulaciones
        postulaciones = execute_query("""
            SELECT 
                p.ID_Postulacion,
                p.Fecha_Postulacion,
                p.Estado,
                u.ID_Usuario as trabajador_id,
                CONCAT(u.Nombre, ' ', u.Apellido) as nombre_completo,
                u.Telefono,
                u.Correo,
                u.URL_Foto,
                -- Estadísticas del trabajador
                (SELECT COUNT(*) FROM Acuerdo_Laboral al 
                 WHERE al.ID_Trabajador = u.ID_Usuario AND al.Estado = 'Finalizado') as trabajos_completados,
                (SELECT AVG(CAST(c.Puntuacion AS DECIMAL(3,2))) 
                 FROM Calificacion c 
                 WHERE c.ID_Usuario_Receptor = u.ID_Usuario) as calificacion_promedio
            FROM Postulacion p
            JOIN Usuario u ON p.ID_Trabajador = u.ID_Usuario
            WHERE p.ID_Oferta = %s
            ORDER BY p.Fecha_Postulacion DESC
        """, (offer_id,))
        
        postulaciones_list = []
        if postulaciones:
            for post in postulaciones:
                postulaciones_list.append({
                    'id_postulacion': post['ID_Postulacion'],
                    'trabajador_id': post['trabajador_id'],
                    'nombre_completo': post['nombre_completo'],
                    'telefono': post['Telefono'] or 'No disponible',
                    'email': post['Correo'],
                    'foto_url': post['URL_Foto'],
                    'fecha_postulacion': post['Fecha_Postulacion'].strftime('%Y-%m-%d %H:%M') if post['Fecha_Postulacion'] else None,
                    'estado': post['Estado'],
                    'trabajos_completados': post['trabajos_completados'] or 0,
                    'calificacion': float(post['calificacion_promedio']) if post['calificacion_promedio'] else 0.0
                })
        
        return jsonify({
            'success': True,
            'oferta_titulo': oferta['Titulo'],
            'postulaciones': postulaciones_list,
            'total': len(postulaciones_list)
        })
        
    except Exception as e:
        print(f"Error obteniendo postulaciones: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500
    
# ================================================================
# ENDPOINT PARA ACEPTAR/RECHAZAR POSTULACIÓN
# ================================================================
@app.route('/api/update_application_status/<int:postulacion_id>', methods=['PUT'])
def update_application_status(postulacion_id):
    """Actualizar estado de postulación y crear acuerdo laboral si se acepta"""
    print(f"🔵 FUNCIÓN LLAMADA - Postulación ID: {postulacion_id}")
    
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'No autenticado'}), 401
    
    data = request.get_json()
    nuevo_estado = data.get('estado')
    
    if nuevo_estado not in ['Aceptada', 'Rechazada']:
        return jsonify({'success': False, 'message': 'Estado inválido'}), 400
    
    try:
        # Usar tu conexión personalizada con context manager
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            
            # Obtener información de la postulación
            cursor.execute("""
                SELECT p.ID_Oferta, p.ID_Trabajador, ot.ID_Agricultor, ot.Pago_Ofrecido
                FROM Postulacion p
                INNER JOIN Oferta_Trabajo ot ON p.ID_Oferta = ot.ID_Oferta
                WHERE p.ID_Postulacion = %s
            """, (postulacion_id,))
            
            postulacion = cursor.fetchone()
            
            if not postulacion:
                return jsonify({'success': False, 'message': 'Postulación no encontrada'}), 404
            
            oferta_id = postulacion['ID_Oferta']
            trabajador_id = postulacion['ID_Trabajador']
            agricultor_id = postulacion['ID_Agricultor']
            pago_ofrecido = postulacion['Pago_Ofrecido']
            
            # Verificar autorización
            if agricultor_id != session['user_id']:
                return jsonify({'success': False, 'message': 'No autorizado'}), 403
            
            # Actualizar postulación
            cursor.execute("""
                UPDATE Postulacion 
                SET Estado = %s 
                WHERE ID_Postulacion = %s
            """, (nuevo_estado, postulacion_id))
            
            print(f"✅ Postulación {postulacion_id} actualizada a {nuevo_estado}")
            
            # Si se acepta, crear acuerdo laboral
            if nuevo_estado == 'Aceptada':
                # Verificar si ya existe
                cursor.execute("""
                    SELECT ID_Acuerdo 
                    FROM Acuerdo_Laboral 
                    WHERE ID_Oferta = %s AND ID_Trabajador = %s
                """, (oferta_id, trabajador_id))
                
                acuerdo_existe = cursor.fetchone()
                
                if not acuerdo_existe:
                    fecha_inicio = datetime.now().date()
                    
                    cursor.execute("""
                        INSERT INTO Acuerdo_Laboral 
                        (ID_Oferta, ID_Trabajador, Fecha_Inicio, Pago_Final, Estado)
                        VALUES (%s, %s, %s, %s, 'Activo')
                    """, (oferta_id, trabajador_id, fecha_inicio, pago_ofrecido))
                    
                    print(f"✅ Acuerdo laboral creado: Oferta {oferta_id} - Trabajador {trabajador_id}")
                    
                    # Actualizar oferta a "En Proceso"
                    cursor.execute("""
                        UPDATE Oferta_Trabajo 
                        SET Estado = 'En Proceso' 
                        WHERE ID_Oferta = %s
                    """, (oferta_id,))
                    
                    print(f"✅ Oferta {oferta_id} actualizada a 'En Proceso'")
                else:
                    print(f"⚠️ Ya existe acuerdo laboral")
            
            connection.commit()
            cursor.close()
        
        return jsonify({
            'success': True,
            'message': f'Postulación {nuevo_estado.lower()} exitosamente'
        })
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500
    
@app.route('/api/debug_session', methods=['GET'])
def debug_session():
    """Ver qué hay en la sesión - TEMPORAL PARA DEBUG"""
    return jsonify({
        'session_data': dict(session),
        'user_id': session.get('user_id'),
        'user_role': session.get('user_role'),
        'role': session.get('role'),
        'all_keys': list(session.keys())
    })
        
@app.route('/api/debug_toggle_favorite', methods=['GET'])
@require_login
def debug_toggle_favorite():
    """Debug para favoritos"""
    try:
        user_id = session['user_id']
        user_role = session.get('user_role') or session.get('role')
        
        # Contar favoritos actuales
        favoritos = execute_query("""
            SELECT COUNT(*) as total
            FROM Postulacion 
            WHERE ID_Trabajador = %s AND Estado = 'Favorito'
        """, (user_id,), fetch_one=True)
        
        # Obtener algunos favoritos
        lista_favoritos = execute_query("""
            SELECT p.ID_Postulacion, p.ID_Oferta, ot.Titulo
            FROM Postulacion p
            JOIN Oferta_Trabajo ot ON p.ID_Oferta = ot.ID_Oferta
            WHERE p.ID_Trabajador = %s AND p.Estado = 'Favorito'
            LIMIT 5
        """, (user_id,))
        
        return jsonify({
            'success': True,
            'debug_info': {
                'user_id': user_id,
                'user_role': user_role,
                'session_data': dict(session),
                'total_favoritos': favoritos['total'] if favoritos else 0,
                'favoritos': lista_favoritos or []
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
    
# ================================================================
# ENDPOINT PARA OBTENER FAVORITOS
# ================================================================
@app.route('/api/get_favorites', methods=['GET'])
@require_login
def get_favorites():
    """Obtener trabajos favoritos del trabajador"""
    try:
        user_id = session['user_id']
        user_role = session.get('user_role') or session.get('role')
        
        if user_role != 'Trabajador':
            return jsonify({'success': False, 'message': 'Solo trabajadores tienen favoritos'}), 403
        
        favoritos = execute_query("""
            SELECT 
                p.ID_Postulacion,
                p.Fecha_Postulacion,
                ot.ID_Oferta as id_oferta,
                ot.Titulo as titulo,
                ot.Descripcion as descripcion,
                ot.Pago_Ofrecido as pago_ofrecido,
                ot.Fecha_Publicacion as fecha_publicacion,
                ot.Estado as estado,
                CONCAT(u.Nombre, ' ', u.Apellido) as nombre_agricultor
            FROM Postulacion p
            JOIN Oferta_Trabajo ot ON p.ID_Oferta = ot.ID_Oferta
            JOIN Usuario u ON ot.ID_Agricultor = u.ID_Usuario
            WHERE p.ID_Trabajador = %s AND p.Estado = 'Favorito'
            ORDER BY p.Fecha_Postulacion DESC
        """, (user_id,))
        
        return jsonify({
            'success': True,
            'favoritos': favoritos or [],
            'total': len(favoritos) if favoritos else 0
        })
        
    except Exception as e:
        print(f"Error obteniendo favoritos: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

# ================================================================
# ENDPOINT PARA VERIFICAR SI UNA OFERTA ES FAVORITA
# ================================================================
@app.route('/api/check_favorite/<int:job_id>', methods=['GET'])
@require_login
def check_favorite(job_id):
    """Verificar si una oferta está en favoritos"""
    try:
        user_id = session['user_id']
        
        existe = execute_query("""
            SELECT ID_Postulacion 
            FROM Postulacion 
            WHERE ID_Oferta = %s AND ID_Trabajador = %s AND Estado = 'Favorito'
        """, (job_id, user_id), fetch_one=True)
        
        return jsonify({
            'success': True,
            'is_favorite': existe is not None
        })
        
    except Exception as e:
        print(f"Error verificando favorito: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

# ================================================================
# ENDPOINT FAVORITOS - SOLUCIÓN DEFINITIVA
# ================================================================
@app.route('/api/toggle_favorite', methods=['POST', 'OPTIONS'])
def api_toggle_favorite():
    """Toggle favorito - CORS habilitado"""
    
    if request.method == 'OPTIONS':
        response = jsonify({'success': True})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response
    
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'No hay sesión activa'}), 401
        
        user_id = session['user_id']
        user_role = session.get('user_role') or session.get('role')
        
        print(f"DEBUG - User ID: {user_id}, Role: {user_role}")
        
        if user_role != 'Trabajador':
            return jsonify({'success': False, 'message': 'Solo trabajadores pueden usar favoritos'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'No se recibieron datos'}), 400
        
        job_id = data.get('job_id')
        action = data.get('action')
        
        print(f"DEBUG - Job ID: {job_id}, Action: {action}")
        
        if not job_id:
            return jsonify({'success': False, 'message': 'ID de trabajo requerido'}), 400
        
        if action == 'add':
            # Verificar si ya existe
            existe = execute_query("""
                SELECT ID_Postulacion FROM Postulacion 
                WHERE ID_Oferta = %s AND ID_Trabajador = %s
            """, (job_id, user_id), fetch_one=True)
            
            if existe:
                # Ya existe, actualizar a Favorito
                execute_query("""
                    UPDATE Postulacion 
                    SET Estado = 'Favorito', Fecha_Postulacion = NOW()
                    WHERE ID_Postulacion = %s
                """, (existe['ID_Postulacion'],))
                print(f"DEBUG - Actualizado a Favorito: {existe['ID_Postulacion']}")
            else:
                # No existe, crear nuevo
                execute_query("""
                    INSERT INTO Postulacion (ID_Oferta, ID_Trabajador, Estado, Fecha_Postulacion)
                    VALUES (%s, %s, 'Favorito', NOW())
                """, (job_id, user_id))
                print(f"DEBUG - Nuevo favorito creado")
            
            return jsonify({'success': True, 'message': 'Agregado a favoritos', 'is_favorite': True})
        
        elif action == 'remove':
            execute_query("""
                DELETE FROM Postulacion 
                WHERE ID_Oferta = %s AND ID_Trabajador = %s AND Estado = 'Favorito'
            """, (job_id, user_id))
            print(f"DEBUG - Favorito eliminado")
            
            return jsonify({'success': True, 'message': 'Removido de favoritos', 'is_favorite': False})
        
        return jsonify({'success': False, 'message': 'Acción no válida'}), 400
        
    except Exception as e:
        print(f"ERROR toggle_favorite: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

# ================================================================
# APIS COMPLETAS PARA ADMINISTRADOR - AGREGAR A TU APP.PY
# Gestión de Publicaciones, Estadísticas y Reportes
# ================================================================

# ================================================================
# 1. GESTIÓN DE PUBLICACIONES (OFERTAS DE TRABAJO)
# ================================================================

@app.route('/api/admin/publicaciones', methods=['GET'])
@require_role('Administrador')
def admin_get_publicaciones():
    """Obtener todas las publicaciones/ofertas con filtros"""
    try:
        # Filtros opcionales
        estado_filter = request.args.get('estado', '')
        agricultor_filter = request.args.get('agricultor', '')
        fecha_desde = request.args.get('fecha_desde', '')
        fecha_hasta = request.args.get('fecha_hasta', '')
        
        base_query = """
            SELECT 
                ot.ID_Oferta,
                ot.Titulo,
                ot.Descripcion,
                ot.Pago_Ofrecido,
                ot.Fecha_Publicacion,
                ot.Estado,
                CONCAT(u.Nombre, ' ', u.Apellido) as Agricultor_Nombre,
                u.ID_Usuario as Agricultor_ID,
                u.Correo as Agricultor_Email,
                COUNT(DISTINCT p.ID_Postulacion) as Total_Postulaciones,
                COUNT(DISTINCT CASE WHEN p.Estado = 'Pendiente' THEN p.ID_Postulacion END) as Postulaciones_Pendientes,
                COUNT(DISTINCT CASE WHEN p.Estado = 'Aceptada' THEN p.ID_Postulacion END) as Postulaciones_Aceptadas,
                COUNT(DISTINCT al.ID_Acuerdo) as Contratos_Activos
            FROM Oferta_Trabajo ot
            JOIN Usuario u ON ot.ID_Agricultor = u.ID_Usuario
            LEFT JOIN Postulacion p ON ot.ID_Oferta = p.ID_Oferta
            LEFT JOIN Acuerdo_Laboral al ON ot.ID_Oferta = al.ID_Oferta AND al.Estado = 'Activo'
            WHERE 1=1
        """
        
        params = []
        
        # Aplicar filtros
        if estado_filter and estado_filter in ['Abierta', 'Cerrada', 'En Proceso']:
            base_query += " AND ot.Estado = %s"
            params.append(estado_filter)
        
        if agricultor_filter:
            base_query += " AND (u.Nombre LIKE %s OR u.Apellido LIKE %s OR u.Correo LIKE %s)"
            search_like = f"%{agricultor_filter}%"
            params.extend([search_like, search_like, search_like])
        
        if fecha_desde:
            base_query += " AND DATE(ot.Fecha_Publicacion) >= %s"
            params.append(fecha_desde)
        
        if fecha_hasta:
            base_query += " AND DATE(ot.Fecha_Publicacion) <= %s"
            params.append(fecha_hasta)
        
        base_query += """
            GROUP BY ot.ID_Oferta, ot.Titulo, ot.Descripcion, ot.Pago_Ofrecido, 
                     ot.Fecha_Publicacion, ot.Estado, u.Nombre, u.Apellido, 
                     u.ID_Usuario, u.Correo
            ORDER BY ot.Fecha_Publicacion DESC
            LIMIT 100
        """
        
        publicaciones = execute_query(base_query, tuple(params) if params else None)
        
        publicaciones_list = []
        if publicaciones:
            for pub in publicaciones:
                # Extraer ubicación de la descripción si existe
                ubicacion = 'No especificada'
                if pub['Descripcion'] and 'Ubicación:' in pub['Descripcion']:
                    try:
                        ubicacion = pub['Descripcion'].split('Ubicación:')[-1].strip().split('\n')[0]
                    except:
                        pass
                
                publicaciones_list.append({
                    'id': pub['ID_Oferta'],
                    'titulo': pub['Titulo'],
                    'descripcion': pub['Descripcion'][:200] + '...' if len(pub['Descripcion']) > 200 else pub['Descripcion'],
                    'pago': float(pub['Pago_Ofrecido']) if pub['Pago_Ofrecido'] else 0,
                    'fecha_publicacion': pub['Fecha_Publicacion'].strftime('%Y-%m-%d %H:%M') if pub['Fecha_Publicacion'] else '',
                    'estado': pub['Estado'],
                    'agricultor': {
                        'id': pub['Agricultor_ID'],
                        'nombre': pub['Agricultor_Nombre'],
                        'email': pub['Agricultor_Email']
                    },
                    'estadisticas': {
                        'total_postulaciones': pub['Total_Postulaciones'] or 0,
                        'postulaciones_pendientes': pub['Postulaciones_Pendientes'] or 0,
                        'postulaciones_aceptadas': pub['Postulaciones_Aceptadas'] or 0,
                        'contratos_activos': pub['Contratos_Activos'] or 0
                    },
                    'ubicacion': ubicacion
                })
        
        return jsonify({
            'success': True,
            'publicaciones': publicaciones_list,
            'total': len(publicaciones_list)
        })
        
    except Exception as e:
        print(f"Error obteniendo publicaciones: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/admin/publicacion/<int:oferta_id>', methods=['GET'])
@require_role('Administrador')
def admin_get_publicacion_details(oferta_id):
    """Obtener detalles completos de una publicación"""
    try:
        # Información básica de la oferta
        oferta = execute_query("""
            SELECT 
                ot.ID_Oferta,
                ot.Titulo,
                ot.Descripcion,
                ot.Pago_Ofrecido,
                ot.Fecha_Publicacion,
                ot.Estado,
                ot.ID_Agricultor,
                CONCAT(u.Nombre, ' ', u.Apellido) as Agricultor_Nombre,
                u.Correo as Agricultor_Email,
                u.Telefono as Agricultor_Telefono
            FROM Oferta_Trabajo ot
            JOIN Usuario u ON ot.ID_Agricultor = u.ID_Usuario
            WHERE ot.ID_Oferta = %s
        """, (oferta_id,), fetch_one=True)
        
        if not oferta:
            return jsonify({'success': False, 'error': 'Publicación no encontrada'}), 404
        
        # Postulaciones
        postulaciones = execute_query("""
            SELECT 
                p.ID_Postulacion,
                p.Estado,
                p.Fecha_Postulacion,
                CONCAT(u.Nombre, ' ', u.Apellido) as Trabajador_Nombre,
                u.Correo as Trabajador_Email,
                u.ID_Usuario as Trabajador_ID
            FROM Postulacion p
            JOIN Usuario u ON p.ID_Trabajador = u.ID_Usuario
            WHERE p.ID_Oferta = %s
            ORDER BY p.Fecha_Postulacion DESC
        """, (oferta_id,))
        
        # Contratos relacionados
        contratos = execute_query("""
            SELECT 
                al.ID_Acuerdo,
                al.Estado,
                al.Fecha_Inicio,
                al.Fecha_Fin,
                al.Pago_Final,
                CONCAT(u.Nombre, ' ', u.Apellido) as Trabajador_Nombre
            FROM Acuerdo_Laboral al
            JOIN Usuario u ON al.ID_Trabajador = u.ID_Usuario
            WHERE al.ID_Oferta = %s
            ORDER BY al.Fecha_Inicio DESC
        """, (oferta_id,))
        
        return jsonify({
            'success': True,
            'publicacion': {
                'id': oferta['ID_Oferta'],
                'titulo': oferta['Titulo'],
                'descripcion': oferta['Descripcion'],
                'pago': float(oferta['Pago_Ofrecido']) if oferta['Pago_Ofrecido'] else 0,
                'fecha_publicacion': oferta['Fecha_Publicacion'].isoformat() if oferta['Fecha_Publicacion'] else None,
                'estado': oferta['Estado'],
                'agricultor': {
                    'id': oferta['ID_Agricultor'],
                    'nombre': oferta['Agricultor_Nombre'],
                    'email': oferta['Agricultor_Email'],
                    'telefono': oferta['Agricultor_Telefono']
                },
                'postulaciones': postulaciones or [],
                'contratos': contratos or []
            }
        })
        
    except Exception as e:
        print(f"Error obteniendo detalles de publicación: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/admin/publicacion/<int:oferta_id>/cambiar-estado', methods=['PUT'])
@require_role('Administrador')
def admin_cambiar_estado_publicacion(oferta_id):
    """Cambiar estado de una publicación (Abierta/Cerrada/En Proceso)"""
    try:
        data = request.get_json()
        nuevo_estado = data.get('estado')
        
        if nuevo_estado not in ['Abierta', 'Cerrada', 'En Proceso']:
            return jsonify({'success': False, 'error': 'Estado no válido'}), 400
        
        # Verificar que la publicación existe
        oferta = execute_query("""
            SELECT ID_Oferta, Titulo, Estado 
            FROM Oferta_Trabajo 
            WHERE ID_Oferta = %s
        """, (oferta_id,), fetch_one=True)
        
        if not oferta:
            return jsonify({'success': False, 'error': 'Publicación no encontrada'}), 404
        
        # Actualizar estado
        execute_query("""
            UPDATE Oferta_Trabajo 
            SET Estado = %s 
            WHERE ID_Oferta = %s
        """, (nuevo_estado, oferta_id))
        
        # Log de auditoría
        admin_name = session.get('user_name', 'Admin')
        print(f"📋 Admin {admin_name} cambió estado de oferta {oferta_id} '{oferta['Titulo']}' de '{oferta['Estado']}' a '{nuevo_estado}'")
        
        return jsonify({
            'success': True,
            'message': f'Estado de publicación actualizado a {nuevo_estado}'
        })
        
    except Exception as e:
        print(f"Error cambiando estado: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/admin/publicacion/<int:oferta_id>', methods=['DELETE'])
@require_role('Administrador')
def admin_delete_publicacion(oferta_id):
    """Eliminar una publicación (con precaución)"""
    try:
        # Verificar que existe
        oferta = execute_query("""
            SELECT ID_Oferta, Titulo 
            FROM Oferta_Trabajo 
            WHERE ID_Oferta = %s
        """, (oferta_id,), fetch_one=True)
        
        if not oferta:
            return jsonify({'success': False, 'error': 'Publicación no encontrada'}), 404
        
        # Verificar si hay contratos activos
        contratos_activos = execute_query("""
            SELECT COUNT(*) as total 
            FROM Acuerdo_Laboral 
            WHERE ID_Oferta = %s AND Estado = 'Activo'
        """, (oferta_id,), fetch_one=True)
        
        if contratos_activos and contratos_activos['total'] > 0:
            return jsonify({
                'success': False, 
                'error': 'No se puede eliminar una publicación con contratos activos'
            }), 400
        
        # Eliminar dependencias
        execute_query("DELETE FROM Postulacion WHERE ID_Oferta = %s", (oferta_id,))
        execute_query("DELETE FROM Acuerdo_Laboral WHERE ID_Oferta = %s", (oferta_id,))
        execute_query("DELETE FROM Oferta_Trabajo WHERE ID_Oferta = %s", (oferta_id,))
        
        # Log de auditoría
        admin_name = session.get('user_name', 'Admin')
        print(f"🗑️ Admin {admin_name} eliminó publicación {oferta_id} '{oferta['Titulo']}'")
        
        return jsonify({
            'success': True,
            'message': f'Publicación "{oferta["Titulo"]}" eliminada correctamente'
        })
        
    except Exception as e:
        print(f"Error eliminando publicación: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ================================================================
# 2. ESTADÍSTICAS AVANZADAS
# ================================================================

@app.route('/api/admin/estadisticas/general', methods=['GET'])
@require_role('Administrador')
def admin_estadisticas_general():
    """Obtener estadísticas generales del sistema"""
    try:
        from datetime import datetime, timedelta
        
        # Usuarios
        stats_usuarios = execute_query("""
            SELECT 
                COUNT(*) as total_usuarios,
                COUNT(CASE WHEN Rol = 'Trabajador' THEN 1 END) as total_trabajadores,
                COUNT(CASE WHEN Rol = 'Agricultor' THEN 1 END) as total_agricultores,
                COUNT(CASE WHEN Estado = 'Activo' THEN 1 END) as usuarios_activos,
                COUNT(CASE WHEN Estado = 'Inactivo' THEN 1 END) as usuarios_inactivos,
                COUNT(CASE WHEN DATE(Fecha_Registro) >= CURDATE() - INTERVAL 30 DAY THEN 1 END) as nuevos_ultimo_mes,
                COUNT(CASE WHEN DATE(Fecha_Registro) >= CURDATE() - INTERVAL 7 DAY THEN 1 END) as nuevos_ultima_semana
            FROM Usuario
            WHERE Rol != 'Administrador'
        """, fetch_one=True)
        
        # Ofertas de trabajo
        stats_ofertas = execute_query("""
            SELECT 
                COUNT(*) as total_ofertas,
                COUNT(CASE WHEN Estado = 'Abierta' THEN 1 END) as ofertas_abiertas,
                COUNT(CASE WHEN Estado = 'Cerrada' THEN 1 END) as ofertas_cerradas,
                COUNT(CASE WHEN Estado = 'En Proceso' THEN 1 END) as ofertas_en_proceso,
                COUNT(CASE WHEN DATE(Fecha_Publicacion) >= CURDATE() - INTERVAL 30 DAY THEN 1 END) as nuevas_ultimo_mes,
                AVG(Pago_Ofrecido) as pago_promedio
            FROM Oferta_Trabajo
        """, fetch_one=True)
        
        # Postulaciones
        stats_postulaciones = execute_query("""
            SELECT 
                COUNT(*) as total_postulaciones,
                COUNT(CASE WHEN Estado = 'Pendiente' THEN 1 END) as pendientes,
                COUNT(CASE WHEN Estado = 'Aceptada' THEN 1 END) as aceptadas,
                COUNT(CASE WHEN Estado = 'Rechazada' THEN 1 END) as rechazadas,
                COUNT(CASE WHEN Estado = 'Favorito' THEN 1 END) as favoritos,
                COUNT(CASE WHEN DATE(Fecha_Postulacion) >= CURDATE() - INTERVAL 30 DAY THEN 1 END) as nuevas_ultimo_mes
            FROM Postulacion
        """, fetch_one=True)
        
        # Contratos
        stats_contratos = execute_query("""
            SELECT 
                COUNT(*) as total_contratos,
                COUNT(CASE WHEN Estado = 'Activo' THEN 1 END) as contratos_activos,
                COUNT(CASE WHEN Estado = 'Finalizado' THEN 1 END) as contratos_finalizados,
                COUNT(CASE WHEN Estado = 'Cancelado' THEN 1 END) as contratos_cancelados,
                SUM(CASE WHEN Estado = 'Finalizado' THEN Pago_Final ELSE 0 END) as monto_total_pagado,
                AVG(CASE WHEN Estado = 'Finalizado' THEN Pago_Final ELSE NULL END) as pago_promedio_contrato
            FROM Acuerdo_Laboral
        """, fetch_one=True)
        
        # Calificaciones
        stats_calificaciones = execute_query("""
            SELECT 
                COUNT(*) as total_calificaciones,
                AVG(CAST(Puntuacion AS DECIMAL(3,2))) as calificacion_promedio,
                COUNT(CASE WHEN CAST(Puntuacion AS UNSIGNED) >= 4 THEN 1 END) as calificaciones_buenas,
                COUNT(CASE WHEN CAST(Puntuacion AS UNSIGNED) <= 2 THEN 1 END) as calificaciones_malas
            FROM Calificacion
        """, fetch_one=True)
        
        # Tasa de conversión
        tasa_conversion = 0
        if stats_postulaciones and stats_postulaciones['total_postulaciones'] > 0:
            tasa_conversion = (stats_postulaciones['aceptadas'] / stats_postulaciones['total_postulaciones']) * 100
        
        # Tasa de éxito
        tasa_exito = 0
        if stats_contratos and stats_contratos['total_contratos'] > 0:
            tasa_exito = (stats_contratos['contratos_finalizados'] / stats_contratos['total_contratos']) * 100
        
        return jsonify({
            'success': True,
            'estadisticas': {
                'usuarios': {
                    'total': stats_usuarios['total_usuarios'] or 0,
                    'trabajadores': stats_usuarios['total_trabajadores'] or 0,
                    'agricultores': stats_usuarios['total_agricultores'] or 0,
                    'activos': stats_usuarios['usuarios_activos'] or 0,
                    'inactivos': stats_usuarios['usuarios_inactivos'] or 0,
                    'nuevos_mes': stats_usuarios['nuevos_ultimo_mes'] or 0,
                    'nuevos_semana': stats_usuarios['nuevos_ultima_semana'] or 0
                },
                'ofertas': {
                    'total': stats_ofertas['total_ofertas'] or 0,
                    'abiertas': stats_ofertas['ofertas_abiertas'] or 0,
                    'cerradas': stats_ofertas['ofertas_cerradas'] or 0,
                    'en_proceso': stats_ofertas['ofertas_en_proceso'] or 0,
                    'nuevas_mes': stats_ofertas['nuevas_ultimo_mes'] or 0,
                    'pago_promedio': float(stats_ofertas['pago_promedio']) if stats_ofertas['pago_promedio'] else 0
                },
                'postulaciones': {
                    'total': stats_postulaciones['total_postulaciones'] or 0,
                    'pendientes': stats_postulaciones['pendientes'] or 0,
                    'aceptadas': stats_postulaciones['aceptadas'] or 0,
                    'rechazadas': stats_postulaciones['rechazadas'] or 0,
                    'favoritos': stats_postulaciones['favoritos'] or 0,
                    'nuevas_mes': stats_postulaciones['nuevas_ultimo_mes'] or 0,
                    'tasa_conversion': round(tasa_conversion, 2)
                },
                'contratos': {
                    'total': stats_contratos['total_contratos'] or 0,
                    'activos': stats_contratos['contratos_activos'] or 0,
                    'finalizados': stats_contratos['contratos_finalizados'] or 0,
                    'cancelados': stats_contratos['contratos_cancelados'] or 0,
                    'monto_total': float(stats_contratos['monto_total_pagado']) if stats_contratos['monto_total_pagado'] else 0,
                    'pago_promedio': float(stats_contratos['pago_promedio_contrato']) if stats_contratos['pago_promedio_contrato'] else 0,
                    'tasa_exito': round(tasa_exito, 2)
                },
                'calificaciones': {
                    'total': stats_calificaciones['total_calificaciones'] or 0,
                    'promedio': float(stats_calificaciones['calificacion_promedio']) if stats_calificaciones['calificacion_promedio'] else 0,
                    'buenas': stats_calificaciones['calificaciones_buenas'] or 0,
                    'malas': stats_calificaciones['calificaciones_malas'] or 0
                }
            }
        })
        
    except Exception as e:
        print(f"Error obteniendo estadísticas generales: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/admin/estadisticas/graficos', methods=['GET'])
@require_role('Administrador')
def admin_estadisticas_graficos():
    """Obtener datos para gráficos"""
    try:
        # Usuarios registrados por mes (últimos 6 meses)
        usuarios_por_mes = execute_query("""
            SELECT 
                DATE_FORMAT(Fecha_Registro, '%Y-%m') as mes,
                COUNT(*) as total,
                COUNT(CASE WHEN Rol = 'Trabajador' THEN 1 END) as trabajadores,
                COUNT(CASE WHEN Rol = 'Agricultor' THEN 1 END) as agricultores
            FROM Usuario
            WHERE Fecha_Registro >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
              AND Rol != 'Administrador'
            GROUP BY DATE_FORMAT(Fecha_Registro, '%Y-%m')
            ORDER BY mes
        """)
        
        # Ofertas publicadas por mes
        ofertas_por_mes = execute_query("""
            SELECT 
                DATE_FORMAT(Fecha_Publicacion, '%Y-%m') as mes,
                COUNT(*) as total,
                COUNT(CASE WHEN Estado = 'Abierta' THEN 1 END) as abiertas,
                COUNT(CASE WHEN Estado = 'Cerrada' THEN 1 END) as cerradas
            FROM Oferta_Trabajo
            WHERE Fecha_Publicacion >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(Fecha_Publicacion, '%Y-%m')
            ORDER BY mes
        """)
        
        # Postulaciones por estado
        postulaciones_por_estado = execute_query("""
            SELECT 
                Estado,
                COUNT(*) as total
            FROM Postulacion
            GROUP BY Estado
        """)
        
        # Distribución de pagos
        distribucion_pagos = execute_query("""
            SELECT 
                CASE 
                    WHEN Pago_Ofrecido < 30000 THEN 'Bajo (< $30k)'
                    WHEN Pago_Ofrecido BETWEEN 30000 AND 50000 THEN 'Medio ($30k-$50k)'
                    WHEN Pago_Ofrecido > 50000 THEN 'Alto (> $50k)'
                END as rango,
                COUNT(*) as total
            FROM Oferta_Trabajo
            GROUP BY rango
        """)
        
        # Top agricultores por ofertas publicadas
        top_agricultores = execute_query("""
            SELECT 
                CONCAT(u.Nombre, ' ', u.Apellido) as nombre,
                COUNT(ot.ID_Oferta) as total_ofertas,
                COUNT(CASE WHEN ot.Estado = 'Abierta' THEN 1 END) as ofertas_activas
            FROM Usuario u
            JOIN Oferta_Trabajo ot ON u.ID_Usuario = ot.ID_Agricultor
            WHERE u.Rol = 'Agricultor'
            GROUP BY u.ID_Usuario, u.Nombre, u.Apellido
            ORDER BY total_ofertas DESC
            LIMIT 10
        """)
        
        # Top trabajadores por postulaciones
        top_trabajadores = execute_query("""
            SELECT 
                CONCAT(u.Nombre, ' ', u.Apellido) as nombre,
                COUNT(p.ID_Postulacion) as total_postulaciones,
                COUNT(CASE WHEN p.Estado = 'Aceptada' THEN 1 END) as aceptadas
            FROM Usuario u
            JOIN Postulacion p ON u.ID_Usuario = p.ID_Trabajador
            WHERE u.Rol = 'Trabajador'
            GROUP BY u.ID_Usuario, u.Nombre, u.Apellido
            ORDER BY total_postulaciones DESC
            LIMIT 10
        """)
        
        return jsonify({
            'success': True,
            'graficos': {
                'usuarios_por_mes': usuarios_por_mes or [],
                'ofertas_por_mes': ofertas_por_mes or [],
                'postulaciones_por_estado': postulaciones_por_estado or [],
                'distribucion_pagos': distribucion_pagos or [],
                'top_agricultores': top_agricultores or [],
                'top_trabajadores': top_trabajadores or []
            }
        })
        
    except Exception as e:
        print(f"Error obteniendo datos para gráficos: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ================================================================
# 3. REPORTES
# ================================================================

@app.route('/api/admin/reportes/generar', methods=['POST'])
@require_role('Administrador')
def admin_generar_reporte():
    """Generar reporte personalizado"""
    try:
        data = request.get_json()
        tipo_reporte = data.get('tipo')
        fecha_inicio = data.get('fecha_inicio')
        fecha_fin = data.get('fecha_fin')
        formato = data.get('formato', 'json')  # json, csv, excel
        
        if not tipo_reporte:
            return jsonify({'success': False, 'error': 'Tipo de reporte requerido'}), 400
        
        reporte_data = {}
        
        if tipo_reporte == 'usuarios':
            # Reporte de usuarios
            query = """
                SELECT 
                    u.ID_Usuario,
                    CONCAT(u.Nombre, ' ', u.Apellido) as Nombre_Completo,
                    u.Correo,
                    u.Telefono,
                    u.Rol,
                    u.Estado,
                    DATE(u.Fecha_Registro) as Fecha_Registro,
                    COUNT(DISTINCT CASE WHEN u.Rol = 'Trabajador' THEN p.ID_Postulacion END) as Total_Postulaciones,
                    COUNT(DISTINCT CASE WHEN u.Rol = 'Agricultor' THEN ot.ID_Oferta END) as Total_Ofertas
                FROM Usuario u
                LEFT JOIN Postulacion p ON u.ID_Usuario = p.ID_Trabajador
                LEFT JOIN Oferta_Trabajo ot ON u.ID_Usuario = ot.ID_Agricultor
                WHERE u.Rol != 'Administrador'
            """
            
            if fecha_inicio and fecha_fin:
                query += " AND DATE(u.Fecha_Registro) BETWEEN %s AND %s"
                params = (fecha_inicio, fecha_fin)
            else:
                params = None
            
            query += " GROUP BY u.ID_Usuario ORDER BY u.Fecha_Registro DESC"
            
            reporte_data = execute_query(query, params)
            
        elif tipo_reporte == 'ofertas':
            # Reporte de ofertas
            query = """
                SELECT 
                    ot.ID_Oferta,
                    ot.Titulo,
                    CONCAT(u.Nombre, ' ', u.Apellido) as Agricultor,
                    ot.Pago_Ofrecido,
                    DATE(ot.Fecha_Publicacion) as Fecha_Publicacion,
                    ot.Estado,
                    COUNT(DISTINCT p.ID_Postulacion) as Total_Postulaciones,
                    COUNT(DISTINCT CASE WHEN p.Estado = 'Aceptada' THEN p.ID_Postulacion END) as Postulaciones_Aceptadas
                FROM Oferta_Trabajo ot
                JOIN Usuario u ON ot.ID_Agricultor = u.ID_Usuario
                LEFT JOIN Postulacion p ON ot.ID_Oferta = p.ID_Oferta
                WHERE 1=1
            """
            
            if fecha_inicio and fecha_fin:
                query += " AND DATE(ot.Fecha_Publicacion) BETWEEN %s AND %s"
                params = (fecha_inicio, fecha_fin)
            else:
                params = None
            
            query += " GROUP BY ot.ID_Oferta ORDER BY ot.Fecha_Publicacion DESC"
            
            reporte_data = execute_query(query, params)
            
        elif tipo_reporte == 'contratos':
            # Reporte de contratos
            query = """
                SELECT 
                    al.ID_Acuerdo,
                    ot.Titulo as Oferta,
                    CONCAT(ut.Nombre, ' ', ut.Apellido) as Trabajador,
                    CONCAT(ua.Nombre, ' ', ua.Apellido) as Agricultor,
                    DATE(al.Fecha_Inicio) as Fecha_Inicio,
                    DATE(al.Fecha_Fin) as Fecha_Fin,
                    al.Pago_Final,
                    al.Estado
                FROM Acuerdo_Laboral al
                JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
                JOIN Usuario ut ON al.ID_Trabajador = ut.ID_Usuario
                JOIN Usuario ua ON ot.ID_Agricultor = ua.ID_Usuario
                WHERE 1=1
            """
            
            if fecha_inicio and fecha_fin:
                query += " AND DATE(al.Fecha_Inicio) BETWEEN %s AND %s"
                params = (fecha_inicio, fecha_fin)
            else:
                params = None
            
            query += " ORDER BY al.Fecha_Inicio DESC"
            
            reporte_data = execute_query(query, params)
            
        elif tipo_reporte == 'financiero':
            # Reporte financiero
            stats_financiero = execute_query("""
                SELECT 
                    COUNT(*) as total_contratos,
                    SUM(Pago_Final) as monto_total,
                    AVG(Pago_Final) as pago_promedio,
                    MIN(Pago_Final) as pago_minimo,
                    MAX(Pago_Final) as pago_maximo,
                    COUNT(CASE WHEN Estado = 'Finalizado' THEN 1 END) as contratos_finalizados
                FROM Acuerdo_Laboral
                WHERE Fecha_Inicio BETWEEN %s AND %s
            """, (fecha_inicio or '2020-01-01', fecha_fin or '2030-12-31'), fetch_one=True)
            
            # Detalles por mes
            detalles_mes = execute_query("""
                SELECT 
                    DATE_FORMAT(Fecha_Inicio, '%Y-%m') as mes,
                    COUNT(*) as contratos,
                    SUM(Pago_Final) as monto_total
                FROM Acuerdo_Laboral
                WHERE Fecha_Inicio BETWEEN %s AND %s
                GROUP BY DATE_FORMAT(Fecha_Inicio, '%Y-%m')
                ORDER BY mes
            """, (fecha_inicio or '2020-01-01', fecha_fin or '2030-12-31'))
            
            reporte_data = {
                'resumen': stats_financiero,
                'detalles_mensuales': detalles_mes or []
            }
        
        else:
            return jsonify({'success': False, 'error': 'Tipo de reporte no válido'}), 400
        
        # Log de auditoría
        admin_name = session.get('user_name', 'Admin')
        print(f"📊 Admin {admin_name} generó reporte de tipo '{tipo_reporte}' del {fecha_inicio} al {fecha_fin}")
        
        return jsonify({
            'success': True,
            'reporte': {
                'tipo': tipo_reporte,
                'fecha_inicio': fecha_inicio,
                'fecha_fin': fecha_fin,
                'fecha_generacion': datetime.now().isoformat(),
                'generado_por': admin_name,
                'total_registros': len(reporte_data) if isinstance(reporte_data, list) else 1,
                'datos': reporte_data
            }
        })
        
    except Exception as e:
        print(f"Error generando reporte: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/admin/reportes/actividad', methods=['GET'])
@require_role('Administrador')
def admin_reporte_actividad():
    """Reporte de actividad del sistema"""
    try:
        dias = int(request.args.get('dias', 30))
        
        # Actividad general
        actividad = execute_query("""
            SELECT 
                DATE(fecha) as dia,
                tipo_actividad,
                COUNT(*) as total
            FROM (
                SELECT Fecha_Registro as fecha, 'Nuevo Usuario' as tipo_actividad
                FROM Usuario 
                WHERE Fecha_Registro >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                
                UNION ALL
                
                SELECT Fecha_Publicacion, 'Nueva Oferta'
                FROM Oferta_Trabajo
                WHERE Fecha_Publicacion >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                
                UNION ALL
                
                SELECT Fecha_Postulacion, 'Nueva Postulación'
                FROM Postulacion
                WHERE Fecha_Postulacion >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                
                UNION ALL
                
                SELECT Fecha_Inicio, 'Nuevo Contrato'
                FROM Acuerdo_Laboral
                WHERE Fecha_Inicio >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
            ) actividades
            GROUP BY DATE(fecha), tipo_actividad
            ORDER BY dia DESC, tipo_actividad
        """, (dias, dias, dias, dias))
        
        # Resumen por tipo
        resumen = execute_query("""
            SELECT 
                tipo_actividad,
                COUNT(*) as total
            FROM (
                SELECT 'Nuevo Usuario' as tipo_actividad
                FROM Usuario 
                WHERE Fecha_Registro >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                
                UNION ALL
                
                SELECT 'Nueva Oferta'
                FROM Oferta_Trabajo
                WHERE Fecha_Publicacion >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                
                UNION ALL
                
                SELECT 'Nueva Postulación'
                FROM Postulacion
                WHERE Fecha_Postulacion >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                
                UNION ALL
                
                SELECT 'Nuevo Contrato'
                FROM Acuerdo_Laboral
                WHERE Fecha_Inicio >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
            ) actividades
            GROUP BY tipo_actividad
        """, (dias, dias, dias, dias))
        
        return jsonify({
            'success': True,
            'periodo': f'Últimos {dias} días',
            'resumen': resumen or [],
            'detalle_diario': actividad or []
        })
        
    except Exception as e:
        print(f"Error en reporte de actividad: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/admin/reportes/rendimiento', methods=['GET'])
@require_role('Administrador')
def admin_reporte_rendimiento():
    """Reporte de rendimiento del sistema"""
    try:
        # Métricas de rendimiento
        metricas = {
            'usuarios': {},
            'ofertas': {},
            'postulaciones': {},
            'contratos': {}
        }
        
        # Usuarios más activos (trabajadores)
        trabajadores_activos = execute_query("""
            SELECT 
                CONCAT(u.Nombre, ' ', u.Apellido) as nombre,
                COUNT(p.ID_Postulacion) as postulaciones,
                COUNT(al.ID_Acuerdo) as contratos_completados,
                AVG(CAST(c.Puntuacion AS DECIMAL(3,2))) as calificacion
            FROM Usuario u
            LEFT JOIN Postulacion p ON u.ID_Usuario = p.ID_Trabajador
            LEFT JOIN Acuerdo_Laboral al ON u.ID_Usuario = al.ID_Trabajador AND al.Estado = 'Finalizado'
            LEFT JOIN Calificacion c ON u.ID_Usuario = c.ID_Usuario_Receptor
            WHERE u.Rol = 'Trabajador'
            GROUP BY u.ID_Usuario
            ORDER BY postulaciones DESC
            LIMIT 10
        """)
        
        # Agricultores más activos
        agricultores_activos = execute_query("""
            SELECT 
                CONCAT(u.Nombre, ' ', u.Apellido) as nombre,
                COUNT(DISTINCT ot.ID_Oferta) as ofertas_publicadas,
                COUNT(DISTINCT al.ID_Acuerdo) as contratos_completados,
                AVG(CAST(c.Puntuacion AS DECIMAL(3,2))) as calificacion
            FROM Usuario u
            LEFT JOIN Oferta_Trabajo ot ON u.ID_Usuario = ot.ID_Agricultor
            LEFT JOIN Acuerdo_Laboral al ON ot.ID_Oferta = al.ID_Oferta AND al.Estado = 'Finalizado'
            LEFT JOIN Calificacion c ON u.ID_Usuario = c.ID_Usuario_Receptor
            WHERE u.Rol = 'Agricultor'
            GROUP BY u.ID_Usuario
            ORDER BY ofertas_publicadas DESC
            LIMIT 10
        """)
        
        # Ofertas con más postulaciones
        ofertas_populares = execute_query("""
            SELECT 
                ot.Titulo,
                CONCAT(u.Nombre, ' ', u.Apellido) as agricultor,
                COUNT(p.ID_Postulacion) as total_postulaciones,
                ot.Pago_Ofrecido,
                ot.Estado
            FROM Oferta_Trabajo ot
            JOIN Usuario u ON ot.ID_Agricultor = u.ID_Usuario
            LEFT JOIN Postulacion p ON ot.ID_Oferta = p.ID_Oferta
            GROUP BY ot.ID_Oferta
            ORDER BY total_postulaciones DESC
            LIMIT 10
        """)
        
        # Tasa de éxito por categoría
        tasa_exito = execute_query("""
            SELECT 
                ot.Estado,
                COUNT(DISTINCT ot.ID_Oferta) as total_ofertas,
                COUNT(DISTINCT p.ID_Postulacion) as total_postulaciones,
                COUNT(DISTINCT al.ID_Acuerdo) as total_contratos
            FROM Oferta_Trabajo ot
            LEFT JOIN Postulacion p ON ot.ID_Oferta = p.ID_Oferta
            LEFT JOIN Acuerdo_Laboral al ON ot.ID_Oferta = al.ID_Oferta
            GROUP BY ot.Estado
        """)
        
        return jsonify({
            'success': True,
            'rendimiento': {
                'trabajadores_destacados': trabajadores_activos or [],
                'agricultores_destacados': agricultores_activos or [],
                'ofertas_populares': ofertas_populares or [],
                'tasa_exito': tasa_exito or []
            }
        })
        
    except Exception as e:
        print(f"Error en reporte de rendimiento: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ================================================================
# 4. EXPORTACIÓN DE DATOS
# ================================================================

@app.route('/api/admin/exportar/<tipo>', methods=['GET'])
@require_role('Administrador')
def admin_exportar_datos(tipo):
    """Exportar datos en diferentes formatos"""
    try:
        formato = request.args.get('formato', 'csv')  # csv, json, excel
        
        if tipo == 'usuarios':
            datos = execute_query("""
                SELECT 
                    ID_Usuario,
                    CONCAT(Nombre, ' ', Apellido) as Nombre_Completo,
                    Correo,
                    Telefono,
                    Rol,
                    Estado,
                    DATE(Fecha_Registro) as Fecha_Registro
                FROM Usuario
                WHERE Rol != 'Administrador'
                ORDER BY Fecha_Registro DESC
            """)
            
        elif tipo == 'ofertas':
            datos = execute_query("""
                SELECT 
                    ot.ID_Oferta,
                    ot.Titulo,
                    CONCAT(u.Nombre, ' ', u.Apellido) as Agricultor,
                    ot.Pago_Ofrecido,
                    DATE(ot.Fecha_Publicacion) as Fecha_Publicacion,
                    ot.Estado
                FROM Oferta_Trabajo ot
                JOIN Usuario u ON ot.ID_Agricultor = u.ID_Usuario
                ORDER BY ot.Fecha_Publicacion DESC
            """)
            
        elif tipo == 'postulaciones':
            datos = execute_query("""
                SELECT 
                    p.ID_Postulacion,
                    ot.Titulo as Oferta,
                    CONCAT(ut.Nombre, ' ', ut.Apellido) as Trabajador,
                    CONCAT(ua.Nombre, ' ', ua.Apellido) as Agricultor,
                    DATE(p.Fecha_Postulacion) as Fecha_Postulacion,
                    p.Estado
                FROM Postulacion p
                JOIN Oferta_Trabajo ot ON p.ID_Oferta = ot.ID_Oferta
                JOIN Usuario ut ON p.ID_Trabajador = ut.ID_Usuario
                JOIN Usuario ua ON ot.ID_Agricultor = ua.ID_Usuario
                ORDER BY p.Fecha_Postulacion DESC
            """)
            
        elif tipo == 'contratos':
            datos = execute_query("""
                SELECT 
                    al.ID_Acuerdo,
                    ot.Titulo as Oferta,
                    CONCAT(ut.Nombre, ' ', ut.Apellido) as Trabajador,
                    CONCAT(ua.Nombre, ' ', ua.Apellido) as Agricultor,
                    DATE(al.Fecha_Inicio) as Fecha_Inicio,
                    DATE(al.Fecha_Fin) as Fecha_Fin,
                    al.Pago_Final,
                    al.Estado
                FROM Acuerdo_Laboral al
                JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
                JOIN Usuario ut ON al.ID_Trabajador = ut.ID_Usuario
                JOIN Usuario ua ON ot.ID_Agricultor = ua.ID_Usuario
                ORDER BY al.Fecha_Inicio DESC
            """)
            
        else:
            return jsonify({'success': False, 'error': 'Tipo de exportación no válido'}), 400
        
        if not datos:
            return jsonify({'success': False, 'error': 'No hay datos para exportar'}), 404
        
        # Log de auditoría
        admin_name = session.get('user_name', 'Admin')
        print(f"📥 Admin {admin_name} exportó {len(datos)} registros de {tipo} en formato {formato}")
        
        # En producción real, aquí generarías el archivo CSV/Excel
        # Por ahora retornamos los datos en JSON
        return jsonify({
            'success': True,
            'tipo': tipo,
            'formato': formato,
            'total_registros': len(datos),
            'datos': datos,
            'mensaje': f'Datos de {tipo} preparados para exportación en formato {formato}'
        })
        
    except Exception as e:
        print(f"Error exportando datos: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ================================================================
# 5. MÉTRICAS EN TIEMPO REAL
# ================================================================

@app.route('/api/admin/metricas-tiempo-real', methods=['GET'])
@require_role('Administrador')
def admin_metricas_tiempo_real():
    """Obtener métricas en tiempo real del sistema"""
    try:
        from datetime import datetime, timedelta
        
        # Actividad de la última hora
        ultima_hora = datetime.now() - timedelta(hours=1)
        
        actividad_reciente = execute_query("""
            SELECT 
                'usuario' as tipo,
                COUNT(*) as cantidad
            FROM Usuario
            WHERE Fecha_Registro >= %s
            
            UNION ALL
            
            SELECT 
                'oferta' as tipo,
                COUNT(*) as cantidad
            FROM Oferta_Trabajo
            WHERE Fecha_Publicacion >= %s
            
            UNION ALL
            
            SELECT 
                'postulacion' as tipo,
                COUNT(*) as cantidad
            FROM Postulacion
            WHERE Fecha_Postulacion >= %s
        """, (ultima_hora, ultima_hora, ultima_hora))
        
        # Usuarios en línea (simulado - necesitarías un sistema de sesiones real)
        usuarios_activos = execute_query("""
            SELECT COUNT(*) as total
            FROM Usuario
            WHERE Estado = 'Activo' AND Rol != 'Administrador'
        """, fetch_one=True)
        
        # Ofertas abiertas actualmente
        ofertas_abiertas = execute_query("""
            SELECT COUNT(*) as total
            FROM Oferta_Trabajo
            WHERE Estado = 'Abierta'
        """, fetch_one=True)
        
        # Postulaciones pendientes de revisión
        postulaciones_pendientes = execute_query("""
            SELECT COUNT(*) as total
            FROM Postulacion
            WHERE Estado = 'Pendiente'
        """, fetch_one=True)
        
        # Contratos activos
        contratos_activos = execute_query("""
            SELECT COUNT(*) as total
            FROM Acuerdo_Laboral
            WHERE Estado = 'Activo'
        """, fetch_one=True)
        
        return jsonify({
            'success': True,
            'timestamp': datetime.now().isoformat(),
            'metricas': {
                'usuarios_activos': usuarios_activos['total'] if usuarios_activos else 0,
                'ofertas_abiertas': ofertas_abiertas['total'] if ofertas_abiertas else 0,
                'postulaciones_pendientes': postulaciones_pendientes['total'] if postulaciones_pendientes else 0,
                'contratos_activos': contratos_activos['total'] if contratos_activos else 0,
                'actividad_ultima_hora': {
                    item['tipo']: item['cantidad'] 
                    for item in (actividad_reciente or [])
                }
            }
        })
        
    except Exception as e:
        print(f"Error obteniendo métricas en tiempo real: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


print("✅ APIs completas cargadas:")
print("   📋 Gestión de Publicaciones (GET, detalles, cambiar estado, eliminar)")
print("   📊 Estadísticas Generales y Gráficos")
print("   📑 Reportes (Usuarios, Ofertas, Contratos, Financiero, Actividad, Rendimiento)")
print("   📥 Exportación de Datos (CSV, JSON, Excel)")
print("   ⚡ Métricas en Tiempo Real")

# ================================================================
# AGREGAR ESTAS RUTAS A TU app.py EXISTENTE
# APIs para Búsqueda de Trabajadores y Recomendaciones
# ================================================================

# ================================================================
# RF18: BÚSQUEDA Y FILTRADO DE TRABAJADORES (Para Agricultores)
# ================================================================

@app.route('/api/buscar-trabajadores', methods=['GET'])
@require_login
def buscar_trabajadores():
    """Buscar trabajadores con filtros avanzados"""
    try:
        user_role = session.get('user_role')
        
        if user_role != 'Agricultor':
            return jsonify({
                'success': False,
                'message': 'Solo agricultores pueden buscar trabajadores'
            }), 403
        
        # Obtener parámetros de búsqueda
        habilidad = request.args.get('habilidad', '')
        ubicacion = request.args.get('ubicacion', '')
        experiencia_min = request.args.get('experiencia_min', '0')
        calificacion_min = request.args.get('calificacion_min', '0')
        disponibilidad = request.args.get('disponibilidad', '')
        
        # Construir query base
        query = """
            SELECT DISTINCT
                u.ID_Usuario,
                u.Nombre,
                u.Apellido,
                u.Correo,
                u.Telefono,
                u.URL_Foto,
                u.Fecha_Registro,
                -- Calcular experiencia en años
                COALESCE(
                    TIMESTAMPDIFF(YEAR, 
                        MIN(e.Fecha_Inicio), 
                        COALESCE(MAX(e.Fecha_Fin), NOW())
                    ), 0
                ) as anos_experiencia,
                -- Calificación promedio
                COALESCE(AVG(CAST(c.Puntuacion AS DECIMAL(3,2))), 0) as calificacion_promedio,
                -- Total de trabajos completados
                COUNT(DISTINCT al.ID_Acuerdo) as trabajos_completados,
                -- Ubicación más reciente
                (SELECT e2.Ubicacion 
                 FROM Experiencia e2 
                 WHERE e2.ID_Trabajador = u.ID_Usuario 
                 ORDER BY e2.Fecha_Inicio DESC 
                 LIMIT 1) as ubicacion_reciente
            FROM Usuario u
            LEFT JOIN Experiencia e ON u.ID_Usuario = e.ID_Trabajador
            LEFT JOIN Calificacion c ON u.ID_Usuario = c.ID_Usuario_Receptor
            LEFT JOIN Acuerdo_Laboral al ON u.ID_Usuario = al.ID_Trabajador AND al.Estado = 'Finalizado'
            WHERE u.Rol = 'Trabajador' AND u.Estado = 'Activo'
        """
        
        params = []
        
        # Aplicar filtros
        if habilidad:
            query += """
                AND EXISTS (
                    SELECT 1 FROM Habilidad h 
                    WHERE h.ID_Trabajador = u.ID_Usuario 
                    AND (h.Nombre LIKE %s OR h.Clasificacion LIKE %s)
                )
            """
            habilidad_like = f"%{habilidad}%"
            params.extend([habilidad_like, habilidad_like])
        
        if ubicacion:
            query += """
                AND EXISTS (
                    SELECT 1 FROM Experiencia e2 
                    WHERE e2.ID_Trabajador = u.ID_Usuario 
                    AND e2.Ubicacion LIKE %s
                )
            """
            params.append(f"%{ubicacion}%")
        
        query += """
            GROUP BY u.ID_Usuario, u.Nombre, u.Apellido, u.Correo, 
                     u.Telefono, u.URL_Foto, u.Fecha_Registro
            HAVING 1=1
        """
        
        # Filtros de HAVING (después de GROUP BY)
        if experiencia_min and int(experiencia_min) > 0:
            query += " AND anos_experiencia >= %s"
            params.append(int(experiencia_min))
        
        if calificacion_min and float(calificacion_min) > 0:
            query += " AND calificacion_promedio >= %s"
            params.append(float(calificacion_min))
        
        # Ordenamiento por relevancia
        query += " ORDER BY calificacion_promedio DESC, trabajos_completados DESC LIMIT 50"
        
        trabajadores = execute_query(query, tuple(params) if params else None)
        
        # Obtener habilidades para cada trabajador
        trabajadores_list = []
        if trabajadores:
            for trabajador in trabajadores:
                # Habilidades del trabajador
                habilidades = execute_query("""
                    SELECT Nombre, Clasificacion 
                    FROM Habilidad 
                    WHERE ID_Trabajador = %s
                """, (trabajador['ID_Usuario'],))
                
                trabajadores_list.append({
                    'id': trabajador['ID_Usuario'],
                    'nombre': f"{trabajador['Nombre']} {trabajador['Apellido']}",
                    'email': trabajador['Correo'],
                    'telefono': trabajador['Telefono'],
                    'foto_url': trabajador['URL_Foto'],
                    'anos_experiencia': int(trabajador['anos_experiencia']),
                    'calificacion': float(trabajador['calificacion_promedio']),
                    'trabajos_completados': trabajador['trabajos_completados'] or 0,
                    'ubicacion': trabajador['ubicacion_reciente'] or 'No especificada',
                    'habilidades': habilidades or [],
                    'fecha_registro': trabajador['Fecha_Registro'].strftime('%Y-%m-%d')
                })
        
        return jsonify({
            'success': True,
            'trabajadores': trabajadores_list,
            'total': len(trabajadores_list),
            'filtros_aplicados': {
                'habilidad': habilidad,
                'ubicacion': ubicacion,
                'experiencia_min': experiencia_min,
                'calificacion_min': calificacion_min
            }
        })
        
    except Exception as e:
        print(f"Error buscando trabajadores: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/habilidades-disponibles', methods=['GET'])
@require_login
def get_habilidades_disponibles():
    """Obtener lista de habilidades disponibles para filtros"""
    try:
        habilidades = execute_query("""
            SELECT DISTINCT Nombre, Clasificacion
            FROM Habilidad
            ORDER BY Clasificacion, Nombre
        """)
        
        # Agrupar por clasificación
        habilidades_agrupadas = {}
        if habilidades:
            for hab in habilidades:
                clasificacion = hab['Clasificacion']
                if clasificacion not in habilidades_agrupadas:
                    habilidades_agrupadas[clasificacion] = []
                habilidades_agrupadas[clasificacion].append(hab['Nombre'])
        
        return jsonify({
            'success': True,
            'habilidades': habilidades_agrupadas
        })
        
    except Exception as e:
        print(f"Error obteniendo habilidades: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/actualizar-preferencias', methods=['POST'])
@require_login
def actualizar_preferencias():
    """Actualizar preferencias del trabajador para mejorar recomendaciones"""
    try:
        user_id = session['user_id']
        user_role = session.get('user_role')
        
        if user_role != 'Trabajador':
            return jsonify({
                'success': False,
                'message': 'Solo trabajadores pueden actualizar preferencias'
            }), 403
        
        data = request.get_json()
        
        # Guardar preferencias en tabla Usuario (campo Configuraciones JSON)
        import json
        
        # Obtener configuraciones actuales
        current_config = execute_query("""
            SELECT Configuraciones 
            FROM Usuario 
            WHERE ID_Usuario = %s
        """, (user_id,), fetch_one=True)
        
        config = {}
        if current_config and current_config['Configuraciones']:
            try:
                config = json.loads(current_config['Configuraciones'])
            except:
                config = {}
        
        # Actualizar preferencias de búsqueda
        config['preferencias_empleo'] = {
            'ubicaciones_preferidas': data.get('ubicaciones', []),
            'tipos_trabajo_preferidos': data.get('tipos_trabajo', []),
            'rango_salarial_min': data.get('salario_minimo', 0),
            'rango_salarial_max': data.get('salario_maximo', 100000),
            'disponibilidad': data.get('disponibilidad', 'flexible')
        }
        
        # Guardar en base de datos
        execute_query("""
            UPDATE Usuario 
            SET Configuraciones = %s
            WHERE ID_Usuario = %s
        """, (json.dumps(config), user_id))
        
        return jsonify({
            'success': True,
            'message': 'Preferencias actualizadas correctamente'
        })
        
    except Exception as e:
        print(f"Error actualizando preferencias: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


# ================================================================
# NOTIFICACIONES PROACTIVAS (RF18 - Parte de notificar usuarios)
# ================================================================

@app.route('/api/notificar-usuarios-habilidades', methods=['POST'])
@require_login
def notificar_usuarios_habilidades():
    """Notificar a usuarios con habilidades específicas sobre una nueva oferta"""
    try:
        user_id = session['user_id']
        user_role = session.get('user_role')
        
        if user_role != 'Agricultor':
            return jsonify({
                'success': False,
                'message': 'Solo agricultores pueden enviar notificaciones'
            }), 403
        
        data = request.get_json()
        oferta_id = data.get('oferta_id')
        
        if not oferta_id:
            return jsonify({
                'success': False,
                'message': 'ID de oferta requerido'
            }), 400
        
        # Obtener información de la oferta
        oferta = execute_query("""
            SELECT 
                ot.ID_Oferta,
                ot.Titulo,
                ot.Descripcion,
                ot.Pago_Ofrecido,
                ot.ID_Agricultor
            FROM Oferta_Trabajo ot
            WHERE ot.ID_Oferta = %s AND ot.ID_Agricultor = %s
        """, (oferta_id, user_id), fetch_one=True)
        
        if not oferta:
            return jsonify({
                'success': False,
                'message': 'Oferta no encontrada o sin permisos'
            }), 404
        
        # Analizar la descripción para extraer habilidades requeridas
        descripcion_lower = oferta['Descripcion'].lower()
        
        # Buscar trabajadores con habilidades relevantes
        trabajadores_query = """
            SELECT DISTINCT
                u.ID_Usuario,
                u.Nombre,
                u.Apellido,
                u.Correo,
                GROUP_CONCAT(h.Nombre SEPARATOR ', ') as habilidades_coincidentes
            FROM Usuario u
            JOIN Habilidad h ON u.ID_Usuario = h.ID_Trabajador
            WHERE u.Rol = 'Trabajador' 
              AND u.Estado = 'Activo'
              AND (
                  %s LIKE CONCAT('%%', h.Nombre, '%%') OR
                  %s LIKE CONCAT('%%', h.Clasificacion, '%%')
              )
              AND u.ID_Usuario NOT IN (
                  SELECT ID_Trabajador 
                  FROM Postulacion 
                  WHERE ID_Oferta = %s
              )
            GROUP BY u.ID_Usuario
            LIMIT 50
        """
        
        trabajadores_notificar = execute_query(
            trabajadores_query,
            (descripcion_lower, descripcion_lower, oferta_id)
        )
        
        # Crear notificaciones (guardar en tabla Mensaje)
        notificaciones_creadas = 0
        if trabajadores_notificar:
            for trabajador in trabajadores_notificar:
                mensaje_contenido = f"""
Nueva oportunidad de trabajo que coincide con tu perfil:

📋 {oferta['Titulo']}
💰 Pago: ${oferta['Pago_Ofrecido']:,.0f}
✨ Habilidades coincidentes: {trabajador['habilidades_coincidentes']}

¡No pierdas esta oportunidad! Postúlate ahora.
                """.strip()
                
                execute_query("""
                    INSERT INTO Mensaje 
                    (ID_Emisor, ID_Receptor, Contenido, Estado, Fecha_Envio)
                    VALUES (%s, %s, %s, 'Enviado', NOW())
                """, (user_id, trabajador['ID_Usuario'], mensaje_contenido))
                
                notificaciones_creadas += 1
        
        return jsonify({
            'success': True,
            'message': f'Notificaciones enviadas a {notificaciones_creadas} trabajadores',
            'total_notificados': notificaciones_creadas
        })
        
    except Exception as e:
        print(f"Error enviando notificaciones: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


print("✅ APIs de Búsqueda y Recomendaciones cargadas:")
print("   🔍 RF18: Búsqueda avanzada de trabajadores")
print("   💡 RF24: Sistema de recomendaciones personalizadas")
print("   📧 Notificaciones proactivas por habilidades")

# ============================================================
# RUTAS PARA HISTORIAL DE EMPLEOS (TRABAJADOR)
# ============================================================

@app.route('/api/historial_empleos_trabajador', methods=['GET'])
def historial_empleos_trabajador():
    """Obtener historial de empleos de un trabajador"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'No autenticado'}), 401
    
    trabajador_id = session['user_id']
    
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            
            query = """
                SELECT 
                    al.ID_Acuerdo as id,
                    ot.Titulo as titulo,
                    ot.Descripcion as descripcion,
                    CONCAT(u.Nombre, ' ', u.Apellido) as empleador,
                    al.Fecha_Inicio as fecha_inicio,
                    al.Fecha_Fin as fecha_fin,
                    al.Pago_Final as pago,
                    al.Estado as estado,
                    'Colombia' as ubicacion,
                    CASE 
                        WHEN LOWER(ot.Titulo) LIKE '%cosecha%' THEN 'Cosecha'
                        WHEN LOWER(ot.Titulo) LIKE '%siembra%' THEN 'Siembra'
                        WHEN LOWER(ot.Titulo) LIKE '%mantenimiento%' THEN 'Mantenimiento'
                        WHEN LOWER(ot.Titulo) LIKE '%recolección%' OR LOWER(ot.Titulo) LIKE '%recoleccion%' THEN 'Recolección'
                        ELSE 'Otro'
                    END as tipo,
                    c.Puntuacion as calificacion,
                    c.Comentario as comentario
                FROM 
                    Acuerdo_Laboral al
                INNER JOIN 
                    Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
                INNER JOIN 
                    Usuario u ON ot.ID_Agricultor = u.ID_Usuario
                LEFT JOIN 
                    Calificacion c ON al.ID_Acuerdo = c.ID_Acuerdo 
                    AND c.ID_Usuario_Receptor = al.ID_Trabajador
                WHERE 
                    al.ID_Trabajador = %s
                ORDER BY 
                    al.Fecha_Inicio DESC
            """
            
            cursor.execute(query, (trabajador_id,))
            resultados = cursor.fetchall()
            
            empleos = []
            for row in resultados:
                if row['fecha_fin']:
                    duracion_dias = (row['fecha_fin'] - row['fecha_inicio']).days
                    duracion = f"{duracion_dias} día{'s' if duracion_dias > 1 else ''}"
                else:
                    duracion = "En curso"
                
                empleo = {
                    'id': row['id'],
                    'titulo': row['titulo'],
                    'descripcion': row['descripcion'] if row['descripcion'] else 'Sin descripción',
                    'empleador': row['empleador'],
                    'fecha_inicio': row['fecha_inicio'].strftime('%Y-%m-%d') if row['fecha_inicio'] else None,
                    'fecha_fin': row['fecha_fin'].strftime('%Y-%m-%d') if row['fecha_fin'] else None,
                    'pago': float(row['pago']) if row['pago'] else 0,
                    'estado': row['estado'],
                    'ubicacion': row['ubicacion'],
                    'tipo': row['tipo'],
                    'duracion': duracion,
                    'calificacion': int(row['calificacion']) if row['calificacion'] else None,
                    'comentario': row['comentario'] if row['comentario'] else None
                }
                empleos.append(empleo)
            
            cursor.close()
        
        return jsonify({
            'success': True,
            'empleos': empleos,
            'total': len(empleos)
        })
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

# ============================================================
# RUTAS PARA HISTORIAL DE CONTRATACIONES (AGRICULTOR)
# ============================================================

@app.route('/api/historial_contrataciones_agricultor', methods=['GET'])
def historial_contrataciones_agricultor():
    """Historial de contrataciones para agricultores con datos de calificación"""
    try:
        agricultor_id = session.get('user_id')
        if not agricultor_id:
            return jsonify({'success': False, 'message': 'No autenticado'}), 401
        
        user_role = session.get('user_role', session.get('role'))
        if user_role != 'Agricultor':
            return jsonify({'success': False, 'message': 'Solo agricultores'}), 403
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
            SELECT 
                a.ID_Acuerdo as id,
                a.ID_Acuerdo as id_acuerdo,
                a.ID_Trabajador as id_trabajador,
                CONCAT(t.Nombre, ' ', t.Apellido) as nombre_trabajador,
                t.Correo as email_trabajador,
                t.Telefono as telefono_trabajador,
                t.URL_Foto as foto_trabajador,
                o.Titulo as titulo_oferta,
                o.ID_Oferta as id_oferta,
                a.Fecha_Inicio as fecha_inicio,
                a.Fecha_Fin as fecha_fin,
                a.Pago_Final as pago_final,
                a.Estado as estado,
                DATEDIFF(COALESCE(a.Fecha_Fin, NOW()), a.Fecha_Inicio) as duracion_dias,
                c.Puntuacion as calificacion_dada,
                c.Comentario as comentario_calificacion,
                -- Calificación promedio del trabajador (para referencia)
                (SELECT AVG(CAST(c2.Puntuacion AS UNSIGNED)) 
                 FROM Calificacion c2 
                 WHERE c2.ID_Usuario_Receptor = t.ID_Usuario) as calificacion_trabajador,
                -- Total de trabajos completados por el trabajador
                (SELECT COUNT(*) 
                 FROM Acuerdo_Laboral al2 
                 WHERE al2.ID_Trabajador = t.ID_Usuario 
                 AND al2.Estado = 'Finalizado') as trabajos_completados
            FROM Acuerdo_Laboral a
            INNER JOIN Oferta_Trabajo o ON a.ID_Oferta = o.ID_Oferta
            INNER JOIN Usuario t ON a.ID_Trabajador = t.ID_Usuario
            LEFT JOIN Calificacion c ON a.ID_Acuerdo = c.ID_Acuerdo 
                AND c.ID_Usuario_Emisor = %s
            WHERE o.ID_Agricultor = %s
            ORDER BY a.Fecha_Inicio DESC
        """
        
        cursor.execute(query, (agricultor_id, agricultor_id))
        contrataciones = cursor.fetchall()
        
        # Formatear datos
        contrataciones_formateadas = []
        for cont in contrataciones:
            # Calcular duración legible
            dias = cont['duracion_dias'] or 0
            if dias == 0:
                duracion = "Menos de 1 día"
            elif dias == 1:
                duracion = "1 día"
            else:
                duracion = f"{dias} días"
            
            # Estado legible
            estado_map = {
                'Activo': 'En curso',
                'Finalizado': 'Completado',
                'Cancelado': 'Cancelado'
            }
            estado = estado_map.get(cont['estado'], cont['estado'])
            
            cont_data = {
                'id': cont['id'],
                'id_acuerdo': cont['id_acuerdo'],
                'id_trabajador': cont['id_trabajador'],
                'nombre_trabajador': cont['nombre_trabajador'],
                'email_trabajador': cont['email_trabajador'],
                'telefono_trabajador': cont['telefono_trabajador'] or 'No disponible',
                'foto_trabajador': cont['foto_trabajador'],
                'titulo_oferta': cont['titulo_oferta'],
                'id_oferta': cont['id_oferta'],
                'fecha_inicio': cont['fecha_inicio'].strftime('%Y-%m-%d') if cont['fecha_inicio'] else None,
                'fecha_fin': cont['fecha_fin'].strftime('%Y-%m-%d') if cont['fecha_fin'] else None,
                'duracion': duracion,
                'pago_final': float(cont['pago_final']) if cont['pago_final'] else 0,
                'estado': estado,
                'calificacion_dada': int(cont['calificacion_dada']) if cont['calificacion_dada'] else None,
                'comentario_calificacion': cont['comentario_calificacion'],
                # Datos adicionales del trabajador
                'calificacion_trabajador': round(float(cont['calificacion_trabajador']), 1) if cont['calificacion_trabajador'] else 0.0,
                'trabajos_completados': cont['trabajos_completados'] or 0
            }
            contrataciones_formateadas.append(cont_data)
        
        cursor.close()
        conn.close()
        
        print(f"✅ Historial contrataciones: {len(contrataciones_formateadas)} para agricultor {agricultor_id}")
        
        return jsonify({
            'success': True,
            'contrataciones': contrataciones_formateadas,
            'total': len(contrataciones_formateadas)
        })
        
    except Exception as e:
        print(f"❌ Error en historial_contrataciones_agricultor: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


print("✅ Endpoint de historial de contrataciones actualizado con datos de calificación")

# ============================================================
# RUTA AUXILIAR: OBTENER ESTADÍSTICAS DEL TRABAJADOR
# ============================================================

@app.route('/api/historial_stats_trabajador', methods=['GET'])
def historial_stats_trabajador():
    """Obtener estadísticas detalladas del trabajador para historial"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'No autenticado'}), 401
    
    trabajador_id = session['user_id']
    
    try:
        cursor = mysql.connection.cursor()
        
        # Trabajos completados
        cursor.execute("""
            SELECT COUNT(*) 
            FROM Acuerdo_Laboral 
            WHERE ID_Trabajador = %s AND Estado = 'Finalizado'
        """, (trabajador_id,))
        trabajos_completados = cursor.fetchone()[0]
        
        # Horas trabajadas (estimado)
        cursor.execute("""
            SELECT COALESCE(SUM(DATEDIFF(Fecha_Fin, Fecha_Inicio) * 8), 0)
            FROM Acuerdo_Laboral
            WHERE ID_Trabajador = %s AND Estado = 'Finalizado'
        """, (trabajador_id,))
        horas_trabajadas = cursor.fetchone()[0]
        
        # Calificación promedio
        cursor.execute("""
            SELECT COALESCE(AVG(CAST(Puntuacion AS DECIMAL)), 0)
            FROM Calificacion
            WHERE ID_Usuario_Receptor = %s
        """, (trabajador_id,))
        calificacion_promedio = float(cursor.fetchone()[0])
        
        # Ingresos totales
        cursor.execute("""
            SELECT COALESCE(SUM(Pago_Final), 0)
            FROM Acuerdo_Laboral
            WHERE ID_Trabajador = %s AND Estado = 'Finalizado'
        """, (trabajador_id,))
        ingresos_totales = float(cursor.fetchone()[0])
        
        cursor.close()
        
        return jsonify({
            'success': True,
            'estadisticas': {
                'trabajos_completados': trabajos_completados,
                'horas_trabajadas': horas_trabajadas,
                'calificacion_promedio': round(calificacion_promedio, 1),
                'ingresos_totales': ingresos_totales
            }
        })
        
    except Exception as e:
        print(f"Error en historial_stats_trabajador: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


# ============================================================
# RUTA AUXILIAR: OBTENER ESTADÍSTICAS DEL AGRICULTOR
# ============================================================

@app.route('/api/historial_stats_agricultor', methods=['GET'])
def historial_stats_agricultor():
    """Obtener estadísticas detalladas del agricultor para historial"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'No autenticado'}), 401
    
    agricultor_id = session['user_id']
    
    try:
        cursor = mysql.connection.cursor()
        
        # Total de contrataciones
        cursor.execute("""
            SELECT COUNT(DISTINCT al.ID_Acuerdo)
            FROM Acuerdo_Laboral al
            INNER JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
            WHERE ot.ID_Agricultor = %s
        """, (agricultor_id,))
        total_contrataciones = cursor.fetchone()[0]
        
        # Contrataciones activas
        cursor.execute("""
            SELECT COUNT(DISTINCT al.ID_Acuerdo)
            FROM Acuerdo_Laboral al
            INNER JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
            WHERE ot.ID_Agricultor = %s AND al.Estado = 'Activo'
        """, (agricultor_id,))
        contrataciones_activas = cursor.fetchone()[0]
        
        # Calificación promedio dada
        cursor.execute("""
            SELECT COALESCE(AVG(CAST(c.Puntuacion AS DECIMAL)), 0)
            FROM Calificacion c
            WHERE c.ID_Usuario_Emisor = %s
        """, (agricultor_id,))
        calificacion_promedio = float(cursor.fetchone()[0])
        
        # Total invertido
        cursor.execute("""
            SELECT COALESCE(SUM(al.Pago_Final), 0)
            FROM Acuerdo_Laboral al
            INNER JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
            WHERE ot.ID_Agricultor = %s
        """, (agricultor_id,))
        total_invertido = float(cursor.fetchone()[0])
        
        cursor.close()
        
        return jsonify({
            'success': True,
            'estadisticas': {
                'total_contrataciones': total_contrataciones,
                'contrataciones_activas': contrataciones_activas,
                'calificacion_promedio': round(calificacion_promedio, 1),
                'total_invertido': total_invertido
            }
        })
        
    except Exception as e:
        print(f"Error en historial_stats_agricultor: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


# ====================== OBTENER HABILIDADES ======================
@app.route('/api/get_worker_skills/<int:worker_id>', methods=['GET'])
def get_worker_skills(worker_id):
    """Obtener habilidades de un trabajador"""
    try:
        cursor = mysql.connection.cursor()
        
        query = """
        SELECT 
            ID_Habilidad,
            Nombre,
            Clasificacion,
            Nivel,
            Anos_Experiencia
        FROM Habilidad
        WHERE ID_Trabajador = %s
        ORDER BY Nivel DESC, Anos_Experiencia DESC
        """
        
        cursor.execute(query, (worker_id,))
        skills = cursor.fetchall()
        cursor.close()
        
        skills_list = []
        for skill in skills:
            skills_list.append({
                'id': skill[0],
                'nombre': skill[1],
                'clasificacion': skill[2],
                'nivel': skill[3],
                'anos_experiencia': skill[4]
            })
        
        return jsonify({
            'success': True,
            'skills': skills_list,
            'total': len(skills_list)
        })
        
    except Exception as e:
        print(f"Error obteniendo habilidades: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


# ====================== AGREGAR HABILIDAD ======================
# ================================================================
# SOLO REEMPLAZA LAS FUNCIONES CONFLICTIVAS
# ================================================================

# REEMPLAZAR la función add_skill existente con esta:
@app.route('/api/add_skill', methods=['POST'])
@require_login
def add_skill():
    """Agregar nueva habilidad del trabajador"""
    try:
        data = request.get_json()
        user_id = session['user_id']
        
        # Obtener datos
        nombre = data.get('nombre', '').strip()
        clasificacion = data.get('clasificacion', '').strip()
        nivel = data.get('nivel', 'Intermedio')
        anos_experiencia = int(data.get('anos_experiencia', 0))
        
        # Validaciones
        if not nombre:
            return jsonify({'success': False, 'message': 'El nombre de la habilidad es requerido'}), 400
        
        if not clasificacion:
            return jsonify({'success': False, 'message': 'La clasificación es requerida'}), 400
        
        # Clasificaciones válidas
        clasificaciones_validas = [
            'Técnica agrícola', 'Manejo de maquinaria', 'Especializada', 'Logística',
            'Control de plagas', 'Riego y drenaje', 'Cosecha y poscosecha',
            'Fertilización', 'Preparación de suelo', 'Transporte y distribución'
        ]
        
        if clasificacion not in clasificaciones_validas:
            return jsonify({'success': False, 'message': 'Clasificación no válida'}), 400
        
        # Niveles válidos
        niveles_validos = ['Básico', 'Intermedio', 'Avanzado', 'Experto']
        if nivel not in niveles_validos:
            nivel = 'Intermedio'
        
        # Validar años de experiencia
        if anos_experiencia < 0 or anos_experiencia > 50:
            anos_experiencia = 0
        
        print(f"📝 Agregando habilidad para usuario {user_id}:")
        print(f"   Nombre: {nombre}")
        print(f"   Clasificación: {clasificacion}")
        print(f"   Nivel: {nivel}")
        print(f"   Años: {anos_experiencia}")
        
        # Insertar en tabla Habilidad
        skill_id = execute_query("""
            INSERT INTO Habilidad (ID_Trabajador, Nombre, Clasificacion, Nivel, Anos_Experiencia)
            VALUES (%s, %s, %s, %s, %s)
        """, (user_id, nombre, clasificacion, nivel, anos_experiencia))
        
        print(f"✅ Habilidad insertada con ID: {skill_id}")
        
        return jsonify({
            'success': True,
            'message': 'Habilidad agregada correctamente',
            'skill_id': skill_id,
            'skill_data': {
                'id': skill_id,
                'nombre': nombre,
                'clasificacion': clasificacion,
                'nivel': nivel,
                'anos_experiencia': anos_experiencia
            }
        })
        
    except Exception as e:
        print(f"❌ Error agregando habilidad: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500


# ====================== ELIMINAR HABILIDAD ======================
@app.route('/api/delete_skill/<int:skill_id>', methods=['DELETE'])
def delete_skill(skill_id):
    """Eliminar una habilidad del perfil"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'No autenticado'}), 401
    
    try:
        user_id = session['user_id']
        cursor = mysql.connection.cursor()
        
        # Verificar que la habilidad pertenezca al usuario
        cursor.execute("""
            SELECT ID_Habilidad FROM Habilidad 
            WHERE ID_Habilidad = %s AND ID_Trabajador = %s
        """, (skill_id, user_id))
        
        if not cursor.fetchone():
            cursor.close()
            return jsonify({
                'success': False,
                'message': 'Habilidad no encontrada o no autorizado'
            }), 404
        
        cursor.execute("DELETE FROM Habilidad WHERE ID_Habilidad = %s", (skill_id,))
        mysql.connection.commit()
        cursor.close()
        
        return jsonify({
            'success': True,
            'message': 'Habilidad eliminada correctamente'
        })
        
    except Exception as e:
        print(f"Error eliminando habilidad: {e}")
        mysql.connection.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


# ====================== BUSCAR TRABAJADORES ======================
@app.route('/api/search_workers_by_skills', methods=['POST'])
def search_workers_by_skills():
    """Buscar trabajadores por habilidades"""
    try:
        data = request.get_json()
        skill_name = data.get('skill_name', '')
        clasificacion = data.get('clasificacion', '')
        nivel_minimo = data.get('nivel_minimo', '')
        
        cursor = mysql.connection.cursor()
        
        query = """
        SELECT DISTINCT
            u.ID_Usuario,
            CONCAT(u.Nombre, ' ', u.Apellido) as Nombre_Completo,
            u.Telefono,
            u.Correo,
            u.URL_Foto,
            h.Nombre as Habilidad,
            h.Clasificacion,
            h.Nivel,
            h.Anos_Experiencia,
            (SELECT COUNT(*) FROM Acuerdo_Laboral al 
             WHERE al.ID_Trabajador = u.ID_Usuario AND al.Estado = 'Finalizado') as Trabajos_Completados,
            (SELECT AVG(CAST(c.Puntuacion AS UNSIGNED)) 
             FROM Calificacion c 
             WHERE c.ID_Usuario_Receptor = u.ID_Usuario) as Calificacion_Promedio
        FROM Usuario u
        INNER JOIN Habilidad h ON u.ID_Usuario = h.ID_Trabajador
        WHERE u.Rol = 'Trabajador' 
        AND u.Estado = 'Activo'
        """
        
        params = []
        
        if skill_name:
            query += " AND h.Nombre LIKE %s"
            params.append(f"%{skill_name}%")
        
        if clasificacion:
            query += " AND h.Clasificacion = %s"
            params.append(clasificacion)
        
        if nivel_minimo:
            niveles = ['Básico', 'Intermedio', 'Avanzado', 'Experto']
            if nivel_minimo in niveles:
                idx = niveles.index(nivel_minimo)
                niveles_permitidos = niveles[idx:]
                placeholders = ','.join(['%s'] * len(niveles_permitidos))
                query += f" AND h.Nivel IN ({placeholders})"
                params.extend(niveles_permitidos)
        
        query += " ORDER BY h.Nivel DESC, h.Anos_Experiencia DESC"
        
        cursor.execute(query, params)
        workers = cursor.fetchall()
        cursor.close()
        
        workers_list = []
        for worker in workers:
            workers_list.append({
                'id': worker[0],
                'nombre': worker[1],
                'telefono': worker[2],
                'email': worker[3],
                'foto': worker[4],
                'habilidad': worker[5],
                'clasificacion': worker[6],
                'nivel': worker[7],
                'experiencia': worker[8],
                'trabajos_completados': worker[9] or 0,
                'calificacion': float(worker[10]) if worker[10] else 0.0
            })
        
        return jsonify({
            'success': True,
            'workers': workers_list,
            'total': len(workers_list)
        })
        
    except Exception as e:
        print(f"Error buscando trabajadores: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


print("✅ Endpoints de habilidades cargados correctamente")

# ================================================================
# RUTA PARA FINALIZAR ACUERDO LABORAL
# ================================================================

@app.route('/api/finalizar_acuerdo/<int:acuerdo_id>', methods=['PUT'])
def finalizar_acuerdo(acuerdo_id):
    """Finalizar un acuerdo laboral y cerrar oferta si ya no hay acuerdos activos"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'No autenticado'}), 401
    
    try:
        cursor = mysql.connection.cursor()
        
        # Obtener información del acuerdo
        cursor.execute("""
            SELECT al.ID_Oferta, ot.ID_Agricultor, al.Estado
            FROM Acuerdo_Laboral al
            INNER JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
            WHERE al.ID_Acuerdo = %s
        """, (acuerdo_id,))
        
        acuerdo = cursor.fetchone()
        
        if not acuerdo:
            cursor.close()
            return jsonify({'success': False, 'message': 'Acuerdo no encontrado'}), 404
        
        oferta_id = acuerdo[0]
        agricultor_id = acuerdo[1]
        estado_actual = acuerdo[2]
        
        # Verificar que el agricultor es el dueño
        if agricultor_id != session['user_id']:
            cursor.close()
            return jsonify({'success': False, 'message': 'No autorizado'}), 403
        
        # Verificar que no esté ya finalizado
        if estado_actual == 'Finalizado':
            cursor.close()
            return jsonify({'success': False, 'message': 'El acuerdo ya está finalizado'}), 400
        
        # Finalizar acuerdo
        fecha_fin = datetime.now().date()
        cursor.execute("""
            UPDATE Acuerdo_Laboral 
            SET Estado = 'Finalizado', Fecha_Fin = %s
            WHERE ID_Acuerdo = %s
        """, (fecha_fin, acuerdo_id))
        
        print(f"✅ Acuerdo {acuerdo_id} finalizado")
        
        # Verificar si hay más acuerdos activos para esta oferta
        cursor.execute("""
            SELECT COUNT(*) 
            FROM Acuerdo_Laboral 
            WHERE ID_Oferta = %s AND Estado = 'Activo'
        """, (oferta_id,))
        
        acuerdos_activos = cursor.fetchone()[0]
        
        # Si no hay más acuerdos activos, cerrar la oferta
        if acuerdos_activos == 0:
            cursor.execute("""
                UPDATE Oferta_Trabajo 
                SET Estado = 'Cerrada' 
                WHERE ID_Oferta = %s
            """, (oferta_id,))
            print(f"✅ Oferta {oferta_id} cerrada automáticamente (no hay más acuerdos activos)")
        
        mysql.connection.commit()
        cursor.close()
        
        return jsonify({
            'success': True, 
            'message': 'Acuerdo finalizado exitosamente',
            'oferta_cerrada': acuerdos_activos == 0
        })
        
    except Exception as e:
        print(f"❌ Error en finalizar_acuerdo: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


# ================================================================
# RUTA PARA CANCELAR ACUERDO LABORAL
# ================================================================

@app.route('/api/cancelar_acuerdo/<int:acuerdo_id>', methods=['PUT'])
def cancelar_acuerdo(acuerdo_id):
    """Cancelar un acuerdo laboral"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'No autenticado'}), 401
    
    data = request.get_json()
    motivo = data.get('motivo', '')
    
    try:
        cursor = mysql.connection.cursor()
        
        # Obtener información del acuerdo
        cursor.execute("""
            SELECT al.ID_Oferta, ot.ID_Agricultor, al.ID_Trabajador, al.Estado
            FROM Acuerdo_Laboral al
            INNER JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
            WHERE al.ID_Acuerdo = %s
        """, (acuerdo_id,))
        
        acuerdo = cursor.fetchone()
        
        if not acuerdo:
            cursor.close()
            return jsonify({'success': False, 'message': 'Acuerdo no encontrado'}), 404
        
        oferta_id = acuerdo[0]
        agricultor_id = acuerdo[1]
        trabajador_id = acuerdo[2]
        estado_actual = acuerdo[3]
        
        # Verificar autorización (agricultor o trabajador)
        if session['user_id'] not in [agricultor_id, trabajador_id]:
            cursor.close()
            return jsonify({'success': False, 'message': 'No autorizado'}), 403
        
        # Verificar que esté activo
        if estado_actual != 'Activo':
            cursor.close()
            return jsonify({'success': False, 'message': 'Solo se pueden cancelar acuerdos activos'}), 400
        
        # Cancelar acuerdo
        cursor.execute("""
            UPDATE Acuerdo_Laboral 
            SET Estado = 'Cancelado', Fecha_Fin = %s
            WHERE ID_Acuerdo = %s
        """, (datetime.now().date(), acuerdo_id))
        
        print(f"⚠️ Acuerdo {acuerdo_id} cancelado. Motivo: {motivo}")
        
        mysql.connection.commit()
        cursor.close()
        
        return jsonify({
            'success': True, 
            'message': 'Acuerdo cancelado exitosamente'
        })
        
    except Exception as e:
        print(f"❌ Error en cancelar_acuerdo: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


# ================================================================
# RUTA PARA OBTENER DETALLES DE UN ACUERDO LABORAL
# ================================================================

@app.route('/api/get_acuerdo/<int:acuerdo_id>', methods=['GET'])
def get_acuerdo(acuerdo_id):
    """Obtener detalles de un acuerdo laboral específico"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'No autenticado'}), 401
    
    try:
        cursor = mysql.connection.cursor()
        
        cursor.execute("""
            SELECT 
                al.ID_Acuerdo,
                al.Fecha_Inicio,
                al.Fecha_Fin,
                al.Pago_Final,
                al.Estado,
                ot.Titulo as titulo_oferta,
                ot.Descripcion as descripcion_oferta,
                CONCAT(ut.Nombre, ' ', ut.Apellido) as nombre_trabajador,
                ut.Telefono as telefono_trabajador,
                ut.Correo as email_trabajador,
                CONCAT(ua.Nombre, ' ', ua.Apellido) as nombre_agricultor,
                ua.Telefono as telefono_agricultor,
                c.Puntuacion as calificacion,
                c.Comentario as comentario_calificacion
            FROM Acuerdo_Laboral al
            INNER JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
            INNER JOIN Usuario ut ON al.ID_Trabajador = ut.ID_Usuario
            INNER JOIN Usuario ua ON ot.ID_Agricultor = ua.ID_Usuario
            LEFT JOIN Calificacion c ON al.ID_Acuerdo = c.ID_Acuerdo
            WHERE al.ID_Acuerdo = %s
        """, (acuerdo_id,))
        
        acuerdo = cursor.fetchone()
        cursor.close()
        
        if not acuerdo:
            return jsonify({'success': False, 'message': 'Acuerdo no encontrado'}), 404
        
        # Calcular duración
        if acuerdo[2]:  # Tiene fecha_fin
            duracion_dias = (acuerdo[2] - acuerdo[1]).days
            duracion = f"{duracion_dias} día{'s' if duracion_dias > 1 else ''}"
        else:
            duracion = "En curso"
        
        resultado = {
            'id': acuerdo[0],
            'fecha_inicio': acuerdo[1].strftime('%Y-%m-%d') if acuerdo[1] else None,
            'fecha_fin': acuerdo[2].strftime('%Y-%m-%d') if acuerdo[2] else None,
            'duracion': duracion,
            'pago_final': float(acuerdo[3]) if acuerdo[3] else 0,
            'estado': acuerdo[4],
            'titulo_oferta': acuerdo[5],
            'descripcion_oferta': acuerdo[6],
            'nombre_trabajador': acuerdo[7],
            'telefono_trabajador': acuerdo[8],
            'email_trabajador': acuerdo[9],
            'nombre_agricultor': acuerdo[10],
            'telefono_agricultor': acuerdo[11],
            'calificacion': int(acuerdo[12]) if acuerdo[12] else None,
            'comentario_calificacion': acuerdo[13] if acuerdo[13] else None
        }
        
        return jsonify({
            'success': True,
            'acuerdo': resultado
        })
        
    except Exception as e:
        print(f"❌ Error en get_acuerdo: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


# ================================================================
# RUTA PARA ACTUALIZAR PAGO DE UN ACUERDO
# ================================================================

@app.route('/api/actualizar_pago_acuerdo/<int:acuerdo_id>', methods=['PUT'])
def actualizar_pago_acuerdo(acuerdo_id):
    """Actualizar el pago final de un acuerdo laboral"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'No autenticado'}), 401
    
    data = request.get_json()
    nuevo_pago = data.get('pago_final')
    
    if not nuevo_pago or float(nuevo_pago) <= 0:
        return jsonify({'success': False, 'message': 'Pago inválido'}), 400
    
    try:
        cursor = mysql.connection.cursor()
        
        # Verificar que el agricultor es el dueño
        cursor.execute("""
            SELECT ot.ID_Agricultor 
            FROM Acuerdo_Laboral al
            INNER JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
            WHERE al.ID_Acuerdo = %s
        """, (acuerdo_id,))
        
        result = cursor.fetchone()
        
        if not result or result[0] != session['user_id']:
            cursor.close()
            return jsonify({'success': False, 'message': 'No autorizado'}), 403
        
        # Actualizar pago
        cursor.execute("""
            UPDATE Acuerdo_Laboral 
            SET Pago_Final = %s
            WHERE ID_Acuerdo = %s
        """, (nuevo_pago, acuerdo_id))
        
        mysql.connection.commit()
        cursor.close()
        
        return jsonify({
            'success': True,
            'message': 'Pago actualizado exitosamente'
        })
        
    except Exception as e:
        print(f"❌ Error en actualizar_pago_acuerdo: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# ================================================================
# ENDPOINTS PARA HISTORIAL DE EMPLEOS (TRABAJADOR)
# Agregar estos endpoints a tu app.py
# ================================================================

@app.route('/api/historial_empleos_trabajador', methods=['GET'])
@require_login
def get_historial_empleos_trabajador():
    """Obtener historial completo de empleos del trabajador"""
    try:
        user_id = session['user_id']
        user_role = session.get('user_role')
        
        if user_role != 'Trabajador':
            return jsonify({
                'success': False,
                'message': 'Solo los trabajadores pueden ver este historial'
            }), 403
        
        # Consulta para obtener historial de empleos
        empleos = execute_query("""
            SELECT 
                al.ID_Acuerdo as id,
                ot.Titulo as titulo,
                ot.Descripcion as descripcion,
                CONCAT(u.Nombre, ' ', u.Apellido) as empleador,
                u.Correo as email_empleador,
                u.Telefono as telefono_empleador,
                u.ID_Usuario as empleador_id,
                al.Fecha_Inicio as fecha_inicio,
                al.Fecha_Fin as fecha_fin,
                al.Pago_Final as pago,
                al.Estado as estado,
                COALESCE(pr.Nombre_Finca, 'No especificada') as ubicacion,
                c.Puntuacion as calificacion,
                c.Comentario as comentario,
                DATEDIFF(COALESCE(al.Fecha_Fin, CURDATE()), al.Fecha_Inicio) as dias_trabajados
            FROM Acuerdo_Laboral al
            INNER JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
            INNER JOIN Usuario u ON ot.ID_Agricultor = u.ID_Usuario
            LEFT JOIN Predio pr ON u.ID_Usuario = pr.ID_Usuario
            LEFT JOIN Calificacion c ON al.ID_Acuerdo = c.ID_Acuerdo 
                AND c.ID_Usuario_Receptor = %s
            WHERE al.ID_Trabajador = %s
            ORDER BY al.Fecha_Inicio DESC
        """, (user_id, user_id))
        
        empleos_list = []
        if empleos:
            for empleo in empleos:
                # Determinar tipo de trabajo según descripción
                descripcion_lower = (empleo['descripcion'] or '').lower()
                if 'cosecha' in descripcion_lower or 'recolección' in descripcion_lower:
                    tipo = 'Cosecha'
                elif 'siembra' in descripcion_lower:
                    tipo = 'Siembra'
                elif 'mantenimiento' in descripcion_lower or 'poda' in descripcion_lower:
                    tipo = 'Mantenimiento'
                elif 'recolección' in descripcion_lower:
                    tipo = 'Recolección'
                else:
                    tipo = 'Otro'
                
                # Calcular duración en formato legible
                dias = empleo['dias_trabajados'] or 0
                if dias == 0:
                    duracion = 'Menos de 1 día'
                elif dias == 1:
                    duracion = '1 día'
                else:
                    duracion = f'{dias} días'
                
                # Mapear estado
                estado_map = {
                    'Activo': 'En curso',
                    'Finalizado': 'Completado',
                    'Cancelado': 'Cancelado'
                }
                estado = estado_map.get(empleo['estado'], empleo['estado'])
                
                empleo_data = {
                    'id': empleo['id'],
                    'titulo': empleo['titulo'],
                    'descripcion': empleo['descripcion'],
                    'empleador': empleo['empleador'],
                    'email_empleador': empleo['email_empleador'],
                    'telefono_empleador': empleo['telefono_empleador'],
                    'empleador_id': empleo['empleador_id'],
                    'fecha_inicio': empleo['fecha_inicio'].isoformat() if empleo['fecha_inicio'] else None,
                    'fecha_fin': empleo['fecha_fin'].isoformat() if empleo['fecha_fin'] else None,
                    'duracion': duracion,
                    'pago': float(empleo['pago']) if empleo['pago'] else 0,
                    'ubicacion': empleo['ubicacion'],
                    'estado': estado,
                    'tipo': tipo,
                    'calificacion': int(empleo['calificacion']) if empleo['calificacion'] else None,
                    'comentario': empleo['comentario']
                }
                empleos_list.append(empleo_data)
        
        return jsonify({
            'success': True,
            'empleos': empleos_list,
            'total': len(empleos_list)
        })
        
    except Exception as e:
        print(f"Error obteniendo historial de empleos: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Error interno: {str(e)}'
        }), 500


# ================================================================
# ENDPOINTS PARA HISTORIAL DE CONTRATACIONES (AGRICULTOR)
# ================================================================

@app.route('/api/historial_contrataciones_agricultor', methods=['GET'])
@require_login
def get_historial_contrataciones_agricultor():
    """Obtener historial completo de contrataciones del agricultor"""
    try:
        user_id = session['user_id']
        user_role = session.get('user_role')
        
        if user_role != 'Agricultor':
            return jsonify({
                'success': False,
                'message': 'Solo los agricultores pueden ver este historial'
            }), 403
        
        # Consulta para obtener historial de contrataciones
        contrataciones = execute_query("""
            SELECT 
                al.ID_Acuerdo as id,
                ot.Titulo as titulo_oferta,
                ot.Descripcion as descripcion_oferta,
                CONCAT(u.Nombre, ' ', u.Apellido) as nombre_trabajador,
                u.Correo as email_trabajador,
                u.Telefono as telefono_trabajador,
                u.URL_Foto as foto_trabajador,
                u.ID_Usuario as trabajador_id,
                al.Fecha_Inicio as fecha_inicio,
                al.Fecha_Fin as fecha_fin,
                al.Pago_Final as pago_final,
                al.Estado as estado,
                c.Puntuacion as calificacion_dada,
                c.Comentario as comentario_calificacion,
                DATEDIFF(COALESCE(al.Fecha_Fin, CURDATE()), al.Fecha_Inicio) as dias_trabajados
            FROM Acuerdo_Laboral al
            INNER JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
            INNER JOIN Usuario u ON al.ID_Trabajador = u.ID_Usuario
            LEFT JOIN Calificacion c ON al.ID_Acuerdo = c.ID_Acuerdo 
                AND c.ID_Usuario_Emisor = %s
            WHERE ot.ID_Agricultor = %s
            ORDER BY al.Fecha_Inicio DESC
        """, (user_id, user_id))
        
        contrataciones_list = []
        if contrataciones:
            for contratacion in contrataciones:
                # Calcular duración
                dias = contratacion['dias_trabajados'] or 0
                
                # Mapear estado
                estado_map = {
                    'Activo': 'Activo',
                    'Finalizado': 'Finalizado',
                    'Cancelado': 'Cancelado'
                }
                estado = estado_map.get(contratacion['estado'], contratacion['estado'])
                
                contratacion_data = {
                    'id': contratacion['id'],
                    'titulo_oferta': contratacion['titulo_oferta'],
                    'descripcion_oferta': contratacion['descripcion_oferta'],
                    'nombre_trabajador': contratacion['nombre_trabajador'],
                    'email_trabajador': contratacion['email_trabajador'],
                    'telefono_trabajador': contratacion['telefono_trabajador'] or 'No disponible',
                    'foto_trabajador': contratacion['foto_trabajador'],
                    'trabajador_id': contratacion['trabajador_id'],
                    'fecha_inicio': contratacion['fecha_inicio'].isoformat() if contratacion['fecha_inicio'] else None,
                    'fecha_fin': contratacion['fecha_fin'].isoformat() if contratacion['fecha_fin'] else None,
                    'pago_final': float(contratacion['pago_final']) if contratacion['pago_final'] else 0,
                    'estado': estado,
                    'calificacion_dada': int(contratacion['calificacion_dada']) if contratacion['calificacion_dada'] else None,
                    'comentario_calificacion': contratacion['comentario_calificacion']
                }
                contrataciones_list.append(contratacion_data)
        
        return jsonify({
            'success': True,
            'contrataciones': contrataciones_list,
            'total': len(contrataciones_list)
        })
        
    except Exception as e:
        print(f"Error obteniendo historial de contrataciones: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Error interno: {str(e)}'
        }), 500


# ================================================================
# ENDPOINT PARA CALIFICAR TRABAJADOR
# ================================================================

@app.route('/api/calificar_trabajador', methods=['POST'])
@require_login
def calificar_trabajador():
    """Calificar a un trabajador después de finalizar un acuerdo laboral"""
    try:
        user_id = session['user_id']
        user_role = session.get('user_role')
        
        if user_role != 'Agricultor':
            return jsonify({
                'success': False,
                'message': 'Solo los agricultores pueden calificar trabajadores'
            }), 403
        
        data = request.get_json()
        contratacion_id = data.get('contratacion_id')
        puntuacion = data.get('puntuacion')
        comentario = data.get('comentario', '').strip()
        
        # Validaciones
        if not contratacion_id or not puntuacion:
            return jsonify({
                'success': False,
                'message': 'Contratación y puntuación son requeridas'
            }), 400
        
        try:
            puntuacion = int(puntuacion)
            if not (1 <= puntuacion <= 5):
                raise ValueError()
        except ValueError:
            return jsonify({
                'success': False,
                'message': 'La puntuación debe ser un número entre 1 y 5'
            }), 400
        
        # Verificar que el acuerdo existe y pertenece al agricultor
        acuerdo = execute_query("""
            SELECT 
                al.ID_Acuerdo,
                al.ID_Trabajador,
                al.Estado,
                ot.ID_Agricultor,
                CONCAT(u.Nombre, ' ', u.Apellido) as nombre_trabajador
            FROM Acuerdo_Laboral al
            INNER JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
            INNER JOIN Usuario u ON al.ID_Trabajador = u.ID_Usuario
            WHERE al.ID_Acuerdo = %s
        """, (contratacion_id,), fetch_one=True)
        
        if not acuerdo:
            return jsonify({
                'success': False,
                'message': 'Contratación no encontrada'
            }), 404
        
        if acuerdo['ID_Agricultor'] != user_id:
            return jsonify({
                'success': False,
                'message': 'No tienes permisos para calificar esta contratación'
            }), 403
        
        if acuerdo['Estado'] != 'Finalizado':
            return jsonify({
                'success': False,
                'message': 'Solo puedes calificar contrataciones finalizadas'
            }), 400
        
        # Verificar que no haya calificado ya
        calificacion_existente = execute_query("""
            SELECT ID_Calificacion 
            FROM Calificacion 
            WHERE ID_Acuerdo = %s 
            AND ID_Usuario_Emisor = %s
        """, (contratacion_id, user_id), fetch_one=True)
        
        if calificacion_existente:
            return jsonify({
                'success': False,
                'message': 'Ya has calificado este trabajo'
            }), 400
        
        # Insertar calificación
        execute_query("""
            INSERT INTO Calificacion 
            (ID_Acuerdo, ID_Usuario_Emisor, ID_Usuario_Receptor, Puntuacion, Comentario, Fecha)
            VALUES (%s, %s, %s, %s, %s, NOW())
        """, (
            contratacion_id,
            user_id,
            acuerdo['ID_Trabajador'],
            str(puntuacion),
            comentario if comentario else None
        ))
        
        print(f"Calificación registrada: {user_id} calificó a {acuerdo['ID_Trabajador']} con {puntuacion} estrellas")
        
        return jsonify({
            'success': True,
            'message': f'Calificación enviada exitosamente a {acuerdo["nombre_trabajador"]}'
        })
        
    except Exception as e:
        print(f"Error calificando trabajador: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Error interno: {str(e)}'
        }), 500


# ================================================================
# RUTAS PARA SERVIR ARCHIVOS HTML
# ================================================================

@app.route('/vista/historial-empleos.html')
def historial_empleos_page():
    """Servir página de historial de empleos"""
    try:
        if 'user_id' not in session:
            return redirect('/vista/login-trabajador.html')
        
        if session.get('user_role') != 'Trabajador':
            return redirect('/vista/index-agricultor.html')
        
        base_dir = os.path.dirname(os.path.abspath(__file__))
        vista_path = os.path.join(base_dir, '..', 'vista')
        vista_path = os.path.abspath(vista_path)
        return send_from_directory(vista_path, 'historial-empleos.html')
    except Exception as e:
        print(f"Error sirviendo historial-empleos.html: {e}")
        return "Archivo no encontrado", 404


@app.route('/vista/historial-contrataciones.html')
def historial_contrataciones_page():
    """Servir página de historial de contrataciones"""
    try:
        if 'user_id' not in session:
            return redirect('/vista/login-trabajador.html')
        
        if session.get('user_role') != 'Agricultor':
            return redirect('/vista/index-trabajador.html')
        
        base_dir = os.path.dirname(os.path.abspath(__file__))
        vista_path = os.path.join(base_dir, '..', 'vista')
        vista_path = os.path.abspath(vista_path)
        return send_from_directory(vista_path, 'historial-contrataciones.html')
    except Exception as e:
        print(f"Error sirviendo historial-contrataciones.html: {e}")
        return "Archivo no encontrado", 404


# ================================================================
# RUTAS PARA ARCHIVOS CSS
# ================================================================

@app.route('/assent/css/historial-contrataciones.css')
def historial_contrataciones_css():
    """CSS para historial de contrataciones"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        css_path = os.path.join(base_dir, '..', 'assent', 'css')
        css_path = os.path.abspath(css_path)
        response = send_from_directory(css_path, 'historial-contrataciones.css')
        response.headers['Content-Type'] = 'text/css'
        return response
    except Exception as e:
        print(f"Error sirviendo historial-contrataciones.css: {e}")
        return "CSS no encontrado", 404


# ================================================================
# RUTAS PARA ARCHIVOS JAVASCRIPT
# ================================================================

@app.route('/js/historial-contrataciones.js')
def historial_contrataciones_js():
    """JavaScript para historial de contrataciones"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        js_path = os.path.join(base_dir, '..', 'js')
        js_path = os.path.abspath(js_path)
        response = send_from_directory(js_path, 'historial-contrataciones.js')
        response.headers['Content-Type'] = 'application/javascript'
        return response
    except Exception as e:
        print(f"Error sirviendo historial-contrataciones.js: {e}")
        return "JS no encontrado", 404


print("✅ Endpoints de historial de empleos y contrataciones cargados correctamente")
print("📋 APIs disponibles:")
print("   • GET  /api/historial_empleos_trabajador")
print("   • GET  /api/historial_contrataciones_agricultor")
print("   • POST /api/calificar_trabajador")
print("   • GET  /vista/historial-empleos.html")
print("   • GET  /vista/historial-contrataciones.html")


# ================================================================
# RUTA PARA LA PÁGINA DE BÚSQUEDA DE TRABAJADORES
# ================================================================

@app.route('/vista/buscar-trabajadores.html')
def buscar_trabajadores_html():
    """Página de búsqueda de trabajadores"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        vista_path = os.path.join(base_dir, '..', 'vista')
        vista_path = os.path.abspath(vista_path)
        return send_from_directory(vista_path, 'buscar-trabajadores.html')
    except Exception as e:
        print(f"Error sirviendo buscar-trabajadores.html: {e}")
        return "Archivo no encontrado", 404

# ================================================================
# API PARA BUSCAR TRABAJADORES (PARA AGRICULTORES)
# ================================================================

@app.route('/api/buscar-trabajadores', methods=['GET'])
def buscar_trabajadores_api():
    """API para buscar trabajadores con filtros"""
    try:
        # Verificar sesión
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'message': 'Sesión no válida'
            }), 401
        
        user_id = session['user_id']
        user_role = session.get('user_role', session.get('role'))
        
        print(f"🔍 Búsqueda de trabajadores por usuario {user_id} - Rol: {user_role}")
        
        # Solo agricultores pueden buscar trabajadores
        if user_role != 'Agricultor':
            return jsonify({
                'success': False,
                'message': 'Solo los agricultores pueden buscar trabajadores'
            }), 403
        
        # Obtener filtros
        habilidad = request.args.get('habilidad', '').strip()
        ubicacion = request.args.get('ubicacion', '').strip()
        experiencia_min = int(request.args.get('experiencia_min', '0'))
        calificacion_min = float(request.args.get('calificacion_min', '0'))
        
        print(f"Filtros: habilidad={habilidad}, ubicacion={ubicacion}, exp={experiencia_min}, cal={calificacion_min}")
        
        # Query base para obtener trabajadores
        query = """
            SELECT 
                u.ID_Usuario as id,
                CONCAT(u.Nombre, ' ', u.Apellido) as nombre,
                u.Correo as correo,
                u.Telefono as telefono,
                u.Estado as estado
            FROM Usuario u
            WHERE u.Rol = 'Trabajador' AND u.Estado = 'Activo'
            ORDER BY u.Fecha_Registro DESC
            LIMIT 100
        """
        
        trabajadores = execute_query(query)
        
        print(f"✅ Encontrados {len(trabajadores) if trabajadores else 0} trabajadores iniciales")
        
        trabajadores_list = []
        
        if trabajadores:
            for trabajador in trabajadores:
                # Obtener ubicación desde experiencias
                ubicacion_trabajador = execute_query("""
                    SELECT Ubicacion 
                    FROM Experiencia 
                    WHERE ID_Trabajador = %s 
                    ORDER BY Fecha_Inicio DESC 
                    LIMIT 1
                """, (trabajador['id'],), fetch_one=True)
                
                ubicacion_final = ubicacion_trabajador['Ubicacion'] if ubicacion_trabajador else 'Colombia'
                
                # Filtrar por ubicación si se especificó
                if ubicacion and ubicacion.lower() not in ubicacion_final.lower():
                    continue
                
                # Obtener habilidades
                habilidades = execute_query("""
                    SELECT Nombre, Clasificacion, Nivel, Anos_Experiencia
                    FROM Habilidad 
                    WHERE ID_Trabajador = %s
                    ORDER BY Anos_Experiencia DESC
                """, (trabajador['id'],))
                
                # Filtrar por habilidad si se especificó
                if habilidad:
                    if not habilidades:
                        continue
                    habilidades_match = [h for h in habilidades 
                                       if habilidad.lower() in h['Nombre'].lower()]
                    if not habilidades_match:
                        continue
                
                # Calcular años de experiencia máximos
                anos_exp = 0
                if habilidades:
                    anos_exp = max([h['Anos_Experiencia'] or 0 for h in habilidades])
                
                # Filtrar por experiencia mínima
                if experiencia_min > 0 and anos_exp < experiencia_min:
                    continue
                
                # Obtener calificación promedio
                calificacion_data = execute_query("""
                    SELECT AVG(CAST(Puntuacion AS DECIMAL)) as promedio
                    FROM Calificacion 
                    WHERE ID_Usuario_Receptor = %s
                """, (trabajador['id'],), fetch_one=True)
                
                calificacion = 4.0  # Por defecto
                if calificacion_data and calificacion_data['promedio']:
                    calificacion = float(calificacion_data['promedio'])
                
                # Filtrar por calificación mínima
                if calificacion_min > 0 and calificacion < calificacion_min:
                    continue
                
                # Obtener trabajos completados
                trabajos = execute_query("""
                    SELECT COUNT(*) as total
                    FROM Acuerdo_Laboral 
                    WHERE ID_Trabajador = %s AND Estado = 'Finalizado'
                """, (trabajador['id'],), fetch_one=True)
                
                trabajos_completados = trabajos['total'] if trabajos else 0
                
                trabajador_data = {
                    'id': trabajador['id'],
                    'nombre': trabajador['nombre'],
                    'correo': trabajador['correo'],
                    'telefono': trabajador['telefono'] or 'No disponible',
                    'ubicacion': ubicacion_final,
                    'anos_experiencia': anos_exp,
                    'calificacion': round(calificacion, 1),
                    'trabajos_completados': trabajos_completados,
                    'habilidades': habilidades or []
                }
                
                trabajadores_list.append(trabajador_data)
        
        print(f"✅ Retornando {len(trabajadores_list)} trabajadores después de filtros")
        
        return jsonify({
            'success': True,
            'trabajadores': trabajadores_list,
            'total': len(trabajadores_list)
        })
        
    except Exception as e:
        print(f"❌ Error buscando trabajadores: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Error interno: {str(e)}'
        }), 500


print("✅ Rutas de búsqueda de trabajadores cargadas correctamente")

# ================================================================
# API PARA REPORTAR USUARIOS
# ================================================================

@app.route('/api/reportar-usuario', methods=['POST'])
def reportar_usuario():
    """API para reportar usuarios problemáticos"""
    try:
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'message': 'Sesión no válida'
            }), 401
        
        data = request.get_json()
        usuario_reportado = data.get('usuario_reportado')
        motivo = data.get('motivo', '').strip()
        
        if not usuario_reportado or not motivo:
            return jsonify({
                'success': False,
                'message': 'Datos incompletos'
            }), 400
        
        # Crear tabla de reportes si no existe
        execute_query("""
            CREATE TABLE IF NOT EXISTS Reporte_Usuario (
                ID_Reporte INT PRIMARY KEY AUTO_INCREMENT,
                ID_Usuario_Reportante INT NOT NULL,
                ID_Usuario_Reportado INT NOT NULL,
                Motivo TEXT NOT NULL,
                Fecha_Reporte DATETIME DEFAULT CURRENT_TIMESTAMP,
                Estado ENUM('Pendiente', 'Revisado', 'Resuelto') DEFAULT 'Pendiente',
                FOREIGN KEY (ID_Usuario_Reportante) REFERENCES Usuario(ID_Usuario),
                FOREIGN KEY (ID_Usuario_Reportado) REFERENCES Usuario(ID_Usuario)
            )
        """)
        
        # Insertar reporte
        execute_query("""
            INSERT INTO Reporte_Usuario (ID_Usuario_Reportante, ID_Usuario_Reportado, Motivo)
            VALUES (%s, %s, %s)
        """, (session['user_id'], usuario_reportado, motivo))
        
        print(f"⚠️ Usuario {session['user_id']} reportó al usuario {usuario_reportado}: {motivo}")
        
        return jsonify({
            'success': True,
            'message': 'Reporte enviado correctamente'
        })
        
    except Exception as e:
        print(f"❌ Error reportando usuario: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


print("✅ Sistema de reportes cargado correctamente")

# ================================================================
# APIs PARA EDITAR Y ELIMINAR OFERTAS (AGRICULTORES)
# ================================================================

@app.route('/api/edit_job/<int:job_id>', methods=['PUT'])
@require_login
def edit_job(job_id):
    """Editar una oferta de trabajo existente"""
    try:
        user_id = session['user_id']
        user_role = session.get('user_role', session.get('role'))
        
        print(f"🔄 Editando oferta {job_id} - Usuario: {user_id}, Rol: {user_role}")
        
        if user_role != 'Agricultor':
            return jsonify({
                'success': False,
                'message': 'Solo los agricultores pueden editar ofertas'
            }), 403
        
        # Verificar que la oferta existe y pertenece al agricultor
        oferta_actual = execute_query("""
            SELECT ID_Oferta, ID_Agricultor, Titulo, Estado 
            FROM Oferta_Trabajo 
            WHERE ID_Oferta = %s
        """, (job_id,), fetch_one=True)
        
        if not oferta_actual:
            return jsonify({
                'success': False,
                'message': 'Oferta no encontrada'
            }), 404
        
        if oferta_actual['ID_Agricultor'] != user_id:
            return jsonify({
                'success': False,
                'message': 'No tienes permisos para editar esta oferta'
            }), 403
        
        # Obtener datos del request
        data = request.get_json()
        
        titulo = data.get('titulo', '').strip()
        descripcion = data.get('descripcion', '').strip()
        pago = data.get('pago')
        ubicacion = data.get('ubicacion', '').strip()
        
        # Validaciones
        if not titulo or len(titulo) < 10:
            return jsonify({
                'success': False,
                'message': 'El título debe tener al menos 10 caracteres'
            }), 400
        
        if not descripcion or len(descripcion) < 20:
            return jsonify({
                'success': False,
                'message': 'La descripción debe tener al menos 20 caracteres'
            }), 400
        
        if not pago or int(pago) < 10000:
            return jsonify({
                'success': False,
                'message': 'El pago mínimo debe ser $10,000 COP'
            }), 400
        
        # Preparar descripción completa con ubicación
        descripcion_completa = descripcion
        if ubicacion:
            # Actualizar o agregar ubicación
            if 'Ubicación:' in descripcion_completa:
                # Reemplazar ubicación existente
                partes = descripcion_completa.split('\n\nUbicación:')
                descripcion_completa = partes[0] + f"\n\nUbicación: {ubicacion}"
            else:
                # Agregar nueva ubicación
                descripcion_completa += f"\n\nUbicación: {ubicacion}"
        
        # Actualizar en la base de datos
        execute_query("""
            UPDATE Oferta_Trabajo 
            SET Titulo = %s, Descripcion = %s, Pago_Ofrecido = %s
            WHERE ID_Oferta = %s
        """, (titulo, descripcion_completa, int(pago), job_id))
        
        print(f"✅ Oferta {job_id} actualizada exitosamente")
        
        return jsonify({
            'success': True,
            'message': f'Oferta "{titulo}" actualizada correctamente',
            'oferta': {
                'id': job_id,
                'titulo': titulo,
                'descripcion': descripcion_completa,
                'pago': int(pago),
                'ubicacion': ubicacion
            }
        })
        
    except Exception as e:
        print(f"❌ Error editando oferta: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Error interno: {str(e)}'
        }), 500


@app.route('/api/delete_job/<int:job_id>', methods=['DELETE'])
@require_login
def delete_job(job_id):
    """Eliminar una oferta de trabajo"""
    try:
        user_id = session['user_id']
        user_role = session.get('user_role', session.get('role'))
        
        print(f"🗑️ Eliminando oferta {job_id} - Usuario: {user_id}, Rol: {user_role}")
        
        if user_role != 'Agricultor':
            return jsonify({
                'success': False,
                'message': 'Solo los agricultores pueden eliminar ofertas'
            }), 403
        
        # Verificar que la oferta existe y pertenece al agricultor
        oferta = execute_query("""
            SELECT ID_Oferta, ID_Agricultor, Titulo, Estado 
            FROM Oferta_Trabajo 
            WHERE ID_Oferta = %s
        """, (job_id,), fetch_one=True)
        
        if not oferta:
            return jsonify({
                'success': False,
                'message': 'Oferta no encontrada'
            }), 404
        
        if oferta['ID_Agricultor'] != user_id:
            return jsonify({
                'success': False,
                'message': 'No tienes permisos para eliminar esta oferta'
            }), 403
        
        # Verificar si hay acuerdos laborales activos
        acuerdos_activos = execute_query("""
            SELECT COUNT(*) as total 
            FROM Acuerdo_Laboral 
            WHERE ID_Oferta = %s AND Estado = 'Activo'
        """, (job_id,), fetch_one=True)
        
        if acuerdos_activos and acuerdos_activos['total'] > 0:
            return jsonify({
                'success': False,
                'message': f'No se puede eliminar una oferta con {acuerdos_activos["total"]} contrato(s) activo(s)'
            }), 400
        
        # Eliminar primero las postulaciones
        execute_query("DELETE FROM Postulacion WHERE ID_Oferta = %s", (job_id,))
        print(f"✅ Postulaciones eliminadas para oferta {job_id}")
        
        # Eliminar acuerdos laborales finalizados/cancelados
        execute_query("DELETE FROM Acuerdo_Laboral WHERE ID_Oferta = %s", (job_id,))
        print(f"✅ Acuerdos laborales eliminados para oferta {job_id}")
        
        # Finalmente, eliminar la oferta
        execute_query("DELETE FROM Oferta_Trabajo WHERE ID_Oferta = %s", (job_id,))
        print(f"✅ Oferta {job_id} eliminada exitosamente")
        
        return jsonify({
            'success': True,
            'message': f'Oferta "{oferta["Titulo"]}" eliminada correctamente'
        })
        
    except Exception as e:
        print(f"❌ Error eliminando oferta: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Error interno: {str(e)}'
        }), 500


# ================================================================
# VERIFICACIÓN Y CIERRE AUTOMÁTICO DE OFERTAS
# ================================================================

@app.route('/api/cerrar_oferta_manual/<int:job_id>', methods=['PUT'])
@require_login
def cerrar_oferta_manual(job_id):
    """Cerrar manualmente una oferta de trabajo"""
    try:
        user_id = session['user_id']
        user_role = session.get('user_role', session.get('role'))
        
        if user_role != 'Agricultor':
            return jsonify({
                'success': False,
                'message': 'Solo los agricultores pueden cerrar ofertas'
            }), 403
        
        # Verificar que la oferta existe y pertenece al agricultor
        oferta = execute_query("""
            SELECT ID_Oferta, ID_Agricultor, Titulo, Estado 
            FROM Oferta_Trabajo 
            WHERE ID_Oferta = %s
        """, (job_id,), fetch_one=True)
        
        if not oferta:
            return jsonify({
                'success': False,
                'message': 'Oferta no encontrada'
            }), 404
        
        if oferta['ID_Agricultor'] != user_id:
            return jsonify({
                'success': False,
                'message': 'No tienes permisos para cerrar esta oferta'
            }), 403
        
        if oferta['Estado'] == 'Cerrada':
            return jsonify({
                'success': False,
                'message': 'La oferta ya está cerrada'
            }), 400
        
        # Cerrar la oferta
        execute_query("""
            UPDATE Oferta_Trabajo 
            SET Estado = 'Cerrada' 
            WHERE ID_Oferta = %s
        """, (job_id,))
        
        # Rechazar automáticamente las postulaciones pendientes
        execute_query("""
            UPDATE Postulacion 
            SET Estado = 'Rechazada' 
            WHERE ID_Oferta = %s AND Estado = 'Pendiente'
        """, (job_id,))
        
        # Finalizar acuerdos laborales activos
        execute_query("""
            UPDATE Acuerdo_Laboral 
            SET Estado = 'Finalizado', Fecha_Fin = CURDATE()
            WHERE ID_Oferta = %s AND Estado = 'Activo'
        """, (job_id,))
        
        print(f"✅ Oferta {job_id} cerrada manualmente")
        
        return jsonify({
            'success': True,
            'message': f'Oferta "{oferta["Titulo"]}" cerrada correctamente'
        })
        
    except Exception as e:
        print(f"❌ Error cerrando oferta: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/reabrir_oferta_cerrada/<int:job_id>', methods=['PUT'])
@require_login
def reabrir_oferta_cerrada(job_id):
    """Reabrir una oferta que fue cerrada"""
    try:
        user_id = session['user_id']
        user_role = session.get('user_role', session.get('role'))
        
        if user_role != 'Agricultor':
            return jsonify({
                'success': False,
                'message': 'Solo los agricultores pueden reabrir ofertas'
            }), 403
        
        # Verificar que la oferta existe y pertenece al agricultor
        oferta = execute_query("""
            SELECT ID_Oferta, ID_Agricultor, Titulo, Estado 
            FROM Oferta_Trabajo 
            WHERE ID_Oferta = %s
        """, (job_id,), fetch_one=True)
        
        if not oferta:
            return jsonify({
                'success': False,
                'message': 'Oferta no encontrada'
            }), 404
        
        if oferta['ID_Agricultor'] != user_id:
            return jsonify({
                'success': False,
                'message': 'No tienes permisos para reabrir esta oferta'
            }), 403
        
        if oferta['Estado'] != 'Cerrada':
            return jsonify({
                'success': False,
                'message': 'Solo se pueden reabrir ofertas cerradas'
            }), 400
        
        # Reabrir la oferta
        execute_query("""
            UPDATE Oferta_Trabajo 
            SET Estado = 'Abierta' 
            WHERE ID_Oferta = %s
        """, (job_id,))
        
        print(f"✅ Oferta {job_id} reabierta exitosamente")
        
        return jsonify({
            'success': True,
            'message': f'Oferta "{oferta["Titulo"]}" reabierta correctamente'
        })
        
    except Exception as e:
        print(f"❌ Error reabriendo oferta: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


# ================================================================
# ESTADÍSTICAS DE CIERRE (PARA MOSTRAR EN CONFIRMACIÓN)
# ================================================================

@app.route('/api/estadisticas_cierre/<int:job_id>', methods=['GET'])
@require_login
def estadisticas_cierre(job_id):
    """Obtener estadísticas antes de cerrar una oferta"""
    try:
        user_id = session['user_id']
        
        # Verificar propiedad
        oferta = execute_query("""
            SELECT ID_Agricultor 
            FROM Oferta_Trabajo 
            WHERE ID_Oferta = %s
        """, (job_id,), fetch_one=True)
        
        if not oferta or oferta['ID_Agricultor'] != user_id:
            return jsonify({'success': False, 'message': 'No autorizado'}), 403
        
        # Obtener estadísticas de postulaciones
        stats = execute_query("""
            SELECT 
                COUNT(CASE WHEN Estado = 'Pendiente' THEN 1 END) as pendientes,
                COUNT(CASE WHEN Estado = 'Aceptada' THEN 1 END) as aceptadas,
                COUNT(CASE WHEN Estado = 'Rechazada' THEN 1 END) as rechazadas,
                COUNT(*) as total
            FROM Postulacion
            WHERE ID_Oferta = %s
        """, (job_id,), fetch_one=True)
        
        return jsonify({
            'success': True,
            'stats': {
                'pendientes': stats['pendientes'] or 0,
                'aceptadas': stats['aceptadas'] or 0,
                'rechazadas': stats['rechazadas'] or 0,
                'total': stats['total'] or 0
            }
        })
        
    except Exception as e:
        print(f"Error obteniendo estadísticas: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


print("✅ APIs de edición y eliminación de ofertas cargadas correctamente")
print("📋 Nuevas rutas disponibles:")
print("   • PUT    /api/edit_job/<job_id>")
print("   • DELETE /api/delete_job/<job_id>")
print("   • PUT    /api/cerrar_oferta_manual/<job_id>")
print("   • PUT    /api/reabrir_oferta_cerrada/<job_id>")
print("   • GET    /api/estadisticas_cierre/<job_id>")

# ================================================================
# ENDPOINTS PARA CIERRE DE OFERTAS - CON NOMBRES ÚNICOS
# ================================================================

# ================================================================
# 1. CERRAR OFERTA MANUALMENTE (NUEVO NOMBRE)
# ================================================================

@app.route('/api/cerrar_oferta_manual_v2/<int:job_id>', methods=['PUT'])
def cerrar_oferta_manual_v2(job_id):
    """Cerrar una oferta manualmente y guardar Fecha_Fin"""
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'No autenticado'}), 401
        
        user_id = session['user_id']
        user_role = session.get('user_role', session.get('role'))
        
        print(f"🔒 Cerrando oferta {job_id} por usuario {user_id}")
        
        if user_role != 'Agricultor':
            return jsonify({'success': False, 'message': 'Solo agricultores pueden cerrar ofertas'}), 403
        
        oferta = execute_query("""
            SELECT ID_Oferta, Titulo, Estado, ID_Agricultor
            FROM Oferta_Trabajo
            WHERE ID_Oferta = %s
        """, (job_id,), fetch_one=True)
        
        if not oferta:
            return jsonify({'success': False, 'message': 'Oferta no encontrada'}), 404
        
        if oferta['ID_Agricultor'] != user_id:
            return jsonify({'success': False, 'message': 'Sin permisos'}), 403
        
        if oferta['Estado'] == 'Cerrada':
            return jsonify({'success': False, 'message': 'Ya está cerrada'}), 400
        
        # Cerrar oferta
        execute_query("UPDATE Oferta_Trabajo SET Estado = 'Cerrada' WHERE ID_Oferta = %s", (job_id,))
        
        # Rechazar pendientes
        execute_query("UPDATE Postulacion SET Estado = 'Rechazada' WHERE ID_Oferta = %s AND Estado = 'Pendiente'", (job_id,))
        
        # GUARDAR FECHA_FIN
        execute_query("""
            UPDATE Acuerdo_Laboral 
            SET Estado = 'Finalizado', Fecha_Fin = CURDATE()
            WHERE ID_Oferta = %s AND Estado = 'Activo' AND Fecha_Fin IS NULL
        """, (job_id,))
        
        print(f"✅ Oferta {job_id} cerrada con Fecha_Fin guardada")
        
        return jsonify({'success': True, 'message': f'Oferta "{oferta["Titulo"]}" cerrada exitosamente'})
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


# ================================================================
# 2. REABRIR OFERTA (NUEVO NOMBRE)
# ================================================================

@app.route('/api/reabrir_oferta_v2/<int:job_id>', methods=['PUT'])
def reabrir_oferta_v2(job_id):
    """Reabrir una oferta cerrada"""
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'No autenticado'}), 401
        
        user_id = session['user_id']
        user_role = session.get('user_role', session.get('role'))
        
        if user_role != 'Agricultor':
            return jsonify({'success': False, 'message': 'Solo agricultores'}), 403
        
        oferta = execute_query("""
            SELECT ID_Oferta, Titulo, Estado, ID_Agricultor
            FROM Oferta_Trabajo WHERE ID_Oferta = %s
        """, (job_id,), fetch_one=True)
        
        if not oferta or oferta['ID_Agricultor'] != user_id:
            return jsonify({'success': False, 'message': 'Oferta no encontrada o sin permisos'}), 404
        
        if oferta['Estado'] != 'Cerrada':
            return jsonify({'success': False, 'message': 'La oferta no está cerrada'}), 400
        
        execute_query("UPDATE Oferta_Trabajo SET Estado = 'Abierta' WHERE ID_Oferta = %s", (job_id,))
        
        print(f"✅ Oferta {job_id} reabierta")
        return jsonify({'success': True, 'message': f'Oferta "{oferta["Titulo"]}" reabierta'})
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


# ================================================================
# 3. ACEPTAR POSTULACIÓN V3 (NUEVO NOMBRE)
# ================================================================

@app.route('/api/aceptar_postulacion_v3/<int:application_id>', methods=['PUT'])
def aceptar_postulacion_v3(application_id):
    """Aceptar postulación con opción de cerrar oferta"""
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'No autenticado'}), 401
        
        user_id = session['user_id']
        user_role = session.get('user_role', session.get('role'))
        
        if user_role != 'Agricultor':
            return jsonify({'success': False, 'message': 'Solo agricultores'}), 403
        
        data = request.get_json()
        cerrar_oferta = data.get('cerrar_oferta', False)
        
        postulacion = execute_query("""
            SELECT p.ID_Postulacion, p.ID_Oferta, p.ID_Trabajador, p.Estado,
                   ot.ID_Agricultor, ot.Titulo, ot.Pago_Ofrecido,
                   CONCAT(u.Nombre, ' ', u.Apellido) as nombre_trabajador
            FROM Postulacion p
            INNER JOIN Oferta_Trabajo ot ON p.ID_Oferta = ot.ID_Oferta
            INNER JOIN Usuario u ON p.ID_Trabajador = u.ID_Usuario
            WHERE p.ID_Postulacion = %s
        """, (application_id,), fetch_one=True)
        
        if not postulacion or postulacion['ID_Agricultor'] != user_id:
            return jsonify({'success': False, 'message': 'Postulación no encontrada'}), 404
        
        if postulacion['Estado'] != 'Pendiente':
            return jsonify({'success': False, 'message': 'Ya fue procesada'}), 400
        
        # Aceptar
        execute_query("UPDATE Postulacion SET Estado = 'Aceptada' WHERE ID_Postulacion = %s", (application_id,))
        
        # Crear acuerdo si no existe
        acuerdo_existe = execute_query("""
            SELECT ID_Acuerdo FROM Acuerdo_Laboral
            WHERE ID_Oferta = %s AND ID_Trabajador = %s
        """, (postulacion['ID_Oferta'], postulacion['ID_Trabajador']), fetch_one=True)
        
        if not acuerdo_existe:
            execute_query("""
                INSERT INTO Acuerdo_Laboral 
                (ID_Oferta, ID_Trabajador, Fecha_Inicio, Pago_Final, Estado)
                VALUES (%s, %s, CURDATE(), %s, 'Activo')
            """, (postulacion['ID_Oferta'], postulacion['ID_Trabajador'], postulacion['Pago_Ofrecido']))
        
        mensaje = f'Postulación de {postulacion["nombre_trabajador"]} aceptada'
        
        # Si debe cerrar oferta
        if cerrar_oferta:
            execute_query("UPDATE Oferta_Trabajo SET Estado = 'Cerrada' WHERE ID_Oferta = %s", (postulacion['ID_Oferta'],))
            execute_query("""
                UPDATE Postulacion SET Estado = 'Rechazada'
                WHERE ID_Oferta = %s AND Estado = 'Pendiente' AND ID_Postulacion != %s
            """, (postulacion['ID_Oferta'], application_id))
            execute_query("""
                UPDATE Acuerdo_Laboral 
                SET Estado = 'Finalizado', Fecha_Fin = CURDATE()
                WHERE ID_Oferta = %s AND Estado = 'Activo' AND Fecha_Fin IS NULL
            """, (postulacion['ID_Oferta'],))
            mensaje += ' y oferta cerrada'
        
        return jsonify({'success': True, 'message': mensaje, 'oferta_cerrada': cerrar_oferta})
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


# ================================================================
# 4. RECHAZAR POSTULACIÓN V3 (NUEVO NOMBRE)
# ================================================================

@app.route('/api/rechazar_postulacion_v3/<int:application_id>', methods=['PUT'])
def rechazar_postulacion_v3(application_id):
    """Rechazar postulación"""
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'No autenticado'}), 401
        
        user_id = session['user_id']
        user_role = session.get('user_role', session.get('role'))
        
        if user_role != 'Agricultor':
            return jsonify({'success': False, 'message': 'Solo agricultores'}), 403
        
        postulacion = execute_query("""
            SELECT p.ID_Postulacion, p.Estado, ot.ID_Agricultor,
                   CONCAT(u.Nombre, ' ', u.Apellido) as nombre_trabajador
            FROM Postulacion p
            INNER JOIN Oferta_Trabajo ot ON p.ID_Oferta = ot.ID_Oferta
            INNER JOIN Usuario u ON p.ID_Trabajador = u.ID_Usuario
            WHERE p.ID_Postulacion = %s
        """, (application_id,), fetch_one=True)
        
        if not postulacion or postulacion['ID_Agricultor'] != user_id:
            return jsonify({'success': False, 'message': 'No encontrada'}), 404
        
        if postulacion['Estado'] != 'Pendiente':
            return jsonify({'success': False, 'message': 'Ya fue procesada'}), 400
        
        execute_query("UPDATE Postulacion SET Estado = 'Rechazada' WHERE ID_Postulacion = %s", (application_id,))
        
        return jsonify({'success': True, 'message': f'Postulación de {postulacion["nombre_trabajador"]} rechazada'})
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


# ================================================================
# 5. ESTADÍSTICAS V2 (NUEVO NOMBRE)
# ================================================================

@app.route('/api/estadisticas_cierre_v2/<int:job_id>', methods=['GET'])
def estadisticas_cierre_v2(job_id):
    """Obtener estadísticas de oferta"""
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'No autenticado'}), 401
        
        stats = execute_query("""
            SELECT 
                COUNT(CASE WHEN p.Estado = 'Pendiente' THEN 1 END) as pendientes,
                COUNT(CASE WHEN p.Estado = 'Aceptada' THEN 1 END) as aceptadas,
                COUNT(CASE WHEN p.Estado = 'Rechazada' THEN 1 END) as rechazadas,
                COUNT(*) as total
            FROM Postulacion p
            WHERE p.ID_Oferta = %s
        """, (job_id,), fetch_one=True)
        
        return jsonify({
            'success': True,
            'stats': {
                'pendientes': stats['pendientes'] or 0,
                'aceptadas': stats['aceptadas'] or 0,
                'rechazadas': stats['rechazadas'] or 0,
                'total': stats['total'] or 0
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ================================================================
# 6. HISTORIAL CONTRATACIONES AGRICULTOR V2 (NUEVO NOMBRE)
# ================================================================

@app.route('/api/historial_contrataciones_v2', methods=['GET'])
def historial_contrataciones_v2():
    """Historial de contrataciones del agricultor"""
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'No autenticado'}), 401
        
        user_id = session['user_id']
        user_role = session.get('user_role', session.get('role'))
        
        if user_role != 'Agricultor':
            return jsonify({'success': False, 'message': 'Solo agricultores'}), 403
        
        contrataciones = execute_query("""
            SELECT al.ID_Acuerdo as id, al.Fecha_Inicio as fecha_inicio,
                   al.Fecha_Fin as fecha_fin, al.Pago_Final as pago_final,
                   al.Estado as estado, ot.Titulo as titulo_oferta,
                   ot.ID_Oferta as id_oferta,
                   CONCAT(u.Nombre, ' ', u.Apellido) as nombre_trabajador,
                   u.Telefono as telefono_trabajador, u.Correo as email_trabajador,
                   u.URL_Foto as foto_trabajador, u.ID_Usuario as id_trabajador,
                   c.Puntuacion as calificacion_dada, c.Comentario as comentario_calificacion
            FROM Acuerdo_Laboral al
            INNER JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
            INNER JOIN Usuario u ON al.ID_Trabajador = u.ID_Usuario
            LEFT JOIN Calificacion c ON c.ID_Acuerdo = al.ID_Acuerdo AND c.ID_Usuario_Emisor = %s
            WHERE ot.ID_Agricultor = %s
            ORDER BY al.Fecha_Inicio DESC
        """, (user_id, user_id))
        
        contrataciones_list = []
        for cont in contrataciones:
            contrataciones_list.append({
                'id': cont['id'],
                'fecha_inicio': cont['fecha_inicio'].strftime('%Y-%m-%d') if cont['fecha_inicio'] else None,
                'fecha_fin': cont['fecha_fin'].strftime('%Y-%m-%d') if cont['fecha_fin'] else None,
                'pago_final': float(cont['pago_final']) if cont['pago_final'] else 0,
                'estado': cont['estado'],
                'titulo_oferta': cont['titulo_oferta'],
                'id_oferta': cont['id_oferta'],
                'nombre_trabajador': cont['nombre_trabajador'],
                'telefono_trabajador': cont['telefono_trabajador'] or 'No disponible',
                'email_trabajador': cont['email_trabajador'],
                'foto_trabajador': cont['foto_trabajador'],
                'id_trabajador': cont['id_trabajador'],
                'calificacion_dada': int(cont['calificacion_dada']) if cont['calificacion_dada'] else None,
                'comentario_calificacion': cont['comentario_calificacion']
            })
        
        return jsonify({'success': True, 'contrataciones': contrataciones_list, 'total': len(contrataciones_list)})
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


# ================================================================
# 7. HISTORIAL EMPLEOS TRABAJADOR V2 (NUEVO NOMBRE)
# ================================================================

@app.route('/api/historial_empleos_v2', methods=['GET'])
def historial_empleos_v2():
    """Historial de empleos para trabajadores con datos de calificación"""
    try:
        trabajador_id = session.get('user_id')
        if not trabajador_id:
            return jsonify({'success': False, 'message': 'No autenticado'}), 401
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
            SELECT 
                a.ID_Acuerdo,
                o.ID_Oferta as id,
                o.Titulo as titulo,
                o.Descripcion as descripcion,
                o.Pago_Ofrecido as pago,
                o.Fecha_Publicacion as fecha_publicacion,
                a.Fecha_Inicio as fecha_inicio,
                a.Fecha_Fin as fecha_fin,
                a.Pago_Final as pago_final,
                a.Estado as estado,
                CONCAT(u.Nombre, ' ', u.Apellido) as empleador,
                u.ID_Usuario as id_empleador,
                DATEDIFF(COALESCE(a.Fecha_Fin, NOW()), a.Fecha_Inicio) as duracion_dias,
                c.Puntuacion as calificacion,
                c.Comentario as comentario,
                'Agricultura' as tipo,
                'Bogotá' as ubicacion
            FROM Acuerdo_Laboral a
            INNER JOIN Oferta_Trabajo o ON a.ID_Oferta = o.ID_Oferta
            INNER JOIN Usuario u ON o.ID_Agricultor = u.ID_Usuario
            LEFT JOIN Calificacion c ON a.ID_Acuerdo = c.ID_Acuerdo AND c.ID_Usuario_Emisor = %s
            WHERE a.ID_Trabajador = %s
            ORDER BY a.Fecha_Inicio DESC
        """
        
        cursor.execute(query, (trabajador_id, trabajador_id))
        empleos = cursor.fetchall()
        
        # Formatear datos
        empleos_formateados = []
        for empleo in empleos:
            duracion = f"{empleo['duracion_dias']} días" if empleo['duracion_dias'] else "1 día"
            
            empleo_data = {
                'id': empleo['id'],
                'id_acuerdo': empleo['ID_Acuerdo'],
                'id_empleador': empleo['id_empleador'],
                'titulo': empleo['titulo'],
                'descripcion': empleo['descripcion'] or '',
                'pago': float(empleo['pago_final'] or empleo['pago'] or 0),
                'fecha_inicio': empleo['fecha_inicio'].strftime('%Y-%m-%d') if empleo['fecha_inicio'] else '',
                'fecha_fin': empleo['fecha_fin'].strftime('%Y-%m-%d') if empleo['fecha_fin'] else None,
                'duracion': duracion,
                'estado': empleo['estado'],
                'empleador': empleo['empleador'],
                'tipo': empleo['tipo'],
                'ubicacion': empleo['ubicacion'],
                'calificacion': int(empleo['calificacion']) if empleo['calificacion'] else None,
                'comentario': empleo['comentario']
            }
            empleos_formateados.append(empleo_data)
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'empleos': empleos_formateados
        })
        
    except Exception as e:
        print(f"❌ Error en historial_empleos_v2: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

print("✅ Endpoint de historial actualizado con datos de calificación")


# ================================================================
# 8. CALIFICAR TRABAJADOR V2 (NUEVO NOMBRE)
# ================================================================

@app.route('/api/calificar_trabajador_v2', methods=['POST'])
def calificar_trabajador_v2():
    """Calificar trabajador"""
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'No autenticado'}), 401
        
        user_id = session['user_id']
        user_role = session.get('user_role', session.get('role'))
        
        if user_role != 'Agricultor':
            return jsonify({'success': False, 'message': 'Solo agricultores'}), 403
        
        data = request.get_json()
        contratacion_id = data.get('contratacion_id')
        puntuacion = data.get('puntuacion')
        comentario = data.get('comentario', '')
        
        if not puntuacion or int(puntuacion) < 1 or int(puntuacion) > 5:
            return jsonify({'success': False, 'message': 'Puntuación entre 1-5'}), 400
        
        acuerdo = execute_query("""
            SELECT al.ID_Acuerdo, al.ID_Trabajador, ot.ID_Agricultor
            FROM Acuerdo_Laboral al
            INNER JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
            WHERE al.ID_Acuerdo = %s
        """, (contratacion_id,), fetch_one=True)
        
        if not acuerdo or acuerdo['ID_Agricultor'] != user_id:
            return jsonify({'success': False, 'message': 'Contratación no encontrada'}), 404
        
        existe = execute_query("""
            SELECT ID_Calificacion FROM Calificacion
            WHERE ID_Acuerdo = %s AND ID_Usuario_Emisor = %s
        """, (contratacion_id, user_id), fetch_one=True)
        
        if existe:
            return jsonify({'success': False, 'message': 'Ya has calificado'}), 400
        
        execute_query("""
            INSERT INTO Calificacion 
            (ID_Acuerdo, ID_Usuario_Emisor, ID_Usuario_Receptor, Puntuacion, Comentario)
            VALUES (%s, %s, %s, %s, %s)
        """, (contratacion_id, user_id, acuerdo['ID_Trabajador'], puntuacion, comentario))
        
        return jsonify({'success': True, 'message': 'Calificación enviada'})
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


print("=" * 70)
print("✅ ENDPOINTS V2/V3 CARGADOS (sin conflictos de nombres)")
print("=" * 70)
print("📋 Rutas nuevas:")
print("   PUT  /api/cerrar_oferta_manual_v2/<job_id>")
print("   PUT  /api/reabrir_oferta_v2/<job_id>")
print("   PUT  /api/aceptar_postulacion_v3/<application_id>")
print("   PUT  /api/rechazar_postulacion_v3/<application_id>")
print("   GET  /api/estadisticas_cierre_v2/<job_id>")
print("   GET  /api/historial_contrataciones_v2")
print("   GET  /api/historial_empleos_v2")
print("   POST /api/calificar_trabajador_v2")
print("=" * 70)

@app.route('/api/estadisticas_agricultor', methods=['GET'])
def api_estadisticas_agricultor():
    """Obtener estadísticas completas del agricultor"""
    print("🔍 Request: GET /api/estadisticas_agricultor")
    
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'No autenticado'}), 401
    
    user_id = session['user_id']
    periodo = request.args.get('periodo', 'all')
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Calcular filtro de fecha
        where_fecha_ofertas = ""
        where_fecha_acuerdos = ""
        
        if periodo == 'month':
            where_fecha_ofertas = "AND ot.Fecha_Publicacion >= DATE_SUB(NOW(), INTERVAL 1 MONTH)"
            where_fecha_acuerdos = "AND al.Fecha_Inicio >= DATE_SUB(NOW(), INTERVAL 1 MONTH)"
        elif periodo == 'quarter':
            where_fecha_ofertas = "AND ot.Fecha_Publicacion >= DATE_SUB(NOW(), INTERVAL 3 MONTH)"
            where_fecha_acuerdos = "AND al.Fecha_Inicio >= DATE_SUB(NOW(), INTERVAL 3 MONTH)"
        elif periodo == 'year':
            where_fecha_ofertas = "AND ot.Fecha_Publicacion >= DATE_SUB(NOW(), INTERVAL 1 YEAR)"
            where_fecha_acuerdos = "AND al.Fecha_Inicio >= DATE_SUB(NOW(), INTERVAL 1 YEAR)"
        
        # 1. RESUMEN
        cursor.execute(f"SELECT COUNT(*) as total FROM Oferta_Trabajo ot WHERE ot.ID_Agricultor = %s {where_fecha_ofertas}", (user_id,))
        total_ofertas = cursor.fetchone()['total']
        
        cursor.execute(f"""
            SELECT COUNT(DISTINCT al.ID_Acuerdo) as total
            FROM Acuerdo_Laboral al
            INNER JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
            WHERE ot.ID_Agricultor = %s {where_fecha_acuerdos}
        """, (user_id,))
        total_contrataciones = cursor.fetchone()['total']
        
        cursor.execute(f"""
            SELECT COALESCE(SUM(al.Pago_Final), 0) as total
            FROM Acuerdo_Laboral al
            INNER JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
            WHERE ot.ID_Agricultor = %s
            AND al.Estado = 'Finalizado'
            AND al.Pago_Final IS NOT NULL
            {where_fecha_acuerdos}
        """, (user_id,))
        total_inversion = cursor.fetchone()['total']
        
        cursor.execute(f"""
            SELECT COALESCE(AVG(CAST(c.Puntuacion AS UNSIGNED)), 0) as promedio
            FROM Calificacion c
            INNER JOIN Acuerdo_Laboral al ON c.ID_Acuerdo = al.ID_Acuerdo
            INNER JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
            WHERE ot.ID_Agricultor = %s
            AND c.ID_Usuario_Emisor = %s
            {where_fecha_acuerdos}
        """, (user_id, user_id))
        calificacion_promedio = cursor.fetchone()['promedio']
        
        # 2. INVERSIÓN MENSUAL
        cursor.execute("""
            SELECT 
                DATE_FORMAT(al.Fecha_Inicio, '%b') as mes,
                COALESCE(SUM(al.Pago_Final), 0) as inversion
            FROM Acuerdo_Laboral al
            INNER JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
            WHERE ot.ID_Agricultor = %s
            AND al.Estado = 'Finalizado'
            AND al.Fecha_Inicio >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY YEAR(al.Fecha_Inicio), MONTH(al.Fecha_Inicio), DATE_FORMAT(al.Fecha_Inicio, '%b')
            ORDER BY YEAR(al.Fecha_Inicio), MONTH(al.Fecha_Inicio)
        """, (user_id,))
        inversion_mensual = cursor.fetchall()
        
        # 3. OFERTAS POR ESTADO
        cursor.execute(f"""
            SELECT 
                Estado as estado,
                COUNT(*) as cantidad
            FROM Oferta_Trabajo
            WHERE ID_Agricultor = %s {where_fecha_ofertas}
            GROUP BY Estado
        """, (user_id,))
        ofertas_por_estado = cursor.fetchall()
        
        # 4. CONTRATACIONES MENSUALES
        cursor.execute("""
            SELECT 
                DATE_FORMAT(al.Fecha_Inicio, '%b') as mes,
                COUNT(*) as contrataciones
            FROM Acuerdo_Laboral al
            INNER JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
            WHERE ot.ID_Agricultor = %s
            AND al.Fecha_Inicio >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY YEAR(al.Fecha_Inicio), MONTH(al.Fecha_Inicio), DATE_FORMAT(al.Fecha_Inicio, '%b')
            ORDER BY YEAR(al.Fecha_Inicio), MONTH(al.Fecha_Inicio)
        """, (user_id,))
        contrataciones_mensuales = cursor.fetchall()
        
        # 5. TRABAJADORES MÁS CONTRATADOS
        cursor.execute(f"""
            SELECT 
                CONCAT(u.Nombre, ' ', u.Apellido) as nombre,
                COUNT(*) as contrataciones
            FROM Acuerdo_Laboral al
            INNER JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
            INNER JOIN Usuario u ON al.ID_Trabajador = u.ID_Usuario
            WHERE ot.ID_Agricultor = %s {where_fecha_acuerdos}
            GROUP BY al.ID_Trabajador, u.Nombre, u.Apellido
            ORDER BY contrataciones DESC
            LIMIT 5
        """, (user_id,))
        trabajadores_frecuentes = cursor.fetchall()
        
        # 6. OFERTAS RECIENTES
        cursor.execute(f"""
            SELECT 
                ot.Titulo as titulo,
                'Sin ubicación' as ubicacion,
                ot.Estado as estado,
                ot.Pago_Ofrecido as pago,
                (SELECT COUNT(*) FROM Postulacion p WHERE p.ID_Oferta = ot.ID_Oferta) as postulaciones
            FROM Oferta_Trabajo ot
            WHERE ot.ID_Agricultor = %s {where_fecha_ofertas}
            ORDER BY ot.Fecha_Publicacion DESC
            LIMIT 5
        """, (user_id,))
        ofertas_recientes = cursor.fetchall()
        
        # 7. TOP TRABAJADORES
        cursor.execute(f"""
            SELECT 
                CONCAT(u.Nombre, ' ', u.Apellido) as nombre,
                COUNT(DISTINCT al.ID_Acuerdo) as trabajos,
                COALESCE(AVG(CAST(c.Puntuacion AS UNSIGNED)), 0) as calificacion
            FROM Acuerdo_Laboral al
            INNER JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
            INNER JOIN Usuario u ON al.ID_Trabajador = u.ID_Usuario
            LEFT JOIN Calificacion c ON al.ID_Acuerdo = c.ID_Acuerdo 
                AND c.ID_Usuario_Receptor = al.ID_Trabajador
            WHERE ot.ID_Agricultor = %s {where_fecha_acuerdos}
            GROUP BY al.ID_Trabajador, u.Nombre, u.Apellido
            HAVING trabajos > 0
            ORDER BY calificacion DESC, trabajos DESC
            LIMIT 5
        """, (user_id,))
        top_trabajadores = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        # Construir respuesta
        estadisticas = {
            'resumen': {
                'totalOfertas': int(total_ofertas or 0),
                'totalContrataciones': int(total_contrataciones or 0),
                'totalInversion': float(total_inversion or 0),
                'calificacionPromedio': round(float(calificacion_promedio or 0), 1)
            },
            'inversionMensual': inversion_mensual or [],
            'ofertasPorEstado': ofertas_por_estado or [],
            'contratacionesMensuales': contrataciones_mensuales or [],
            'trabajadoresFrecuentes': trabajadores_frecuentes or [],
            'ofertasRecientes': ofertas_recientes or [],
            'topTrabajadores': top_trabajadores or []
        }
        
        print(f"✅ Estadísticas agricultor: {estadisticas['resumen']}")
        
        return jsonify({'success': True, 'estadisticas': estadisticas})
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/estadisticas_trabajador', methods=['GET'])
def api_estadisticas_trabajador():
    """Obtener estadísticas completas del trabajador"""
    print("🔍 Request: GET /api/estadisticas_trabajador")
    
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'No autenticado'}), 401
    
    user_id = session['user_id']
    periodo = request.args.get('periodo', 'all')
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Calcular filtro de fecha
        where_fecha = ""
        if periodo == 'month':
            where_fecha = "AND al.Fecha_Fin >= DATE_SUB(NOW(), INTERVAL 1 MONTH)"
        elif periodo == 'quarter':
            where_fecha = "AND al.Fecha_Fin >= DATE_SUB(NOW(), INTERVAL 3 MONTH)"
        elif periodo == 'year':
            where_fecha = "AND al.Fecha_Fin >= DATE_SUB(NOW(), INTERVAL 1 YEAR)"
        
        # 1. RESUMEN
        cursor.execute(f"""
            SELECT COUNT(DISTINCT ID_Acuerdo) as total
            FROM Acuerdo_Laboral
            WHERE ID_Trabajador = %s
            AND Estado = 'Finalizado'
            {where_fecha}
        """, (user_id,))
        total_trabajos = cursor.fetchone()['total']
        
        cursor.execute(f"""
            SELECT COALESCE(SUM(DATEDIFF(Fecha_Fin, Fecha_Inicio)), 0) as total_dias
            FROM Acuerdo_Laboral
            WHERE ID_Trabajador = %s
            AND Estado = 'Finalizado'
            AND Fecha_Fin IS NOT NULL
            {where_fecha}
        """, (user_id,))
        total_dias = cursor.fetchone()['total_dias']
        total_horas = int(total_dias * 8)
        
        cursor.execute(f"""
            SELECT COALESCE(SUM(Pago_Final), 0) as total
            FROM Acuerdo_Laboral
            WHERE ID_Trabajador = %s
            AND Estado = 'Finalizado'
            AND Pago_Final IS NOT NULL
            {where_fecha}
        """, (user_id,))
        total_ingresos = cursor.fetchone()['total']
        
        cursor.execute(f"""
            SELECT COALESCE(AVG(CAST(Puntuacion AS UNSIGNED)), 0) as promedio
            FROM Calificacion
            WHERE ID_Usuario_Receptor = %s
            {where_fecha.replace('al.Fecha_Fin', 'Fecha')}
        """, (user_id,))
        calificacion_promedio = cursor.fetchone()['promedio']
        
        # 2. INGRESOS MENSUALES
        cursor.execute("""
            SELECT 
                DATE_FORMAT(Fecha_Fin, '%b') as mes,
                COALESCE(SUM(Pago_Final), 0) as ingresos
            FROM Acuerdo_Laboral
            WHERE ID_Trabajador = %s
            AND Estado = 'Finalizado'
            AND Fecha_Fin >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY YEAR(Fecha_Fin), MONTH(Fecha_Fin), DATE_FORMAT(Fecha_Fin, '%b')
            ORDER BY YEAR(Fecha_Fin), MONTH(Fecha_Fin)
        """, (user_id,))
        ingresos_mensuales = cursor.fetchall()
        
        # 3. TRABAJOS POR TIPO
        cursor.execute(f"""
            SELECT 
                SUBSTRING_INDEX(ot.Titulo, ' ', 1) as tipo,
                COUNT(*) as cantidad
            FROM Acuerdo_Laboral al
            INNER JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
            WHERE al.ID_Trabajador = %s
            AND al.Estado = 'Finalizado'
            {where_fecha}
            GROUP BY tipo
            ORDER BY cantidad DESC
            LIMIT 5
        """, (user_id,))
        trabajos_por_tipo = cursor.fetchall()
        
        # 4. HORAS MENSUALES
        cursor.execute("""
            SELECT 
                DATE_FORMAT(Fecha_Fin, '%b') as mes,
                COALESCE(SUM(DATEDIFF(Fecha_Fin, Fecha_Inicio) * 8), 0) as horas
            FROM Acuerdo_Laboral
            WHERE ID_Trabajador = %s
            AND Estado = 'Finalizado'
            AND Fecha_Fin >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY YEAR(Fecha_Fin), MONTH(Fecha_Fin), DATE_FORMAT(Fecha_Fin, '%b')
            ORDER BY YEAR(Fecha_Fin), MONTH(Fecha_Fin)
        """, (user_id,))
        horas_mensuales = cursor.fetchall()
        
        # 5. CALIFICACIONES POR MES
        cursor.execute("""
            SELECT 
                DATE_FORMAT(Fecha, '%b') as mes,
                COALESCE(AVG(CAST(Puntuacion AS UNSIGNED)), 0) as calificacion
            FROM Calificacion
            WHERE ID_Usuario_Receptor = %s
            AND Fecha >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY YEAR(Fecha), MONTH(Fecha), DATE_FORMAT(Fecha, '%b')
            ORDER BY YEAR(Fecha), MONTH(Fecha)
        """, (user_id,))
        calificaciones_por_mes = cursor.fetchall()
        
        # 6. TRABAJOS RECIENTES
        cursor.execute(f"""
            SELECT 
                ot.Titulo as titulo,
                CONCAT(u.Nombre, ' ', u.Apellido) as agricultor,
                al.Fecha_Fin as fechaFin,
                al.Pago_Final as pago,
                (SELECT Puntuacion FROM Calificacion c 
                 WHERE c.ID_Acuerdo = al.ID_Acuerdo 
                 AND c.ID_Usuario_Receptor = %s LIMIT 1) as calificacion
            FROM Acuerdo_Laboral al
            INNER JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
            INNER JOIN Usuario u ON ot.ID_Agricultor = u.ID_Usuario
            WHERE al.ID_Trabajador = %s
            AND al.Estado = 'Finalizado'
            {where_fecha}
            ORDER BY al.Fecha_Fin DESC
            LIMIT 5
        """, (user_id, user_id))
        trabajos_recientes = cursor.fetchall()
        
        # 7. HABILIDADES
        cursor.execute("""
            SELECT 
                Nombre as nombre,
                Clasificacion as clasificacion
            FROM Habilidad
            WHERE ID_Trabajador = %s
        """, (user_id,))
        habilidades = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        # Construir respuesta
        estadisticas = {
            'resumen': {
                'totalTrabajos': int(total_trabajos or 0),
                'totalHoras': int(total_horas or 0),
                'totalIngresos': float(total_ingresos or 0),
                'calificacionPromedio': round(float(calificacion_promedio or 0), 1)
            },
            'ingresosMensuales': ingresos_mensuales or [],
            'trabajosPorTipo': trabajos_por_tipo or [],
            'horasMensuales': horas_mensuales or [],
            'calificacionesPorMes': calificaciones_por_mes or [],
            'trabajosRecientes': trabajos_recientes or [],
            'habilidades': habilidades or []
        }
        
        print(f"✅ Estadísticas trabajador: {estadisticas['resumen']}")
        
        return jsonify({'success': True, 'estadisticas': estadisticas})
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500



# ============================================================
# ENDPOINT 1: GET USER SESSION (ÚNICO Y CORRECTO)
# ============================================================

@app.route('/get_user_session')
def get_user_session():
    """Obtener datos completos de sesión con configuraciones JSON"""
    try:
        if 'user_id' not in session:
            print("⚠️ No hay sesión activa")
            return jsonify({
                'success': False,
                'error': 'No hay sesión activa'
            }), 401
        
        user_id = session.get('user_id')
        print(f"📥 Obteniendo sesión para usuario ID: {user_id}")
        
        # Obtener datos del usuario
        user_data = execute_query(
            """SELECT 
                ID_Usuario, 
                Nombre, 
                Apellido, 
                Correo, 
                Telefono, 
                URL_Foto, 
                Red_Social, 
                Rol, 
                Estado, 
                Fecha_Registro,
                Configuraciones
            FROM Usuario 
            WHERE ID_Usuario = %s""",
            (user_id,),
            fetch_one=True
        )
        
        if not user_data:
            print(f"❌ Usuario {user_id} no encontrado")
            return jsonify({
                'success': False,
                'error': 'Usuario no encontrado'
            }), 404
        
        # Parsear configuraciones JSON
        import json
        configuraciones = {}
        
        if user_data.get('Configuraciones'):
            try:
                configuraciones = json.loads(user_data['Configuraciones'])
                print(f"✅ Configuraciones JSON leídas: {configuraciones}")
            except json.JSONDecodeError as e:
                print(f"⚠️ Error decodificando JSON: {e}")
                configuraciones = {}
        else:
            print("ℹ️ No hay configuraciones guardadas")
        
        # Obtener estadísticas
        stats = execute_query("""
            SELECT 
                COUNT(DISTINCT al.ID_Acuerdo) as trabajos_completados,
                AVG(CAST(c.Puntuacion AS DECIMAL)) as calificacion_promedio
            FROM Usuario u
            LEFT JOIN Acuerdo_Laboral al ON u.ID_Usuario = al.ID_Trabajador AND al.Estado = 'Finalizado'
            LEFT JOIN Calificacion c ON u.ID_Usuario = c.ID_Usuario_Receptor
            WHERE u.ID_Usuario = %s
        """, (user_id,), fetch_one=True)
        
        # Actualizar sesión con datos frescos
        session['first_name'] = user_data['Nombre']
        session['last_name'] = user_data['Apellido']
        session['email'] = user_data['Correo']
        session['user_name'] = f"{user_data['Nombre']} {user_data['Apellido']}"
        session['telefono'] = user_data.get('Telefono', '')
        
        # Construir respuesta
        response_data = {
            'success': True,
            'user': {
                'user_id': user_data['ID_Usuario'],
                'id': user_data['ID_Usuario'],
                'full_name': f"{user_data['Nombre']} {user_data['Apellido']}",
                'user_name': f"{user_data['Nombre']} {user_data['Apellido']}",
                'nombre': user_data['Nombre'],
                'apellido': user_data['Apellido'],
                'first_name': user_data['Nombre'],
                'last_name': user_data['Apellido'],
                'email': user_data['Correo'],
                'telefono': user_data.get('Telefono', ''),
                'url_foto': user_data.get('URL_Foto'),
                'red_social': user_data.get('Red_Social', ''),
                'rol': user_data['Rol'],
                'role': user_data['Rol'],
                'estado': user_data['Estado'],
                'fecha_registro': user_data['Fecha_Registro'].isoformat() if user_data.get('Fecha_Registro') else None,
                'username': user_data['Correo'],
                
                # CAMPOS PROFESIONALES desde JSON
                'area_trabajo': configuraciones.get('area_trabajo'),
                'especializacion': configuraciones.get('especializacion'),
                'anos_experiencia': configuraciones.get('anos_experiencia', 0),
                'nivel_educativo': configuraciones.get('nivel_educativo'),
                'ubicacion': configuraciones.get('ubicacion'),
                
                # ESTADÍSTICAS
                'trabajos_completados': stats['trabajos_completados'] if stats else 0,
                'calificacion_promedio': float(stats['calificacion_promedio']) if stats and stats['calificacion_promedio'] else 0.0
            }
        }
        
        print(f"✅ Sesión obtenida correctamente para {user_data['Nombre']} {user_data['Apellido']}")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"❌ Error en get_user_session: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': f'Error interno: {str(e)}'
        }), 500

# ============================================================
# ENDPOINT 3: RECOMENDACIONES
# ============================================================

@app.route('/api/recomendaciones-empleos', methods=['GET'])
def get_recomendaciones_empleos():
    """Sistema de recomendaciones basado en habilidades"""
    try:
        if 'user_id' not in session:
            return jsonify({'success': False}), 401
        
        user_id = session['user_id']
        
        conn = create_connection()
        if not conn:
            return jsonify({'success': False}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Obtener habilidades
        cursor.execute("""
            SELECT Nombre, Clasificacion, Anos_Experiencia
            FROM Habilidad 
            WHERE ID_Trabajador = %s
        """, (user_id,))
        
        habilidades = cursor.fetchall()
        
        if not habilidades:
            cursor.close()
            conn.close()
            return jsonify({
                'success': True,
                'recomendaciones': [],
                'trabajos_completados': 0
            })
        
        # Obtener ofertas disponibles
        cursor.execute("""
            SELECT 
                o.ID_Oferta,
                o.Titulo,
                o.Descripcion,
                o.Pago_Ofrecido,
                o.Fecha_Publicacion,
                u.Nombre,
                u.Apellido
            FROM Oferta_Trabajo o
            JOIN Usuario u ON o.ID_Agricultor = u.ID_Usuario
            WHERE o.Estado IN ('Abierta', 'En Proceso')
            AND o.ID_Oferta NOT IN (
                SELECT ID_Oferta FROM Postulacion WHERE ID_Trabajador = %s
            )
            ORDER BY o.Fecha_Publicacion DESC
            LIMIT 20
        """, (user_id,))
        
        ofertas = cursor.fetchall()
        
        # Calcular compatibilidad
        recomendaciones = []
        
        for oferta in ofertas:
            texto = f"{oferta['Titulo']} {oferta['Descripcion']}".lower()
            match = 50
            razones = []
            habs_req = []
            
            # Buscar habilidades
            for hab in habilidades:
                if hab['Nombre'].lower() in texto:
                    match += 15
                    razones.append(f"Requiere {hab['Nombre']}")
                    habs_req.append(hab['Nombre'])
            
            # Buscar clasificaciones
            for hab in habilidades:
                if hab['Clasificacion'].lower() in texto:
                    match += 10
                    if f"Experiencia en {hab['Clasificacion']}" not in razones:
                        razones.append(f"Experiencia en {hab['Clasificacion']}")
            
            # Experiencia
            exp_total = sum(h['Anos_Experiencia'] for h in habilidades)
            if exp_total >= 3:
                match += 10
                razones.append(f"{exp_total} años de experiencia")
            
            # Ubicación
            ubicacion = 'No especificada'
            if 'ubicación:' in oferta['Descripcion'].lower():
                try:
                    ubicacion = oferta['Descripcion'].split('Ubicación:')[1].split('\n')[0].strip()
                except:
                    pass
            
            match = min(match, 100)
            
            if match >= 50:
                recomendaciones.append({
                    'id_oferta': oferta['ID_Oferta'],
                    'titulo': oferta['Titulo'],
                    'descripcion': oferta['Descripcion'][:300],
                    'pago_ofrecido': float(oferta['Pago_Ofrecido']),
                    'fecha_publicacion': str(oferta['Fecha_Publicacion']),
                    'nombre_agricultor': f"{oferta['Nombre']} {oferta['Apellido']}",
                    'ubicacion': ubicacion,
                    'porcentaje_match': match,
                    'razones_match': razones if razones else ['Compatible con tu perfil'],
                    'habilidades_requeridas': habs_req
                })
        
        recomendaciones.sort(key=lambda x: x['porcentaje_match'], reverse=True)
        
        cursor.close()
        conn.close()
        
        print(f"✅ Generadas {len(recomendaciones)} recomendaciones")
        
        return jsonify({
            'success': True,
            'recomendaciones': recomendaciones,
            'trabajos_completados': 0
        })
        
    except Exception as e:
        print(f"Error recomendaciones: {e}")
        return jsonify({'success': False}), 500


# ============================================================
# ENDPOINT 4: GET USER SKILLS
# ============================================================

@app.route('/api/get_user_skills', methods=['GET'])
def get_user_skills():
    """Obtener habilidades del usuario"""
    try:
        if 'user_id' not in session:
            return jsonify({'success': False}), 401
        
        conn = create_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                ID_Habilidad as id,
                Nombre as nombre,
                Clasificacion as clasificacion,
                Nivel as nivel,
                Anos_Experiencia as anos_experiencia
            FROM Habilidad
            WHERE ID_Trabajador = %s
        """, (session['user_id'],))
        
        skills = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'skills': skills
        })
        
    except Exception as e:
        print(f"Error get_user_skills: {e}")
        return jsonify({'success': False, 'skills': []})

# ============================================================
# ENDPOINT: UPDATE PROFILE (ÚNICA VERSIÓN)
# ============================================================

@app.route('/api/update-profile', methods=['POST'])
@require_login
def update_profile():
    """Actualizar perfil - Datos básicos en columnas, profesionales en JSON"""
    try:
        data = request.get_json()
        user_id = session['user_id']
        
        print(f"\n{'='*60}")
        print(f"📝 ACTUALIZACIÓN DE PERFIL - Usuario ID: {user_id}")
        print(f"📥 Datos recibidos: {data}")
        
        # Validar datos básicos
        nombre = data.get('nombre', '').strip()
        apellido = data.get('apellido', '').strip()
        
        if not nombre or not apellido:
            return jsonify({
                'success': False, 
                'message': 'Nombre y apellido son requeridos'
            }), 400
        
        # Datos básicos
        telefono = data.get('telefono', '').strip() if data.get('telefono') else None
        red_social = data.get('red_social', '').strip() if data.get('red_social') else None
        
        # Actualizar datos básicos
        execute_query("""
            UPDATE Usuario 
            SET Nombre = %s, Apellido = %s, Telefono = %s, Red_Social = %s
            WHERE ID_Usuario = %s
        """, (nombre, apellido, telefono, red_social, user_id))
        
        # Preparar configuraciones JSON
        import json
        configuraciones = {}
        
        campos_profesionales = {
            'area_trabajo': data.get('area_trabajo'),
            'especializacion': data.get('especializacion'),
            'anos_experiencia': data.get('anos_experiencia'),
            'nivel_educativo': data.get('nivel_educativo'),
            'ubicacion': data.get('ubicacion')
        }
        
        for campo, valor in campos_profesionales.items():
            if valor and str(valor).strip():
                if campo == 'anos_experiencia':
                    try:
                        configuraciones[campo] = int(valor)
                    except:
                        configuraciones[campo] = 0
                else:
                    configuraciones[campo] = str(valor).strip()
        
        # Guardar configuraciones
        if configuraciones:
            json_data = json.dumps(configuraciones, ensure_ascii=False)
            execute_query("""
                UPDATE Usuario 
                SET Configuraciones = %s
                WHERE ID_Usuario = %s
            """, (json_data, user_id))
        
        # Actualizar sesión
        session['first_name'] = nombre
        session['last_name'] = apellido
        session['user_name'] = f"{nombre} {apellido}"
        if telefono:
            session['telefono'] = telefono
        
        print(f"✅ PERFIL ACTUALIZADO EXITOSAMENTE\n")
        
        return jsonify({
            'success': True,
            'message': 'Perfil actualizado correctamente'
        })
        
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False, 
            'message': f'Error: {str(e)}'
        }), 500

# ============================================================
# ENDPOINTS DE CALIFICACIONES - VERSIÓN SIN CONFLICTOS
# Agregar al final de app.py (antes del if __name__ == '__main__':)
# ============================================================

# ============================================================
# 1. OBTENER CALIFICACIONES RECIBIDAS POR UN USUARIO
# ============================================================

@app.route('/api/get_ratings_received', methods=['GET'])
def get_ratings_received():
    """Obtiene las calificaciones recibidas por un usuario (nombre único)"""
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            user_id = session.get('user_id')
        
        if not user_id:
            return jsonify({
                'success': False, 
                'message': 'Usuario no identificado'
            }), 400
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Obtener todas las calificaciones recibidas
        query = """
            SELECT 
                c.ID_Calificacion,
                c.Puntuacion,
                c.Comentario,
                c.Fecha,
                CONCAT(u.Nombre, ' ', u.Apellido) as emisor_nombre,
                u.URL_Foto as emisor_foto,
                u.Rol as emisor_rol,
                o.Titulo as trabajo_titulo,
                al.Fecha_Inicio as trabajo_fecha
            FROM Calificacion c
            INNER JOIN Usuario u ON c.ID_Usuario_Emisor = u.ID_Usuario
            LEFT JOIN Acuerdo_Laboral al ON c.ID_Acuerdo = al.ID_Acuerdo
            LEFT JOIN Oferta_Trabajo o ON al.ID_Oferta = o.ID_Oferta
            WHERE c.ID_Usuario_Receptor = %s
            ORDER BY c.Fecha DESC
        """
        
        cursor.execute(query, (user_id,))
        calificaciones = cursor.fetchall()
        
        # Calcular estadísticas
        if calificaciones:
            total = len(calificaciones)
            suma = sum(int(c['Puntuacion']) for c in calificaciones)
            promedio = suma / total
            
            # Contar por estrellas
            distribucion = {
                '5': sum(1 for c in calificaciones if int(c['Puntuacion']) == 5),
                '4': sum(1 for c in calificaciones if int(c['Puntuacion']) == 4),
                '3': sum(1 for c in calificaciones if int(c['Puntuacion']) == 3),
                '2': sum(1 for c in calificaciones if int(c['Puntuacion']) == 2),
                '1': sum(1 for c in calificaciones if int(c['Puntuacion']) == 1)
            }
        else:
            total = 0
            promedio = 0.0
            distribucion = {'5': 0, '4': 0, '3': 0, '2': 0, '1': 0}
        
        # Formatear respuesta
        calificaciones_formateadas = []
        for cal in calificaciones:
            calificaciones_formateadas.append({
                'id': cal['ID_Calificacion'],
                'puntuacion': int(cal['Puntuacion']),
                'comentario': cal['Comentario'] or '',
                'fecha': cal['Fecha'].strftime('%Y-%m-%d %H:%M') if cal['Fecha'] else '',
                'emisor': {
                    'nombre': cal['emisor_nombre'],
                    'foto': cal['emisor_foto'],
                    'rol': cal['emisor_rol']
                },
                'trabajo': {
                    'titulo': cal['trabajo_titulo'] or 'Trabajo sin título',
                    'fecha': cal['trabajo_fecha'].strftime('%Y-%m-%d') if cal['trabajo_fecha'] else ''
                }
            })
        
        cursor.close()
        conn.close()
        
        print(f"✅ Calificaciones obtenidas para usuario {user_id}: {total} total, promedio {promedio:.1f}")
        
        return jsonify({
            'success': True,
            'calificaciones': calificaciones_formateadas,
            'estadisticas': {
                'total': total,
                'promedio': round(promedio, 1),
                'distribucion': distribucion
            }
        })
        
    except Exception as e:
        print(f"❌ Error en get_ratings_received: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False, 
            'message': f'Error interno: {str(e)}'
        }), 500


# ============================================================
# 2. OBTENER CALIFICACIONES DADAS POR UN USUARIO
# ============================================================

@app.route('/api/get_ratings_given', methods=['GET'])
def get_ratings_given():
    """Obtiene las calificaciones que un usuario ha dado a otros"""
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            user_id = session.get('user_id')
        
        if not user_id:
            return jsonify({
                'success': False, 
                'message': 'Usuario no identificado'
            }), 400
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Obtener calificaciones dadas
        query = """
            SELECT 
                c.ID_Calificacion,
                c.Puntuacion,
                c.Comentario,
                c.Fecha,
                CONCAT(u.Nombre, ' ', u.Apellido) as receptor_nombre,
                u.URL_Foto as receptor_foto,
                u.Rol as receptor_rol,
                o.Titulo as trabajo_titulo,
                al.Fecha_Inicio as trabajo_fecha
            FROM Calificacion c
            INNER JOIN Usuario u ON c.ID_Usuario_Receptor = u.ID_Usuario
            LEFT JOIN Acuerdo_Laboral al ON c.ID_Acuerdo = al.ID_Acuerdo
            LEFT JOIN Oferta_Trabajo o ON al.ID_Oferta = o.ID_Oferta
            WHERE c.ID_Usuario_Emisor = %s
            ORDER BY c.Fecha DESC
        """
        
        cursor.execute(query, (user_id,))
        calificaciones = cursor.fetchall()
        
        # Formatear respuesta
        calificaciones_formateadas = []
        for cal in calificaciones:
            calificaciones_formateadas.append({
                'id': cal['ID_Calificacion'],
                'puntuacion': int(cal['Puntuacion']),
                'comentario': cal['Comentario'] or '',
                'fecha': cal['Fecha'].strftime('%Y-%m-%d %H:%M') if cal['Fecha'] else '',
                'receptor': {
                    'nombre': cal['receptor_nombre'],
                    'foto': cal['receptor_foto'],
                    'rol': cal['receptor_rol']
                },
                'trabajo': {
                    'titulo': cal['trabajo_titulo'] or 'Trabajo sin título',
                    'fecha': cal['trabajo_fecha'].strftime('%Y-%m-%d') if cal['trabajo_fecha'] else ''
                }
            })
        
        cursor.close()
        conn.close()
        
        print(f"✅ Calificaciones dadas por usuario {user_id}: {len(calificaciones_formateadas)} total")
        
        return jsonify({
            'success': True,
            'calificaciones': calificaciones_formateadas,
            'total': len(calificaciones_formateadas)
        })
        
    except Exception as e:
        print(f"❌ Error en get_ratings_given: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False, 
            'message': f'Error interno: {str(e)}'
        }), 500


# ============================================================
# 3. ENVIAR UNA NUEVA CALIFICACIÓN
# ============================================================

@app.route('/api/submit_new_rating', methods=['POST'])
def submit_new_rating():
    """Permite calificar a otro usuario después de completar un trabajo"""
    try:
        # Verificar autenticación
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({
                'success': False, 
                'message': 'No autenticado'
            }), 401
        
        # Obtener datos del request
        data = request.get_json()
        acuerdo_id = data.get('acuerdo_id')
        receptor_id = data.get('receptor_id')
        puntuacion = data.get('puntuacion')
        comentario = data.get('comentario', '').strip()
        
        print(f"📝 Enviando calificación:")
        print(f"   Emisor: {user_id}")
        print(f"   Receptor: {receptor_id}")
        print(f"   Acuerdo: {acuerdo_id}")
        print(f"   Puntuación: {puntuacion}")
        
        # Validaciones
        if not all([acuerdo_id, receptor_id, puntuacion]):
            return jsonify({
                'success': False, 
                'message': 'Datos incompletos. Se requiere acuerdo_id, receptor_id y puntuacion'
            }), 400
        
        try:
            puntuacion = int(puntuacion)
        except ValueError:
            return jsonify({
                'success': False, 
                'message': 'La puntuación debe ser un número'
            }), 400
        
        if puntuacion < 1 or puntuacion > 5:
            return jsonify({
                'success': False, 
                'message': 'La puntuación debe estar entre 1 y 5'
            }), 400
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Verificar que el acuerdo existe y el usuario tiene permisos
        cursor.execute("""
            SELECT 
                al.ID_Acuerdo,
                al.ID_Trabajador,
                ot.ID_Agricultor,
                al.Estado,
                ot.Titulo
            FROM Acuerdo_Laboral al
            INNER JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
            WHERE al.ID_Acuerdo = %s
        """, (acuerdo_id,))
        
        acuerdo = cursor.fetchone()
        
        if not acuerdo:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False, 
                'message': 'Acuerdo laboral no encontrado'
            }), 404
        
        # Verificar que el usuario sea parte del acuerdo
        if user_id not in [acuerdo['ID_Trabajador'], acuerdo['ID_Agricultor']]:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False, 
                'message': 'No tienes permisos para calificar este trabajo'
            }), 403
        
        # Verificar que el trabajo esté finalizado
        if acuerdo['Estado'] != 'Finalizado':
            cursor.close()
            conn.close()
            return jsonify({
                'success': False, 
                'message': 'Solo puedes calificar trabajos finalizados'
            }), 400
        
        # Verificar que no haya calificado ya
        cursor.execute("""
            SELECT ID_Calificacion 
            FROM Calificacion 
            WHERE ID_Acuerdo = %s 
            AND ID_Usuario_Emisor = %s
        """, (acuerdo_id, user_id))
        
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({
                'success': False, 
                'message': 'Ya has calificado este trabajo'
            }), 400
        
        # Insertar la calificación
        cursor.execute("""
            INSERT INTO Calificacion 
            (ID_Acuerdo, ID_Usuario_Emisor, ID_Usuario_Receptor, Puntuacion, Comentario, Fecha)
            VALUES (%s, %s, %s, %s, %s, NOW())
        """, (acuerdo_id, user_id, receptor_id, str(puntuacion), comentario if comentario else None))
        
        conn.commit()
        
        # Obtener nombre del receptor
        cursor.execute("""
            SELECT CONCAT(Nombre, ' ', Apellido) as nombre
            FROM Usuario WHERE ID_Usuario = %s
        """, (receptor_id,))
        receptor = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        print(f"✅ Calificación enviada exitosamente: {user_id} → {receptor_id} ({puntuacion}⭐)")
        
        return jsonify({
            'success': True,
            'message': f'Calificación de {puntuacion}⭐ enviada a {receptor["nombre"] if receptor else "usuario"}',
            'calificacion': {
                'puntuacion': puntuacion,
                'comentario': comentario,
                'receptor': receptor['nombre'] if receptor else 'Usuario'
            }
        })
        
    except Exception as e:
        print(f"❌ Error en submit_new_rating: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False, 
            'message': f'Error interno: {str(e)}'
        }), 500


# ============================================================
# 4. VERIFICAR SI PUEDE CALIFICAR
# ============================================================

@app.route('/api/check_can_rate/<int:acuerdo_id>', methods=['GET'])
def check_can_rate(acuerdo_id):
    """Verifica si el usuario puede calificar un acuerdo específico"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({
                'success': False, 
                'can_rate': False,
                'message': 'No autenticado'
            }), 401
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Verificar el acuerdo
        cursor.execute("""
            SELECT 
                al.ID_Acuerdo,
                al.ID_Trabajador,
                al.Estado,
                ot.ID_Agricultor,
                ot.Titulo,
                CONCAT(ut.Nombre, ' ', ut.Apellido) as trabajador_nombre,
                CONCAT(ua.Nombre, ' ', ua.Apellido) as agricultor_nombre
            FROM Acuerdo_Laboral al
            INNER JOIN Oferta_Trabajo ot ON al.ID_Oferta = ot.ID_Oferta
            INNER JOIN Usuario ut ON al.ID_Trabajador = ut.ID_Usuario
            INNER JOIN Usuario ua ON ot.ID_Agricultor = ua.ID_Usuario
            WHERE al.ID_Acuerdo = %s
        """, (acuerdo_id,))
        
        acuerdo = cursor.fetchone()
        
        if not acuerdo:
            cursor.close()
            conn.close()
            return jsonify({
                'success': True,
                'can_rate': False,
                'message': 'Acuerdo no encontrado'
            })
        
        # Determinar receptor
        if user_id == acuerdo['ID_Trabajador']:
            receptor_id = acuerdo['ID_Agricultor']
            receptor_nombre = acuerdo['agricultor_nombre']
            user_role = 'Trabajador'
        elif user_id == acuerdo['ID_Agricultor']:
            receptor_id = acuerdo['ID_Trabajador']
            receptor_nombre = acuerdo['trabajador_nombre']
            user_role = 'Agricultor'
        else:
            cursor.close()
            conn.close()
            return jsonify({
                'success': True,
                'can_rate': False,
                'message': 'No eres parte de este acuerdo'
            })
        
        # Verificar si está finalizado
        if acuerdo['Estado'] != 'Finalizado':
            cursor.close()
            conn.close()
            return jsonify({
                'success': True,
                'can_rate': False,
                'message': 'El trabajo aún no ha finalizado'
            })
        
        # Verificar si ya calificó
        cursor.execute("""
            SELECT ID_Calificacion 
            FROM Calificacion 
            WHERE ID_Acuerdo = %s AND ID_Usuario_Emisor = %s
        """, (acuerdo_id, user_id))
        
        ya_califico = cursor.fetchone() is not None
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'can_rate': not ya_califico,
            'already_rated': ya_califico,
            'info': {
                'trabajo_titulo': acuerdo['Titulo'],
                'receptor_id': receptor_id,
                'receptor_nombre': receptor_nombre,
                'user_role': user_role
            },
            'message': 'Ya has calificado este trabajo' if ya_califico else 'Puedes calificar este trabajo'
        })
        
    except Exception as e:
        print(f"❌ Error en check_can_rate: {e}")
        return jsonify({
            'success': False, 
            'can_rate': False,
            'message': str(e)
        }), 500


# ============================================================
# 5. ELIMINAR UNA CALIFICACIÓN (SOLO SI ES PROPIA)
# ============================================================

@app.route('/api/remove_my_rating/<int:calificacion_id>', methods=['DELETE'])
def remove_my_rating(calificacion_id):
    """Eliminar una calificación propia"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({
                'success': False, 
                'message': 'No autenticado'
            }), 401
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Verificar que la calificación existe y es del usuario
        cursor.execute("""
            SELECT ID_Calificacion, ID_Usuario_Emisor
            FROM Calificacion
            WHERE ID_Calificacion = %s
        """, (calificacion_id,))
        
        calificacion = cursor.fetchone()
        
        if not calificacion:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': 'Calificación no encontrada'
            }), 404
        
        if calificacion['ID_Usuario_Emisor'] != user_id:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': 'No puedes eliminar calificaciones de otros usuarios'
            }), 403
        
        # Eliminar la calificación
        cursor.execute("""
            DELETE FROM Calificacion
            WHERE ID_Calificacion = %s
        """, (calificacion_id,))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"✅ Calificación {calificacion_id} eliminada por usuario {user_id}")
        
        return jsonify({
            'success': True,
            'message': 'Calificación eliminada correctamente'
        })
        
    except Exception as e:
        print(f"❌ Error en remove_my_rating: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


# ============================================================
# MENSAJES DE CONFIRMACIÓN
# ============================================================

print("=" * 70)
print("✅ ENDPOINTS DE CALIFICACIONES CARGADOS (sin conflictos)")
print("=" * 70)
print("📋 Rutas disponibles:")
print("   GET    /api/get_ratings_received      - Calificaciones recibidas")
print("   GET    /api/get_ratings_given         - Calificaciones dadas")
print("   POST   /api/submit_new_rating         - Enviar nueva calificación")
print("   GET    /api/check_can_rate/<id>       - Verificar si puede calificar")
print("   DELETE /api/remove_my_rating/<id>     - Eliminar calificación propia")
print("=" * 70)
print("💡 Uso básico:")
print("   # Obtener calificaciones recibidas")
print("   GET /api/get_ratings_received?user_id=123")
print("")
print("   # Enviar calificación")
print("   POST /api/submit_new_rating")
print("   Body: {")
print("     'acuerdo_id': 456,")
print("     'receptor_id': 789,")
print("     'puntuacion': 5,")
print("     'comentario': 'Excelente trabajo!'")
print("   }")
print("=" * 70)

# ================================================================.
# INICIO DEL SERVIDOR   
# ================================================================
if __name__ == '__main__':
    print("=" * 70)
    print("🌱 INICIANDO SERVIDOR AGROMATCH - VERSIÓN DASHBOARD SEPARADO")
    print("=" * 70)
    
    # Verificar estructura de archivos al inicio
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        print(f"📁 Directorio base: {base_dir}")
        
        # Verificar carpetas importantes
        folders_to_check = ['../vista', '../assent/css', '../js', '../img']
        
        for folder in folders_to_check:
            folder_path = os.path.join(base_dir, folder)
            folder_path = os.path.abspath(folder_path)
            
            if os.path.exists(folder_path):
                files_count = len(os.listdir(folder_path))
                print(f"✅ {folder}: {folder_path} ({files_count} archivos)")
            else:
                print(f"❌ {folder}: {folder_path} (NO EXISTE)")
        
        # Verificar específicamente los archivos del dashboard
        print("\n📊 Verificando archivos del dashboard:")
        dashboard_files = {
            'HTML': '../vista/dashboard-agricultor.html',
            'CSS': '../vista/styles.css',
            'JS': '../vista/script.js'
        }
        
        for file_type, file_path in dashboard_files.items():
            full_path = os.path.join(base_dir, file_path)
            full_path = os.path.abspath(full_path)
            
            if os.path.exists(full_path):
                print(f"✅ {file_type}: {full_path}")
            else:
                print(f"❌ {file_type}: {full_path} (NO EXISTE)")
        
    except Exception as e:
        print(f"⚠️ Error verificando estructura: {e}")
    
    print("\n" + "=" * 70)
    print("📍 URLs principales:")
    print("🧪 http://localhost:5000/test")
    print("🔍 http://localhost:5000/check_files")
    print("🔐 http://localhost:5000/check_session")
    print("✅ http://localhost:5000/validate_session")
    print("👤 http://localhost:5000/get_user_session")
    print("🏠 http://localhost:5000/")
    print("👷 http://localhost:5000/vista/login-trabajador.html")
    print("🌾 http://localhost:5000/vista/login-trabajador.html")
    print("📝 http://localhost:5000/vista/registro-trabajador.html")
    print("📝 http://localhost:5000/vista/registro-agricultor.html")
    print("\n🎯 NUEVO DASHBOARD SEPARADO:")
    print("🌱 http://localhost:5000/vista/dashboard-agricultor.html")
    print("📄 http://localhost:5000/styles.css")
    print("⚙️ http://localhost:5000/script.js")
    print("👷 http://localhost:5000/vista/index-trabajador.html")
    print("📄 http://localhost:5000/index-trabajador.css")
    print("⚙️ http://localhost:5000/index-trabajador.js")
    print("=" * 70)
    print("🔧 Funcionalidades del dashboard:")
    print("• Archivos HTML, CSS y JS separados")
    print("• Menú de usuario completo con dropdown")
    print("• Modal de confirmación para logout")
    print("• Integración completa con backend Python")
    print("• Validación de sesiones en tiempo real")
    print("• Responsive design")
    print("=" * 70)
    print("💡 Para probar:")
    print("1. Registra un usuario como 'Agricultor'")
    print("2. Inicia sesión")
    print("3. Accede al dashboard del agricultor")
    print("4. Prueba el menú de usuario (clic en avatar)")
    print("5. Prueba el logout con confirmación")
    print("=" * 70)
    
    app.run(debug=True, host='0.0.0.0', port=5000)