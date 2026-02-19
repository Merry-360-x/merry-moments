import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Star, CheckCircle, AlertCircle, MapPin, Loader2 } from "lucide-react";

/** Standalone review page — no login required, token-based.
 *  URL: /review/:token?rating=3
 *  Fetches booking info from GET /api/review?token=...
 *  Submits review via POST /api/review
 */
export default function ReviewPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const initialRating = Number(searchParams.get("rating")) || 0;
  const googleReviewUrl =
    import.meta.env.VITE_GOOGLE_REVIEW_URL || "https://www.google.com/search?q=Merry+Moments+reviews";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Booking/item data
  const [bookingData, setBookingData] = useState<{
    booking: { id: string; checkIn: string; checkOut: string; guestName: string; bookingType: string };
    item: { title: string; location: string | null; image: string | null };
  } | null>(null);

  // Review form state
  const [accRating, setAccRating] = useState(initialRating);
  const [accComment, setAccComment] = useState("");
  const [svcRating, setSvcRating] = useState(0);
  const [svcComment, setSvcComment] = useState("");
  const [accHover, setAccHover] = useState(0);
  const [svcHover, setSvcHover] = useState(0);

  useEffect(() => {
    if (!token) {
      setError("Invalid review link");
      setLoading(false);
      return;
    }
    fetch(`/api/review?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else if (data.alreadyReviewed) {
          setAlreadyReviewed(true);
        } else {
          setBookingData(data);
        }
      })
      .catch(() => setError("Failed to load booking details"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    if (accRating < 1) return;
    setSubmitting(true);
    try {
      const resp = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          accommodationRating: accRating,
          accommodationComment: accComment.trim() || undefined,
          serviceRating: svcRating > 0 ? svcRating : undefined,
          serviceComment: svcComment.trim() || undefined,
        }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setSubmitted(true);
      } else {
        setError(data.error || "Failed to submit review");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({
    value,
    hover,
    onChange,
    onHover,
    onLeave,
    size = "lg",
  }: {
    value: number;
    hover: number;
    onChange: (v: number) => void;
    onHover: (v: number) => void;
    onLeave: () => void;
    size?: "lg" | "sm";
  }) => (
    <div className="flex gap-1 justify-center" onMouseLeave={onLeave}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= (hover || value);
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => onHover(star)}
            className={`transition-all duration-150 ${
              size === "lg" ? "p-2" : "p-1.5"
            } rounded-lg hover:scale-110 active:scale-95 ${
              active ? "text-yellow-400" : "text-gray-300"
            }`}
          >
            <Star
              className={`${size === "lg" ? "w-10 h-10" : "w-8 h-8"} ${
                active ? "fill-yellow-400" : "fill-transparent"
              }`}
            />
          </button>
        );
      })}
    </div>
  );

  const ratingLabel = (r: number) => {
    if (r === 1) return "Poor";
    if (r === 2) return "Fair";
    if (r === 3) return "Good";
    if (r === 4) return "Very Good";
    if (r === 5) return "Excellent";
    return "";
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-start justify-center p-4 pt-8 sm:pt-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <img
            src="/brand/logo.png"
            alt="Merry 360 Experiences"
            className="w-14 h-14 mx-auto rounded-xl shadow-sm"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Error */}
          {error && !loading && (
            <div className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Oops!</h2>
              <p className="text-gray-500 text-sm">{error}</p>
            </div>
          )}

          {/* Already Reviewed */}
          {alreadyReviewed && !loading && (
            <div className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Already Reviewed</h2>
              <p className="text-gray-500">You've already submitted a review for this booking. Thank you!</p>
            </div>
          )}

          {/* Success */}
          {submitted && (
            <div className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Thank You!</h2>
              <p className="text-gray-500 mb-6">
                Your review has been submitted. It helps other travelers and our hosts improve.
              </p>
              <div className="flex gap-1 justify-center mb-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-6 h-6 ${s <= accRating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-400">{ratingLabel(accRating)}</p>
              {svcRating > 0 && (
                <a
                  href={googleReviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-4 px-4 py-2 border border-pink-300 text-pink-600 rounded-lg font-medium hover:bg-pink-50 transition-colors"
                >
                  Leave a Service Review on Google
                </a>
              )}
              <a
                href="https://merry360x.com"
                className="inline-block mt-8 px-6 py-3 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors"
              >
                Explore More Stays
              </a>
            </div>
          )}

          {/* Review Form */}
          {bookingData && !submitted && !loading && !error && !alreadyReviewed && (
            <>
              {/* Property header */}
              {bookingData.item.image && (
                <img
                  src={bookingData.item.image}
                  alt={bookingData.item.title}
                  className="w-full h-40 object-cover"
                />
              )}

              <div className="p-6">
                <h1 className="text-xl font-bold text-gray-900 text-center mb-1">
                  How was your stay?
                </h1>
                <h2 className="text-base font-medium text-gray-700 text-center mb-1">
                  {bookingData.item.title}
                </h2>
                {bookingData.item.location && (
                  <p className="text-sm text-gray-400 text-center flex items-center justify-center gap-1 mb-6">
                    <MapPin className="w-3 h-3" /> {bookingData.item.location}
                  </p>
                )}

                {/* Accommodation Rating */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 text-center mb-3">
                    Rate the Accommodation
                  </label>
                  <StarRating
                    value={accRating}
                    hover={accHover}
                    onChange={setAccRating}
                    onHover={setAccHover}
                    onLeave={() => setAccHover(0)}
                    size="lg"
                  />
                  {(accHover || accRating) > 0 && (
                    <p className="text-center text-sm text-gray-500 mt-1">
                      {ratingLabel(accHover || accRating)}
                    </p>
                  )}
                </div>

                {/* Quick comment badges */}
                {accRating > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2 justify-center mb-3">
                      {[
                        "Great location",
                        "Very clean",
                        "Excellent host",
                        "Cozy & comfortable",
                        "Good value",
                        "Beautiful views",
                      ].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() =>
                            setAccComment((c) =>
                              c.includes(tag) ? c.replace(tag, "").trim() : (c ? c + ". " + tag : tag)
                            )
                          }
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                            accComment.includes(tag)
                              ? "bg-pink-50 border-pink-300 text-pink-600"
                              : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={accComment}
                      onChange={(e) => setAccComment(e.target.value)}
                      placeholder="Tell us more about your stay (optional)..."
                      maxLength={500}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300"
                    />
                  </div>
                )}

                {/* Divider */}
                {accRating > 0 && (
                  <div className="border-t border-gray-100 my-6" />
                )}

                {/* Service Rating */}
                {accRating > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 text-center mb-3">
                      Rate Our Service
                    </label>
                    <p className="text-xs text-gray-400 text-center mb-3">
                      How was the booking experience with Merry 360 Experiences? You can also leave a public Google service review after submit.
                    </p>
                    <StarRating
                      value={svcRating}
                      hover={svcHover}
                      onChange={setSvcRating}
                      onHover={setSvcHover}
                      onLeave={() => setSvcHover(0)}
                      size="sm"
                    />
                    {(svcHover || svcRating) > 0 && (
                      <p className="text-center text-xs text-gray-500 mt-1">
                        {ratingLabel(svcHover || svcRating)}
                      </p>
                    )}
                    {svcRating > 0 && (
                      <textarea
                        value={svcComment}
                        onChange={(e) => setSvcComment(e.target.value)}
                        placeholder="Any feedback on our service? (optional)"
                        maxLength={300}
                        rows={2}
                        className="w-full mt-3 px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300"
                      />
                    )}
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={accRating < 1 || submitting}
                  className={`w-full py-3.5 rounded-xl font-semibold text-white transition-all ${
                    accRating >= 1 && !submitting
                      ? "bg-pink-500 hover:bg-pink-600 shadow-md hover:shadow-lg active:scale-[0.98]"
                      : "bg-gray-300 cursor-not-allowed"
                  }`}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                    </span>
                  ) : accRating < 1 ? (
                    "Select a rating to continue"
                  ) : (
                    "Submit Review"
                  )}
                </button>

                <p className="text-xs text-gray-400 text-center mt-4">
                  Your review will be public and helps other travelers.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Branding footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Merry 360 Experiences · Book local. Travel better.
        </p>
      </div>
    </div>
  );
}
