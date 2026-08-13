# 🍦 Heladería SaaS

Plataforma **SaaS multi-tenant** para heladerías. Una sola aplicación da servicio
a muchas heladerías; cada una (un _tenant_) solo ve y gestiona sus propios datos.

- **Cliente final (anónimo):** escanea el QR de su mesa, ve la carta de esa
  heladería, personaliza productos, añade al carrito y envía el pedido.
- **Personal (con login):** panel de **comandas en tiempo real** y gestión de
  catálogo, promociones, mesas/QR y ajustes.

## Stack

- **Next.js (App Router) + TypeScript**
- **Tailwind CSS v4 + shadcn/ui** (responsive móvil-first)
- **Supabase** (PostgreSQL + Auth + Storage + Realtime), con **RLS** para el
  aislamiento multi-tenant
- Despliegue en **Vercel**

## Estructura del proyecto

```
app/
  (auth)/            login, registro, activar-cuenta, onboarding (fallback)
  (dashboard)/dashboard/   comandas, catalogo, promociones, mesas, ajustes
  (publico)/[slug]/  carta pública por heladería + confirmación
  api/
    pedidos/         creación/validación de pedidos (servidor)
lib/
  supabase/          client.ts, server.ts, proxy.ts, admin.ts
  planes.ts          catálogo de planes y estado de la suscripción
  pedidos/crear.ts   lógica de creación con recálculo de precios en servidor
  validation/        esquemas Zod
components/          ui/ (shadcn) + dashboard/ + publico/
store/cart.ts        carrito (Zustand + persistencia en localStorage)
types/               tipos de la BD y de dominio
supabase/migrations/ SQL: esquema, RLS, storage, realtime
```

## Puesta en marcha (local)

### 1. Requisitos

