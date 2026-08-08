# Prompt para Cursor — Base de app SaaS para heladerías

> Copia todo lo que hay debajo de la línea y pégalo en Cursor (idealmente en el chat con el modo Agent/Composer, con un proyecto vacío abierto). Está redactado para que Cursor genere **la base** de la aplicación; luego irás iterando por fases.

---

Actúa como un ingeniero de software senior especializado en aplicaciones SaaS multi-tenant. Vamos a construir, por fases, la **base** de una aplicación para heladerías. En este primer paso quiero que montes el andamiaje completo y funcional del MVP base; no intentes implementar cada detalle perfecto, sino una base sólida, bien estructurada y sobre la que yo pueda seguir construyendo.

## 1. Contexto y objetivo del producto

Es una plataforma **SaaS multi-tenant**: una misma aplicación que da servicio a muchas heladerías distintas, donde cada heladería (tenant) solo ve y gestiona sus propios datos. El objetivo es que sea replicable a cualquier heladería de España sin duplicar código.

Hay dos tipos de usuario:

- **Cliente final (anónimo, sin cuenta):** llega a la heladería, se sienta, escanea un QR en la mesa, accede al catálogo de ESA heladería, elige productos (incluyendo productos personalizados), y envía el pedido. Opcionalmente paga antes de enviarlo.
- **Personal de la heladería (con cuenta / login):** accede a un panel donde ve y gestiona los pedidos en tiempo real, y a otro panel donde crea categorías, productos (con foto, título, descripción y precio), opciones de personalización y promociones.

## 2. Stack técnico (obligatorio)

- **Next.js (App Router) + TypeScript**
- **Tailwind CSS + shadcn/ui** para la UI (responsive real: debe verse y funcionar perfecto en smartphone y en desktop)
- **Supabase** para base de datos (PostgreSQL), Auth y Storage (fotos de productos)
- **Stripe** para pagos del cliente final (detrás de un feature flag, ver sección 8)
- Despliegue previsto en **Vercel**
- Usa las versiones estables actuales de cada SDK (`@supabase/supabase-js`, `@supabase/ssr`, `stripe`, etc.). Si hay dudas de API, prioriza la documentación oficial más reciente.

Configura el cliente de Supabase correctamente para App Router: cliente de navegador, cliente de servidor y middleware de sesión usando `@supabase/ssr`.

## 3. Arquitectura multi-tenant (crítico)

- Cada heladería es un **tenant**. Prácticamente todas las tablas de negocio llevan una columna `heladeria_id`.
- El aislamiento de datos se hace con **Row Level Security (RLS)** en Supabase, activado en todas las tablas.
- El personal de una heladería solo puede leer/escribir filas cuyo `heladeria_id` coincida con la heladería a la que pertenece su perfil.
- El cliente final es anónimo. El catálogo (categorías, productos, promociones activos) debe poder leerse públicamente pero **siempre acotado a una heladería concreta**. La creación de pedidos por parte del cliente debe hacerse a través de una Route Handler / Server Action del backend que valide los datos (nunca confiando en un insert directo desde el navegador sin validación).

## 4. Modelo de datos (crea las migraciones SQL en Supabase)

Genera migraciones SQL con estas tablas (ajusta tipos y nombres si mejora la calidad, pero respeta la estructura). Usa `uuid` como PK, `created_at timestamptz default now()`, y añade índices en las FK y en `heladeria_id`.

- **heladerias**: `id`, `nombre`, `slug` (único, para la URL pública), `logo_url`, `direccion`, `telefono`, `plan` (enum: `basico`, `multi_sede`; default `basico`), `acepta_pagos_online` (boolean, default `false`), `stripe_account_id` (nullable, para Stripe Connect en el futuro), `activa` (boolean, default `true`).
- **perfiles**: `id` (FK a `auth.users`), `heladeria_id` (FK), `nombre`, `rol` (enum: `owner`, `staff`; default `owner`). Vincula cada usuario autenticado con su heladería.
- **mesas**: `id`, `heladeria_id`, `nombre` (ej. "Mesa 1"), `token` (único, es lo que codifica el QR), `activa` (boolean, default `true`).
- **categorias**: `id`, `heladeria_id`, `nombre`, `orden` (int).
- **productos**: `id`, `heladeria_id`, `categoria_id` (FK), `nombre`, `descripcion`, `precio` (numeric(10,2)), `foto_url`, `disponible` (boolean, default `true`), `orden` (int).
- **grupos_opciones** (para la personalización): `id`, `heladeria_id`, `producto_id` (FK, nullable si quieres que sean reutilizables), `nombre` (ej. "Tamaño", "Sabores", "Toppings"), `tipo` (enum: `unica`, `multiple`), `min_selecciones` (int), `max_selecciones` (int), `obligatorio` (boolean), `orden` (int).
- **opciones**: `id`, `grupo_id` (FK), `nombre`, `precio_extra` (numeric(10,2), default 0), `disponible` (boolean, default `true`), `orden` (int).
- **promociones**: `id`, `heladeria_id`, `tipo` (enum: `descuento`, `combo`), `nombre`, `descripcion`, `foto_url`, `precio_promocional` (numeric, nullable), `porcentaje_descuento` (numeric, nullable), `activa` (boolean, default `true`), `fecha_inicio` (nullable), `fecha_fin` (nullable).
- **promocion_items** (los productos que componen un combo o al que aplica un descuento): `id`, `promocion_id` (FK), `producto_id` (FK), `cantidad` (int, default 1).
- **pedidos**: `id`, `heladeria_id`, `mesa_id` (FK), `estado` (enum: `pendiente`, `en_preparacion`, `listo`, `entregado`, `cancelado`; default `pendiente`), `estado_pago` (enum: `no_requerido`, `pendiente`, `pagado`, `fallido`; default `no_requerido`), `total` (numeric(10,2)), `notas` (text, nullable), `stripe_payment_intent_id` (nullable).
- **pedido_items**: `id`, `pedido_id` (FK), `producto_id` (FK, nullable), `nombre_producto` (snapshot del nombre en el momento del pedido), `cantidad` (int), `precio_unitario` (numeric, snapshot), `personalizaciones` (jsonb — array de opciones elegidas con su nombre y precio_extra), `subtotal` (numeric), `notas` (text, nullable).

