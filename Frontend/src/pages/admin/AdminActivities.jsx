import { useEffect, useState } from "react";
import apiClient from "../../api/client";

const AdminActivities = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    apiClient
      .get("/admin/activities")
      .then(({ data }) => {
        if (!ignore) setActivities(data.data?.activities || []);
      })
      .catch((err) => {
        if (!ignore) setErrorMsg(err.response?.data?.message || "Failed to load activities");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const toggleActive = async (activity) => {
    setBusyId(activity._id);
    setErrorMsg("");
    setOkMsg("");
    try {
      await apiClient.patch(`/admin/activities/${activity._id}`, { isActive: !activity.isActive });
      setOkMsg(`${activity.name} ${activity.isActive ? "retired" : "reactivated"}.`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to update activity");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-500 m-0">
        Retiring an activity hides it from search and new profiles without deleting existing data.
      </p>

      {errorMsg && <p role="alert" className="text-sm text-red-600 m-0">{errorMsg}</p>}
      {okMsg && <p className="text-sm text-emerald-700 m-0">{okMsg}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading activities...</p>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl divide-y divide-slate-100">
          {activities.map((activity) => (
            <div key={activity._id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-900">{activity.name}</span>
                  {!activity.isActive && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-600">
                      Retired
                    </span>
                  )}
                </div>
                {activity.description && (
                  <div className="text-xs text-slate-500 mt-0.5">{activity.description}</div>
                )}
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {activity.profileCount} profile{activity.profileCount === 1 ? "" : "s"} using this
                </div>
              </div>
              <button
                type="button"
                disabled={busyId === activity._id}
                onClick={() => toggleActive(activity)}
                className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer ${
                  activity.isActive
                    ? "text-red-600 border border-red-200 hover:bg-red-50"
                    : "text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
                }`}
              >
                {activity.isActive ? "Retire" : "Reactivate"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminActivities;
