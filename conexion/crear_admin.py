import sys
import os
sys.path.append('conexion')
from app import hash_password
from conexion import execute_query

# Hashear la contraseña
password = "admin123"
hashed_password = hash_password(password)

# Insertar en la base de datos
try:
    user_id = execute_query(
        """INSERT INTO Usuario (Nombre, Apellido, Correo, Contrasena, Rol, Estado) 
           VALUES (%s, %s, %s, %s, %s, %s)""",
        ("Admin", "Principal", "admin@agriwork.com", hashed_password, "Administrador", "Activo")
    )
    print(f"Usuario administrador creado exitosamente con ID: {user_id}")
    print("Email: admin@agriwork.com")
    print("Contraseña: admin123")
except Exception as e:
    print(f"Error creando usuario: {e}")