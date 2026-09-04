import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../middlewares/asyncHandler';
import { optionalAuth, authenticate } from '../middlewares/auth';
import { submitQuiz, getQuizHistory } from '../controllers/skinquiz.controller';

const router = Router();

router.post(
  '/',
  optionalAuth,
  [
    body('skinType').isIn(['OILY', 'DRY', 'NORMAL', 'COMBINATION', 'SENSITIVE']),
    body('concerns').isArray({ min: 1 }),
    body('concerns.*').isString().trim().notEmpty(),
  ],
  validate,
  asyncHandler(submitQuiz),
);

router.get('/history', authenticate, asyncHandler(getQuizHistory));

export default router;