> Importante: en `pedido_items` guarda snapshots del nombre y precio del producto, para que un cambio de precio futuro no altere pedidos históricos.

### RLS a configurar

- Activa RLS en todas las tablas.
- **perfiles / heladerias / mesas / categorias / productos / grupos_opciones / opciones / promociones / promocion_items / pedidos / pedido_items:** el personal autenticado solo accede a filas cuyo `heladeria_id` coincida con el de su perfil (crea una función helper SQL tipo `heladeria_actual()` que devuelva el `heladeria_id` del usuario logueado, y úsala en las políticas).
- **Lectura pública del catálogo:** permite `SELECT` a `anon` sobre `categorias`, `productos` (solo `disponible = true`), `promociones` (solo `activa = true`), `grupos_opciones`, `opciones` y `mesas` — pero pensado para consumirse siempre filtrando por una heladería concreta (por `slug` / `token` de mesa).
- **Creación de pedidos:** hazla vía backend (Route Handler / Server Action) con validación de precios en servidor (recalcula el total en el servidor, no confíes en el total que manda el cliente). No permitas al cliente anónimo insertar `pedidos` arbitrariamente sin pasar por esa validación.

### Realtime

Activa **Supabase Realtime** en `pedidos` y `pedido_items` para que el panel de comandas de la heladería se actualice en vivo cuando entra un pedido nuevo o cambia de estado.

### Storage

Crea un bucket de Storage para las fotos de productos y promociones, con políticas que permitan al personal de cada heladería subir/gestionar sus imágenes y lectura pública de las imágenes.

## 5. Flujo del cliente final (rutas públicas)

- Ruta pública por heladería: `/[slug]` y detección de la mesa vía query o segmento (ej. `/[slug]?mesa=[token]`). El QR de cada mesa apunta a esa URL.
- Pantalla de catálogo: cabecera con logo/nombre de la heladería, navegación por categorías, listado de productos con foto, título, descripción y precio.
- **Apartado "Personaliza":** al elegir un producto que tenga grupos de opciones, se abre un configurador donde el cliente selecciona opciones (respetando `tipo`, `obligatorio`, `min/max_selecciones`); el precio se recalcula sumando los `precio_extra`.
- **Apartado "Promociones":** sección visible donde se muestran los productos con descuento y los combos (ej. café + helado + botella de agua) con su precio promocional.
- **Carrito** persistente en el navegador (estado local, ej. Zustand o context; NO uses localStorage si esto corriera en un entorno que no lo soporte — aquí es una app web normal, localStorage está bien).
- **Checkout:** botón "Enviar pedido". 
  - Si la heladería tiene `acepta_pagos_online = false`: se crea el pedido directamente con `estado_pago = no_requerido` y `estado = pendiente`.
  - Si `acepta_pagos_online = true`: primero se paga con Stripe y, tras confirmarse el pago, se crea/confirma el pedido (ver sección 8).
- Tras enviar, pantalla de confirmación con el resumen del pedido.

## 6. Panel de la heladería (rutas protegidas)

Rutas bajo `/dashboard`, protegidas por Auth de Supabase (middleware que redirige a login si no hay sesión).

- **Login / registro** del personal (Supabase Auth con email + contraseña). En el registro/alta se asocia el usuario a una heladería (crea el flujo mínimo para que un usuario nuevo cree su heladería y quede como `owner`).
- **Panel de Comandas:** lista de pedidos en **tiempo real**, agrupados/filtrables por estado. Cada pedido muestra mesa, items (con sus personalizaciones), total y hora. El personal puede cambiar el estado del pedido (`pendiente → en_preparacion → listo → entregado`) y cancelarlo.
- **Panel de Gestión de Catálogo:**
  - CRUD de **categorías** (nombre, orden).
  - CRUD de **productos** (foto subida a Storage, título, descripción, precio, categoría, disponible).
  - CRUD de **grupos de opciones y opciones** para la personalización de productos.
  - CRUD de **promociones** (descuentos y combos), con selección de los productos que las componen.
