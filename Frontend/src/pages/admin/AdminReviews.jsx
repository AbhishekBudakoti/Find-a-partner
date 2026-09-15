import { useEffect, useState } from "react";
import apiClient from "../../api/client";

const formatDate = (iso) => new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });

const Stars = ({ rating }) => (
  <span className="text-amber-500 tracking-tighter" aria-label={`${rating} out of 5 stars`}>
    {"★".repeat(rating)}
    <span className="text-slate-300">{"★".repeat(5 - rating)}</span>
  </span>
);

const AdminReviews = () => {
  const [maxRating, setMaxRating] = useState("");
  const [page, setPage] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    // Loading only shows on the very first fetch; a filter/page change just
    // swaps the list in place once the response lands.
    apiClient
      .get("/admin/reviews", { params: { maxRating: maxRating || undefined, page } })
      .then(({ data }) => {
        if (ignore) return;
        setReviews(data.data?.reviews || []);
        setPagination(data.data?.pagination || { page: 1, pages: 1, total: 0 });
      })
      .catch((err) => {
        if (!ignore) setErrorMsg(err.response?.data?.message || "Failed to load reviews");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [maxRating, page, reloadKey]);

  const removeReview = async (review) => {
    if (!window.confirm(`Delete this review of ${review.reviewee?.name || "this user"}? This can't be undone.`)) {
      return;
    }
    setBusyId(review._id);
    setErrorMsg("");
    setOkMsg("");
    try {
      await apiClient.delete(`/admin/reviews/${review._id}`);
      setOkMsg("Review deleted.");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to delete review");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <select
        value={maxRating}
        onChange={(e) => {
          setPage(1);
          setMaxRating(e.target.value);
        }}
        className="w-fit px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
      >
        <option value="">All ratings</option>
        <option value="2">2 stars or below</option>
        <option value="3">3 stars or below</option>
      </select>

      {errorMsg && <p role="alert" className="text-sm text-red-600 m-0">{errorMsg}</p>}
      {okMsg && <p className="text-sm text-emerald-700 m-0">{okMsg}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-slate-400">No reviews match this filter.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((review) => (
            <article key={review._id} className="bg-white border border-slate-200/80 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Stars rating={review.rating} />
                  <div className="text-xs text-slate-500 mt-1">
                    <span className="font-medium text-slate-700">{review.reviewer?.name || "Deleted user"}</span>
                    {" → "}
                    <span className="font-medium text-slate-700">{review.reviewee?.name || "Deleted user"}</span>
                    {" · "}
                    {formatDate(review.createdAt)}
                    {review.session?.activity?.name && ` · ${review.session.activity.name}`}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busyId === review._id}
                  onClick={() => removeReview(review)}
                  className="shrink-0 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 cursor-pointer"
                >
                  Delete
                </button>
              </div>
              {review.comment && <p className="text-sm text-slate-700 mt-2 mb-0 whitespace-pre-wrap">{review.comment}</p>}
            </article>
          ))}
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
          >
            Previous
          </button>
          <span className="text-slate-500 tabular-nums">
            Page {pagination.page} of {pagination.pages} ({pagination.total} reviews)
          </span>
          <button
            type="button"
            disabled={page >= pagination.pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
