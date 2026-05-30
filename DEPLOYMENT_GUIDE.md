# 📦 Guía de Despliegue en Render

## ✅ Configuración Actual

Tu proyecto está listo para desplegar. El `render.yaml` contiene:

```
✓ Backend Node.js (Express)
✓ Frontend Vite (SPA)  
✓ PostgreSQL Database
✓ Environment variables configuradas
```

## 🚀 Pasos de Despliegue (Recomendado - SIN Docker)

### 1. Preparar el Repositorio Git
```bash
# Asegúrate que todo esté en Git
git add .
git commit -m "Ready for Render deployment"
git push
```

### 2. Crear Cuenta en Render
- Ve a https://render.com
- Regístrate con GitHub
- Conecta tu repositorio

### 3. Crear Web Service desde render.yaml
- En Render Dashboard → New → Web Service
- Selecciona tu repositorio
- Render detectará automáticamente `render.yaml`
- Click "Deploy"

### 4. Configurar Variables de Entorno
En Render Dashboard → Environment Variables:

```
CLOUDINARY_CLOUD_NAME = tu_cloud_name
CLOUDINARY_API_KEY = tu_api_key
CLOUDINARY_API_SECRET = tu_api_secret
NODE_ENV = production
```

### 5. Verificar Despliegue
- Backend: `https://bingo-backend.onrender.com`
- Frontend: `https://bingo-frontend.onrender.com`

---

## 🐳 Opción Alternativa: Despliegue con Docker

Si prefieres usar Docker en Render:

### 1. Usar Docker Registry (Docker Hub)
```bash
# Construir imágenes localmente
docker build -t tuusuario/bingo-backend ./backend
docker build -t tuusuario/bingo-frontend ./frontend

# Subir a Docker Hub
docker push tuusuario/bingo-backend
docker push tuusuario/bingo-frontend
```

### 2. En Render
- New → Web Service
- Conectar Docker Hub Registry
- Seleccionar imagen de backend
- Agregar variables de entorno

---

## ⚠️ Notas Importantes

### Base de Datos
- Render proporciona PostgreSQL gratuito
- La conexión se configura automáticamente via `DATABASE_URL`
- En producción, asegúrate de usar SSL: `?ssl=require`

### Port
- Backend debe usar `PORT` desde variables de entorno (ya está en render.yaml)
- Frontend se sirve como estático en el puerto 3000

### Variables de Entorno
El `render.yaml` incluye un grupo `cloudinary-creds` - debes llenarlas en el dashboard.

### Límites del Plan Free
- Memoria: ~512MB
- CPU: Compartido
- Despliegue lento (~2-3 min)
- Servicio se pausa si no hay actividad por 15 min

---

## 🔗 URLs Importantes

- **Render Dashboard**: https://dashboard.render.com
- **Documentación**: https://render.com/docs
- **Status Page**: https://status.render.com
