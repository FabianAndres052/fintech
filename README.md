# 🏦 FINTECH — Plataforma de Administración de Préstamos y Cartera

Plataforma financiera y contable profesional desarrollada con **Next.js 16 (App Router + Turbopack)**, **React 19**, **TypeScript**, **Tailwind CSS**, y base de datos persistente **MySQL (ACID Transactions)**.

---

## 🚀 Características Principales

- **Multiplataforma & Responsive:** Adaptado para computadores de escritorio, portátiles, tablets y teléfonos móviles.
- **PWA Instalable (Android & iOS):** Service Worker activo, `manifest.json` y meta-etiquetas optimizadas para instalación directa como aplicación nativa en la pantalla de inicio.
- **Autenticación Administrativa Segura:** Inicio de sesión exclusivo para administrador con hashing Bcrypt (cost 12), tokens JWT en cookies HttpOnly y protección perimetral mediante Next.js Proxy.
- **Directorio de Clientes:** Registro integral con documento (CC, CE, NIT, Pasaporte), datos de contacto, estado (Activo, Bloqueado, Inactivo), historial de créditos y pagos vinculados.
- **Calculadora y Amortización Financiera:**
  - Plazos semanales, quincenales y mensuales.
  - Reglas de negocio dinámicas (montos de $100.000 a $10.000.000 COP, plazos máximos diferenciados por capital).
  - Exactitud matemática al centavo sin descuadre en la última cuota.
- **Gestión de Recaudos y Pagos en Cascada:**
  - Separación estricta entre **Capital Recuperado** (retorno del fondo) e **Intereses Cobrados** (ganancia neta realizada).
  - Generación de comprobantes de pago oficiales.
  - Envío y compartición inmediata por **WhatsApp** y opción de impresión.
- **Cronograma de Cobranza & Moras:**
  - Detección automática en tiempo real de cuotas vencidas (`VENCIDA`) y préstamos en mora (`EN_MORA`).
  - Botón de recordatorio de cobro directo a WhatsApp con mensaje personalizado.
- **Libro Mayor de Caja & Flujo de Fondos:** Registro inmutable de ingresos, desembolsos, aportes y retiros de capital con saldo verificado tras cada operación.
- **Contabilidad & Balance General:** Reporte de rentabilidad neta deduciendo gastos operativos, con exportación a **Excel (.xlsx)** y **PDF oficial**.
- **Centro de Auditoría:** Trazabilidad completa con dirección IP, usuario y marca de tiempo de cada acción realizada.

---

## 🛠️ Tecnologías

| Capa | Tecnología |
| :--- | :--- |
| **Framework** | Next.js 16.4.5 (Turbopack, App Router) |
| **Frontend** | React 19, Lucide Icons, Tailwind CSS v4 |
| **Backend** | Next.js API Routes (Serverless Functions) |
| **Seguridad** | JWT (`jsonwebtoken`), Bcrypt (`bcryptjs`), HttpOnly Cookies, Next.js Proxy |
| **Base de Datos** | MySQL 8.x con Pool de Conexiones (`mysql2/promise`) y Transacciones ACID |
| **Exportaciones** | `xlsx` (Excel), `jspdf` & `jspdf-autotable` (PDF) |
| **PWA** | Web App Manifest, Service Worker Cache |

---

## 🔑 Credenciales Predeterminadas de Administrador

- **Correo:** `admin@prestamos.com`
- **Contraseña:** `Admin123*`

*(Puede modificar la contraseña en cualquier momento desde el módulo de **Configuración**)*

---

## 💻 Instalación y Ejecución Local

### 1. Clonar o ingresar al proyecto
```bash
cd "Sistema Prestamos"
npm install
```

### 2. Configurar la Base de Datos MySQL
1. Abra MySQL Workbench, XAMPP (phpMyAdmin), DBeaver o la consola de MySQL.
2. Ejecute el script SQL incluido en `database/schema.sql`. Este creará la base de datos `prestamos_db`, todas las tablas normalizadas, las reglas de negocio y el administrador inicial.

### 3. Configurar el archivo `.env.local`
Cree o verifique el archivo `.env.local` en la raíz del proyecto:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_contrasena_mysql
DB_NAME=prestamos_db
DB_SSL=false

JWT_SECRET=super_secure_jwt_secret_fintech_prestamos_2026_colombia_x99!

NEXT_PUBLIC_APP_NAME="FINTECH"
NEXT_PUBLIC_CURRENCY="COP"
```

### 4. Iniciar el Servidor de Desarrollo
```bash
npm run dev
```
Abra [http://localhost:3000](http://localhost:3000) en su navegador.

---

## ☁️ Despliegue en Vercel

### 1. Base de Datos en la Nube
Para que Vercel pueda conectar con MySQL, la base de datos debe ser accesible por internet. Opciones recomendadas y gratuitas:
- **TiDB Cloud (Serverless MySQL):** Totalmente compatible con MySQL 8.0, ofrece SSL gratuito y alta disponibilidad.
- **Railway / Aiven:** Permiten crear una instancia MySQL en 1 clic.
- **PlanetScale o Clever Cloud.**

Importe el contenido de `database/schema.sql` en su base de datos en la nube.

### 2. Despliegue en Vercel
1. Suba el código a su repositorio de **GitHub** o **GitLab**.
2. Inicie sesión en [vercel.com](https://vercel.com) y haga clic en **"Add New Project"**.
3. Seleccione el repositorio del proyecto.
4. En la sección **Environment Variables**, agregue:
   - `DATABASE_URL` (cadena de conexión de su proveedor, ej: `mysql://user:pass@host:3306/db?ssl={"rejectUnauthorized":true}`) **O** configure individualmente:
     - `DB_HOST`: Host de la base de datos en la nube.
     - `DB_PORT`: Puerto (generalmente 3306 o 4000).
     - `DB_USER`: Usuario.
     - `DB_PASSWORD`: Contraseña.
     - `DB_NAME`: `prestamos_db` (o el nombre de su BD).
     - `DB_SSL`: `true`
   - `JWT_SECRET`: Una clave secreta alfanumérica segura.
   - `NEXT_PUBLIC_APP_NAME`: `FINTECH`
   - `NEXT_PUBLIC_CURRENCY`: `COP`
5. Haga clic en **"Deploy"**. Vercel compilará automáticamente la aplicación y la publicará con certificado SSL (HTTPS) activado.

---

## 📱 Instalación como PWA (Móvil)

### Android (Chrome / Edge):
1. Ingrese a la URL de la aplicación desde Chrome.
2. Aparecerá automáticamente el banner inferior **"Instalar Aplicación"**.
3. Pulse **"Instalar"** para agregarla a su cajón de aplicaciones.

### iOS (Safari en iPhone / iPad):
1. Ingrese a la URL de la aplicación desde Safari.
2. Toque el botón **Compartir** (icono de cuadro con flecha hacia arriba).
3. Seleccione la opción **"Agregar a pantalla de inicio"** (Add to Home Screen).
4. La aplicación se abrirá a pantalla completa sin barras de navegador.
