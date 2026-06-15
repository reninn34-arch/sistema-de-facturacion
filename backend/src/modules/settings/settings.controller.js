const { SettingsService } = require('./settings.service');

const settingsController = {
  async getSettings(req, res) {
    try {
      const settings = await SettingsService.getSettings();
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener configuración' });
    }
  },

  async updateSettings(req, res) {
    try {
      const settings = await SettingsService.updateSettings(req.body);
      res.json({ success: true, settings });
    } catch (error) {
      console.error('Error al actualizar configuración:', error);
      res.status(500).json({ error: 'Error al actualizar configuración' });
    }
  },

  async getLandingLogo(req, res) {
    try {
      const logo = await SettingsService.getLandingLogo();
      if (!logo) {
        return res.status(404).end();
      }
      const [header, data] = logo.split(',');
      const mimeMatch = header.match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/png';
      const buffer = Buffer.from(data, 'base64');
      res.set('Content-Type', mime);
      res.set('Cache-Control', 'public, max-age=86400');
      res.send(buffer);
    } catch (error) {
      console.error('Error al obtener landing logo:', error);
      res.status(500).end();
    }
  },

  async saveLandingLogo(req, res) {
    try {
      const { logo } = req.body;
      await SettingsService.saveLandingLogo(logo);
      res.json({ success: true });
    } catch (error) {
      console.error('Error al guardar landing logo:', error);
      res.status(500).json({ error: 'Error al guardar logo' });
    }
  },

  async getLandingContent(req, res) {
    try {
      const landingContent = await SettingsService.getLandingContent();
      res.json({ landingContent });
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener contenido del landing' });
    }
  },

  async updateLandingContent(req, res) {
    try {
      const { landingContent } = req.body;
      const result = await SettingsService.updateLandingContent(landingContent);
      res.json({ success: true, landingContent: result });
    } catch (error) {
      console.error('Error al actualizar landing content:', error);
      res.status(500).json({ error: 'Error al actualizar contenido del landing' });
    }
  }
};

module.exports = settingsController;
