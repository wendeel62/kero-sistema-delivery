import express from 'express';
import * as evolutionController from '../controllers/evolutionController.js';

const router = express.Router();

router.post('/instances', evolutionController.createInstance);
router.get('/instances', evolutionController.listInstances);
router.get('/instances/:instanceName', evolutionController.getInstanceDetails);
router.delete('/instances/:instanceName', evolutionController.deleteInstance);
router.post('/send-message', evolutionController.sendMessage);
router.post('/webhook', evolutionController.handleWebhook);

export default router;
