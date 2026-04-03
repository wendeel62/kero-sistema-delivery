import express from 'express';
import * as syncController from '../controllers/syncController.js';

const router = express.Router();

router.post('/instances', syncController.syncInstances);
router.post('/messages', syncController.syncMessages);
router.post('/contacts', syncController.syncContacts);
router.get('/status', syncController.getSyncStatus);

export default router;
