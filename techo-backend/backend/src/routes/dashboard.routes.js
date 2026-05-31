import { Router } from 'express';
import { getPublicDashboard } from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/publico', getPublicDashboard);

export default router;