- Node.js 20+ (probado con 22)
- Una cuenta de [Supabase](https://supabase.com)

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Supabase

1. Crea un proyecto en Supabase.
2. En el **SQL Editor**, ejecuta **en orden** los archivos de
   `supabase/migrations/`:
   - `0001_schema.sql` — tablas, tipos e índices
   - `0002_rls.sql` — RLS, `heladeria_actual()` y `onboarding_crear_heladeria()`
   - `0003_storage.sql` — bucket `imagenes` y políticas
   - `0004_realtime.sql` — Realtime en `pedidos` y `pedido_items`
   - `0005_asistente.sql` — rol de los grupos de opciones y nº de sabores
   - `0006_categoria_asistente.sql` — asistente de helado a nivel de categoría
   - `0007_estadisticas.sql` — funciones de agregación del panel de estadísticas
   - `0008_asistente_generico.sql` — asistente para cualquier categoría (icono y
     textos configurables)
   - `0009_combo_asistente.sql` — combos por pasos: el cliente elige un producto
     en cada paso y el precio es fijo
   - `0010_planes.sql` — planes de suscripción Pro y Business
   - `0011_onboarding_plan.sql` — alta con el plan elegido (ejecútalo **después**
     de `0010`, en otra ejecución: Postgres no admite usar un valor de enum
     recién creado en la misma transacción)
   - `0012_suscripcion.sql` — gestión del plan desde ajustes: cancelación al
     final del periodo pagado, reanudación y cambio de plan
   - `0013_stripe.sql` — cobro real con Stripe Billing: columnas de
     suscripción, RLS por estado de pago y protección de esas columnas
   - `0014_alta_pago_previo.sql` — función interna para el alta con pago
     primero (recuperar el usuario si el webhook se reintenta a medio
     terminar)
   - `0015_plan_basic.sql` / `0016_plan_basic_defecto.sql` — nuevo plan de
     entrada Basic: valor del enum, nuevo default y onboarding
   - `0017_valoraciones_app.sql` — valoración de la app por heladería (una
     por heladería), con RLS para el modal del panel y la sección de reseñas
     de la landing
   - `0018_alergenos.sql` — los 14 alérgenos UE por producto, base del
     [Asistente IA de la carta](#asistente-ia-de-la-carta)

   > Alternativamente, con la [CLI de Supabase](https://supabase.com/docs/guides/cli):
   > `supabase link` y `supabase db push`.

3. En **Authentication → URL Configuration**, pon el **Site URL** de
   producción (`https://www.cremmo.app`) y añade la misma URL a **Redirect
   URLs**. El alta usa `inviteUserByEmail`, así que el email que reciben las
   heladerías nuevas enlaza siempre contra el Site URL configurado ahí, no
   contra `NEXT_PUBLIC_SITE_URL`.

4. (Opcional) Regenera los tipos con:
   ```bash
   npx supabase gen types typescript --project-id <REF> --schema public > types/database.types.ts
   ```

### 4. Variables de entorno

Copia `.env.example` a `.env.local` y rellena los valores:

```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: en
  **Project Settings → API**.
- `SUPABASE_SERVICE_ROLE_KEY`: misma pantalla (⚠️ **solo servidor**, nunca la
  expongas en el cliente).
- `NEXT_PUBLIC_SITE_URL`: `http://localhost:3000` en local.
- `SESSION_SECRET`: firma la cookie de sesión de mesa (ver más abajo). Genera
  una cadena aleatoria propia, por ejemplo con
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC`,
  `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`, `STRIPE_PORTAL_CONFIG`: cobro de
  la suscripción, ver [Planes y cobro con Stripe](#planes-y-cobro-con-stripe).
  En local usa siempre claves `sk_test_...`.
- `ANTHROPIC_API_KEY` y, si quieres cambiar de modelo, `ANTHROPIC_MODEL`: ver
  [Asistente IA de la carta](#asistente-ia-de-la-carta). Sin la clave el
  asistente simplemente no se muestra.

### 5. Arrancar

```bash
npm run dev
```

Abre <http://localhost:3000>.

## Flujo de uso

1. **Regístrate** en `/registro`: elige plan y paga en Stripe Checkout. No se
   crea ninguna cuenta hasta que el pago se confirma (ver siguiente sección);
   entonces llega un email para fijar la contraseña y entras directo al panel
   como `owner`, con dos mesas de ejemplo ya creadas.
2. En **Catálogo** crea categorías, productos (con foto) y grupos de opciones.
3. En **Mesas y QR**, genera/descarga/imprime el QR de cada mesa (apunta a
   `/m/<token>`).
4. Escanea el QR para ver la carta pública, personalizar y **enviar un
   pedido**. La sesión abierta al escanear caduca a los 30 minutos (ver
   siguiente sección).
5. El pedido aparece **en tiempo real** en **Comandas**; cambia su estado
   (`pendiente → en_preparación → listo → entregado`).

## Planes y cobro con Stripe

Cada heladería elige plan al registrarse y se cobra por meses anticipados con
Stripe Billing. El catálogo de planes y sus precios (IVA incluido) están en
`lib/planes.ts`; los precios equivalentes en Stripe los crea
`npm run stripe:setup`.

**Stripe es la fuente de verdad.** La tabla `heladerias` solo cachea su estado
en `suscripcion_estado` (`pendiente`, `activa`, `impago`, `cancelada`),
`cancelada_en`, `periodo_fin`, `stripe_customer_id` y
`stripe_subscription_id`. Esas columnas las escribe únicamente
`lib/stripe/suscripcion.ts` con la clave service_role, llamada desde el webhook
y desde las acciones del panel; un trigger rechaza cualquier update directo de
los roles `anon` y `authenticated`.

Flujo:

1. **Alta: pago primero, cuenta después.** `/registro` no toca Supabase para
   nada: solo abre un Stripe Checkout con los datos del formulario guardados en
   su metadata (`lib/stripe/alta.ts`, `iniciarCheckoutAlta`). Si el cliente
   abandona el pago, no queda ninguna cuenta a medio crear.
2. **Confirmación** (`checkout.session.completed`, en el webhook o en
   `/api/stripe/retorno` si llega antes): `completarAlta()` invita al usuario
   por email (`inviteUserByEmail`), crea la heladería, el perfil `owner` y dos
   mesas de ejemplo, y sincroniza la suscripción. Es idempotente, por si Stripe
   reintenta el webhook.
3. **Activación** (`/activar-cuenta`): el email de invitación lleva los tokens
   de sesión en el propio enlace (no admite PKCE al ser un alta por email, no
   por navegador); esa pantalla los recoge, pide una contraseña y entra al
   panel.
4. **Webhook** (`/api/stripe/webhook`): además del alta, procesa renovaciones,
   cambios de plan, impagos y bajas de heladerías que ya existían. Es lo que
   mantiene el estado al día.
5. **Ajustes → Tu plan**: cambiar de plan (Stripe prorratea), cancelar
   (`cancel_at_period_end`, el servicio sigue hasta `periodo_fin`), reanudar, y
   un acceso al **portal de cliente** de Stripe para la tarjeta y las facturas.
6. **Impago**: mientras Stripe reintenta el cobro (`past_due`) el servicio
   **no** se corta; se avisa en el panel. El corte llega cuando Stripe da la
   suscripción por cancelada.

### Puesta en marcha de Stripe

```bash
# 1. Productos, precios, portal de cliente y webhook, en el modo (test o live)
#    al que pertenezca STRIPE_SECRET_KEY
npm run stripe:setup

# 2. En local, reenvía los webhooks con el Stripe CLI
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

`scripts/stripe-setup.mjs` es idempotente y al terminar imprime las variables
que hay que pegar en `.env.local` y en Vercel: `STRIPE_PRICE_PRO`,
`STRIPE_PRICE_BUSINESS`, `STRIPE_PORTAL_CONFIG` y, si acaba de crear el
endpoint, `STRIPE_WEBHOOK_SECRET` (Stripe solo enseña ese secreto al crearlo;
si el endpoint ya existía hay que releerlo desde el dashboard). El webhook se
da de alta en `STRIPE_APP_URL/api/stripe/webhook` con los seis eventos que
atiende la ruta.

Queda una cosa por hacer a mano en el dashboard: activar **Stripe Tax** con la
dirección de origen y el registro de IVA en España, porque la fecha de alta del
registro es una declaración fiscal que no conviene automatizar.

> El modelo conserva `heladerias.stripe_account_id`, `pedidos.estado_pago` y
> `pedidos.stripe_payment_intent_id` del diseño inicial, por si algún día se
> retoma el pago del cliente final (hoy no se usa).

## Asistente IA de la carta

Chat en la carta pública (planes **Pro** y **Business**) que recomienda de la
carta, responde dudas de alérgenos y propone complementos para subir el ticket
medio. Se apoya en Anthropic (Claude).

- **Gating**: `tieneAsistenteIA()` en `lib/planes.ts`. La carta esconde el botón
  cuando el plan no lo incluye o falta `ANTHROPIC_API_KEY`, y
  `/api/asistente` vuelve a comprobar plan y suscripción por su cuenta: no se
  fía de lo que llegue del navegador.
- **Contexto**: `lib/asistente/catalogo.ts` arma la carta de la heladería
  (productos con precio y alérgenos, asistentes por pasos con sus opciones y
  combos pedibles) con referencias cortas tipo `p3`, `a1`, `k2`.
- **Respuesta**: el modelo contesta siempre a través de una herramienta
  (`lib/asistente/responder.ts`) que devuelve el texto del chat y las
  referencias de lo que sugiere. Cualquier referencia que no exista en la carta
  se descarta, así que **no puede recomendar algo que no esté a la venta**.
- **Añadir al pedido**: el chat solo muestra botones; quien resuelve cada
  sugerencia es la carta (`components/publico/catalogo-publico.tsx`). Un
  producto sin opciones entra directo al carrito y el chat sigue abierto; lo que
  hay que configurar abre el asistente de pasos o el combo. **Nunca se añade
  nada sin que el cliente lo toque.**
- **Alérgenos**: se marcan por producto en **Catálogo → producto** (los 14 de
  declaración obligatoria, `lib/alergenos.ts`). El asistente solo afirma lo
  declarado; si un producto no tiene datos, o preguntan por sabores y toppings
  (que van por opción y todavía no los declaran), remite al personal. La carta
  los muestra también al confirmar el producto.
- **Coste**: el endpoint es público, así que hay un límite por IP y heladería
  (`lib/rate-limit.ts`, 15 mensajes/minuto) y el modelo por defecto es el más
  barato (`claude-haiku-4-5`). El límite es en memoria de cada instancia: si
  algún día hace falta algo serio, ese archivo es el sitio.

## Sesión de mesa (caducidad del QR)

El QR de cada mesa no enlaza directamente a la carta, sino a `/m/<token>`
(`app/m/[token]/route.ts`), que valida el token y planta una cookie `httpOnly`
firmada (`lib/mesa-session.ts`, `SESSION_SECRET`) antes de redirigir a
`/<slug>?mesa=<token>`. Esa cookie es la sesión de mesa: dura 30 minutos y solo
vale para el token con el que se creó.

- Con la cookie caducada, ausente o de otra mesa, la carta se sustituye por
  entero por una pantalla de "sesión caducada" (`app/(publico)/[slug]/page.tsx`),
  y `/api/pedidos` rechaza igualmente cualquier pedido con `mesa_token`.
- Un enlace guardado o reenviado con `?mesa=<token>` sin pasar por `/m/<token>`
  nunca llega a tener cookie, así que no da acceso indefinido a la carta: hay
  que volver a escanear el QR.
- El acceso general sin mesa (`/<slug>`, para llevar) no pasa por esta cookie
  y no caduca.
- El carrito se vacía automáticamente al detectar la caducidad, tanto por un
  temporizador en cliente como al intentar enviar un pedido ya caducado.

## Seguridad multi-tenant

- **RLS activado en todas las tablas.** El personal solo accede a filas cuyo
  `heladeria_id` coincide con el de su perfil (`heladeria_actual()`).
- El **catálogo** es de lectura pública (`anon`) pero siempre se consulta
  filtrando por una heladería (`slug`) o mesa (`token`).
- La **creación de pedidos** pasa por el backend (`/api/pedidos`), que
  **recalcula el total en el servidor** a partir de la BD; nunca confía en los
  importes del cliente.

## Despliegue en Vercel

1. Sube el repositorio a GitHub/GitLab e impórtalo en Vercel.
2. En **Settings → Environment Variables**, añade todas las de `.env.example`
   (con `NEXT_PUBLIC_SITE_URL` apuntando a tu dominio de producción).
3. Deploy. El `proxy` refresca la sesión de Supabase en cada request.

## Scripts

```bash
npm run dev     # desarrollo
npm run build   # build de producción
npm run start   # servir el build
npm run lint    # ESLint
```
