# LaCuentaSale

**LaCuentaSale** es un MVP full-stack para gestionar ventas, inventario y analítica de negocio en un pequeño comercio. El proyecto combina una app operativa con una capa preparada para Business Intelligence y Power BI.

## Objetivo del proyecto

El objetivo no es solo registrar ventas o stock, sino construir una base de datos útil para tomar decisiones:

- controlar el inventario disponible,
- registrar ventas con varios ingredientes/productos,
- detectar necesidades de reposición,
- analizar ticket medio y productos más movidos,
- preparar la conexión con dashboards de Power BI.

## Funcionalidades principales

- Dashboard con ventas, facturación, inventario y alertas.
- Alta de ingredientes o productos base.
- Edición rápida de stock y stock mínimo.
- Eliminación de ingredientes desde la tabla de inventario.
- Registro de ventas con uno o varios ingredientes.
- Descuento automático de stock desde el backend.
- Sección **Business Intelligence** preparada para Power BI.
- KPIs derivados desde la API: ticket medio, producto más movido y salud del stock.
- Diseño responsive para escritorio y móvil.
- Configuración segura con variables de entorno y archivos `.env.example`.

## Stack técnico

| Área | Tecnología |
| --- | --- |
| Frontend | React, Vite, CSS |
| Backend | Node.js, Express |
| Base de datos | MySQL |
| BI / Reporting | Power BI preparado para integración |
| Control de versiones | Git, GitHub |

## Estructura del proyecto

```text
lacuentasale/
  backend/        API Node + Express + MySQL
  database/       Script SQL para crear tablas
  frontend/       App React + Vite
  README.md       Documentación principal
```

## Analítica y Power BI

LaCuentaSale está pensado como proyecto de operaciones y análisis de datos. La app web recoge ventas e inventario; esos datos pueden alimentar informes en Power BI para analizar:

- beneficios y facturación,
- productos más vendidos,
- rotación de stock,
- necesidades de reposición,
- evolución de ventas por periodo.

El frontend incluye una sección **Business Intelligence** con KPIs calculados desde la API y un espacio preparado para conectar un informe de Power BI.

Para conectar un informe publicado, crea un archivo `.env` en `frontend` a partir del ejemplo:

```powershell
cd frontend
copy .env.example .env
```

Y añade la URL del informe:

```env
VITE_POWERBI_REPORT_URL=https://app.powerbi.com/reportEmbed?...
```

Si no hay URL configurada, la app muestra un panel visual indicando que la integración está preparada.

## Base de datos

Puedes crear las tablas importando el archivo SQL:

```powershell
mysql -u tu_usuario -p < database/schema.sql
```

El backend espera una base de datos MySQL configurada con las variables del archivo `.env`.

## Configuración del backend

Copia el archivo de ejemplo:

```powershell
cd backend
copy .env.example .env
```

Edita `.env` con tus datos reales de MySQL:

```env
DB_HOST=localhost
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_NAME=lacuentasale
DB_PORT=3306
```

El archivo `.env` real está ignorado por Git y no debe subirse a GitHub.

## Instalación

Backend:

```powershell
cd backend
npm install
```

Frontend:

```powershell
cd frontend
npm install
```

## Arranque en local

En una terminal, arranca el backend:

```powershell
cd backend
npm run dev
```

En otra terminal, arranca el frontend:

```powershell
cd frontend
npm run dev
```

Abre la URL que indique Vite, normalmente:

```text
http://localhost:5173
```

## Seguridad

Este repositorio incluye archivos `.env.example` para documentar las variables necesarias, pero no incluye credenciales reales.

No se deben subir a GitHub:

- `backend/.env`
- `frontend/.env`
- `node_modules/`
- archivos de build como `dist/`

## Estado del proyecto

Este proyecto está planteado como **MVP de portfolio**: una base funcional que demuestra frontend, backend, base de datos, analítica y preparación para Power BI.

No pretende ser todavía un software comercial completo. Para producción faltarían autenticación, roles, validaciones avanzadas, backups, tests, despliegue seguro y conexión real con Power BI Service.

## Próximas mejoras

- Conectar un informe real de Power BI.
- Añadir filtros por fechas y periodos.
- Calcular márgenes y beneficios por producto.
- Añadir login y roles de usuario.
- Incorporar un asistente IA para resumir métricas y detectar oportunidades de negocio.
