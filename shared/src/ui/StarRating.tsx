import { useState } from 'react';
import { Star, ThumbsUp, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

export interface StarRatingProps {
  initialScore?: number;
  onRate: (rating: { score: number; comment?: string; tags?: string[] }) => void | Promise<void>;
  recipientName?: string;
  isCarrier?: boolean;
  disabled?: boolean;
}

const CARRIER_TAGS = [
  '⚡ Super Fast Delivery',
  '📦 Handled with Extreme Care',
  '💬 Excellent Communication',
  '🤝 On-Time Handoff',
  '🛡️ Perfect Seal Condition',
  '🌟 Highly Recommended'
];

const SENDER_TAGS = [
  '🤝 Punctual at Pickup',
  '📦 Secure Packaging',
  '💬 Clear Instructions',
  '⚡ Prompt Payment',
  '🌟 Great Sender'
];

export function StarRating({
  initialScore = 5,
  onRate,
  recipientName = 'Traveler',
  isCarrier = false,
  disabled = false
}: StarRatingProps) {
  const [score, setScore] = useState<number>(initialScore);
  const [hoverScore, setHoverScore] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const availableTags = isCarrier ? SENDER_TAGS : CARRIER_TAGS;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const fullComment = [
        ...selectedTags,
        comment.trim()
      ].filter(Boolean).join(' • ');

      await onRate({ score, comment: fullComment, tags: selectedTags });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center animate-in fade-in">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs mb-3">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3 className="text-base font-extrabold text-zinc-950">Thank you for rating {recipientName}!</h3>
        <p className="mt-1 text-xs text-emerald-800">
          Your feedback updates their trust badge and public profile score across the network.
        </p>
      </div>
    );
  }

  const activeRating = hoverScore !== null ? hoverScore : score;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-xs">
      <div className="text-center space-y-1">
        <h3 className="text-base font-extrabold text-zinc-950">
          Rate your experience with {recipientName}
        </h3>
        <p className="text-xs text-zinc-500">
          How was the parcel handoff, communication, and punctuality?
        </p>
      </div>

      {/* Star Selector */}
      <div className="flex justify-center items-center gap-2 py-2">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= activeRating;
          return (
            <button
              key={star}
              type="button"
              disabled={disabled}
              onClick={() => setScore(star)}
              onMouseEnter={() => setHoverScore(star)}
              onMouseLeave={() => setHoverScore(null)}
              className="p-1 transition-transform hover:scale-125 focus:outline-none"
            >
              <Star
                className={clsx(
                  'h-8 w-8 transition-colors',
                  isFilled ? 'fill-amber-400 text-amber-400 drop-shadow-xs' : 'text-zinc-200 fill-zinc-100'
                )}
              />
            </button>
          );
        })}
      </div>

      <div className="text-center text-xs font-extrabold text-amber-600">
        {activeRating === 5 && '🌟 Outstanding & Seamless'}
        {activeRating === 4 && '👍 Very Good Experience'}
        {activeRating === 3 && '👌 Satisfactory Delivery'}
        {activeRating === 2 && '⚠️ Needs Improvement'}
        {activeRating === 1 && '👎 Poor Experience'}
      </div>

      {/* Quick Feedback Chips */}
      <div className="space-y-2">
        <label className="block text-center text-xs font-bold text-zinc-700">
          What went well?
        </label>
        <div className="flex flex-wrap justify-center gap-2">
          {availableTags.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={clsx(
                  'rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all',
                  isSelected
                    ? 'border-zinc-950 bg-zinc-950 text-white shadow-2xs'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Additional Comments */}
      <div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={`Write an optional note for ${recipientName}...`}
          rows={2}
          className="w-full rounded-2xl border border-zinc-200 p-3 text-xs text-zinc-950 focus:border-zinc-950 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={disabled || isSubmitting}
        className="w-full rounded-2xl bg-zinc-950 py-3 text-xs font-bold text-white shadow-xs hover:bg-zinc-800 disabled:opacity-50 transition-all"
      >
        {isSubmitting ? 'Submitting Feedback...' : 'Submit Rating & Feedback'}
      </button>
    </form>
  );
}
