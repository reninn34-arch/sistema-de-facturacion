const { AppError } = require('../../middleware/error.handler');

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

function parseBrowser(userAgent) {
  if (!userAgent) return null;
  const ua = userAgent;

  const edgMatch = ua.match(/Edg\/([\d.]+)/);
  if (edgMatch) return `Edge ${edgMatch[1]}`;

  const chromeMatch = ua.match(/Chrome\/([\d.]+)/);
  if (chromeMatch) return `Chrome ${chromeMatch[1]}`;

  const firefoxMatch = ua.match(/Firefox\/([\d.]+)/);
  if (firefoxMatch) return `Firefox ${firefoxMatch[1]}`;

  const safariMatch = ua.match(/Version\/([\d.]+).*Safari/);
  if (safariMatch) return `Safari ${safariMatch[1]}`;

  const operaMatch = ua.match(/(?:OPR|Opera)\/([\d.]+)/);
  if (operaMatch) return `Opera ${operaMatch[1]}`;

  return 'Desconocido';
}

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

class SessionService {
  constructor(repository) {
    this.repository = repository;
  }

  async createSession(userId, businessId, ipAddress, userAgent) {
    const deviceName = parseDeviceName(userAgent);
    const browser = parseBrowser(userAgent);

    let location = null;
    try {
      location = await getLocationFromIP(ipAddress);
    } catch (e) {
      console.error('Error en geolocalización:', e.message);
    }

    return await this.repository.create({
      userId,
      businessId,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      deviceName,
      browser,
      location,
      status: 'ACTIVE'
    });
  }

  async getSessions(userId, role, businessId) {
    const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN';

    if (isAdmin && businessId) {
      return await this.repository.findByBusiness(businessId);
    } else {
      return await this.repository.findByUser(userId);
    }
  }

  async revokeSession(sessionId, userId, role, businessId) {
    const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN';

    const session = await this.repository.findById(sessionId);

    if (!session) {
      throw new AppError('Sesión no encontrada', 404);
    }

    const canRevoke = isAdmin
      ? session.businessId === businessId
      : session.userId === userId;

    if (!canRevoke) {
      throw new AppError('No tienes permiso para revocar esta sesión', 403);
    }

    const isSelfRevoke = session.userId === userId;
    const newStatus = isSelfRevoke ? 'INACTIVE' : 'REVOKED';
    const message = isSelfRevoke
      ? 'Sesión cerrada correctamente'
      : 'Sesión revocada correctamente';

    await this.repository.updateStatus(sessionId, newStatus);

    return { success: true, message };
  }
}

module.exports = SessionService;