- **Ajustes de la heladería:** editar nombre, logo, datos, gestionar mesas (y generar/mostrar el QR de cada mesa), y un toggle para `acepta_pagos_online`.

## 7. Generación de QR de mesas

En ajustes, permite crear mesas y generar el QR de cada una (usa una librería de QR). El QR codifica la URL pública `/[slug]?mesa=[token]`. Añade opción de descargar/imprimir el QR.

## 8. Stripe (opcional, detrás de feature flag)

- El pago online debe ser **opcional por heladería**, controlado por `acepta_pagos_online`. Por defecto está **desactivado** (lanzaremos sin pagos hasta testear en una heladería real).
- Implementa la integración de pago del cliente final con Stripe (Checkout Session o Payment Intent), pero **encapsulada** de forma que si el flag está desactivado, el flujo de pedido funcione sin tocar Stripe.
- Cuando el flag esté activado: crear la sesión de pago en el backend, y confirmar el pedido mediante **webhook de Stripe** (Route Handler en `/api/stripe/webhook`) al recibir el evento de pago completado. Marca `estado_pago = pagado` y crea/confirma el pedido.
- **Diseña la base contemplando Stripe Connect (cuentas Express)** para que en el futuro cada heladería reciba sus propios cobros (por eso `heladerias.stripe_account_id`). En esta fase NO hace falta implementar Connect completo; deja el punto de extensión preparado y comentado.
- La **suscripción SaaS** que las heladerías me pagan a mí (89,90 €/mes) es un sistema de facturación aparte (Stripe Billing). NO lo implementes en esta fase; solo deja el campo `plan` en `heladerias` preparado.

## 9. Estructura del proyecto

Organiza el código de forma limpia y escalable, por ejemplo:

```
/app
  /(publico)/[slug]/...        -> catálogo público del cliente (por heladería)
  /(dashboard)/dashboard/...   -> panel protegido de la heladería
  /(auth)/login, /registro
  /api/
    /pedidos/route.ts          -> creación/validación de pedidos en servidor
    /stripe/checkout/route.ts
    /stripe/webhook/route.ts
/lib
  /supabase/ (client.ts, server.ts, middleware.ts)
  /stripe/
/components/ (ui de shadcn + componentes propios)
/types/ (tipos generados de la BD de Supabase)
```

Genera los tipos TypeScript a partir del esquema de Supabase y úsalos en todo el código.

## 10. Requisitos transversales

- **Responsive real:** móvil first, pero perfectamente usable en desktop. El flujo del cliente prioriza móvil (es donde escanea el QR); el panel de la heladería debe ser cómodo en desktop/tablet.
- **Idioma de la interfaz:** español.
- **Moneda:** euros (€), formato español (coma decimal).
- **Validación en servidor** de precios y totales en la creación de pedidos.
- **Variables de entorno** en `.env.local` (crea un `.env.example`): URL y claves de Supabase (anon y service role), claves de Stripe y el secreto del webhook. Nunca expongas la service role key ni claves secretas de Stripe en el cliente.
- Código tipado, comentado donde aporte, y con manejo de errores básico (estados de carga y de error en la UI).

## 11. Qué quiero que construyas AHORA (alcance de esta fase)

1. Inicializa el proyecto Next.js + TypeScript + Tailwind + shadcn/ui.
2. Configura Supabase (clientes de navegador/servidor + middleware de sesión).
3. Crea todas las migraciones SQL del modelo de datos, con RLS y la función helper de tenant, además del bucket de Storage y sus políticas. Activa Realtime en `pedidos`/`pedido_items`.
4. Auth de la heladería (login/registro + alta de heladería + protección de rutas del dashboard).
5. Flujo del cliente: catálogo por `/[slug]`, detección de mesa por token, carrito, personalización, promociones y envío de pedido (con validación de total en servidor y `acepta_pagos_online = false` por defecto).
6. Panel de la heladería: comandas en tiempo real con cambio de estado + CRUD de categorías, productos, opciones y promociones + gestión de mesas con QR + ajustes con el toggle de pagos.
7. Stripe encapsulado detrás del flag, con los Route Handlers de checkout y webhook preparados (funcionando cuando el flag está activo, e ignorados cuando está inactivo).
8. `.env.example`, un `README.md` con los pasos para configurar Supabase, Stripe y arrancar el proyecto en local, y las instrucciones para desplegar en Vercel.

Empieza proponiéndome brevemente el plan de archivos y el esquema SQL antes de generarlo todo, y luego impleméntalo. Prioriza que quede **funcional y bien estructurado** por encima de que esté todo pulido.
