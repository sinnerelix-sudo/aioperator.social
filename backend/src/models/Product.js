import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const ProductSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    image: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, default: null, min: 0 },
    maxDiscount: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    category: { type: String, default: '', trim: true },
    description: { type: String, default: '' },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { _id: false, versionKey: false }
);

ProductSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

ProductSchema.methods.toPublic = function () {
  return {
    id: this._id,
    userId: this.userId,
    name: this.name,
    image: this.image,
    price: this.price,
    discountPrice: this.discountPrice,
    maxDiscount: this.maxDiscount,
    stock: this.stock,
    category: this.category,
    description: this.description,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Product = mongoose.model('Product', ProductSchema);
