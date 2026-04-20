import mongoose from 'mongoose';

const listSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    position: { type: Number, default: 0 },
  },
  { timestamps: true }
);

listSchema.index({ board: 1, position: 1 });

export const List = mongoose.model('List', listSchema);
