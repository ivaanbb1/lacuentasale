# LaCuentaSale

Panel web para gestionar ventas, ingredientes e inventario de un negocio pequeño.

## Funcionalidades

- Resumen de ventas, facturación, inventario y alertas de stock.
- Alta de ingredientes.
- Edición rápida de stock y stock mínimo.
- Eliminación de ingredientes.
- Registro de ventas con uno o varios ingredientes.
- Descuento automático de stock desde el backend.
- Sección Business Intelligence preparada para Power BI.
- Métricas derivadas: ticket medio, producto más movido y salud del stock.
- Diseño responsive para escritorio y móvil.

## Estructura

\`\`\`text
lacuentasale/
  backend/   API Node + Express + MySQL
  frontend/  React + Vite
\`\`\`

## Base de datos

Puedes crear las tablas importando el archivo:

```powershell
mysql -u tu_usuario -p < database/schema.sql
```

## Analítica y Power BI

LaCuentaSale está pensado como proyecto de operaciones y análisis de datos. La app web recoge ventas e inventario; esos datos pueden alimentar informes en Power BI para analizar:

- beneficios y facturación,
- productos más vendidos,
- rotación de stock,
- necesidades de reposición,
- evolución de ventas por periodo.

El frontend incluye una sección **Business Intelligence** con KPIs calculados desde la API y un espacio preparado para embeber un informe Power BI.

Para conectar un informe publicado, crea un archivo en frontend:

```powershell
cd frontend
copy .env.example .env
```

Y añade la URL del informe:

```env
VITE_POWERBI_REPORT_URL=https://app.powerbi.com/reportEmbed?...
```

Si no hay URL configurada, la app muestra un panel de integración lista para portfolio.

## Configuración del backend

Copia el archivo de ejemplo:

\`\`\`powershell
cd backend
copy .env.example .env
\`\`\`

Edita \`.env\` con tus datos reales de MySQL. No subas ese archivo a GitHub.

## Instalar dependencias

Backend:

\`\`\`powershell
cd backend
npm install
\`\`\`

Frontend:

\`\`\`powershell
cd frontend
npm install
\`\`\`

## Arrancar el proyecto

En una terminal:

\`\`\`powershell
cd backend
npm run dev
\`\`\`

En otra terminal:

\`\`\`powershell
cd frontend
npm run dev
\`\`\`

Abre la URL que indique Vite, normalmente:

\`\`\`text
http://localhost:5173
\`\`\`

## Seguridad antes de subir a GitHub

El archivo \`.env\` contiene credenciales y está ignorado por Git. Sube solo \`.env.example\`.
