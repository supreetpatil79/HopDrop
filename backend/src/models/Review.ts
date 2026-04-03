import { Schema, model, Types } from 'mongoose';

interface IReview {
  match: Types.ObjectId;
  from: Types.ObjectId;
  to: Types.ObjectId;
  score: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    match: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
    from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    score: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String }
  },
  { timestamps: true }
);

ReviewSchema.index({ match: 1, from: 1, to: 1 }, { unique: true });

export const Review = model<IReview>('Review', ReviewSchema);
