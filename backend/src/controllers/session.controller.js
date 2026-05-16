const { catchAsync, AppError } = require('../middleware/error.handler');
const prisma = require('../../prisma/client');

// Parsear user-agent a nombre legible de sistema operativo
function parseDeviceName(userAgent) {
  if (!userAgent) return 'Desconocido';
  const ua = userAgent.toLowerCase();
  let os = '';

  if (ua.includes('windows nt 10')) os = 'Windows 10/11';
  else if (ua.includes('windows nt')) os = 'Windows';
  else if (ua.includes('mac os x')) os = 'macOS';
  else if (ua.includes('iphone')) os = 'iPhone';
  else if (ua.includes('ipad')) os = 'iPad';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('linux')) os = 'Linux';
  else os = '';

  return os || 'Desconocido';
}

// Parsear user-agent a nombre de navegador + versión
function parseBrowser(userAgent) {
  if (!userAgent) return null;
  const ua = userAgent;

  // Edge: "Edg/125.0.0.0"
  const edgMatch = ua.match(/Edg\/([\d.]+)/);
  if (edgMatch) return `Edge ${edgMatch[1]}`;

  // Chrome: "Chrome/125.0.0.0" (ignorar si también está Edg)
  const chromeMatch = ua.match(/Chrome\/([\d.]+)/);
  if (chromeMatch) return `Chrome ${chromeMatch[1]}`;

  // Firefox: "Firefox/124.0"
  const firefoxMatch = ua.match(/Firefox\/([\d.]+)/);
  if (firefoxMatch) return `Firefox ${firefoxMatch[1]}`;

  // Safari: "Version/17.2 Safari/605.1"
  const safariMatch = ua.match(/Version\/([\d.]+).*Safari/);
  if (safariMatch) return `Safari ${safariMatch[1]}`;

  // Opera: "OPR/100.0" o "Opera/80.0"
  const operaMatch = ua.match(/(?:OPR|Opera)\/([\d.]+)/);
  if (operaMatch) return `Opera ${operaMatch[1]}`;

  return 'Desconocido';
}

// Geolocalización de IP usando ip-api.com (gratis, sin API key, 45 req/min)
async function getLocationFromIP(ip) {
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return 'Localhost';
  }
  try {
    const AbortController = globalThis.AbortController;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(`http://ip-api.com/json/${ip}?fields=country,city`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.status === 'success' && data.country) {
      return data.city ? `${data.country}, ${data.city}` : data.country;
    }
    return null;
  } catch (e) {
    console.error('Error geolocalizando IP:', e.message);
    return null;
  }
}

const sessionController = {
  // Crear sesión (llamado desde auth.controller.js en el login)
  createSession: async (userId, businessId, ipAddress, userAgent) => {
    const deviceName = parseDeviceName(userAgent);
    const browser = parseBrowser(userAgent);

    // Geolocalización asíncrona (no bloquea la creación de la sesión)
    let location = null;
    try {
      location = await getLocationFromIP(ipAddress);
    } catch (e) {
      console.error('Error en geolocalización:', e.message);
    }

    return await prisma.session.create({
      data: {
        userId,
        businessId,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        deviceName,
        browser,
        location,
        status: 'ACTIVE'
      }
    });
  },

  // Listar sesiones
  getSessions: catchAsync(async (req, res) => {
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN';

    let where = {};
    if (isAdmin && req.user.businessId) {
      where = { businessId: req.user.businessId };
    } else {
      where = { userId: req.user.id };
    }

    const sessions = await prisma.session.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, name: true, role: true } }
      },
      orderBy: { loginAt: 'desc' },
      take: 100
    });

    res.json({
      sessions,
      currentSessionId: req.user.sessionId || null
    });
  }),

  // Revocar una sesión (cerrar sesión remota)
  revokeSession: catchAsync(async (req, res) => {
    const { id } = req.params;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN';

    const session = await prisma.session.findUnique({
      where: { id },
      include: { user: { select: { id: true, businessId: true } } }
    });

    if (!session) {
      throw new AppError('Sesión no encontrada', 404);
    }

    const canRevoke = isAdmin
      ? session.businessId === req.user.businessId
      : session.userId === req.user.id;

    if (!canRevoke) {
      throw new AppError('No tienes permiso para revocar esta sesión', 403);
    }

    // Auto-revocación = INACTIVE (cerró sesión normalmente).
    // Revocación por admin/otro usuario = REVOKED (forzado externamente).
    const isSelfRevoke = session.userId === req.user.id;
    const newStatus = isSelfRevoke ? 'INACTIVE' : 'REVOKED';
    const message = isSelfRevoke
      ? 'Sesión cerrada correctamente'
      : 'Sesión revocada correctamente';

    await prisma.session.update({
      where: { id },
      data: { status: newStatus }
    });

    res.json({ success: true, message });
  })
};

module.exports = sessionController;
