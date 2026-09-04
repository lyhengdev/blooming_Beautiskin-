import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import * as wishlistController from '../controllers/wishlist.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.get('/', authenticate, asyncHandler(wishlistController.getWishlist));
router.post('/:productId', authenticate, asyncHandler(wishlistController.addToWishlist));
router.delete('/:productId', authenticate, asyncHandler(wishlistController.removeFromWishlist));

export default router;
