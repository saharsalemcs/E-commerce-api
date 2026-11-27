import mongoose from "mongoose";
import validator from "validator";
import { ROLES } from "../../common/constants/roles.js";
import { EGYPT_PHONE_REGEX } from "../../common/validators/common.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minLength: [2, "Name must be at least 2 characters"],
      maxLength: 40,
    },
    email: {
      type: String,
      required: [true, "Please provide your email!"],
      trim: true,
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email!"],
    },
    phone: {
      type: String,
      required: [true, "Please provide your phone number!"],
      trim: true,
      match: [
        EGYPT_PHONE_REGEX,
        "Please provide a valid egyptian phone number!",
      ],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: {
        values: Object.values(ROLES),
        message: "Role is not allowed: {VALUE}",
      },
      default: ROLES.CUSTOMER,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    passwordChangedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

// Supports the "at least one active admin" check (P2-T05).
userSchema.index({ role: 1, isActive: 1 });

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model("User", userSchema);
