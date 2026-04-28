import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const UserSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: 'seller', enum: ['seller', 'super_admin'] },
    locale: { type: String, default: 'az', enum: ['az', 'tr'] },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { _id: false, versionKey: false }
);

UserSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

UserSchema.methods.toPublic = function () {
  return {
    id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    phone: this.phone,
    role: this.role,
    locale: this.locale,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', UserSchema);
